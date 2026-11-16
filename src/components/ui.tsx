import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { TONE, type Tone } from "@/lib/constants";
import { cn } from "@/lib/format";

// ───────────────────────── Pill (Notion-style tag)

export function Pill({ children, tone, className }: { children: ReactNode; tone?: Tone; className?: string }) {
  const t = tone ?? (typeof children === "string" ? TONE[children] : undefined) ?? "gray";
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-[4px] px-1.5 py-px text-[12.5px] leading-[20px]",
        className,
      )}
      style={{ background: `var(--tag-${t}-bg)`, color: `var(--tag-${t}-fg)` }}
    >
      {children}
    </span>
  );
}

export function PriorityDot({ priority, withLabel }: { priority?: string | null; withLabel?: boolean }) {
  if (!priority) return null;
  const t = TONE[priority] ?? "gray";
  return (
    <span className="inline-flex items-center gap-1.5 text-muted" title={`${priority} priority`}>
      <span className="size-2 shrink-0 rounded-full" style={{ background: `var(--tag-${t}-fg)` }} />
      {withLabel ? <span className="text-fg">{priority}</span> : <span className="sr-only">{priority} priority</span>}
    </span>
  );
}

// ───────────────────────── Buttons

type BtnVariant = "primary" | "ghost" | "outline" | "danger";
const btn: Record<BtnVariant, string> = {
  primary: "bg-accent text-accent-fg hover:opacity-85",
  ghost: "text-muted hover:bg-hover hover:text-fg",
  outline: "border border-line-strong text-fg hover:bg-hover",
  danger: "text-danger hover:bg-[var(--tag-red-bg)]",
};

export function buttonClass(variant: BtnVariant = "outline", size: "sm" | "md" = "md") {
  return cn(
    "inline-flex items-center justify-center gap-1.5 rounded-[5px] font-medium transition-colors select-none",
    "disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2383e2]",
    size === "sm" ? "h-7 px-2 text-[13px]" : "h-8 px-2.5 text-[14px]",
    btn[variant],
  );
}

export function Button({
  variant = "outline",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: BtnVariant; size?: "sm" | "md" }) {
  return <button type="button" className={cn(buttonClass(variant, size), className)} {...props} />;
}

export function LinkButton({
  variant = "outline",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: BtnVariant; size?: "sm" | "md" }) {
  return <Link className={cn(buttonClass(variant, size), className)} {...props} />;
}

// ───────────────────────── Form controls

const control =
  "w-full rounded-md border border-line-strong bg-bg px-2.5 h-8 text-sm text-fg placeholder:text-faint outline-none transition-shadow focus:border-[#2383e2] focus:ring-2 focus:ring-[#2383e2]/20";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "h-auto min-h-20 py-2 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(control, "cursor-pointer pr-7", className)} {...props}>
      {children}
    </select>
  );
}

export function Field({
  label,
  error,
  children,
  hint,
  required,
}: {
  label: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[13px] text-muted">
        {label}
        {required && <span className="text-faint"> *</span>}
      </span>
      {children}
      {error ? <span className="block text-[12.5px] text-danger">{error}</span> : hint ? <span className="block text-[12.5px] text-faint">{hint}</span> : null}
    </label>
  );
}

// ───────────────────────── Layout bits

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[30px] leading-tight font-bold tracking-[-0.02em] text-fg sm:text-[36px]">{title}</h1>
        {description && <p className="tabular mt-1.5 text-[14px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Section({
  title,
  action,
  children,
  className,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0", className)}>
      <div className="flex min-h-9 items-center justify-between gap-2 border-b border-line pb-1.5">
        <h2 className="text-[14px] font-semibold text-fg">{title}</h2>
        {action}
      </div>
      <div className="pt-1">{children}</div>
    </section>
  );
}

export function Empty({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center">
      <p className="text-muted">{message}</p>
      {action}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: ReactNode; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="border-l border-line pl-4">
      <div className="text-[13px] text-muted">{label}</div>
      <div className="tabular mt-1 text-[22px] font-semibold tracking-tight text-fg">{value}</div>
      {sub && <div className="mt-1 text-[13px] text-muted">{sub}</div>}
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th className={cn("h-9 whitespace-nowrap px-3 text-left text-[13px] font-normal text-muted", className)}>{children}</th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("h-10 whitespace-nowrap px-3 text-sm", className)}>{children}</td>;
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full border-collapse [&_tbody_tr]:border-t [&_tbody_tr]:border-line [&_tbody_tr:hover]:bg-hover">
        {children}
      </table>
    </div>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return <span className="tabular text-[12.5px] text-muted">{children}</span>;
}

// ───────────────────────── Dashboard panel

/** A quiet container: hairline border, soft radius, title row. Used to give the Home grid structure. */
export function Panel({
  title,
  count,
  action,
  children,
  className,
}: {
  title: ReactNode;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-[10px] border border-line bg-bg", className)}>
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 px-5">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold">
          {title}
          {count !== undefined && count > 0 && <span className="tabular text-[13px] font-normal text-faint">{count}</span>}
        </h2>
        {action}
      </div>
      <div className="flex-1 pb-3">{children}</div>
    </section>
  );
}

export function PanelEmpty({ text, href, cta }: { text: string; href?: string; cta?: string }) {
  return (
    <div className="flex h-full min-h-28 flex-col items-center justify-center gap-1 px-5 text-center">
      <p className="text-[13px] text-faint">{text}</p>
      {href && cta && (
        <Link href={href} className="text-[13px] font-medium text-muted underline-offset-2 hover:text-fg hover:underline">
          {cta}
        </Link>
      )}
    </div>
  );
}
