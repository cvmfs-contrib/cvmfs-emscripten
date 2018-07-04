#include <cassert>
#include <string>
#include <unordered_set>
#include <dirent.h>
#include <emscripten.h>

using namespace std;

void check_entries(const string& dirpath, const unordered_set<string>& entries) {
    DIR *dir;
    struct dirent *ent;
    int found;

    dir = opendir(dirpath.c_str());
    assert(dir != NULL);

    found = 0;
    while ((ent = readdir(dir)) != NULL) {
      string entry = ent->d_name;

      if (entries.find(entry) != entries.end()
          || entry == "."
          || entry == "..")
        ++found;
    }

    assert(found == (entries.size() + 2));
}

int main() {
    EM_ASM(
        window._cvmfs_testname = 'readdir';
    );

    const string testdir = "/cvmfs/emscripten.cvmfs.io/test";
    const unordered_set<string> testdir_entries = {
      "symlink", "varlink", "shake-128", "uncompressed",
      "chunked", "regular", "empty", "subdir", "nested"
    };
    check_entries(testdir, testdir_entries);

    const string subdir = "/cvmfs/emscripten.cvmfs.io/test/subdir";
    const unordered_set<string> subdir_entries = {
      "regular_subdir"
    };
    check_entries(subdir, subdir_entries);

    const string nested = "/cvmfs/emscripten.cvmfs.io/test/nested";
    const unordered_set<string> nested_entries = {
      "regular_nested", "chunked-mini", "deep-nested"
    };
    check_entries(nested, nested_entries);

    const string deep_nested = "/cvmfs/emscripten.cvmfs.io/test/nested/deep-nested";
    const unordered_set<string> deep_nested_entries = {
      "regular_deep_nested"
    };
    check_entries(deep_nested, deep_nested_entries);

    return 0;
}
