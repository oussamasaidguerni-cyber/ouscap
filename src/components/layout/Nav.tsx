import { useEffect } from "react";
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
  Menu,
  X,
} from "lucide-react";
import { Monogram, Wordmark } from "@/brand";
import { cn } from "@/lib/cn";

export interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
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

/** The four tabs flanking the center Add action on the mobile glass bar. */
export const BAR_LEFT: NavItem[] = [NAV_ITEMS[0], NAV_ITEMS[1]];
export const BAR_RIGHT: NavItem[] = [NAV_ITEMS[3], NAV_ITEMS[6]];
/** Screens that live in the mobile "More" sheet (displaced from the bar). */
export const SHEET_ITEMS: NavItem[] = [NAV_ITEMS[2], NAV_ITEMS[4], NAV_ITEMS[5]];

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

/** Mobile top header with compact branding, search, and a "More" menu. */
export function MobileHeader({ onSearch, onMenu }: { onSearch?: () => void; onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-ink/95 px-4 pt-safe pb-2 backdrop-blur lg:hidden">
      <button
        onClick={onMenu}
        aria-label="Open menu"
        className="-ml-1 flex h-10 w-10 items-center justify-center text-muted transition-colors active:text-fg"
      >
        <Menu size={20} />
      </button>

      <div className="flex items-center gap-2">
        <Wordmark size={18} />
      </div>

      {onSearch ? (
        <button
          onClick={onSearch}
          aria-label="Search"
          className="-mr-1 flex h-10 w-10 items-center justify-center text-muted transition-colors active:text-fg"
        >
          <Search size={18} />
        </button>
      ) : (
        <span className="h-10 w-10" />
      )}
    </header>
  );
}

/**
 * Floating "glass" tab bar: a translucent capsule hovering above the home
 * indicator, with a highlight pill that slides to the active tab and a raised
 * center Add action. Mobile only.
 */
export function BottomNav({ onQuickAdd }: { onQuickAdd: () => void }) {
  const tabs = [...BAR_LEFT, ...BAR_RIGHT];
  const { pathname } = useLocation();
  const activeIndex = tabs.findIndex((t) => (t.to === "/" ? pathname === "/" : pathname.startsWith(t.to)));

  // Slot geometry: 5 equal slots; the center (index 2) is the Add button.
  // Map an active tab index to its slot among the four nav slots.
  const slotOf = (tabIndex: number) => (tabIndex < 2 ? tabIndex : tabIndex + 1); // skip center
  const pillSlot = activeIndex >= 0 ? slotOf(activeIndex) : -1;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 px-2 pb-3 lg:hidden"
    >
      <div className="relative mx-auto flex max-w-lg items-stretch rounded-2xl border border-white/10 bg-surface/70 p-1.5 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.7)] backdrop-blur-xl">
        {/* Sliding highlight pill behind the active tab (excludes center slot). */}
        {pillSlot >= 0 ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-1.5 left-0 w-1/5 px-1 transition-transform duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
            style={{ transform: `translateX(${pillSlot * 100}%)` }}
          >
            <span className="block h-full w-full rounded-xl bg-fg/10 ring-1 ring-inset ring-white/10" />
          </span>
        ) : null}

        {BAR_LEFT.map((item) => (
          <BarTab key={item.to} item={item} />
        ))}

        {/* Center Add action — raised, integrated into the capsule. */}
        <div className="relative flex flex-1 items-center justify-center">
          <button
            onClick={onQuickAdd}
            aria-label="Add transaction"
            className="-mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-fg text-ink shadow-[0_6px_18px_-4px_rgba(0,0,0,0.8)] transition-transform active:scale-95"
          >
            <Plus size={22} strokeWidth={2.4} />
          </button>
        </div>

        {BAR_RIGHT.map((item) => (
          <BarTab key={item.to} item={item} />
        ))}
      </div>
    </nav>
  );
}

function BarTab({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-2xs"
    >
      {({ isActive }) => (
        <>
          <Icon
            size={22}
            strokeWidth={isActive ? 2.3 : 1.8}
            className={cn("relative z-10 transition-colors", isActive ? "text-fg" : "text-muted")}
          />
          <span className={cn("relative z-10 transition-colors", isActive ? "text-fg" : "text-muted")}>
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
}

/**
 * Slide-up "More" sheet (Option A): quick Search and Add at the top, then the
 * destinations that don't fit the bar. Navigating closes the sheet.
 */
export function NavSheet({
  open,
  onClose,
  onSearch,
  onQuickAdd,
}: {
  open: boolean;
  onClose: () => void;
  onSearch: () => void;
  onQuickAdd: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end lg:hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-fade-in" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="More"
        className="relative z-10 animate-sheet-up rounded-t-2xl border-t border-line bg-surface pb-safe"
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <span className="stat-label">Menu</span>
          <button onClick={onClose} aria-label="Close menu" className="text-muted hover:text-fg">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 px-5 pb-4">
          <button
            onClick={() => {
              onSearch();
              onClose();
            }}
            className="flex items-center justify-center gap-2 border border-line py-2.5 text-xs text-fg active:bg-surface-raised"
          >
            <Search size={15} /> Search
          </button>
          <button
            onClick={() => {
              onQuickAdd();
              onClose();
            }}
            className="flex items-center justify-center gap-2 bg-fg py-2.5 text-xs font-medium text-ink active:opacity-90"
          >
            <Plus size={15} /> Add
          </button>
        </div>

        <nav className="px-2 pb-5">
          {SHEET_ITEMS.map((item) => (
            <SheetLink key={item.to} item={item} onNavigate={onClose} />
          ))}
        </nav>
      </div>
    </div>
  );
}

function SheetLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors",
          isActive ? "bg-surface-raised text-fg" : "text-muted active:text-fg active:bg-surface-raised",
        )
      }
    >
      <Icon size={18} />
      {item.label}
    </NavLink>
  );
}
