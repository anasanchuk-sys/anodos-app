(function configureContractReview(globalScope) {
  "use strict";

  const supplied = globalScope.ANODOS_CONTRACT_REVIEW_CONFIG || {};
  globalScope.ANODOS_CONTRACT_REVIEW_CONFIG = Object.freeze({
    endpoint: "https://anodos-contract-review.mesquite-wishbone.workers.dev",
    timeoutMs: 360000,
    ...supplied
  });
})(typeof window !== "undefined" ? window : globalThis);
