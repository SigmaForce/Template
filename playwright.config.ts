import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/smoke",
  fullyParallel: false,
  workers: 1,
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
