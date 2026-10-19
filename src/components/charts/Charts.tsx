import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CategorySpend, MonthlyPoint } from "@/domain/accounting";
import { formatCompact, formatDZD } from "@/domain/money";
import { formatMonthLabel } from "@/lib/dates";
import { cn } from "@/lib/cn";

const GRID = "rgb(var(--line))";
const MUTED = "rgb(var(--muted))";
const FG = "rgb(var(--fg))";

function tooltipStyle() {
  return {
    background: "rgb(var(--surface))",
    border: "1px solid rgb(var(--line))",
    borderRadius: 0,
    fontSize: 12,
    color: FG,
    fontVariantNumeric: "tabular-nums",
  } as const;
}

/** Income vs expenses, per month. Minimal noise: two lines, one grid. */
export function IncomeExpenseChart({ data }: { data: MonthlyPoint[] }) {
  // Series toggles let you isolate income or expenses; both on by default.
  const [showIncome, setShowIncome] = useState(true);
  const [showExpenses, setShowExpenses] = useState(true);

  if (data.length === 0) return null;

  const series = [
    { key: "income", label: "Income", color: FG, dash: undefined as string | undefined, on: showIncome, toggle: setShowIncome },
    {
      key: "expenses",
      label: "Expenses",
      color: MUTED,
      dash: "4 3",
      on: showExpenses,
      toggle: setShowExpenses,
    },
  ];

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        {series.map((s) => (
          <button
            key={s.key}
            onClick={() => s.toggle((v) => !v)}
            aria-pressed={s.on}
            className={cn(
              "flex items-center gap-1.5 text-2xs transition-opacity",
              s.on ? "opacity-100" : "opacity-40",
            )}
          >
            <span
              className="inline-block h-2 w-2"
              style={{ background: s.color, opacity: s.dash ? 0.6 : 1 }}
            />
            <span className={s.on ? "text-fg" : "text-muted line-through"}>{s.label}</span>
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={formatMonthLabel}
            tick={{ fill: MUTED, fontSize: 11 }}
            axisLine={{ stroke: GRID }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatCompact(Number(v))}
            tick={{ fill: MUTED, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={54}
          />
          <Tooltip
            contentStyle={tooltipStyle()}
            formatter={(value, name) => [formatDZD(Number(value)), String(name)]}
            labelFormatter={(l) => formatMonthLabel(String(l))}
            cursor={{ stroke: GRID, strokeWidth: 1 }}
          />
          {showIncome ? (
            <Line type="monotone" dataKey="income" name="Income" stroke={FG} strokeWidth={1.75} dot={false} activeDot={{ r: 3 }} />
          ) : null}
          {showExpenses ? (
            <Line
              type="monotone"
              dataKey="expenses"
              name="Expenses"
              stroke={MUTED}
              strokeWidth={1.75}
              strokeDasharray="4 3"
              dot={false}
              activeDot={{ r: 3 }}
            />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const MONO_STEPS = ["rgb(var(--fg))", "#8a8a8a", "#6f6f6f", "#585858", "#444444", "#333333"];

/** Spending by category — monochrome stacked bars (no rainbow). */
export function CategoryBarChart({
  data,
  onSelect,
  selected,
}: {
  data: CategorySpend[];
  onSelect?: (category: CategorySpend) => void;
  selected?: string | null;
}) {
  const top = data.slice(0, 6);
  if (top.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, top.length * 40)}>
      <BarChart data={top} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: MUTED, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={110}
        />
        <Tooltip
          contentStyle={tooltipStyle()}
          formatter={(v) => formatDZD(Number(v))}
          cursor={{ fill: "rgb(var(--line) / 0.3)" }}
        />
        <Bar
          dataKey="amount"
          barSize={14}
          radius={0}
          onClick={
            onSelect
              ? (entry: { payload?: CategorySpend }) => {
                  if (entry.payload) onSelect(entry.payload);
                }
              : undefined
          }
          cursor={onSelect ? "pointer" : undefined}
        >
          {top.map((entry, i) => (
            <Cell
              key={i}
              fill={MONO_STEPS[i % MONO_STEPS.length]}
              opacity={selected && selected !== entry.name ? 0.35 : 1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Compact donut for a single breakdown. */
export function CategoryDonut({ data }: { data: CategorySpend[] }) {
  const top = data.slice(0, 5);
  if (top.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={top} dataKey="amount" nameKey="name" innerRadius={52} outerRadius={78} stroke="rgb(var(--surface))" strokeWidth={2}>
          {top.map((_, i) => (
            <Cell key={i} fill={MONO_STEPS[i % MONO_STEPS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle()} formatter={(v) => formatDZD(Number(v))} />
      </PieChart>
    </ResponsiveContainer>
  );
}
