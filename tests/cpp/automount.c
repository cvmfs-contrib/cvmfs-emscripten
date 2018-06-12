#include <assert.h>
#include <emscripten.h>
#include <fcntl.h>

int main() {
    EM_ASM(
        window._cvmfs_testname = 'automounting';
    );

    // "/cvmfs" shouldn't be created if repository subdir wasn't accessed
    assert(open("/cvmfs", O_RDONLY) == -1);

    assert(open("/cvmfs/emscripten.cvmfs.io", O_RDONLY) != -1);

    return 0;
}
