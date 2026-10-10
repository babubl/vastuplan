import { fmtArea } from "../engine/geometry";
import { useState } from "react";
import { Check as CheckIcon, ChevronDown, Info, TriangleAlert, X } from "lucide-react";
import type { Check, HouseDesign } from "../engine/types";
import { Score, cx } from "./ui";

function Row({ c }: { c: Check }) {
  const [open, setOpen] = useState(false);
  const I = c.status === "pass" ? CheckIcon : c.status === "partial" ? TriangleAlert : c.status === "fail" ? X : Info;
  return (
    <li className="py-3.5">
      <div className="flex gap-3">
        <span className={cx("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full", c.status === "pass" ? "bg-neem/15 text-neem" : c.status === "partial" ? "bg-turmeric/25 text-[#7A5300]" : "bg-chilli/15 text-chilli")}><I className="size-3.5" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-semibold text-ink">{c.title}<span className="sr-only">: {c.status}</span></p>
          <p className="text-[13.5px] leading-relaxed text-body">{c.detail}</p>
          {c.why && (
            <>
              <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-cobalt hover:underline">
                Why this rule<ChevronDown className={cx("size-3.5 transition-transform", open && "rotate-180")} aria-hidden />
              </button>
              {open && <p className="mt-1.5 border-l-2 border-ink/15 pl-3 text-[13px] leading-relaxed text-body">{c.why}</p>}
            </>
          )}
        </div>
      </div>
    </li>
  );
}

export default function Report({ design }: { design: HouseDesign }) {
  const rules = design.vastu.filter((c) => c.group !== "corner");
  const corners = design.vastu.filter((c) => c.group === "corner");
  return (
    <div className="space-y-9">
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <Score value={design.vastuScore} label="Vastu" size="lg" />
        <Score value={design.livabilityScore} label="Livability" size="lg" />
        <div><p className="num wide text-[48px] font-medium leading-none tracking-tight text-ink">{fmtArea(design.builtUpArea).split(" ")[0]}</p><p className="mt-1 text-[13px] text-muted">{fmtArea(0).split(" ").slice(1).join(" ")} built up</p></div>
      </div>
      {design.adjustments?.length ? (
        <section className="border-l-2 border-turmeric bg-[#FBF5E6] px-4 py-3">
          <h3 className="text-[15px]">Changed from your brief so the house fits</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13.5px] text-body">{design.adjustments.map((n) => <li key={n}>{n}</li>)}</ul>
        </section>
      ) : null}
      <section>
        <h3 className="text-lg">Vastu, rule by rule</h3>
        <p className="mt-1 text-[13.5px] text-muted">Traditional guidelines with their reasoning, so you can judge each one yourself. Where Vastu and daylight disagree, the plan keeps the room livable.</p>
        <ul className="mt-1 divide-y divide-line">{rules.map((c) => <Row key={c.id} c={c} />)}</ul>
      </section>
      <section>
        <h3 className="text-lg">The four corners</h3>
        <p className="mt-1 text-[13.5px] text-muted">The thumb rules most people check first. A common mix-up: the north-east, not the north-west, is the corner kept lowest, lightest and sacred.</p>
        <ul className="mt-1 divide-y divide-line">{corners.map((c) => <Row key={c.id} c={c} />)}</ul>
      </section>
      <section>
        <h3 className="text-lg">Livability and building code</h3>
        <ul className="mt-1 divide-y divide-line">{design.livability.map((c) => <Row key={c.id} c={c} />)}</ul>
      </section>
      <section>
        <h3 className="text-lg">Site services</h3>
        <ul className="mt-2 space-y-2.5 text-[14px] text-body">{design.services.map((s) => <li key={s.kind}><span className="font-semibold text-ink">{s.label === "Bore" ? "Borewell" : s.label === "RWH" ? "Rainwater pit" : s.label}.</span> {s.why}</li>)}</ul>
        <ul className="mt-4 list-disc space-y-1.5 pl-5 text-[13.5px] text-muted">{design.notes.filter((n) => !/overhead water tank|sump or borewell/i.test(n)).map((n) => <li key={n}>{n}</li>)}</ul>
      </section>
    </div>
  );
}
