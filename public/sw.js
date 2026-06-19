const CACHE_NAME = 'sales-spark-cache-v2';

const PRECACHE_ASSETS = [
  '/logo.png?v=4',
  '/favicon.ico?v=4',
  '/icon-192.png?v=4',
  '/icon-512.png?v=4'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-cache warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Apenas trata requisições GET, ignorando extensões do navegador e requisições de mídia parciais (range)
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:' || request.headers.has('range')) {
    return;
  }

  // Estratégia Cache-First para arquivos estáticos (Imagens, Chunks de CSS/JS do build do Next, Fontes)
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.css');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Falha silenciosa offline
        });
      })
    );
    return;
  }

  // Estratégia Network-First para chamadas de API e rotas de página (HTML/Dados dinâmicos)
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Caso esteja offline em navegação HTML, tenta exibir a tela inicial cacheada
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/dashboard');
          }
        });
      })
  );
});
