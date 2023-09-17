export type X11Bindings = ReturnType<typeof bind>;
export function bind() {
  return Deno.dlopen("libX11.so", {
    XOpenDisplay: { parameters: ["usize"], result: "pointer" },
    XCloseDisplay: { parameters: ["pointer"], result: "void" },
    XDefaultScreenOfDisplay: { parameters: ["pointer"], result: "pointer" },
    XMapWindow: { parameters: ["pointer", "usize"], result: "void" },
    XPending: { parameters: ["pointer"], result: "i32" },
    XSelectInput: { parameters: ["pointer", "usize", "u64"], result: "void" },
    XNextEvent: { parameters: ["pointer", "pointer"], result: "void" },
    XSetForeground: {
      parameters: ["pointer", "pointer", "i64"],
      result: "void",
    },
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
    XCreateGC: {
      parameters: ["pointer", "usize", "u64", "pointer"],
      result: "pointer",
    },
    XDrawLine: {
      parameters: ["pointer", "usize", "pointer", "i32", "i32", "i32", "i32"],
      result: "void",
    },
    XFlush: { parameters: ["pointer"], result: "void" },
    /**
     * @param **display** - Specifies the connection to the X server.
     * @param **screen_number** - Specifies the appropriate screen number on the host server.
     */
    XDefaultVisual: { parameters: ["pointer", "i32"], result: "pointer" },
    /**
     * @param **display** - Specifies the connection to the X server.
     * @param **visual** - Specifies the Visual structure.
     * @param **depth** - Specifies the depth of the image.
     * @param **format** - Specifies the format for the image. You can pass XYBitmap, XYPixmap, or ZPixmap.
     * @param **offset** - Specifies the number of pixels to ignore at the beginning of the scanline.
     * @param **data** - Specifies the image data.
     * @param **width** - Specifies the width of the image, in pixels.
     * @param **height** - Specifies the height of the image, in pixels.
     * @param **bitmap_pad** - Specifies the quantum of a scanline (8, 16, or 32). In other words, the start of one scanline is separated in client memory from the start of the next scanline by an integer multiple of this many bits.
     * @param **bytes_per_line** - Specifies the number of bytes in the client image between the start of one scanline and the start of the next.
     */
    XCreateImage: {
      parameters: [
        "pointer",
        "pointer",
        "u32",
        "i32",
        "i32",
        "buffer",
        "u32",
        "u32",
        "i32",
        "i32",
      ],
      result: "pointer",
    },
    /**
     * @param **display** - Specifies the connection to the X server.
     */
    XDefaultScreen: {
      parameters: ["pointer"],
      result: "i32",
    },
    /**
     * @param *display* - Specifies the connection to the X server.
     * @param *d* - Specifies the drawable.
     * @param *gc* -  Specifies the GC.
     * @param *image* - Specifies the image you want combined with the rectangle.
     * @param *src_x* - Specifies the offset in X from the left edge of the image defined by the XImage structure.
     * @param *src_y* - Specifies the offset in Y from the top edge of the image defined by the XImage structure.
     * @param *dest_x* -  Specify x coordinate, which is relative to the origin of the drawable and are the coordinates of the subimage.
     * @param *dest_y* -  Specify y coordinate, which is relative to the origin of the drawable and are the coordinates of the subimage.
     * @param *width* -  Specify the width of the subimage
     * @param *height* -  Specify the height of the subimage
     */
    XPutImage: {
      parameters: [
        "pointer",
        "usize",
        "pointer",
        "pointer",
        "i32",
        "i32",
        "i32",
        "i32",
        "u32",
        "u32",
      ],
      result: "void",
    },
  });
}

export enum XEvMask {
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

export type EventType = keyof typeof XEvMap;
export const XEvMap = {
  "none": XEvMask.NoEvent,
  "keypress": XEvMask.KeyPress,
  "keyrelease": XEvMask.KeyRelease,
  "buttonpress": XEvMask.ButtonPress,
  "buttonrelease": XEvMask.ButtonRelease,
  "enterwindow": XEvMask.EnterWindow,
  "leavewindow": XEvMask.LeaveWindow,
  "pointermotion": XEvMask.PointerMotion,
  "pointermotionhint": XEvMask.PointerMotionHint,
  "button0motion": XEvMask.Button1Motion,
  "button1motion": XEvMask.Button2Motion,
  "button2motion": XEvMask.Button3Motion,
  "button3motion": XEvMask.Button4Motion,
  "button4motion": XEvMask.Button5Motion,
  "buttonmotion": XEvMask.ButtonMotion,
  "keymapstate": XEvMask.KeymapState,
  "exposure": XEvMask.Exposure,
  "visibilitychange": XEvMask.VisibilityChange,
  "structurenotify": XEvMask.StructureNotify,
  "resizeredirect": XEvMask.ResizeRedirect,
  "substructurenotify": XEvMask.SubstructureNotify,
  "substructureredirect": XEvMask.SubstructureRedirect,
  "focuschange": XEvMask.FocusChange,
  "propertychange": XEvMask.PropertyChange,
  "colormapchange": XEvMask.ColormapChange,
  "ownergrabbutton": XEvMask.OwnerGrabButton,
} as const;

export enum XEvType {
  KeyPress = 2,
  KeyRelease = 3,
  ButtonPress = 4,
  ButtonRelease = 5,
  MotionNotify = 6,
  EnterNotify = 7,
  LeaveNotify = 8,
  FocusIn = 9,
  FocusOut = 10,
  KeymapNotify = 11,
  Expose = 12,
  GraphicsExpose = 13,
  NoExpose = 14,
  VisibilityNotify = 15,
  CreateNotify = 16,
  DestroyNotify = 17,
  UnmapNotify = 18,
  MapNotify = 19,
  MapRequest = 20,
  ReparentNotify = 21,
  ConfigureNotify = 22,
  ConfigureRequest = 23,
  GravityNotify = 24,
  ResizeRequest = 25,
  CirculateNotify = 26,
  CirculateRequest = 27,
  PropertyNotify = 28,
  SelectionClear = 29,
  SelectionRequest = 30,
  SelectionNotify = 31,
  ColormapNotify = 32,
  ClientMessage = 33,
  MappingNotify = 34,
  GenericEvent = 35,
}
