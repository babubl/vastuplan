import { Check as CheckIcon, Info, TriangleAlert, X } from "lucide-react";
import type { Check, HouseDesign } from "../engine/types";
import { Score, cx } from "./ui";

function Row({ c }: { c: Check }) {
  const I = c.status === "pass" ? CheckIcon : c.status === "partial" ? TriangleAlert : c.status === "fail" ? X : Info;
  return (
    <li className="flex gap-3 py-3">
      <span className={cx("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full", c.status === "pass" ? "bg-neem/15 text-neem" : c.status === "partial" ? "bg-turmeric/20 text-[#8A5F00]" : "bg-chilli/15 text-chilli")}><I className="size-3.5" aria-hidden /></span>
      <span>
        <span className="block text-[14.5px] font-semibold text-ink">{c.title}<span className="sr-only">: {c.status}</span></span>
        <span className="block text-[13.5px] leading-relaxed text-body">{c.detail}</span>
      </span>
    </li>
  );
}

export default function Report({ design }: { design: HouseDesign }) {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <Score value={design.vastuScore} label="Vastu" size="lg" />
        <Score value={design.livabilityScore} label="Livability" size="lg" />
        <div><p className="num text-[44px] font-extrabold leading-none tracking-tight text-ink">{design.builtUpArea}</p><p className="mt-1 text-[13px] text-muted">sq ft built up</p></div>
      </div>
      <section>
        <h3 className="text-lg">Vastu, rule by rule</h3>
        <p className="mt-1 text-[13.5px] text-muted">Traditional guidelines as commonly taught. Where Vastu and daylight disagree, the plan keeps the room livable.</p>
        <ul className="mt-2 divide-y divide-line">{design.vastu.map((c) => <Row key={c.id} c={c} />)}</ul>
      </section>
      <section>
        <h3 className="text-lg">Livability and building code</h3>
        <ul className="mt-2 divide-y divide-line">{design.livability.map((c) => <Row key={c.id} c={c} />)}</ul>
      </section>
      <section>
        <h3 className="text-lg">On site</h3>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[14px] text-body">{design.notes.map((n) => <li key={n}>{n}</li>)}</ul>
      </section>
    </div>
  );
}
