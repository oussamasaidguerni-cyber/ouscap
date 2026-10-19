import { describe, expect, it } from "vitest";
import { advanceDate, dueOccurrences } from "@/data/recurring";
import type { RecurringRule } from "@/domain/types";

const now = new Date().toISOString();

function rule(partial: Partial<RecurringRule>): RecurringRule {
  return {
    id: "rule-1",
    template: { type: "expense", amount: 1000, accountId: "acc", context: "personal" },
    recurrence: { freq: "monthly", interval: 1 },
    startDate: "2026-01-01",
    nextDate: "2026-01-01",
    enabled: true,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

describe("recurring rules", () => {
  it("advances weekly, monthly, and annual dates", () => {
    expect(advanceDate("2026-01-01", rule({ recurrence: { freq: "weekly", interval: 1 } }))).toBe("2026-01-08");
    expect(advanceDate("2026-01-31", rule({ recurrence: { freq: "monthly", interval: 1 } }))).toBe("2026-02-28");
    expect(advanceDate("2026-01-01", rule({ recurrence: { freq: "annual", interval: 1 } }))).toBe("2027-01-01");
  });

  it("lists due occurrences up to the as-of date", () => {
    const r = rule({ nextDate: "2026-01-01" });
    const due = dueOccurrences([r], "2026-03-15");
    expect(due.map((d) => d.date)).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"]);
    expect(due[0].occurrenceKey).toBe("rule-1:2026-01-01");
  });

  it("skips disabled rules", () => {
    const r = rule({ enabled: false });
    expect(dueOccurrences([r], "2026-06-01")).toHaveLength(0);
  });

  it("stops at the end date", () => {
    const r = rule({ endDate: "2026-02-15" });
    const due = dueOccurrences([r], "2026-06-01");
    expect(due.map((d) => d.date)).toEqual(["2026-01-01", "2026-02-01"]);
  });

  it("caps runaway backlog generation", () => {
    const r = rule({ nextDate: "2000-01-01" });
    const due = dueOccurrences([r], "2026-06-01", 5);
    expect(due).toHaveLength(5);
  });

  it("produces a stable idempotency key per occurrence", () => {
    const r = rule({});
    const a = dueOccurrences([r], "2026-01-01");
    const b = dueOccurrences([r], "2026-01-01");
    expect(a[0].occurrenceKey).toBe(b[0].occurrenceKey);
  });
});
