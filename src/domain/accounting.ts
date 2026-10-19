/**
 * OUSCAP accounting engine — the single source of truth for every financial
 * calculation. Pure functions only: no persistence, no React, no side effects.
 * All amounts are integer DZD.
 *
 * Invariants enforced here (and covered by tests/accounting.test.ts):
 *  1. A transfer moves money between owned accounts and is never income,
 *     expense, or cash-flow.
 *  2. Account balance = openingBalance + signed movements affecting it.
 *  3. Net worth = tracked assets − tracked liabilities, with no double counting.
 *  4. Budgets count qualifying expenses only (never transfers, never income).
 *  5. Balance adjustments are explicit and typed.
 */

import type {
  Account,
  Asset,
  Budget,
  Category,
  Goal,
  ID,
  ISODate,
  Liability,
  Transaction,
} from "./types";
import { clampPercent, percent } from "./money";

/** Signed movement of a transaction on a specific account. */
function movementOnAccount(tx: Transaction, accountId: ID): number {
  switch (tx.type) {
    case "income":
      return tx.accountId === accountId ? tx.amount : 0;
    case "expense":
      return tx.accountId === accountId ? -tx.amount : 0;
    case "adjustment":
      // Adjustments carry an explicit signed delta in `amount`:
      // expenses-like decrease uses type adjustment with negative intent.
      return tx.accountId === accountId ? tx.amount : 0;
    case "transfer":
      if (tx.accountId === accountId) return -tx.amount;
      if (tx.toAccountId === accountId) return tx.amount;
      return 0;
    default:
      return 0;
  }
}

/** Net movement for a single account across all transactions. */
export function accountMovement(accountId: ID, transactions: Transaction[]): number {
  let total = 0;
  for (const tx of transactions) total += movementOnAccount(tx, accountId);
  return total;
}

/** Current balance of one account (opening + movements). */
export function accountBalance(account: Account, transactions: Transaction[]): number {
  return account.openingBalance + accountMovement(account.id, transactions);
}

export interface AccountWithBalance extends Account {
  balance: number;
}

export function accountsWithBalances(
  accounts: Account[],
  transactions: Transaction[],
): AccountWithBalance[] {
  return accounts.map((account) => ({
    ...account,
    balance: accountBalance(account, transactions),
  }));
}

/* ------------------------------------------------------------------ *
 * Period filtering
 * ------------------------------------------------------------------ */

export interface DateRange {
  /** Inclusive start (YYYY-MM-DD). */
  from: ISODate;
  /** Inclusive end (YYYY-MM-DD). */
  to: ISODate;
}

export function inRange(date: ISODate, range: DateRange): boolean {
  return date >= range.from && date <= range.to;
}

export function filterByRange(transactions: Transaction[], range: DateRange): Transaction[] {
  return transactions.filter((tx) => inRange(tx.date, range));
}

/* ------------------------------------------------------------------ *
 * Cash flow — income/expense only; transfers excluded by construction.
 * ------------------------------------------------------------------ */

export interface Totals {
  income: number;
  expenses: number;
}

/**
 * Qualifying income and expenses in a period.
 * - income: type "income"
 * - expenses: type "expense"
 * - transfers and adjustments are excluded (adjustments correct balances,
 *   they are not spending).
 */
export function qualifyingTotals(transactions: Transaction[]): Totals {
  let income = 0;
  let expenses = 0;
  for (const tx of transactions) {
    if (tx.type === "income") income += tx.amount;
    else if (tx.type === "expense") expenses += tx.amount;
  }
  return { income, expenses };
}

export function netCashFlow(totals: Totals): number {
  return totals.income - totals.expenses;
}

/* ------------------------------------------------------------------ *
 * Net worth — assets minus liabilities, without double counting.
 * ------------------------------------------------------------------ */

