import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    actionTimeout: 45_000,
  },
  projects: [
    {
      name: "chromium",
      // `channel: "chrome"` uses the system-installed Chrome instead of
      // Playwright's bundled Chromium build. On a modern CI runner either
      // works; this repo was developed on macOS 12, which Playwright's
      // bundled Chromium binary has dropped support for, so this pins to
      // the system browser for portability. Drop `channel` on CI if the
      // bundled browser is preferred there.
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
});
