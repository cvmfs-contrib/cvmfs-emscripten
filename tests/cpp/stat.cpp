#include <assert.h>
#include <emscripten.h>
#include <string>
#include <sys/stat.h>
#include <unistd.h>
#include <vector>

using namespace std;

#define UID 56952
#define GID UID

typedef enum {
  REG,
  DIR,
  LINK
} entry_type;

struct test_entry {
  string path;
  entry_type typ;
  off_t size;
};

void check_lstat(const string& path, const struct test_entry& entry) {
  struct stat buf;
  mode_t mode;
  off_t size;

  lstat(path.c_str(), &buf);

  assert(buf.st_uid == UID);
  assert(buf.st_gid == GID);

  switch (entry.typ) {
    case REG:
      mode = 33204;
      size = entry.size;
      break;
    case DIR:
      mode = 16893;
      size = 4096;
      break;
    case LINK:
      mode = 41471;
      size = entry.size;
      break;
  }

  assert(buf.st_mode == mode);
  assert(buf.st_size == size);

  assert(buf.st_mtim.tv_sec > 0);
}

int main() {
    EM_ASM(
      window._cvmfs_testname = 'stat';
    );

    const vector<test_entry> test_entries = {
      { .path = "regular",                                .typ = REG, .size = 8 },
      { .path = "uncompressed",                           .typ = REG, .size = 13 },
      { .path = "shake-128",                              .typ = REG, .size = 10 },
      { .path = "ripemd-160",                             .typ = REG, .size = 11 },
      { .path = "empty",                                  .typ = REG, .size = 0 },
      { .path = "chunked",                                .typ = REG, .size = 16777216 },
      { .path = "chunked-mini",                           .typ = REG, .size = 256 },
      { .path = "subdir/regular_subdir",                  .typ = REG,.size = 0, },
      { .path = "nested/chunked-mini",                    .typ = REG,.size = 256, },
      { .path = "nested/regular_nested",                  .typ = REG,.size = 0, },
      { .path = "nested/deep-nested/regular_deep_nested", .typ = REG,.size = 15, },

      { .path = "subdir",             .typ = DIR, },
      { .path = "nested",             .typ = DIR, },
      { .path = "nested/deep-nested", .typ = DIR, },

      { .path = "symlink",       .typ = LINK, .size = 7 },
      { .path = "varlink",       .typ = LINK, .size = 8 },
      { .path = "varlink-multi", .typ = LINK, .size = 2 },
    };

    const string root_testdir = "/cvmfs/emscripten.cvmfs.io/test/";
    const string snapshot_testdir = "/cvmfs/emscripten.cvmfs.io/.cvmfs/snapshots/generic-2018-07-06T06:17:36Z/test/";

    for (auto& entry : test_entries) {
      check_lstat(root_testdir + entry.path, entry);
      check_lstat(snapshot_testdir + entry.path, entry);
    }

    return 0;
}
