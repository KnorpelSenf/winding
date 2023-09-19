import {
  type Library,
  type LoadLibrary,
  type Window,
  type WindowEvent,
  WindowEventType,
  WindowMoveEvent,
} from "../types.ts";

const kernel32functions = {
  GetModuleHandleW: { parameters: ["pointer"], result: "usize" },
  GetLastError: { parameters: [], result: "u32" },
  FormatMessageW: {
    parameters: ["u32", "pointer", "u32", "u32", "pointer", "u32", "pointer"],
    result: "u32",
  },
} as const;

const user32functions = {
  LoadCursorW: { parameters: ["pointer", "usize"], result: "usize" },
  RegisterClassExW: {
    parameters: ["buffer"],
    result: "u16",
  },
  CreateWindowExW: {
    parameters: [
      "u32",
      "buffer",
      "buffer",
      "u32",
      "u32",
      "u32",
      "u32",
      "u32",
      "pointer",
      "pointer",
      "pointer",
      "usize",
    ],
    result: "pointer",
  },
  PeekMessageW: {
    parameters: ["pointer", "pointer", "u32", "u32", "u32"],
    result: "bool",
    callback: true,
  },
  TranslateMessage: { parameters: ["pointer"], result: "bool" },
  DispatchMessageW: {
    parameters: ["pointer"],
    result: "usize",
    callback: true,
  },
  DefWindowProcW: {
    parameters: ["pointer", "u32", "usize", "usize"],
    result: "usize",
    callback: true,
  },
} as const;

const windows = new Map<
  number | bigint,
  { event: WindowEvent | null; window: Win32Window }
>();

