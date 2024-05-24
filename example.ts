import { load } from "./mod.ts";

import { UIEventType } from "./src/types.ts";

const adapter = await navigator.gpu.requestAdapter();
const device = await adapter!.requestDevice();

using library = load();
using _window = library.openWindow();


const _initEvent = library.event();

const ctx = library.getWebGPUContext();
ctx.configure({
  device,
  format: navigator.gpu.getPreferredCanvasFormat(),
  colorSpace: "srgb",
  alphaMode: "premultiplied",
  height: 100,
  width: 100,
  viewFormats: ['r8unorm']
});

const commandEncoder = device.createCommandEncoder();

/* const renderPassDescriptor = {
  colorAttachments: [
    {
      clearValue: [0, 0, 0, 1], // Opaque black
      loadOp: "clear",
      storeOp: "store",
      view: ctx.getCurrentTexture().createView(),
    },
  ],
};
const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor as any); */

while (true) {
  const event = library.event();

  if (event) console.log(event);

  if (event?.type == UIEventType.MouseMove) {
    console.log(`mousemove [ X: ${pad(event.x)} | Y: ${pad(event.y)} ]`);

    // Quitting the app when the mouse enters the lower right quadrant, because why not
    if (event.x > 50 && event.y > 50) {

      
      // ctx.configure({
      //   device,
      //   format: navigator.gpu.getPreferredCanvasFormat(),
      //   width: 800,
      //   height: 600
      // });

      ctx.getCurrentTexture()
      // console.log(ctx.getCurrentTexture())

      break;
    }
  }
}

function pad(n: number): string {
  return String(n).padStart(4, "0")
}
