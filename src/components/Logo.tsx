import { Link } from "react-router-dom";

/** The mark is the Vastu Purusha grid: nine zones, with the north-east (Ishanya) lit. */
export function Mark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" fill="#000" />
      <g fill="none" stroke="#FFF" strokeWidth="1.1"><rect x="6.5" y="6.5" width="19" height="19" /><path d="M12.83 6.5v19M19.17 6.5v19M6.5 12.83h19M6.5 19.17h19" /></g>
      <rect x="19.17" y="6.5" width="6.33" height="6.33" fill="#E0A526" />
    </svg>
  );
}

export default function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 text-ink no-underline" aria-label="VastuPlan home">
      <Mark className="size-7" />
      <span className="wide text-[18px] font-semibold tracking-[-0.02em]">VastuPlan</span>
    </Link>
  );
}
