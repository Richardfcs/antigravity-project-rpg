const CACHE_NAME = 'daimyo-cache-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/library.html',
  '/equipment-database.html',
  '/time-management.html',
  '/oracle-generators.html',
  '/kegare-panico.html',
  '/combat-calculator.html',
  '/js/header-loader.js',
  '/js/narrative-tools.js',
  '/js/weapons-data.js',
  '/js/library-data.js',
  '/js/enemy-generator.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
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
    })
  );
});

// Stale-While-Revalidate Strategy
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if(networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      }).catch(() => {
        // Ignora erro de rede se falhar de buscar, usa o fallback (cachedResponse)
      });

      // Retorna o cache IMEDIATAMENTE se existir. Em background, aguarda a rede (fetchPromise)
      return cachedResponse || fetchPromise;
    })
  );
});
