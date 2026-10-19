import type { ID, ISODate, RecurringRule, Transaction } from "@/domain/types";
import { addDays, addMonths, addYears, todayISO } from "@/lib/dates";
import { newId } from "./repositories";

/** Advance a recurring rule's expected date by one interval. */
export function advanceDate(date: ISODate, rule: RecurringRule): ISODate {
  switch (rule.recurrence.freq) {
    case "weekly":
      return addDays(date, 7 * rule.recurrence.interval);
    case "monthly":
      return addMonths(date, rule.recurrence.interval);
    case "annual":
      return addYears(date, rule.recurrence.interval);
  }
}

/**
 * Build the transaction a rule would generate for a given occurrence date.
 * A recurring expense/income is recorded only when the user confirms it
 * (or when `materializeDue` is explicitly invoked) — never silently.
 */
export function transactionFromRule(
  rule: RecurringRule,
  date: ISODate,
  groupId: ID,
): Omit<Transaction, "id" | "createdAt" | "updatedAt"> {
  const t = rule.template;
  return {
    type: t.type,
    amount: t.amount,
    date,
    accountId: t.accountId,
    toAccountId: t.type === "transfer" ? (t.toAccountId ?? null) : null,
    categoryId: t.categoryId ?? null,
    description: t.description,
    context: t.context,
    tags: t.tags,
    groupId,
  };
}

export interface DueOccurrence {
  rule: RecurringRule;
  date: ISODate;
  /** Idempotency key so re-running generation cannot double-create. */
  occurrenceKey: string;
}

/**
 * List every occurrence a rule is due for, strictly after its last run and up
 * to `asOf` (default today). Missed schedules are safely caught up, but a rule
 * is capped so a long-dormant rule can't spawn an unbounded backlog.
 */
export function dueOccurrences(
  rules: RecurringRule[],
  asOf: ISODate = todayISO(),
  maxPerRule = 24,
): DueOccurrence[] {
  const result: DueOccurrence[] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    let cursor = rule.nextDate;
    let guard = 0;
    while (cursor <= asOf && guard < maxPerRule) {
      if (rule.endDate && cursor > rule.endDate) break;
      result.push({
        rule,
        date: cursor,
        occurrenceKey: `${rule.id}:${cursor}`,
      });
      cursor = advanceDate(cursor, rule);
      guard += 1;
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/** Human summary of the next expected occurrence for display. */
export function nextOccurrenceLabel(rule: RecurringRule, asOf: ISODate = todayISO()): string {
  if (!rule.enabled) return "Paused";
  if (rule.nextDate < asOf) return "Overdue";
  return rule.nextDate;
}

export function describeRecurrence(rule: RecurringRule): string {
  const { freq, interval } = rule.recurrence;
  const unit = freq === "weekly" ? "week" : freq === "monthly" ? "month" : "year";
  return interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}s`;
}

export function makeOccurrenceGroupId(ruleId: ID, date: ISODate): ID {
  return `recur:${ruleId}:${date}`;
}

export { newId };
