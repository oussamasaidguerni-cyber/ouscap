import { cn } from "@/lib/cn";

/** A single shimmering placeholder block. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-surface-raised", className)} aria-hidden />;
}

/** Placeholder rows that mimic a card list while data loads. */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card divide-y divide-line" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <Skeleton className="h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Placeholder stat tiles for headers/summary strips. */
export function SkeletonStats({ cells = 3 }: { cells?: number }) {
  return (
    <div className="card grid grid-cols-1 gap-px bg-line sm:grid-cols-3" aria-hidden>
      {Array.from({ length: cells }).map((_, i) => (
        <div key={i} className="space-y-2 bg-surface p-4">
          <Skeleton className="h-2.5 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}
