'use strict'

import { createHash } from 'crypto';
import { crypto } from 'jsrsasign';
import { repoURL, dataURL, digestString, digestHex, stringToHex, Hash } from './util';
import { Retriever } from './retriever';
import { KeyManager } from './masterkeys';

// Bit flags
export const ENTRY_TYPE = Object.freeze({
  DIR: 1,
  NEST_TRANS: 2,
  REG: 4,
  SYMB_LINK: 8,
  NEST_ROOT: 32,
  CHUNKD: 64,
  BIND_MOUNT: 1 << 14,
  HIDDEN: 1 << 15
});

// Bit flags
export const CHUNK_HASH_ALG = Object.freeze({
  RIPEMD_160: 1 << 8,
  SHAKE_128: 1 << 9
});

// Bit flags
export const COMPRESSION_ALG = Object.freeze({
  NO_COMPRESSION: 1 << 11
});

export class Repository {
  constructor(baseURL, repoName) {
    this.retriever = new Retriever();
    this.keyManager = new KeyManager();

    this._baseURL = baseURL;
    this._repoName = repoName;
    this._repoURL = repoURL(baseURL, repoName);
    this._dataURL = dataURL(baseURL, repoName);
  }

  async connect() {
    // Explained in detail: https://cvmfs.readthedocs.io/en/stable/cpt-details.html
    
    this._manifest = await this.retriever.fetchManifest(this._repoURL, this._repoName);
    // console.log("this._manifest: ", this._manifest);
    
    this._whitelist = await this.retriever.fetchWhitelist(this._repoURL, this._repoName);
      
    this._cert =  await this.retriever.fetchCertificate(this._dataURL, this._manifest.certHash);
    /* verify whitelist signature */
    let isWhitelistVerified = false;

    for (const key of this.keyManager.getMasterKeys()) {
      const downloadHandle = this._whitelist.metadataHash.downloadHandle;
      const downloadHandleHex = stringToHex(downloadHandle);

      isWhitelistVerified = this.keyManager.verifyRawWithMessageHex(
        key,
        downloadHandleHex, // We expect the signature to RSA decrypt to this hash value
        this._whitelist.signatureHex
      );
        
      if (isWhitelistVerified) {
        break;
      }    
    }
    
    console.log('isWhitelistVerified:', isWhitelistVerified);

    if (!isWhitelistVerified) {
      throw new Error('Error: Unable to verify whitelist');
    }
    
    const now = new Date();
    if (now >= this._whitelist.expiryDate) {
      console.log('Error: The whitelist is expired.');
      return undefined;
    }

    /* verify certificate fingerprint */
    let newAlgoritm = undefined;
    let newDownloadHandle = undefined;

    const checkCertificateFingerprint = this._whitelist.certificateFingerprint.map( e => {
      newDownloadHandle = e.downloadHandle.substring(0, e.downloadHandle.indexOf('#')).trim();
      newAlgoritm = e.algorithm;
      return newDownloadHandle;
    });
  
    const fingerprint = digestHex(this._cert.hex, newAlgoritm);    
  
    if(checkCertificateFingerprint.includes(fingerprint) === false){
      throw new Error("Unable to verify certificate");
    }
        
    /* verify manifest signature */
    const signature = new crypto.Signature({alg: 'SHA1withRSA'});
    signature.init(this._cert.getPublicKey());
    signature.updateString(this._manifest.metadataHash.downloadHandle);

    if (!signature.verify(this._manifest.signatureHex)){
      throw new Error('Unable to verify manifest');
    }
    
    this._metainfo =  await this.retriever.fetchMetainfo(this._dataURL, this._manifest.metainfoHash);
    this._revision =  this._manifest.revision;
    this._publishedTimestamp =  this._manifest.publishedTimestamp;
    this._metainfoForStratumOne =  await this.retriever.downloadMetainfoStratumOne(this._baseURL);
  }

  async getCatalog(catalogHash) {
    // TODO: Problem 3 need to find replacement for SQL library in third_party
    return await this.retriever.fetchCatalog(this._dataURL, catalogHash);
  }

  getCatalogStats(catalog) {
    const result = catalog.exec('SELECT * FROM STATISTICS')[0].values;

    const catalog_stats = {};
    for (const row of result) {
      const counter = row[0];
      const value = row[1];
      catalog_stats[counter] = value;
    }

    return catalog_stats;
  }

  getCatalogProperties(catalog) {
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
  }

  _md5PairFromPath(path) {
    const hashData = createHash('md5').update(path, 'utf-8');
    const hashHex = hashData.digest('hex');

    var bytes = new Array(16);
    for (let i = hashHex.length; i >= 0; i -= 2) {
      bytes[15 - i / 2] = hashHex.substr(i, 2);
    }
    
    return {
      low: '0x' + bytes.slice(0, bytes.length/2).join(''),
      high: '0x' + bytes.slice(bytes.length/2).join('')
    };
  }

