const CACHE_NAME = "platform-shell-v188";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=125",
  "./law-data.js?v=3",
  "./munich-re-clauses.js?v=1",
  "./sync-config.js?v=1",
  "./assets/vendor/jszip.min.js?v=1",
  "./assets/vendor/pdf.min.mjs?v=1",
  "./assets/vendor/pdf.worker.min.mjs?v=1",
  "./app.js?v=142",
  "./manifest.webmanifest?v=6",
  "./assets/icon.svg?v=6",
  "./assets/britmark-logo.png"
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
