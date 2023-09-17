# winding

winding is a cross-platform windowing manager that does not need bindings to
external libraries.

Currently, it supports:

- X11

Contributions are welcome!

## Usage

Create `app.ts` with the following content.

```ts
// app.ts
import { openWindow } from "https://deno.land/x/winding/mod.ts";

const window = openWindow();
window.display();
```

Run the file with FFI bindings allowed.

```sh
deno run --unstable --allow-ffi app.ts
```
