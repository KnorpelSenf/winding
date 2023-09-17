import { bind, type X11Bindings, XEvMask, XEvType } from "./bindings.ts";

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

export interface InputEventStream {
  hasNext(): boolean;
  next(): InputEvent | undefined;
}

export type InputEvent = KeyPressEvent | KeyReleaseEvent;

interface KeyEvent {
  keycode: number;
}
export interface KeyPressEvent extends KeyEvent {
  type: "keypress";
}
export interface KeyReleaseEvent extends KeyEvent {
  type: "keyrelease";
}

function eventFromBinding(event: DataView): InputEvent | undefined {
  const littleEndian = true;
  const type: XEvType = event.getInt32(0, littleEndian);
  switch (type) {
    case XEvType.KeyPress:
      return { type: "keypress", keycode: event.getUint32(84, littleEndian) };
    case XEvType.KeyRelease:
      return { type: "keyrelease", keycode: event.getUint32(84, littleEndian) };
    default:
      console.error("event type", type, "unimplemented");
      return undefined;
  }
}

function window(
  x11: X11Bindings,
  displayPtr: Deno.PointerValue,
  windowId: number | bigint,
) {
  return {
    id: windowId,
    display() {
      x11.symbols.XMapWindow(displayPtr, windowId);
    },
    flush() {
      x11.symbols.XFlush(displayPtr);
    },
    getInput(eventTypes: EventType | EventType[]): InputEventStream {
      x11.symbols.XSelectInput(
        displayPtr,
        windowId,
        (Array.isArray(eventTypes) ? eventTypes : [eventTypes])
          .map((e) => XEvMap[e])
          .reduce((e0, e1) => e0 | e1, 0),
      );

      const event = new Uint8Array(192); // sizeof(XEvent)
      const eventView = new DataView(
        event.buffer,
        event.byteOffset,
        event.byteLength,
      );
      const eventPtr = Deno.UnsafePointer.of(event);

      return {
        hasNext() {
          return x11.symbols.XPending(displayPtr) !== 0;
        },
        next() {
          x11.symbols.XNextEvent(displayPtr, eventPtr);
          return eventFromBinding(eventView);
        },
      };
    },
  };
}

export function load() {
  const x11 = bind();

  function openWindow(x: number, y: number, width: number, height: number) {
    const displayPtr = x11.symbols.XOpenDisplay(0);
    const defaultScreenPtr = x11.symbols.XDefaultScreenOfDisplay(displayPtr);
    if (defaultScreenPtr === null) throw new Error("No default screen!");
    const view = new Deno.UnsafePointerView(defaultScreenPtr);
    const parent = view.getBigUint64(16);
    const borderWidth = 0;
    const borderColor = view.getBigUint64(96); // black
    const backgroundColor = view.getBigUint64(88); // white
    const windowId = x11.symbols.XCreateSimpleWindow(
      displayPtr,
      parent,
      x,
      y,
      width,
      height,
      borderWidth,
      borderColor,
      backgroundColor,
    );

    return window(x11, displayPtr, windowId);
  }

  return { openWindow };
}
