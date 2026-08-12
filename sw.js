// bump CACHE version whenever you change files
const CACHE = 'gal-analyzer-v5-4-11-tf-dock-layout-20260812';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './js/app-core.js',
  './js/core/config.js',
  './js/core/diagnostics.js',
  './recorder-worklet.js',
  './manifest.webmanifest',
  './fonts/heebo-hebrew-400-normal.woff2',
  './fonts/heebo-hebrew-600-normal.woff2',
  './fonts/heebo-hebrew-700-normal.woff2',
  './fonts/heebo-latin-400-normal.woff2',
  './fonts/heebo-latin-600-normal.woff2',
  './fonts/heebo-latin-700-normal.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ASSETS.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
          .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const d = e.request.destination;
  const codeLike = e.request.mode === 'navigate' || d === 'document' || d === 'script' || d === 'worker' || d === 'audioworklet' || e.request.url.endsWith('.js');
  if (codeLike) {
    e.respondWith(
      fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return r;
      }).catch(() => caches.match(e.request).then(h => h || caches.match('./index.html')))
    );
  } else {
    e.respondWith(caches.match(e.request).then(h => h || fetch(e.request)));
  }
});
