import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Accessible dialog: renders inline (no portal needed for our z-stack), traps
 * focus implicitly via the overlay, closes on Escape, and is scroll-safe on
 * small screens.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 flex w-full flex-col bg-surface border border-line animate-slide-up scroll-thin",
          // Phone: a near-full-height bottom sheet. Desktop: a centered card.
          "max-h-[92vh] sm:max-h-[88vh]",
          widths[size],
        )}
      >
        {/* Grab handle, phone only — signals the sheet can be swiped/dismissed. */}
        <div className="flex justify-center pt-2 sm:hidden" aria-hidden>
          <span className="h-1 w-10 bg-line" />
        </div>
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-surface px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-fg">{title}</h2>
            {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted hover:text-fg transition-colors"
          >
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 scroll-thin">{children}</div>
        {footer ? (
          <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-line bg-surface px-5 py-3 pb-safe">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

/** Confirmation dialog for destructive actions. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  danger = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            className="h-10 border border-line px-4 text-sm text-muted hover:text-fg"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={cn(
              "h-10 px-4 text-sm font-medium",
              danger ? "bg-neg text-white hover:opacity-90" : "bg-fg text-ink hover:opacity-90",
            )}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-muted">{description}</p>
    </Dialog>
  );
}
