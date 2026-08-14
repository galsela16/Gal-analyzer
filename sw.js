// bump CACHE version whenever you change files
const CACHE = 'gal-analyzer-v5-4-46-visible-range-cache-recovery-20260814';
const ASSETS = [
  './',
  './index.html',
  './app.js?v=5.4.46',
  './js/app-core.js?v=5.4.46',
  './js/core/config.js?v=5.4.46',
  './js/core/diagnostics.js?v=5.4.46',
  './recorder-worklet.js',
  './manifest.webmanifest',
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
          .then(() => self.clients.matchAll({type:'window'}))
          .then(clients => Promise.all(clients.map(client => {
            const url=new URL(client.url);url.searchParams.set('gal_update','5.4.46');
            return client.navigate(url.href).catch(()=>null);
          })))
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
