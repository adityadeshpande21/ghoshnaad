// Ghoshnaad offline cache. build/build.mjs fills in the version and the file list below.
// The app is one self-contained page, so the cache is small: the page, the manifest and the icons.
//
// A new version is installed in the background and takes over only when every open window has been closed,
// so an update can never replace the app while a rachana is playing or a composition is being edited.
//
// Opening the app: the network is asked first, but for at most NETWORK_LIMIT ms. On a weak signal the cached page is shown instead
// and the request carries on in the background, so the next open has the new page. Offline, the cached page is shown at once.
const VERSION = '__VERSION__';
const CACHE = 'ghoshnaad-' + VERSION;
const FILES = __FILES__;
const NETWORK_LIMIT = 3000;

// `cache: 'reload'` skips the browser's own HTTP cache, which GitHub Pages lets keep a page for 10 minutes:
// a new version must never install a stale copy of itself.
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(u => new Request(u, { cache: 'reload' }))))));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('ghoshnaad-') && k !== CACHE).map(k => caches.delete(k))))));
// The app can ask a waiting worker to take over (after it has checked that nothing is playing or unsaved).
self.addEventListener('message', e => { if (e.data === 'skip-waiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const scope = new URL(self.registration.scope).pathname;
  if (req.mode === 'navigate') {
    // the page is stored once, as index.html; "./" and "index.html" both answer from it
    const isApp = url.pathname === scope || url.pathname === scope + 'index.html';
    const network = fetch(req).then(res => {
      if (res.ok && isApp) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); }
      return res;
    });
    network.catch(() => {});                                    // a failure is handled below; this only avoids an unhandled rejection
    e.waitUntil(network.catch(() => {}));                       // keep the worker alive so a slow download still refreshes the cache
    const limit = new Promise(resolve => setTimeout(() => resolve(null), NETWORK_LIMIT));
    e.respondWith(Promise.race([network.catch(() => null), limit]).then(async res => {
      if (res) return res;
      const cached = await caches.match('index.html');
      return cached || network;                                 // nothing cached yet (first visit): wait for the network
    }));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req)));
});
