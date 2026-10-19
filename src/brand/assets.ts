import { MARK_PATHS } from "./Monogram";

const BLACK = "#0B0B0B";
const WHITE = "#FFFFFF";

function svgDoc(inner: string, attrs = ""): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" ${attrs}>${inner}</svg>`;
}

function mark(color: string, strokeWidth = 8): string {
  return (
    `<path d="${MARK_PATHS.ring}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" fill="none"/>` +
    `<path d="${MARK_PATHS.line}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" fill="none"/>` +
    `<path d="${MARK_PATHS.terminal}" fill="${color}"/>`
  );
}

/** App-icon tile with a generous padding ratio so it survives masking. */
function iconable(bg: string, fg: string, pad = 22): string {
  return svgDoc(
    `<rect width="100" height="100" fill="${bg}"/>` +
      `<g transform="translate(${pad} ${pad}) scale(${(100 - pad * 2) / 100})">${mark(fg, 7)}</g>`,
  );
}

export const brandAssets: Record<string, string> = {
  // 1. Primary monogram (dark ink, for light backgrounds).
  primary: svgDoc(mark(BLACK)),

  // 3. Dark-background version (white mark).
  "mark-dark": svgDoc(mark(WHITE)),

  // 4. Light-background version (ink mark) — same geometry.
  "mark-light": svgDoc(mark(BLACK)),

  // 5. Compact app icon (dark tile + white mark).
  "app-icon": iconable(BLACK, WHITE),

  // Favicon — ink tile, white mark, tight padding.
  favicon: iconable(BLACK, WHITE, 18),

  // 2. Horizontal lockup with wordmark.
  lockup:
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 100">` +
    `<g>${mark(BLACK, 7)}</g>` +
    `<text x="118" y="63" font-family="InterVariable, Inter, system-ui, sans-serif" ` +
    `font-size="46" font-weight="600" letter-spacing="6.5" fill="${BLACK}">OUSCAP</text>` +
    `</svg>`,
  "lockup-dark":
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 100">` +
    `<g>${mark(WHITE, 7)}</g>` +
    `<text x="118" y="63" font-family="InterVariable, Inter, system-ui, sans-serif" ` +
    `font-size="46" font-weight="600" letter-spacing="6.5" fill="${WHITE}">OUSCAP</text>` +
    `</svg>`,
};

export type BrandAssetName = keyof typeof brandAssets;
