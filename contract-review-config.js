(function configureContractReview(globalScope) {
  "use strict";

  const supplied = globalScope.ANODOS_CONTRACT_REVIEW_CONFIG || {};
  globalScope.ANODOS_CONTRACT_REVIEW_CONFIG = Object.freeze({
    endpoint: "/api/contract-review",
    timeoutMs: 180000,
    ...supplied
  });
})(typeof window !== "undefined" ? window : globalThis);
