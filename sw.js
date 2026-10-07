/* Le jeu fonctionne hors connexion : la page et les illustrations sont gardées en cache.
   Changer VERSION à chaque mise à jour du jeu pour que les téléphones prennent la nouvelle version. */
const VERSION = 'le-vivant-13';
const CORE = ['./', 'index.html', 'config.js', 'cloud.js', 'jeu.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())) });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; /* Supabase et les polices passent sans cache */
  if (u.pathname.includes('/art/')) {
    /* illustrations : cache d'abord */
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const cp = res.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); return res })));
    return;
  }
  /* page et scripts : réseau d'abord, cache si hors connexion */
  e.respondWith(fetch(e.request).then(res => { const cp = res.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); return res }).catch(() => caches.match(e.request)));
});
