import type { DateRange } from "@/domain/accounting";
import type { ISODate } from "@/domain/types";

/** Local date helpers. All dates are calendar days in the user's timezone. */

export function todayISO(): ISODate {
  const d = new Date();
  return toISO(d);
}

export function toISO(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISO(s: ISODate): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(s: ISODate, format: "yyyy-MM-dd" | "dd/MM/yyyy" = "yyyy-MM-dd"): string {
  if (format === "dd/MM/yyyy") {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  }
  return s;
}

export function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function addDays(s: ISODate, days: number): ISODate {
  const d = parseISO(s);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function addMonths(s: ISODate, months: number): ISODate {
  const d = parseISO(s);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return toISO(d);
}

export function addYears(s: ISODate, years: number): ISODate {
  return addMonths(s, years * 12);
}

export function startOfMonth(s: ISODate = todayISO(), monthStartDay = 1): ISODate {
  const d = parseISO(s);
  if (monthStartDay <= 1) {
    return toISO(new Date(d.getFullYear(), d.getMonth(), 1));
  }
  // Budget months may start on a custom day (e.g. payday).
  const anchor =
    d.getDate() >= monthStartDay
      ? new Date(d.getFullYear(), d.getMonth(), monthStartDay)
      : new Date(d.getFullYear(), d.getMonth() - 1, monthStartDay);
  return toISO(anchor);
}

export function endOfMonth(s: ISODate = todayISO(), monthStartDay = 1): ISODate {
  return addDays(addMonths(startOfMonth(s, monthStartDay), 1), -1);
}

export function monthKeyOf(s: ISODate): string {
  return s.slice(0, 7);
}

export function previousMonthKey(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export type PeriodKey = "this-month" | "last-month" | "last-90" | "custom";

export function rangeForPeriod(
  period: PeriodKey,
  custom?: DateRange,
  monthStartDay = 1,
): DateRange {
  const today = todayISO();
  switch (period) {
    case "this-month":
      return { from: startOfMonth(today, monthStartDay), to: endOfMonth(today, monthStartDay) };
    case "last-month": {
      const prev = addMonths(startOfMonth(today, monthStartDay), -1);
      return { from: prev, to: endOfMonth(prev, monthStartDay) };
    }
    case "last-90":
      return { from: addDays(today, -89), to: today };
    case "custom":
      return custom ?? { from: startOfMonth(today, monthStartDay), to: endOfMonth(today, monthStartDay) };
  }
}

export const PERIOD_LABEL: Record<PeriodKey, string> = {
  "this-month": "This month",
  "last-month": "Last month",
  "last-90": "Last 90 days",
  custom: "Custom",
};
