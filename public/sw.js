const CACHE_NAME = "wali-tahfiz-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/src/main.tsx",
  "/src/index.css",
  "/manifest.webmanifest"
];

// Install Event - caching initial assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching core assets...");
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[Service Worker] Clearing old cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Stale-While-Revalidate with full offline fallback routing
self.addEventListener("fetch", (event) => {
  // Only handle HTTP/HTTPS, skip other schemes (like chrome-extension:// or firebase/firestore)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip Firestore/Database API calls & authentication endpoints to avoid interfering with Firebase logic
  if (event.request.url.includes("firestore.googleapis.com") || event.request.url.includes("/api/")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in the background and update the cache dynamically
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {
            // Silence network fetch warnings when offline
          });
        return cachedResponse;
      }

      // If not cached, attempt network fetch
      return fetch(event.request)
        .then((networkResponse) => {
          // If a successful page or asset load, cache it for future offline usage
          if (networkResponse && networkResponse.status === 200 && event.request.method === "GET") {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback if network is failed and not found in cache
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
        });
    })
  );
});
