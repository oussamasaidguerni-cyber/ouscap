import { Monogram } from "./Monogram";
import { cn } from "@/lib/cn";

/**
 * Horizontal OUSCAP lockup: monogram + refined wordmark.
 * Used on the unlock/onboarding screen, settings, and brand presentation.
 */
export function Wordmark({
  size = 26,
  className,
  tagline = false,
  stacked = false,
}: {
  size?: number;
  className?: string;
  tagline?: boolean;
  stacked?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", stacked && "flex-col items-start gap-4", className)}>
      <Monogram size={size} aria-hidden />
      <div className="leading-none">
        <span
          className="font-semibold tracking-[0.34em] text-fg"
          style={{ fontSize: size * 0.62 }}
        >
          OUSCAP
        </span>
        {tagline ? (
          <p className="stat-label mt-2">Your money. In perspective.</p>
        ) : null}
      </div>
    </div>
  );
}
