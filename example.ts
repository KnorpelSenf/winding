import { load } from "./mod.ts";

import { UIEventType } from "./src/types.ts";

using library = load();
using _window = library.openWindow();

while (true) {
  const event = library.event();

  if (event) console.log(event);

  if (event?.type == "mousemove") {
    console.log(`mousemove [ X: ${pad(event.x)} | Y: ${pad(event.y)} ]`);

    // Quitting the app when the mouse enters the top-left quadrant, because why not
    if (event.x > 50 && event.y > 50) {
      break;
    }
  }
}

function pad(n: number): string {
  return String(n).padStart(4, "0");
}
