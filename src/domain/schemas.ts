import { z } from "zod";
import type { Context, TxType } from "@/domain/types";

const amountSchema = z
  .number({ error: "Enter an amount" })
  .int("Amount must be a whole dinar value")
  .refine((n) => n !== 0, "Amount cannot be zero")
  .refine((n) => Math.abs(n) <= 1_000_000_000_000, "Amount is unrealistically large");

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD format")
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), "Invalid date");

export const contextSchema = z.enum(["personal", "freelance", "startup"]) satisfies z.ZodType<Context>;

export const accountSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  type: z.enum(["cash", "bank", "savings", "other"]),
  openingBalance: z.number().int().safe(),
  notes: z.string().max(300).optional().or(z.literal("")),
});

export const transactionSchema = z
  .object({
    type: z.enum(["income", "expense", "transfer", "adjustment"]) satisfies z.ZodType<TxType>,
    amount: amountSchema,
    date: dateSchema,
    accountId: z.string().min(1).nullable(),
    toAccountId: z.string().min(1).nullable().optional(),
    categoryId: z.string().min(1).nullable().optional(),
    description: z.string().max(120).optional().or(z.literal("")),
    notes: z.string().max(500).optional().or(z.literal("")),
    tags: z.array(z.string().max(30)).max(12).optional(),
    context: contextSchema,
  })
  .superRefine((tx, ctx) => {
    if (tx.type === "adjustment") {
      if (tx.amount === 0) {
        ctx.addIssue({ code: "custom", message: "Adjustment must be non-zero", path: ["amount"] });
      }
    } else if (tx.amount <= 0) {
      ctx.addIssue({ code: "custom", message: "Amount must be greater than zero", path: ["amount"] });
    }

    if (tx.type === "transfer") {
      if (!tx.accountId) {
        ctx.addIssue({ code: "custom", message: "Choose a source account", path: ["accountId"] });
      }
      if (!tx.toAccountId) {
        ctx.addIssue({ code: "custom", message: "Choose a destination account", path: ["toAccountId"] });
      }
      if (tx.accountId && tx.toAccountId && tx.accountId === tx.toAccountId) {
        ctx.addIssue({
          code: "custom",
          message: "Source and destination must differ",
          path: ["toAccountId"],
        });
      }
    } else if (!tx.accountId) {
      ctx.addIssue({ code: "custom", message: "Choose an account", path: ["accountId"] });
    }

    if ((tx.type === "income" || tx.type === "expense") && !tx.categoryId) {
      ctx.addIssue({ code: "custom", message: "Choose a category", path: ["categoryId"] });
    }

    if (tx.type === "adjustment" && tx.accountId === null) {
      ctx.addIssue({ code: "custom", message: "Adjustments apply to an account", path: ["accountId"] });
    }
  });

export const budgetSchema = z.object({
  categoryId: z.string().min(1, "Choose a category"),
  limit: z.number().int().positive("Limit must be greater than zero"),
  warnAt: z.number().int().min(1).max(100),
  active: z.boolean(),
});

export const goalSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  target: z.number().int().positive("Target must be greater than zero"),
  contributed: z.number().int().min(0),
  targetDate: dateSchema.nullable().optional(),
  notes: z.string().max(300).optional().or(z.literal("")),
  status: z.enum(["active", "paused", "achieved", "archived"]),
});

export const assetSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  value: z.number().int().min(0),
  notes: z.string().max(300).optional().or(z.literal("")),
});

export const liabilitySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  type: z.enum(["loan", "credit", "other"]),
  balance: z.number().int().min(0),
  notes: z.string().max(300).optional().or(z.literal("")),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40),
  kind: z.enum(["income", "expense"]),
  context: contextSchema,
});

export const recurringSchema = z.object({
  type: z.enum(["income", "expense", "transfer"]),
  amount: amountSchema,
  accountId: z.string().min(1, "Choose an account"),
  toAccountId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  description: z.string().max(120).optional().or(z.literal("")),
  context: contextSchema,
  freq: z.enum(["weekly", "monthly", "annual"]),
  interval: z.number().int().min(1).max(12),
  startDate: dateSchema,
  endDate: dateSchema.nullable().optional(),
});

export type TransactionInput = z.input<typeof transactionSchema>;
export type AccountInput = z.input<typeof accountSchema>;
export type GoalInput = z.input<typeof goalSchema>;
export type BudgetInput = z.input<typeof budgetSchema>;
export type RecurringInput = z.input<typeof recurringSchema>;
