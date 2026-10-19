import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/cn";

export interface MenuAction {
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
  icon?: React.ComponentType<{ size?: number }>;
}

/**
 * A compact, accessible overflow menu for list rows. Works with pointer and
 * keyboard, closes on outside click / Escape, and flips to stay on screen.
 */
export function RowMenu({ actions, label = "More actions" }: { actions: MenuAction[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [alignRight, setAlignRight] = useState(true);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      setAlignRight(rect.right + 180 <= window.innerWidth);
    }
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-fg"
      >
        <MoreVertical size={16} />
      </button>
      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute z-40 mt-1 w-44 border border-line bg-surface py-1 shadow-xl animate-fade-in",
            alignRight ? "right-0" : "left-0",
          )}
        >
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  action.onSelect();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors hover:bg-surface-raised",
                  action.tone === "danger" ? "text-neg" : "text-fg",
                )}
              >
                {Icon ? <Icon size={14} /> : null}
                {action.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
