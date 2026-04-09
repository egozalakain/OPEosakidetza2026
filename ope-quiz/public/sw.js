// Minimal service worker — required by Chrome's PWA installability criteria.
// No caching: the app remains fully network-dependent.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", () => {
  // Pass through all requests — no caching.
});
