import { describe, expect, it } from "vitest";
import { parseAmount, formatDZD, percent, formatCompact } from "@/domain/money";

describe("money", () => {
  it("parses whole-dinar strings", () => {
    expect(parseAmount("1500")).toBe(1500);
    expect(parseAmount("1 500")).toBe(1500);
    expect(parseAmount("1500.4")).toBe(1500);
    expect(parseAmount("1500.6")).toBe(1501);
  });

  it("rejects invalid amounts", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("-50")).toBeNull();
    expect(parseAmount("1.2.3")).toBeNull();
  });

  it("never uses floating point for stored values", () => {
    // 0.1 + 0.2 style drift must not exist because amounts are integers.
    const a = parseAmount("100")!;
    const b = parseAmount("200")!;
    expect(a + b).toBe(300);
    expect(Number.isInteger(a + b)).toBe(true);
  });

  it("formats with DZD suffix and optional sign", () => {
    expect(formatDZD(1234567)).toContain("DZD");
    expect(formatDZD(500, { sign: true }).startsWith("+")).toBe(true);
  });

  it("computes percentages safely against zero", () => {
    expect(percent(50, 0)).toBe(0);
    expect(percent(50, 100)).toBe(50);
  });

  it("formats compact values", () => {
    expect(formatCompact(1_500_000)).toBe("1.5 M");
    expect(formatCompact(45_000)).toBe("45 k");
    expect(formatCompact(900)).toBe("900");
  });
});
