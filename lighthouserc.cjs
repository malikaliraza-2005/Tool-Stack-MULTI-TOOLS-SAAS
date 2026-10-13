// Lighthouse CI budgets from architecture §14. Warn-only until Phase 9
// (P9 switches "warn" to "error"). Reports stay local (no public upload).
const level = "warn";

module.exports = {
  ci: {
    collect: {
      startServerCommand: "node scripts/serve-out.mjs --port 4174",
      startServerReadyPattern: "Serving",
      url: ["http://127.0.0.1:4174/"],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        "categories:performance": [level, { minScore: 0.9 }],
        "categories:accessibility": [level, { minScore: 1 }],
        "categories:best-practices": [level, { minScore: 0.95 }],
        "categories:seo": [level, { minScore: 1 }],
        "largest-contentful-paint": [level, { maxNumericValue: 2500 }],
        "cumulative-layout-shift": [level, { maxNumericValue: 0.1 }],
        // Lab proxy for INP (≤ 200 ms in the field).
        "total-blocking-time": [level, { maxNumericValue: 200 }],
        // Homepage initial JS ≤ 100 KB gzipped (tool pages: 120 KB, added with P3).
        "resource-summary:script:size": [level, { maxNumericValue: 102400 }],
        // ≤ 2 font files.
        "resource-summary:font:count": [level, { maxNumericValue: 2 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci/reports",
    },
  },
};
