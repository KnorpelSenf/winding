export async function platform() {
  const { os } = Deno.build;
  switch (os) {
    case "linux":
      return await import("./x11/api.ts");
    default:
      throw new Error("Unsupported platform", os);
  }
}
