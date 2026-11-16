const CACHE_NAME = 'tino-money-passion-pwa-v1';
const CORE_ASSETS = [
  './money.html',
  './manifest-money.json',
  './animate-kit/animate-kit.css',
  './animate-kit/animate-kit.js',
  './icon/tino_money.svg',
  './icon/png/tino_money.png',
  './icon/png/tino_money_512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('tino-money-') && k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Only handle offline fallback for money.html & its assets; network-first for all same-origin
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok && (url.pathname.endsWith('/money.html') || url.pathname.includes('tino_money') || url.pathname.includes('animate-kit') || url.pathname.endsWith('/manifest-money.json'))) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || (url.pathname.endsWith('/money.html') ? caches.match('./money.html') : undefined)))
  );
});
