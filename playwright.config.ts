import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  expect: {
    timeout: 5_000
  },
  fullyParallel: true,
  reporter: [["list"]],
  retries: process.env.CI ? 2 : 0,
  testDir: ".",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:4174",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure"
  },
  webServer: {
    command: "pnpm --filter @onegrid/examples dev --host 127.0.0.1 --port 4174",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: "http://127.0.0.1:4174"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "chrome",
      use: { ...devices["Desktop Chrome"], channel: "chrome" }
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] }
    },
    {
      name: "edge",
      use: { ...devices["Desktop Chrome"], channel: "msedge" }
    }
  ]
});
