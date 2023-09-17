import { openWindow } from "./mod.ts";

const window = openWindow(10, 10, 100, 100);
window.display();
console.log(window.id);

const inputs = window.getInput(["keypress", "keyrelease"]);

let running = true;
while (running) {
  while (inputs.hasNext()) {
    const event = inputs.next()!;
    console.log(event.type, event?.keycode);
    if (event.keycode === 24 /* Q */) {
      running = false;
      break;
    }
  }
}
