window._cvmfs_testname = 'reading catalog statistics';

tests.runTest(function test_getCatalogStats() {
  const base_url = 'http://hepvm.cern.ch/cvmfs';
  const repo_name = 'emscripten.cvmfs.io';
  const repo = new cvmfs.repo(base_url, repo_name);
  const catalog = repo.getCatalog(repo.getManifest().catalog_hash);

  const stats = repo.getCatalogStats(catalog);

  [
    'self_chunked',
    'self_chunked_size',
    'self_chunks',
    'self_dir',
    'self_external',
    'self_external_file_size',
    'self_file_size',
    'self_nested',
    'self_regular',
    'self_special',
    'self_symlink',
    'self_xattr',
    'subtree_chunked',
    'subtree_chunked_size',
    'subtree_chunks',
    'subtree_dir',
    'subtree_external',
    'subtree_external_file_size',
    'subtree_file_size',
    'subtree_nested',
    'subtree_regular',
    'subtree_special',
    'subtree_symlink',
    'subtree_xattr'
  ].forEach(counter =>
    chai.assert.isAtLeast(stats[counter], 0)
  );
});
