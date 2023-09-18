const kernel32 = Deno.dlopen("kernel32", {
  GetModuleHandleW: { parameters: ["pointer"], result: "usize" },
  GetLastError: { parameters: [], result: "u32" },
  FormatMessageW: {
    parameters: ["u32", "pointer", "u32", "u32", "pointer", "u32", "pointer"],
    result: "u32",
  },
});

const lastError = () => {
  const code = kernel32.symbols.GetLastError();
  const buf = new ArrayBuffer(2048);
  const bufU16 = new Uint16Array(buf);
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

const user32 = Deno.dlopen("user32", {
  LoadCursorW: { parameters: ["pointer", "usize"], result: "usize" },
  RegisterClassW: {
    parameters: ["buffer"],
    result: "u16",
  },
});

const wndClassBuf = new ArrayBuffer(80);
const wndClassDv = new DataView(wndClassBuf);
let off = 0;

// cbSize
console.log("cbSize", off);
wndClassDv.setUint32(off, wndClassBuf.byteLength, true);
off += 4;

// style
console.log("style", off);
wndClassDv.setUint32(off, 0x1 | 0x2 | 0x20, true);
off += 4;

// lpfnWndProc
console.log("lpfnWndProc", off);
const wndProc = new Deno.UnsafeCallback({
  parameters: ["pointer", "u32", "usize", "usize"],
  result: "usize",
}, (_hWnd, _uMsg, _wParam, _lParam) => {
  console.log("wndProc called!");
  return 42;
});
wndClassDv.setBigUint64(
  off,
  BigInt(Deno.UnsafePointer.value(wndProc.pointer)),
  true,
);
off += 8;

// cbClsExtra
console.log("cbClsExtra", off);
off += 4;

// cbWndExtra
console.log("cbWndExtra", off);
off += 4;

// hInstance
console.log("hInstance", off);
const instance = kernel32.symbols.GetModuleHandleW(null);
if (BigInt(instance) == 0n) {
  console.error("Failed to get module handle");
}
wndClassDv.setBigUint64(off, BigInt(instance), true);
off += 8;

// hIcon
console.log("hIcon", off);
off += 8;

// hCursor
console.log("hCursor", off);
const cursor = user32.symbols.LoadCursorW(null, 32512);
if (BigInt(cursor) === 0n) {
  console.error("Failed to get cursor");
}
// (IDC_ARROW - https://learn.microsoft.com/en-us/windows/win32/menurc/about-cursors)
wndClassDv.setBigUint64(off, BigInt(cursor), true);
off += 8;

// hbrBackground
console.log("hbrBackground", off);
off += 8;

// lpszMenuName
console.log("lpszMenuName", off);
off += 8;

// lpszClassName
console.log("lpszClassName", off);
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
console.log("hIconSm", off);
off += 8;

if (off !== wndClassBuf.byteLength) {
  console.error("Failed to completely fill out wndClass");
}

const ptr = new Uint8Array(wndClassBuf);
let str = String(ptr[0]);
for (let i = 1; i < wndClassBuf.byteLength; i++) {
  str += ", " + ptr[i];
}
console.log(str);

const wndClass = user32.symbols.RegisterClassW(wndClassBuf);

if (wndClass == 0) {
  console.error("Failed to register window class: " + lastError());
}

wndProc.close();
user32.close();
kernel32.close();
