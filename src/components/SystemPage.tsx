import type { InputHTMLAttributes, ReactNode } from "react";
import { Icon } from "./Icon.js";

/** Padrões visuais locais copiados dos componentes do backoffice Phoenix. */
export function SystemCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-white p-5 shadow-main ${className}`}>{children}</section>;
}

export function SystemHeader({
  title,
  subtitle,
  icon,
  actions,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  actions?: ReactNode;
  action?: ReactNode;
}) {
  return <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
    <div className="flex min-w-0 items-center gap-3">
      {icon && <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-blue)]/20 text-lg text-[var(--color-brand-blue-dark)]"><Icon name={icon} /></span>}
      <div className="min-w-0"><h1 className="m-0 text-2xl font-black text-navy">{title}</h1>{subtitle && <p className="m-0 mt-0.5 text-sm text-[var(--fg-2)]">{subtitle}</p>}</div>
    </div>
    {(actions ?? action) && <div className="flex flex-wrap items-center gap-2">{actions ?? action}</div>}
  </div>;
}

export function SystemTabs({
  label,
  tabs,
}: {
  label: string;
  tabs: { label: string; active?: boolean; onClick?: () => void }[];
}) {
  return <div className="-mx-5 flex overflow-x-auto border-b border-[var(--border-soft)] px-5" role="tablist" aria-label={label}>{tabs.map((tab) => <button key={tab.label} type="button" role="tab" aria-selected={Boolean(tab.active)} onClick={tab.onClick} className={`whitespace-nowrap border-b-2 px-4 py-3 text-base font-extrabold ${tab.active ? "border-action text-action" : "border-transparent text-[var(--fg-2)]"}`}>{tab.label}</button>)}</div>;
}

export function SystemSegmented({
  label,
  options,
}: {
  label: string;
  options: { label: string; active?: boolean; onClick?: () => void }[];
}) {
  return <div className="flex max-w-full overflow-x-auto rounded-lg bg-[var(--color-ink-50)] p-1" role="group" aria-label={label}>{options.map((option) => <button key={option.label} type="button" aria-pressed={Boolean(option.active)} onClick={option.onClick} className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-bold ${option.active ? "bg-white text-action shadow-sm" : "text-[var(--fg-2)]"}`}>{option.label}</button>)}</div>;
}

export function SystemField({ label, children, as = "input", options, ...inputProps }: { label: string; children?: ReactNode; as?: "input" | "select"; options?: string[] } & InputHTMLAttributes<HTMLInputElement>) {
  return <label className="block text-sm font-bold text-navy"><span className="mb-1 block">{label}</span>{children ?? (as === "select" ? <select className={systemInputClass} defaultValue="">{options?.map((option, index) => <option key={option} value={index === 0 ? "" : option}>{option}</option>)}</select> : <input {...inputProps} className={systemInputClass} />)}</label>;
}

export const systemInputClass = "w-full rounded-lg border border-[var(--border-strong)] bg-white px-3 py-2.5 font-normal text-navy outline-none focus:border-action";
