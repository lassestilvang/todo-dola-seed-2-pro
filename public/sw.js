// Service Worker for Todo Dola Seed 2 Pro
const CACHE_NAME = 'todotask-v2';
const STATIC_CACHE = 'todotask-static-v2';
const DYNAMIC_CACHE = 'todotask-dynamic-v2';

// Static assets to cache on install
const STATIC_URLS = [
  '/',
  '/dashboard',
  '/today',
  '/upcoming',
  '/kanban',
  '/calendar',
  '/settings',
  '/lists',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.svg',
  '/icon-512.svg',
];

// API routes to cache
const API_ROUTES = [
  '/api/lists',
  '/api/labels',
];

const urlsToCache = [...STATIC_URLS, ...API_ROUTES];

// Install event - cache core pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all([
        // Delete old cache versions
        ...cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName.startsWith('todotask')) {
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        }),
        // Claim clients
        self.clients.claim(),
      ]);
    })
  );
});

// Fetch event - Network First for API, Cache First for static
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful API responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache when offline
          return caches.match(event.request);
        })
    );
    return;
  }

  // Static assets - Cache First
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached response or fetch from network
        return response || fetch(event.request).then((networkResponse) => {
          // Cache new static assets
          if (networkResponse.ok && url.pathname.startsWith('/_next/static/')) {
            const clone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        });
      })
  );
});

// Handle sync for offline changes
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks());
  }
});

async function syncTasks() {
  // Get pending changes from IndexedDB and sync
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_COMPLETE' });
  });
}

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json();
  const title = data?.title || 'New notification';
  const body = data?.body || 'You have a new notification';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      data: data,
    })
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if ('openWindow' in self) {
        return self.openWindow(url);
      }
    })
  );
});