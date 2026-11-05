/*
 * KOCHIVO service worker — caches the app shell only.
 * Player data lives in IndexedDB (src/core/offline), never in this cache.
 * Bump VERSION on any change to this file's caching rules.
 */
const VERSION = 'v4';
const SHELL_CACHE = `kochivo-shell-${VERSION}`;
const STATIC_CACHE = `kochivo-static-${VERSION}`;
const OFFLINE_URL = '/offline';
const PRECACHE = [OFFLINE_URL, '/manifest.webmanifest', '/icons/icon-192.png', '/brand/logo-compact.png'];

async function cacheOffline() {
  const shell = await caches.open(SHELL_CACHE);
  await shell.addAll(PRECACHE);
  try {
    const response = await shell.match(OFFLINE_URL);
    if (!response?.ok || response.redirected) return;
    const html = await response.text();
    const assets = new Set();
    // Caching HTML alone does not fetch the scripts needed for client hydration.
    for (const match of html.matchAll(/(?:src|href)=["'](\/_next\/static\/[^"']+)["']/g)) assets.add(match[1]);
    const cache = await caches.open(STATIC_CACHE);
    for (const asset of assets) {
      const response = await fetch(asset);
      if (!response.ok || response.redirected) continue;
      if (asset.endsWith('.js')) {
        const script = await response.clone().text();
        // Turbopack's lazy imports must also be available on a cold offline navigation.
        for (const match of script.matchAll(/["'](?:\/_next\/)?(static\/(?:immutable\/)?chunks\/[a-zA-Z0-9_.~%-]+\.js)["']/g)) {
          assets.add(`/_next/${match[1]}`);
        }
      }
      await cache.put(asset, response);
    }
  } catch { /* Optional hydration assets must never block the shell install. */ }
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheOffline());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('kochivo-') && !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CLEAR_SHELL') return;
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('kochivo-shell-')).map(key => caches.delete(key)),
  )).then(() => cacheOffline()));
});

function publicPage(pathname) {
  const path = pathname.replace(/^\/(ar|en)(?=\/|$)/, '') || '/';
  return ['/', '/offline', '/login', '/privacy', '/terms'].includes(path);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase & other APIs are never cached here.

  // Private HTML is never stored or read, even if an old cache contains it.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(async (res) => {
          if (publicPage(url.pathname) && res.ok && !res.redirected) {
            const cache = await caches.open(SHELL_CACHE);
            await cache.put(request, res.clone());
          }
          return res;
        })
        .catch(async () => (publicPage(url.pathname) && await caches.match(request)) || caches.match(OFFLINE_URL)),
    );
    return;
  }

  // Hashed build assets, fonts, icons, exercise GIFs: cache first.
  if (url.pathname.startsWith('/_next/static/') || /^(?:\/icons\/|\/brand\/|\/exercises\/)/.test(url.pathname)
    && /\.(png|gif|webp|svg|woff2)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
            return res;
          }),
      ),
    );
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { return; }
  if (!payload || typeof payload.title !== 'string' || typeof payload.body !== 'string') return;
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
    tag: payload.tag, data: { url: payload.url },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  let url;
  try { url = new URL(event.notification.data?.url, self.location.origin); } catch { return; }
  if (url.origin !== self.location.origin) return;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windows) => {
    const existing = windows.find(client => client.url === url.href);
    if (existing) return existing.focus();
    return self.clients.openWindow(url.href);
  }));
});
