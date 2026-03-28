const CACHE_NAME = 'daimyo-cache-v6';
const ASSETS = [
  './',
  './index.html',
  './library.html',
  './equipment-database.html',
  './time-management.html',
  './oracle-generators.html',
  './kegare-panico.html',
  './combat-calculator.html',
  './js/header-loader.js',
  './js/theme-manager.js',
  './js/narrative-tools.js',
  './js/weapons-data.js',
  './js/library-data.js',
  './js/enemy-generator.js',
  './js/ranged-calc.js',
  './manifest.json',
  './icons/app-icon-192.png',
  './icons/app-icon-512.png',
  './screenshots/desktop.png',
  './screenshots/mobile.png'
];

// INSTALL: Cache current assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('🛡️ Daimyo Shield: Pre-caching assets for offline use...');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE: Clean old caches
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

// FETCH: Network-First with Cache Fallback for dynamic content (HTML/JS)
// This ensures we get updates if online, but stay functional if offline.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // If success, update cache and return
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      })
      .catch(() => {
        // If offline/error, return from cache
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) return cachedResponse;
          
          // Return index.html as fallback for navigation if offline
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
