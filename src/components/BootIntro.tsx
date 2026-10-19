import { useEffect, useState } from "react";
import { MARK_PATHS } from "@/brand";

const SESSION_KEY = "ouscap.intro.seen";
const DURATION_MS = 3000;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/**
 * Boot intro — a brief, monochrome brand reveal. Runs once per browser session
 * (iOS "Add to Home Screen" included), is skippable by click/key/tap, and is
 * bypassed entirely for reduced-motion users. It never blocks data loading: the
 * app mounts behind it.
 */
export function BootIntro({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState<boolean>(() => shouldShow());
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (prefersReducedMotion()) {
      markSeen();
      setVisible(false);
      return;
    }
    const leaveTimer = window.setTimeout(() => beginLeave(), DURATION_MS - 400);
    const doneTimer = window.setTimeout(() => finish(), DURATION_MS);
    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const skip = () => beginLeave();
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function beginLeave() {
    setLeaving(true);
    window.setTimeout(finish, 400);
  }

  function finish() {
    markSeen();
    setVisible(false);
  }

  return (
    <>
      {children}
      {visible ? (
        <div
          aria-hidden
          className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ink ${
            leaving ? "animate-intro-out" : ""
          }`}
        >
          <svg
            viewBox="0 0 100 100"
            width={84}
            height={84}
            fill="none"
            className="text-fg"
          >
            <path
              d={MARK_PATHS.ring}
              stroke="currentColor"
              strokeWidth={6.5}
              strokeLinecap="round"
              pathLength={1}
              style={{ ["--mark-len" as string]: "1", strokeDasharray: "1 1" }}
              className="animate-mark-draw"
            />
            <path
              d={MARK_PATHS.line}
              stroke="currentColor"
              strokeWidth={6.5}
              strokeLinecap="round"
              pathLength={1}
              style={{ ["--mark-len" as string]: "1", strokeDasharray: "1 1" }}
              className="animate-mark-draw"
            />
          </svg>

          <div className="mt-7 text-center animate-word-reveal">
            <p className="text-sm font-semibold tracking-[0.34em] text-fg">OUSCAP</p>
            <p className="mt-2 text-2xs uppercase tracking-[0.22em] text-muted">
              Your money. In perspective.
            </p>
          </div>

          <span className="absolute bottom-8 text-2xs tracking-[0.2em] text-muted/70">
            TAP TO CONTINUE
          </span>
        </div>
      ) : null}
    </>
  );
}

function shouldShow(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(SESSION_KEY) !== "1";
  } catch {
    return true;
  }
}

function markSeen(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* storage unavailable — intro will simply show again next launch */
  }
}
