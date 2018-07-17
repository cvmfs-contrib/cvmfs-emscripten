cvmfs.retriever.download = function(url) {
  const request = new XMLHttpRequest();
  request.open('GET', url, false);
  request.overrideMimeType("text/plain; charset=x-user-defined");
  request.send(null);

  if (request.status === 200) return request.responseText;
};

cvmfs.retriever.downloadManifest = function(repo_url) {
  const url = repo_url + '/.cvmfspublished';
  return cvmfs.retriever.download(url);
};

cvmfs.retriever.downloadWhitelist = function(repo_url) {
  const url = repo_url + '/.cvmfswhitelist';
  return cvmfs.retriever.download(url);
};

cvmfs.retriever.downloadChunk = function(data_url, hash, suffix='') {
  const url = [data_url, '/', hash.substr(0, 2), '/', hash.substr(2), suffix].join('');

  var chunk = cvmfs.cache.get(url);
  if (chunk === null) {
    chunk = this.download(url);
    cvmfs.cache.set(url, chunk);
  }

  return chunk;
};

cvmfs.retriever.downloadCertificate = function(data_url, hash) {
  return this.downloadChunk(data_url, hash, 'X');
};

cvmfs.retriever.downloadCatalog = function(data_url, hash) {
  return this.downloadChunk(data_url, hash, 'C');
};

cvmfs.retriever.parseManifest = function(data, repo_name) {
  const manifest = {};

  const lines = data.split('\n');
  for (const i in lines) {
    const line = lines[i];
    const head = line.charAt(0);
    const tail = line.substring(1);

    switch (head) {
      case 'A':
        manifest.has_alt_catalog_path = (tail === 'yes');
        break;
      case 'B':
        manifest.catalog_size = parseInt(tail);
        break;
      case 'C':
        manifest.catalog_hash = new cvmfs.util.hash(tail);
        break;
      case 'D':
        manifest.ttl = parseInt(tail);
        break;
      case 'G':
        manifest.garbage_collectable = (tail === 'yes');
        break;
      case 'H':
        manifest.history_hash = new cvmfs.util.hash(tail);
        break;
      case 'M':
        manifest.json_hash = new cvmfs.util.hash(tail);
        break;
      case 'N':
        if (tail !== repo_name) return undefined;
        manifest.repository_name = tail;
        break;
      case 'R':
        manifest.root_hash = tail;
        break;
      case 'S':
        manifest.revision = parseInt(tail);
        break;
      case 'T':
        manifest.published_timestamp = parseInt(tail);
        break;
      case 'X':
        manifest.cert_hash = new cvmfs.util.hash(tail);
        break;
    }

    if (head === '-') {
      const j = (parseInt(i) + 1).toString();
      manifest.metadata_hash = new cvmfs.util.hash(lines[j]);
      break;
    }
  }

  if (manifest.catalog_hash === undefined ||
      manifest.root_hash === undefined ||
      manifest.ttl === undefined ||
      manifest.revision === undefined) return undefined;

  const metadata = data.substring(0, data.search('--'));
  const computed_metadata_hash = cvmfs.util.digestString(metadata, manifest.metadata_hash.alg);
  if (manifest.metadata_hash.hex !== computed_metadata_hash) return undefined;

  var signature = data.substr(data.search('--') + 3 /*(--\n)*/);
  signature = signature.substr(signature.search('\n') + 1 /*\n*/);
  manifest.signature_hex = cvmfs.util.stringToHex(signature);

  return manifest;
};

cvmfs.retriever.fetchManifest = function(repo_url, repo_name) {
  const manifest_raw = cvmfs.retriever.downloadManifest(repo_url);
  return cvmfs.retriever.parseManifest(manifest_raw, repo_name);
};

cvmfs.retriever.parseWhitelist = function(data, repo_name) {
  const metadata = data.substr(0, data.search('--'));
  var metadata_hash_str = data.substr(metadata.length + 3 /*(--\n)*/);
  metadata_hash_str = metadata_hash_str.substr(0, metadata_hash_str.search('\n'));

  const metadata_hash = new cvmfs.util.hash(metadata_hash_str);
  const computed_metadata_hash = cvmfs.util.digestString(metadata, metadata_hash.alg);
  if (metadata_hash.hex !== computed_metadata_hash) return undefined;

  const whitelist = { metadata_hash: metadata_hash };
  const lines = metadata.split('\n');

  whitelist.repository_name = lines[2].substr(1);
  if (whitelist.repository_name !== repo_name) return undefined;

  const expiry_line = lines[1];
  whitelist.expiry_date = new Date(
    parseInt(expiry_line.substr(1, 4)),
    parseInt(expiry_line.substr(5, 2)) - 1,
    parseInt(expiry_line.substr(7, 2)),
    parseInt(expiry_line.substr(9, 2))
  );

  whitelist.cert_fp = new cvmfs.util.hash(lines[3].replace(/\:/g, '').toLowerCase());

  var signature = data.substr(metadata.length + 3 /*(--\n)*/);
  signature = signature.substr(signature.search('\n') + 1 /*(\n)*/);
  whitelist.signature_hex = cvmfs.util.stringToHex(signature);

  return whitelist;
};

cvmfs.retriever.fetchWhitelist = function(repo_url, repo_name) {
  const data = cvmfs.retriever.downloadWhitelist(repo_url);
  return cvmfs.retriever.parseWhitelist(data, repo_name);
};

cvmfs.retriever.fetchCertificate = function(data_url, cert_hash) {
  const data = cvmfs.retriever.downloadCertificate(data_url, cert_hash.download_handle);

  const data_hex = cvmfs.util.stringToHex(data);
  const data_hash = cvmfs.util.digestHex(data_hex, cert_hash.alg);
  if (data_hash !== cert_hash.hex) return undefined;

  const data_deflated = pako.inflate(data);
  const decoder = new TextDecoder("utf-8");
  const pem = decoder.decode(data_deflated);

  const certificate = new X509();
  certificate.readCertPEM(pem);
  return certificate;
};

cvmfs.retriever.dataIsValid = function(data, hash) {
  const data_hex = cvmfs.util.stringToHex(data);
  const data_hash = cvmfs.util.digestHex(data_hex, hash.alg);
  return data_hash === hash.hex;
}

cvmfs.retriever.fetchCatalog = function(data_url, catalog_hash) {
  const data = cvmfs.retriever.downloadCatalog(data_url, catalog_hash.download_handle);

  if (!cvmfs.retriever.dataIsValid(data, catalog_hash))
    return undefined;

  const db_data = pako.inflate(data);
  return new SQL.Database(db_data);
};

cvmfs.retriever.fetchChunk = function(data_url, hash, decompress=true, partial=false) {
  let download_handle = hash.download_handle;
  if (partial) download_handle += "P";
  const data = cvmfs.retriever.downloadChunk(data_url, download_handle);

  if (!cvmfs.retriever.dataIsValid(data, hash))
    return undefined;

  if (decompress)
    return pako.inflate(data);

  if (cvmfs.retriever.text_encoder === undefined)
    cvmfs.retriever.text_encoder = new TextEncoder();
  return cvmfs.retriever.text_encoder.encode(data);
};
