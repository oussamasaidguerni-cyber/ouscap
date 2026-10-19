import Dexie, { type Table } from "dexie";
import type {
  Account,
  AppSettings,
  Asset,
  Budget,
  Category,
  Goal,
  Liability,
  RecurringRule,
  Transaction,
} from "@/domain/types";

/**
 * OUSCAP persistence. Local-first, versioned IndexedDB via Dexie.
 *
 * Schema versions (never mutate an existing version — add a new one):
 *   v1 — accounts, assets, liabilities, categories, transactions, budgets,
 *        goals, recurringRules, settings
 *
 * Financial records are never placed in service-worker caches. This database is
 * the only store of record and lives on the device.
 */
export class OuscapDB extends Dexie {
  accounts!: Table<Account, string>;
  assets!: Table<Asset, string>;
  liabilities!: Table<Liability, string>;
  categories!: Table<Category, string>;
  transactions!: Table<Transaction, string>;
  budgets!: Table<Budget, string>;
  goals!: Table<Goal, string>;
  recurringRules!: Table<RecurringRule, string>;
  settings!: Table<AppSettings, string>;

  constructor(name = "ouscap") {
    super(name);
    this.version(1).stores({
      accounts: "id, name, type, archived",
      assets: "id, name",
      liabilities: "id, name, type",
      categories: "id, name, kind, archived",
      transactions: "id, date, type, accountId, toAccountId, categoryId, context, groupId",
      budgets: "id, categoryId",
      goals: "id, name, status",
      recurringRules: "id, nextDate, enabled",
      settings: "id",
    });
  }
}

export const db = new OuscapDB();

export const TABLES = [
  "accounts",
  "assets",
  "liabilities",
  "categories",
  "transactions",
  "budgets",
  "goals",
  "recurringRules",
  "settings",
] as const;

export type ExportBundle = {
  schemaVersion: number;
  app: "ouscap";
  exportedAt: string;
  data: Record<(typeof TABLES)[number], unknown[]>;
};

/** Human-readable storage estimate, when the browser exposes it. */
export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  const est = await navigator.storage.estimate();
  return { usage: est.usage ?? 0, quota: est.quota ?? 0 };
}

export async function requestPersistence(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  return navigator.storage.persist();
}
