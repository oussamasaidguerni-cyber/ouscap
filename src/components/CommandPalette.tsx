import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, CornerDownLeft, Plus, ArrowLeftRight, Wallet, PiggyBank, Target, Lightbulb, Settings as SettingsIcon, LayoutDashboard } from "lucide-react";
import { useFinance } from "@/store/FinanceProvider";
import { useUiActions } from "@/store/UiActionsProvider";
import { formatDZD } from "@/domain/money";
import { cn } from "@/lib/cn";

interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ size?: number }>;
  run: () => void;
  group: "Actions" | "Go to" | "Transactions";
}

/**
 * Command palette (⌘K / Ctrl+K). Keyboard-first: arrows to move, Enter to run,
 * Escape to close. Searches sections, actions, and your own transactions.
 */
export function CommandPalette() {
  const { paletteOpen, closePalette, openPalette, openQuickAdd } = useUiActions();
  const navigate = useNavigate();
  const finance = useFinance();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (paletteOpen) {
      setQuery("");
      setActive(0);
      // Focus after mount.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [paletteOpen]);

  // Global shortcut lives here so it works on every screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (paletteOpen) closePalette();
        else openPalette();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, closePalette, openPalette]);

  const navItems: PaletteItem[] = useMemo(() => {
    const go = (to: string) => () => {
      navigate(to);
      closePalette();
    };
    return [
      { id: "go-overview", label: "Overview", icon: LayoutDashboard, run: go("/"), group: "Go to" },
      { id: "go-transactions", label: "Transactions", icon: ArrowLeftRight, run: go("/transactions"), group: "Go to" },
      { id: "go-accounts", label: "Accounts", icon: Wallet, run: go("/accounts"), group: "Go to" },
      { id: "go-budgets", label: "Budgets", icon: PiggyBank, run: go("/budgets"), group: "Go to" },
      { id: "go-goals", label: "Goals", icon: Target, run: go("/goals"), group: "Go to" },
      { id: "go-insights", label: "Insights", icon: Lightbulb, run: go("/insights"), group: "Go to" },
      { id: "go-settings", label: "Settings", icon: SettingsIcon, run: go("/settings"), group: "Go to" },
      {
        id: "act-add",
        label: "Add transaction",
        hint: "Income, expense, transfer, adjustment",
        icon: Plus,
        run: () => {
          closePalette();
          openQuickAdd();
        },
        group: "Actions",
      },
    ];
  }, [navigate, closePalette, openQuickAdd]);

  const txItems: PaletteItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return finance.transactions
      .filter((tx) => {
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
        return haystack.includes(q);
      })
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8)
      .map((tx) => ({
        id: `tx-${tx.id}`,
        label: tx.description || finance.categories.find((c) => c.id === tx.categoryId)?.name || "Transaction",
        hint: `${tx.date} · ${formatDZD(tx.amount)}`,
        icon: ArrowLeftRight,
        run: () => {
          navigate("/transactions");
          closePalette();
        },
        group: "Transactions" as const,
      }));
  }, [query, finance.transactions, finance.categories, finance.accounts, navigate, closePalette]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? navItems.filter((i) => i.label.toLowerCase().includes(q))
      : navItems;
    // Actions first, then navigation, then matching transactions.
    return [...base.filter((i) => i.group === "Actions"), ...base.filter((i) => i.group !== "Actions"), ...txItems];
  }, [query, navItems, txItems]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!paletteOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closePalette();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(items.length - 1, a + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        items[active]?.run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, items, active, closePalette]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!paletteOpen) return null;

  let lastGroup = "";

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[12vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-fade-in" onClick={closePalette} />
      <div
        role="dialog"
        aria-label="Command palette"
        className="relative z-10 w-full max-w-lg border border-line bg-surface shadow-2xl animate-slide-up"
      >
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search size={16} className="text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or jump to…"
            aria-label="Search or jump to"
            className="h-12 w-full bg-transparent text-sm text-fg placeholder:text-muted focus:outline-none"
          />
          <kbd className="hidden border border-line px-1.5 py-0.5 text-2xs text-muted sm:block">ESC</kbd>
        </div>

        <ul ref={listRef} className="max-h-80 overflow-y-auto scroll-thin py-2">
          {items.length === 0 ? (
            <li className="px-4 py-6 text-center text-xs text-muted">No matches.</li>
          ) : (
            items.map((item, i) => {
              const showHeader = item.group !== lastGroup;
              lastGroup = item.group;
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  {showHeader ? (
                    <p className="px-4 pb-1 pt-2 text-2xs uppercase tracking-[0.14em] text-muted">{item.group}</p>
                  ) : null}
                  <button
                    data-index={i}
                    onMouseEnter={() => setActive(i)}
                    onClick={item.run}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2 text-left text-sm",
                      i === active ? "bg-surface-raised text-fg" : "text-muted",
                    )}
                  >
                    <Icon size={15} />
                    <span className="min-w-0 flex-1 truncate text-fg">{item.label}</span>
                    {item.hint ? <span className="tnum shrink-0 text-2xs text-muted">{item.hint}</span> : null}
                    {i === active ? <CornerDownLeft size={13} className="shrink-0 text-muted" /> : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
