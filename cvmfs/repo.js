'use strict'

import { crypto } from 'jsrsasign';
import { repoURL, dataURL, digestHex, stringToHex} from './util';
import { Retriever } from './retriever';
import { KeyManager } from './masterkeys';
import { X509 } from 'jsrsasign';

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

    this.catalogURL = '';
    this.certificateURL = '';
    this.manifestURL = this._repoURL + '/.cvmfspublished';
    this.metainfoURL = '';
    this.whitelistURL = this._repoURL + '/.cvmfswhitelist';
    this.expiryDate = true;
  }

  async connect() {
    // Explained in detail: https://cvmfs.readthedocs.io/en/stable/cpt-details.html
    this._manifest = await this.retriever.fetchManifest(this.manifestURL, this._repoName);
    // console.log("this._manifest", this._manifest);
    if(! this._manifest.metainfoHash) {
      throw new Error("metainfoHash is undefined; Without metainfo we cannot proceed");
    }
    
    this.catalogURL = this.retriever.generateChunkURL(this._dataURL, this._manifest.catalogHash.downloadHandle, 'C')
    this.certificateURL = this.retriever.generateChunkURL(this._dataURL, this._manifest.certHash.downloadHandle, 'X')
    this.metainfoURL = this.retriever.generateChunkURL(this._dataURL, this._manifest.metainfoHash.downloadHandle, 'M')

    this._whitelist = await this.retriever.fetchWhitelist(this.whitelistURL, this._repoName);  
    this.certificateString = await this.retriever.fetchCertificate(this.certificateURL, this._manifest.certHash);

    this._cert = new X509();
    this._cert.readCertPEM(this.certificateString);


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

    if (!isWhitelistVerified) {
      throw new Error('Unable to verify whitelist: No public key matched');
    }
    
    const now = new Date();
    if (now >= this._whitelist.expiryDate) {
      // throw new Error('The whitelist is expired.');
      this.expiryDate = false;
    }

    /* verify certificate fingerprint */
    let isCertificateFingerprintVerified = false;

    for (const fingerprint of this._whitelist.certificateFingerprint) {

      let fingerprintDownloadHandle = fingerprint.downloadHandle;
      if(fingerprint.downloadHandle.includes("#")) {
        fingerprintDownloadHandle = fingerprint.downloadHandle.substring(0, fingerprint.downloadHandle.indexOf('#')).trim();        
      }

      const computedFingerprint = digestHex(this._cert.hex, fingerprint.algorithm);   
        
      if (fingerprintDownloadHandle === computedFingerprint) {
        isCertificateFingerprintVerified = true
        break;
      }    
    }

    if (!isCertificateFingerprintVerified) {
      throw new Error("Unable to verify certificate. Fingerprints don't match.");
    }
    
    /* verify manifest signature */
    const signature = new crypto.Signature({alg: 'SHA1withRSA'});
    signature.init(this._cert.getPublicKey());
    signature.updateString(this._manifest.metadataHash.downloadHandle);

    if(!signature.verify(this._manifest.signatureHex)) {
      throw new Error('Unable to verify manifest');
    }

    if(! this._manifest.metainfoHash) {
      throw new Error("metainfoHash is undefined; Without metainfo we cannot proceed");
    }

    this._metainfo =  await this.retriever.fetchMetainfo(this.metainfoURL, this._manifest.metainfoHash, this._manifest.certHash);
    this._revision =  this._manifest.revision;
    this._publishedTimestamp =  this._manifest.publishedTimestamp;
    this._metainfoForStratumOne =  await this.retriever.downloadMetainfoStratumOne(this._baseURL);
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
