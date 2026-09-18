import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/smoke",
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: "list",
  projects: [
    {
      name: "clerk-setup",
      testMatch: /clerk\.setup\.ts/,
    },
    {
      name: "chromium",
      dependencies: ["clerk-setup"],
      testIgnore: /clerk\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
});
