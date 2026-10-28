self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Deixa as requisições passarem normalmente
  e.respondWith(fetch(e.request).catch(() => new Response('Sem internet')));
});