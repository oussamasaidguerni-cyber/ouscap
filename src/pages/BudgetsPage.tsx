import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { useFinance } from "@/store/FinanceProvider";
import { usePeriod } from "@/store/PeriodProvider";
import { PageHeader, PeriodFilter } from "@/components/layout/PageHeader";
import { Button, EmptyState, Field, Input, Select, Skeleton, SkeletonStats } from "@/components/ui";
import { Dialog, ConfirmDialog } from "@/components/ui/Dialog";
import { RowMenu } from "@/components/ui/RowMenu";
import { budgetProgress } from "@/domain/accounting";
import { formatDZD, percent } from "@/domain/money";
import type { Budget } from "@/domain/types";
import { budgetsRepo } from "@/data/repositories";
import { useToast } from "@/components/ui/Toast";
import { filterByRange } from "@/domain/accounting";
import { cn } from "@/lib/cn";

export function BudgetsPage() {
  const finance = useFinance();
  const { range } = usePeriod();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Budget | "new" | null>(null);
  const [deleting, setDeleting] = useState<Budget | null>(null);

  const inPeriod = useMemo(() => filterByRange(finance.transactions, range), [finance.transactions, range]);
  const rows = useMemo(
    () => finance.budgets.map((b) => budgetProgress(b, finance.categories, inPeriod)).sort((a, b) => b.utilization - a.utilization),
    [finance.budgets, finance.categories, inPeriod],
  );

  const totalLimit = finance.budgets.filter((b) => b.active).reduce((s, b) => s + b.limit, 0);
  const totalSpent = rows.filter((r) => r.budget.active).reduce((s, r) => s + r.spent, 0);
  const totalRemaining = totalLimit - totalSpent;

  // Runway helpers: how many days are left in the window, and what daily
  // spend keeps the budget on track for the rest of it.
  const daysLeft = useMemo(() => {
    const end = new Date(range.to);
    const today = new Date();
    const diff = Math.ceil((end.getTime() - today.getTime()) / 86_400_000);
    return Math.max(1, diff);
  }, [range.to]);

  if (finance.loading) {
    return (
      <>
        <PageHeader title="Budgets" description="Loading…" />
        <SkeletonStats cells={3} />
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4">
              <Skeleton className="mb-3 h-3 w-1/3" />
              <Skeleton className="mb-2 h-2 w-full" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Budgets"
        description={`Monthly category limits for ${range.from} → ${range.to}`}
        actions={
          <>
            <PeriodFilter />
            <Button variant="primary" size="sm" onClick={() => setEditing("new")}>
              <Plus size={14} /> New budget
            </Button>
          </>
        }
      />

      {finance.budgets.length > 0 ? (
        <div className="card mb-4 grid grid-cols-1 gap-px bg-line sm:grid-cols-3">
          <div className="bg-surface p-4">
            <p className="stat-label mb-1">Allocated</p>
            <p className="tnum text-lg text-fg">{formatDZD(totalLimit)}</p>
          </div>
          <div className="bg-surface p-4">
            <p className="stat-label mb-1">Spent</p>
            <p className="tnum text-lg text-fg">
              {formatDZD(totalSpent)}{" "}
              <span className="text-xs text-muted">({percent(totalSpent, totalLimit)}%)</span>
            </p>
          </div>
          <div className="bg-surface p-4">
            <p className="stat-label mb-1">Runway</p>
            <p className={cn("tnum text-lg", totalRemaining >= 0 ? "text-fg" : "text-neg")}>
              {totalRemaining >= 0 ? formatDZD(totalRemaining) : `${formatDZD(Math.abs(totalRemaining))} over`}
            </p>
            <p className="text-2xs text-muted">{daysLeft} days left in period</p>
          </div>
        </div>
      ) : null}

      {finance.budgets.length === 0 ? (
        <EmptyState
          title="No budgets yet"
          description="Set a monthly limit for a category. Only qualifying expenses count toward it — transfers never inflate spending."
          action={
            <Button variant="primary" onClick={() => setEditing("new")}>
              <Plus size={14} /> Create a budget
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {rows.map((row) => {
            const safeDaily = row.budget.active ? Math.max(0, Math.round(row.remaining / daysLeft)) : 0;
            return (
              <div key={row.budget.id} className="card flex flex-col p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-fg">{row.categoryName}</span>
                      {!row.budget.active ? <span className="text-2xs text-muted">Paused</span> : null}
                    </div>
                    <p className="tnum mt-0.5 text-2xs text-muted">
                      {formatDZD(row.spent)} / {formatDZD(row.budget.limit)}
                    </p>
                  </div>
                  <RowMenu
                    label={`Actions for ${row.categoryName} budget`}
                    actions={[
                      { label: "Edit", icon: Pencil, onSelect: () => setEditing(row.budget) },
                      { label: "Delete", icon: Trash2, tone: "danger", onSelect: () => setDeleting(row.budget) },
                    ]}
                  />
                </div>

                {/* Runway bar with a warn-threshold marker. */}
                <div className="relative h-2 w-full overflow-hidden bg-line">
                  <div
                    className={cn(
                      "h-full",
                      row.status === "over" ? "bg-neg" : row.status === "warning" ? "bg-warn" : "bg-fg",
                    )}
                    style={{ width: `${Math.min(100, row.utilization)}%` }}
                  />
                  <div
                    className="absolute top-0 h-full w-px bg-muted"
                    style={{ left: `${Math.min(100, row.budget.warnAt)}%` }}
                    aria-hidden
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-2xs">
                  <span
                    className={cn(
                      row.status === "over" ? "text-neg" : row.status === "warning" ? "text-warn" : "text-muted",
                    )}
                  >
                    {row.utilization}% used
                    {row.status === "over" ? " · over budget" : row.status === "warning" ? " · near limit" : ""}
                  </span>
                  <span className="tnum text-muted">
                    {row.remaining >= 0
                      ? `${formatDZD(row.remaining)} left · ${formatDZD(safeDaily)}/day`
                      : `${formatDZD(Math.abs(row.remaining))} over`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BudgetDialog open={editing !== null} budget={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) {
            await budgetsRepo.remove(deleting.id);
            toast("Budget deleted", "info");
          }
        }}
        title="Delete budget?"
        description="Existing transactions are untouched; only the limit is removed."
        confirmLabel="Delete"
      />
    </>
  );
}

function BudgetDialog({ open, budget, onClose }: { open: boolean; budget: Budget | "new" | null; onClose: () => void }) {
  const finance = useFinance();
  const { toast } = useToast();
  const isNew = budget === "new";
  const [categoryId, setCategoryId] = useState("");
  const [limit, setLimit] = useState("");
  const [warnAt, setWarnAt] = useState("80");
  const [active, setActive] = useState(true);

  const expenseCategories = finance.categories.filter((c) => c.kind === "expense" && !c.archived);

  useMemo(() => {
    if (budget && budget !== "new") {
      setCategoryId(budget.categoryId);
      setLimit(String(budget.limit));
      setWarnAt(String(budget.warnAt));
      setActive(budget.active);
    } else if (isNew) {
      setCategoryId(expenseCategories[0]?.id ?? "");
      setLimit("");
      setWarnAt("80");
      setActive(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budget, isNew]);

  async function save() {
    const limitNum = Number(limit);
    const warnNum = Number(warnAt);
    if (!categoryId || !Number.isInteger(limitNum) || limitNum <= 0) {
      toast("Choose a category and a positive limit", "neg");
      return;
    }
    const duplicate = finance.budgets.find((b) => b.categoryId === categoryId && (isNew || b.id !== (budget as Budget).id));
    if (duplicate) {
      toast("A budget already exists for that category", "neg");
      return;
    }
    if (isNew) {
      await budgetsRepo.create({ categoryId, limit: limitNum, warnAt: warnNum, active });
    } else if (budget) {
      await budgetsRepo.update(budget.id, { categoryId, limit: limitNum, warnAt: warnNum, active });
    }
    toast(isNew ? "Budget created" : "Budget updated", "pos");
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isNew ? "New budget" : "Edit budget"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save}>
            {isNew ? "Create" : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Category">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Select a category…</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Monthly limit (DZD)">
            <Input value={limit} inputMode="numeric" placeholder="0" onChange={(e) => setLimit(e.target.value)} />
          </Field>
          <Field label="Warn at (%)" hint="Threshold for the warning state.">
            <Input value={warnAt} inputMode="numeric" onChange={(e) => setWarnAt(e.target.value)} />
          </Field>
        </div>
        <button
          type="button"
          onClick={() => setActive((v) => !v)}
          className="flex items-center gap-2 text-xs text-muted"
        >
          {active ? <Check size={14} className="text-pos" /> : <X size={14} />}
          Budget is active
        </button>
      </div>
    </Dialog>
  );
}
