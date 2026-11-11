// Offline support for the browser version. Network first, so a new version
// is always picked up when online; the cache is only used without a
// connection (or when the network fails).
const CACHE = 'distorsion-v2';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // audio is streamed with range requests: leave those to the browser
  if (req.headers.has('range') || /\.(ogg|mp3|wav)(\?|$)/.test(req.url)) return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});
