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
import { load } from "https://deno.land/x/winding/mod.ts";

using library = load();
using _window = library.openWindow();

// Get the event at least once to start.
// In your app you would introduce an event loop around this.
const _event = library.event();

setTimeout(() => {}, 5000);

```

Run the file with FFI bindings allowed.

```sh
deno run --unstable-ffi --allow-ffi app.ts 
```

Also See [this example](./example.ts).
