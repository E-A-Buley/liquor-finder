const CACHE_NAME = 'liquor-finder-cache-v1';
const FILES_TO_CACHE = ['index.html','style.css','app.js','manifest.json','icons/icon-192.png','icons/icon-512.png'];

self.addEventListener('install', evt => {
  evt.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', evt => {
  evt.waitUntil(clients.claim());
});

self.addEventListener('fetch', evt => {
  evt.respondWith(
    caches.match(evt.request).then(resp => resp || fetch(evt.request))
  );
});
