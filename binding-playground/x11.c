#include <stdio.h>
#include <X11/Xlib.h>

int main(void) {
    printf("XEvent %d\n", sizeof(XEvent));
    printf("Offset: %ld\n", (long)offsetof(XKeyEvent, keycode));
}
