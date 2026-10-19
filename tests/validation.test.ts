import { describe, expect, it } from "vitest";
import { transactionSchema, accountSchema, goalSchema, budgetSchema } from "@/domain/schemas";

describe("validation rejects invalid input", () => {
  it("rejects a non-positive amount", () => {
    const bad = transactionSchema.safeParse({
      type: "expense",
      amount: 0,
      date: "2026-01-01",
      accountId: "acc-1",
      categoryId: "cat-1",
      context: "personal",
    });
    expect(bad.success).toBe(false);
  });

  it("rejects a non-integer (floating) amount", () => {
    const bad = transactionSchema.safeParse({
      type: "expense",
      amount: 12.5,
      date: "2026-01-01",
      accountId: "acc-1",
      categoryId: "cat-1",
      context: "personal",
    });
    expect(bad.success).toBe(false);
  });

  it("rejects an expense without an account reference", () => {
    const bad = transactionSchema.safeParse({
      type: "expense",
      amount: 100,
      date: "2026-01-01",
      accountId: null,
      categoryId: "cat-1",
      context: "personal",
    });
    expect(bad.success).toBe(false);
  });

  it("rejects an expense without a category reference", () => {
    const bad = transactionSchema.safeParse({
      type: "expense",
      amount: 100,
      date: "2026-01-01",
      accountId: "acc-1",
      categoryId: null,
      context: "personal",
    });
    expect(bad.success).toBe(false);
  });

  it("rejects a transfer to the same account", () => {
    const bad = transactionSchema.safeParse({
      type: "transfer",
      amount: 100,
      date: "2026-01-01",
      accountId: "acc-1",
      toAccountId: "acc-1",
      context: "personal",
    });
    expect(bad.success).toBe(false);
  });

  it("rejects an invalid date format", () => {
    const bad = transactionSchema.safeParse({
      type: "income",
      amount: 100,
      date: "01/01/2026",
      accountId: "acc-1",
      categoryId: "cat-1",
      context: "personal",
    });
    expect(bad.success).toBe(false);
  });

  it("accepts a valid expense", () => {
    const good = transactionSchema.safeParse({
      type: "expense",
      amount: 1500,
      date: "2026-01-01",
      accountId: "acc-1",
      categoryId: "cat-1",
      context: "personal",
    });
    expect(good.success).toBe(true);
  });

  it("rejects an empty account name", () => {
    expect(accountSchema.safeParse({ name: "  ", type: "cash", openingBalance: 0 }).success).toBe(false);
  });

  it("rejects a goal with a non-positive target", () => {
    expect(goalSchema.safeParse({ name: "X", target: 0, contributed: 0, status: "active" }).success).toBe(false);
  });

  it("rejects a budget warn threshold out of range", () => {
    expect(
      budgetSchema.safeParse({ categoryId: "c", limit: 100, warnAt: 150, active: true }).success,
    ).toBe(false);
  });
});
