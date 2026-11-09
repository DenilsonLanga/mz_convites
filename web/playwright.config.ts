import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:3001",
    channel: "chrome",
    headless: true,
    trace: "retain-on-failure",
  },
  outputDir: "outputs/test-results",
  reporter: "list",
});
