const CACHE_NAME = "ders-pwa-v4";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./config.js",
  "./sync.js",
  "./teacher.js",
  "./ui.js",
  "./theme.js",
  "./ui.css",
  "./vendor/supabase.js",
  "./vendor/lucide.js",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.includes("/api/") || url.pathname.includes("/auth/") || url.pathname.includes("/rest/")) return;
  const shellUrls = APP_SHELL.map(path => new URL(path, self.registration.scope).href);
  if (event.request.mode !== "navigate" && !shellUrls.includes(url.href)) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && (shellUrls.includes(url.href) || event.request.mode === "navigate")) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || (event.request.mode === "navigate" ? caches.match("./index.html") : Response.error())))
  );
});
