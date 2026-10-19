import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { transactionSchema } from "@/domain/schemas";
import type { Context, Transaction, TxType } from "@/domain/types";
import { CONTEXT_LABEL, TX_TYPE_LABEL } from "@/domain/types";
import type { FinanceData } from "@/store/FinanceProvider";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { todayISO } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { parseAmount } from "@/domain/money";

/** Raw form shape — amount is a string in the DOM and integer-converted on submit. */
interface FormValues {
  type: TxType;
  amount: string;
  date: string;
  accountId: string;
  toAccountId: string;
  categoryId: string;
  description: string;
  notes: string;
  tags: string;
  context: Context;
}

const TX_TYPES: TxType[] = ["expense", "income", "transfer", "adjustment"];

function replaceLeadingMinus(value: string): string {
  return value.trim().replace(/^-/, "");
}

/**
 * Handles both create and edit. Every value is validated by the shared Zod
 * schema; the amount is parsed to a whole-dinar integer with `parseAmount`.
 */
export function TransactionForm({
  finance,
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  finance: FinanceData;
  initial?: Transaction | null;
  onSubmit: (tx: Omit<Transaction, "id" | "createdAt" | "updatedAt">) => Promise<void> | void;
  onCancel: () => void;
  submitting?: boolean;
}) {
  const activeAccounts = useMemo(
    () => finance.accounts.filter((a) => !a.archived),
    [finance.accounts],
  );
  const categories = useMemo(
    () => finance.categories.filter((c) => !c.archived),
    [finance.categories],
  );

  const defaults: FormValues = {
    type: initial?.type ?? "expense",
    amount: initial ? String(initial.amount) : "",
    date: initial?.date ?? todayISO(),
    accountId: initial?.accountId ?? activeAccounts[0]?.id ?? "",
    toAccountId: initial?.toAccountId ?? "",
    categoryId: initial?.categoryId ?? "",
    description: initial?.description ?? "",
    notes: initial?.notes ?? "",
    tags: initial?.tags?.join(", ") ?? "",
    context: initial?.context ?? "personal",
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: defaults });

  const type = watch("type");
  const context = watch("context");

  const relevantCategories = categories.filter((c) =>
    type === "income" ? c.kind === "income" : c.kind === "expense",
  );

  const submit = handleSubmit(async (values) => {
    // Adjustments carry an explicit signed delta; all other types are positive.
    const isAdjustment = values.type === "adjustment";
    const raw = values.amount.trim();
    let amount: number | null;
    if (isAdjustment) {
      const negative = raw.startsWith("-");
      const magnitude = parseAmount(replaceLeadingMinus(raw));
      amount = magnitude === null ? null : negative ? -magnitude : magnitude;
      if (amount === 0) amount = null;
    } else {
      amount = parseAmount(raw);
    }
    if (amount === null) {
      setError("amount", {
        message: isAdjustment
          ? "Enter a non-zero whole-dinar adjustment"
          : "Enter a positive whole-dinar amount",
      });
      return;
    }
    if (!isAdjustment && amount <= 0) {
      setError("amount", { message: "Enter a positive whole-dinar amount" });
      return;
    }
    const candidate = {
      type: values.type,
      amount,
      date: values.date,
      accountId: values.accountId || null,
      toAccountId: values.type === "transfer" ? values.toAccountId || null : null,
      categoryId: values.type === "adjustment" ? null : values.categoryId || null,
      description: values.description || undefined,
      notes: values.notes || undefined,
      tags: values.tags
        ? values.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
      context: values.context,
      groupId: initial?.groupId ?? null,
    };
    const parsed = transactionSchema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const path = issue.path[0] as keyof FormValues | undefined;
        if (path) setError(path, { message: issue.message });
      }
      return;
    }
    await onSubmit(candidate);
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Type selector — segmented control */}
      <div className="grid grid-cols-4 gap-px bg-line">
        {TX_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setValue("type", t);
              if (t === "adjustment") setValue("categoryId", "");
            }}
            className={cn(
              "bg-surface py-2 text-xs font-medium transition-colors",
              type === t ? "bg-fg text-ink" : "text-muted hover:text-fg",
            )}
          >
            {TX_TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Amount (DZD)" error={errors.amount?.message}>
          <Input
            inputMode="numeric"
            autoFocus
            placeholder="0"
            className="text-lg"
            {...register("amount")}
          />
        </Field>
        <Field label="Date" error={errors.date?.message}>
          <Input type="date" {...register("date")} />
        </Field>
      </div>

      {type === "adjustment" ? (
        <p className="text-2xs leading-relaxed text-muted">
          Adjustments explicitly correct a balance. Enter a positive amount to increase it, or prefix with a minus
          (e.g. -5000) to decrease it. Adjustments are never counted as spending.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={type === "transfer" ? "From account" : "Account"} error={errors.accountId?.message}>
          <Select {...register("accountId")}>
            <option value="">Select account…</option>
            {activeAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>

        {type === "transfer" ? (
          <Field label="To account" error={errors.toAccountId?.message}>
            <Select {...register("toAccountId")}>
              <option value="">Select account…</option>
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : type === "adjustment" ? null : (
          <Field label="Category" error={errors.categoryId?.message}>
            <Select {...register("categoryId")}>
              <option value="">Select category…</option>
              {relevantCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      {type !== "adjustment" ? (
        <Field label="Financial context">
          <div className="grid grid-cols-3 gap-px bg-line">
            {(["personal", "freelance", "startup"] as Context[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setValue("context", c)}
                className={cn(
                  "bg-surface py-2 text-xs transition-colors",
                  context === c ? "bg-surface-raised text-fg" : "text-muted hover:text-fg",
                )}
              >
                {CONTEXT_LABEL[c]}
              </button>
            ))}
          </div>
        </Field>
      ) : null}

      <Field label="Description" error={errors.description?.message}>
        <Input placeholder="Optional" {...register("description")} />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Tags" hint="Comma separated" error={errors.tags?.message}>
          <Input placeholder="e.g. urgent, work" {...register("tags")} />
        </Field>
      </div>

      <Field label="Notes" error={errors.notes?.message}>
        <Textarea placeholder="Optional" {...register("notes")} />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={submitting}>
          {initial ? "Save changes" : "Add transaction"}
        </Button>
      </div>
    </form>
  );
}
