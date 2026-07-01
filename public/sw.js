const CACHE = 'time-tracker-v1';
const ASSETS = [
  '/timer-app/',
  '/timer-app/index.html',
  '/timer-app/manifest.json',
  '/timer-app/icon-192.svg',
  '/timer-app/icon-512.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
