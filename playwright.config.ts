import { defineConfig, devices } from "@playwright/test";

const port = process.env.E2E_PORT ?? "3100";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "e2e",
  // Tests are independent (unique emails, no shared state), so they can run in parallel.
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /dashboard-pagination\.spec\.ts/,
    },
    {
      // Pagination asserts the global newest-first order, so it must not run while other tests
      // create users: it starts after the main project and runs its tests one by one.
      name: "chromium-pagination",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /dashboard-pagination\.spec\.ts/,
      dependencies: ["chromium"],
      fullyParallel: false,
    },
  ],
  webServer: {
    // Serves the standalone production build (`yarn test:e2e` builds first) against an in-memory MongoDB.
    command: "node e2e/server.mts",
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { E2E_PORT: port },
  },
});
