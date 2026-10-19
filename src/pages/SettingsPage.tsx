import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Upload,
  Lock,
  Trash2,
  Moon,
  Sun,
  Monitor,
  HardDrive,
  Plus,
  Pencil,
  Archive,
  ShieldAlert,
} from "lucide-react";
import { useFinance } from "@/store/FinanceProvider";
import { useSettings } from "@/store/SettingsProvider";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Divider, EmptyState, Field, Input, Select, Badge } from "@/components/ui";
import { Dialog, ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { exportToFile, restoreFromText, wipeAllData } from "@/data/backup";
import { storageEstimate, requestPersistence } from "@/data/db";
import { categoriesRepo } from "@/data/repositories";
import type { Category, Context } from "@/domain/types";
import { CONTEXT_LABEL } from "@/domain/types";
import { Wordmark } from "@/brand";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SettingsPage() {
  const finance = useFinance();
  const { settings, update, resolvedTheme } = useSettings();
  const { toast } = useToast();

  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [wipeOpen, setWipeOpen] = useState(false);

  useEffect(() => {
    void storageEstimate().then(setStorage);
  }, [finance.transactions.length]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description="Preferences, categories, data, and backup." />

      {/* Brand presentation */}
      <section className="card mb-4 flex items-center justify-between p-5">
        <Wordmark size={34} tagline stacked />
        <Badge>Local-first</Badge>
      </section>

      {/* Appearance */}
      <Section title="Appearance">
        <div className="grid grid-cols-3 gap-px bg-line">
          {([
            { key: "dark", label: "Dark", icon: Moon },
            { key: "light", label: "Light", icon: Sun },
            { key: "system", label: "System", icon: Monitor },
          ] as const).map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.key}
                onClick={() => update({ theme: opt.key })}
                className={`flex flex-col items-center gap-1.5 py-4 text-xs transition-colors ${
                  settings.theme === opt.key ? "bg-fg text-ink" : "bg-surface text-muted hover:text-fg"
                }`}
              >
                <Icon size={16} />
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-2xs text-muted">Currently showing the {resolvedTheme} theme.</p>
      </Section>

      {/* Display preferences */}
      <Section title="Display preferences">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date format">
            <Select
              value={settings.dateFormat}
              onChange={(e) => update({ dateFormat: e.target.value as typeof settings.dateFormat })}
            >
              <option value="yyyy-MM-dd">YYYY-MM-DD</option>
              <option value="dd/MM/yyyy">DD/MM/YYYY</option>
            </Select>
          </Field>
          <Field label="Month start day" hint="Move reporting months to match a payday.">
            <Input
              type="number"
              min={1}
              max={28}
              value={settings.monthStartDay}
              onChange={(e) => update({ monthStartDay: Math.max(1, Math.min(28, Number(e.target.value) || 1)) })}
            />
          </Field>
        </div>
      </Section>

      {/* Categories */}
      <CategorySection />

      {/* Storage */}
      <Section title="Storage">
        <div className="flex items-center gap-3 text-xs text-muted">
          <HardDrive size={16} />
          {storage ? (
            <span className="tnum">
              Using {formatBytes(storage.usage)} of about {formatBytes(storage.quota)} available.
            </span>
          ) : (
            <span>Storage estimate unavailable in this browser.</span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={async () => {
              const granted = await requestPersistence();
              toast(
                granted ? "Persistent storage granted" : "Persistence not granted by the browser",
                granted ? "pos" : "info",
              );
            }}
          >
            Request persistent storage
          </Button>
        </div>
        <p className="mt-3 text-2xs leading-relaxed text-muted">
          Your records live in this browser's IndexedDB. Browser storage is not automatically encrypted and can be cleared by
          the browser or lost if the device fails. Export regular backups.
        </p>
      </Section>

      {/* Backup */}
      <Section title="Backup & restore">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setExportOpen(true)}>
            <Download size={14} /> Export data
          </Button>
          <Button size="sm" onClick={() => setRestoreOpen(true)}>
            <Upload size={14} /> Restore backup
          </Button>
        </div>
        {settings.lastBackupAt ? (
          <p className="mt-3 text-2xs text-muted">Last export: {new Date(settings.lastBackupAt).toLocaleString()}</p>
        ) : (
          <p className="mt-3 text-2xs text-muted">No backup has been exported from this device yet.</p>
        )}
      </Section>

      {/* Danger zone */}
      <Section title="Danger zone" tone="danger">
        <div className="flex items-start gap-3">
          <ShieldAlert size={16} className="mt-0.5 text-neg" />
          <div className="flex-1">
            <p className="text-xs leading-relaxed text-muted">
              Deleting all data is permanent and cannot be undone. Export a backup first.
            </p>
            <Button size="sm" variant="danger" className="mt-3" onClick={() => setWipeOpen(true)}>
              <Trash2 size={14} /> Delete all data
            </Button>
          </div>
        </div>
      </Section>

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
      <RestoreDialog open={restoreOpen} onClose={() => setRestoreOpen(false)} />
      <ConfirmDialog
        open={wipeOpen}
        onClose={() => setWipeOpen(false)}
        onConfirm={async () => {
          await wipeAllData();
          toast("All data deleted", "neg");
        }}
        title="Delete all data?"
        description="Every account, transaction, budget, and goal stored on this device will be permanently erased."
        confirmLabel="Delete everything"
      />
    </div>
  );
}

function Section({ title, children, tone }: { title: string; children: React.ReactNode; tone?: "danger" }) {
  return (
    <section className="card mb-4 p-5">
      <h2 className={`stat-label mb-4 ${tone === "danger" ? "text-neg" : ""}`}>{title}</h2>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */

function CategorySection() {
  const finance = useFinance();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  return (
    <Section title="Categories">
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus size={14} /> New category
        </Button>
      </div>
      {finance.categories.length === 0 ? (
        <EmptyState title="No categories" description="Create categories to classify income and expenses." />
      ) : (
        <div className="divide-y divide-line">
          {finance.categories.map((c) => (
            <div key={c.id} className="flex items-center gap-3 py-2.5">
              <span className="flex-1 text-sm text-fg">{c.name}</span>
              <Badge tone={c.kind === "income" ? "pos" : "neutral"}>{c.kind}</Badge>
              <Badge>{CONTEXT_LABEL[c.context]}</Badge>
              {c.archived ? <Badge tone="warn">Archived</Badge> : null}
              <button className="p-1 text-muted hover:text-fg" onClick={() => setEditing(c)} aria-label="Edit">
                <Pencil size={14} />
              </button>
              <button
                className="p-1 text-muted hover:text-fg"
                onClick={async () => {
                  await categoriesRepo.archive(c.id, !c.archived);
                  toast(c.archived ? "Category restored" : "Category archived", "info");
                }}
                aria-label="Archive"
              >
                <Archive size={14} />
              </button>
              <button className="p-1 text-muted hover:text-neg" onClick={() => setDeleting(c)} aria-label="Delete">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <CategoryDialog open={editing !== null} category={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) {
            await categoriesRepo.remove(deleting.id);
            toast("Category deleted — affected transactions are now uncategorized", "info");
          }
        }}
        title="Delete category?"
        description="Transactions keep their history but become Uncategorized. Any budget for this category is removed."
        confirmLabel="Delete"
      />
    </Section>
  );
}

function CategoryDialog({
  open,
  category,
  onClose,
}: {
  open: boolean;
  category: Category | "new" | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const isNew = category === "new";
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [context, setContext] = useState<Context>("personal");

  useMemo(() => {
    if (category && category !== "new") {
      setName(category.name);
      setKind(category.kind);
      setContext(category.context);
    } else if (isNew) {
      setName("");
      setKind("expense");
      setContext("personal");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, isNew]);

  async function save() {
    if (!name.trim()) {
      toast("Enter a name", "neg");
      return;
    }
    if (isNew) await categoriesRepo.create({ name: name.trim(), kind, context });
    else if (category) await categoriesRepo.update(category.id, { name: name.trim(), kind, context });
    toast(isNew ? "Category created" : "Category updated", "pos");
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isNew ? "New category" : "Edit category"}
      size="sm"
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
          <Field label="Kind">
            <Select value={kind} onChange={(e) => setKind(e.target.value as "income" | "expense")}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </Select>
          </Field>
          <Field label="Default context">
            <Select value={context} onChange={(e) => setContext(e.target.value as Context)}>
              {(["personal", "freelance", "startup"] as Context[]).map((c) => (
                <option key={c} value={c}>
                  {CONTEXT_LABEL[c]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */

function ExportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const { update } = useSettings();
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(encrypted: boolean) {
    if (encrypted) {
      if (passphrase.length < 8) {
        toast("Use a passphrase of at least 8 characters", "neg");
        return;
      }
      if (passphrase !== confirm) {
        toast("Passphrases do not match", "neg");
        return;
      }
    }
    setBusy(true);
    try {
      const name = await exportToFile({ passphrase: encrypted ? passphrase : undefined });
      await update({ lastBackupAt: new Date().toISOString() });
      toast(`Exported ${name}`, "pos");
      setPassphrase("");
      setConfirm("");
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Export data"
      description="Download a copy of everything stored on this device."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => run(false)}>
            Export plain JSON
          </Button>
          <Button variant="primary" disabled={busy} onClick={() => run(true)}>
            <Lock size={14} /> Encrypt & export
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs leading-relaxed text-muted">
          Plain JSON is easy to inspect and restore. Encrypted backups wrap the same data in AES-GCM, keyed by your
          passphrase. Your passphrase is never stored — if you lose it, the encrypted backup cannot be recovered.
        </p>
        <Divider />
        <Field label="Passphrase (encrypted export only)" hint="At least 8 characters.">
          <Input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
        </Field>
        <Field label="Confirm passphrase">
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}

function RestoreDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function pick(f: File) {
    setFile(f);
    setText(await f.text());
  }

  async function doRestore() {
    setBusy(true);
    try {
      const result = await restoreFromText(text, passphrase || undefined);
      toast(
        `Restored ${result.transactions} transaction(s) and ${result.accounts} account(s)`,
        "pos",
      );
      setFile(null);
      setText("");
      setPassphrase("");
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not restore this backup", "neg");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title="Restore backup"
        description="Restoring replaces all records currently on this device."
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="danger" disabled={!text || busy} onClick={() => setConfirmOpen(true)}>
              Restore
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Backup file">
            <input
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void pick(f);
              }}
              className="block w-full text-xs text-muted file:mr-3 file:border file:border-line file:bg-surface-raised file:px-3 file:py-2 file:text-xs file:text-fg"
            />
          </Field>
          {file ? <p className="text-2xs text-muted">Selected: {file.name}</p> : null}
          <Field label="Passphrase (only for encrypted backups)">
            <Input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
          </Field>
          <p className="text-2xs leading-relaxed text-muted">
            Invalid backups are rejected before anything is written, so a bad file cannot damage your existing records.
          </p>
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={doRestore}
        title="Replace all data?"
        description="Your current records on this device will be permanently replaced by the contents of the backup."
        confirmLabel="Replace data"
      />
    </>
  );
}