  getEntriesForParentPath(catalog, path) {
    const pair = this._md5PairFromPath(path);
    const query = 'SELECT name, flags FROM catalog WHERE parent_1 = ' + pair.high + ' AND parent_2 = ' + pair.low;

    const result = catalog.exec(query);
    if (result[0] === undefined) {
      return null;
    } 

    const entries = [];
    for (const row of result[0].values) {
      if (!(row[1] & ENTRY_TYPE.HIDDEN))
        entries.push(row[0]);
    }
    return entries;
  }

  getContentForRegularFile(catalog, path, flags) {
    const pair = this._md5PairFromPath(path);
    const query = 'SELECT hex(hash) FROM catalog WHERE md5path_1 = ' + pair.high + ' AND md5path_2 = ' + pair.low;

    const result = catalog.exec(query);
    if (result[0] === undefined) {
      return null;
    }

    let hash_str = result[0].values[0][0].toLowerCase();
    if (flags & CHUNK_HASH_ALG.SHAKE_128) {
      hash_str += "-shake128";
    } else if (flags & CHUNK_HASH_ALG.RIPEMD_160) {
      hash_str += "-rmd160";
    }
    const hash = new Hash(hash_str);

    const decompress = !(flags & COMPRESSION_ALG.NO_COMPRESSION);

    return cvmfs.retriever.fetchChunk(this._dataURL, hash, decompress);
  }

  getChunksWithinRangeForPath(catalog, path, flags, low, high) {
    const pair = this._md5PairFromPath(path);
    const query = 'SELECT hex(hash), size FROM chunks WHERE'
                  + ' md5path_1 = ' + pair.high
                  + ' AND md5path_2 = ' + pair.low
                  + ' AND offset <= ' + high
                  + ' AND (offset + size) >= ' + low
                  + ' ORDER BY ' + 'offset';

    const result = catalog.exec(query);
    if (result[0] === undefined) return null;

    const should_decompress = !(flags & COMPRESSION_ALG.NO_COMPRESSION);
    const chunks = result[0].values.map(e => {
      let hash_str = e[0].toLowerCase();
      if (flags & CHUNK_HASH_ALG.SHAKE_128) {
        hash_str += "-shake128";
      } else if (flags & CHUNK_HASH_ALG.RIPEMD_160) {
        hash_str += "-rmd160";
      }
      const hash = new Hash(hash_str);

      const chunk = cvmfs.retriever.fetchChunk(this._dataURL, hash, should_decompress, true);
      const size = e[1];

      return {chunk, size};
    });

    return chunks;
  }

  getSymlinkForPath(catalog, path) {
    const pair = this._md5PairFromPath(path);
    const query = 'SELECT symlink FROM catalog WHERE md5path_1 = ' + pair.high + ' AND md5path_2 = ' + pair.low;

    const result = catalog.exec(query);
    if (result[0] === undefined) return null;

    return result[0].values[0][0];
  }

  getStatInfoForPath(catalog, path) {
    const pair = this._md5PairFromPath(path);
    const query = 'SELECT uid, gid, size, mtime, mode, flags ' +
      'FROM catalog WHERE md5path_1 = ' + pair.high + ' AND md5path_2 = ' + pair.low;

    const result = catalog.exec(query);
    if (result[0] === undefined) return null;

    const row = result[0].values[0];
    
    return {
      uid: row[0],
      gid: row[1],
      size: row[2],
      mtime: row[3],
      mode: row[4],
      flags: row[5]
    };
  }

  getNestedCatalogHash(catalog, path) {
    const query = 'SELECT sha1 FROM nested_catalogs WHERE path = "' + path + '"';

    const result = catalog.exec(query);
    if (result[0] === undefined) return null;

    return new Hash(result[0].values[0][0]);
  }

  getBindMountpointHash(catalog, path) {
    const query = 'SELECT sha1 FROM fnd_mountpoints WHERE path = "' + path + '"';

    const result = catalog.exec(query);
    if (result[0] === undefined) return null;

    return new Hash(result[0].values[0][0]);
  }

  getManifest() {
    return this._manifest; 
  }

  getWhitelist() {
    return this._whitelist;
   }

  getCertificate() {
    return this._cert;
  }

  getMetainfo() {
    return this._metainfo;
  }

  getRevision() {
    return this._revision;
  }

  getPublishedTimestamp() {
    return this._publishedTimestamp;
  }

  getMetainfoForStratumOne() {
    return this._metainfoForStratumOne;
  }
}
