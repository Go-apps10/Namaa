// Opens the app instantly from the saved copy, then checks for a newer version in the background.
// This matters where the host is slow or blocked: the app never waits on the network to open.
// Prices always come from the network (other sites, not handled here).
const CACHE = 'wealth-shell-v26';
const SHELL = ['./', './wealth.html', './manifest.webmanifest', './icons/logo.svg', './icons/badge-96.png', './icons/macrodroid.png',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// tapping a notification brings the app to the front, or opens it if it was closed
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true})
    .then(list => list.length ? list[0].focus() : self.clients.openWindow('./wealth.html')));
});

// same-origin files: answer from the cache right away, refresh the cache from the network for next time
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(e.request, {ignoreSearch: true})
      || (e.request.mode === 'navigate' ? await cache.match('./wealth.html') : undefined);
    // no-cache: always ask the server, so the browser's own HTTP cache never hides a new version
    const network = fetch(e.request.url, {cache: 'no-cache'}).then(res => {
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    });
    if (cached) {
      e.waitUntil(network.catch(() => {}));
      return cached;
    }
    return network.catch(() => cache.match('./wealth.html'));
  })());
});
