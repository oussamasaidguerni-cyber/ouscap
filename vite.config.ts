import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import type { ViteUserConfig } from "vitest/config";

export default defineConfig(() => {
  const test = {
    environment: "jsdom",
    globals: true,
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["tests/e2e.smoke.test.ts", "**/node_modules/**"],
  } as Partial<ViteUserConfig["test"]>;

  return {
    base: "./",
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
      },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.svg", "apple-touch-icon.png", "logo.svg", "logo-light.svg"],
        manifest: {
          id: "ouscap-app",
          name: "OUSCAP — Your money. In perspective.",
          short_name: "OUSCAP",
          description:
            "A private, local-first personal financial command center. Track spending, income, assets, liabilities, budgets and goals. Your data never leaves your device.",
          theme_color: "#0B0B0B",
          background_color: "#0B0B0B",
          display: "standalone",
          orientation: "any",
          start_url: "./",
          scope: "./",
          icons: [
            { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
          navigateFallback: "index.html",
          // Never precache or runtime-cache financial records. Only the
          // application shell is cached; all financial data lives in IndexedDB
          // and is never touched by the service worker.
          runtimeCaching: [],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
        },
        devOptions: { enabled: false },
      }),
    ],
    test,
    server: { port: 5174, host: true },
  };
});
