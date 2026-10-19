import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Archive } from "lucide-react";
import { useFinance } from "@/store/FinanceProvider";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Badge, Divider, EmptyState, Field, Input, Select, Textarea, Skeleton, SkeletonList, SkeletonStats } from "@/components/ui";
import { Dialog, ConfirmDialog } from "@/components/ui/Dialog";
import { RowMenu } from "@/components/ui/RowMenu";
import { Stat, StatCell, StatRow } from "@/components/ui/Stat";
import { formatDZD, parseAmount } from "@/domain/money";
import { ACCOUNT_TYPE_LABEL, type Account, type Asset, type Liability } from "@/domain/types";
import { accountBalance } from "@/domain/accounting";
import { accountsRepo, assetsRepo, liabilitiesRepo } from "@/data/repositories";
import { useToast } from "@/components/ui/Toast";
import { TxRow } from "@/components/TxRow";
import { cn } from "@/lib/cn";

type Tab = "accounts" | "assets" | "liabilities";

export function AccountsPage() {
  const finance = useFinance();
  const [tab, setTab] = useState<Tab>("accounts");

  return (
    <>
      <PageHeader
        title="Accounts & net worth"
        description="Net worth = tracked assets − tracked liabilities."
      />

      <StatRow className="mb-6 border border-line">
        <StatCell>
          <Stat label="Net worth" value={formatDZD(finance.netWorth.netWorth)} size="lg" />
        </StatCell>
        <StatCell>
          <Stat label="Accounts" value={formatDZD(finance.netWorth.accounts)} size="sm" />
        </StatCell>
        <StatCell>
          <Stat label="Other assets" value={formatDZD(finance.netWorth.assets)} size="sm" />
        </StatCell>
        <StatCell>
          <Stat label="Liabilities" value={formatDZD(finance.netWorth.liabilities)} size="sm" />
        </StatCell>
      </StatRow>

      <div className="mb-4 flex gap-px bg-line">
        {(["accounts", "assets", "liabilities"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cnTab(tab === t)}
          >
            {t === "accounts" ? "Accounts" : t === "assets" ? "Assets" : "Liabilities"}
          </button>
        ))}
      </div>

      {tab === "accounts" ? <AccountsTab /> : tab === "assets" ? <AssetsTab /> : <LiabilitiesTab />}
    </>
  );
}

function cnTab(active: boolean): string {
  return `flex-1 py-2 text-xs capitalize transition-colors ${
    active ? "bg-fg text-ink" : "bg-surface text-muted hover:text-fg"
  }`;
}

/* ------------------------------------------------------------------ */

