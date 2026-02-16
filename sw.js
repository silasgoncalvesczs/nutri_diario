const CACHE_NAME = "nutridiario-cache-v2"; // Atualizei a versão

// Atualizado com a sua estrutura real de pastas
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  // Precisamos adicionar as rotas dos componentes:
  "./components/calculator.html",
  "./components/dashboard.html",
  "./components/goals.html",
  "./components/history.html",
  "./components/login.html",
  // E as rotas dos scripts:
  "./js/api.js",
  "./js/auth.js",
  "./js/config.js",
  "./js/database.js",
  "./js/main.js",
  "./js/ui.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
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