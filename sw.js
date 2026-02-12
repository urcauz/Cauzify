// ─── CAUZIFY SERVICE WORKER ────────────────────────────
// Version 1.0 - PWA Cache Management

const CACHE_VERSION = 'cauzify-v1.0';
const CACHE_STATIC = 'cauzify-static-v1';
const CACHE_DYNAMIC = 'cauzify-dynamic-v1';
const CACHE_IMAGES = 'cauzify-images-v1';

// Files to cache on install
const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;1,300&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/blueimp-md5/2.19.0/js/md5.min.js'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('[SW] Install failed:', err))
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // Delete old caches
            if (cacheName !== CACHE_STATIC && 
                cacheName !== CACHE_DYNAMIC && 
                cacheName !== CACHE_IMAGES) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests
  event.respondWith(
    handleFetch(request, url)
  );
});

async function handleFetch(request, url) {
  // Static assets - cache first
  if (STATIC_ASSETS.some(asset => url.href.includes(asset))) {
    return cacheFirst(request, CACHE_STATIC);
  }

  // Images (cover art) - cache first with fallback
  if (url.pathname.includes('getCoverArt')) {
    return cacheFirst(request, CACHE_IMAGES);
  }

  // API requests - network first with cache fallback
  if (url.pathname.includes('/rest/')) {
    return networkFirst(request, CACHE_DYNAMIC);
  }

  // Default - network first
  return networkFirst(request, CACHE_DYNAMIC);
}

// Cache first strategy
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    console.log('[SW] Serving from cache:', request.url);
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    // Return offline page or fallback
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Network first strategy
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    throw error;
  }
}

// Background sync for scrobbles (optional)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-scrobbles') {
    event.waitUntil(syncScrobbles());
  }
});

async function syncScrobbles() {
  // Implementation for syncing scrobbles when back online
  console.log('[SW] Syncing scrobbles...');
  // Get pending scrobbles from IndexedDB and send to server
}

// Push notifications (optional)
self.addEventListener('push', event => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New music available',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: data.url || './'
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Cauzify', options)
  );
});

// Notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data || './')
  );
});

// Message handler for cache control from main app
self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data.action === 'clearCache') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      })
    );
  }
});

console.log('[SW] Service Worker loaded');
