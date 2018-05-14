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
  const lines = manifest_raw.split('\n');
  for (var line of lines) {
    if (line === '--') break;

    const first_char = line.charAt(0);
    line = line.substring(1);
    switch (first_char) {
      case 'B':
        manifest.catalog_size = parseInt(line);
        break;
      case 'C':
        manifest.catalog_hash = line;
        break;
      case 'D':
        manifest.ttl = parseInt(line);
        break;
      case 'G':
        manifest.garbage_collectable = (line === 'yes');
        break;
      case 'H':
        manifest.history_hash = line;
        break;
      case 'M':
        manifest.metadata_hash = line;
        break;
      case 'N':
        if (line !== repo_name) return undefined;
        manifest.repository_name = line;
        break;
      case 'R':
        if (md5('') !== line) return undefined;
        manifest.root_hash = line;
        break;
      case 'S':
        manifest.revision = parseInt(line);
        break;
      case 'T':
        manifest.published_timestamp = parseInt(line);
        break;
      case 'X':
        manifest.certificate_hash = line;
        break;
    }
  }

  if (manifest.catalog_hash === undefined ||
      manifest.root_hash === undefined ||
      manifest.ttl === undefined ||
      manifest.revision === undefined) return undefined;
  return manifest;
};

cvmfs.fetcher.fetchManifest = function(base_url, repo_name) {
  const repo_url = base_url + '/' + repo_name;
  const manifest_raw = cvmfs.fetcher.downloadManifest(repo_url);
  return cvmfs.fetcher.parseManifest(manifest_raw, repo_name);
};