import { useState } from "react";
import { Link } from "react-router-dom";
import { Box, Compass, Palette, Ruler } from "lucide-react";
import PlanView from "../components/PlanView";
import { ButtonLink, Container, NumberField, Segmented } from "../components/ui";
import { useDesigns } from "../lib/useDesigns";
import { DEFAULT_INPUT, inputToQuery } from "../lib/share";
import type { Facing, HouseInput } from "../engine/types";

const FACING = (["N", "E", "S", "W"] as Facing[]).map((f) => ({ value: f, label: { N: "North", E: "East", S: "South", W: "West" }[f] }));

export default function Home() {
  const [input, setInput] = useState<HouseInput>(DEFAULT_INPUT);
  const { designs, busy } = useDesigns(input, 150);
  const d = designs?.[0];
  const set = <K extends keyof HouseInput>(k: K, v: HouseInput[K]) => setInput((i) => ({ ...i, [k]: v }));
  return (
    <>
      <section className="border-b border-line">
        <Container className="grid items-center gap-10 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:py-16">
          <div>
            <h1 className="text-[40px] leading-[1.05] sm:text-[56px]">See your house before you build it.</h1>
            <p className="mt-5 max-w-lg text-[18px] leading-relaxed text-body">Enter your plot size and which way it faces. VastuPlan lays out every room to Vastu, furnishes it to scale, and lets you walk through it in 3D.</p>
            <div className="mt-8 max-w-md rounded-lg bg-white p-5 ring-1 ring-line">
              <div className="grid grid-cols-2 gap-3">
                <NumberField id="hw" label="Plot width along road" value={input.plotWidth} onChange={(v) => set("plotWidth", v)} min={18} max={100} suffix="ft" />
                <NumberField id="hd" label="Plot depth" value={input.plotDepth} onChange={(v) => set("plotDepth", v)} min={25} max={120} suffix="ft" />
              </div>
              <p className="mt-4 text-[13px] font-semibold text-ink">Road on the</p>
              <div className="mt-1"><Segmented full label="Plot facing" value={input.facing} onChange={(v) => set("facing", v)} options={FACING} /></div>
              <p className="mt-4 text-[13px] font-semibold text-ink">Bedrooms</p>
              <div className="mt-1"><Segmented full label="Bedrooms" value={input.bhk} onChange={(v) => set("bhk", v)} options={[1, 2, 3, 4].map((n) => ({ value: n as 1 | 2 | 3 | 4, label: `${n} BHK` }))} /></div>
              <ButtonLink to={`/design?${inputToQuery(input)}`} className="mt-5 w-full py-3 text-base">Open this plan in the designer</ButtonLink>
            </div>
            <p className="mt-4 text-[14px] text-muted">Free. No sign-up. Living in a flat? <Link to="/apartment" className="font-semibold text-indigo">Plan your apartment</Link> instead.</p>
          </div>
          <div className="relative">
            <div className="aspect-[4/5] w-full sm:aspect-square">
              {d ? <PlanView design={d} floor={0} layers={{ furniture: true, grid: false, dims: true }} className="relative h-full w-full" /> : <div className="h-full w-full rounded-lg bg-white ring-1 ring-line" />}
            </div>
            {d && (
              <p className="num mt-3 text-[14px] text-muted">
                {busy ? "Redrawing…" : <>Best of three layouts for a {input.plotWidth} × {input.plotDepth} ft plot. Vastu {d.vastuScore}/100, livability {d.livabilityScore}/100, {d.builtUpArea} sq ft.</>}
              </p>
            )}
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <h2 className="max-w-2xl text-[30px] leading-tight sm:text-[38px]">An architect's first sketch, ready in a second.</h2>
          <div className="mt-10 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            {[
              [Compass, "Vastu, rule by rule", "Entrance padas, kitchen in the fire zone, master bedroom in the south-west, an open centre. Every rule is scored and explained."],
              [Ruler, "Drawn to real sizes", "Walls, doors, windows and furniture to scale, checked against National Building Code minimum room sizes."],
              [Box, "Walk through it in 3D", "Rotate the model, look down from the top, or stand at the main door and look around each room."],
              [Palette, "Interiors to match", "Six styles, from Chettinad heritage to Japandi, with wall colours chosen for each room's Vastu zone."],
            ].map(([I, t, b]) => {
              const Icon = I as typeof Box;
              return (
                <div key={t as string}>
                  <Icon className="size-6 text-indigo" aria-hidden />
                  <h3 className="mt-4 text-[18px]">{t as string}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-body">{b as string}</p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="border-y border-line bg-white py-16 sm:py-20">
        <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <h2 className="text-[30px] leading-tight sm:text-[38px]">From plot to plan in three steps.</h2>
          <ol className="space-y-8">
            {[
              ["Describe your plot and family", "Width, depth, which side the road is on, the number of bedrooms and floors, and extras like a pooja room or parking."],
              ["Compare three layouts", "Each option is a different arrangement, ranked by Vastu and livability together, so you can see the trade-offs."],
              ["Explore, refine and share", "Tap any room for its size, zone and interior scheme. Walk through it in 3D, then print or share it with your family and architect."],
            ].map(([t, b], k) => (
              <li key={t} className="grid grid-cols-[2.5rem_1fr] gap-4">
                <span className="num flex size-10 items-center justify-center rounded-full bg-ink text-[15px] font-bold text-white">{k + 1}</span>
                <div><h3 className="text-[19px]">{t}</h3><p className="mt-1.5 text-[15.5px] leading-relaxed text-body">{b}</p></div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container className="max-w-3xl">
          <h2 className="text-[26px] leading-tight sm:text-[32px]">Honest about what this is</h2>
          <p className="mt-4 text-[16.5px] leading-relaxed text-body">VastuPlan gives you a well-reasoned concept plan to start the conversation with your architect and family. Vastu Shastra is traditional guidance; where it conflicts with daylight, ventilation or safety, the plan keeps the house livable and tells you so. Before you build, a licensed architect must prepare approval drawings to your local authority's rules, and a structural engineer must design the structure.</p>
          <ButtonLink to="/design" className="mt-8 px-6 py-3 text-base">Start with your plot</ButtonLink>
        </Container>
      </section>
    </>
  );
}
