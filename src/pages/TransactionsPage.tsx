import { useMemo, useState } from "react";
import { Plus, Search, Trash2, Pencil, Copy } from "lucide-react";
import { useFinance } from "@/store/FinanceProvider";
import { usePeriod } from "@/store/PeriodProvider";
import { PageHeader, PeriodFilter } from "@/components/layout/PageHeader";
import { Button, EmptyState, Input, Select, Badge, Skeleton, SkeletonList } from "@/components/ui";
import { Dialog } from "@/components/ui/Dialog";
import { RowMenu } from "@/components/ui/RowMenu";
import { TxRow } from "@/components/TxRow";
import { TransactionForm } from "@/components/TransactionForm";
import { filterByRange } from "@/domain/accounting";
import { formatDZD } from "@/domain/money";
import { transactionsRepo } from "@/data/repositories";
import { useToast } from "@/components/ui/Toast";
import { useUiActions } from "@/store/UiActionsProvider";
import { CONTEXT_LABEL, TX_TYPE_LABEL, type Context, type Transaction, type TxType } from "@/domain/types";
import { cn } from "@/lib/cn";
import { RecurringRules } from "@/components/RecurringRules";

type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";
type ViewTab = "list" | "recurring";


export function TransactionsPage() {
  const finance = useFinance();
  const { range } = usePeriod();
  const { toast } = useToast();
  const { announce } = useUiActions();

  const [query, setQuery] = useState("");
  const [type, setType] = useState<TxType | "all">("all");
  const [accountId, setAccountId] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [context, setContext] = useState<Context | "all">("all");
  const [sort, setSort] = useState<SortKey>("date-desc");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [view, setView] = useState<ViewTab>("list");

  const filtered = useMemo(() => {
    const base = filterByRange(finance.transactions, range);
    const q = query.trim().toLowerCase();
    const list = base.filter((tx) => {
      if (type !== "all" && tx.type !== type) return false;
      if (accountId !== "all" && tx.accountId !== accountId && tx.toAccountId !== accountId) return false;
      if (categoryId !== "all" && tx.categoryId !== categoryId) return false;
      if (context !== "all" && tx.context !== context) return false;
      if (q) {
        const haystack = [
          tx.description,
          tx.notes,
          ...(tx.tags ?? []),
          finance.categories.find((c) => c.id === tx.categoryId)?.name,
          finance.accounts.find((a) => a.id === tx.accountId)?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    return list.sort((a, b) => {
      switch (sort) {
        case "date-asc":
          return a.date.localeCompare(b.date);
        case "amount-desc":
          return b.amount - a.amount;
        case "amount-asc":
          return a.amount - b.amount;
        default:
          return b.date.localeCompare(a.date);
      }
    });
  }, [finance.transactions, finance.categories, finance.accounts, range, query, type, accountId, categoryId, context, sort]);

  const accountName = (id: string | null) => finance.accounts.find((a) => a.id === id)?.name ?? "—";
  const categoryName = (id: string | null | undefined) =>
    finance.categories.find((c) => c.id === id)?.name ?? "Uncategorized";

  // Totals for the current filter — recomputed only from what is on screen.
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    let transfers = 0;
    for (const tx of filtered) {
      if (tx.type === "income") income += tx.amount;
      else if (tx.type === "expense") expense += tx.amount;
      else if (tx.type === "transfer") transfers += tx.amount;
    }
    return { income, expense, transfers, net: income - expense };
  }, [filtered]);

  const hasAny = finance.transactions.length > 0;

  /** Delete immediately, but offer a one-tap undo via the toast. */
  const removeWithUndo = async (tx: Transaction) => {
    await transactionsRepo.remove(tx.id);
    toast("Transaction deleted", "info", {
      label: "Undo",
      run: async () => {
        await transactionsRepo.restore(tx);
        toast("Transaction restored", "pos");
        announce("Transaction restored.");
      },
    });
    announce("Transaction deleted. Undo available.");
  };

  if (finance.loading) {
    return (
      <>
        <PageHeader title="Transactions" description="Loading…" />
        <div className="card mb-4 p-3">
          <Skeleton className="h-10 w-full" />
        </div>
        <SkeletonList rows={8} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Transactions"
        description={
          view === "list"
            ? `${range.from} → ${range.to} · ${filtered.length} shown`
            : "Recurring income, expenses, and bills"
        }
        actions={
          <>
            <PeriodFilter />
            <Button variant="primary" size="sm" onClick={() => setEditing(emptyDraft())}>
              <Plus size={14} /> Add
            </Button>
          </>
        }
      />

      <div className="mb-4 flex gap-px bg-line">
        {(["list", "recurring"] as ViewTab[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              "flex-1 py-2 text-xs capitalize transition-colors",
              view === v ? "bg-fg text-ink" : "bg-surface text-muted hover:text-fg",
            )}
          >
            {v === "list" ? "All transactions" : "Recurring"}
          </button>
        ))}
      </div>

      {view === "recurring" ? (
        <RecurringRules />
      ) : (
        <>
      {/* Filters */}
      <div className="card mb-4 p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search descriptions, tags, notes…"
              className="pl-8"
            />
          </div>
          <Select value={type} onChange={(e) => setType(e.target.value as TxType | "all")}>
            <option value="all">All types</option>
            {(Object.keys(TX_TYPE_LABEL) as TxType[]).map((t) => (
              <option key={t} value={t}>
                {TX_TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="all">All accounts</option>
            {finance.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="all">All categories</option>
            {finance.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={context} onChange={(e) => setContext(e.target.value as Context | "all")}>
            <option value="all">All contexts</option>
            {(["personal", "freelance", "startup"] as Context[]).map((c) => (
              <option key={c} value={c}>
                {CONTEXT_LABEL[c]}
              </option>
            ))}
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="amount-desc">Largest amount</option>
            <option value="amount-asc">Smallest amount</option>
          </Select>
        </div>
      </div>

      {/* Sticky summary of exactly what is filtered */}
      <div className="sticky top-0 z-20 -mx-4 mb-4 border-y border-line bg-ink/95 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 text-2xs">
          <span className="text-muted">
            <span className="tnum text-fg">{filtered.length}</span> shown
          </span>
          <div className="flex items-center gap-4">
            <span className="text-muted">
              In <span className="tnum text-pos">{formatDZD(totals.income)}</span>
            </span>
            <span className="text-muted">
              Out <span className="tnum text-neg">{formatDZD(totals.expense)}</span>
            </span>
            <span className="text-muted">
              Net <span className="tnum text-fg">{formatDZD(totals.net)}</span>
            </span>
          </div>
        </div>
      </div>

      {!hasAny ? (
        <EmptyState
          title="No transactions yet"
          description="Record income, expenses, transfers between your accounts, or explicit balance adjustments."
          action={
            <Button variant="primary" onClick={() => setEditing(emptyDraft())}>
              <Plus size={14} /> Add transaction
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No matches" description="Adjust the filters or the selected period." />
      ) : (
        <div className="card divide-y divide-line">
          {filtered.map((tx) => (
            <div key={tx.id} className="group flex items-center gap-1 px-2 sm:px-4">
              <div className="min-w-0 flex-1">
                <TxRow tx={tx} accountName={accountName} categoryName={categoryName} onEdit={() => setEditing(tx)} />
              </div>
              <RowMenu
                label={`Actions for ${tx.description || "transaction"}`}
                actions={[
                  { label: "Edit", icon: Pencil, onSelect: () => setEditing(tx) },
                  {
                    label: "Duplicate",
                    icon: Copy,
                    onSelect: async () => {
                      const copy = await transactionsRepo.duplicate(tx.id);
                      if (copy) toast("Transaction duplicated", "pos");
                    },
                  },
                  { label: "Delete", icon: Trash2, tone: "danger", onSelect: () => removeWithUndo(tx) },
                ]}
              />
            </div>
          ))}
        </div>
      )}
        </>
      )}

      {/* Create / edit */}
      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id.startsWith("draft") ? "Add transaction" : "Edit transaction"}
        description={
          editing && !editing.id.startsWith("draft")
            ? "Editing updates every affected account balance and metric."
            : undefined
        }
      >
        {editing ? (
          <TransactionForm
            finance={finance}
            initial={editing.id.startsWith("draft") ? null : editing}
            onCancel={() => setEditing(null)}
            onSubmit={async (tx) => {
              if (editing.id.startsWith("draft")) {
                await transactionsRepo.create(tx);
                toast("Transaction added", "pos");
              } else {
                await transactionsRepo.update(editing.id, tx);
                toast("Transaction updated", "pos");
              }
              setEditing(null);
            }}
          />
        ) : null}
      </Dialog>

    </>
  );
}

let draftCounter = 0;
function emptyDraft(): Transaction {
  draftCounter += 1;
  return {
    id: `draft-${draftCounter}`,
    type: "expense",
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    accountId: null,
    toAccountId: null,
    categoryId: null,
    context: "personal",
    createdAt: "",
    updatedAt: "",
  };
}

export { Badge };
