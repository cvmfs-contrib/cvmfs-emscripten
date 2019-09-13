'use strict';

import { get } from 'http';
import { inflate } from 'zlib';
import { Hash, digestString, digestHex, stringToHex } from './util';
import { Cache } from './localcache';

export class Manifest {
  constructor() {
    this.catalogHash = undefined;
    this.rootHash = undefined;
    this.ttl = undefined;
    this.revision = undefined;
    this.hasAltCatalogPath = undefined;
    this.catalogSize = undefined;
    this.garbageCollectable = undefined;
    this.historyHash = undefined;
    this.metainfoHash = undefined;
    this.repositoryName = undefined;
    this.publishedTimestamp = undefined;
    this.certHash = undefined;
    this.metadataHash = undefined;
    this.signatureHex = undefined;
  }
}

export class Whitelist {
  constructor() {
    this.metadataHash = undefined;
    this.repositoryName = undefined;
    this.expiryDate = undefined;
    this.certificateFingerprint = undefined;
    this.signatureHex = undefined;
  }
}

export class Retriever {
  constructor() {
    this.cache = new Cache();
  }

  // Only works for http:// protocol, fails with https:// URLs
  httpGet(url) {
    return new Promise((resolve, reject) => {
      const request = get(url);

      request.on('response', (res) => {
          const { statusCode } = res;
          if (statusCode !== 200) {
            reject(new Error(`Request failed with status code: ${statusCode} for URL ${url}`));
          }
          res.setEncoding('binary');
          let rawData = '';
          res.on('data', (chunk) => (rawData += chunk));
          res.on('end', () => resolve(rawData));
      });

      request.on('error', (err) => {
          console.error('Error while downloading URL ' + url + ': ' + err.message);
      });
    });
  }

  async download(url) {
    const data = await this.httpGet(url);
    return data;
  };

  async downloadMetainfoStratumOne(repo_url) {
    const url = repo_url + '/info/v1/meta.json';
    return await this.download(url);
  };

  generateChunkURL(data_url, hash, suffix='') {
    return [data_url, '/', hash.substr(0, 2), '/', hash.substr(2), suffix].join('');
  }

  parseManifest(data, repoName) {
    // Decoding accroding to https://cvmfs.readthedocs.io/en/stable/cpt-details.html#internal-manifest-structure
    const manifest = new Manifest();
    const lines = data.split('\n');

    for (const i in lines) {
      const line = lines[i];
      const head = line.charAt(0);
      const tail = line.substring(1);

      switch (head) {
        case 'A':
          manifest.hasAltCatalogPath = tail === 'yes';
          break;
        case 'B':
          manifest.catalogSize = parseInt(tail);
          break;
        case 'C':
          manifest.catalogHash = new Hash(tail);
          break;
        case 'D':
          manifest.ttl = parseInt(tail);
          break;
        case 'G':
          manifest.garbageCollectable = tail === 'yes';
          break;
        case 'H':
          manifest.historyHash = new Hash(tail);
          break;
        case 'M':
          manifest.metainfoHash = new Hash(tail);
          break;
        case 'N':
          if (tail !== repoName) {
            console.log('Error: tail is not eqaul to repo name:', tail, repoName);
            return undefined;
          }
          manifest.repositoryName = tail;
          break;
        case 'R':
          manifest.rootHash = tail;
          break;
        case 'S':
          manifest.revision = parseInt(tail);
          break;
        case 'T':
          manifest.publishedTimestamp = parseInt(tail);
          break;
        case 'X':
          manifest.certHash = new Hash(tail);
          break;
      }

      if (head === '-') {
        const j = (parseInt(i) + 1).toString();
        manifest.metadataHash = new Hash(lines[j]);
        break;
      }
    }

    if (manifest.catalogHash === undefined ||
        manifest.rootHash === undefined ||
        manifest.ttl === undefined ||
        manifest.revision === undefined) {
          console.log('Error: There is important information missing in the manifest');
          return undefined;
    } 

    const metadata = data.substring(0, data.search('--'));
    const computedMetadataHash = digestString(metadata, manifest.metadataHash.algorithm);
    if (manifest.metadataHash.hex !== computedMetadataHash) {
      console.log(
        'Error: The metadataHash did not match the computed hash',
        manifest.metadataHash.hex,
        computedMetadataHash
      );
      return undefined;
    } 

    let signature = data.substr(data.search('--') + 3 /*(--\n)*/);
    signature = signature.substr(signature.search('\n') + 1 /*\n*/);
    manifest.signatureHex = stringToHex(signature);

    return manifest;
  }

