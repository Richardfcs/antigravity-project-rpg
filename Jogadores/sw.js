const CACHE_NAME = 'daimyo-player-v2';
const ASSETS = [
  './',
  './index.html',
  './characters-sheet.html',
  './notes.html',
  './equipment-database.html',
  './library.html',
  './settings.html',
  './manifest.json',
  './js/daimyo-db.js',
  './js/theme-manager.js',
  './js/character-manager.js',
  './js/header-player.js',
  './js/player-notes.js',
  './js/library-data.js',
  './js/weapons-data.js',
  './js/log-manager.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('🛡️ Daimyo Viajante: Cacheando ativos do Ronin...');
        return Promise.allSettled(
          ASSETS.map(url => cache.add(url))
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
