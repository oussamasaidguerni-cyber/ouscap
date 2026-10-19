import type { SVGProps } from "react";

export type MonogramProps = SVGProps<SVGSVGElement> & {
  /** Rendered size in px (square). Defaults to 32. */
  size?: number;
  /**
   * Visual treatment:
   * - "solid": mark drawn in `currentColor` (default; inherits text color)
   * - "outline": ring stroked, line filled — tuned for busy backgrounds
   */
  variant?: "solid" | "outline";
  title?: string;
};

/**
 * OUSCAP monogram — the defining brand mark.
 *
 * Geometry (100×100 viewBox):
 *  - An outer ring (the "O" of OUSCAP) drawn as a near-complete circle whose
 *    stroke is broken on the right-hand side into a "C" aperture.
 *  - The ring's gap is bridged by a single upward-moving diagonal that rises
 *    from lower-left to upper-right — the "capital growth" line. The line's
 *    terminus sits exactly where the ring's top arc rejoins the aperture, so
 *    the O, the C and the rising line read as one continuous letterform.
 *  - A small terminal square caps the line, keeping the mark crisp at 16px.
 *
 * The same path data is exported below and reused verbatim by every SVG asset
 * in `src/brand/assets.ts`, so the mark never drifts between surfaces.
 */
export function Monogram({ size = 32, variant = "solid", title, ...props }: MonogramProps) {
  const stroke = variant === "outline" ? 7 : 8;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}

      {/* The ring: an O whose right side opens into a C aperture. */}
      <path
        d={RING_PATH}
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
      />

      {/* The integrated upward line, rising through the C aperture. */}
      <path
        d={LINE_PATH}
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
      />

      {/* Terminal tick — a compact cap that reads at favicon size. */}
      <path d={TERMINAL_PATH} fill="currentColor" />
    </svg>
  );
}

/**
 * Ring path. Starts at the aperture's lower lip (~-32°), sweeps clockwise the
 * long way around (through bottom, left, top) and stops at the aperture's upper
 * lip (~+24°). This leaves a controlled opening on the right for the line.
 */
export const RING_PATH =
  "M 82.6 66.2 " +
  "A 40 40 0 1 1 86.9 42.9";

/**
 * The upward line: begins inside the aperture's lower lip and rises to meet the
 * upper lip, continuing the ring's own direction of travel. Slope ≈ 1.35.
 */
export const LINE_PATH =
  "M 62.4 70.1 L 82.6 43.6 L 91.5 32.4";

/** Small square that caps the rising line at its apex. */
export const TERMINAL_PATH =
  "M 89.3 28.6 h 5.6 v 5.6 h -5.6 Z";

/** Path data shared with standalone SVG files. */
export const MARK_PATHS = {
  ring: RING_PATH,
  line: LINE_PATH,
  terminal: TERMINAL_PATH,
};
