const V = 'tvacha-v4', SHELL = ['/data/skincare-guidelines.json', '/', '/styles.css', '/app.js', '/safety.js', '/manifest.webmanifest', '/icon.svg', '/data/conditions.json', '/data/warning-signs.json'];
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== V).map(n => caches.delete(n)))).then(() => clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.pathname.startsWith('/api/')) return; // photos/API never cached
  e.respondWith(caches.match(e.request).then(m => m || fetch(e.request)));
});
