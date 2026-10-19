import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Plus } from "lucide-react";
import { useFinance } from "@/store/FinanceProvider";
import { usePeriod } from "@/store/PeriodProvider";
import { PageHeader, PeriodFilter } from "@/components/layout/PageHeader";
import { Stat, StatCell, StatRow } from "@/components/ui/Stat";
import { Button, Divider, EmptyState, Skeleton, SkeletonList, SkeletonStats } from "@/components/ui";
import { CategoryBarChart, IncomeExpenseChart } from "@/components/charts/Charts";
import {
  budgetProgress,
  filterByRange,
  goalProgress,
  monthlySeries,
  netCashFlow,
  qualifyingTotals,
  spendingByCategory,
  averageDailyExpense,
} from "@/domain/accounting";
import { formatDZD, percent } from "@/domain/money";
import { CONTEXT_LABEL } from "@/domain/types";
import { todayISO } from "@/lib/dates";
import { transactionsRepo } from "@/data/repositories";
import { TransactionForm } from "@/components/TransactionForm";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { TxRow } from "@/components/TxRow";
import { SeedPrompt } from "@/components/SeedPrompt";

export function OverviewPage() {
  const finance = useFinance();
  const { range } = usePeriod();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);

  const inPeriod = useMemo(() => filterByRange(finance.transactions, range), [finance.transactions, range]);
  const totals = useMemo(() => qualifyingTotals(inPeriod), [inPeriod]);
  const flow = netCashFlow(totals);
  const series = useMemo(() => monthlySeries(finance.transactions), [finance.transactions]);
  const categorySpend = useMemo(
    () => spendingByCategory(inPeriod, finance.categories),
    [inPeriod, finance.categories],
  );
  const avgDaily = useMemo(() => averageDailyExpense(inPeriod, range), [inPeriod, range]);

  const budgetRows = useMemo(
    () =>
      finance.budgets
        .filter((b) => b.active)
        .map((b) => budgetProgress(b, finance.categories, inPeriod)),
    [finance.budgets, finance.categories, inPeriod],
  );

  const activeGoals = finance.goals.filter((g) => g.status === "active").slice(0, 3);
  const recent = useMemo(
    () => [...finance.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
    [finance.transactions],
  );

  const upcoming = useMemo(
    () =>
      finance.recurring
        .filter((r) => r.enabled)
        .sort((a, b) => a.nextDate.localeCompare(b.nextDate))
        .slice(0, 5),
    [finance.recurring],
  );

  if (finance.loading) {
    return <OverviewSkeleton />;
  }

  if (finance.isEmpty) {
    return (
      <>
        <PageHeader title="Overview" description="Your financial command center." />
        <SeedPrompt />
      </>
    );
  }

  const accountName = (id: string | null) => finance.accounts.find((a) => a.id === id)?.name ?? "—";
  const categoryName = (id: string | null | undefined) =>
    finance.categories.find((c) => c.id === id)?.name ?? "Uncategorized";

  if (finance.loading) {
    return (
      <>
        <PageHeader title="Overview" description="Loading your figures…" />
        <SkeletonStats cells={4} />
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card p-4">
            <Skeleton className="mb-3 h-3 w-1/4" />
            <Skeleton className="h-56 w-full" />
          </div>
          <div className="card p-4">
            <Skeleton className="mb-3 h-3 w-1/4" />
            <Skeleton className="h-56 w-full" />
          </div>
        </div>
        <div className="mt-4">
          <SkeletonList rows={5} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Overview"
        description={`${range.from} → ${range.to}`}
        actions={
          <>
            <PeriodFilter />
            <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
              <Plus size={14} /> Add
            </Button>
          </>
        }
      />

      {/* Primary figures */}
      <StatRow className="mb-4 border border-line">
        <StatCell>
          <Stat label="Net worth" value={formatDZD(finance.netWorth.netWorth)} size="lg" />
        </StatCell>
        <StatCell>
          <Stat label="Tracked assets" value={formatDZD(finance.netWorth.totalAssets)} />
        </StatCell>
        <StatCell>
          <Stat label="Tracked liabilities" value={formatDZD(finance.netWorth.totalLiabilities)} />
        </StatCell>
        <StatCell>
          <Stat
            label="Net cash flow"
            value={formatDZD(flow, { sign: true })}
            delta={flow >= 0 ? "Positive flow this period" : "Negative flow this period"}
            deltaTone={flow >= 0 ? "pos" : "neg"}
          />
        </StatCell>
      </StatRow>

      <StatRow className="mb-6 border border-line">
        <StatCell>
          <Stat label="Income" value={formatDZD(totals.income)} size="sm" />
        </StatCell>
        <StatCell>
          <Stat label="Expenses" value={formatDZD(totals.expenses)} size="sm" />
        </StatCell>
        <StatCell>
          <Stat label="Avg daily expense" value={formatDZD(avgDaily)} size="sm" />
        </StatCell>
        <StatCell>
          <Stat
            label="Savings rate"
            value={totals.income > 0 ? `${percent(flow, totals.income)}%` : "—"}
            size="sm"
          />
        </StatCell>
      </StatRow>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Trend chart */}
        <section className="card col-span-1 p-4 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="stat-label">Income vs expenses</h2>
            <span className="text-2xs text-muted">All recorded months</span>
          </div>
          {series.length > 1 ? (
            <IncomeExpenseChart data={series} />
          ) : (
            <EmptyState
              title="Not enough history yet"
              description="The trend appears once you have transactions in more than one month. OUSCAP never fabricates past data."
            />
          )}
        </section>

        {/* Spending by category */}
        <section className="card p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="stat-label">Spending by category</h2>
            <span className="text-2xs text-muted">This period</span>
          </div>
          {categorySpend.length > 0 ? (
            <CategoryBarChart data={categorySpend} />
          ) : (
            <EmptyState title="No expenses yet" description="Expenses in the selected period will break down here." />
          )}
        </section>

        {/* Budgets */}
        <section className="card p-4 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="stat-label">Budget utilization</h2>
            <Link to="/budgets" className="flex items-center gap-1 text-2xs text-muted hover:text-fg">
              Manage <ArrowRight size={12} />
            </Link>
          </div>
          {budgetRows.length > 0 ? (
            <div className="space-y-3">
              {budgetRows.map((row) => (
                <div key={row.budget.id}>
                  <div className="mb-1 flex items-baseline justify-between text-xs">
                    <span className="text-fg">{row.categoryName}</span>
                    <span className="tnum text-muted">
                      {formatDZD(row.spent)} / {formatDZD(row.budget.limit)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-line">
                    <div
                      className={
                        row.status === "over" ? "h-full bg-neg" : row.status === "warning" ? "h-full bg-warn" : "h-full bg-fg"
                      }
                      style={{ width: `${Math.min(100, row.utilization)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No budgets set"
              description="Set monthly category limits to watch your spending."
              action={
                <Link to="/budgets">
                  <Button size="sm">Create a budget</Button>
                </Link>
              }
            />
          )}
        </section>

        {/* Goals */}
        <section className="card p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="stat-label">Savings goals</h2>
            <Link to="/goals" className="flex items-center gap-1 text-2xs text-muted hover:text-fg">
              All <ArrowRight size={12} />
            </Link>
          </div>
          {activeGoals.length > 0 ? (
            <div className="space-y-4">
              {activeGoals.map((goal) => {
                const p = goalProgress(goal, todayISO());
                return (
                  <div key={goal.id}>
                    <div className="mb-1 flex items-baseline justify-between text-xs">
                      <span className="text-fg">{goal.name}</span>
                      <span className="tnum text-muted">{p.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-line">
                      <div className="h-full bg-fg" style={{ width: `${p.progress}%` }} />
                    </div>
                    <p className="mt-1 tnum text-2xs text-muted">{formatDZD(p.remaining)} remaining</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No active goals" description="Define a target and track progress." />
          )}
        </section>

        {/* Recent transactions */}
        <section className="card p-4 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="stat-label">Recent transactions</h2>
            <Link to="/transactions" className="flex items-center gap-1 text-2xs text-muted hover:text-fg">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {recent.length > 0 ? (
            <div>
              {recent.map((tx, i) => (
                <div key={tx.id}>
                  {i > 0 ? <Divider /> : null}
                  <TxRow tx={tx} accountName={accountName} categoryName={categoryName} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No transactions yet" description="Add your first income or expense to see it here." />
          )}
        </section>

        {/* Upcoming recurring */}
        <section className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="stat-label">Upcoming recurring</h2>
            <Link to="/transactions" className="flex items-center gap-1 text-2xs text-muted hover:text-fg">
              Rules <ArrowRight size={12} />
            </Link>
          </div>
          {upcoming.length > 0 ? (
            <ul className="space-y-2.5">
              {upcoming.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="truncate text-fg">{r.template.description || CONTEXT_LABEL[r.template.context]}</p>
                    <p className="tnum text-2xs text-muted">{r.nextDate}</p>
                  </div>
                  <span className="tnum shrink-0 text-muted">{formatDZD(r.template.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nothing scheduled" description="Recurring bills and income appear here." />
          )}
        </section>
      </div>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add transaction">
        <TransactionForm
          finance={finance}
          onCancel={() => setAddOpen(false)}
          onSubmit={async (tx) => {
            await transactionsRepo.create(tx);
            toast("Transaction added", "pos");
            setAddOpen(false);
          }}
        />
      </Dialog>
    </>
  );
}

function OverviewSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 bg-surface-raised" />
      <div className="grid grid-cols-4 gap-px bg-line">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-surface" />
        ))}
      </div>
      <div className="h-64 bg-surface" />
    </div>
  );
}
