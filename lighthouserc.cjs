// Lighthouse CI budgets from architecture §14. Warn-only until Phase 9
// (P9 switches "warn" to "error"). Reports stay local (no public upload).
const level = "warn";

const shared = {
  "categories:performance": [level, { minScore: 0.9 }],
  "categories:accessibility": [level, { minScore: 1 }],
  "categories:best-practices": [level, { minScore: 0.95 }],
  "categories:seo": [level, { minScore: 1 }],
  "largest-contentful-paint": [level, { maxNumericValue: 2500 }],
  "cumulative-layout-shift": [level, { maxNumericValue: 0.1 }],
  // Lab proxy for INP (≤ 200 ms in the field).
  "total-blocking-time": [level, { maxNumericValue: 200 }],
  // ≤ 2 font files.
  "resource-summary:font:count": [level, { maxNumericValue: 2 }],
};

module.exports = {
  ci: {
    collect: {
      startServerCommand: "node scripts/serve-out.mjs --port 4174",
      startServerReadyPattern: "Serving",
      url: [
        "http://127.0.0.1:4174/",
        "http://127.0.0.1:4174/merge-pdf",
        "http://127.0.0.1:4174/json-formatter",
        "http://127.0.0.1:4174/unix-timestamp-converter",
        "http://127.0.0.1:4174/base64-encode-decode",
        "http://127.0.0.1:4174/url-encode-decode",
      ],
      numberOfRuns: 3,
    },
    assert: {
      assertMatrix: [
        {
          // Homepage initial JS ≤ 100 KB gzipped (transfer size).
          matchingUrlPattern: "^http://[^/]+/$",
          assertions: {
            ...shared,
            "resource-summary:script:size": [level, { maxNumericValue: 102400 }],
          },
        },
        {
          // Tool pages: initial JS ≤ 120 KB gzipped, excluding on-intent libraries,
          // which Lighthouse never loads because it doesn't use the tool (Phase 3).
          matchingUrlPattern: "^http://[^/]+/[a-z0-9-]+$",
          assertions: {
            ...shared,
            "resource-summary:script:size": [level, { maxNumericValue: 122880 }],
          },
        },
      ],
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci/reports",
    },
  },
};
