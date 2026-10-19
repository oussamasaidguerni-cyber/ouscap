import { createContext, useContext, useMemo, useState } from "react";
import { rangeForPeriod, todayISO, type PeriodKey } from "@/lib/dates";
import type { DateRange } from "@/domain/accounting";

interface PeriodContextValue {
  period: PeriodKey;
  range: DateRange;
  setPeriod: (p: PeriodKey) => void;
  setCustomRange: (r: DateRange) => void;
  customRange: DateRange | null;
}

const PeriodContext = createContext<PeriodContextValue | null>(null);

export function PeriodProvider({
  children,
  monthStartDay = 1,
}: {
  children: React.ReactNode;
  monthStartDay?: number;
}) {
  const [period, setPeriod] = useState<PeriodKey>("this-month");
  const [customRange, setCustomRange] = useState<DateRange | null>(null);

  const range = useMemo(
    () => rangeForPeriod(period, customRange ?? undefined, monthStartDay),
    [period, customRange, monthStartDay],
  );

  const value = useMemo<PeriodContextValue>(
    () => ({ period, range, setPeriod, setCustomRange, customRange }),
    [period, range, customRange],
  );

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
}

export function usePeriod(): PeriodContextValue {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error("usePeriod must be used within PeriodProvider");
  return ctx;
}

export { todayISO };
