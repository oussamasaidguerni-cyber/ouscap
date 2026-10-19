import { db } from "./db";
import type {
  Account,
  Asset,
  Budget,
  Category,
  Context,
  Goal,
  ID,
  Liability,
  RecurringRule,
  Transaction,
} from "@/domain/types";

/** Stable, sortable-enough id generator (crypto.randomUUID when available). */
export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const now = () => new Date().toISOString();

/* ------------------------------------------------------------------ *
 * Accounts
 * ------------------------------------------------------------------ */

export const accountsRepo = {
  all: () => db.accounts.toArray(),
  active: () => db.accounts.filter((a) => !a.archived).toArray(),
  get: (id: ID) => db.accounts.get(id),
  async create(input: Omit<Account, "id" | "createdAt" | "updatedAt" | "currency" | "archived"> & Partial<Pick<Account, "archived">>): Promise<Account> {
    const account: Account = {
      id: newId(),
      currency: "DZD",
      archived: input.archived ?? false,
      createdAt: now(),
      updatedAt: now(),
      ...input,
    };
    await db.accounts.add(account);
    return account;
  },
  async update(id: ID, patch: Partial<Account>): Promise<void> {
    await db.accounts.update(id, { ...patch, updatedAt: now() });
  },
  async archive(id: ID, archived = true): Promise<void> {
    await db.accounts.update(id, { archived, updatedAt: now() });
  },
  /** Deletes an account only if it has no transactions; otherwise archives it. */
  async remove(id: ID): Promise<{ deleted: boolean; archived: boolean }> {
    const count = await db.transactions
      .filter((t) => t.accountId === id || t.toAccountId === id)
      .count();
    if (count > 0) {
      await this.archive(id, true);
      return { deleted: false, archived: true };
    }
    await db.accounts.delete(id);
    return { deleted: true, archived: false };
  },
};

/* ------------------------------------------------------------------ *
 * Assets & liabilities
 * ------------------------------------------------------------------ */

export const assetsRepo = {
  all: () => db.assets.toArray(),
  async create(input: Omit<Asset, "id" | "createdAt" | "updatedAt">): Promise<Asset> {
    const asset: Asset = { id: newId(), createdAt: now(), updatedAt: now(), ...input };
    await db.assets.add(asset);
    return asset;
  },
  async update(id: ID, patch: Partial<Asset>): Promise<void> {
    await db.assets.update(id, { ...patch, updatedAt: now() });
  },
  remove: (id: ID) => db.assets.delete(id),
};

export const liabilitiesRepo = {
  all: () => db.liabilities.toArray(),
  async create(input: Omit<Liability, "id" | "createdAt" | "updatedAt">): Promise<Liability> {
    const liability: Liability = { id: newId(), createdAt: now(), updatedAt: now(), ...input };
    await db.liabilities.add(liability);
    return liability;
  },
  async update(id: ID, patch: Partial<Liability>): Promise<void> {
    await db.liabilities.update(id, { ...patch, updatedAt: now() });
  },
  remove: (id: ID) => db.liabilities.delete(id),
};

/* ------------------------------------------------------------------ *
 * Categories
 * ------------------------------------------------------------------ */

export const categoriesRepo = {
  all: () => db.categories.toArray(),
  active: () => db.categories.filter((c) => !c.archived).toArray(),
  async create(input: Omit<Category, "id" | "createdAt" | "archived">): Promise<Category> {
    const category: Category = {
      id: newId(),
      archived: false,
      createdAt: now(),
      ...input,
    };
    await db.categories.add(category);
    return category;
  },
  async update(id: ID, patch: Partial<Category>): Promise<void> {
    await db.categories.update(id, patch);
  },
  async archive(id: ID, archived = true): Promise<void> {
    await db.categories.update(id, { archived });
  },
  /**
   * Deleting a category keeps the transactions that referenced it (history is
   * preserved); those transactions simply become Uncategorized.
   */
  async remove(id: ID): Promise<void> {
    await db.transactions
      .filter((t) => t.categoryId === id)
      .modify({ categoryId: null, updatedAt: now() });
    await db.budgets.where("categoryId").equals(id).delete();
    await db.categories.delete(id);
  },
};

/* ------------------------------------------------------------------ *
 * Transactions
 * ------------------------------------------------------------------ */

