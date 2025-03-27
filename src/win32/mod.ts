import {
  type Library,
  type LoadLibrary,
  type UIEvent,
  type Window,
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

interface Win32WindowOptions {
  /** In screen coords or relative to parent window if exists */
  x: number;
  /** In screen coords or relative to parent window if exists */
  y: number;
  /** Device units */
  w: number;
  /** Device units */
  h: number;
}
class Win32Window implements Window {
  readonly id: bigint;
  constructor(
    readonly lib: Win32Library,
    classNameBuf: ArrayBuffer,
    options: Win32WindowOptions,
  ) {
    // https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-createwindowexw
    const window = lib.user32.symbols.CreateWindowExW(
      0,
      classNameBuf,
      null,
      0x10CF0000,
      options.x,
      options.y,
      options.w,
      options.h,
      null,
      null,
      null,
      0n,
    );
    if (window == null) throw new Error(lib.getLastError());
    this.id = BigInt(Deno.UnsafePointer.value(window));
    lib.windows.set(this.id, this);
  }
  [Symbol.dispose]() {
    this.close();
  }
  close(): void {
    this.lib.windows.delete(this.id);
  }
}

/** NOTE For all types see WinUser.h */
enum WinEvType {
  WM_MOUSEMOVE = 0x0200,
  WM_LBUTTONDOWN = 0x0201,
  WM_LBUTTONUP = 0x0202,
  WM_LBUTTONDBLCLK = 0x0203,
  WM_RBUTTONDOWN = 0x0204,
  WM_RBUTTONUP = 0x0205,
  WM_RBUTTONDBLCLK = 0x0206,
  WM_MBUTTONDOWN = 0x0207,
  WM_MBUTTONUP = 0x0208,
  WM_MBUTTONDBLCLK = 0x0209,
  WM_MOUSEWHEEL = 0x020A,
  WM_XBUTTONDOWN = 0x020B,
  WM_XBUTTONUP = 0x020C,
  WM_XBUTTONDBLCLK = 0x020D,
  WM_MOUSEHWHEEL = 0x020E,
  WM_MOUSEHOVER = 0x02A1,
  WM_MOUSELEAVE = 0x02A3,

  WM_CUT = 0x0300,
  WM_COPY = 0x0301,
  WM_PASTE = 0x0302,
  WM_CLEAR = 0x0303,
  WM_UNDO = 0x0304,

  WM_KEYDOWN = 0x0100,
  WM_KEYUP = 0x0101,
  WM_CHAR = 0x0102,
  WM_DEADCHAR = 0x0103,
  WM_SYSKEYDOWN = 0x0104,
  WM_SYSKEYUP = 0x0105,
  WM_SYSCHAR = 0x0106,
  WM_SYSDEADCHAR = 0x0107,
  WM_UNICHAR = 0x0109,

  WM_CREATE = 0x0001,
  WM_DESTROY = 0x0002,
  WM_MOVE = 0x0003,
  WM_SIZE = 0x0005,
  WM_ACTIVATE = 0x0006,
  WM_SETFOCUS = 0x0007,
  WM_KILLFOCUS = 0x0008,
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
  #event: UIEvent | undefined;
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
      switch (uMsg) {
        case WinEvType.WM_MOUSEMOVE: {
          this.#event = {
            type: "mousemove",
            x: Number(BigInt(lParam) & 0xFFFFn),
            y: Number((BigInt(lParam) & 0xFFFF0000n) >> 16n),
            window: this.windows.get(BigInt(Deno.UnsafePointer.value(hWnd))),
          };
          break;
        }
        case WinEvType.WM_LBUTTONDOWN: {
          this.#event = {
            type: "mousedown",
            button: "left",
            window: this.windows.get(BigInt(Deno.UnsafePointer.value(hWnd))),
          };
          break;
        }
        case WinEvType.WM_MBUTTONDOWN: {
          this.#event = {
            type: "mousedown",
            button: "middle",
            window: this.windows.get(BigInt(Deno.UnsafePointer.value(hWnd))),
          };
          break;
        }
        case WinEvType.WM_RBUTTONDOWN: {
          this.#event = {
            type: "mousedown",
            button: "right",
            window: this.windows.get(BigInt(Deno.UnsafePointer.value(hWnd))),
          };
          break;
        }
        case WinEvType.WM_LBUTTONUP: {
          this.#event = {
            type: "mouseup",
            button: "left",
            window: this.windows.get(BigInt(Deno.UnsafePointer.value(hWnd))),
          };
          break;
        }
        case WinEvType.WM_MBUTTONUP: {
          this.#event = {
            type: "mouseup",
            button: "middle",
            window: this.windows.get(BigInt(Deno.UnsafePointer.value(hWnd))),
          };
          break;
        }
        case WinEvType.WM_RBUTTONUP: {
          this.#event = {
            type: "mouseup",
            button: "right",
            window: this.windows.get(BigInt(Deno.UnsafePointer.value(hWnd))),
          };
          break;
        }

        case WinEvType.WM_KEYDOWN: {
          this.#event = {
            type: "keydown",
            keycode: Number(wParam),
            // lParam is a bitmask with the 24th bit being an indicator for extended key press such as right-hand ALT
            isExtended: Boolean(BigInt(lParam) & BigInt(1 << 24)),
            window: this.windows.get(BigInt(Deno.UnsafePointer.value(hWnd))),
          };
          break;
        }
        case WinEvType.WM_SYSKEYDOWN: {
          // example for syskeydown is pressing an [Alt] key. Not the same as keydown, i.e. [RightCtrl] and [RightAlt]
          this.#event = {
            type: "syskeydown",
            keycode: Number(wParam),
            // lParam is a bitmask with the 24th bit being an indicator for extended key press such as right-hand ALT
            isExtended: Boolean(BigInt(lParam) & BigInt(1 << 24)),
            window: this.windows.get(BigInt(Deno.UnsafePointer.value(hWnd))),
          };
          break;
        }
        case WinEvType.WM_KEYUP: {
          this.#event = {
            type: "keyup",
            keycode: Number(wParam),
            // lParam is a bitmask with the 24th bit being an indicator for extended key press such as right-hand ALT
            isExtended: Boolean(BigInt(lParam) & BigInt(1 << 24)),
            window: this.windows.get(BigInt(Deno.UnsafePointer.value(hWnd))),
          };
          break;
        }
        case WinEvType.WM_SYSKEYUP: {
          // example for syskeydown is releasing an [Alt] key
          this.#event = {
            type: "syskeyup",
            keycode: Number(wParam),
            // lParam is a bitmask with the 24th bit being an indicator for extended key press such as right-hand ALT
            isExtended: Boolean(BigInt(lParam) & BigInt(1 << 24)),
            window: this.windows.get(BigInt(Deno.UnsafePointer.value(hWnd))),
          };
          break;
        }
        case WinEvType.WM_CHAR: {
          this.#event = {
            type: "keychar",
            key: String.fromCodePoint(Number(wParam)),
            keycode: Number(wParam),
            window: this.windows.get(BigInt(Deno.UnsafePointer.value(hWnd))),
          };
          break;
        }
        case WinEvType.WM_SYSCHAR: {
          this.#event = {
            type: "syskeychar",
            key: String.fromCodePoint(Number(wParam)),
            keycode: Number(wParam),
            window: this.windows.get(BigInt(Deno.UnsafePointer.value(hWnd))),
          };
          break;
        }
        case WinEvType.WM_SETFOCUS: {
          this.#event = {
            type: "focus",
            window: this.windows.get(BigInt(Deno.UnsafePointer.value(hWnd))),
          };
          break;
        }
        case WinEvType.WM_KILLFOCUS: {
          this.#event = {
            type: "blur",
            window: this.windows.get(BigInt(Deno.UnsafePointer.value(hWnd))),
          };
          break;
        }
        case WinEvType.WM_MOVE: {
          this.#event = {
            type: "move",
            window: this.windows.get(BigInt(Deno.UnsafePointer.value(hWnd))),
          };
          break;
        }
        case WinEvType.WM_SIZE: {
          this.#event = {
            type: "resize",
            window: this.windows.get(BigInt(Deno.UnsafePointer.value(hWnd))),
          };
          break;
        }
        case WinEvType.WM_DESTROY: {
          this.#event = {
            type: "destroy",
            window: this.windows.get(BigInt(Deno.UnsafePointer.value(hWnd))),
          };
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
    const cursor = this.user32.symbols.LoadCursorW(null, 32512n);
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
  readonly windows = new Map<bigint, Win32Window>();
  openWindow(
    x: number = 100,
    y: number = 100,
    w: number = 800,
    h: number = 600,
  ): Win32Window {
    return new Win32Window(this, this.#classNameBuffer, { x, y, w, h });
  }
  #msg = new ArrayBuffer(48);
  event(): UIEvent | undefined {
    const ptr = Deno.UnsafePointer.of(this.#msg);
    if (this.user32.symbols.PeekMessageW(ptr, null, 0, 0, 1)) {
      this.user32.symbols.TranslateMessage(
        Deno.UnsafePointer.of(this.#msg),
      );
      this.user32.symbols.DispatchMessageW(
        Deno.UnsafePointer.of(this.#msg),
      );
    }
    const event = this.#event;
    if (event !== undefined) this.#event = undefined;
    return event;
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
  [Symbol.dispose]() {
    this.close();
  }
  close(): void {
    this.#wndProc.close();
    this.user32.close();
    this.kernel32.close();
  }
}

export const load: LoadLibrary = () => new Win32Library();
