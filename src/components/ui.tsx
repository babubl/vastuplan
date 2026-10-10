import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { Link } from "react-router-dom";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

type V = "primary" | "secondary" | "quiet";
const btn: Record<V, string> = {
  primary: "bg-ink text-white hover:bg-cobalt",
  secondary: "bg-white text-ink ring-1 ring-ink hover:bg-ink hover:text-white",
  quiet: "text-ink hover:bg-ink/5",
};
const base = "inline-flex items-center justify-center gap-2 px-5 py-3 text-[15px] font-medium transition-colors disabled:opacity-50";
export const Button = ({ variant = "primary", className, ...p }: ComponentProps<"button"> & { variant?: V }) => <button className={cx(base, btn[variant], className)} {...p} />;
export const ButtonLink = ({ variant = "primary", className, ...p }: ComponentProps<typeof Link> & { variant?: V }) => <Link className={cx(base, btn[variant], "no-underline", className)} {...p} />;

export function Segmented<T extends string | number>({ value, onChange, options, label, full }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; title?: string }[]; label: string; full?: boolean }) {
  return (
    <div role="radiogroup" aria-label={label} className={cx("inline-flex border border-ink", full && "flex w-full")}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={String(o.value)} type="button" role="radio" aria-checked={on} title={o.title} onClick={() => onChange(o.value)}
            className={cx("flex-1 whitespace-nowrap border-r border-ink px-3 py-1.5 text-[13.5px] font-medium transition-colors last:border-r-0", on ? "bg-ink text-white" : "bg-white text-ink hover:bg-stone")}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A number box you can type into freely. The value is checked when you finish (blur or Enter),
 * not on every keystroke, so typing "45" never jumps to the minimum after the "4".
 */
export function NumberField({ id, label, value, onChange, min, max, step = 1, suffix }: { id: string; label: string; value: number; onChange: (n: number) => void; min: number; max: number; step?: number; suffix?: string }) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setText(String(value)); }, [value, focused]);
  const n = Number(text);
  const valid = text.trim() !== "" && Number.isFinite(n) && n >= min && n <= max;
  const commit = () => {
    if (text.trim() === "" || !Number.isFinite(n)) { setText(String(value)); return; }
    const c = Math.max(min, Math.min(max, Math.round(n / step) * step));
    setText(String(c));
    if (c !== value) onChange(c);
  };
  return (
    <label htmlFor={id} className="block">
      <span className="text-[13px] font-semibold text-ink">{label}</span>
      <span className="relative mt-1 block">
        <input id={id} type="text" inputMode="numeric" pattern="[0-9]*" value={text} aria-invalid={!valid}
          onFocus={(e) => { setFocused(true); e.currentTarget.select(); }}
          onChange={(e) => { const t = e.target.value.replace(/[^0-9.]/g, ""); setText(t); const v = Number(t); if (t !== "" && Number.isFinite(v) && v >= min && v <= max) onChange(v); }}
          onBlur={() => { setFocused(false); commit(); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
            if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); const c = Math.max(min, Math.min(max, (Number(text) || value) + (e.key === "ArrowUp" ? step : -step))); setText(String(c)); onChange(c); }
          }}
          className={cx("num w-full rounded-none border-0 border-b bg-transparent px-0 py-2 pr-8 text-[17px] text-ink outline-none transition-colors focus:border-ink", valid ? "border-line" : "border-chilli")} />
        {suffix && <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-sm text-muted">{suffix}</span>}
      </span>
      {!valid && <span className="mt-1 block text-[12px] text-chilli">Enter {min} to {max}</span>}
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
      <span aria-hidden className={cx("relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-cobalt", checked ? "bg-ink" : "bg-ink/20")}>
        <span className={cx("absolute top-0.5 size-4 rounded-full bg-white transition-transform", checked ? "translate-x-4" : "translate-x-0.5")} />
      </span>
    </label>
  );
}

export function Score({ value, label, size = "md" }: { value: number; label: string; size?: "md" | "lg" }) {
  const col = value >= 85 ? "text-neem" : value >= 65 ? "text-[#9A6B00]" : "text-chilli";
  return (
    <div>
      <p className={cx("num wide font-medium leading-none tracking-tight", col, size === "lg" ? "text-[48px]" : "text-[28px]")}>{value}<span className="text-[0.4em] text-muted">/100</span></p>
      <p className="mt-1 text-[13px] text-muted">{label}</p>
    </div>
  );
}
