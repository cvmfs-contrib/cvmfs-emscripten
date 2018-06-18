#include <assert.h>
#include <emscripten.h>
#include <fcntl.h>
#include <string.h>
#include <unistd.h>

#define BUF_SIZE 64

void check_contents(const char *path, const char *contents) {
  char buf[BUF_SIZE] = {0};
  int fd, bytes_read, file_size;

  fd = open(path, O_RDONLY);
  assert(fd != -1);

  file_size = strlen(contents);
  bytes_read = read(fd, buf, file_size);
  assert(bytes_read == file_size);

  assert(strcmp(buf, contents) == 0);
}

int main() {
    EM_ASM(
        window._cvmfs_testname = 'read regular';
    );

    const char regular_path[] = "/cvmfs/emscripten.cvmfs.io/test/regular";
    const char regular_contents[] = "content\n";
    check_contents(regular_path, regular_contents);

    const char empty_path[] = "/cvmfs/emscripten.cvmfs.io/test/empty";
    const char empty_contents[] = "";
    check_contents(empty_path, empty_contents);

    const char reg_subdir_path[] = "/cvmfs/emscripten.cvmfs.io/test/subdir/regular_subdir";
    const char reg_subdir_contents[] = "";
    check_contents(reg_subdir_path, reg_subdir_contents);

    return 0;
}
