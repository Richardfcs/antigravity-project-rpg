const CACHE_NAME = 'daimyo-cache-v12';
const ASSETS = [
  './',
  './index.html',
  './library.html',
  './equipment-database.html',
  './time-management.html',
  './oracle-generators.html',
  './kegare-panico.html',
  './combat-calculator.html',
  './characters-sheet.html',
  './js/daimyo-db.js',
  './js/header-loader.js',
  './js/theme-manager.js',
  './js/narrative-tools.js',
  './js/weapons-data.js',
  './js/library-data.js',
  './js/enemy-generator.js',
  './js/ranged-calc.js',
  './js/tactical-map.js',
  './js/character-manager.js',
  './js/character-ui.js',
  './js/daimyo-seal.js',
  './js/kegare-manager.js',
  './js/log-manager.js',
  './js/merchant-logic.js',
  './manifest.json',
  './icons/app-icon-192.png',
  './icons/app-icon-512.png',
  './maps/kamamura.png',
  './maps/mapa-macro.png',
  './maps/regiao-chugoku.png'
];

// INSTALL: Cache current assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('🛡️ Daimyo Shield: Pre-caching core assets for offline use...');
        return Promise.allSettled(
          ASSETS.map(url => cache.add(url))
        );
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

// FETCH: Advanced Strategy
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // OPTIMIZATION: Cross-Origin Assets (Fonts & External Tools)
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // DEFAULT: Network-First with Cache Fallback for common local files
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Cache apenas respostas bem-sucedidas do mesmo domínio
        // Cache sucessful responses (200 OK)
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) return cachedResponse;

          // Fallback final apenas para navegações que não estão no cache e rede falhou
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html') || caches.match('index.html');
          }
          return new Response('Offline and content not available', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});
