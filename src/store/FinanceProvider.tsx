import { createContext, useContext, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/data/db";
import {
  accountsWithBalances,
  netWorth as computeNetWorth,
  type NetWorthBreakdown,
} from "@/domain/accounting";
import type {
  Account,
  AccountType,
  Asset,
  Budget,
  Category,
  Goal,
  Liability,
  RecurringRule,
  Transaction,
} from "@/domain/types";

export interface FinanceData {
  loading: boolean;
  accounts: Account[];
  assets: Asset[];
  liabilities: Liability[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  recurring: RecurringRule[];
  netWorth: NetWorthBreakdown;
  balances: Map<string, number>;
  isEmpty: boolean;
}

const FinanceContext = createContext<FinanceData | null>(null);

/**
 * Single live data source for the whole app. Every page derives its figures
 * through the pure domain functions, so numbers can never disagree between
 * screens.
 */
export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const accounts = useLiveQuery(() => db.accounts.toArray(), [], undefined);
  const assets = useLiveQuery(() => db.assets.toArray(), [], undefined);
  const liabilities = useLiveQuery(() => db.liabilities.toArray(), [], undefined);
  const categories = useLiveQuery(() => db.categories.toArray(), [], undefined);
  const transactions = useLiveQuery(() => db.transactions.toArray(), [], undefined);
  const budgets = useLiveQuery(() => db.budgets.toArray(), [], undefined);
  const goals = useLiveQuery(() => db.goals.toArray(), [], undefined);
  const recurring = useLiveQuery(() => db.recurringRules.toArray(), [], undefined);

  const loading =
    accounts === undefined ||
    assets === undefined ||
    liabilities === undefined ||
    categories === undefined ||
    transactions === undefined ||
    budgets === undefined ||
    goals === undefined ||
    recurring === undefined;

  const value = useMemo<FinanceData>(() => {
    const acc = accounts ?? [];
    const assetsArr = assets ?? [];
    const liab = liabilities ?? [];
    const cats = categories ?? [];
    const txs = transactions ?? [];
    const buds = budgets ?? [];
    const gls = goals ?? [];
    const recs = recurring ?? [];

    const withBalances = accountsWithBalances(acc, txs);
    const balances = new Map<string, number>(withBalances.map((a) => [a.id, a.balance]));

    const sortAccounts = [...acc].sort((a, b) => orderType(a.type) - orderType(b.type) || a.name.localeCompare(b.name));

    return {
      loading,
      accounts: sortAccounts,
      assets: assetsArr,
      liabilities: liab,
      categories: cats,
      transactions: txs,
      budgets: buds,
      goals: gls,
      recurring: recs,
      netWorth: computeNetWorth(acc, assetsArr, liab, txs),
      balances,
      isEmpty:
        acc.length === 0 &&
        assetsArr.length === 0 &&
        liab.length === 0 &&
        txs.length === 0 &&
        cats.length === 0 &&
        buds.length === 0 &&
        gls.length === 0,
    };
  }, [accounts, assets, liabilities, categories, transactions, budgets, goals, recurring, loading]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

function orderType(type: AccountType): number {
  return { cash: 0, bank: 1, savings: 2, other: 3 }[type];
}

export function useFinance(): FinanceData {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used within FinanceProvider");
  return ctx;
}
