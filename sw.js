/* ===== SVJ Portál — Service Worker =====
 * Strategie:
 *   dist/ (bundles s hash URL)  → cache-first
 *   / index.html                → network-first, cache fallback (offline shell)
 *   /api/                       → network-only (nikdy necachovat)
 *   vše ostatní                 → network-only
 */

var CACHE = 'svj-portal-v1';

// Install — nečekáme na uvolnění starého SW
self.addEventListener('install', function() {
  self.skipWaiting();
});

// Activate — smaž staré cache, převezmi kontrolu hned
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // API: network-only (vždy čerstvá data)
  if (url.pathname.startsWith('/api/')) return;

  // Jen GET requesty
  if (e.request.method !== 'GET') return;

  // dist/ bundles — cache-first (hash v URL = bezpečné)
  if (url.pathname.startsWith('/dist/')) {
    e.respondWith(cacheFirst(e.request));
    return;
  }

  // index.html + navigace — network-first, offline fallback
  if (e.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('index.html')) {
    e.respondWith(networkFirstWithFallback(e.request));
    return;
  }
});

function cacheFirst(request) {
  return caches.match(request).then(function(cached) {
    if (cached) return cached;
    return fetch(request).then(function(response) {
      if (response && response.ok) {
        var clone = response.clone();
        caches.open(CACHE).then(function(c) { c.put(request, clone); });
      }
      return response;
    });
  });
}

function networkFirstWithFallback(request) {
  return fetch(request).then(function(response) {
    if (response && response.ok) {
      var clone = response.clone();
      caches.open(CACHE).then(function(c) { c.put(request, clone); });
    }
    return response;
  }).catch(function() {
    return caches.match(request).then(function(cached) {
      return cached || caches.match('/index.html');
    });
  });
}
