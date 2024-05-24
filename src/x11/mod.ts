import {
  type Library,
  type LoadLibrary,
  type UIEvent,
  UIEventType,
  type Window,
} from "../types.ts";

const x11functions = {
  XOpenDisplay: { parameters: ["usize"], result: "pointer" },
  XCreateGC: { parameters: ["pointer", "usize", "i32", "i32"], result: "pointer" },
  XCloseDisplay: { parameters: ["pointer"], result: "void" },
  XDefaultScreenOfDisplay: { parameters: ["pointer"], result: "pointer" },
  XMapWindow: { parameters: ["pointer", "usize"], result: "void" },
  XPending: { parameters: ["pointer"], result: "i32" },
  XSelectInput: { parameters: ["pointer", "usize", "u64"], result: "void" },
  XNextEvent: { parameters: ["pointer", "pointer"], result: "void" },
  XCreateSimpleWindow: {
    parameters: [
      "pointer",
      "usize",
      "i32",
      "i32",
      "u32",
      "u32",
      "u32",
      "u64",
      "u64",
    ],
    result: "usize",
  },
} as const;

enum XEvMask {
  NoEvent = 0,
  KeyPress = 1 << 0,
  KeyRelease = 1 << 1,
  ButtonPress = 1 << 2,
  ButtonRelease = 1 << 3,
  EnterWindow = 1 << 4,
  LeaveWindow = 1 << 5,
  PointerMotion = 1 << 6,
  PointerMotionHint = 1 << 7,
  Button1Motion = 1 << 8,
  Button2Motion = 1 << 9,
  Button3Motion = 1 << 10,
  Button4Motion = 1 << 11,
  Button5Motion = 1 << 12,
  ButtonMotion = 1 << 13,
  KeymapState = 1 << 14,
  Exposure = 1 << 15,
  VisibilityChange = 1 << 16,
  StructureNotify = 1 << 17,
  ResizeRedirect = 1 << 18,
  SubstructureNotify = 1 << 19,
  SubstructureRedirect = 1 << 20,
  FocusChange = 1 << 21,
  PropertyChange = 1 << 22,
  ColormapChange = 1 << 23,
  OwnerGrabButton = 1 << 24,
}

class X11Window implements Window {
  readonly id: bigint;
  constructor(readonly lib: X11Library) {
    const view = new Deno.UnsafePointerView(lib.screen);
    const parent = view.getBigUint64(16);
    const white_pixel = view.getBigUint64(88);
    const black_pixel = view.getBigUint64(96);

    const window = lib.X11.symbols.XCreateSimpleWindow(
      lib.display,
      parent,
      10,
      10,
      100,
      100,
      0,
      black_pixel,
      white_pixel,
    );
    if (BigInt(window) === 0n) throw new Error("Failed to create window");

    lib.X11.symbols.XSelectInput(
      lib.display,
      window,
      XEvMask.Exposure | XEvMask.KeyPress | XEvMask.KeyRelease |
        XEvMask.StructureNotify | XEvMask.PointerMotion,
    );
    lib.X11.symbols.XMapWindow(lib.display, window);
    this.id = BigInt(window);
    this.lib.windows.set(this.id, this);
  }
  [Symbol.dispose](): void {
    this.close();
  }
  close(): void {
    this.lib.windows.delete(this.id);
  }
}

class X11Library implements Library {
  readonly X11: Deno.DynamicLibrary<typeof x11functions>;
  readonly display: Deno.PointerObject;
  readonly screen: Deno.PointerObject;
  readonly windows = new Map<bigint, X11Window>();
  readonly surface: Deno.UnsafeWindowSurface;
  constructor() {
    this.X11 = Deno.dlopen("libX11.so", x11functions);
    const display = this.X11.symbols.XOpenDisplay(0);
    if (display == null) throw new Error("Failed to open display");
    this.display = display;
    const screen = this.X11.symbols.XDefaultScreenOfDisplay(display);
    if (screen == null) throw new Error("Failed to get default screen");
    this.screen = screen;
    this.surface = new Deno.UnsafeWindowSurface("x11", screen, display);
  }
  [Symbol.dispose](): void {
    this.close();
  }

  getWebGPUContext(): GPUCanvasContext {
    return this.surface.getContext("webgpu");
  }

  getSurface() {
    return this.surface;
  }

  openWindow(): X11Window {
    return new X11Window(this);
  }

  #event = new ArrayBuffer(192);
  event(): UIEvent | null {
    if (this.X11.symbols.XPending(this.display) == 0) return null;
    this.X11.symbols.XNextEvent(
      this.display,
      Deno.UnsafePointer.of(this.#event),
    );
    const view = new DataView(this.#event);
    const windowId = view.getBigUint64(32, true);
    switch (view.getInt32(0, true)) {
      case 6:
        return {
          type: UIEventType.MouseMove,
          x: view.getInt32(64, true),
          y: view.getInt32(68, true),
          window: this.windows.get(windowId) ?? null,
        };
    }

    return null;
  }
  close(): void {
    this.X11.close();
  }
}

export const load: LoadLibrary = () => new X11Library();
