#include <emscripten.h>
#include <stdio.h>

int main() {
    printf("Check browser JavaScript console\n");

    EM_ASM(
        FS.mkdir('/cvmfs');
        FS.mount(CVMFS, {}, '/cvmfs');
    );
}