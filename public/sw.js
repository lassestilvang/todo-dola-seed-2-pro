// Service Worker for Todo Dola Seed 2 Pro
const CACHE_NAME = 'todotask-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/today',
  '/upcoming',
  '/kanban',
  '/calendar',
  '/settings',
  '/lists',
  '/manifest.json',
];

// Install event - cache core pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Activate event - clean old caches
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
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached response or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Handle sync for offline changes
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks());
  }
});

function syncTasks() {
  // Get pending changes from IndexedDB and sync
  return Promise.resolve();
}