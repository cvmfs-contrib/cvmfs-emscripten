window._cvmfs_testname = 'whitelist parsing';

tests.runTest(function parseWhitelist() {
  const data = tests.readFile('data/cvmfswhitelist');
  const repo_name = 'emscripten.cvmfs.io';

  // different metadata hash
  chai.assert.isUndefined(cvmfs.retriever.parseWhitelist(data.replace(/--\n.*\n/, '--\n'), repo_name));

  // different repo name
  chai.assert.isUndefined(cvmfs.retriever.parseWhitelist(data, 'something.something.something.darkside'));

  const whitelist = cvmfs.retriever.parseWhitelist(data, repo_name);
  chai.assert.strictEqual(whitelist.repository_name, repo_name);
  chai.assert.strictEqual(whitelist.expiry_date.getTime(), new Date(2018, 4, 27, 12).getTime());
  chai.assert.strictEqual(whitelist.cert_fp, 'fc97541ac39e72cac9bfd7b27b3cf54c3c2a35b9');
  chai.assert.strictEqual(whitelist.metadata_hash, 'b04ddf54b894e03d7b6fe2ab9e26f0161229dc7d');
  chai.assert.strictEqual(whitelist.signature_hex, 'b0d8d8f9b7d6a1dfceed6e5995c6f56b716a5e54fc4121da1c74da0ff4bc97805001ef2ec502a10e52921f72d0e81efa3a83541a0d59c99c29cf4e627ea9f233debde50ffc3ecacc354a345745cf3d487ac6ee3b550facaab50380eea992bbaeb7681a39bc48c5b0b9ac6f9a613b9d15c3198168621c9a75d832d04ccaab203617858e5985169b0a18130bcdc0c113b5f92611b289c4eb53f74e7813584c9b02620fa2113a5e7328d3fb65fb43c66d3edaffc02005c47326719005035c98f53555156b444f0cf3a3e56a7efed1c1ebce740bf13de7e8040f72e187b7ed642ab0402b35c7f07222b673f72cd5cdf81c70b7a8ce139c2eddd445c88f830fb6297f');
});

tests.runTest(function parseWhitelistShake128() {
  const data = tests.readFile('data/cvmfswhitelist-shake128');
  const repo_name = 'emscripten.cvmfs.io';

  const whitelist = cvmfs.retriever.parseWhitelist(data, repo_name);
  chai.assert.strictEqual(whitelist.cert_fp.hex, '2d63ea98499ed1041fca8359c7989dc28c171edf');
  chai.assert.strictEqual(whitelist.metadata_hash.hex, 'c6e2ed2dd9e768601f5621ebcc5b6b058a624282');
  chai.assert.strictEqual(whitelist.signature_hex, '49a9d8bf0520f84b8040347b8170b005f5235cb509e80e4f5631866b56e510562809369a5c664edfb402e9a772b471266062506e7890c778bed41abf2a71f9577d4182b3cc2257480787c985f489a26f590b41926d59145fac4b68b8509670385a2522c59016e128bd12165b7ea2a7ac4812a9653637773672fc149962fec4d1abf4df9b68dabca54ed46c55bdfa906155a16ea5872446c14ec82dbdd706d6c2efc7d6e1f4abae75be87b84cecfd898fbdcc81843043252edc8a0cad0027ad7e525db1adaf7830ba316d6b96695d3a2e194e6b857aa80cd694501831305699339ffa6847571662606b76b91b6cb9874298a90bfc338c98a4327d453b4ea76ddf');
});
