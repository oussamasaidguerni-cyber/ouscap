import { Badge } from "@/components/ui";
import { formatDZD } from "@/domain/money";
import { CONTEXT_LABEL, type Transaction } from "@/domain/types";
import { cn } from "@/lib/cn";

/** One transaction line — used on Overview and Transactions lists. */
export function TxRow({
  tx,
  accountName,
  categoryName,
  onEdit,
}: {
  tx: Transaction;
  accountName: (id: string | null) => string;
  categoryName: (id: string | null | undefined) => string;
  onEdit?: () => void;
}) {
  const sign = tx.type === "income" ? "+" : tx.type === "expense" ? "−" : "";
  const amountTone =
    tx.type === "income" ? "text-pos" : tx.type === "expense" ? "text-fg" : "text-muted";

  const label =
    tx.type === "transfer"
      ? `Transfer · ${accountName(tx.accountId)} → ${accountName(tx.toAccountId ?? null)}`
      : tx.type === "adjustment"
        ? `Adjustment · ${accountName(tx.accountId)}`
        : `${categoryName(tx.categoryId)} · ${accountName(tx.accountId)}`;

  return (
    <button
      type="button"
      onClick={onEdit}
      disabled={!onEdit}
      className={cn(
        "flex w-full items-center justify-between gap-3 py-2.5 text-left",
        onEdit && "hover:bg-surface-raised/60",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm text-fg">
            {tx.description || label}
          </span>
          {tx.context !== "personal" ? <Badge>{CONTEXT_LABEL[tx.context]}</Badge> : null}
        </div>
        <p className="truncate text-2xs text-muted">
          {tx.date} · {label}
        </p>
      </div>
      <span className={cn("tnum shrink-0 text-sm font-medium", amountTone)}>
        {sign}
        {formatDZD(tx.amount)}
      </span>
    </button>
  );
}
