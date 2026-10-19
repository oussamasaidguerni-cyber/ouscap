import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Target,
  PiggyBank,
  Lightbulb,
  Settings as SettingsIcon,
  Plus,
  Search,
} from "lucide-react";
import { Monogram } from "@/brand";
import { cn } from "@/lib/cn";

export interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/accounts", label: "Accounts", icon: Wallet },
  { to: "/budgets", label: "Budgets", icon: PiggyBank },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/insights", label: "Insights", icon: Lightbulb },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

/** Desktop sidebar. */
export function Sidebar({ onQuickAdd, onSearch }: { onQuickAdd: () => void; onSearch?: () => void }) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-ink lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Monogram size={26} />
        <span className="text-sm font-semibold tracking-[0.34em] text-fg">OUSCAP</span>
      </div>

      {onSearch ? (
        <div className="px-3 pb-2">
          <button
            onClick={onSearch}
            className="flex w-full items-center gap-2 border border-line px-3 py-2 text-xs text-muted transition-colors hover:text-fg"
          >
            <Search size={14} />
            <span className="flex-1 text-left">Search or jump…</span>
            <kbd className="border border-line px-1 py-0.5 text-2xs">⌘K</kbd>
          </button>
        </div>
      ) : null}

      <div className="px-3 pb-3">
        <button
          onClick={onQuickAdd}
          className="flex w-full items-center gap-2 bg-fg px-3 py-2.5 text-sm font-medium text-ink transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          Add transaction
        </button>
      </div>

      <nav className="flex-1 px-2">
        {NAV_ITEMS.map((item) => (
          <SidebarLink key={item.to} item={item} />
        ))}
      </nav>

      <div className="border-t border-line px-5 py-4">
        <p className="text-2xs uppercase tracking-[0.14em] text-muted">Your money. In perspective.</p>
      </div>
    </aside>
  );
}

function SidebarLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        cn(
          "mb-0.5 flex items-center gap-3 px-3 py-2 text-sm transition-colors",
          isActive ? "bg-surface-raised text-fg" : "text-muted hover:text-fg hover:bg-surface",
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
          {item.label}
        </>
      )}
    </NavLink>
  );
}

/** Mobile top header with compact branding. */
export function MobileHeader({ onQuickAdd, onSearch }: { onQuickAdd: () => void; onSearch?: () => void }) {
  const { pathname } = useLocation();
  const current = NAV_ITEMS.find((n) =>
    n.to === "/" ? pathname === "/" : pathname.startsWith(n.to),
  );
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-ink/95 px-4 py-3 pt-safe backdrop-blur lg:hidden">
      <div className="flex items-center gap-2">
        <Monogram size={22} />
        <span className="text-xs font-semibold tracking-[0.28em] text-fg">
          {current?.label ?? "OUSCAP"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {onSearch ? (
          <button
            onClick={onSearch}
            aria-label="Search"
            className="flex h-9 w-9 items-center justify-center text-muted transition-colors hover:text-fg"
          >
            <Search size={18} />
          </button>
        ) : null}
        <button
          onClick={onQuickAdd}
          aria-label="Add transaction"
          className="flex h-9 w-9 items-center justify-center bg-fg text-ink"
        >
          <Plus size={18} />
        </button>
      </div>
    </header>
  );
}

/** Mobile bottom navigation. */
export function BottomNav({ onQuickAdd }: { onQuickAdd: () => void }) {
  const primary = NAV_ITEMS.slice(0, 6);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/95 backdrop-blur lg:hidden">
      <div className="flex items-stretch justify-around pb-safe">
        {primary.slice(0, 3).map((item) => (
          <BottomLink key={item.to} item={item} />
        ))}
        <button
          onClick={onQuickAdd}
          aria-label="Add transaction"
          className="flex flex-1 flex-col items-center gap-1 py-2.5"
        >
          <span className="flex h-9 w-9 items-center justify-center bg-fg text-ink">
            <Plus size={18} />
          </span>
        </button>
        {primary.slice(3).map((item) => (
          <BottomLink key={item.to} item={item} />
        ))}
        <BottomLink item={NAV_ITEMS[6]} />
      </div>
    </nav>
  );
}

function BottomLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        cn(
          "flex flex-1 flex-col items-center gap-1 py-2.5 text-2xs",
          isActive ? "text-fg" : "text-muted",
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={18} strokeWidth={isActive ? 2.4 : 1.8} />
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}
