import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./src/test",
  webServer: {
    command: "npm run dev -- --port 3000",
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
