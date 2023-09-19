// const debug = Deno.dlopen("./printWindowClass.dll", {
//   printWindowClass: { parameters: ["buffer"], result: "void" },
// });

const logCalls = false;

const kernel32 = Deno.dlopen("kernel32", {
  GetModuleHandleW: { parameters: ["pointer"], result: "usize" },
  GetLastError: { parameters: [], result: "u32" },
  FormatMessageW: {
    parameters: ["u32", "pointer", "u32", "u32", "pointer", "u32", "pointer"],
    result: "u32",
  },
});

const user32 = Deno.dlopen("user32", {
  LoadCursorW: { parameters: ["pointer", "usize"], result: "usize" },
  RegisterClassExW: {
    parameters: ["buffer"],
    result: "u16",
  },
  CreateWindowExW: {
    parameters: [
      "u32",
      "buffer",
      "buffer",
      "u32",
      "u32",
      "u32",
      "u32",
      "u32",
      "pointer",
      "pointer",
      "pointer",
      "usize",
    ],
    result: "pointer",
  },
  PeekMessageW: {
    parameters: ["pointer", "pointer", "u32", "u32", "u32"],
    result: "bool",
    callback: true,
  },
  TranslateMessage: { parameters: ["pointer"], result: "bool" },
  DispatchMessageW: {
    parameters: ["pointer"],
    result: "usize",
  },
  DefWindowProcW: {
    parameters: ["pointer", "u32", "usize", "usize"],
    result: "usize",
    callback: true,
  },
});

const lastError = () => {
  if (logCalls) console.log("GetLastError");
  const code = kernel32.symbols.GetLastError();
  const buf = new ArrayBuffer(2048);
  const bufU16 = new Uint16Array(buf);
  if (logCalls) console.log("FormatMessageW");
  const bytesWritten = kernel32.symbols.FormatMessageW(
    0x1000,
    null,
    code,
    0,
    Deno.UnsafePointer.of(buf),
    1024,
    null,
  );
  if (bytesWritten == 0) {
    console.error("Failed to call FormatMessageW");
  }
  let s = "";
  for (let i = 0; i < bytesWritten; i++) {
    s += String.fromCharCode(bufU16[i]);
  }
  return s.trim() + " (" + code + ")";
};

const wndClassBuf = new ArrayBuffer(80);
const wndClassDv = new DataView(wndClassBuf);
let off = 0;

// cbSize
wndClassDv.setUint32(off, wndClassBuf.byteLength, true);
off += 4;

// style
wndClassDv.setUint32(off, 0x1 | 0x2 | 0x20, true);
off += 4;

// lpfnWndProc
const wndProc = new Deno.UnsafeCallback({
  parameters: ["pointer", "u32", "usize", "usize"],
  result: "usize",
}, (hWnd, uMsg, wParam, lParam) => {
  if (logCalls) console.log("DefWindowProcW");
  return user32.symbols.DefWindowProcW(hWnd, uMsg, wParam, lParam);
});
wndClassDv.setBigUint64(
  off,
  BigInt(Deno.UnsafePointer.value(wndProc.pointer)),
  true,
);
off += 8;

// cbClsExtra
off += 4;

// cbWndExtra
off += 4;

// hInstance
if (logCalls) console.log("GetModuleHandleW");
const instance = kernel32.symbols.GetModuleHandleW(null);
if (BigInt(instance) == 0n) {
  console.error("Failed to get module handle");
}
wndClassDv.setBigUint64(off, BigInt(instance), true);
off += 8;

// hIcon
off += 8;

// hCursor
if (logCalls) console.log("LoadCursorW");
const cursor = user32.symbols.LoadCursorW(null, 32512);
if (BigInt(cursor) === 0n) {
  console.error("Failed to get cursor");
}
// (IDC_ARROW - https://learn.microsoft.com/en-us/windows/win32/menurc/about-cursors)
wndClassDv.setBigUint64(off, BigInt(cursor), true);
off += 8;

// hbrBackground
off += 8;

// lpszMenuName
off += 8;

// lpszClassName
const name = "ThomasWindowClass";
const classNameBuf = new ArrayBuffer((name.length + 1) * 2);
const classNameU16 = new Uint16Array(classNameBuf);
for (let i = 0; i < name.length; i++) {
  classNameU16[i] = name.charCodeAt(i);
}
classNameU16[name.length] = 0;

const className = Deno.UnsafePointer.of(classNameBuf);
wndClassDv.setBigUint64(off, BigInt(Deno.UnsafePointer.value(className)), true);
off += 8;

// hIconSm
off += 8;

if (off !== wndClassBuf.byteLength) {
  console.error("Failed to completely fill out wndClass");
}

// debug.symbols.printWindowClass(wndClassBuf);

if (logCalls) console.log("RegisterClassExW");
const wndClass = user32.symbols.RegisterClassExW(wndClassBuf);

if (wndClass == 0) {
  console.error("Failed to register window class: " + lastError());
}

if (logCalls) console.log("CreateWindowExW");
const window = user32.symbols.CreateWindowExW(
  0,
  classNameBuf,
  null,
  0x10CF0000,
  0x80000000,
  0x80000000,
  0x80000000,
  0x80000000,
  null,
  null,
  null,
  0,
);

if (Deno.UnsafePointer.value(window) == 0) {
  if (logCalls) console.log("Failed to create window: " + lastError());
}

const msg = new ArrayBuffer(48);
const msgPtr = Deno.UnsafePointer.of(msg);

let running = true;
while (running) {
  while (user32.symbols.PeekMessageW(msgPtr, window, 0, 0, 1)) {
    if (logCalls) console.log("TranslateMessage");
    user32.symbols.TranslateMessage(msgPtr);
    if (logCalls) console.log("DispatchMessageW");
    user32.symbols.DispatchMessageW(msgPtr);
    if (logCalls) console.log("PeekMessageW");
  }
}

wndProc.close();
user32.close();
kernel32.close();
// debug.close();
