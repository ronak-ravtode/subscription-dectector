import { defineConfig, devices } from "@playwright/test";

const API_URL = process.env.API_URL || "http://localhost:8000";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: FRONTEND_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 10000,
  },
  projects: [
    {
      name: "msedge",
      use: {
        ...devices["Desktop Chrome"],
        channel: "msedge",
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: FRONTEND_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
