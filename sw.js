const CACHE_NAME = 'petugas-rw15-perelek-air-v2';
const urlsToCache = [
  '/rw15-petugas/',
  '/rw15-petugas/index.html',
  '/rw15-petugas/manifest.json',
  './',
  './index.html',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
  'https://unpkg.com/html5-qrcode',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        urlsToCache.map(url =>
          fetch(url, { mode: 'cors', credentials: 'omit' })
            .then(resp => {
              if (resp && (resp.status === 200 || resp.type === 'opaque')) {
                return cache.put(url, resp);
              }
            })
            .catch(() => cache.add(url).catch(() => {}))
        )
      );
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // Jangan pernah meng-cache request POST ke Google Apps Script
  if (req.method !== 'GET' || req.url.includes('script.google.com') || req.url.includes('googleusercontent.com/macros')) {
    return;
  }

  // Strategi Cache-First dengan pembaruan jaringan di latar belakang agar aplikasi tetap terbuka saat mode pesawat
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(cachedResp => {
      const networkFetch = fetch(req).then(netResp => {
        if (netResp && (netResp.status === 200 || netResp.type === 'opaque')) {
          const clone = netResp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return netResp;
      }).catch(() => {
        if (cachedResp) return cachedResp;
        if (req.mode === 'navigate') {
          return caches.match('/rw15-petugas/index.html') || caches.match('./index.html');
        }
        return new Response('Mode Offline Aktif', { status: 503, headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
      });

      return cachedResp || networkFetch;
    })
  );
});
