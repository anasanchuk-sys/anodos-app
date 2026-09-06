(function configureContractReview(globalScope) {
  "use strict";

  const supplied = globalScope.ANODOS_CONTRACT_REVIEW_CONFIG || {};
  globalScope.ANODOS_CONTRACT_REVIEW_CONFIG = Object.freeze({
    endpoint: "https://anodos-contract-review.mesquite-wishbone.workers.dev",
    timeoutMs: 360000,
    // Public TEST activation explicitly requested after disclosure of quality/size limits.
    // Free-only server profile and source-grounding safeguards remain mandatory.
    provider: "groq-free",
    privacyVersion: "anodos-groq-zdr-v1",
    ...supplied
  });
})(typeof window !== "undefined" ? window : globalThis);
