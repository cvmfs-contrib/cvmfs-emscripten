cvmfs.fetcher.download = function(url) {
  const request = new XMLHttpRequest();
  request.open('GET', url, false);
  request.send(null);

  if (request.status === 200) return request.responseText;
};

cvmfs.fetcher.downloadManifest = function(repo_url) {
  const url = repo_url + '/.cvmfspublished';
  return cvmfs.fetcher.download(url);
};

cvmfs.fetcher.parseManifest = function(manifest_raw, repo_name) {
  const manifest = {};
  const metadata_digest = new KJUR.crypto.MessageDigest({alg: 'sha1', prov: 'cryptojs'});
  var metadata_hash;

  const lines = manifest_raw.split('\n');
  for (const i in lines) {
    const line = lines[i];
    const head = line.charAt(0);
    const tail = line.substring(1);

    switch (head) {
      case 'B':
        manifest.catalog_size = parseInt(tail);
        break;
      case 'C':
        manifest.catalog_hash = tail;
        break;
      case 'D':
        manifest.ttl = parseInt(tail);
        break;
      case 'G':
        manifest.garbage_collectable = (tail === 'yes');
        break;
      case 'H':
        manifest.history_hash = tail;
        break;
      case 'M':
        manifest.metadata_hash = tail;
        break;
      case 'N':
        if (tail !== repo_name) return undefined;
        manifest.repository_name = tail;
        break;
      case 'R':
        if (md5('') !== tail) return undefined;
        manifest.root_hash = tail;
        break;
      case 'S':
        manifest.revision = parseInt(tail);
        break;
      case 'T':
        manifest.published_timestamp = parseInt(tail);
        break;
      case 'X':
        manifest.certificate_hash = tail;
        break;
    }

    if (head === '-') {
      const j = (parseInt(i) + 1).toString();
      metadata_hash = lines[j];
      break;
    }

    metadata_digest.updateString(line + '\n')
  }

  if (manifest.catalog_hash === undefined ||
      manifest.root_hash === undefined ||
      manifest.ttl === undefined ||
      manifest.revision === undefined) return undefined;

  if (metadata_hash !== metadata_digest.digest()) return undefined;

  return manifest;
};

cvmfs.fetcher.fetchManifest = function(base_url, repo_name) {
  const repo_url = base_url + '/' + repo_name;
  const manifest_raw = cvmfs.fetcher.downloadManifest(repo_url);
  return cvmfs.fetcher.parseManifest(manifest_raw, repo_name);
};