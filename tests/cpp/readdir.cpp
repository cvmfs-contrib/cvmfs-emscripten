#include <cassert>
#include <string>
#include <unordered_set>
#include <vector>
#include <dirent.h>
#include <emscripten.h>

using namespace std;

void check_entries(
  const string& dirpath,
  const unordered_set<string>& entries,
  const bool is_root = false) {

    DIR *dir;
    struct dirent *ent;
    int found;

    dir = opendir(dirpath.c_str());
    assert(dir != NULL);

    found = 0;
    while ((ent = readdir(dir)) != NULL) {
      string entry = ent->d_name;

      if (is_root)
        assert(entry != ".cvmfs");

      if (entries.find(entry) != entries.end()
          || entry == "."
          || entry == "..")
        ++found;
    }

    assert(found == (entries.size() + 2));
}

struct test_dir {
  string path;
  unordered_set<string> entries;
};

int main() {
    EM_ASM(
        window._cvmfs_testname = 'readdir';
    );

    const vector<test_dir> testdirs = {
      {
        .path = "",
        .entries = { "test" }
      },
      {
        .path = "test",
        .entries = { "symlink", "varlink", "shake-128", "uncompressed",
                     "chunked", "regular", "empty", "subdir", "nested" }
      },
      {
        .path = "test/subdir",
        .entries = { "regular_subdir" }
      },
      {
        .path = "test/nested",
        .entries = { "regular_nested", "chunked-mini", "deep-nested" }
      },
      {
        .path = "test/nested/deep-nested",
        .entries = { "regular_deep_nested" }
      },
      {
        .path = ".cvmfs",
        .entries = { "snapshots" }
      },
    };

    const string rootdir = "/cvmfs/emscripten.cvmfs.io/";
    const string snapshot = "/cvmfs/emscripten.cvmfs.io/.cvmfs/snapshots/generic-2018-07-06T06:17:36Z/";

    for (auto& testdir : testdirs) {
      const bool is_root = testdir.path == "";

      check_entries(rootdir + testdir.path, testdir.entries, is_root);
      check_entries(snapshot + testdir.path, testdir.entries, is_root);
    }

    return 0;
}
