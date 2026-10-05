// ZedPath service worker: makes the app installable and quick to open on weak connections.
// Pages: network first, falling back to the cached app shell. Hashed assets: cache first (they never change).
// API calls are never cached here (the API has its own ETag revalidation), so answers are always current.
const VERSION = 'zedpath-v2';
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon.svg', '/icons/icon-192.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(r => { caches.open(VERSION).then(c => c.put('/', r.clone())); return r; })
      .catch(() => caches.match('/')));
    return;
  }
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(r => {
      const copy = r.clone(); caches.open(VERSION).then(c => c.put(event.request, copy)); return r; })));
  }
});

// Tapping a ZedPath notification opens the app (or focuses it if it is already open).
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const open = list.find(c => new URL(c.url).origin === location.origin);
    return open ? open.focus().then(c => c.navigate ? c.navigate(target) : c) : self.clients.openWindow(target);
  }));
});