export const transactionsRepo = {
  all: () => db.transactions.toArray(),
  byRange: (from: string, to: string) =>
    db.transactions.where("date").between(from, to, true, true).toArray(),
  get: (id: ID) => db.transactions.get(id),
  async create(input: Omit<Transaction, "id" | "createdAt" | "updatedAt">): Promise<Transaction> {
    const tx: Transaction = { id: newId(), createdAt: now(), updatedAt: now(), ...input };
    await db.transactions.add(tx);
    return tx;
  },
  async update(id: ID, patch: Partial<Transaction>): Promise<void> {
    await db.transactions.update(id, { ...patch, updatedAt: now() });
  },
  remove: (id: ID) => db.transactions.delete(id),
  /** Restore a previously deleted transaction verbatim (undo). */
  async restore(tx: Transaction): Promise<void> {
    await db.transactions.put(tx);
  },
  /** Copy a transaction under a fresh id, preserving its values. */
  async duplicate(id: ID): Promise<Transaction | null> {
    const source = await db.transactions.get(id);
    if (!source) return null;
    const copy: Transaction = {
      ...source,
      id: newId(),
      createdAt: now(),
      updatedAt: now(),
      // A duplicated transfer must not share the original's linkage group.
      groupId: null,
    };
    await db.transactions.add(copy);
    return copy;
  },
  /** Remove a transfer and its linked leg together. */
  async removeTransferGroup(groupId: string): Promise<void> {
    await db.transactions.where("groupId").equals(groupId).delete();
  },
};

/* ------------------------------------------------------------------ *
 * Budgets
 * ------------------------------------------------------------------ */

export const budgetsRepo = {
  all: () => db.budgets.toArray(),
  active: () => db.budgets.filter((b) => b.active).toArray(),
  async create(input: Omit<Budget, "id" | "createdAt" | "updatedAt">): Promise<Budget> {
    const budget: Budget = { id: newId(), createdAt: now(), updatedAt: now(), ...input };
    await db.budgets.add(budget);
    return budget;
  },
  async update(id: ID, patch: Partial<Budget>): Promise<void> {
    await db.budgets.update(id, { ...patch, updatedAt: now() });
  },
  remove: (id: ID) => db.budgets.delete(id),
  byCategory: (categoryId: ID) => db.budgets.where("categoryId").equals(categoryId).toArray(),
};

/* ------------------------------------------------------------------ *
 * Goals
 * ------------------------------------------------------------------ */

export const goalsRepo = {
  all: () => db.goals.toArray(),
  async create(input: Omit<Goal, "id" | "createdAt" | "updatedAt">): Promise<Goal> {
    const goal: Goal = { id: newId(), createdAt: now(), updatedAt: now(), ...input };
    await db.goals.add(goal);
    return goal;
  },
  async update(id: ID, patch: Partial<Goal>): Promise<void> {
    await db.goals.update(id, { ...patch, updatedAt: now() });
  },
  remove: (id: ID) => db.goals.delete(id),
  /** Explicit contribution by the user — never inferred from a transfer. */
  async contribute(id: ID, amount: number): Promise<void> {
    const goal = await db.goals.get(id);
    if (!goal) return;
    await db.goals.update(id, {
      contributed: goal.contributed + amount,
      updatedAt: now(),
    });
  },
};

/* ------------------------------------------------------------------ *
 * Recurring rules
 * ------------------------------------------------------------------ */

export const recurringRepo = {
  all: () => db.recurringRules.toArray(),
  due: (date: string) => db.recurringRules.filter((r) => r.enabled && r.nextDate <= date).toArray(),
  async create(input: Omit<RecurringRule, "id" | "createdAt" | "updatedAt">): Promise<RecurringRule> {
    const rule: RecurringRule = { id: newId(), createdAt: now(), updatedAt: now(), ...input };
    await db.recurringRules.add(rule);
    return rule;
  },
  async update(id: ID, patch: Partial<RecurringRule>): Promise<void> {
    await db.recurringRules.update(id, { ...patch, updatedAt: now() });
  },
  remove: (id: ID) => db.recurringRules.delete(id),
};

/* ------------------------------------------------------------------ *
 * Settings
 * ------------------------------------------------------------------ */

export const DEFAULT_SETTINGS = (): import("@/domain/types").AppSettings => ({
  id: "app",
  theme: "dark",
  dateFormat: "yyyy-MM-dd",
  monthStartDay: 1,
  currency: "DZD",
  onboarded: false,
  lastBackupAt: null,
  netWorthSnapshots: [],
});

export const settingsRepo = {
  async get(): Promise<import("@/domain/types").AppSettings> {
    const existing = await db.settings.get("app");
    if (existing) return existing;
    const fresh = DEFAULT_SETTINGS();
    await db.settings.put(fresh);
    return fresh;
  },
  async update(patch: Partial<import("@/domain/types").AppSettings>): Promise<void> {
    await db.settings.update("app", patch);
  },
};

export type { Context };
