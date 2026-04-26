import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for CampusVote.
 *
 * Base URL  : http://localhost:5173  (Vite dev server)
 * Emulators : Auth 9099 | Firestore 8080 | Functions 5001
 *             Start them separately with `firebase emulators:start`
 *             before running the test suite.
 *
 * Run tests : npx playwright test
 * With UI   : npx playwright test --ui
 */
export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./tests/results",

  /* Timeout per test (ms) */
  timeout: 30_000,

  /* Retry failed tests once in CI */
  retries: process.env.CI ? 1 : 0,

  /* Parallelism — keep sequential so Firebase emulator state is predictable */
  workers: 1,

  reporter: [
    ["list"],
    ["html", { outputFolder: "tests/report", open: "never" }],
  ],

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Vite dev server is started manually — do NOT use webServer here so tests
     can also run against the emulator-connected build independently. */
});
