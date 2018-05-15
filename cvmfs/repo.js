cvmfs.repo = function(base_url, repo_name) {
  this._manifest = cvmfs.fetcher.fetchManifest(base_url, repo_name);
  this._whitelist = cvmfs.fetcher.fetchWhitelist(base_url, repo_name);
};

cvmfs.repo.prototype = {
  getManifest: function() { return this._manifest; },
  getWhitelist: function() { return this._whitelist; }
};