export interface NetWorthBreakdown {
  /** Sum of current balances of spendable + savings accounts. */
  accounts: number;
  /** Sum of separately tracked asset values. */
  assets: number;
  /** Sum of outstanding liabilities. */
  liabilities: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

/**
 * Compute net worth. By default, spendable accounts count as assets and
 * separately tracked assets are added on top (they represent different things).
 * Pass `excludeAccountIds` when a tracked asset is physically the same money as
 * an account, so it is not counted twice.
 */
export function netWorth(
  accounts: Account[],
  assets: Asset[],
  liabilities: Liability[],
  transactions: Transaction[],
  opts: { excludeAccountIds?: ID[] } = {},
): NetWorthBreakdown {
  const excluded = new Set(opts.excludeAccountIds ?? []);
  const accountTotal = accounts
    .filter((a) => !excluded.has(a.id))
    .reduce((sum, a) => sum + accountBalance(a, transactions), 0);
  const assetTotal = assets.reduce((sum, a) => sum + a.value, 0);
  const liabilityTotal = liabilities.reduce((sum, l) => sum + l.balance, 0);

  const totalAssets = accountTotal + assetTotal;
  return {
    accounts: accountTotal,
    assets: assetTotal,
    liabilities: liabilityTotal,
    totalAssets,
    totalLiabilities: liabilityTotal,
    netWorth: totalAssets - liabilityTotal,
  };
}

/* ------------------------------------------------------------------ *
 * Spending analytics
 * ------------------------------------------------------------------ */

export interface CategorySpend {
  categoryId: ID | null;
  name: string;
  amount: number;
  share: number;
}

/** Expenses grouped by category for the period. Transfers never appear. */
export function spendingByCategory(
  transactions: Transaction[],
  categories: Category[],
): CategorySpend[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<ID | null, number>();
  for (const tx of transactions) {
    if (tx.type !== "expense") continue;
    const key = tx.categoryId ?? null;
    totals.set(key, (totals.get(key) ?? 0) + tx.amount);
  }
  const grand = [...totals.values()].reduce((a, b) => a + b, 0);
  return [...totals.entries()]
    .map(([categoryId, amount]) => ({
      categoryId,
      name: categoryId ? (byId.get(categoryId)?.name ?? "Unknown") : "Uncategorized",
      amount,
      share: percent(amount, grand),
    }))
    .sort((a, b) => b.amount - a.amount);
}

/** Expenses split by financial context (personal / freelance / startup). */
export function spendingByContext(transactions: Transaction[]) {
  const result = { personal: 0, freelance: 0, startup: 0 };
  for (const tx of transactions) {
    if (tx.type === "expense") result[tx.context] += tx.amount;
  }
  return result;
}

/** Income split by financial context. */
export function incomeByContext(transactions: Transaction[]) {
  const result = { personal: 0, freelance: 0, startup: 0 };
  for (const tx of transactions) {
    if (tx.type === "income") result[tx.context] += tx.amount;
  }
  return result;
}

/* ------------------------------------------------------------------ *
 * Budgets
 * ------------------------------------------------------------------ */

export interface BudgetProgress {
  budget: Budget;
  categoryName: string;
  spent: number;
  remaining: number;
  utilization: number;
  status: "ok" | "warning" | "over";
}

export function budgetProgress(
  budget: Budget,
  categories: Category[],
  transactions: Transaction[],
): BudgetProgress {
  // Only expenses in the budget's category count; transfers and income never do.
  const spent = transactions
    .filter((tx) => tx.type === "expense" && tx.categoryId === budget.categoryId)
    .reduce((sum, tx) => sum + tx.amount, 0);
  const utilization = clampPercent(percent(spent, budget.limit));
  const remaining = budget.limit - spent;
  const status: BudgetProgress["status"] =
    spent > budget.limit ? "over" : utilization >= budget.warnAt ? "warning" : "ok";
  const categoryName = categories.find((c) => c.id === budget.categoryId)?.name ?? "Unknown";
  return { budget, categoryName, spent, remaining, utilization, status };
}

/* ------------------------------------------------------------------ *
 * Goals
 * ------------------------------------------------------------------ */

export interface GoalProgress {
  goal: Goal;
  remaining: number;
  progress: number;
  /** Average integer DZD to save per month to hit the target date, or null. */
  requiredMonthly: number | null;
  monthsLeft: number | null;
}

export function monthsBetween(from: ISODate, to: ISODate): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return Math.max(0, (ty - fy) * 12 + (tm - fm));
}

/**
 * Goal progress. `contributed` is explicit and author-declared; it is never
 * derived from transfers, so it cannot duplicate money already counted in an
 * account balance.
 */
export function goalProgress(goal: Goal, today: ISODate): GoalProgress {
  const remaining = Math.max(0, goal.target - goal.contributed);
  const progress = clampPercent(percent(goal.contributed, goal.target));
  if (!goal.targetDate) {
    return { goal, remaining, progress, requiredMonthly: null, monthsLeft: null };
  }
  const monthsLeft = monthsBetween(today, goal.targetDate);
  const requiredMonthly = monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : remaining;
  return { goal, remaining, progress, requiredMonthly, monthsLeft };
}

