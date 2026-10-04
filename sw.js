// 曲別ストップウォッチ Service Worker (Nama計算機と同じ方針: HTMLはNetwork-First+必ずサーバー確認)
const CACHE_NAME = 'namastopwatch-v1';
const CRITICAL = ['./', './index.html'];
const OPTIONAL = ['./manifest.json', './icon192.png', './icon512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(async cache => {
    for (const url of CRITICAL) {
      const res = await fetch(new Request(url, { cache: 'reload' }));
      if (!res.ok) throw new Error('SW: precache failed ' + url);
      await cache.put(url, res);
    }
    await Promise.allSettled(OPTIONAL.map(async url => {
      const res = await fetch(new Request(url, { cache: 'reload' }));
      if (res.ok) await cache.put(url, res);
    }));
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin || url.searchParams.has('__check')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request.url, { cache: 'no-cache', credentials: 'same-origin' })
        .then(res => { const c = res.clone(); caches.open(CACHE_NAME).then(cache => cache.put('./index.html', c)); return res; })
        .catch(async () => (await (await caches.open(CACHE_NAME)).match('./index.html')) || Response.error())
    );
    return;
  }
  event.respondWith(caches.open(CACHE_NAME).then(cache => cache.match(event.request).then(cached => {
    const net = fetch(event.request).then(res => { if (res && res.ok && res.type === 'basic') cache.put(event.request, res.clone()); return res; }).catch(() => null);
    return cached || net;
  })));
});
