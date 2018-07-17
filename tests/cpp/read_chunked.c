#include <assert.h>
#include <emscripten.h>
#include <fcntl.h>
#include <string.h>
#include <stdbool.h>
#include <unistd.h>

#define CHUNK1 75
#define CHUNK2 36
#define CHUNK3 53
#define CHUNK4 32
#define CHUNK5 60

#define FILE_SIZE (CHUNK1 + CHUNK2 + CHUNK3 + CHUNK4 + CHUNK5)

void check_range(const char* file, const size_t off, const size_t len) {
  char reference[FILE_SIZE] = {0};
  char chunked[FILE_SIZE] = {0};
  int fd1, fd2, bytes_read;

  fd1 = open(file, O_RDONLY);
  assert(fd1 != -1);
  assert(lseek(fd1, off, SEEK_SET) == off);
  assert(read(fd1, chunked, len) == len);

  fd2 = open("data/chunked-mini", O_RDONLY);
  assert(lseek(fd2, off, SEEK_SET) == off);
  read(fd2, reference, len);

  assert(memcmp(chunked, reference, len) == 0);
}

void check_chunked_read(const char *file) {
  check_range(file, 0, FILE_SIZE);

  EM_ASM(
      window._cvmfs_clearHashesLog();

      localStorage.clear();
  );

  check_range(file, 0, CHUNK1);

  EM_ASM(
      window._cvmfs_checkHashesLog(
        [window.chunk1_hash]
      );
      window._cvmfs_clearHashesLog();

      localStorage.clear();
  );

  check_range(file, 0, CHUNK1 + CHUNK2 + 1);

  EM_ASM(
      window._cvmfs_checkHashesLog(
        [window.chunk1_hash, window.chunk2_hash, window.chunk3_hash]
      );
  );
}

int main() {
    EM_ASM(
        window._cvmfs_testname = 'read chunked';

        window.chunk1_hash = '351a9a9eab9dd70db33313ac3f2252368d6a0703';
        window.chunk2_hash = '45eeb4548a9d37431fff7efff7e1d210e73721b5';
        window.chunk3_hash = 'aee1af0b73f2da4ce6dd0ae93ab45fe9966d0101';
    );

    check_chunked_read("/cvmfs/emscripten.cvmfs.io/test/chunked-mini");
    check_chunked_read("/cvmfs/emscripten.cvmfs.io/test/nested/chunked-mini");

    return 0;
}
