const CACHE_NAME = 'CVMFS_CACHE';

window.addEventListener('load', function(event) {
  caches.delete(CACHE_NAME).then(function(){
  	navigator.serviceWorker.register('sw-cache.js');
  });
});

cvmfs.retriever.download = cvmfs.retriever.httpGet;