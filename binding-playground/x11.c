#include <stdio.h>
#include <X11/Xlib.h>

int main() {
    int len = sizeof(XEvent);
    printf("XEvent %d\n", len);
}
