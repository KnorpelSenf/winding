import {
  type Library,
  type LoadLibrary,
  type Window,
  type WindowEvent,
  WindowEventType,
  WindowMoveEvent,
} from "../../v2.ts";

const x11functions = {
  XOpenDisplay: { parameters: ["usize"], result: "pointer" },
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

const windows = new Map<
  bigint,
  { event: WindowEvent | null; window: X11Window }
>();

class X11Window implements Window {
  #window: bigint;
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
    this.#window = BigInt(window);
    windows.set(this.#window, { event: null, window: this });
  }
  #event = new ArrayBuffer(192);
  event(): WindowEvent | null {
    if (this.lib.X11.symbols.XPending(this.lib.display) == 0) return null;
    this.lib.X11.symbols.XNextEvent(
      this.lib.display,
      Deno.UnsafePointer.of(this.#event),
    );
    const view = new DataView(this.#event);
    const window = view.getBigUint64(32, true);
    const mapEntry = windows.get(window);
    if (mapEntry == null) return null;

    switch (view.getInt32(0, true)) {
      case 6: {
        const event = (mapEntry.event = mapEntry.event ??
          { type: WindowEventType.MouseMove, x: 0, y: 0 }) as WindowMoveEvent;
        event.x = view.getInt32(64, true);
        event.y = view.getInt32(68, true);
        break;
      }
    }
    return window === this.#window ? mapEntry.event : null;
  }
  close(): void {
    windows.delete(this.#window);
  }
}

class X11Library implements Library {
  readonly X11: Deno.DynamicLibrary<typeof x11functions>;
  readonly display: Deno.PointerObject;
  readonly screen: Deno.PointerObject;
  constructor() {
    this.X11 = Deno.dlopen("libX11.so", x11functions);
    const display = this.X11.symbols.XOpenDisplay(0);
    if (display == null) throw new Error("Failed to open display");
    this.display = display;
    const screen = this.X11.symbols.XDefaultScreenOfDisplay(display);
    if (screen == null) throw new Error("Failed to get default screen");
    this.screen = screen;
  }
  openWindow(): X11Window {
    return new X11Window(this);
  }
  close(): void {
  }
}

export const load: LoadLibrary = () => new X11Library();
