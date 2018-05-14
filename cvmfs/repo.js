cvmfs.repo = function(base_url, repo_name) {
  this._manifest = cvmfs.fetcher.fetchManifest(base_url, repo_name);
};

cvmfs.repo.prototype = {
  getManifest: function() { return this._manifest; }
};