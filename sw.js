const CACHE_NAME = "platform-shell-v222";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=144",
  "./law-data.js?v=3",
  "./munich-re-clauses.js?v=1",
  "./sync-config.js?v=1",
  "./assets/vendor/jszip.min.js?v=1",
  "./assets/vendor/pdf.min.mjs?v=1",
  "./assets/vendor/pdf.worker.min.mjs?v=1",
  "./assets/vendor/docx.iife.js?v=1",
  "./assets/britmark-logo.png?v=1",
  "./questionnaire-generator.js?v=2",
  "./app.js?v=162",
  "./manifest.webmanifest?v=7",
  "./assets/icon.svg?v=7",
  "./assets/icon-192.png?v=7",
  "./assets/icon-512.png?v=7",
  "./assets/apple-touch-icon.png?v=7",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

async function rangeResponse(request) {
  const range = request.headers.get("range");
  const cache = await caches.open(CACHE_NAME);
  let response = await cache.match(request);

  if (!response) {
    return fetch(request);
  }

  if (!range || !response) {
    return response;
  }

  const buffer = await response.arrayBuffer();
  const size = buffer.byteLength;
  const match = range.match(/bytes=(\d+)-(\d*)/);
  const start = match ? Number(match[1]) : 0;
  const end = match && match[2] ? Number(match[2]) : size - 1;
  const chunk = buffer.slice(start, end + 1);

  return new Response(chunk, {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Length": String(chunk.byteLength),
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Type": response.headers.get("Content-Type") || "video/mp4"
    }
  });
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  const isFreshAsset =
    event.request.destination === "script" ||
    event.request.destination === "style" ||
    url.pathname.endsWith("/sw.js");

  if (event.request.headers.has("range")) {
    event.respondWith(rangeResponse(event.request));
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(new Request(event.request, { cache: "reload" })).catch(() => caches.match("./index.html")));
    return;
  }

  if (isFreshAsset) {
    event.respondWith(
      fetch(new Request(event.request, { cache: "reload" })).then((response) => {
        if (response?.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request).then((response) => {
        if (response?.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
