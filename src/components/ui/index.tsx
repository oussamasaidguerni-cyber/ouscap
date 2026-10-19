import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export { Skeleton, SkeletonList, SkeletonStats } from "./Skeleton";

/* Button ------------------------------------------------------------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-fg text-ink hover:opacity-90",
  secondary: "bg-surface-raised text-fg border border-line hover:border-muted",
  ghost: "text-muted hover:text-fg hover:bg-surface-raised",
  danger: "bg-surface-raised text-neg border border-line hover:border-neg",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-sm",
  icon: "h-9 w-9",
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}>(({ className, variant = "secondary", size = "md", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-2 font-medium tracking-wide transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none select-none whitespace-nowrap",
      buttonVariants[variant],
      buttonSizes[size],
      className,
    )}
    {...props}
  />
));
Button.displayName = "Button";

/* Input / Select / Textarea ------------------------------------------ */

const fieldBase =
  "w-full bg-ink border border-line px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-muted transition-colors";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldBase, "h-10 tnum", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(fieldBase, "h-10 appearance-none pr-8 bg-ink", className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldBase, "min-h-20 resize-y", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

/* Field -------------------------------------------------------------- */

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      {label ? <span className="stat-label mb-1.5 block">{label}</span> : null}
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-neg">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-2xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

/* Badge -------------------------------------------------------------- */

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "pos" | "neg" | "warn";
  className?: string;
}) {
  const tones = {
    neutral: "text-muted border-line",
    pos: "text-pos border-pos/40",
    neg: "text-neg border-neg/40",
    warn: "text-warn border-warn/40",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center border px-1.5 py-0.5 text-2xs uppercase tracking-widest",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* Divider ------------------------------------------------------------ */

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}

/* Empty state -------------------------------------------------------- */

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 border border-dashed border-line px-6 py-14 text-center">
      {icon ? <div className="text-muted">{icon}</div> : null}
      <p className="text-sm font-medium text-fg">{title}</p>
      {description ? <p className="max-w-sm text-xs leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
