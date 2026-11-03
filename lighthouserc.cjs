// Lighthouse CI budgets (architecture §14, performance.md §1), enforced since
// P9-T08. The owner set them on 2026-11-02 (R-14): Next.js and React alone are
// about 132 KB gzipped, so the script and speed budgets are the measured
// Phase 9 baseline plus a margin for run-to-run noise. Lighthouse's simulated
// LCP on a slow phone is JavaScript evaluation time: the observed LCP is about
// 0.3 s. Reports stay local (no public upload).
const level = "error";

/** Budgets every page shares; the speed ones differ by page type below. */
const quality = {
  "categories:accessibility": [level, { minScore: 1 }],
  "categories:best-practices": [level, { minScore: 0.95 }],
  "categories:seo": [level, { minScore: 1 }],
  "cumulative-layout-shift": [level, { maxNumericValue: 0.1 }],
  // ≤ 2 font files.
  "resource-summary:font:count": [level, { maxNumericValue: 2 }],
};

/** Performance, LCP, TBT (the lab proxy for INP) and initial JS (gzipped transfer size). */
const speed = ({ score, lcp, tbt, scriptKb }) => ({
  "categories:performance": [level, { minScore: score }],
  "largest-contentful-paint": [level, { maxNumericValue: lcp }],
  "total-blocking-time": [level, { maxNumericValue: tbt }],
  "resource-summary:script:size": [level, { maxNumericValue: scriptKb * 1024 }],
});

module.exports = {
  ci: {
    collect: {
      startServerCommand: "node scripts/serve-out.mjs --port 4174",
      startServerReadyPattern: "Serving",
      url: [
        "http://127.0.0.1:4174/",
        "http://127.0.0.1:4174/pdf-tools",
        "http://127.0.0.1:4174/image-tools",
        "http://127.0.0.1:4174/developer-tools",
        "http://127.0.0.1:4174/merge-pdf",
        "http://127.0.0.1:4174/json-formatter",
        "http://127.0.0.1:4174/unix-timestamp-converter",
        "http://127.0.0.1:4174/base64-encode-decode",
        "http://127.0.0.1:4174/url-encode-decode",
        "http://127.0.0.1:4174/uuid-generator",
        "http://127.0.0.1:4174/hash-generator",
        "http://127.0.0.1:4174/jwt-decoder",
        "http://127.0.0.1:4174/diff-checker",
        "http://127.0.0.1:4174/regex-tester",
        "http://127.0.0.1:4174/split-pdf",
        "http://127.0.0.1:4174/organize-pdf",
        "http://127.0.0.1:4174/jpg-to-pdf",
        "http://127.0.0.1:4174/pdf-to-jpg",
        "http://127.0.0.1:4174/sign-pdf",
        "http://127.0.0.1:4174/remove-exif-data",
        "http://127.0.0.1:4174/resize-image",
        "http://127.0.0.1:4174/compress-image",
        "http://127.0.0.1:4174/convert-image",
        // One of each remaining page type: site page, guide index, guide.
        "http://127.0.0.1:4174/about",
        "http://127.0.0.1:4174/guides",
        "http://127.0.0.1:4174/guides/heic-vs-jpg",
      ],
      numberOfRuns: 3,
    },
    assert: {
      assertMatrix: [
        {
          // Homepage. Measured 2026-11-02: Performance 84, LCP 3.56 s, TBT ≤ 287 ms, 255 KB.
          matchingUrlPattern: "^http://[^/]+/$",
          assertions: { ...quality, ...speed({ score: 0.8, lcp: 4000, tbt: 400, scriptKb: 300 }) },
        },
        {
          // Every other page: hubs, tools, site pages, guides. Measured 2026-11-02:
          // Performance 79–93, LCP ≤ 3.94 s, TBT ≤ 419 ms, ≤ 320 KB (includes the
          // tool UI chunk; on-intent libraries never load because Lighthouse
          // doesn't use the tool).
          matchingUrlPattern: "^http://[^/]+/.+$",
          assertions: { ...quality, ...speed({ score: 0.75, lcp: 4500, tbt: 500, scriptKb: 340 }) },
        },
      ],
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci/reports",
    },
  },
};
