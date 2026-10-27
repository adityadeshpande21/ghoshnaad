// Ghoshnaad offline cache. build/build.mjs fills in the version and the file list below.
// The app is one self-contained page, so the cache is small: the page, the manifest and the icons.
//
// A new version is installed in the background and takes over only when every open window has been closed,
// so an update can never replace the app while a rachana is playing or a composition is being edited.
// Navigations go to the network first (a new version shows up on the next open), then to the cache when offline.
const VERSION = '__VERSION__';
const CACHE = 'ghoshnaad-' + VERSION;
const FILES = __FILES__;

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))));
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
    const isApp = url.pathname === scope || url.pathname === scope + 'index.html';
    e.respondWith(fetch(req).then(res => {
      if (res.ok && isApp) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); }
      return res;
    }).catch(() => caches.match('index.html').then(r => r || caches.match(req))));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req)));
});
