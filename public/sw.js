// Este es un Service Worker básico para que Chrome reconozca la App como instalable
self.addEventListener('install', (e) => {
    console.log('[Service Worker] Install');
  });
  
  self.addEventListener('fetch', (e) => {
    // Por ahora no hace nada, pero debe estar presente
    e.respondWith(fetch(e.request));
  });