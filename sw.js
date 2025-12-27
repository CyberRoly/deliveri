// Service Worker básico para PWA
const CACHE_NAME = 'delivery-mipymes-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/modules/utils.js',
  '/modules/catalog.js',
  '/modules/cart.js',
  '/modules/checkout.js',
  '/modules/payments.js',
  '/modules/whatsapp.js',
  '/modules/admin.js',
  '/data/products.json',
  '/data/config.json',
  '/manifest.json',
  'assets/icons/icon-192x192.png',
  'assets/icons/icon-512x512.png'
];

// Instalar Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activar y limpiar cachés antiguas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Estrategia Cache First, fallback a Network
self.addEventListener('fetch', event => {
  // No cachear solicitudes de API/data si es muy frecuente
  if (event.request.url.includes('/data/') || 
      event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cachear la respuesta para uso futuro
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseClone);
            });
          return response;
        })
        .catch(() => {
          // Fallback al cache si no hay conexión
          return caches.match(event.request);
        })
    );
  } else {
    // Para recursos estáticos, Cache First
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request)
            .then(response => {
              // Validar respuesta
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Clonar respuesta para cache
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
              
              return response;
            });
        })
        .catch(() => {
          // Fallback para páginas
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        })
    );
  }
});