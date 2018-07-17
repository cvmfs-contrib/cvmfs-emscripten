#include <assert.h>
#include <emscripten.h>
#include <fcntl.h>
#include <string>
#include <string.h>
#include <unistd.h>
#include <vector>

using namespace std;

#define BUF_SIZE 64

void check_regular() {
  const string path = "/cvmfs/emscripten.cvmfs.io/test/regular";
  const string contents = "content\n";

  char buf[BUF_SIZE] = {0};
  int fd, bytes_read;

  fd = open(path.c_str(), O_RDONLY);
  assert(fd != -1);

  bytes_read = read(fd, buf, contents.size());
  assert(bytes_read == contents.size());

  assert(strcmp(buf, contents.c_str()) == 0);
}

struct test_file {
  string path;
  string contents;
};

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
