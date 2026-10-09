import { Link } from "react-router-dom";

/** The mark is the Vastu Purusha grid: nine zones, with the north-east (Ishanya) lit. */
export function Mark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="7" fill="#1D2733" />
      <g fill="none" stroke="#F3F4F1" strokeWidth="1.2"><rect x="7" y="7" width="18" height="18" /><path d="M13 7v18M19 7v18M7 13h18M7 19h18" /></g>
      <rect x="19" y="7" width="6" height="6" fill="#E0A526" />
    </svg>
  );
}

export default function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 text-ink no-underline" aria-label="VastuPlan home">
      <Mark />
      <span className="text-[19px] font-extrabold tracking-[-0.03em]">VastuPlan</span>
    </Link>
  );
}
