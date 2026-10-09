import type { ComponentProps, ReactNode } from "react";
import { Link } from "react-router-dom";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

type V = "primary" | "secondary" | "quiet";
const btn: Record<V, string> = {
  primary: "bg-indigo text-white hover:bg-indigo-700",
  secondary: "bg-white text-ink ring-1 ring-line hover:ring-ink/30",
  quiet: "text-ink hover:bg-ink/5",
};
const base = "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[15px] font-semibold transition-colors disabled:opacity-50";
export const Button = ({ variant = "primary", className, ...p }: ComponentProps<"button"> & { variant?: V }) => <button className={cx(base, btn[variant], className)} {...p} />;
export const ButtonLink = ({ variant = "primary", className, ...p }: ComponentProps<typeof Link> & { variant?: V }) => <Link className={cx(base, btn[variant], "no-underline", className)} {...p} />;

export function Segmented<T extends string | number>({ value, onChange, options, label, full }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; title?: string }[]; label: string; full?: boolean }) {
  return (
    <div role="radiogroup" aria-label={label} className={cx("inline-flex rounded-md bg-ink/[0.06] p-0.5", full && "flex w-full")}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={String(o.value)} type="button" role="radio" aria-checked={on} title={o.title} onClick={() => onChange(o.value)}
            className={cx("flex-1 whitespace-nowrap rounded-[5px] px-3 py-1.5 text-sm font-semibold transition-colors", on ? "bg-white text-ink shadow-[0_1px_2px_rgba(29,39,51,.15)]" : "text-muted hover:text-ink")}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function NumberField({ id, label, value, onChange, min, max, step = 1, suffix }: { id: string; label: string; value: number; onChange: (n: number) => void; min: number; max: number; step?: number; suffix?: string }) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-[13px] font-semibold text-ink">{label}</span>
      <span className="relative mt-1 block">
        <input id={id} type="number" inputMode="numeric" min={min} max={max} step={step} value={value}
          onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n))); }}
          className="num w-full rounded-md border border-line bg-white px-3 py-2 pr-10 text-[15px] text-ink outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/20" />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{suffix}</span>}
      </span>
    </label>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (b: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 py-1.5">
      <span>
        <span className="block text-[14px] font-medium text-ink">{label}</span>
        {hint && <span className="block text-[12.5px] leading-snug text-muted">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden className={cx("relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-indigo", checked ? "bg-indigo" : "bg-ink/20")}>
        <span className={cx("absolute top-0.5 size-4 rounded-full bg-white transition-transform", checked ? "translate-x-4" : "translate-x-0.5")} />
      </span>
    </label>
  );
}

export function Score({ value, label, size = "md" }: { value: number; label: string; size?: "md" | "lg" }) {
  const col = value >= 85 ? "text-neem" : value >= 65 ? "text-[#9A6B00]" : "text-chilli";
  return (
    <div>
      <p className={cx("num font-extrabold leading-none tracking-tight", col, size === "lg" ? "text-[44px]" : "text-[26px]")}>{value}<span className="text-[0.45em] font-bold text-muted">/100</span></p>
      <p className="mt-1 text-[13px] text-muted">{label}</p>
    </div>
  );
}
