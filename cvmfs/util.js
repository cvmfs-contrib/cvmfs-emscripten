cvmfs.util.repoURL = function(base_url, repo_name) {
  return base_url + '/' + repo_name;
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