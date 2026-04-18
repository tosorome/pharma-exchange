self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('sarifli-v1').then((cache) => cache.addAll(['./', './index.html', './data.json']))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    // 1. حاول أولاً جلب البيانات من الإنترنت
    fetch(e.request).catch(() => {
      // 2. إذا فشل الإنترنت (أوفلاين)، اذهب للذاكرة المخزنة
      return caches.match(e.request);
    })
  );
});