  async fetchManifest(manifestURL, repoName) {
    const manifestRaw = await this.download(manifestURL);
    return this.parseManifest(manifestRaw, repoName);
  };

  parseWhitelist(data, repoName) {
    const whitelist = new Whitelist();
  
    const metadata = data.substr(0, data.search('--'));
    var metadataHashStr = data.substr(metadata.length + 3 /*(--\n)*/);
    metadataHashStr = metadataHashStr.substr(0, metadataHashStr.search('\n'));

    whitelist.metadataHash = new Hash(metadataHashStr);
    const computedMetadataHash = digestString(metadata, whitelist.metadataHash.algorithm);
    
    if (whitelist.metadataHash.hex !== computedMetadataHash) {
      console.log(
        'Error: Whitelist metadata hash did not match the computated value:',
        whitelist.metadataHash.hex,
        computedMetadataHash
      );
      return undefined;
    }
  
    const lines = metadata.split('\n');

    whitelist.repositoryName = lines[2].substr(1);

    if (whitelist.repositoryName !== repoName) {
      console.log('Error: Wrong repository name in whitelist:', lines[2].substr(1), repoName);
      return undefined;
    }

    const expiryLine = lines[1];
    whitelist.expiryDate = new Date(
      parseInt(expiryLine.substr(1, 4)),
      parseInt(expiryLine.substr(5, 2)) - 1,
      parseInt(expiryLine.substr(7, 2)),
      parseInt(expiryLine.substr(9, 2))
    );
    
    whitelist.certificateFingerprint = [];
    for (let i = 3; i < metadata.split(/\r\n|\r|\n/).length - 1; i++){
      whitelist.certificateFingerprint.push(new Hash(lines[i].replace(/\:/g, '').toLowerCase()))
    }
    
    let signature = data.substring(metadata.length + 3 /*(--\n)*/);  // cut the whitelist content and the separator
    signature = signature.substring(signature.search('\n') + 1 /*(\n)*/);  // cut the hash
    whitelist.signatureHex = stringToHex(signature);

    return whitelist;
  }

  async fetchWhitelist(whitelistURL, repoName) {
    const data = await this.download(whitelistURL);
    return this.parseWhitelist(data, repoName);
  }

  async cvmfsInflate(input) {
    input = Buffer.from(input, 'binary');

    return new Promise((resolve) => {
      inflate(input, (err, buffer) => {
        // console.log("input", input)
          if (!err) {
              // console.log(buffer.toString());
              resolve(buffer.toString('binary'));
          } else {
              console.error('Error while decompressing:', err);
          }
        });
    });
  }

  async fetchCertificate(certificateURL, certHash) {
    const data = await this.download(certificateURL);
    const dataHex = stringToHex(data);
    const dataHash = digestHex(dataHex, certHash.algorithm);
    const decompressedData = await this.cvmfsInflate(data);

    if (dataHash !== certHash.hex) {
      throw new Error("The hash sums aren't equal")
    }
    return decompressedData;
  }

  async fetchMetainfo(metainfoURL, metainfoHash, certHash) {
    const data = await this.download(metainfoURL);
    const decompressedData = await this.cvmfsInflate(data);
    const dataHex = stringToHex(data);
    const dataHash = digestHex(dataHex, certHash.algorithm);
    
    if (dataHash !== metainfoHash.hex) {
      throw new Error("The metainfoHash sums aren't equal");
    }
    return decompressedData;
  }

  dataIsValid(data, hash) {
    const dataHex = stringToHex(data);
    const dataHash = digestHex(dataHex, hash.algorithm);
    return dataHash === hash.hex;
  }

  async fetchCatalog (catalogURL, catalogHash) {
    const data = await this.download(catalogURL);

    if (!this.dataIsValid(data, catalogHash)) {
      console.log('Error: Data is invalid', catalogHash, data);
      return undefined;
    }
      
    const decompressedData = inflate(data);
    return new SQL.Database(decompressedData);
  }
}
