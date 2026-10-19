import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/data/db";
import { settingsRepo, DEFAULT_SETTINGS } from "@/data/repositories";
import type { AppSettings } from "@/domain/types";

interface SettingsContextValue {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => Promise<void>;
  resolvedTheme: "dark" | "light";
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const live = useLiveQuery(() => db.settings.get("app"), [], undefined);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS());

  useEffect(() => {
    void settingsRepo.get();
  }, []);

  useEffect(() => {
    if (live) setSettings(live);
  }, [live]);

  const resolvedTheme = useMemo<"dark" | "light">(() => {
    if (settings.theme === "system") return systemPrefersDark() ? "dark" : "light";
    return settings.theme;
  }, [settings.theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.classList.toggle("light", resolvedTheme === "light");
  }, [resolvedTheme]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      resolvedTheme,
      update: async (patch) => {
        await settingsRepo.update(patch);
      },
    }),
    [settings, resolvedTheme],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
