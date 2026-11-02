/// <reference lib="webworker" />
// Service worker (G-5, architecture §10), bundled by Serwist from
// app/serwist/[path]/route.ts. Pages, the app shell and fonts are precached;
// on-intent libraries and WASM are cached the first time a tool loads them.
// It only ever caches this site's own files: user files never pass through it.

import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const sameOrigin = (url: URL) => url.origin === self.location.origin;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: { cleanupOutdatedCaches: true },
  // A new version waits until the user chooses "Refresh" (P7-T16); the page
  // then posts SKIP_WAITING. The first install controls the page at once, so
  // the first visit already works offline.
  skipWaiting: false,
  clientsClaim: true,
  // Little benefit for static pages, and preload requests bypass the offline
  // routing used in E2E tests (architecture §10).
  navigationPreload: false,
  runtimeCaching: [
    {
      matcher: ({ request, url }) => request.mode === "navigate" && sameOrigin(url),
      handler: new NetworkFirst({ cacheName: "pages", networkTimeoutSeconds: 4 }),
    },
    {
      // Hashed file names never change: on-intent chunks, workers and WASM.
      matcher: ({ url }) => sameOrigin(url) && url.pathname.startsWith("/_next/static/"),
      handler: new CacheFirst({
        cacheName: "next-static",
        plugins: [new ExpirationPlugin({ maxEntries: 300, purgeOnQuotaError: true })],
      }),
    },
    {
      // Versioned folders (pdfjs-<version>, libheif-js-<version>).
      matcher: ({ url }) => sameOrigin(url) && url.pathname.startsWith("/vendor/"),
      handler: new CacheFirst({
        cacheName: "vendor",
        plugins: [new ExpirationPlugin({ maxEntries: 200, purgeOnQuotaError: true })],
      }),
    },
    {
      matcher: ({ request, url }) => request.method === "GET" && sameOrigin(url),
      handler: new StaleWhileRevalidate({ cacheName: "assets" }),
    },
  ],
});

serwist.addEventListeners();
