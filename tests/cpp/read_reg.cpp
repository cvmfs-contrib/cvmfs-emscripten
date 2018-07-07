#include <assert.h>
#include <emscripten.h>
#include <fcntl.h>
#include <string>
#include <string.h>
#include <unistd.h>
#include <vector>

using namespace std;

#define BUF_SIZE 64

void check_contents(const string& path, const string& contents) {
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
        window._cvmfs_testname = 'read regular';
    );

    const vector<test_file> test_files = {
      { .path = "regular",               .contents = "content\n" },
      { .path = "uncompressed",          .contents = "uncompressed\n" },
      { .path = "shake-128",             .contents = "shake-128\n" },
      { .path = "ripemd-160",            .contents = "ripemd-160\n" },
      { .path = "empty",                 .contents = "" },
      { .path = "subdir/regular_subdir", .contents = "" },
      { .path = "nested/regular_nested", .contents = "" },
      { .path = "nested/deep-nested/regular_deep_nested", .contents = "regular_nested" },
    };

    const string root_testdir = "/cvmfs/emscripten.cvmfs.io/test/";
    const string snapshot_testdir = "/cvmfs/emscripten.cvmfs.io/.cvmfs/snapshots/generic-2018-07-06T06:17:36Z/test/";

    for (auto& test_file : test_files) {
      check_contents(root_testdir + test_file.path, test_file.contents);
      check_contents(snapshot_testdir + test_file.path, test_file.contents);
    }

    return 0;
}
