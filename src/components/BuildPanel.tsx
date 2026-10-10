import { useState } from "react";
import { areaStatement, COST_TIERS, openingSchedule, quantities } from "../engine/estimate";
import type { HouseDesign } from "../engine/types";
import { cx } from "./ui";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const lakh = (n: number) => `₹${(n / 100000).toFixed(1)} lakh`;

/** What the owner, the mason and the engineer each need from the plan. */
export default function BuildPanel({ design }: { design: HouseDesign }) {
  const a = areaStatement(design);
  const sched = openingSchedule(design);
  const q = quantities(a.builtUp);
  const [tier, setTier] = useState<(typeof COST_TIERS)[number]["id"]>("standard");
  const [rate, setRate] = useState<number>(COST_TIERS[1].rate);
  const cols = design.floors[0].columns?.length ?? 0;
  const wideRooms = design.floors.flatMap((f) => f.rooms).filter((r) => !r.open && Math.min(r.rect.w, r.rect.h) > 15);
  const th = "py-1.5 text-left font-medium text-muted";
  return (
    <div className="space-y-9 text-[14px]">
      <section>
        <h3 className="text-lg">Area statement</h3>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3">
          {[["Plot", a.plotArea], ["Plinth, per floor", a.plinth], ["Built-up, all floors", a.builtUp], ["Carpet area", a.carpet]].map(([k, v]) => (
            <div key={k as string}><dt className="text-[12.5px] text-muted">{k}</dt><dd className="num wide text-[22px] font-medium text-ink">{(v as number).toLocaleString("en-IN")} <span className="text-[13px] text-muted">sq ft</span></dd></div>
          ))}
        </dl>
        <p className="mt-3 text-muted">Ground coverage {a.coverage}% of the plot. Floor space index (FSI) {a.fsi}. Check both against your local authority's limits.</p>
        <details className="mt-3">
          <summary className="cursor-pointer font-medium text-cobalt">Room-by-room areas</summary>
          <table className="mt-2 w-full"><tbody className="divide-y divide-line">{a.rows.map((r, i) => <tr key={i}><td className="py-1.5 text-body">{r.room}<span className="text-muted">, {r.floor.toLowerCase()}</span></td><td className="num py-1.5 text-right text-ink">{r.sqft}</td></tr>)}</tbody></table>
        </details>
      </section>

      <section>
        <h3 className="text-lg">Doors and windows</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[320px]">
            <thead><tr className="border-b border-ink"><th className={th}>Mark</th><th className={th}>Type</th><th className={th}>Size</th><th className={cx(th, "text-right")}>No.</th></tr></thead>
            <tbody className="divide-y divide-line">{sched.map((r) => <tr key={r.mark}><td className="py-1.5 font-semibold text-ink">{r.mark}</td><td className="py-1.5 pr-2 text-body">{r.type}</td><td className="num whitespace-nowrap py-1.5 text-body">{r.size}</td><td className="num py-1.5 text-right text-ink">{r.count}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-lg">Structure</h3>
        <ul className="mt-2 space-y-2 text-body">
          <li>{cols} columns at the wall junctions (toggle "Columns" on the plan), typically 9 × 12 in (230 × 300 mm) for a {design.floors.length === 2 ? "ground-plus-one" : "single-storey"} house, carried straight up through every floor.</li>
          <li>Outer walls 9 in brick, partitions 4½ in. Lintels at 7 ft; window sills at 3 ft.</li>
          <li>{wideRooms.length ? `${wideRooms.map((r) => r.label).join(", ")} span${wideRooms.length === 1 ? "s" : ""} more than 15 ft: plan a deeper beam or an intermediate column there.` : "No room spans more than 15 ft, so ordinary beam depths will do."}</li>
          <li className="text-muted">Column sizes, footings and reinforcement must come from a structural engineer after a soil test.</li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg">Materials, roughly</h3>
        <p className="mt-1 text-muted">Common Indian thumb rules for an RCC-framed house, for {a.builtUp.toLocaleString("en-IN")} sq ft built up. Use them to sanity-check a contractor's quote.</p>
        <table className="mt-2 w-full"><tbody className="divide-y divide-line">{q.map((r) => <tr key={r.item}><td className="py-1.5 text-body">{r.item}<span className="text-muted">, {r.per} {r.unit} per sq ft</span></td><td className="num py-1.5 text-right font-medium text-ink">{r.qty.toLocaleString("en-IN")} {r.unit.split(" ")[0]}</td></tr>)}</tbody></table>
      </section>

      <section>
        <h3 className="text-lg">Cost, indicative</h3>
        <div className="mt-3 grid grid-cols-3 border border-ink" role="radiogroup" aria-label="Finish level">
          {COST_TIERS.map((t) => (
            <button key={t.id} role="radio" aria-checked={tier === t.id} onClick={() => { setTier(t.id); setRate(t.rate); }} className={cx("border-r border-ink px-2 py-2 text-left last:border-r-0", tier === t.id ? "bg-ink text-white" : "bg-white text-ink hover:bg-stone")}>
              <span className="block text-[13.5px] font-medium">{t.name}</span><span className={cx("num block text-[12px]", tier === t.id ? "text-white/70" : "text-muted")}>{inr(t.rate)}/sq ft</span>
            </button>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-2 text-muted" htmlFor="rate">Your local rate <input id="rate" type="text" inputMode="numeric" value={rate} onChange={(e) => setRate(Number(e.target.value.replace(/\D/g, "")) || 0)} className="num w-24 border-b border-line bg-transparent py-1 text-ink outline-none focus:border-ink" /> per sq ft</label>
        <p className="num wide mt-4 text-[34px] font-medium leading-none text-ink">{lakh(a.builtUp * rate)}</p>
        <p className="mt-2 text-muted">{COST_TIERS.find((t) => t.id === tier)?.note}. Construction only; excludes the plot, approvals, compound wall, interiors and GST. Rates vary by city and month, so get three quotes.</p>
      </section>
    </div>
  );
}
