import { cn } from "@/lib/cn";

/**
 * Financial figure with strict hierarchy. Never a bare giant number: an
 * optional label and delta give it context.
 */
export function Stat({
  label,
  value,
  delta,
  deltaTone,
  hint,
  size = "md",
  className,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "pos" | "neg" | "muted";
  hint?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  };
  const toneClass = {
    pos: "text-pos",
    neg: "text-neg",
    muted: "text-muted",
  };
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="stat-label">{label}</span>
      <span className={cn("tnum font-semibold tracking-tight text-fg", sizes[size])}>{value}</span>
      {(delta || hint) && (
        <span className={cn("tnum text-xs", delta ? toneClass[deltaTone ?? "muted"] : "text-muted")}>
          {delta ?? hint}
        </span>
      )}
    </div>
  );
}

export function StatRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-px bg-line lg:grid-cols-4", className)}>{children}</div>
  );
}

export function StatCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("bg-surface px-4 py-4", className)}>{children}</div>;
}
