const x11functions = {
  XOpenDisplay: { parameters: ['usize'], result: 'pointer' },
  XCloseDisplay: { parameters: ['pointer'], result: 'void' },
  XDefaultScreenOfDisplay: { parameters: ['pointer'], result: 'pointer' },
  XMapWindow: { parameters: ['pointer', 'usize'], result: 'void' },
  XPending: { parameters: ['pointer'], result: 'i32' },
  XSelectInput: { parameters: ['pointer', 'usize', 'u64'], result: 'void' },
  XNextEvent: { parameters: ['pointer', 'pointer'], result: 'void' },
  XCreateSimpleWindow: {
    parameters: [
      'pointer',
      'usize',
      'i32',
      'i32',
      'u32',
      'u32',
      'u32',
      'u64',
      'u64'
    ],
    result: 'usize'
  }
} as const

const adapter = await navigator.gpu.requestAdapter();
const device = await adapter!.requestDevice();

const X11 = Deno.dlopen('libX11.so', x11functions)
const display = X11.symbols.XOpenDisplay(0)
const screen = X11.symbols.XDefaultScreenOfDisplay(display)

// Deno panics here
new Deno.UnsafeWindowSurface('x11', screen, display)
