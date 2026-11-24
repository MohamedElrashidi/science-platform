// Service worker بسيط: يجعل التطبيق قابلاً للتثبيت ويعرض صفحة بديلة دون اتصال.
// لا يخزّن مؤقتاً أي استجابة API أو صفحة تحوي بيانات طالب (حماية الخصوصية).
const CACHE = "shell-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE)));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)));
  }
});
