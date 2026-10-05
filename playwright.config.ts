import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const CI = !!process.env.CI;

// Optional: point Playwright at a Chromium you already have (e.g. in a locked-down sandbox).
const executablePath = process.env.PW_CHROMIUM_PATH;
const extraArgs: string[] = process.env.PW_CHROMIUM_ARGS ? JSON.parse(process.env.PW_CHROMIUM_ARGS) : [];

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "en-US",
    timezoneId: "America/Chicago", 
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: process.env.PW_NO_VIDEO ? "off" : "retain-on-failure",
    launchOptions: executablePath ? { executablePath, args: extraArgs } : {},
  },

  projects: [
    {
      
      name: "mocked",
      testIgnore: /live\//,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Opt-in: the same app against the real Docker API on :8000.
      name: "live",
      testMatch: /live\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    // Separate build folder, so running the suite never corrupts a running `npm run dev`.
    env: { NEXT_DIST_DIR: ".next-e2e" },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !CI,
    timeout: 240_000,
    stdout: "ignore",
  },
});
