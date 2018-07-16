#include <cassert>
#include <string>
#include <string.h>
#include <unistd.h>
#include <emscripten.h>

#define BUF_SIZE 256

using namespace std;

void check_symlink(const string& path, const string& symlink_val) {
  char buf[BUF_SIZE] = { 0 };
  int bytes_read;

  bytes_read = readlink(path.c_str(), buf, BUF_SIZE);

  assert(bytes_read == symlink_val.size());
  assert(strcmp(buf, symlink_val.c_str()) == 0);
}

void check_symlinks(const string root) {
    const string symlink_path = root + "test/symlink";
    const string symlink_val = root + "test/regular";
    check_symlink(symlink_path, symlink_val);

    // $(PREFIX)/regular
    const string varlink_path = root + "test/varlink";
    check_symlink(varlink_path, "/regular");

    // $(PREFIX)/$(INFIX)/$(POSTFIX)
    const string multivar_path = root + "test/varlink-multi";
    check_symlink(multivar_path, "/");

    EM_ASM(
        CVMFS.setSymlinkVar('PREFIX', '/home');
    );
    check_symlink(varlink_path, "/home/regular");
    check_symlink(multivar_path, "/home");

    EM_ASM(
        CVMFS.setSymlinkVar('INFIX', 'emscripten');
    );
    check_symlink(multivar_path, "/home/emscripten");

    EM_ASM(
        CVMFS.setSymlinkVar('POSTFIX', 'cvmfs');
    );
    check_symlink(multivar_path, "/home/emscripten/cvmfs");

    // cleanup
    EM_ASM(
        CVMFS.setSymlinkVar('PREFIX', "");
        CVMFS.setSymlinkVar('INFIX', "");
        CVMFS.setSymlinkVar('POSTFIX', "");
    );
}

int main() {
    EM_ASM(
        window._cvmfs_testname = 'readlink';
    );

    check_symlinks("/cvmfs/emscripten.cvmfs.io/");
    check_symlinks("/cvmfs/emscripten.cvmfs.io/.cvmfs/snapshots/generic-2018-07-06T06:17:36Z/");

    return 0;
}
