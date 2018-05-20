window._cvmfs_testname = 'whitelist parsing';

tests.runTest(function parseWhitelist() {
  const data = tests.readFile('data/cvmfswhitelist');
  const repo_name = 'emscripten.cvmfs.io';

  // different metadata hash
  chai.assert.isUndefined(cvmfs.fetcher.parseWhitelist(data.replace(/--\n.*\n/, '--\n'), repo_name));

  // different repo name
  chai.assert.isUndefined(cvmfs.fetcher.parseWhitelist(data, 'something.something.something.darkside'));

  const whitelist = cvmfs.fetcher.parseWhitelist(data, repo_name);
  chai.assert.strictEqual(whitelist.repository_name, repo_name);
  chai.assert.strictEqual(whitelist.expiry_date.getTime(), new Date(2018, 4, 27, 12).getTime());
  chai.assert.strictEqual(whitelist.certificate_fingerprint, 'fc97541ac39e72cac9bfd7b27b3cf54c3c2a35b9');
  chai.assert.strictEqual(whitelist.metadata_hash, 'b04ddf54b894e03d7b6fe2ab9e26f0161229dc7d');
  chai.assert.strictEqual(whitelist.signature_hex, 'b0d8d8f9b7d6a1dfceed6e5995c6f56b716a5e54fc4121da1c74da0ff4bc97805001ef2ec502a10e52921f72d0e81efa3a83541a0d59c99c29cf4e627ea9f233debde50ffc3ecacc354a345745cf3d487ac6ee3b550facaab50380eea992bbaeb7681a39bc48c5b0b9ac6f9a613b9d15c3198168621c9a75d832d04ccaab203617858e5985169b0a18130bcdc0c113b5f92611b289c4eb53f74e7813584c9b02620fa2113a5e7328d3fb65fb43c66d3edaffc02005c47326719005035c98f53555156b444f0cf3a3e56a7efed1c1ebce740bf13de7e8040f72e187b7ed642ab0402b35c7f07222b673f72cd5cdf81c70b7a8ce139c2eddd445c88f830fb6297f');
});