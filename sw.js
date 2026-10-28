// KidQuest service worker: lets the app open with no internet.
// App files: network first (so updates arrive), cached copy when offline.
// Fonts and the Firebase library: cached once, they're versioned.
// Firebase data traffic is left alone — Firestore has its own offline cache.
const CACHE = 'kq-v2';
const CORE = ['./', './index.html', './manifest.json', './firebase-config.js', './icon-192.png', './icon-512.png',
  './css/app.css',
  './js/util.js', './js/store.js', './data/stories.js', './data/plans.js', './data/quiz.js', './js/profiles.js',
  './js/board.js', './js/chart.js', './js/timers.js', './js/alarms.js', './js/stories.js', './js/skills.js',
  './js/play.js', './js/app.js'];
const CDN = ['fonts.googleapis.com', 'fonts.gstatic.com', 'www.gstatic.com'];
// Voice recordings (audio/…mp3) are kept in their own cache, so app updates
// don't throw them away. To replace recordings, change this name.
const AUDIO_CACHE = 'kq-audio-v1';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== AUDIO_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Recordings: cache first. Audio players ask for byte ranges, which can't be
  // cached, so the whole file is fetched once and served from the cache after.
  if (url.origin === location.origin && url.pathname.includes('/audio/') && url.pathname.endsWith('.mp3')) {
    e.respondWith(
      caches.open(AUDIO_CACHE).then(c => c.match(url.href).then(hit => hit || fetch(url.href).then(res => {
        if (res.status === 200) c.put(url.href, res.clone());
        return res;
      })))
    );
    return;
  }

  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  if (CDN.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
