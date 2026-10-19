import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Play, Pause } from "lucide-react";
import { useFinance } from "@/store/FinanceProvider";
import { Button, Badge, EmptyState, Field, Input, Select } from "@/components/ui";
import { Dialog, ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { recurringRepo, transactionsRepo } from "@/data/repositories";
import { advanceDate, describeRecurrence, dueOccurrences, transactionFromRule } from "@/data/recurring";
import { parseAmount, formatDZD } from "@/domain/money";
import { CONTEXT_LABEL, TX_TYPE_LABEL, type Context, type RecurringRule } from "@/domain/types";
import { todayISO } from "@/lib/dates";

type RuleDraft = {
  type: "income" | "expense" | "transfer";
  amount: string;
  accountId: string;
  toAccountId: string;
  categoryId: string;
  description: string;
  context: Context;
  freq: "weekly" | "monthly" | "annual";
  interval: string;
  startDate: string;
  endDate: string;
};

const EMPTY: RuleDraft = {
  type: "expense",
  amount: "",
  accountId: "",
  toAccountId: "",
  categoryId: "",
  description: "",
  context: "personal",
  freq: "monthly",
  interval: "1",
  startDate: todayISO(),
  endDate: "",
};

export function RecurringRules() {
  const finance = useFinance();
  const { toast } = useToast();
  const [editing, setEditing] = useState<RecurringRule | "new" | null>(null);
  const [deleting, setDeleting] = useState<RecurringRule | null>(null);

  const activeAccounts = finance.accounts.filter((a) => !a.archived);
  const due = dueOccurrences(finance.recurring);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-2xs text-muted">
          Scheduled items are kept separate from real transactions — nothing is recorded until you confirm it.
        </p>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus size={14} /> New rule
        </Button>
      </div>

      {finance.recurring.length === 0 ? (
        <EmptyState
          title="No recurring rules"
          description="Add subscriptions, regular allowances, freelance retainers, or recurring bills. Their next expected date shows on the Overview."
        />
      ) : (
        <div className="card divide-y divide-line">
          {finance.recurring.map((rule) => (
            <div key={rule.id} className="flex items-center gap-3 px-4 py-3">
              <button
                className="min-w-0 flex-1 text-left"
                onClick={() => setEditing(rule)}
              >
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm text-fg">
                    {rule.template.description || TX_TYPE_LABEL[rule.template.type]}
                  </span>
                  <Badge>{TX_TYPE_LABEL[rule.template.type]}</Badge>
                  {!rule.enabled ? <Badge tone="warn">Paused</Badge> : null}
                </div>
                <p className="tnum truncate text-2xs text-muted">
                  {describeRecurrence(rule)} · next {rule.nextDate}
                  {rule.nextDate < todayISO() ? " (overdue)" : ""}
                </p>
              </button>
              <span className="tnum text-sm text-fg">{formatDZD(rule.template.amount)}</span>
              <button
                className="p-1.5 text-muted hover:text-fg"
                onClick={async () => {
                  await recurringRepo.update(rule.id, { enabled: !rule.enabled });
                  toast(rule.enabled ? "Rule paused" : "Rule resumed", "info");
                }}
                aria-label={rule.enabled ? "Pause rule" : "Resume rule"}
              >
                {rule.enabled ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <button className="p-1.5 text-muted hover:text-fg" onClick={() => setEditing(rule)} aria-label="Edit rule">
                <Pencil size={14} />
              </button>
              <button className="p-1.5 text-muted hover:text-neg" onClick={() => setDeleting(rule)} aria-label="Delete rule">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {due.length > 0 ? (
        <div className="mt-4 card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="stat-label">Due now ({due.length})</h3>
            <Button
              size="sm"
              variant="primary"
              onClick={async () => {
                let created = 0;
                for (const occurrence of due) {
                  // Record only occurrences not yet materialized as transactions.
                  const existing = finance.transactions.find((t) => t.groupId === occurrence.occurrenceKey);
                  if (existing) continue;
                  await transactionsRepo.create({
                    ...transactionFromRule(occurrence.rule, occurrence.date, occurrence.occurrenceKey),
                  });
                  created += 1;
                }
                for (const rule of finance.recurring) {
                  const last = [...due].reverse().find((d) => d.rule.id === rule.id);
                  if (last) {
                    await recurringRepo.update(rule.id, {
                      lastRunDate: last.date,
                      nextDate: advanceDate(last.date, rule),
                    });
                  }
                }
                toast(created > 0 ? `Recorded ${created} occurrence(s)` : "Nothing new to record", "pos");
              }}
            >
              Record all confirmed
            </Button>
          </div>
          <ul className="space-y-1.5">
            {due.map((d) => (
              <li key={d.occurrenceKey} className="flex items-center justify-between text-xs">
                <span className="text-muted">
                  {d.rule.template.description || TX_TYPE_LABEL[d.rule.template.type]} · {d.date}
                </span>
                <span className="tnum text-fg">{formatDZD(d.rule.template.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <RuleDialog
        open={editing !== null}
        rule={editing}
        accountOptions={activeAccounts.map((a) => ({ id: a.id, name: a.name }))}
        categoryOptions={finance.categories.filter((c) => !c.archived).map((c) => ({ id: c.id, name: c.name, kind: c.kind }))}
        onClose={() => setEditing(null)}
      />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) {
            await recurringRepo.remove(deleting.id);
            toast("Recurring rule deleted", "info");
          }
        }}
        title="Delete recurring rule?"
        description="Already-recorded transactions are kept; only the schedule is removed."
        confirmLabel="Delete rule"
      />
    </div>
  );
}

function RuleDialog({
  open,
  rule,
  accountOptions,
  categoryOptions,
  onClose,
}: {
  open: boolean;
  rule: RecurringRule | "new" | null;
  accountOptions: Array<{ id: string; name: string }>;
  categoryOptions: Array<{ id: string; name: string; kind: "income" | "expense" }>;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const isNew = rule === "new";
  const [draft, setDraft] = useState<RuleDraft>(EMPTY);

  const set = <K extends keyof RuleDraft>(key: K, value: RuleDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  // Sync the draft whenever the dialog opens for a different rule.
  useRuleSync(rule, isNew, accountOptions, () => setDraft(fromRule(rule, isNew, accountOptions)));

  const relevantCategories = categoryOptions.filter((c) =>
    draft.type === "income" ? c.kind === "income" : c.kind === "expense",
  );

  async function save() {
    const amount = parseAmount(draft.amount);
    if (amount === null || amount <= 0) {
      toast("Enter a positive amount", "neg");
      return;
    }
    if (!draft.accountId) {
      toast("Choose an account", "neg");
      return;
    }
    const payload = {
      template: {
        type: draft.type,
        amount,
        accountId: draft.accountId,
        toAccountId: draft.type === "transfer" ? draft.toAccountId || null : null,
        categoryId: draft.type === "transfer" ? null : draft.categoryId || null,
        description: draft.description || undefined,
        context: draft.context,
      },
      recurrence:
        draft.freq === "monthly"
          ? ({ freq: "monthly", interval: Math.max(1, Number(draft.interval) || 1) } as const)
          : draft.freq === "weekly"
            ? ({ freq: "weekly", interval: Math.max(1, Number(draft.interval) || 1) } as const)
            : ({ freq: "annual", interval: Math.max(1, Number(draft.interval) || 1) } as const),
      startDate: draft.startDate,
      endDate: draft.endDate || null,
      nextDate: isNew ? draft.startDate : (rule as RecurringRule).nextDate,
      enabled: true,
    };
    if (isNew) await recurringRepo.create(payload);
    else if (rule) await recurringRepo.update(rule.id, payload);
    toast(isNew ? "Recurring rule created" : "Recurring rule updated", "pos");
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isNew ? "New recurring rule" : "Edit recurring rule"}
      description="Defines a schedule. Occurrences are recorded only when you confirm them."
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
        <div className="grid grid-cols-3 gap-px bg-line">
          {(["expense", "income", "transfer"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set("type", t)}
              className={`py-2 text-xs ${draft.type === t ? "bg-fg text-ink" : "bg-surface text-muted hover:text-fg"}`}
            >
              {TX_TYPE_LABEL[t]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Amount (DZD)">
            <Input value={draft.amount} inputMode="numeric" placeholder="0" onChange={(e) => set("amount", e.target.value)} />
          </Field>
          <Field label="Description">
            <Input value={draft.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label={draft.type === "transfer" ? "From account" : "Account"}>
            <Select value={draft.accountId} onChange={(e) => set("accountId", e.target.value)}>
              <option value="">Select account…</option>
              {accountOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
          {draft.type === "transfer" ? (
            <Field label="To account">
              <Select value={draft.toAccountId} onChange={(e) => set("toAccountId", e.target.value)}>
                <option value="">Select account…</option>
                {accountOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label="Category">
              <Select value={draft.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                <option value="">Select category…</option>
                {relevantCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>

        <Field label="Financial context">
          <Select value={draft.context} onChange={(e) => set("context", e.target.value as Context)}>
            {(["personal", "freelance", "startup"] as Context[]).map((c) => (
              <option key={c} value={c}>
                {CONTEXT_LABEL[c]}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Frequency">
            <Select value={draft.freq} onChange={(e) => set("freq", e.target.value as RuleDraft["freq"])}>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </Select>
          </Field>
          <Field label="Every">
            <Input value={draft.interval} inputMode="numeric" onChange={(e) => set("interval", e.target.value)} />
          </Field>
          <Field label="Start date">
            <Input type="date" value={draft.startDate} onChange={(e) => set("startDate", e.target.value)} />
          </Field>
        </div>

        <Field label="End date" hint="Optional — leave empty to continue indefinitely.">
          <Input type="date" value={draft.endDate} onChange={(e) => set("endDate", e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}

function fromRule(
  rule: RecurringRule | "new" | null,
  isNew: boolean,
  accountOptions: Array<{ id: string; name: string }>,
): RuleDraft {
  if (!rule || isNew || rule === "new") {
    return { ...EMPTY, accountId: accountOptions[0]?.id ?? "" };
  }
  const r = rule.recurrence;
  return {
    type: rule.template.type,
    amount: String(rule.template.amount),
    accountId: rule.template.accountId ?? "",
    toAccountId: rule.template.toAccountId ?? "",
    categoryId: rule.template.categoryId ?? "",
    description: rule.template.description ?? "",
    context: rule.template.context,
    freq: r.freq,
    interval: String(r.interval),
    startDate: rule.startDate,
    endDate: rule.endDate ?? "",
  };
}

/** Runs the sync callback when the rule identity changes. */
function useRuleSync(
  rule: RecurringRule | "new" | null,
  isNew: boolean,
  accountOptions: Array<{ id: string; name: string }>,
  sync: () => void,
) {
  useEffect(() => {
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rule, isNew, accountOptions.length]);
}
