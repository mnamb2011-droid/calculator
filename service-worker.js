const CACHE_NAME = 'hypercalc-v1';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json'
];

// Install Event - Cache Files
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// Fetch Event - Serve from Cache
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});
