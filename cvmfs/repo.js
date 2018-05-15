cvmfs.repo = function(base_url, repo_name) {
  this._repo_url = cvmfs.util.repoURL(base_url, repo_name);
  this._data_url = cvmfs.util.dataURL(base_url, repo_name);

  this._manifest = cvmfs.fetcher.fetchManifest(this._repo_url, repo_name);
  this._whitelist = cvmfs.fetcher.fetchWhitelist(this._repo_url, repo_name);
  this._certificate = cvmfs.fetcher.fetchCertificate(this._data_url, this._manifest.certificate_hash);

  const signature = new KJUR.crypto.Signature({alg: 'SHA1withRSA'});
  signature.init(this._certificate.getPublicKey());
  signature.updateString(this._manifest.metadata_hash);
  if (!signature.verify(this._manifest.signature_hex)) return undefined;
};

cvmfs.repo.prototype = {
  getManifest: function() { return this._manifest; },
  getWhitelist: function() { return this._whitelist; },
  getCertificate: function() { return this._certificate; }
};