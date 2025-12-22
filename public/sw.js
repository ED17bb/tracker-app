const CACHE_NAME = 'gym-pro-v1';

// Se ejecuta cuando se instala la app
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Se ejecuta cuando la app toma el control
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Obligatorio para que Chrome detecte que la app funciona "offline"
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});