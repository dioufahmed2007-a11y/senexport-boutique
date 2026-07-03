/* ═══════════════════════════════════════════════════════════
   SENEXPORT — SERVICE WORKER v1
   - Cache les assets statiques pour mode offline
   - Network-first pour les données Supabase
   - Cache-first pour les fonts et images
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'senexport-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/catalogue.html',
  '/panier.html',
  '/checkout.html',
  '/produit.html',
  '/compte.html',
  '/connexion.html',
  '/favoris.html',
  '/demande-speciale.html',
  '/a-propos.html',
  '/404.html',
  '/styles.css',
  '/app.js',
  '/animations.js',
  '/logo.png',
  '/manifest.json',
];

/* ─── INSTALL : Cache les assets statiques ─── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS.map(url => {
        return new Request(url, { cache: 'reload' });
      })).catch(err => {
        console.warn('[SW] Cache partiel (certains assets manquants) :', err);
      });
    }).then(() => self.skipWaiting())
  );
});

/* ─── ACTIVATE : Nettoyer les anciens caches ─── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

/* ─── FETCH : Stratégie selon la ressource ─── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  /* Supabase → Network-first (toujours fresh) */
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request).catch(() => new Response(
        JSON.stringify({ data: [], error: { message: 'Hors ligne' } }),
        { headers: { 'Content-Type': 'application/json' } }
      ))
    );
    return;
  }

  /* Google Fonts → Cache-first */
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(request).then(cached => {
        return cached || fetch(request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return res;
        });
      })
    );
    return;
  }

  /* CDN (confetti, supabase-js) → Cache-first avec fallback network */
  if (url.hostname.includes('cdn.jsdelivr.net')) {
    event.respondWith(
      caches.match(request).then(cached => {
        return cached || fetch(request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return res;
        });
      })
    );
    return;
  }

  /* Pages HTML et assets locaux → Stale-while-revalidate */
  if (request.destination === 'document' ||
      request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'image') {
    event.respondWith(
      caches.match(request).then(cached => {
        const networkFetch = fetch(request).then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return res;
        }).catch(() => null);

        return cached || networkFetch;
      })
    );
    return;
  }

  /* Autres → Network avec fallback cache */
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

/* ─── MESSAGE : Force refresh du cache ─── */
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      event.ports[0].postMessage({ done: true });
    });
  }
});
