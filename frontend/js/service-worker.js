const CACHE_NAME = 'music-app-cache-v2'; // Updated version number
const DEVELOPMENT_MODE = true; // Set to false for production

const urlsToCache = [
  '/',
  '/styles/main.css',
  '/scripts/app.js',
  '/images/logo.png',
  '/songs/song1.mp3',
  '/songs/song2.mp3'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Forces immediate activation
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache)
          .then(() => console.log("All resources added to cache"))
          .catch((error) => {
            console.error('Failed to add all to cache:', error);
            urlsToCache.forEach((url) => {
              fetch(url).catch((e) => console.error(`Could not fetch: ${url}`));
            });
          });
      })
      .catch((error) => console.error("Could not open cache:", error))
  );
});

self.addEventListener('activate', event => {
  self.clients.claim(); // Takes control immediately
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  // Development mode: Always fetch fresh files except for music
  if (DEVELOPMENT_MODE) {
    // Cache music files (they're large and don't change often)
    if (event.request.url.includes('/songs/') || event.request.destination === 'audio') {
      event.respondWith(
        caches.match(event.request)
          .then(response => {
            return response || fetch(event.request).then(networkResponse => {
              return caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse.clone());
                return networkResponse;
              });
            });
          })
          .catch(() => {
            return caches.match('/songs/offline-placeholder.mp3');
          })
      );
    } else {
      // Always fetch fresh for HTML, CSS, JS during development
      event.respondWith(
        fetch(event.request)
          .catch(() => {
            // Fallback to cache if network fails
            return caches.match(event.request);
          })
      );
    }
  } else {
    // Production mode: Cache-first strategy
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          return response || fetch(event.request).then(networkResponse => {
            return caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
          });
        })
        .catch(() => {
          if (event.request.destination === 'audio') {
            return caches.match('/songs/offline-placeholder.mp3');
          }
        })
    );
  }
});
