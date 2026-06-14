const CACHE_NAME = 'romantic-journey-v3';
const urlsToCache = [
  './',
  './index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return Promise.all(
          urlsToCache.map(url =>
            cache.add(url).catch(() => {})
          )
        );
      })
  );
  self.skipWaiting();
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
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

let backgroundTrackingInterval = null;
let pendingLocations = [];

self.addEventListener('message', (event) => {
  if (event.data.type === 'START_BACKGROUND_TRACKING') {
    if (backgroundTrackingInterval) {
      clearInterval(backgroundTrackingInterval);
    }
    
    backgroundTrackingInterval = setInterval(() => {
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'REQUEST_LOCATION_UPDATE'
          });
        });
      });
    }, 10000);
    
    event.ports[0].postMessage({ success: true });
  }
  
  if (event.data.type === 'STOP_BACKGROUND_TRACKING') {
    if (backgroundTrackingInterval) {
      clearInterval(backgroundTrackingInterval);
      backgroundTrackingInterval = null;
    }
    event.ports[0].postMessage({ success: true });
  }
  
  if (event.data.type === 'STORE_LOCATION') {
    pendingLocations.push({
      ...event.data.location,
      timestamp: Date.now()
    });
    
    if (pendingLocations.length > 100) {
      pendingLocations = pendingLocations.slice(-100);
    }
    
    event.ports[0].postMessage({ success: true, count: pendingLocations.length });
  }
  
  if (event.data.type === 'GET_PENDING_LOCATIONS') {
    event.ports[0].postMessage({ 
      locations: pendingLocations,
      count: pendingLocations.length 
    });
    pendingLocations = [];
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-locations') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SYNC_LOCATIONS'
          });
        });
      })
    );
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-location') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'REQUEST_LOCATION_UPDATE'
          });
        });
      })
    );
  }
});
