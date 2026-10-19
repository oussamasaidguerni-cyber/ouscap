import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, TrendingUp } from "lucide-react";
import { useFinance } from "@/store/FinanceProvider";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, EmptyState, Field, Input, Select, Textarea, Badge, SkeletonList } from "@/components/ui";
import { Dialog, ConfirmDialog } from "@/components/ui/Dialog";
import { goalProgress } from "@/domain/accounting";
import { formatDZD } from "@/domain/money";
import type { Goal, GoalStatus } from "@/domain/types";
import { goalsRepo } from "@/data/repositories";
import { useToast } from "@/components/ui/Toast";
import { todayISO } from "@/lib/dates";

export function GoalsPage() {
  const finance = useFinance();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Goal | "new" | null>(null);
  const [deleting, setDeleting] = useState<Goal | null>(null);
  const [contributing, setContributing] = useState<Goal | null>(null);

  const goals = [...finance.goals].sort((a, b) => statusOrder(a.status) - statusOrder(b.status));

  if (finance.loading) {
    return (
      <>
        <PageHeader title="Savings goals" description="Loading…" />
        <SkeletonList rows={4} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Savings goals"
        description="Explicit targets. Contributions are manual — a transfer is never assumed to fund a goal."
        actions={
          <Button variant="primary" size="sm" onClick={() => setEditing("new")}>
            <Plus size={14} /> New goal
          </Button>
        }
      />

      {goals.length === 0 ? (
        <EmptyState
          title="No goals yet"
          description="Define targets like an emergency fund, a laptop, education, travel, or startup funding."
          action={
            <Button variant="primary" onClick={() => setEditing("new")}>
              <Plus size={14} /> Create a goal
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const p = goalProgress(goal, todayISO());
            return (
              <div key={goal.id} className="card flex flex-col p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-medium text-fg">{goal.name}</h3>
                    <Badge tone={goal.status === "achieved" ? "pos" : goal.status === "active" ? "neutral" : "warn"}>
                      {goal.status}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <button className="p-1 text-muted hover:text-fg" onClick={() => setEditing(goal)} aria-label="Edit">
                      <Pencil size={14} />
                    </button>
                    <button className="p-1 text-muted hover:text-neg" onClick={() => setDeleting(goal)} aria-label="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="tnum text-lg font-semibold text-fg">{formatDZD(goal.contributed)}</span>
                    <span className="tnum text-2xs text-muted">of {formatDZD(goal.target)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-line">
                    <div className="h-full bg-fg" style={{ width: `${p.progress}%` }} />
                  </div>
                </div>

                <dl className="space-y-1 text-2xs">
                  <div className="flex justify-between">
                    <dt className="text-muted">Remaining</dt>
                    <dd className="tnum text-fg">{formatDZD(p.remaining)}</dd>
                  </div>
                  {goal.targetDate ? (
                    <>
                      <div className="flex justify-between">
                        <dt className="text-muted">Target date</dt>
                        <dd className="tnum text-fg">{goal.targetDate}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted">Required monthly</dt>
                        <dd className="tnum text-fg">
                          {p.requiredMonthly !== null ? `${formatDZD(p.requiredMonthly)}/mo` : "—"}
                        </dd>
                      </div>
                    </>
                  ) : null}
                </dl>

                <div className="mt-3 pt-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full"
                    onClick={() => setContributing(goal)}
                    disabled={goal.status === "archived"}
                  >
                    <TrendingUp size={14} /> Add contribution
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <GoalDialog open={editing !== null} goal={editing} onClose={() => setEditing(null)} />
      <ContributeDialog goal={contributing} onClose={() => setContributing(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) {
            await goalsRepo.remove(deleting.id);
            toast("Goal deleted", "info");
          }
        }}
        title="Delete goal?"
        description="This removes the goal and its recorded contributions. Account balances are not affected."
        confirmLabel="Delete"
      />
    </>
  );
}

function statusOrder(status: GoalStatus): number {
  return { active: 0, paused: 1, achieved: 2, archived: 3 }[status];
}

function GoalDialog({ open, goal, onClose }: { open: boolean; goal: Goal | "new" | null; onClose: () => void }) {
  const { toast } = useToast();
  const isNew = goal === "new";
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [contributed, setContributed] = useState("0");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<GoalStatus>("active");

  useMemo(() => {
    if (goal && goal !== "new") {
      setName(goal.name);
      setTarget(String(goal.target));
      setContributed(String(goal.contributed));
      setTargetDate(goal.targetDate ?? "");
      setNotes(goal.notes ?? "");
      setStatus(goal.status);
    } else if (isNew) {
      setName("");
      setTarget("");
      setContributed("0");
      setTargetDate("");
      setNotes("");
      setStatus("active");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal, isNew]);

  async function save() {
    const targetNum = Number(target);
    const contributedNum = Number(contributed);
    if (!name.trim() || !Number.isInteger(targetNum) || targetNum <= 0) {
      toast("Enter a name and a positive target", "neg");
      return;
    }
    const payload = {
      name: name.trim(),
      target: targetNum,
      contributed: Number.isInteger(contributedNum) ? contributedNum : 0,
      targetDate: targetDate || null,
      notes,
      status,
    };
    if (isNew) await goalsRepo.create(payload);
    else if (goal) await goalsRepo.update(goal.id, payload);
    toast(isNew ? "Goal created" : "Goal updated", "pos");
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isNew ? "New goal" : "Edit goal"}
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
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emergency fund" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Target (DZD)">
            <Input value={target} inputMode="numeric" placeholder="0" onChange={(e) => setTarget(e.target.value)} />
          </Field>
          <Field label="Already contributed (DZD)">
            <Input value={contributed} inputMode="numeric" onChange={(e) => setContributed(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Target date" hint="Optional">
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as GoalStatus)}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="achieved">Achieved</option>
              <option value="archived">Archived</option>
            </Select>
          </Field>
        </div>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}

function ContributeDialog({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");

  async function save() {
    const value = Number(amount);
    if (!goal || !Number.isInteger(value) || value <= 0) {
      toast("Enter a positive amount", "neg");
      return;
    }
    await goalsRepo.contribute(goal.id, value);
    toast("Contribution recorded", "pos");
    setAmount("");
    onClose();
  }

  return (
    <Dialog
      open={goal !== null}
      onClose={onClose}
      title={`Contribute to ${goal?.name ?? ""}`}
      description="This records progress toward the goal. It does not move money between accounts — make a transfer separately if you are setting funds aside."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save}>
            Add contribution
          </Button>
        </>
      }
    >
      <Field label="Contribution (DZD)">
        <Input
          value={amount}
          inputMode="numeric"
          autoFocus
          placeholder="0"
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>
    </Dialog>
  );
}
