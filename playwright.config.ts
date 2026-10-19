import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  testMatch: "**/e2e.smoke.test.ts",
  use: {
    baseURL: process.env.OUSCAP_E2E_BASE ?? "http://localhost:4175",
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: "npx vite preview --port 4175 --strictPort",
    url: "http://localhost:4175",
    reuseExistingServer: false,
    timeout: 60_000,
  },
  reporter: [["list"]],
});
