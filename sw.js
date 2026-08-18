// My Subjects — service worker
// Caches the app shell (this HTML/CSS/JS + icon) so the app opens with no
// connection. It never caches backend calls (Apps Script fetch requests) —
// those must always hit the network live, since they're the student's
// actual data. If there's no connection, the app JS itself falls back to
// the last-synced copy in localStorage and shows the offline banner.

const CACHE_NAME = 'my-subjects-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache/intercept calls to the Apps Script backend — always network,
  // always live data.
  if (url.hostname.includes('script.google.com') || url.hostname.includes('googleusercontent.com')) {
    return;
  }

  // Only handle same-origin GET requests for the shell; everything else
  // (fonts, Cloudinary images, API calls) passes straight to the network.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
