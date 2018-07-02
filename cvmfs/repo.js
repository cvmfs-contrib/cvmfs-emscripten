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

// Bit flags
cvmfs.CHUNK_HASH_ALG = Object.freeze({
  RIPEMD_160: 1 << 8,
  SHAKE_128: 1 << 9
});

// Bit flags
cvmfs.COMPRESSION_ALG = Object.freeze({
  NO_COMPRESSION: 1 << 11
});

cvmfs.repo.prototype = {
  getCatalog: function(hash) {
    return cvmfs.retriever.fetchCatalog(this._data_url, hash);
  },
  getCatalogStats: function(catalog) {
    const result = catalog.exec('SELECT * FROM STATISTICS')[0].values;

    const catalog_stats = {};
    for (const row of result) {
      const counter = row[0];
      const value = row[1];
      catalog_stats[counter] = value;
    }

    return catalog_stats;
  },
  getCatalogProperties: function(catalog) {
    const result = catalog.exec('SELECT * FROM PROPERTIES')[0].values;

    const catalog_properties = {};
    for (const row of result) {
      const counter = row[0];

      var value = row[1];
      if (/^\d+$/.test(value)) { // if value is base-10 integer
        value = parseInt(value);
      } else if (/^\d+\.?\d*$/.test(value)) { // if value is float
        value = parseFloat(value);
      }

      catalog_properties[counter] = value;
    }

    return catalog_properties;
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
  getFlagsForPath: function(catalog, path) {
    const pair = this._md5PairFromPath(path);
    const query = 'SELECT flags FROM catalog WHERE md5path_1 = ' + pair.high + ' AND md5path_2 = ' + pair.low;

    const result = catalog.exec(query);
    if (result[0] === undefined) return null;

    return result[0].values[0][0];
  },
  getNamesForParentPath: function(catalog, path) {
    const pair = this._md5PairFromPath(path);
    const query = 'SELECT name FROM catalog WHERE parent_1 = ' + pair.high + ' AND parent_2 = ' + pair.low;

    const result = catalog.exec(query);
    if (result[0] === undefined) return null;

    return result[0].values.map(e => e[0]);
  },
  getContentForRegularFile: function(catalog, path, flags) {
    const pair = this._md5PairFromPath(path);
    const query = 'SELECT hex(hash) FROM catalog WHERE md5path_1 = ' + pair.high + ' AND md5path_2 = ' + pair.low;

    const result = catalog.exec(query);
    if (result[0] === undefined) return null;

    let hash_str = result[0].values[0][0].toLowerCase();
    if (flags & cvmfs.CHUNK_HASH_ALG.SHAKE_128) hash_str += "-shake128";
    else if (flags & cvmfs.CHUNK_HASH_ALG.RIPEMD_160) hash_str += "-rmd160";
    const hash = new cvmfs.util.hash(hash_str);

    const decompress = !(flags & cvmfs.COMPRESSION_ALG.NO_COMPRESSION);

    return cvmfs.retriever.fetchChunk(this._data_url, hash, decompress);
  },
  getChunksWithinRangeForPath: function(catalog, path, flags, low, high) {
    const pair = this._md5PairFromPath(path);
    const query = 'SELECT hex(hash), size FROM chunks WHERE'
                  + ' md5path_1 = ' + pair.high
                  + ' AND md5path_2 = ' + pair.low
                  + ' AND offset <= ' + high
                  + ' AND (offset + size) >= ' + low
                  + ' ORDER BY ' + 'offset';

    const result = catalog.exec(query);
    if (result[0] === undefined) return null;

    const should_decompress = !(flags & cvmfs.COMPRESSION_ALG.NO_COMPRESSION);
    const chunks = result[0].values.map(e => {
      let hash_str = e[0].toLowerCase();
      if (flags & cvmfs.CHUNK_HASH_ALG.SHAKE_128) {
        hash_str += "-shake128";
      } else if (flags & cvmfs.CHUNK_HASH_ALG.RIPEMD_160) {
        hash_str += "-rmd160";
      }
      const hash = new cvmfs.util.hash(hash_str);

      const chunk = cvmfs.retriever.fetchChunk(this._data_url, hash, should_decompress, true);
      const size = e[1];

      return {chunk, size};
    });

    return chunks;
  },
  getSymlinkForPath: function(catalog, path) {
    const pair = this._md5PairFromPath(path);
    const query = 'SELECT symlink FROM catalog WHERE md5path_1 = ' + pair.high + ' AND md5path_2 = ' + pair.low;

    const result = catalog.exec(query);
    if (result[0] === undefined) return null;

    return result[0].values[0][0];
  },
  getManifest: function() { return this._manifest; },
  getWhitelist: function() { return this._whitelist; },
  getCertificate: function() { return this._cert; }
};
