'use strict';

import { get } from 'http';
import { Readable } from 'stream';
import { inflateRaw } from 'zlib';
import { spawn } from 'child_process'
import { inflate } from 'pako';
import { X509 } from 'jsrsasign';
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
    this.jsonHash = undefined;
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
    return new Promise((resolve) => {
      const request = get(url);

      request.on('response', (res) => {
          const { statusCode } = res;
          if (statusCode !== 200) {
              console.error('Error: Request Failed.\n' + `Status Code: ${statusCode}`);
              res.resume();
              return;
          }
          res.setEncoding('utf8');
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
    let responseText = this.cache.get(url);

    if (responseText === null) {
      const data = await this.httpGet(url);
      const useSpan = function(callback) {
        // console.log("Display url inside useSpan: ", url)
        let spawnProcess = spawn('/bin/sh', [ '-c', `curl ${url} | base64 -w0` ])
        let result = '';

        spawnProcess.stdout.on('data', (data) => {
          result += data.toString()
        });

        spawnProcess.on('close', function() {
          return callback(result);
        });
      }

      const saveCache = (result) => {
        // console.log("Inside url", url);
        // console.log("Inside result", result);
        this.cache.set(url, result);
      }

      await useSpan(saveCache);
      responseText = data;
    } else {
      console.log('Using cached value for URL', url)
    }
    return responseText;
  };

  async downloadManifest(repo_url) {
    const url = repo_url + '/.cvmfspublished';
    return await this.download(url);
  };

  async downloadWhitelist(repo_url) {
    const url = repo_url + '/.cvmfswhitelist';
    return await this.download(url);
  };

  async downloadChunk(data_url, hash, suffix='') {
    const url = [data_url, '/', hash.substr(0, 2), '/', hash.substr(2), suffix].join('');
    return await this.download(url);
  };

  async downloadCertificate(data_url, hash) {
    return await this.downloadChunk(data_url, hash, 'X');
  };

  async downloadCatalog(data_url, hash) {
    return await this.downloadChunk(data_url, hash, 'C');
  };

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
          manifest.jsonHash = new Hash(tail);
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

  async fetchManifest(repoURL, repoName) {
    const manifestRaw = await this.downloadManifest(repoURL);
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

    whitelist.certificateFingerprint = [
      new Hash(lines[3].replace(/\:/g, '').toLowerCase()),
      new Hash(lines[4].replace(/\:/g, '').toLowerCase()),
      new Hash(lines[5].replace(/\:/g, '').toLowerCase())
    ];
    
    let signature = data.substring(metadata.length + 3 /*(--\n)*/);  // cut the whitelist content and the separator
    signature = signature.substring(signature.search('\n') + 1 /*(\n)*/);  // cut the hash
    whitelist.signatureHex = stringToHex(signature);

    return whitelist;
  }

  async fetchWhitelist(repoURL, repoName) {
    const data = await this.downloadWhitelist(repoURL);
    return this.parseWhitelist(data, repoName);
  }

  async cvmfsInflate(input, url) {

    return new Promise((resolve) => {
      let spawnProcess = spawn('/bin/sh', [ '-c', `curl ${url} | cvmfs_swissknife zpipe -d` ])
      let result = '';

      spawnProcess.stdout.on('data', (data) => {
        result += data.toString()
      });

      spawnProcess.on('close', function() {
        resolve(result);
      });
    });

    // return new Promise((resolve) => {
    //     inflateRaw(input, (err, buffer) => {
    //         if (!err) {
    //             console.log(buffer.toString());
    //             resolve(buffer.toString());
    //         } else {
    //             console.error('Error while decompressing:', err);
    //         }
    //     });
    // });
  }

  async cvmfsHash(url) {

    return new Promise((resolve) => {
      let spawnProcess = spawn('/bin/sh', [ '-c', `curl ${url} | sha1sum` ])
      let hashFromCurl = '';

      spawnProcess.stdout.on('data', (data) => {
        hashFromCurl += data.toString()
      });

      spawnProcess.on('close', () => {
        console.log("hashFromCurl", hashFromCurl);
        hashFromCurl = hashFromCurl.replace('\n', '').replace('-', '').trim();
        console.log("hashFromCurl", hashFromCurl);
        resolve(hashFromCurl);
      });
    });
  }

    console.log('dataURL', dataURL);
    console.log('certHash', certHash);

  async fetchCertificate(dataURL, certHash) {
    const data = await this.downloadCertificate(dataURL, certHash.downloadHandle);
    const dataHex = stringToHex(data);
    // TODO: Problem 1 calculates wrong hash
    const dataHash = digestHex(dataHex, certHash.algorithm);

    console.log('dataHex', dataHex);
    console.log('dataHash', dataHash);
    console.log('certHash.hex', certHash.hex);

    const buffer = Buffer.from(data);

    // TODO: Problem 2 decompression doesn't work with zlib, workaroud using cvmfs_swissknife
    const url = [dataURL, '/', certHash.downloadHandle.substr(0, 2), '/', certHash.downloadHandle.substr(2), 'X'].join('');
    const decompressedData = await this.cvmfsInflate(data, url);
    const fetchCertWithCurl = await this.cvmfsHash(url); //curlCertHash
    console.log("fetchCertWithCurl",fetchCertWithCurl);

    //  const result = await this.cvmfsInflate(url);
     console.log('decompressedData', decompressedData);
    // console.log("certHash", certHash);
    // if (dataHash !== certHash.hex) {
    //   console.log("Error: The hash sums aren't equal")
    //   return undefined;
    // }

    if (fetchCertWithCurl !== certHash.hex) {
      console.log("Error: The hash sums aren't equal")
      return undefined;
    } else {
      console.log("The hash sums are equal");
    }

    // const decompressedData = inflate(data);
    // const pem = Buffer.from(decompressedData).toString('utf8');
    console.log("Certificate PEM: ", decompressedData);

    const certificate = new X509();
    certificate.readCertPEM(decompressedData);
    console.log('certificate', certificate);
    return certificate;
  }

  dataIsValid(data, hash) {
    const dataHex = stringToHex(data);
    const dataHash = digestHex(dataHex, hash.algorithm);
    return dataHash === hash.hex;
  }

  async fetchCatalog (dataURL, catalogHash) {
    const data = await this.downloadCatalog(dataURL, catalogHash.downloadHandle);

    if (!this.dataIsValid(data, catalogHash)) {
      console.log('Error: Data is invalid', catalogHash, data);
      return undefined;
    }
      
    const decompressedData = inflate(data);
    return new SQL.Database(decompressedData);
  }

  async fetchChunk(data_url, hash, decompress=true, partial=false) {
    let downloadHandle = hash.downloadHandle;
    if (partial) {
      downloadHandle += "P";
    }
    const data = await this.downloadChunk(data_url, downloadHandle);

    if (!this.dataIsValid(data, hash)){
      console.log('Error: Data is invalid', hash, data);
      return undefined;
    }
    
    if (decompress) {
      return inflate(data);
    } else {
      return Buffer.from(data);
    }
  }
}
