export enum UIEventType {
  KeyDown,
  KeyUp,
  MouseDown,
  MouseUp,
  MouseMove,
}

export enum MouseButton {
  Left,
  Middle,
  Right,
}

export interface KeyEvent {
  type: UIEventType.KeyDown | UIEventType.KeyUp;
  key: string;
}
export interface ButtonEvent {
  type: UIEventType.MouseDown | UIEventType.MouseUp;
  button: MouseButton;
}
export interface MoveEvent {
  type: UIEventType.MouseMove;
  x: number;
  y: number;
}

export type UIEvent =
  & { window: Window | null }
  & (KeyEvent | ButtonEvent | MoveEvent);

export interface Window {
  [Symbol.dispose]: () => void;
  close(): void;
}

export interface Library {
  [Symbol.dispose]: () => void;
  openWindow(): Window;
  event(): UIEvent | null;
  close(): void;
}

export type LoadLibrary = () => Library;
