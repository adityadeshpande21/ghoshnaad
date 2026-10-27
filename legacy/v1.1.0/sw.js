// Ghoshnaad v1.1.0 — offline cache for the installed app (GitHub Pages).
// The app is one self-contained file, so the cache is small: the page, the manifest and the icons.
// A new version = a new cache name; the old cache is removed and the new page is used on the next open.
const V = 'ghoshnaad-1.1.0';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon-64.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // pages: network first (so an update shows up when online), cache when offline
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(res => { if (res.ok) { const c = res.clone(); caches.open(V).then(x => x.put('index.html', c)); } return res; })
      .catch(() => caches.match('index.html')));
    return;
  }
  // everything else: cache first; fonts from Google are kept once fetched
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => {
    if (res.ok && (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname))) { const c = res.clone(); caches.open(V).then(x => x.put(e.request, c)); }
    return res;
  })));
});
