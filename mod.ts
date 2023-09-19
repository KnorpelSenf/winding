import type { LoadLibrary } from "./v2.ts";
import { load as X11Load } from "./platforms/x11/mod.ts";
import { load as Win32Load } from "./platforms/win32/mod.ts";

export const load: LoadLibrary = () => {
  if (Deno.build.os === "windows") return Win32Load();
  return X11Load();
};
