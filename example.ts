import { load } from "./mod.ts";

const library = load();

const window = library.openWindow();

while (true) {
  const e = library.event();
  if (e) console.log(e);
}
window.close();

library.close();
