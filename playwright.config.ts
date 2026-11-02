import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

// E2E runs against the built static export (`out/`), served with the same
// headers as Cloudflare Pages by scripts/serve-out.mjs. Run `npm run build` first.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    // The service worker is tested in e2e/pwa.spec.ts, which allows it. Elsewhere
    // it would add precache traffic and cached pages to tests about other things.
    serviceWorkers: "block",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    // iPhone viewport, touch and user agent on WebKit (closest to iOS Safari).
    { name: "iphone", use: { ...devices["iPhone 14"] } },
  ],
  webServer: {
    command: `node scripts/serve-out.mjs --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
