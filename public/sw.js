// Service worker minimal pour éviter les 404 sur GET /sw.js
// (demandé par le navigateur ou une extension)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
