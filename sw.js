/* ============================================================
   NutriDiário - Service Worker
   Cache atualizado para a nova arquitetura modular
   ============================================================ */

// Mudamos para v2 para forçar o navegador a atualizar o cache antigo
const CACHE_NAME = "nutridiario-cache-v2";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",

  // Nossos novos módulos JavaScript
  "./js/api.js",
  "./js/auth.js",
  "./js/config.js",
  "./js/database.js",
  "./js/main.js",
  "./js/ui.js",

  // Nossas novas telas fatiadas
  "./components/calculator.html",
  "./components/history.html",
  "./components/home.html",
  "./components/login.html",
  "./components/settings.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Fazendo cache dos arquivos v2...");
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log("[Service Worker] Removendo cache antigo:", key);
          return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cacheRes) => {
      return cacheRes || fetch(event.request);
    })
  );
});