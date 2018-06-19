#include <assert.h>
#include <string.h>
#include <unistd.h>
#include <emscripten.h>

#define BUF_SIZE 64

int main() {
    EM_ASM(
        window._cvmfs_testname = 'readlink';
    );

    const char symlink_val[] = "/cvmfs/emscripten.cvmfs.io/test/regular";

    char buf[BUF_SIZE] = { 0 };
    int bytes_read;

    bytes_read = readlink("/cvmfs/emscripten.cvmfs.io/test/symlink", buf, BUF_SIZE);

    assert(bytes_read == strlen(symlink_val));
    assert(strcmp(buf, symlink_val) == 0);

    return 0;
}
