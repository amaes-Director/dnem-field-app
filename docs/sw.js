/* Offline cache for the DNEM ADA Lens app. Bump VERSION when files change. */
var VERSION = 'dnem-field-v8';
var FILES = ['./', 'index.html', 'styles.css', 'app.js', 'rules.js', 'engine.js', 'walk.js', 'lib/jszip.min.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'dnem_logo.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Network first so updates arrive when online; cache when offline.
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  // no-cache: always ask GitHub for the newest copy when online, so updates show up right away
  e.respondWith(fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }).then(function (r) {
    var copy = r.clone(); caches.open(VERSION).then(function (c) { c.put(e.request, copy); });
    return r;
  }).catch(function () { return caches.match(e.request, { ignoreSearch: true }); }));
});
