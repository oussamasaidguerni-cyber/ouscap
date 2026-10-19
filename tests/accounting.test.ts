import { describe, expect, it } from "vitest";
import {
  accountBalance,
  budgetProgress,
  filterByRange,
  goalProgress,
  monthsBetween,
  monthlySeries,
  netCashFlow,
  netWorth,
  qualifyingTotals,
  spendingByCategory,
} from "@/domain/accounting";
import type {
  Account,
  Budget,
  Category,
  Goal,
  Transaction,
} from "@/domain/types";

let seq = 0;
const id = (p: string) => `${p}-${++seq}`;
const now = new Date().toISOString();

function acct(name: string, opening: number, type: Account["type"] = "cash"): Account {
  return { id: id("acc"), name, type, openingBalance: opening, currency: "DZD", archived: false, createdAt: now, updatedAt: now };
}

function tx(partial: Partial<Transaction> & Pick<Transaction, "type" | "amount" | "accountId">): Transaction {
  return {
    id: id("tx"),
    date: "2026-01-15",
    context: "personal",
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

function cat(name: string, kind: Category["kind"] = "expense"): Category {
  return { id: id("cat"), name, kind, context: "personal", archived: false, createdAt: now };
}

describe("OUSCAP accounting", () => {
  // 1. Adding an expense updates the correct account and totals.
  it("applies an expense to the correct account and totals", () => {
    const cash = acct("Cash", 10000);
    const bank = acct("Bank", 50000);
    const groceries = cat("Groceries");
    const expense = tx({ type: "expense", amount: 2500, accountId: cash.id, categoryId: groceries.id });

    expect(accountBalance(cash, [expense])).toBe(7500);
    expect(accountBalance(bank, [expense])).toBe(50000);

    const totals = qualifyingTotals([expense]);
    expect(totals.expenses).toBe(2500);
    expect(totals.income).toBe(0);
  });

  // 2. Adding income updates income and cash flow correctly.
  it("applies income to income and net cash flow", () => {
    const bank = acct("Bank", 0, "bank");
    const salary = tx({ type: "income", amount: 40000, accountId: bank.id });
    const rent = tx({ type: "expense", amount: 15000, accountId: bank.id });

    const totals = qualifyingTotals([salary, rent]);
    expect(totals.income).toBe(40000);
    expect(totals.expenses).toBe(15000);
    expect(netCashFlow(totals)).toBe(25000);
    expect(accountBalance(bank, [salary, rent])).toBe(25000);
  });

  // 3. Transfers update both accounts without being income or expenses.
  it("moves money on transfer without counting as income or expense", () => {
    const cash = acct("Cash", 20000);
    const savings = acct("Savings", 100000, "savings");
    const transfer = tx({
      type: "transfer",
      amount: 5000,
      accountId: cash.id,
      toAccountId: savings.id,
    });

    expect(accountBalance(cash, [transfer])).toBe(15000);
    expect(accountBalance(savings, [transfer])).toBe(105000);

    const totals = qualifyingTotals([transfer]);
    expect(totals.income).toBe(0);
    expect(totals.expenses).toBe(0);
    expect(netCashFlow(totals)).toBe(0);
  });

  // 4. Editing and deleting transactions update dependent calculations.
  it("reflects edits and deletions in balances", () => {
    const cash = acct("Cash", 10000);
    const expense = tx({ type: "expense", amount: 1000, accountId: cash.id });
    expect(accountBalance(cash, [expense])).toBe(9000);

    const edited = { ...expense, amount: 3000 };
    expect(accountBalance(cash, [edited])).toBe(7000);

    // Deletion leaves the balance at its opening value.
    expect(accountBalance(cash, [])).toBe(10000);
  });

  // 5. Budgets count only qualifying expenses (never transfers/income).
  it("counts only qualifying expenses toward a budget", () => {
    const groceries = cat("Groceries");
    const other = cat("Other");
    const budget: Budget = {
      id: id("bud"),
      categoryId: groceries.id,
      limit: 20000,
      warnAt: 80,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    const txs = [
      tx({ type: "expense", amount: 5000, accountId: "a", categoryId: groceries.id }),
      tx({ type: "expense", amount: 10000, accountId: "a", categoryId: groceries.id }),
      tx({ type: "expense", amount: 9000, accountId: "a", categoryId: other.id }),
      tx({ type: "income", amount: 50000, accountId: "a", categoryId: groceries.id }),
      tx({ type: "transfer", amount: 100000, accountId: "a", toAccountId: "b" }),
    ];
    const progress = budgetProgress(budget, [groceries, other], txs);
    expect(progress.spent).toBe(15000);
    expect(progress.remaining).toBe(5000);
    expect(progress.utilization).toBe(75);
    expect(progress.status).toBe("ok");
  });

  it("flags warning and over-budget states", () => {
    const c = cat("Food");
    const mkBudget = (limit: number): Budget => ({
      id: id("bud"),
      categoryId: c.id,
      limit,
      warnAt: 80,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    const txs = [tx({ type: "expense", amount: 17000, accountId: "a", categoryId: c.id })];

    expect(budgetProgress(mkBudget(20000), [c], txs).status).toBe("warning"); // 85%
    expect(budgetProgress(mkBudget(15000), [c], txs).status).toBe("over"); // 113%
  });

  // 6. Date filters update every relevant metric.
  it("filters transactions by date range", () => {
    const txs = [
      tx({ type: "expense", amount: 100, accountId: "a", date: "2026-01-05" }),
      tx({ type: "expense", amount: 200, accountId: "a", date: "2026-02-05" }),
      tx({ type: "expense", amount: 400, accountId: "a", date: "2026-03-05" }),
    ];
    const jan = filterByRange(txs, { from: "2026-01-01", to: "2026-01-31" });
    expect(qualifyingTotals(jan).expenses).toBe(100);

    const febMar = filterByRange(txs, { from: "2026-02-01", to: "2026-03-31" });
    expect(qualifyingTotals(febMar).expenses).toBe(600);
  });

  // 7. Net worth equals tracked assets minus tracked liabilities.
  it("computes net worth as assets minus liabilities", () => {
    const cash = acct("Cash", 10000);
    const savings = acct("Savings", 90000, "savings");
    const assets = [{ id: "asset-1", name: "Laptop", value: 40000, createdAt: now, updatedAt: now }];
    const liabilities = [
      { id: "l-1", name: "Loan", type: "loan" as const, balance: 30000, createdAt: now, updatedAt: now },
    ];
    const result = netWorth([cash, savings], assets, liabilities, []);
    expect(result.accounts).toBe(100000);
    expect(result.totalAssets).toBe(140000);
    expect(result.totalLiabilities).toBe(30000);
    expect(result.netWorth).toBe(110000);
  });

  it("can exclude accounts from net worth to avoid double counting", () => {
    const cash = acct("Cash", 50000);
    const assets = [{ id: "a", name: "SameMoney", value: 50000, createdAt: now, updatedAt: now }];
    const withDouble = netWorth([cash], assets, [], []);
    expect(withDouble.netWorth).toBe(100000);
    const excluded = netWorth([cash], assets, [], [], { excludeAccountIds: [cash.id] });
    expect(excluded.netWorth).toBe(50000);
  });

  // 8. Savings goals do not cause double counting.
  it("computes goal progress from explicit contributions only", () => {
    const goal: Goal = {
      id: id("goal"),
      name: "Emergency fund",
      target: 100000,
      contributed: 25000,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    const progress = goalProgress(goal, "2026-01-01");
    expect(progress.remaining).toBe(75000);
    expect(progress.progress).toBe(25);
    // No deadline → no required monthly figure.
    expect(progress.requiredMonthly).toBeNull();
  });

  it("computes required monthly savings toward a deadline", () => {
    const goal: Goal = {
      id: id("goal"),
      name: "Laptop",
      target: 120000,
      contributed: 0,
      targetDate: "2026-07-01",
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    // 6 months from Jan to Jul.
    expect(monthsBetween("2026-01-01", "2026-07-01")).toBe(6);
    const progress = goalProgress(goal, "2026-01-01");
    expect(progress.requiredMonthly).toBe(20000);
  });

  it("groups spending by category with shares", () => {
    const a = cat("A");
    const b = cat("B");
    const txs = [
      tx({ type: "expense", amount: 300, accountId: "x", categoryId: a.id }),
      tx({ type: "expense", amount: 100, accountId: "x", categoryId: b.id }),
    ];
    const rows = spendingByCategory(txs, [a, b]);
    expect(rows[0].name).toBe("A");
    expect(rows[0].share).toBe(75);
    expect(rows[1].share).toBe(25);
  });

  it("builds a monthly income/expense series", () => {
    const txs = [
      tx({ type: "income", amount: 1000, accountId: "a", date: "2026-01-10" }),
      tx({ type: "expense", amount: 400, accountId: "a", date: "2026-01-20" }),
      tx({ type: "income", amount: 2000, accountId: "a", date: "2026-02-10" }),
    ];
    const series = monthlySeries(txs);
    expect(series).toHaveLength(2);
    expect(series[0]).toMatchObject({ month: "2026-01", income: 1000, expenses: 400, net: 600 });
    expect(series[1]).toMatchObject({ month: "2026-02", income: 2000, net: 2000 });
  });

  // Adjustments are explicit and not spending.
  it("treats adjustments as explicit balance corrections, not expenses", () => {
    const cash = acct("Cash", 1000);
    const adjustUp = { ...tx({ type: "adjustment", amount: 500, accountId: cash.id }), amount: 500 };
    const adjustDown = { ...tx({ type: "adjustment", amount: -300, accountId: cash.id }), amount: -300 };
    expect(accountBalance(cash, [adjustUp])).toBe(1500);
    expect(accountBalance(cash, [adjustUp, adjustDown])).toBe(1200);
    expect(qualifyingTotals([adjustUp, adjustDown]).expenses).toBe(0);
  });
});
