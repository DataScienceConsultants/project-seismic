const CACHE_NAME = "eq-tracker-v0-1";

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener("fetch", event => {
  event.respondWith(fetch(event.request));
});
