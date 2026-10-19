import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { SettingsProvider } from "@/store/SettingsProvider";
import { FinanceProvider } from "@/store/FinanceProvider";
import { PeriodProvider } from "@/store/PeriodProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { AppShell } from "@/components/layout/AppShell";
import { OverviewPage } from "@/pages/OverviewPage";
import { TransactionsPage } from "@/pages/TransactionsPage";
import { AccountsPage } from "@/pages/AccountsPage";
import { BudgetsPage } from "@/pages/BudgetsPage";
import { GoalsPage } from "@/pages/GoalsPage";
import { InsightsPage } from "@/pages/InsightsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { useSettings } from "@/store/SettingsProvider";
import { BootIntro } from "@/components/BootIntro";
import { UiActionsProvider } from "@/store/UiActionsProvider";

export default function App() {
  return (
    <SettingsProvider>
      <FinanceProvider>
        <ToastProvider>
          <PeriodBoundary>
            <BootBoundary>
              <UiActionsProvider>
                <HashRouter>
                  <Routes>
                    <Route element={<AppShell />}>
                      <Route path="/" element={<OverviewPage />} />
                      <Route path="/transactions" element={<TransactionsPage />} />
                      <Route path="/accounts" element={<AccountsPage />} />
                      <Route path="/budgets" element={<BudgetsPage />} />
                      <Route path="/goals" element={<GoalsPage />} />
                      <Route path="/insights" element={<InsightsPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                  </Routes>
                </HashRouter>
              </UiActionsProvider>
            </BootBoundary>
          </PeriodBoundary>
        </ToastProvider>
      </FinanceProvider>
    </SettingsProvider>
  );
}

const INTRO_DISABLED =
  typeof import.meta !== "undefined" && Boolean(import.meta.env?.MODE === "test");

/** Shows the brand intro on first load of a session, except under tests/e2e. */
function BootBoundary({ children }: { children: React.ReactNode }) {
  if (INTRO_DISABLED) return <>{children}</>;
  return <BootIntro>{children}</BootIntro>;
}

/** Period provider reads the configured month-start day from settings. */
function PeriodBoundary({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  return <PeriodProvider monthStartDay={settings.monthStartDay}>{children}</PeriodProvider>;
}
