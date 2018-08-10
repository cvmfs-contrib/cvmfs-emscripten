#include <assert.h>
#include <emscripten.h>
#include <fcntl.h>
#include <string.h>
#include <unistd.h>

#define BUF_SIZE 64

void check_regular() {
  const char contents[] = "content\n";
  const size_t contents_len = strlen(contents);

  char buf[BUF_SIZE] = {0};
  int fd, bytes_read;

  fd = open("/cvmfs/emscripten.cvmfs.io/test/regular", O_RDONLY);
  assert(fd != -1);

  bytes_read = read(fd, buf, contents_len);
  assert(bytes_read == contents_len);

  assert(strcmp(buf, contents) == 0);
}

int main() {
    EM_ASM(
        window._cvmfs_testname = 'local storage caching';

        localStorage.clear();
    );

    check_regular();

    EM_ASM(
      window._cvmfs_clearHashesLog();
    );

    check_regular();

    EM_ASM(
      window._cvmfs_checkHashesLog([]);
    );

    return 0;
}
