const CACHE_NAME = "ders-pwa-v1-5-0-r1";
const APP_SHELL = [
 './motion-ledger.js','./motion.js','./motion.css','./motion-widgets.css','./motion-ui.js','./motion-ui.css',
  './class-model.js','./class-dom.js','./teacher-workspace.js','./program-tools.js','./teacher-insights.js','./program-schedules.js','./teacher-actions.js','./teacher-workspace.css','./classes.js','./classes.css',
  './admin-preview-classes.js','./admin-preview-workspace.js',
  './experience.js','./v121.css',
  './exams-core.js','./exams.js','./exams.css',
  './password-policy.js','./week-dates.js','./focus-core.js','./study.js','./learning-ui.js','./v113.css','./v114.css',
  './assets/theme-vine.svg','./assets/theme-cloud-light.svg','./assets/theme-cloud-dark.svg',
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./config.js",
  "./sync.js",
  "./program-composer.js","./teacher.js",
  "./teacher-drafts.js",
  "./program-import.js",
  "./backgrounds.js",
  "./release-history.js",
  "./v111.css",
  "./admin.js",
  "./admin.css",
  "./admin-preview.js",
  "./history-groups.js",
  "./quest-system.js",
  "./curriculum.js",
  "./personal-catalog.js",
  "./select-controls.js",
  "./quest-ui.css",
  "./ui.js",
  "./theme.js",
  "./ui.css",
  "./appearance.js",
  "./appearance.css",
  "./assets/background-light.webp",
  "./assets/background-dark.webp",
  "./assets/brand-mark.svg",
  "./vendor/supabase.js",
  "./vendor/lucide.js",
  "./icons/ders-v2.svg",
  "./icons/ders-v3.svg",
  "./icons/ders-16-v3.png",
  "./icons/ders-32-v3.png",
  "./icons/ders-192-v3.png",
  "./icons/ders-512-v3.png",
  "./icons/ders-maskable-v3.png",
  "./icons/ders-apple-v3.png",
  "./icons/ders-192-v2.png",
  "./icons/ders-512-v2.png",
  "./icons/ders-maskable-v2.png",
  "./icons/ders-apple-v2.png"
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
      .then((keys) => Promise.all(keys.filter((key) => /^(?:ders-pwa-|yks-quest-board-)/.test(key) && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // Never turn a failed isolated-demo navigation into the real authenticated app.
  const demo=new URL('./admin-preview.html',self.registration.scope);const requested=new URL(event.request.url);if(requested.origin===demo.origin&&[demo.pathname,demo.pathname.replace(/\.html$/,'')].includes(requested.pathname))return;
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

self.addEventListener('message',event=>{if(event.data?.type==='ders-demo-navigation-policy'&&event.ports[0])event.ports[0].postMessage({type:'ders-demo-navigation-policy',excluded:true});});
