import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type ToastTone = "info" | "pos" | "neg";

interface ToastInput {
  message: string;
  tone?: ToastTone;
  action?: { label: string; run: () => void };
}

interface Toast extends ToastInput {
  id: number;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone, action?: { label: string; run: () => void }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, number>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "info", action?: { label: string; run: () => void }) => {
      const id = Date.now() + Math.random();
      // Actionable toasts linger a little longer so the action can be reached.
      const lifetime = action ? 6000 : 3200;
      setToasts((prev) => [...prev, { id, message, tone, action }]);
      timers.current.set(id, window.setTimeout(() => dismiss(id), lifetime));
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-20 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2 lg:bottom-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-center gap-3 border bg-surface px-4 py-2.5 text-xs shadow-lg animate-slide-up",
              t.tone === "pos" && "border-pos/40 text-pos",
              t.tone === "neg" && "border-neg/40 text-neg",
              t.tone === "info" && "border-line text-fg",
            )}
          >
            <span>{t.message}</span>
            {t.action ? (
              <button
                onClick={() => {
                  t.action?.run();
                  dismiss(t.id);
                }}
                className="shrink-0 border border-line px-2 py-1 text-2xs font-medium uppercase tracking-wider text-fg transition-colors hover:border-muted"
              >
                {t.action.label}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
