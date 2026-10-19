/** OUSCAP domain types. All money is integer DZD (no cents in this version). */

export type ISODate = string; // "YYYY-MM-DD"
export type ID = string;

export type AccountType = "cash" | "bank" | "savings" | "other";
export type LiabilityType = "loan" | "credit" | "other";

/** Financial context separates personal life from income-generating work. */
export type Context = "personal" | "freelance" | "startup";

export type TxType = "income" | "expense" | "transfer" | "adjustment";

export interface Account {
  id: ID;
  name: string;
  type: AccountType;
  /** Opening balance in DZD; may be negative to model overdrafts. */
  openingBalance: number;
  currency: "DZD";
  archived: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** A tracked asset that is not a spendable account (e.g. equipment, property). */
export interface Asset {
  id: ID;
  name: string;
  /** Estimated current value in DZD. */
  value: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** A tracked liability (money owed). */
export interface Liability {
  id: ID;
  name: string;
  type: LiabilityType;
  /** Outstanding balance in DZD (positive number = amount owed). */
  balance: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: ID;
  name: string;
  /** Categories are either income or expense flavored. */
  kind: "income" | "expense";
  /** Sensible default context, still overridable per transaction. */
  context: Context;
  archived: boolean;
  createdAt: string;
}

export interface Transaction {
  id: ID;
  type: TxType;
  /** Always a positive integer DZD amount. Direction is implied by type. */
  amount: number;
  date: ISODate;
  /** Source account (expense/income/transfer-from) — absent for standalone adjustments added to an asset. */
  accountId: ID | null;
  /** Destination account, transfers only. */
  toAccountId?: ID | null;
  /** For `adjustment`, the delta applied to the account's balance. */
  categoryId?: ID | null;
  description?: string;
  notes?: string;
  tags?: string[];
  context: Context;
  /** Idempotency / linkage marker for recurring generation and transfers. */
  groupId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: ID;
  categoryId: ID;
  /** Monthly limit in DZD. */
  limit: number;
  /** Utilization percentage at/above which a warning fires (default 80). */
  warnAt: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type GoalStatus = "active" | "paused" | "achieved" | "archived";

export interface Goal {
  id: ID;
  name: string;
  target: number;
  /** Explicit contributions in DZD. Never inferred from transfers. */
  contributed: number;
  targetDate?: ISODate | null;
  notes?: string;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

export type Recurrence =
  | { freq: "weekly"; interval: number }
  | { freq: "monthly"; interval: number; day?: number }
  | { freq: "annual"; interval: number };

export interface RecurringRule {
  id: ID;
  template: {
    type: Exclude<TxType, "adjustment">;
    amount: number;
    accountId: ID | null;
    toAccountId?: ID | null;
    categoryId?: ID | null;
    description?: string;
    context: Context;
    tags?: string[];
  };
  recurrence: Recurrence;
  startDate: ISODate;
  endDate?: ISODate | null;
  /** Next date the rule is expected to fire. */
  nextDate: ISODate;
  /** Last date successfully materialized — prevents duplicate generation. */
  lastRunDate?: ISODate | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id: "app";
  theme: "dark" | "light" | "system";
  dateFormat: "yyyy-MM-dd" | "dd/MM/yyyy";
  monthStartDay: number;
  currency: "DZD";
  onboarded: boolean;
  lastBackupAt?: string | null;
  /** Prospective net-worth snapshots, collected forward in time only. */
  netWorthSnapshots: NetWorthSnapshot[];
}

/**
 * A net-worth snapshot taken prospectively. We never fabricate history: the
 * series begins on the day OUSCAP starts recording and is labelled as such.
 */
export interface NetWorthSnapshot {
  date: ISODate;
  assets: number;
  liabilities: number;
}

export const CONTEXT_LABEL: Record<Context, string> = {
  personal: "Personal",
  freelance: "Freelance",
  startup: "Startup",
};

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  cash: "Cash",
  bank: "Bank",
  savings: "Savings",
  other: "Other",
};

export const TX_TYPE_LABEL: Record<TxType, string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
  adjustment: "Adjustment",
};
