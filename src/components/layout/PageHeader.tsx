import type { ReactNode } from "react";
import { usePeriod } from "@/store/PeriodProvider";
import { PERIOD_LABEL, type PeriodKey } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">{title}</h1>
        {description ? <p className="mt-1 text-xs text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Period selector — every metric on the page reacts to this. */
export function PeriodFilter({ periods = ["this-month", "last-month", "last-90", "custom"] as PeriodKey[] }: { periods?: PeriodKey[] }) {
  const { period, setPeriod, customRange, setCustomRange, range } = usePeriod();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-px bg-line">
        {periods.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "bg-surface px-3 py-1.5 text-xs transition-colors",
              period === p ? "bg-fg text-ink" : "text-muted hover:text-fg",
            )}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>
      {period === "custom" ? (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={customRange?.from ?? range.from}
            onChange={(e) => setCustomRange({ from: e.target.value, to: customRange?.to ?? range.to })}
            className="h-8 w-auto text-xs"
          />
          <span className="text-xs text-muted">to</span>
          <Input
            type="date"
            value={customRange?.to ?? range.to}
            onChange={(e) => setCustomRange({ from: customRange?.from ?? range.from, to: e.target.value })}
            className="h-8 w-auto text-xs"
          />
        </div>
      ) : null}
    </div>
  );
}
