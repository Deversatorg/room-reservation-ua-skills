import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";
const testOrigin = new URL(baseURL);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : "line",
  outputDir: "test-results",
  use: {
    baseURL,
    locale: "en-US",
    timezoneId: "Europe/Warsaw",
    storageState: {
      cookies: [
        {
          name: "roomly_locale",
          value: "en",
          domain: testOrigin.hostname,
          path: "/",
          expires: -1,
          httpOnly: true,
          secure: testOrigin.protocol === "https:",
          sameSite: "Lax",
        },
      ],
      origins: [],
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  expect: { timeout: 10_000 },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
