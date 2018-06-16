cvmfs.repo = function(base_url, repo_name) {
  this._repo_url = cvmfs.util.repoURL(base_url, repo_name);
  this._data_url = cvmfs.util.dataURL(base_url, repo_name);

  this._manifest = cvmfs.retriever.fetchManifest(this._repo_url, repo_name);
  this._whitelist = cvmfs.retriever.fetchWhitelist(this._repo_url, repo_name);
  this._cert = cvmfs.retriever.fetchCertificate(this._data_url, this._manifest.cert_hash);

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
  const fingerprint = cvmfs.util.digestHex(this._cert.hex, this._whitelist.cert_fp.alg);
  if (fingerprint !== this._whitelist.cert_fp.hex) return undefined;

  /* verify manifest signature */
  const signature = new KJUR.crypto.Signature({alg: 'SHA1withRSA'});
  signature.init(this._cert.getPublicKey());
  signature.updateString(this._manifest.metadata_hash.download_handle);
  if (!signature.verify(this._manifest.signature_hex)) return undefined;
};

// Bit flags
cvmfs.ENTRY_TYPE = Object.freeze({
  DIR: 1,
  NEST_TRANS: 2,
  REG: 4,
  SYMB_LINK: 8,
  NEST_ROOT: 32,
  CHUNKD: 64
});

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
      const result = catalog.exec('SELECT * FROM STATISTICS')[0].values;

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
      const result = catalog.exec('SELECT * FROM PROPERTIES')[0].values;

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
  _md5PairFromPath: function(path) {
    const md5hex = cvmfs.util.digestString(path, 'md5');

    var bytes = new Array(16);
    var i = md5hex.length;
    while (i >= 0) {
        bytes[15 - i/2] = md5hex.substr(i, 2);
        i -= 2;
    }

    return {
      low: '0x' + bytes.slice(0, bytes.length/2).join(''),
      high: '0x' + bytes.slice(bytes.length/2).join('')
    };
  },
  getFlagsForPath: function(path) {
    const pair = this._md5PairFromPath(path);
    const query = 'SELECT flags FROM catalog WHERE md5path_1 = ' + pair.high + ' AND md5path_2 = ' + pair.low;

    const result = this._getCatalog().exec(query);
    if (result[0] === undefined) return null;

    return result[0].values[0][0];
  },
  getNamesForParentPath: function(path) {
    const pair = this._md5PairFromPath(path);
    const query = 'SELECT name FROM catalog WHERE parent_1 = ' + pair.high + ' AND parent_2 = ' + pair.low;

    const result = this._getCatalog().exec(query);
    if (result[0] === undefined) return null;

    return result[0].values.map(e => e[0]);
  },
  getContentHashForPath: function(path) {
    const pair = this._md5PairFromPath(path);
    const query = 'SELECT hex(hash) FROM catalog WHERE md5path_1 = ' + pair.high + ' AND md5path_2 = ' + pair.low;

    const result = this._getCatalog().exec(query);
    if (result[0] === undefined) return null;

    return result[0].values[0][0];
  },
  getManifest: function() { return this._manifest; },
  getWhitelist: function() { return this._whitelist; },
  getCertificate: function() { return this._cert; }
};
