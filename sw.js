const CACHE_NAME = "random-hero-20260913-v1-osint-assets-20260913-v2-insurance-uk-defaults-20260913-questionnaire-object-name-20260913-v1-home-scroll-20260913-logo-text-only-20260913-en-v1-platform-shell-anodos-pro-gate-20260912-quality-v6-consultation-v1-analysis-consent-v1-review-layout-v1-review-intro-v1";
const ASSETS = [
  "./site-language.js?v=2",
  "./site-english.js?v=3",
  "./site-language.css?v=1",
  "./pro-access.css?v=1",
  "./site-navigation.js?v=4",
  "./hero-background.js?v=3",
  "./assets/backgrounds/anodos-city-poster.jpg?v=1",
  "./site-theme.css?v=3",
  "./contract-quality.html",
  "./contract-quality.css?v=4",
  "./contract-quality.mjs?v=7",
  "./contract-quality-consultation.mjs?v=1",
  "./contract-quality-reader.mjs?v=3",
  "./contract-quality-report.mjs?v=6",
  "./contacts.html",
  "./contacts.css?v=1",
  "./contacts.js?v=2",
  "./assets/fonts/eb-garamond-latin-400.woff2?v=1",
  "./geocode.html",
  "./geocode.css?v=2",
  "./geocode-config.js?v=1",
  "./geocode.js?v=2",
  "./osint.html",
  "./osint.css?v=6",
  "./osint.js?v=4",
  "./osint-report.js?v=4",
  "./osint-entry.css?v=5",
  "./",
  "./index.html",
  "./styles.css?v=198",
  "./quotation-writing.css?v=2",
  "./quotation-mail-reader.js?v=1",
  "./quotation-report.js?v=1",
  "./quotation-mail-drop.js?v=2",
  "./quotation-writing.js?v=4",
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
  "./questionnaire-generator.js?v=14",
  "./questionnaire-research.js?v=5",
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
  "./glossary-data.js?v=1",
  "./app.js?v=229",
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
