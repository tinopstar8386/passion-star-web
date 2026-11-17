const CACHE_NAME = 'tino-money-passion-pwa-v6';
const CORE_ASSETS = [
  './index.html',
  './manifest.json',
  './tino-money.mobileconfig',
  '../animate-kit/animate-kit.css',
  '../animate-kit/animate-kit.js',
  './icon/tino_money.svg',
  './icon/tino_money.png',
  './icon/tino_money_512.png'
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

  // Only handle offline fallback for money/ & its assets; network-first for all same-origin
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok && (url.pathname.includes('/money/') || url.pathname.includes('tino_money') || url.pathname.includes('animate-kit'))) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || (url.pathname.includes('/money') ? caches.match('./index.html') : undefined)))
  );
});