function AccountsTab() {
  const finance = useFinance();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Account | "new" | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const selectedAccount = finance.accounts.find((a) => a.id === selected);
  const selectedTxs = useMemo(
    () =>
      finance.transactions
        .filter((t) => t.accountId === selected || t.toAccountId === selected)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [finance.transactions, selected],
  );

  if (finance.loading) {
    return (
      <>
        <PageHeader title="Accounts & net worth" description="Loading…" />
        <SkeletonStats cells={3} />
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SkeletonList rows={4} />
          </div>
          <div className="card p-4">
            <Skeleton className="mb-3 h-3 w-1/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="mb-3 flex justify-end">
          <Button size="sm" variant="primary" onClick={() => setEditing("new")}>
            <Plus size={14} /> New account
          </Button>
        </div>
        {finance.accounts.length === 0 ? (
          <EmptyState title="No accounts yet" description="Create a cash, bank, or savings account to start tracking." />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="px-4 py-2.5 text-2xs font-normal uppercase tracking-[0.12em] text-muted">Account</th>
                  <th className="px-3 py-2.5 text-right text-2xs font-normal uppercase tracking-[0.12em] text-muted">Opening</th>
                  <th className="px-3 py-2.5 text-right text-2xs font-normal uppercase tracking-[0.12em] text-muted">Movement</th>
                  <th className="px-3 py-2.5 text-right text-2xs font-normal uppercase tracking-[0.12em] text-muted">Balance</th>
                  <th className="w-10 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {finance.accounts.map((a) => {
                  const balance = accountBalance(a, finance.transactions);
                  const movement = balance - a.openingBalance;
                  return (
                    <tr
                      key={a.id}
                      className={cn("transition-colors hover:bg-surface-raised", selected === a.id && "bg-surface-raised")}
                    >
                      <td className="px-4 py-3">
                        <button className="flex min-w-0 flex-col text-left" onClick={() => setSelected(a.id)}>
                          <span className="flex items-center gap-2">
                            <span className="truncate text-fg">{a.name}</span>
                            {a.archived ? <Badge tone="warn">Archived</Badge> : null}
                          </span>
                          <span className="text-2xs text-muted">{ACCOUNT_TYPE_LABEL[a.type]}</span>
                        </button>
                      </td>
                      <td className="tnum px-3 py-3 text-right text-muted">{formatDZD(a.openingBalance)}</td>
                      <td
                        className={cn(
                          "tnum px-3 py-3 text-right",
                          movement > 0 ? "text-pos" : movement < 0 ? "text-neg" : "text-muted",
                        )}
                      >
                        {movement === 0 ? "—" : formatDZD(movement, { sign: true })}
                      </td>
                      <td className="tnum px-3 py-3 text-right font-medium text-fg">{formatDZD(balance)}</td>
                      <td className="px-1 py-3">
                        <RowMenu
                          label={`Actions for ${a.name}`}
                          actions={[
                            { label: "Edit", icon: Pencil, onSelect: () => setEditing(a) },
                            {
                              label: a.archived ? "Restore" : "Archive",
                              icon: Archive,
                              onSelect: async () => {
                                await accountsRepo.archive(a.id, !a.archived);
                                toast(a.archived ? "Account restored" : "Account archived", "info");
                              },
                            },
                            { label: "Delete", icon: Trash2, tone: "danger", onSelect: () => setDeleting(a) },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <aside className="card p-4">
        {selectedAccount ? (
          <>
            <h2 className="stat-label mb-3">{selectedAccount.name} history</h2>
            <div className="mb-3">
              <Stat
                label="Current balance"
                value={formatDZD(accountBalance(selectedAccount, finance.transactions))}
                size="md"
              />
            </div>
            <Divider className="mb-2" />
            {selectedTxs.length > 0 ? (
              <div className="max-h-96 overflow-y-auto scroll-thin">
                {selectedTxs.map((tx) => (
                  <TxRow
                    key={tx.id}
                    tx={tx}
                    accountName={(id) => finance.accounts.find((a) => a.id === id)?.name ?? "—"}
                    categoryName={(id) => finance.categories.find((c) => c.id === id)?.name ?? "Uncategorized"}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted">No transactions on this account yet.</p>
            )}
          </>
        ) : (
          <p className="text-xs text-muted">Select an account to view its transaction history.</p>
        )}
      </aside>

      <AccountDialog open={editing !== null} account={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          const result = await accountsRepo.remove(deleting.id);
          toast(
            result.archived
              ? "Account has transactions — archived instead of deleted"
              : "Account deleted",
            result.archived ? "info" : "pos",
          );
        }}
        title="Delete account?"
        description="Accounts with existing transactions are archived rather than deleted, so your history stays intact."
        confirmLabel="Delete"
      />
    </div>
  );
}

function AccountDialog({
  open,
  account,
  onClose,
}: {
  open: boolean;
  account: Account | "new" | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const isNew = account === "new";
  const [name, setName] = useState("");
  const [type, setType] = useState("cash");
  const [opening, setOpening] = useState("");
  const [notes, setNotes] = useState("");

  // Reset when reopening.
  useMemo(() => {
    if (account && account !== "new") {
      setName(account.name);
      setType(account.type);
      setOpening(String(account.openingBalance));
      setNotes(account.notes ?? "");
    } else if (isNew) {
      setName("");
      setType("cash");
      setOpening("");
      setNotes("");
    }
  }, [account, isNew]);

  async function save() {
    const parsed = opening.trim() === "" ? 0 : parseAmount(opening.replace("-", ""));
    const signed = opening.trim().startsWith("-") ? -(parsed ?? 0) : parsed;
    if (signed === null || !name.trim()) {
      toast("Enter a name and a valid opening balance", "neg");
      return;
    }
    if (isNew) {
      await accountsRepo.create({ name: name.trim(), type: type as Account["type"], openingBalance: signed, notes });
    } else if (account) {
      await accountsRepo.update(account.id, { name: name.trim(), type: type as Account["type"], openingBalance: signed, notes });
    }
    toast(isNew ? "Account created" : "Account updated", "pos");
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isNew ? "New account" : "Edit account"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save}>
            {isNew ? "Create" : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {(Object.keys(ACCOUNT_TYPE_LABEL) as Account["type"][]).map((t) => (
                <option key={t} value={t}>
                  {ACCOUNT_TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Opening balance (DZD)" hint="May be negative for an overdraft.">
            <Input value={opening} inputMode="numeric" placeholder="0" onChange={(e) => setOpening(e.target.value)} />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */

function AssetsTab() {
  const finance = useFinance();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Asset | "new" | null>(null);
  const [deleting, setDeleting] = useState<Asset | null>(null);

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" variant="primary" onClick={() => setEditing("new")}>
          <Plus size={14} /> New asset
        </Button>
      </div>
      {finance.assets.length === 0 ? (
        <EmptyState
          title="No separate assets"
          description="Track things like equipment or property that aren't spendable accounts. Avoid double counting money already in an account."
        />
      ) : (
        <div className="card divide-y divide-line">
          {finance.assets.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-fg">{a.name}</p>
                {a.notes ? <p className="truncate text-2xs text-muted">{a.notes}</p> : null}
              </div>
              <span className="tnum text-sm text-fg">{formatDZD(a.value)}</span>
              <button className="p-1.5 text-muted hover:text-fg" onClick={() => setEditing(a)} aria-label="Edit">
                <Pencil size={14} />
              </button>
              <button className="p-1.5 text-muted hover:text-neg" onClick={() => setDeleting(a)} aria-label="Delete">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <AssetDialog open={editing !== null} asset={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) {
            await assetsRepo.remove(deleting.id);
            toast("Asset removed", "info");
          }
        }}
        title="Remove asset?"
        description="This removes the asset from your net worth calculation."
        confirmLabel="Remove"
      />
    </div>
  );
}

function AssetDialog({ open, asset, onClose }: { open: boolean; asset: Asset | "new" | null; onClose: () => void }) {
  const { toast } = useToast();
  const isNew = asset === "new";
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");

  useMemo(() => {
    if (asset && asset !== "new") {
      setName(asset.name);
      setValue(String(asset.value));
      setNotes(asset.notes ?? "");
    } else if (isNew) {
      setName("");
      setValue("");
      setNotes("");
    }
  }, [asset, isNew]);

  async function save() {
    const parsed = parseAmount(value || "0");
    if (!name.trim() || parsed === null) {
      toast("Enter a name and a valid value", "neg");
      return;
    }
    if (isNew) await assetsRepo.create({ name: name.trim(), value: parsed, notes });
    else if (asset) await assetsRepo.update(asset.id, { name: name.trim(), value: parsed, notes });
    toast(isNew ? "Asset added" : "Asset updated", "pos");
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isNew ? "New asset" : "Edit asset"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save}>
            {isNew ? "Add" : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Estimated value (DZD)">
          <Input value={value} inputMode="numeric" placeholder="0" onChange={(e) => setValue(e.target.value)} />
        </Field>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */

function LiabilitiesTab() {
  const finance = useFinance();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Liability | "new" | null>(null);
  const [deleting, setDeleting] = useState<Liability | null>(null);

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" variant="primary" onClick={() => setEditing("new")}>
          <Plus size={14} /> New liability
        </Button>
      </div>
      {finance.liabilities.length === 0 ? (
        <EmptyState title="No liabilities" description="Track loans, credit balances, or other money you owe." />
      ) : (
        <div className="card divide-y divide-line">
          {finance.liabilities.map((l) => (
            <div key={l.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm text-fg">{l.name}</span>
                  <Badge>{l.type}</Badge>
                </div>
              </div>
              <span className="tnum text-sm text-neg">{formatDZD(l.balance)}</span>
              <button className="p-1.5 text-muted hover:text-fg" onClick={() => setEditing(l)} aria-label="Edit">
                <Pencil size={14} />
              </button>
              <button className="p-1.5 text-muted hover:text-neg" onClick={() => setDeleting(l)} aria-label="Delete">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <LiabilityDialog open={editing !== null} liability={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) {
            await liabilitiesRepo.remove(deleting.id);
            toast("Liability removed", "info");
          }
        }}
        title="Remove liability?"
        description="This removes the liability from your net worth calculation."
        confirmLabel="Remove"
      />
    </div>
  );
}

function LiabilityDialog({
  open,
  liability,
  onClose,
}: {
  open: boolean;
  liability: Liability | "new" | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const isNew = liability === "new";
  const [name, setName] = useState("");
  const [type, setType] = useState("loan");
  const [balance, setBalance] = useState("");
  const [notes, setNotes] = useState("");

  useMemo(() => {
    if (liability && liability !== "new") {
      setName(liability.name);
      setType(liability.type);
      setBalance(String(liability.balance));
      setNotes(liability.notes ?? "");
    } else if (isNew) {
      setName("");
      setType("loan");
      setBalance("");
      setNotes("");
    }
  }, [liability, isNew]);

  async function save() {
    const parsed = parseAmount(balance || "0");
    if (!name.trim() || parsed === null) {
      toast("Enter a name and a valid balance", "neg");
      return;
    }
    if (isNew) await liabilitiesRepo.create({ name: name.trim(), type: type as Liability["type"], balance: parsed, notes });
    else if (liability) await liabilitiesRepo.update(liability.id, { name: name.trim(), type: type as Liability["type"], balance: parsed, notes });
    toast(isNew ? "Liability added" : "Liability updated", "pos");
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isNew ? "New liability" : "Edit liability"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save}>
            {isNew ? "Add" : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="loan">Loan</option>
              <option value="credit">Credit</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Outstanding balance (DZD)">
            <Input value={balance} inputMode="numeric" placeholder="0" onChange={(e) => setBalance(e.target.value)} />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}
