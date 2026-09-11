const CACHE_NAME = "platform-shell-v337";
const ASSETS = [
  "./contacts.html",
  "./contacts.css?v=1",
  "./contacts.js?v=2",
  "./assets/fonts/eb-garamond-latin-400.woff2?v=1",
  "./geocode.html",
  "./geocode.css?v=2",
  "./geocode-config.js?v=1",
  "./geocode.js?v=2",
  "./osint.html",
  "./osint.css?v=5",
  "./osint.js?v=3",
  "./osint-report.js?v=2",
  "./osint-entry.css?v=5",
  "./",
  "./index.html",
  "./styles.css?v=196",
  "./quotation-writing.css?v=2",
  "./quotation-mail-reader.js?v=1",
  "./quotation-report.js?v=1",
  "./quotation-mail-drop.js?v=2",
  "./quotation-writing.js?v=3",
  "./law-data.js?v=3",
  "./munich-re-clauses.js?v=1",
  "./sync-config.js?v=1",
  "./assets/vendor/jszip.min.js?v=1",
  "./assets/vendor/xlsx.full.min.js?v=1",
  "./assets/vendor/tesseract/tesseract.min.js?v=1",
  "./assets/vendor/pdf.min.mjs?v=1",
  "./assets/vendor/pdf.worker.min.mjs?v=1",
  "./assets/vendor/docx.iife.js?v=1",
  "./assets/vendor/pdfmake.min.js?v=1",
  "./assets/vendor/vfs_fonts.js?v=1",
  "./assets/britmark-logo.png?v=1",
  "./questionnaire-generator.js?v=12",
  "./questionnaire-research.js?v=3",
  "./client-recommendation.js?v=1",
  "./bank-accreditation-data.js?v=9",
  "./contract-tests-data.js?v=5",
  "./contract-file-reader.js?v=2",
  "./property-review.js?v=3",
  "./contract-review-config.js?v=6",
  "./contract-review-secure.js?v=1",
  "./contract-review-mac.js?v=3",
  "./contract-review-workflow.js?v=1",
  "./local-review/result.js?v=1",
  "./property-review-semantic.js?v=5",
  "./property-review-report.js?v=7",
  "./app.js?v=215",
  "./assets/contract-tests/arx-zusp-053.pdf",
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
  if (event.request.method !== "GET" || event.request.cache === "no-store") {
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
    const fallback = url.pathname.endsWith("/geocode.html") ? "./geocode.html" : "./index.html";
    event.respondWith(fetch(new Request(event.request, { cache: "reload" })).catch(() => caches.match(fallback)));
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
