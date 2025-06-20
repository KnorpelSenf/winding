export type UIEvent =
  | KeyEvent
  | ButtonEvent
  | MoveEvent
  | FocusEvent
  | WindowWindowEvent;
export type UIEventType = UIEvent["type"];

export interface WindowEvent {
  type: string;
  window?: Window;
}
/**
 * Long term we should align to JS codes, @see https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code
 * Overview: @see https://www.cambiaresearch.com/articles/15/javascript-char-codes-key-codes
 */
export interface KeyEvent extends WindowEvent {
  // TODO consolidate sys-types as they are Windows only
  type:
    | "keydown"
    | "keyup"
    | "keychar"
    | "syskeydown"
    | "syskeyup"
    | "syskeychar";
  /** For Windows this is the virtual-key code
   * @see https://learn.microsoft.com/en-us/windows/win32/inputdev/virtual-key-codes */
  keycode: number;
  /**
   * "keychar" in Windows is the translated character when a keydown event happend.
   * For combined characters, multiple keydown events with just a single keychar event might happen.
   *  Examples:
   *   - press [o], release [0] => keydown o, keychar "o", keyup o
   *   - press [Shift], press [o], release both => keydown 16, keydown o, keychar "O", keyup 16, keyup o
   *   - press [^], press [o], release both => keydown 220, keydown o, keychar "ô", keyup 220, keyup o
   */
  key?: string;
  isExtended?: boolean;
  debug?: any;
}
export interface ButtonEvent extends WindowEvent {
  type: "mousedown" | "mouseup";
  button: "left" | "middle" | "right";
}
export interface MoveEvent extends WindowEvent {
  type: "mousemove";
  x: number;
  y: number;
}
export interface FocusEvent extends WindowEvent {
  type: "focus" | "blur";
}
// TODO beter name, lul
export interface WindowWindowEvent extends WindowEvent {
  type: "move" | "resize" | "destroy";
}

export interface Window {
  [Symbol.dispose]: () => void;
  close(): void;
}

export interface Library {
  [Symbol.dispose]: () => void;
  openWindow(): Window;
  openWindow(x: number, y: number): Window;
  openWindow(x: number, y: number, w: number, h: number): Window;
  event(): UIEvent | undefined;
  close(): void;
}

export type LoadLibrary = () => Library;
