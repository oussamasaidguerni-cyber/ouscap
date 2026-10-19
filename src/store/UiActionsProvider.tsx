import { createContext, useCallback, useContext, useMemo, useState } from "react";

interface UiActions {
  quickAddOpen: boolean;
  openQuickAdd: () => void;
  closeQuickAdd: () => void;
  paletteOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;
  /** Latest message for the screen-reader live region. */
  announcement: string;
  announce: (message: string) => void;
}

const UiActionsContext = createContext<UiActions | null>(null);

/**
 * Shared UI actions (quick-add dialog, command palette) so any component — the
 * shell, the palette itself, keyboard shortcuts — can drive the same state.
 */
export function UiActionsProvider({
  children,
  initialQuickAdd = false,
}: {
  children: React.ReactNode;
  initialQuickAdd?: boolean;
}) {
  const [quickAddOpen, setQuickAddOpen] = useState(initialQuickAdd);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const announce = useCallback((message: string) => setAnnouncement(message), []);

  const value = useMemo<UiActions>(
    () => ({
      quickAddOpen,
      openQuickAdd: () => setQuickAddOpen(true),
      closeQuickAdd: () => setQuickAddOpen(false),
      paletteOpen,
      openPalette: () => setPaletteOpen(true),
      closePalette: () => setPaletteOpen(false),
      announcement,
      announce,
    }),
    [quickAddOpen, paletteOpen, announcement, announce],
  );

  return (
    <UiActionsContext.Provider value={value}>
      {children}
      {/* Polite live region: announces balance changes without stealing focus. */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </UiActionsContext.Provider>
  );
}

export function useUiActions(): UiActions {
  const ctx = useContext(UiActionsContext);
  if (!ctx) throw new Error("useUiActions must be used within UiActionsProvider");
  return ctx;
}
