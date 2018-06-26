#include <assert.h>
#include <emscripten.h>
#include <fcntl.h>
#include <string>
#include <string.h>
#include <unistd.h>
#include <vector>

#define CHUNK1 75
#define CHUNK2 36
#define CHUNK3 53
#define CHUNK4 32
#define CHUNK5 60

#define FILE_SIZE (CHUNK1 + CHUNK2 + CHUNK3 + CHUNK4 + CHUNK5)

void check_till_length(size_t len) {
  char reference[FILE_SIZE] = {0};
  char chunked[FILE_SIZE] = {0};
  int fd1, fd2, bytes_read;

  fd1 = open("/cvmfs/emscripten.cvmfs.io/test/chunked-mini", O_RDONLY);
  assert(fd1 != -1);
  assert(read(fd1, chunked, len) == len);

  fd2 = open("data/chunked-mini", O_RDONLY);
  read(fd2, reference, len);

  assert(memcmp(chunked, reference, len) == 0);
}

int main() {
    EM_ASM(
        window._cvmfs_testname = 'read chunked';
    );

    check_till_length(FILE_SIZE);

    check_till_length(FILE_SIZE - CHUNK5);

    check_till_length(CHUNK1 + CHUNK2 + CHUNK3);

    check_till_length(CHUNK1 + CHUNK2);

    check_till_length(CHUNK1);

    return 0;
}
