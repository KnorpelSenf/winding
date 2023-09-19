import { load } from "./platforms/win32/mod.ts";

const library = load();

const window = library.openWindow();

while (true) {
  const e = window.event();
  if (e) console.log(e);
}
window.close();

library.close();
