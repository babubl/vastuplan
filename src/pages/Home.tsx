import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Container, NumberField, Segmented } from "../components/ui";
import { useDesigns } from "../lib/useDesigns";
import { DEFAULT_INPUT, inputToQuery } from "../lib/share";
import { renderAxonSvg } from "../render/axonSvg";
import { renderPlanSvg } from "../render/planSvg";
import { CORNERS } from "../engine/vastu";
import studies from "../data/studies.json";
import type { Facing, HouseInput } from "../engine/types";

const FACING = (["N", "E", "S", "W"] as Facing[]).map((f) => ({ value: f, label: { N: "North", E: "East", S: "South", W: "West" }[f] }));
const base = import.meta.env.BASE_URL;

export default function Home() {
  const [input, setInput] = useState<HouseInput>(DEFAULT_INPUT);
  const { designs, busy } = useDesigns(input, 150);
  const d = designs?.[0];
  const nav = useNavigate();
  const set = <K extends keyof HouseInput>(k: K, v: HouseInput[K]) => setInput((i) => ({ ...i, [k]: v }));
  const axon = useMemo(() => (d ? renderAxonSvg(d, d.floors[0], { wallHeight: 6, showLabels: true }) : ""), [d]);
  const plan = useMemo(() => (d ? renderPlanSvg(d, d.floors[0], { furniture: true, dims: true, services: true }) : ""), [d]);

  return (
    <>
      <section className="border-b border-line">
        <Container className="pt-12 sm:pt-16">
          <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <h1 className="text-[44px] sm:text-[76px] lg:text-[88px]">Houses, planned to Vastu, for your plot.</h1>
            <p className="max-w-md text-[17px] leading-relaxed text-body lg:pb-3">Enter the plot. VastuPlan lays out every room the way an architect would, checks each one against Vastu and the building code, and draws it to scale in plan, axonometric and 3D.</p>
          </div>
        </Container>
        <Container className="mt-10 grid gap-0 border-t border-ink lg:grid-cols-[340px_1fr]">
          <form className="border-b border-line py-6 lg:border-b-0 lg:border-r lg:pr-8" onSubmit={(e) => { e.preventDefault(); nav(`/design?${inputToQuery(input)}`); }}>
            <p className="label">Your plot</p>
            <div className="mt-3 grid grid-cols-2 gap-5">
              <NumberField id="hw" label="Width along road" value={input.plotWidth} onChange={(v) => set("plotWidth", v)} min={18} max={100} suffix="ft" />
              <NumberField id="hd" label="Depth" value={input.plotDepth} onChange={(v) => set("plotDepth", v)} min={25} max={120} suffix="ft" />
            </div>
            <p className="mt-6 text-[13px] font-semibold text-ink">Road on the</p>
            <div className="mt-2"><Segmented full label="Plot facing" value={input.facing} onChange={(v) => set("facing", v)} options={FACING} /></div>
            <p className="mt-5 text-[13px] font-semibold text-ink">Bedrooms</p>
            <div className="mt-2"><Segmented full label="Bedrooms" value={input.bhk} onChange={(v) => set("bhk", v)} options={[1, 2, 3, 4].map((n) => ({ value: n as 1 | 2 | 3 | 4, label: `${n} BHK` }))} /></div>
            <button type="submit" className="mt-7 flex w-full items-center justify-between bg-ink px-5 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-cobalt">Open in the designer<ArrowUpRight className="size-5" aria-hidden /></button>
            <p className="mt-4 text-[13px] text-muted">Free, nothing to sign up for. In a flat? <Link to="/apartment" className="text-ink underline underline-offset-2">Plan an apartment</Link>.</p>
          </form>
          <figure className="relative min-h-[360px] py-4 lg:pl-8">
            <div className="h-[min(62vh,620px)] w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: axon }} aria-label="Axonometric drawing of the suggested house" role="img" />
            <figcaption className="num flex flex-wrap justify-between gap-x-6 gap-y-1 border-t border-line pt-3 text-[13px] text-muted">
              <span>{busy ? "Drawing…" : `${input.plotWidth} × ${input.plotDepth} ft, ${FACING.find((f) => f.value === input.facing)?.label.toLowerCase()}-facing, ${input.bhk} BHK`}</span>
              {d && <span>Vastu {d.vastuScore}, livability {d.livabilityScore}, {d.builtUpArea} sq ft built up</span>}
            </figcaption>
          </figure>
        </Container>
      </section>

      <section id="studies" className="scroll-mt-16">
        <Container className="py-16 sm:py-24">
          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <h2 className="text-[34px] sm:text-[52px]">Plot studies</h2>
            <p className="max-w-md text-[16px] text-body">Six common Indian plots, each planned by the engine. Open any study to change it room by room.</p>
          </div>
          <div className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {studies.map((s) => (
              <Link key={s.id} to={`/design?${inputToQuery(s.input as HouseInput)}`} className="group flex flex-col bg-white p-5 no-underline transition-colors hover:bg-stone">
                <img src={`${base}studies/${s.id}.svg`} alt={`Axonometric of a ${s.title} plot design`} loading="lazy" className="aspect-[4/3] w-full object-contain" />
                <div className="mt-4 flex items-baseline justify-between gap-3">
                  <h3 className="wide text-[19px] font-medium">{s.title}</h3>
                  <ArrowUpRight className="size-4 shrink-0 text-muted transition-colors group-hover:text-ink" aria-hidden />
                </div>
                <p className="mt-1 text-[14px] leading-relaxed text-body">{s.note}</p>
                <p className="num mt-3 text-[12.5px] text-muted">Vastu {s.vastu}, livability {s.livability}, {s.builtUp} sq ft{s.floors === 2 ? " on two floors" : ""}</p>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-y border-line bg-stone">
        <Container className="py-16 sm:py-24">
          <h2 className="max-w-3xl text-[34px] sm:text-[52px]">One plan, read four ways</h2>
          <div className="mt-12 grid gap-10 lg:grid-cols-2">
            <figure>
              <div className="aspect-[4/3] bg-white p-3 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: plan }} role="img" aria-label="Floor plan of the suggested house" />
              <figcaption className="mt-3 text-[14px] text-body"><span className="font-semibold text-ink">For the owner and architect.</span> A dimensioned plan with doors, windows, furniture to scale, and the sump, septic tank and overhead tank where Vastu puts them.</figcaption>
            </figure>
            <div className="grid content-start gap-8 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {[
                ["For the family", "Walk through the house in 3D from the main door, tap any room for its size and Vastu zone, and compare three layouts."],
                ["For Vastu", "Every rule with its reasoning, the four corners checked one by one, and the main door placed in the auspicious padas."],
                ["For the engineer", "A column grid at the wall junctions, beam spans over 15 ft flagged, and an area statement with coverage and FSI."],
                ["For the mason and contractor", "A door and window schedule, material quantities by common thumb rules, and an indicative cost at your local rate."],
              ].map(([t, b]) => (
                <div key={t} className="border-t border-ink pt-4">
                  <h3 className="text-[17px]">{t}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-body">{b}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section>
        <Container className="py-16 sm:py-24">
          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <h2 className="text-[34px] sm:text-[52px]">The four corners, at a glance</h2>
            <p className="max-w-md text-[16px] text-body">The thumb rules people check first. The north-east, not the north-west, is the corner kept lowest, lightest and sacred. <Link to="/corners" className="text-ink underline underline-offset-2">Read the full guide</Link>.</p>
          </div>
          <div className="mt-10 grid gap-px border border-ink bg-ink sm:grid-cols-2 lg:grid-cols-4">
            {CORNERS.map((c) => (
              <div key={c.zone} className="bg-white p-6">
                <p className="wide text-[34px] font-medium leading-none text-ink">{c.zone}</p>
                <p className="mt-2 text-[13px] text-muted">{c.name}, {c.element.toLowerCase()}</p>
                <p className="mt-5 text-[14px] text-body"><span className="font-semibold text-neem">Keep:</span> {c.keep.slice(0, 3).join(", ").toLowerCase()}.</p>
                <p className="mt-2 text-[14px] text-body"><span className="font-semibold text-chilli">Avoid:</span> {c.avoid.slice(0, 3).join(", ").toLowerCase()}.</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-ink">
        <Container className="grid gap-8 py-16 sm:py-20 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <p className="wide text-[30px] font-medium leading-[1.1] tracking-[-0.03em] text-white sm:text-[44px]">A concept plan to take to your architect, engineer and family.</p>
          <div>
            <p className="text-[15px] leading-relaxed text-white/70">Approval drawings must come from a licensed architect and the structure from a structural engineer, following your local authority's rules.</p>
            <Link to="/design" className="mt-6 inline-flex items-center gap-2 bg-white px-5 py-3.5 text-[15px] font-medium text-ink no-underline transition-colors hover:bg-turmeric">Start with your plot<ArrowUpRight className="size-5" aria-hidden /></Link>
          </div>
        </Container>
      </section>
    </>
  );
}
