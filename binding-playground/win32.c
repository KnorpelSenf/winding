#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <windows.h>

extern void printWindowClass(WNDCLASSEXW *const);

LRESULT wndProc(HWND hWnd, uint32_t uMsg, size_t wParam, ssize_t lParam) {
  printf("CALLED\n");
  return DefWindowProcW(hWnd, uMsg, wParam, lParam);
}

int main(void) {
  printf("sizeof(MSG) %d\n", sizeof(MSG));
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
  printWindowClass(&wndClass);
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