'use strict';

import { jsSHA } from 'jssha';
import { crypto } from 'jsrsasign';
import { URL } from 'url';

export function isURLvalid(url) {
  try {
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
}

export function repoURL(baseURL, repoName) {
  return baseURL + '/' + repoName;
}

export function dataURL(baseURL, repoName) {
  return baseURL + '/' + repoName + '/data';
}

export function stringToHex(input) {
  const buffer = Buffer.from(input, 'binary');
  return buffer.toString('hex');
}

export class Hash {
  constructor(downloadHandle){
    this.downloadHandle = downloadHandle;
    const hashLength = downloadHandle.search('-');

    if (hashLength === -1) {
      this.hex = downloadHandle;
      this.algorithm = 'sha1';
    } else {
      this.hex = downloadHandle.substring(0, hashLength);
      this.algorithm = downloadHandle.substring(hashLength + 1);
  
      if (this.algorithm === 'rmd160') {
        this.algorithm = 'ripemd160';
      } 
    }
  }
}

export function digestString(str, algorithm) {
  if (algorithm === undefined) {
    console.log('Error: No algorithm was specified for digestString');
    return undefined;
  }
  else if (algorithm === 'shake128') {
    const shake128 = new jsSHA("SHAKE128", "TEXT");
    shake128.update(str);
    return shake128.getHash("HEX", {shakeLen: 160});
  } else {
    return crypto.Util.hashString(str, algorithm);
  }
}

export function digestHex(hex, algorithm) {
  if (algorithm === undefined) {
    console.log('Error: No algorithm was specified for digestHex');
    return undefined;
  } 
  else if (algorithm === 'shake128') {
    const shake128 = new jsSHA("SHAKE128", "HEX");
    shake128.update(hex);
    return shake128.getHash("HEX", {shakeLen: 160});
  } else {
    return crypto.Util.hashHex(hex, algorithm);
  }
}
