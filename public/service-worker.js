// Nome e versione della cache
const CACHE_NAME = 'ticket-app-cache-v1';

// Assets da mettere in cache al momento dell'installazione
const INITIAL_CACHED_RESOURCES = [
  '/',
  '/index.html',
  '/static/css/main.chunk.css',
  '/static/js/main.chunk.js',
  '/static/js/bundle.js',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  '/manifest.json'
];

// Installazione del service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service worker installato, pre-caching degli assets iniziali');
        return cache.addAll(INITIAL_CACHED_RESOURCES);
      })
  );
});

// Attivazione del service worker e pulizia delle cache vecchie
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName.startsWith('ticket-app-cache-') && cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('Eliminazione cache vecchia:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// Strategia di caching: Cache First, poi Network
self.addEventListener('fetch', event => {
  // Escludi le richieste al database Firebase o ad altri servizi
  if (
    event.request.url.includes('firestore.googleapis.com') || 
    event.request.url.includes('www.googleapis.com') ||
    event.request.url.includes('firebaseio.com') ||
    event.request.url.includes('identitytoolkit.googleapis.com')
  ) {
    return;
  }
  
  // Applica diversa strategia per le API QR Code
  if (event.request.url.includes('api.qrserver.com')) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        // Se il QR code è già in cache, restituiscilo
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Altrimenti, fai la richiesta e memorizza in cache
        return fetch(event.request).then(response => {
          // Se la risposta non è valida, restituisci solo la risposta
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clona la risposta per memorizzarla in cache
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        });
      })
    );
    return;
  }
  
  // Per le risorse statiche, usa Cache First
  if (
    event.request.url.includes('/static/') || 
    event.request.url.endsWith('.js') || 
    event.request.url.endsWith('.css') || 
    event.request.url.endsWith('.png') || 
    event.request.url.endsWith('.jpg') || 
    event.request.url.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(event.request)
            .then(response => {
              // Se la risposta non è valida, restituisci solo la risposta
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Clona la risposta per memorizzarla in cache
              const responseToCache = response.clone();
              
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
              
              return response;
            });
        })
    );
    return;
  }
  
  // Per le altre richieste, usa Network First, con fallback a Cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Se la risposta è valida, memorizzala in cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // Se la rete fallisce, prova dalla cache
        return caches.match(event.request);
      })
  );
});

// Gestione delle notifiche push (per future implementazioni)
self.addEventListener('push', event => {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/logo192.png',
    badge: '/favicon.ico',
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Gestione del click sulle notifiche
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
}); 