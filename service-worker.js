const CACHE_NAME = 'vet-app-cache-v2'; // غيّرنا الاسم عشان أي نسخة كاش قديمة تتمسح تلقائي مرة واحدة عند أول تحديث
const APP_SHELL = [
  './',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// عند التثبيت: نخزن نسخة أولية ونفعّل السيرفس ووركر فورًا من غير انتظار
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL).catch(()=>{}))
  );
});

// عند التفعيل: نمسح أي كاش قديم ونتحكم في كل الصفحات المفتوحة فورًا
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// استراتيجية "الشبكة أولاً" مع تجاهل أي كاش HTTP وسيط (المتصفح أو الاستضافة) —
// cache:'no-store' هو الإصلاح الأساسي: بيجبر المتصفح يروح فعليًا للسيرفر بدل ما يرجّع نسخة مخزنة عنده بالغلط.
// أي فتح للتطبيق وهو أونلاين هيجيب آخر نسخة رفعتها على طول تلقائيًا، من غير أي تدخل من العميل.
// ولو أوفلاين، بيرجع لآخر نسخة محفوظة في الكاش عشان يفضل شغال من غير نت.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    fetch(req, { cache: 'no-store' }).then(networkRes => {
      const resClone = networkRes.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
      return networkRes;
    }).catch(() => {
      return caches.match(req).then(cached => cached || caches.match('./'));
    })
  );
});
