const VERSION = 'gympro-v2';

self.addEventListener('install', (event) => {
  console.log('SW: Instalando nueva versión...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('SW: App activa y lista.');
  event.waitUntil(clients.claim());
});

// Este evento es OBLIGATORIO para que aparezca el botón de "Instalar"
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request).catch(() => {
    return new Response('Estás offline, pero la App sigue aquí.');
  }));
});