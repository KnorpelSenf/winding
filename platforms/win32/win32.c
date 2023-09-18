#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <windows.h>

LRESULT wndProc(HWND hWnd, uint32_t uMsg, size_t wParam, ssize_t lParam) {
  printf("CALLED\n");
  return DefWindowProcW(hWnd, uMsg, wParam, lParam);
}

int main(void) {
  //   printf("sizeof(WNDCLASSEXW) : %d\n", sizeof(WNDCLASSEXW));
  //   printf("cbSize %d\n", offsetof(WNDCLASSEXW, cbSize));
  //   printf("style %d\n", offsetof(WNDCLASSEXW, style));
  //   printf("lpfnWndProc %d\n", offsetof(WNDCLASSEXW, lpfnWndProc));
  //   printf("cbClsExtra %d\n", offsetof(WNDCLASSEXW, cbClsExtra));
  //   printf("cbWndExtra %d\n", offsetof(WNDCLASSEXW, cbWndExtra));
  //   printf("hInstance %d\n", offsetof(WNDCLASSEXW, hInstance));
  //   printf("hIcon %d\n", offsetof(WNDCLASSEXW, hIcon));
  //   printf("hCursor %d\n", offsetof(WNDCLASSEXW, hCursor));
  //   printf("hbrBackground %d\n", offsetof(WNDCLASSEXW, hbrBackground));
  //   printf("lpszMenuName %d\n", offsetof(WNDCLASSEXW, lpszMenuName));
  //   printf("hIconSm %d\n", offsetof(WNDCLASSEXW, hIconSm));
  WNDCLASSEXW wndClass = {
      .cbSize = sizeof(WNDCLASSEXW),
      .style = CS_VREDRAW | CS_HREDRAW | CS_OWNDC,
      .lpfnWndProc = wndProc,
      .cbClsExtra = 0,
      .cbWndExtra = 0,
      .hInstance = GetModuleHandleW(NULL),
      .hIcon = 0,
      .hCursor = LoadCursorW(NULL, MAKEINTRESOURCEW(32512)),
      .hbrBackground = 0,
      .lpszMenuName = 0,
      .lpszClassName = L"ThomasWindowClass",
      .hIconSm = 0,
  };
  uint8_t *ptr = (uint8_t *)&wndClass;
  printf("%d", ptr[0]);
  for (int i = 1; i < sizeof(WNDCLASSEXW); i++) {
    printf(", %d", ptr[i]);
  }
  exit(0);
  if (RegisterClassExW(&wndClass) == 0) {
    printf("Failed to register class\n");
  }
  HWND window =
      CreateWindowExW(0, L"ThomasWindowClass", L"Hello", 0x10CF0000,
                      CW_USEDEFAULT, CW_USEDEFAULT, CW_USEDEFAULT,
                      CW_USEDEFAULT, NULL, NULL, GetModuleHandleW(NULL), NULL);
  if (window == 0) {
    printf("Failed to create window\n");
  };
  MSG msg;
  while (1) {
    while (PeekMessageW(&msg, window, 0, 0, PM_REMOVE) != 0) {
      TranslateMessage(&msg);
      DispatchMessage(&msg);
    }
  }
  return 0;
}