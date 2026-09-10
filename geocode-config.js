// Public, keyless Photon endpoint. Keep provider settings separate from the UI.
// Usage: https://github.com/komoot/photon#demo-server
globalThis.ANODOS_GEOCODE_CONFIG = Object.freeze({
  endpoint: "https://photon.komoot.io/api/",
  timeoutMs: 15000,
  minimumIntervalMs: 1500,
  maxRequestsPerMinute: 10,
  limit: 5
});
