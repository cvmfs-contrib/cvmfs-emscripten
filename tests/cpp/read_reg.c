#include <assert.h>
#include <emscripten.h>
#include <fcntl.h>
#include <string.h>
#include <unistd.h>

int main() {
    EM_ASM(
        window._cvmfs_testname = 'read regular';
    );

    const char file_contents[] = "content\n";
    const int file_size = sizeof(file_contents) - 1;

    char buf[file_size + 1];
    int fd, bytes_read;

    fd = open("/cvmfs/emscripten.cvmfs.io/test/regular", O_RDONLY);
    assert(fd != -1);

    bytes_read = read(fd, buf, file_size);
    assert(bytes_read == file_size);

    assert(strcmp(buf, file_contents) == 0);

    return 0;
}
