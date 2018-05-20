const tests = {
  readFile: function(path) {
    const size = FS.stat(path).size;
    const data = new Uint8Array(size);
  
    const stream = FS.open(path);
    FS.read(stream, data, 0, size);
    FS.close(stream);
  
    const chars = [];
    for (const byte of data)
      chars.push(String.fromCharCode(byte));
    return chars.join('');
  },
  runTest: function(test_func) {
    try {
      test_func();
      window._cvmfs_test_failed = false;
    } catch(e) {
      window._cvmfs_printErr(e.stack);
      window._cvmfs_test_failed = true;
    }
  },
};