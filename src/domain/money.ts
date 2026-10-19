/**
 * Money helpers. OUSCAP stores whole-dinar DZD amounts as integers and never
 * performs floating-point arithmetic on them. Every operation here is integer
 * or validated-conversion only.
 */

const DZD_GROUP = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** Parse user input into an integer DZD amount, or null when invalid. */
export function parseAmount(input: string | number): number | null {
  if (typeof input === "number") {
    return Number.isInteger(input) ? input : null;
  }
  const cleaned = input.trim().replace(/\s+/g, "").replace(/,/g, ".");
  if (cleaned === "") return null;
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  // Round half away from zero, deterministically, at the integer boundary.
  const rounded = Math.round(value);
  return Number.isSafeInteger(rounded) ? rounded : null;
}

/** Format an integer DZD amount for display, e.g. "1 250 000 DZD". */
export function formatDZD(amount: number, opts: { sign?: boolean } = {}): string {
  const sign = opts.sign && amount > 0 ? "+" : "";
  return `${sign}${DZD_GROUP.format(amount)} DZD`;
}

/** Compact display for dense chart axes: "1,2 M" / "45 k". */
export function formatCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)} M`;
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)} k`;
  return `${sign}${abs}`;
}

/** Percentage of `part` in `whole`, safe against divide-by-zero. */
export function percent(part: number, whole: number): number {
  if (whole === 0) return 0;
  return Math.round((part / whole) * 100);
}

export function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
