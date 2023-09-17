import { platform } from "./platforms/detect.ts";

const { load } = await platform();

export const { openWindow } = load();
