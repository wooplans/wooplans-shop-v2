/* sw.js — WooPlans Service Worker */
'use strict';

var CACHE_VERSION = 'v1';
var STATIC_CACHE = 'wooplans-static-' + CACHE_VERSION;
var IMAGE_CACHE  = 'wooplans-images-' + CACHE_VERSION;
var HTML_CACHE   = 'wooplans-html-' + CACHE_VERSION;

var PRECACHE_ASSETS = [
  '/',
  '/css/critical.css'
  // main CSS and JS are added dynamically with hashes
];

/* ── Install: precache static assets ────────────────────────────────────── */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function (cache) {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

/* ── Activate: cleanup old caches ────────────────────────────────────────── */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) {
            return key !== STATIC_CACHE && key !== IMAGE_CACHE && key !== HTML_CACHE;
          })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* ── Fetch strategy ──────────────────────────────────────────────────────── */
self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);
  var path = url.pathname;

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip external domains except BunnyCDN images
  if (url.origin !== self.location.origin) {
    if (url.hostname === 'wooplans.b-cdn.net') {
      // Stale-while-revalidate for BunnyCDN images
      event.respondWith(staleWhileRevalidate(event.request, IMAGE_CACHE));
    }
    return;
  }

  // CSS, JS, fonts: cache-first (immutable with hash)
  if (path.startsWith('/css/') || path.startsWith('/js/') || path.startsWith('/fonts/')) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // HTML pages: network-first with cache fallback
  if (path.endsWith('/') || path.endsWith('.html') || !path.includes('.')) {
    event.respondWith(networkFirst(event.request, HTML_CACHE));
    return;
  }

  // Everything else: network first
  event.respondWith(networkFirst(event.request, STATIC_CACHE));
});

/* ── Strategy helpers ────────────────────────────────────────────────────── */
function cacheFirst(request, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(request).then(function (cached) {
      return cached || fetch(request).then(function (response) {
        if (response.ok) cache.put(request, response.clone());
        return response;
      });
    });
  });
}

function networkFirst(request, cacheName) {
  return fetch(request).then(function (response) {
    if (response.ok) {
      caches.open(cacheName).then(function (cache) {
        cache.put(request, response.clone());
      });
    }
    return response;
  }).catch(function () {
    return caches.open(cacheName).then(function (cache) {
      return cache.match(request).then(function (cached) {
        return cached || caches.match('/');
      });
    });
  });
}

function staleWhileRevalidate(request, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(request).then(function (cached) {
      var fetchPromise = fetch(request).then(function (response) {
        if (response.ok) cache.put(request, response.clone());
        return response;
      }).catch(function () { return cached; });
      return cached || fetchPromise;
    });
  });
}
