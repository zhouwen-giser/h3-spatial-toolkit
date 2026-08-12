import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { platformCommand } from "./scripts/platform-command.mjs";

const acceptanceRoot = "output/acceptance/browser";
process.env.CHROME_LOG_FILE = path.resolve(acceptanceRoot, "chromium-debug.log");

export default defineConfig({
  testDir: "browser-tests",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  outputDir: `${acceptanceRoot}/test-results`,
  reporter: [
    ["list"],
    ["html", { outputFolder: `${acceptanceRoot}/html-report`, open: "never" }],
    ["json", { outputFile: `${acceptanceRoot}/results.json` }]
  ],
  use: {
    baseURL: "http://127.0.0.1:4173",
    colorScheme: "dark",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } }
  ],
  webServer: {
    command: `${platformCommand("pnpm")} --filter @h3-toolkit/web-demo build && ${platformCommand("pnpm")} --filter @h3-toolkit/web-demo preview --host 127.0.0.1 --port 4173 --strictPort`,
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 120_000
  }
});