/* ------------------------------------------------------------------ *
 * Trend series
 * ------------------------------------------------------------------ */

export interface MonthlyPoint {
  month: string; // "YYYY-MM"
  income: number;
  expenses: number;
  net: number;
}

function monthKey(date: ISODate): string {
  return date.slice(0, 7);
}

/** Income-vs-expense series for the months present in the transaction set. */
export function monthlySeries(transactions: Transaction[]): MonthlyPoint[] {
  const buckets = new Map<string, MonthlyPoint>();
  for (const tx of transactions) {
    const key = monthKey(tx.date);
    let point = buckets.get(key);
    if (!point) {
      point = { month: key, income: 0, expenses: 0, net: 0 };
      buckets.set(key, point);
    }
    if (tx.type === "income") point.income += tx.amount;
    else if (tx.type === "expense") point.expenses += tx.amount;
  }
  return [...buckets.values()]
    .map((p) => ({ ...p, net: p.income - p.expenses }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/* ------------------------------------------------------------------ *
 * Insights
 * ------------------------------------------------------------------ */

export interface Insight {
  id: string;
  severity: "info" | "warning" | "positive";
  title: string;
  detail: string;
}

/**
 * Deterministic insights derived from real records. Nothing here is "AI" and
 * nothing leaves the device.
 */
export function buildInsights(input: {
  range: DateRange;
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  series: MonthlyPoint[];
  today: ISODate;
}): Insight[] {
  const { transactions, categories, budgets, series, range } = input;
  const insights: Insight[] = [];
  const totals = qualifyingTotals(transactions);

  // Largest spending category.
  const byCategory = spendingByCategory(transactions, categories);
  if (byCategory.length > 0) {
    const top = byCategory[0];
    insights.push({
      id: "top-category",
      severity: "info",
      title: `${top.name} is your largest expense`,
      detail: `${top.share}% of period expenses (${top.amount.toLocaleString("fr-FR")} DZD).`,
    });
  }

  // Month-over-month comparison using the previous equal-length window.
  if (series.length >= 2) {
    const last = series[series.length - 1];
    const prev = series[series.length - 2];
    const delta = last.expenses - prev.expenses;
    if (prev.expenses > 0) {
      const pct = percent(Math.abs(delta), prev.expenses);
      insights.push({
        id: "mom",
        severity: delta > 0 ? "warning" : "positive",
        title: delta > 0 ? "Spending is up" : "Spending is down",
        detail: `${pct}% ${delta > 0 ? "higher" : "lower"} in ${last.month} than ${prev.month}.`,
      });
    }
  }

  // Savings rate.
  if (totals.income > 0) {
    const rate = percent(netCashFlow(totals), totals.income);
    insights.push({
      id: "savings-rate",
      severity: rate >= 20 ? "positive" : rate >= 0 ? "info" : "warning",
      title: `Savings rate ${rate}%`,
      detail: `You kept ${rate}% of income in ${range.from} → ${range.to}.`,
    });
  }

  // Budget warnings.
  for (const budget of budgets) {
    const p = budgetProgress(budget, categories, transactions);
    if (p.status !== "ok") {
      insights.push({
        id: `budget-${budget.id}`,
        severity: p.status === "over" ? "warning" : "info",
        title: `${p.categoryName} budget ${p.status === "over" ? "exceeded" : "near limit"}`,
        detail: `${p.utilization}% used — ${p.remaining.toLocaleString("fr-FR")} DZD remaining.`,
      });
    }
  }

  // Estimated month-end cash flow (labelled estimate).
  if (series.length > 0) {
    const avgNet = Math.round(series.reduce((s, p) => s + p.net, 0) / series.length);
    insights.push({
      id: "projection",
      severity: "info",
      title: "Estimated month-end cash flow",
      detail: `Estimate only: average net across ${series.length} month(s) is ${avgNet.toLocaleString("fr-FR")} DZD. Assumes current pattern continues.`,
    });
  }

  return insights;
}

/** Average expense per day across the inclusive range length. */
export function averageDailyExpense(transactions: Transaction[], range: DateRange): number {
  const total = qualifyingTotals(transactions).expenses;
  const days = daysInRange(range);
  return days > 0 ? Math.round(total / days) : 0;
}

export function daysInRange(range: DateRange): number {
  const from = Date.parse(`${range.from}T00:00:00Z`);
  const to = Date.parse(`${range.to}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, Math.round((to - from) / 86_400_000) + 1);
}
