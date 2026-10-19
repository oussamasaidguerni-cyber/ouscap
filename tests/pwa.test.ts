import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Verifies the production build contract without a browser: the PWA manifest,
 * app icons, service worker, and the security headers file must all be present.
 * Requires `npm run build` to have run first.
 */
const dist = resolve(import.meta.dirname, "../dist");
const hasBuild = existsSync(dist);

describe.skipIf(!hasBuild)("production build contract", () => {
  it("emits a manifest with OUSCAP branding and dark theme", () => {
    const manifest = JSON.parse(readFileSync(resolve(dist, "manifest.webmanifest"), "utf8"));
    expect(manifest.short_name).toBe("OUSCAP");
    expect(manifest.theme_color).toBe("#0B0B0B");
    expect(manifest.name).toMatch(/perspective/i);
  });

  it("ships the required app icons", () => {
    for (const icon of ["icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "favicon.svg"]) {
      expect(existsSync(resolve(dist, icon)), icon).toBe(true);
    }
  });

  it("generates a service worker that does not runtime-cache financial data", () => {
    const sw = readFileSync(resolve(dist, "sw.js"), "utf8");
    // No runtime route for arbitrary network responses was registered.
    expect(sw).not.toContain("ouscap-data");
  });

  it("ships security headers", () => {
    const headers = readFileSync(resolve(dist, "_headers"), "utf8");
    expect(headers).toContain("Content-Security-Policy");
    expect(headers).toContain("X-Frame-Options: DENY");
  });
});
