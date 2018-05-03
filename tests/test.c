#include <assert.h>
#include <dirent.h>
#include <emscripten.h>
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>

void test_open() {
    int fd;

    fd = open("/cvmfs", O_RDONLY);
    assert(fd != -1);

    fd = open("/cvmfs/file", O_RDONLY);
    assert(fd == -1);
    assert(errno == ENOENT);
}

void test_readdir() {
    DIR *dir;
    struct dirent *dp;

    dir = opendir("/cvmfs");
    assert(dir != NULL);

    dp = readdir(dir);
    assert(dp == NULL);
    assert(errno == ENOSYS);
}

int main() {
    EM_ASM(
        FS.mkdir('/cvmfs');
        FS.mount(CVMFS, {}, '/cvmfs');
    );

    test_open();
    test_readdir();

    return 0;
}