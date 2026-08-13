/* Minimal SW for local installability (vite-plugin-pwa is disabled in dev). */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // Required so Chrome treats the app as installable.
});
