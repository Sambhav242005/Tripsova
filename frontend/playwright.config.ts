import { defineConfig, devices } from "@playwright/test";

/**
 * UI/UX tests for Tripsova's web app.
 *
 * These drive a real browser against the Next.js dev server. The backend is NOT
 * required — every `/api/**` call is mocked per-test (see e2e/helpers.ts), so the
 * suite is deterministic and runs offline. We cover both viewports because the app
 * has a hard 768px breakpoint (mobile drawer ↔ desktop sidebar).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Cap parallelism. Next 16's Turbopack already runs a worker pool; letting Playwright
  // fan out widely on top of it can spawn far more node processes than expected.
  workers: process.env.CI ? 2 : 2,
  // Don't let a wedged spec hold a browser + dev server open indefinitely.
  timeout: 30_000,
  globalTimeout: 10 * 60_000,
  reporter: process.env.CI ? "github" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile",
      // Below the 768px md breakpoint → hamburger + side drawer layout.
      use: { ...devices["Pixel 7"], viewport: { width: 412, height: 900 } },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/app",
    reuseExistingServer: true,
    // Fail fast: if the server isn't serving /app (200) within 60s something is wrong
    // (e.g. wrong workspace root) — bail instead of churning workers for two minutes.
    timeout: 60_000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
    // Point the API client at the app's own origin so every fetch is same-origin and
    // Playwright can intercept it with no CORS/preflight dance (see e2e/helpers.ts).
    env: { NEXT_PUBLIC_API_URL: "http://localhost:3000" },
  },
});