class Win32Window implements Window {
  readonly window: Deno.PointerObject;
  constructor(readonly lib: Win32Library, classNameBuf: ArrayBuffer) {
    const window = lib.user32.symbols.CreateWindowExW(
      0,
      classNameBuf,
      null,
      0x10CF0000,
      0x80000000,
      0x80000000,
      0x80000000,
      0x80000000,
      null,
      null,
      null,
      0,
    );
    if (window == null) throw new Error(lib.getLastError());
    this.window = window;
    windows.set(Deno.UnsafePointer.value(window), {
      event: null,
      window: this,
    });
  }
  #msg = new ArrayBuffer(48);
  event(): WindowEvent | null {
    const ptr = Deno.UnsafePointer.of(this.#msg);
    if (this.lib.user32.symbols.PeekMessageW(ptr, this.window, 0, 0, 1)) {
      this.lib.user32.symbols.TranslateMessage(
        Deno.UnsafePointer.of(this.#msg),
      );
      this.lib.user32.symbols.DispatchMessageW(
        Deno.UnsafePointer.of(this.#msg),
      );
    }
    return windows.get(Deno.UnsafePointer.value(this.window))?.event ?? null;
  }
  close(): void {
    windows.delete(Deno.UnsafePointer.value(this.window));
  }
}

class Win32Library implements Library {
  readonly kernel32: Deno.DynamicLibrary<typeof kernel32functions>;
  readonly user32: Deno.DynamicLibrary<typeof user32functions>;
  #wndClass = new ArrayBuffer(80);
  #classNameBuffer = (() => {
    const name = "Winding";
    const classNameBuffer = new ArrayBuffer((name.length + 1) * 2);
    const classNameU16 = new Uint16Array(classNameBuffer);
    for (let i = 0; i < name.length; i++) {
      classNameU16[i] = name.charCodeAt(i);
    }
    classNameU16[name.length] = 0;
    return classNameBuffer;
  })();
  #wndProc: Deno.UnsafeCallback<{
    parameters: ["pointer", "u32", "usize", "usize"];
    result: "usize";
  }>;
  constructor() {
    this.kernel32 = Deno.dlopen("kernel32", kernel32functions);
    this.user32 = Deno.dlopen("user32", user32functions);

    const wndClassDv = new DataView(this.#wndClass);
    let off = 0;

    // cbSize
    wndClassDv.setUint32(off, this.#wndClass.byteLength, true);
    off += 4;

    // style
    wndClassDv.setUint32(off, 0x1 | 0x2 | 0x20, true);
    off += 4;

    // lpfnWndProc
    this.#wndProc = new Deno.UnsafeCallback({
      parameters: ["pointer", "u32", "usize", "usize"],
      result: "usize",
    }, (hWnd, uMsg, wParam, lParam) => {
      const window = windows.get(Deno.UnsafePointer.value(hWnd));
      if (!window) {
        return this.user32.symbols.DefWindowProcW(hWnd, uMsg, wParam, lParam);
      }
      switch (uMsg) {
        case 0x200: {
          const event = (window.event = window.event ??
            { type: WindowEventType.MouseMove, x: 0, y: 0 }) as WindowMoveEvent;
          event.type = WindowEventType.MouseMove;
          event.x = Number(BigInt(lParam) & 0xFFFFn);
          event.y = Number((BigInt(lParam) & 0xFFFF0000n) >> 16n);
          break;
        }
      }
      return this.user32.symbols.DefWindowProcW(hWnd, uMsg, wParam, lParam);
    });
    wndClassDv.setBigUint64(
      off,
      BigInt(Deno.UnsafePointer.value(this.#wndProc.pointer)),
      true,
    );
    off += 8;

    // cbClsExtra
    off += 4;

    // cbWndExtra
    off += 4;

    // hInstance
    const instance = this.kernel32.symbols.GetModuleHandleW(null);
    if (BigInt(instance) == 0n) throw new Error(this.getLastError());
    wndClassDv.setBigUint64(off, BigInt(instance), true);
    off += 8;

    // hIcon
    off += 8;

    // hCursor
    const cursor = this.user32.symbols.LoadCursorW(null, 32512);
    // (IDC_ARROW - https://learn.microsoft.com/en-us/windows/win32/menurc/about-cursors)
    if (BigInt(cursor) === 0n) throw new Error(this.getLastError());
    wndClassDv.setBigUint64(off, BigInt(cursor), true);
    off += 8;

    // hbrBackground
    off += 8;

    // lpszMenuName
    off += 8;

    // lpszClassName
    wndClassDv.setBigUint64(
      off,
      BigInt(Deno.UnsafePointer.value(
        Deno.UnsafePointer.of(this.#classNameBuffer),
      )),
      true,
    );
    off += 8;

    // hIconSm
    off += 8;

    if (off !== this.#wndClass.byteLength) {
      throw new Error("Bug: mismatched offset with expected WNDCLASS size");
    }

    const wndClass = this.user32.symbols.RegisterClassExW(this.#wndClass);
    if (wndClass == 0) throw new Error(this.getLastError());
  }
  openWindow(): Win32Window {
    return new Win32Window(this, this.#classNameBuffer);
  }
  #lastErrorBuffer = new ArrayBuffer(4096);
  getLastError() {
    const code = this.kernel32.symbols.GetLastError();
    const bufU16 = new Uint16Array(this.#lastErrorBuffer);
    const bytesWritten = this.kernel32.symbols.FormatMessageW(
      0x1000,
      null,
      code,
      0,
      Deno.UnsafePointer.of(this.#lastErrorBuffer),
      this.#lastErrorBuffer.byteLength / 2,
      null,
    );
    if (bytesWritten == 0) {
      throw new Error(
        "Failed to get error information for error code: " + code,
      );
    }
    let s = "";
    for (let i = 0; i < bytesWritten; i++) {
      s += String.fromCharCode(bufU16[i]);
    }
    return s.trim() + " (" + code + ")";
  }
  close(): void {
    this.#wndProc.close();
    this.user32.close();
    this.kernel32.close();
  }
}

export const load: LoadLibrary = () => new Win32Library();
