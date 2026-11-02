const CACHE = 'megalab-v3.0.0';
const SHELL = [
  './',
  './index.html',
  './google-client-id.js',
  './assets/css/base.css',
  './assets/css/landing.css',
  './assets/css/app.css',
  './assets/css/components.css',
  './assets/js/data.js',
  './assets/js/store.js',
  './assets/js/ai.js',
  './assets/js/auth.js',
  './assets/js/ui.js',
  './assets/js/documents.js',
  './assets/js/games.js',
  './assets/js/classroom.js',
  './assets/js/views.js',
  './assets/js/app.js',
  './assets/img/icon.svg',
  './site.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  if (url.pathname.endsWith('/google-client-id.js')) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }))
  );
});

