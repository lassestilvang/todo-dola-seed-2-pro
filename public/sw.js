const CACHE_NAME = 'todo-dola-v1';
const OFFLINE_URL = '/offline.html';

const urlsToCache = [
  '/',
  '/kanban',
  '/calendar',
  '/reports',
  '/dashboard',
  '/today',
  '/upcoming',
  '/lists',
  '/settings',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API requests - network first with fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return response;
        })
        .catch(() => {
          return new Response(JSON.stringify({ error: 'Offline mode' }), {
            headers: { 'Content-Type': 'application/json' },
          });
        })
    );
    return;
  }

  // Static assets - cache first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
    );
    return;
  }

  // HTML pages - network first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const cacheResponse = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, cacheResponse);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }
            return caches.match(OFFLINE_URL);
          });
      })
  );
});
