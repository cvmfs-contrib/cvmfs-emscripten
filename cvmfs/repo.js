cvmfs.repo = function(base_url, repo_name) {
  this._repo_url = cvmfs.util.repoURL(base_url, repo_name);
  this._data_url = cvmfs.util.dataURL(base_url, repo_name);

  this._manifest = cvmfs.retriever.fetchManifest(this._repo_url, repo_name);
  this._whitelist = cvmfs.retriever.fetchWhitelist(this._repo_url, repo_name);
  this._certificate = cvmfs.retriever.fetchCertificate(this._data_url, this._manifest.certificate_hash);

  /* verify whitelist signature */
  var whitelist_verified = false;
  const master_keys = cvmfs.getMasterKeys();
  for (const key of master_keys) {
    whitelist_verified = key.verifyRawWithMessageHex(
      cvmfs.util.stringToHex(this._whitelist.metadata_hash.download_handle),
      this._whitelist.signature_hex
    );
    if (whitelist_verified) break;
  }
  if (!whitelist_verified) return undefined;

  /* verify certificate fingerprint */
  const now = new Date();
  if (now >= this._whitelist.expiry_date) return undefined;
  const fingerprint = cvmfs.util.digestHex(this._certificate.hex, this._whitelist.certificate_fingerprint.alg);
  if (fingerprint !== this._whitelist.certificate_fingerprint.hex) return undefined;

  /* verify manifest signature */
  const signature = new KJUR.crypto.Signature({alg: 'SHA1withRSA'});
  signature.init(this._certificate.getPublicKey());
  signature.updateString(this._manifest.metadata_hash.download_handle);
  if (!signature.verify(this._manifest.signature_hex)) return undefined;
};

cvmfs.repo.prototype = {
  _catalog: null,
  _catalog_stats: null,
  _catalog_properties: null,
  _getCatalog: function() {
    if (this._catalog === null) {
      this._catalog = cvmfs.retriever.fetchCatalog(this._data_url, this._manifest.catalog_hash);
    }
    return this._catalog;
  },
  getCatalogStats: function() {
    if (this._catalog_stats === null) {
      const catalog = this._getCatalog();
      const result = catalog.exec("SELECT * FROM STATISTICS")[0].values;

      this._catalog_stats = {};
      for (const row of result) {
        const counter = row[0];
        const value = row[1];
        this._catalog_stats[counter] = value;
      }
    }
    return this._catalog_stats;
  },
  getCatalogProperties: function() {
    if (this._catalog_properties === null) {
      const catalog = this._getCatalog();
      const result = catalog.exec("SELECT * FROM PROPERTIES")[0].values;

      this._catalog_properties = {};
      for (const row of result) {
        const counter = row[0];

        var value = row[1];
        if (/^\d+$/.test(value)) { // if value is base-10 integer
          value = parseInt(value);
        } else if (/^\d+\.?\d*$/.test(value)) { // if value is float
          value = parseFloat(value);
        }

        this._catalog_properties[counter] = value;
      }
    }
    return this._catalog_properties;
  },
  getManifest: function() { return this._manifest; },
  getWhitelist: function() { return this._whitelist; },
  getCertificate: function() { return this._certificate; }
};
