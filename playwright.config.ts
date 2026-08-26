import { defineConfig, devices } from "@playwright/test";

/**
 * ZAAHI smoke harness.
 *
 * Runs against a PRODUCTION build (`next build && next start`) because check
 * (f) is specifically "console clean in production mode" — a dev server emits
 * React dev warnings and HMR chatter that would make that check meaningless.
 *
 * Serial + single worker: the checks assert on per-load network request counts
 * (check d), so parallel pages sharing a server would make those counts
 * ambiguous.
 *
 * No global setup / teardown touches any database. Every /api call is
 * intercepted in the browser — see tests/e2e/harness.ts.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.ZAAHI_E2E_BASE_URL ?? "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // MapLibre needs WebGL; headless Chromium falls back to SwiftShader.
        launchOptions: {
          args: [
            "--enable-unsafe-swiftshader",
            "--use-gl=angle",
            "--use-angle=swiftshader",
          ],
        },
      },
    },
  ],
  webServer: process.env.ZAAHI_E2E_BASE_URL
    ? undefined
    : {
        command: "npx next start -p 3100",
        url: "http://127.0.0.1:3100/",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
