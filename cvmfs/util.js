'use strict';

import { jsSHA } from 'jssha';
import { crypto } from 'jsrsasign';

export function repoURL(baseURL, repoName) {
  return baseURL + '/' + repoName;
}

cvmfs.util.dataURL = function(base_url, repo_name) {
  return base_url + '/' + repo_name + '/data';
}

cvmfs.util.stringToHex = function(str) {
  const len = str.length;
  const hex = new Array(len);
  for (var i = 0; i < len; i++) {
    const byte = str.charCodeAt(i) & 0xff;
    hex[i] = ('0' + byte.toString(16)).slice(-2);
  }
  return hex.join('');
}

cvmfs.util.hash = function(download_handle) {
  this.download_handle = download_handle;

  const hash_len = download_handle.search('-');
  if (hash_len === -1) {
    this.hex = download_handle;
    this.alg = 'sha1';
  } else {
    this.hex = download_handle.substring(0, hash_len);
    this.alg = download_handle.substring(hash_len + 1);

    if (this.alg === 'rmd160') this.alg = 'ripemd160';
  }
}

cvmfs.util.hash.prototype = {
  hex: null,
  alg: null,
  download_handle: null
};

cvmfs.util.digestString = function(str, alg) {
  if (alg === undefined) return undefined;
  else if (alg === 'shake128') {
    const shake128 = new jsSHA("SHAKE128", "TEXT");
    shake128.update(str);
    return shake128.getHash("HEX", {shakeLen: 160});
  } else {
    return rs.KJUR.crypto.Util.hashString(str, alg);
  }
}

cvmfs.util.digestHex = function(hex, alg) {
  if (alg === undefined) return undefined;
  else if (alg === 'shake128') {
    const shake128 = new jsSHA("SHAKE128", "HEX");
    shake128.update(hex);
    return shake128.getHash("HEX", {shakeLen: 160});
  } else {
    return rs.KJUR.crypto.Util.hashHex(hex, alg);
  }
}
