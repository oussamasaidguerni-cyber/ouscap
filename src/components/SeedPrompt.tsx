import { useState } from "react";
import { ArrowRight, ShieldCheck, Database, Sparkles } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import { seedCategories } from "@/data/seed";
import { accountsRepo } from "@/data/repositories";
import { useToast } from "@/components/ui/Toast";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input, Select } from "@/components/ui";
import { parseAmount } from "@/domain/money";
import { cn } from "@/lib/cn";

/**
 * First-run onboarding. Nothing is written until the user acts here, so OUSCAP
 * never plants fake records — it only offers sensible starting points.
 */
export function SeedPrompt() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <EmptyState
        title="Welcome to OUSCAP"
        description="Your money, in perspective — private, local-first, and entirely on your device. Three quick steps and you are tracking. No example transactions are ever added to your records."
        action={
          <Button variant="primary" onClick={() => setOpen(true)}>
            Get started
          </Button>
        }
      />
      <OnboardingDialog
        open={open}
        onClose={() => setOpen(false)}
        onDone={() => toast("Setup complete", "pos")}
      />
    </div>
  );
}

const STEPS = ["Welcome", "First account", "Categories"] as const;

function OnboardingDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("Cash");
  const [type, setType] = useState("cash");
  const [opening, setOpening] = useState("");
  const [withCategories, setWithCategories] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setStep(0);
    setName("Cash");
    setType("cash");
    setOpening("");
    setWithCategories(true);
    setError(null);
  }

  async function finish() {
    const openingBalance = opening.trim() === "" ? 0 : parseAmount(opening);
    if (openingBalance === null) {
      setError("Opening balance must be a whole-dinar number");
      setStep(1);
      return;
    }
    if (!name.trim()) {
      setError("Give the account a name");
      setStep(1);
      return;
    }
    setBusy(true);
    try {
      if (withCategories) await seedCategories();
      await accountsRepo.create({
        name: name.trim(),
        type: type as "cash" | "bank" | "savings" | "other",
        openingBalance,
      });
      onDone();
      reset();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  const footer =
    step === 0 ? (
      <Button variant="primary" onClick={() => setStep(1)}>
        Continue <ArrowRight size={14} />
      </Button>
    ) : step === 1 ? (
      <>
        <Button variant="ghost" onClick={() => setStep(0)}>
          Back
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            if (!name.trim()) {
              setError("Give the account a name");
              return;
            }
            const openingBalance = opening.trim() === "" ? 0 : parseAmount(opening);
            if (openingBalance === null) {
              setError("Opening balance must be a whole-dinar number");
              return;
            }
            setError(null);
            setStep(2);
          }}
        >
          Continue <ArrowRight size={14} />
        </Button>
      </>
    ) : (
      <>
        <Button variant="ghost" onClick={() => setStep(1)}>
          Back
        </Button>
        <Button variant="primary" onClick={finish} disabled={busy}>
          Create account
        </Button>
      </>
    );

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Set up OUSCAP"
      description={`Step ${step + 1} of ${STEPS.length} · ${STEPS[step]}`}
      footer={footer}
    >
      {/* Step indicator */}
      <div className="mb-5 flex gap-1.5">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={cn("h-1 flex-1", i <= step ? "bg-fg" : "bg-line")}
            aria-hidden
          />
        ))}
      </div>

      {step === 0 ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted">
            OUSCAP keeps every record on this device. Nothing leaves your browser, and there is no
            account to create.
          </p>
          <ul className="space-y-3">
            <Bullet icon={ShieldCheck} title="Private by default" body="Data lives in your browser's local storage. No servers, no tracking." />
            <Bullet icon={Database} title="Yours to keep" body="Export a full backup any time from Settings; import it back whenever you need." />
            <Bullet icon={Sparkles} title="Whole dinars" body="Amounts are whole DZD. Transfers between accounts never count as income or expense." />
          </ul>
        </div>
      ) : step === 1 ? (
        <div className="space-y-4">
          <Field label="Account name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="savings">Savings</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Opening balance (DZD)" hint="Optional — defaults to 0.">
              <Input value={opening} inputMode="numeric" placeholder="0" onChange={(e) => setOpening(e.target.value)} />
            </Field>
          </div>
          {error ? <p className="text-xs text-neg">{error}</p> : null}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted">
            Categories keep your spending meaningful. Load a starter set now — you can rename, add,
            or remove any of them in Settings.
          </p>
          <label className="flex items-start gap-3 border border-line p-3 text-xs text-muted">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={withCategories}
              onChange={(e) => setWithCategories(e.target.checked)}
            />
            <span>
              <span className="block text-fg">Load the default set</span>
              Groceries, Rent, Transport, Salary, and more — grouped for personal, freelance, and startup.
            </span>
          </label>
          {error ? <p className="text-xs text-neg">{error}</p> : null}
        </div>
      )}
    </Dialog>
  );
}

function Bullet({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <Icon size={18} />
      <div>
        <p className="text-sm text-fg">{title}</p>
        <p className="text-xs leading-relaxed text-muted">{body}</p>
      </div>
    </li>
  );
}
