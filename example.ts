import { load } from "./mod.ts";

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

using library = load();
using _window = library.openWindow(100, 100, 640, 480);

while (true) {
  const event = library.event();
  if (event === undefined) {
    await sleep(10);
    continue;
  }

  const { window: _window, ...restEvent } = event;
  console.log(restEvent);

  // Close and quit if q is pressed
  if (
    (event.type === "keydown" && event.keycode === 24 /* 24 = q in x11 */) ||
    (event.type === "keychar" && event.key === "q" /* keychar is win-only */)
  ) {
    console.log("Q uit!");
    break;
  }
  // Also quitting the app when the mouse enters the top-left quadrant, because why not
  if (event.type == "mousemove" && event.x < 50 && event.y < 50) {
    console.log("No one touches my upper <body> parts!");
    break;
  }
}
