export enum WindowEventType {
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

export interface WindowKeyEvent {
  type: WindowEventType.KeyDown | WindowEventType.KeyUp;
  key: string;
}
export interface WindowButtonEvent {
  type: WindowEventType.MouseDown | WindowEventType.MouseUp;
  button: MouseButton;
}
export interface WindowMoveEvent {
  type: WindowEventType.MouseMove;
  x: number;
  y: number;
}

export type WindowEvent = WindowKeyEvent | WindowButtonEvent | WindowMoveEvent;

export interface Window {
  event(): WindowEvent | null;
  close(): void;
}

export interface Library {
  openWindow(): Window;
  close(): void;
}

export type LoadLibrary = () => Library;
