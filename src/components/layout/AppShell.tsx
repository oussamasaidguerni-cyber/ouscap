import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar, MobileHeader, BottomNav, NavSheet } from "./Nav";
import { Dialog } from "@/components/ui/Dialog";
import { TransactionForm } from "@/components/TransactionForm";
import { useFinance } from "@/store/FinanceProvider";
import { useToast } from "@/components/ui/Toast";
import { useUiActions } from "@/store/UiActionsProvider";
import { CommandPalette } from "@/components/CommandPalette";
import { transactionsRepo } from "@/data/repositories";
import { EmptyState } from "@/components/ui";

/**
 * App shell: sidebar on laptop, header + floating glass tab bar on phone, one
 * global quick-add dialog and command palette available from every screen.
 */
export function AppShell() {
  const { quickAddOpen, openQuickAdd, closeQuickAdd, openPalette } = useUiActions();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-ink">
      <Sidebar onQuickAdd={openQuickAdd} onSearch={openPalette} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader onSearch={openPalette} onMenu={() => setMenuOpen(true)} />
        <main className="flex-1 px-4 pb-24 pb-safe pt-5 sm:px-6 lg:px-8 lg:pb-10">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav onQuickAdd={openQuickAdd} />
      <NavSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSearch={openPalette}
        onQuickAdd={openQuickAdd}
      />
      <QuickAddDialog open={quickAddOpen} onClose={closeQuickAdd} />
      <CommandPalette />
    </div>
  );
}

function QuickAddDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const finance = useFinance();
  const { toast } = useToast();
  const { announce } = useUiActions();
  const [saving, setSaving] = useState(false);

  const hasAccounts = finance.accounts.some((a) => !a.archived);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add transaction"
      description="Income, expense, transfer, or an explicit balance adjustment."
    >
      {!hasAccounts ? (
        <EmptyState
          title="Add an account first"
          description="Transactions belong to an account. Create a cash or bank account in Accounts, then come back."
        />
      ) : (
        <TransactionForm
          finance={finance}
          submitting={saving}
          onCancel={onClose}
          onSubmit={async (tx) => {
            setSaving(true);
            try {
              await transactionsRepo.create(tx);
              toast("Transaction added", "pos");
              announce("Transaction added.");
              onClose();
            } catch {
              toast("Could not save the transaction", "neg");
            } finally {
              setSaving(false);
            }
          }}
        />
      )}
    </Dialog>
  );
}
