import { useMemo, useState } from "react";
import { AlertTriangle, Info, TrendingUp } from "lucide-react";
import { useFinance } from "@/store/FinanceProvider";
import { usePeriod } from "@/store/PeriodProvider";
import { PageHeader, PeriodFilter } from "@/components/layout/PageHeader";
import { EmptyState, Skeleton, SkeletonStats } from "@/components/ui";
import { Stat, StatCell, StatRow } from "@/components/ui/Stat";
import { CategoryBarChart, CategoryDonut, IncomeExpenseChart } from "@/components/charts/Charts";
import { TxRow } from "@/components/TxRow";
import {
  averageDailyExpense,
  buildInsights,
  filterByRange,
  monthlySeries,
  netCashFlow,
  qualifyingTotals,
  spendingByCategory,
  spendingByContext,
  incomeByContext,
} from "@/domain/accounting";
import { formatDZD, percent } from "@/domain/money";
import { CONTEXT_LABEL } from "@/domain/types";
import { todayISO } from "@/lib/dates";

export function InsightsPage() {
  const finance = useFinance();
  const { range } = usePeriod();
  const [drilldown, setDrilldown] = useState<string | null>(null);

  const inPeriod = useMemo(() => filterByRange(finance.transactions, range), [finance.transactions, range]);
  const series = useMemo(() => monthlySeries(finance.transactions), [finance.transactions]);
  const totals = useMemo(() => qualifyingTotals(inPeriod), [inPeriod]);
  const flow = netCashFlow(totals);
  const avgDaily = averageDailyExpense(inPeriod, range);
  const byCategory = useMemo(() => spendingByCategory(inPeriod, finance.categories), [inPeriod, finance.categories]);
  const drilldownTxs = useMemo(() => {
    if (!drilldown) return [];
    const catId = finance.categories.find((c) => c.name === drilldown)?.id;
    return inPeriod
      .filter((t) => t.type === "expense" && t.categoryId === catId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [drilldown, inPeriod, finance.categories]);
  const byContext = useMemo(() => spendingByContext(inPeriod), [inPeriod]);
  const incomeContext = useMemo(() => incomeByContext(inPeriod), [inPeriod]);

  const insights = useMemo(
    () =>
      buildInsights({
        range,
        transactions: inPeriod,
        categories: finance.categories,
        budgets: finance.budgets.filter((b) => b.active),
        series,
        today: todayISO(),
      }),
    [range, inPeriod, finance.categories, finance.budgets, series],
  );

  if (finance.loading) {
    return (
      <>
        <PageHeader title="Insights" description="Loading…" />
        <SkeletonStats cells={3} />
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="card p-4">
              <Skeleton className="mb-3 h-3 w-1/3" />
              <Skeleton className="h-52 w-full" />
            </div>
          ))}
        </div>
      </>
    );
  }

  const hasData = finance.transactions.length > 0;

  return (
    <>
      <PageHeader
        title="Insights"
        description="Calculated from your records on this device. Nothing is sent anywhere."
        actions={<PeriodFilter />}
      />

      {!hasData ? (
        <EmptyState
          title="No data to analyse yet"
          description="Insights appear once you have recorded some transactions. OUSCAP never invents numbers to fill this page."
        />
      ) : (
        <>
          <StatRow className="mb-6 border border-line">
            <StatCell>
              <Stat label="Income" value={formatDZD(totals.income)} size="sm" />
            </StatCell>
            <StatCell>
              <Stat label="Expenses" value={formatDZD(totals.expenses)} size="sm" />
            </StatCell>
            <StatCell>
              <Stat label="Net flow" value={formatDZD(flow, { sign: true })} size="sm" deltaTone={flow > 0 ? "pos" : flow < 0 ? "neg" : "muted"} />
            </StatCell>
            <StatCell>
              <Stat label="Avg daily" value={formatDZD(avgDaily)} size="sm" />
            </StatCell>
          </StatRow>

          {/* Insight list */}
          <section className="mb-4">
            <h2 className="stat-label mb-3">Observations</h2>
            <div className="space-y-2">
              {insights.length === 0 ? (
                <p className="text-xs text-muted">Not enough activity in this period for observations.</p>
              ) : (
                insights.map((insight) => (
                  <div key={insight.id} className="card flex items-start gap-3 p-3.5">
                    <span
                      className={
                        insight.severity === "warning"
                          ? "text-warn"
                          : insight.severity === "positive"
                            ? "text-pos"
                            : "text-muted"
                      }
                    >
                      {insight.severity === "warning" ? (
                        <AlertTriangle size={16} />
                      ) : insight.severity === "positive" ? (
                        <TrendingUp size={16} />
                      ) : (
                        <Info size={16} />
                      )}
                    </span>
                    <div>
                      <p className="text-sm text-fg">{insight.title}</p>
                      <p className="text-xs leading-relaxed text-muted">{insight.detail}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="card p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="stat-label">Spending by category</h2>
                {drilldown ? (
                  <button onClick={() => setDrilldown(null)} className="text-2xs text-muted hover:text-fg">
                    Clear
                  </button>
                ) : (
                  <span className="text-2xs text-muted">Select a category</span>
                )}
              </div>
              {byCategory.length > 0 ? (
                <CategoryBarChart data={byCategory} selected={drilldown} onSelect={(c) => setDrilldown(c.name)} />
              ) : (
                <p className="text-xs text-muted">No expenses in this period.</p>
              )}
              {drilldown ? (
                <div className="mt-4 border-t border-line pt-3">
                  <p className="stat-label mb-2">{drilldown} transactions</p>
                  <div className="max-h-48 overflow-y-auto scroll-thin">
                    {drilldownTxs.length > 0 ? (
                      drilldownTxs.map((tx) => (
                        <TxRow
                          key={tx.id}
                          tx={tx}
                          accountName={(id) => finance.accounts.find((a) => a.id === id)?.name ?? "—"}
                          categoryName={() => drilldown}
                        />
                      ))
                    ) : (
                      <p className="text-xs text-muted">No transactions in this period.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="card p-4">
              <h2 className="stat-label mb-4">Share of spending</h2>
              {byCategory.length > 0 ? <CategoryDonut data={byCategory} /> : <p className="text-xs text-muted">No expenses in this period.</p>}
            </section>

            <section className="card p-4 lg:col-span-2">
              <h2 className="stat-label mb-4">Income vs expenses by month</h2>
              {series.length > 1 ? <IncomeExpenseChart data={series} /> : <p className="text-xs text-muted">Needs at least two months of history.</p>}
            </section>

            <section className="card p-4">
              <h2 className="stat-label mb-3">Spending by context</h2>
              <div className="space-y-2">
                {(["personal", "freelance", "startup"] as const).map((c) => (
                  <div key={c} className="flex items-center justify-between text-xs">
                    <span className="text-muted">{CONTEXT_LABEL[c]}</span>
                    <span className="tnum text-fg">
                      {formatDZD(byContext[c])}{" "}
                      <span className="text-muted">({percent(byContext[c], totals.expenses)}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="card p-4">
              <h2 className="stat-label mb-3">Income by context</h2>
              <div className="space-y-2">
                {(["personal", "freelance", "startup"] as const).map((c) => (
                  <div key={c} className="flex items-center justify-between text-xs">
                    <span className="text-muted">{CONTEXT_LABEL[c]}</span>
                    <span className="tnum text-fg">
                      {formatDZD(incomeContext[c])}{" "}
                      <span className="text-muted">({percent(incomeContext[c], totals.income)}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <p className="mt-6 text-2xs leading-relaxed text-muted">
            Estimates are labelled as such and explain their assumptions. These insights are straightforward arithmetic over
            your own records — not AI, and never sent to an external service.
          </p>
        </>
      )}
    </>
  );
}
