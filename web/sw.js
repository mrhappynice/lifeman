// sw.js - simple cache-first service worker

const CACHE_NAME = 'lifemgr-cache-v1';

// List everything needed for offline
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: cleanup old caches if you bump the version
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache-first strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((cached) => {
      // Serve from cache if available, else network
      return (
        cached ||
        fetch(request).catch(() => {
          // Optional: custom offline response for HTML requests
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
        })
      );
    })
  );
});
