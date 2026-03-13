// PharmaFinder IL Service Worker
const CACHE_NAME = 'pharma-finder-v1';
const STATIC_CACHE = 'pharma-finder-static-v1';
const API_CACHE = 'pharma-finder-api-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

const OSM_TILE_CACHE = 'osm-tiles-v1';
const OSM_API_CACHE = 'osm-api-v1';

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(STATIC_ASSETS.filter((u) => {
        try { new URL(u, self.location.origin); return true; } catch { return false; }
      }))
    ).catch(() => {})
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![CACHE_NAME, STATIC_CACHE, API_CACHE, OSM_TILE_CACHE, OSM_API_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache strategies
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // OSM map tiles - CacheFirst (long TTL)
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.open(OSM_TILE_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((res) => {
            cache.put(event.request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // MoH and OpenFDA APIs - CacheFirst with 24h TTL
  if (
    url.hostname.includes('data.gov.il') ||
    url.hostname.includes('api.fda.gov')
  ) {
    event.respondWith(
      caches.open(API_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((res) => {
            if (res.ok) cache.put(event.request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // Clalit search API - NetworkFirst (real-time data)
  if (url.hostname.includes('e-services.clalit.co.il')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request).then((c) => c || new Response('{"error":"offline"}', { status: 503 }))
      )
    );
    return;
  }

  // Navigation: NetworkFirst with fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/').then((c) => c || new Response('Offline', { status: 503 }))
      )
    );
    return;
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'מחפש תרופות', {
        body: data.body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        dir: 'rtl',
        lang: 'he',
        data: { url: data.url || '/' },
        actions: [
          { action: 'view', title: 'הצג תוצאות' },
          { action: 'dismiss', title: 'סגור' },
        ],
      })
    );
  } catch { /* ignore parse errors */ }
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.navigate(url);
          client.focus();
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
