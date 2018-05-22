window._cvmfs_testname = 'manifest parsing';

tests.runTest(function test_parseManifest() {
  const data = tests.readFile('data/cvmfspublished');
  const repo_name = 'emscripten.cvmfs.io';

  // different metadata hash
  chai.assert.isUndefined(cvmfs.fetcher.parseManifest(data.replace(/--\n.*\n/, '--\n'), repo_name));

  // different repo name
  chai.assert.isUndefined(cvmfs.fetcher.parseManifest(data, 'something.something.something.darkside'));

  const manifest = cvmfs.fetcher.parseManifest(data, repo_name);
  chai.assert.strictEqual(manifest.has_alt_catalog_path, false);
  chai.assert.strictEqual(manifest.catalog_size, 18432);
  chai.assert.strictEqual(manifest.catalog_hash, '34ec515941acb52652ac2c448407caebca2bfe49');
  chai.assert.strictEqual(manifest.ttl, 240);
  chai.assert.strictEqual(manifest.garbage_collectable, false);
  chai.assert.strictEqual(manifest.history_hash, 'e615b5a83d3a20120199ba05afe4ffcbef07714a');
  chai.assert.strictEqual(manifest.json_hash, 'decf358874358c4f313db997d36a3b8e3d62622e');
  chai.assert.strictEqual(manifest.repository_name, repo_name);
  chai.assert.strictEqual(manifest.root_hash, 'd41d8cd98f00b204e9800998ecf8427e');
  chai.assert.strictEqual(manifest.revision, 10);
  chai.assert.strictEqual(manifest.published_timestamp, 1525779612);
  chai.assert.strictEqual(manifest.certificate_hash, 'f03e97f4586869a417dadd56ff206c8ba9566284');
  chai.assert.strictEqual(manifest.metadata_hash, '92db4f64d030df3a32bb18233b4b933511c20d9c');
  chai.assert.strictEqual(manifest.signature_hex, 'b8f34fa30053d1ea3a440ad6c8a7d0b684182fbccabca531674059fcf1f83a5e5535e428983ede29d38c8c87741c1bd700ec8ee1315bea6d9b6aca5159460c7e889a62c137d90ce4ea6d0d8413ec86dd521b57544f456411df49e9791a9c3a8955a14e8bddd1a5e52cd8dc9d7c28bb6cf76e9b1dc11b8009dde2a78b340303e9913dbc36dc4520438bf2a402cc1efca1e938082a7235136238d880d1c8fca4add6755ae53887237841f46a7aa72b0d98c43f890dd724cdcd7a1cacd7f6aaf95c9f7f26c2b224e811ec0ed1734246bb745e0410086938b6acafc43d00496de1091a8eb3e42a801cd0a07db89283d362972f702d8048d1d7ad9d994693053a80d7');
});