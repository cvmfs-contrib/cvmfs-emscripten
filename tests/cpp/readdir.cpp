#include <assert.h>
#include <dirent.h>
#include <emscripten.h>
#include <errno.h>
#include <fcntl.h>
#include <string>
#include <set>

using namespace std;

void check_entries(string dirpath, set<string>& entries) {
    DIR *dir;
    struct dirent *ent;

    dir = opendir(dirpath.c_str());
    assert(dir != NULL);

    int found = 0;
    while ((ent = readdir(dir)) != NULL) {
      string entry = ent->d_name;
      if (entry == "." || entry == "..") continue;

      if (entries.find(entry) != entries.end())
        ++found;
    }

    assert(found == entries.size());
}

int main() {
    EM_ASM(
        window._cvmfs_testname = 'readdir';
    );

    string testdir = "/cvmfs/emscripten.cvmfs.io/test";
    set<string> testdir_entries = {
      "symlink", "varlink", "shake-128", "uncompressed",
      "chunked", "regular", "empty", "subdir", "nested"
    };
    check_entries(testdir, testdir_entries);

    string subdir = "/cvmfs/emscripten.cvmfs.io/test/subdir";
    set<string> subdir_entries = {"regular_subdir"};
    check_entries(subdir, subdir_entries);

    return 0;
}
