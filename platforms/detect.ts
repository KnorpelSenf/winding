export interface InputStream {
  /** @deprecated */
  hasNext(): boolean;
  /** @deprecated */
  next(): {
    /** @deprecated */
    type: string;
    /** @deprecated */
    keycode: number;
  } | undefined;
}

export interface Window {
  display(): void;
  id: number | bigint;
  /** @deprecated */
  getInput(types: any[]): InputStream;
}

export interface API {
  openWindow(x: number, y: number, width: number, height: number): Window;
}

export interface Library {
  load(): API;
}

export async function platform(): Promise<Library> {
  const { os } = Deno.build;
  switch (os) {
    case "linux":
      return await import("./x11/api.ts");
    case "windows":
      return await import("./win32/api.ts");
    default:
      throw new Error("Unsupported platform " + os);
  }
}
