import { Link } from "react-router-dom";
import { Container, ButtonLink } from "../components/ui";
import { CORNERS, WHY, ZONES } from "../engine/vastu";
import type { Zone } from "../engine/types";

const ORDER: Zone[] = ["NW", "N", "NE", "W", "C", "E", "SW", "S", "SE"];

export default function Corners() {
  return (
    <>
      <section className="border-b border-line">
        <Container className="grid gap-10 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <h1 className="text-[42px] sm:text-[64px]">A working guide to Vastu</h1>
            <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-body">Nine zones, four corners and the reasons behind them. Vastu is traditional guidance; knowing why a rule exists lets you weigh it against light, air and budget, and catch mistakes, including well-meant ones from friends.</p>
          </div>
          <div className="grid grid-cols-3 gap-px self-end border border-ink bg-ink" aria-label="The nine zones, north at the top">
            {ORDER.map((z) => (
              <div key={z} className="aspect-square p-3" style={{ background: z === "NE" ? "#F6E7B8" : z === "C" ? "#FFFFFF" : "#F7F7F4" }}>
                <p className="wide text-[20px] font-medium text-ink">{z === "C" ? "Centre" : z}</p>
                <p className="text-[12.5px] text-muted">{ZONES[z].name}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-stone">
        <Container className="grid gap-8 py-14 lg:grid-cols-[0.8fr_1.2fr]">
          <h2 className="text-[30px] sm:text-[40px]">North-east or north-west?</h2>
          <div className="text-[17px] leading-relaxed text-body">
            <p>The most common mix-up. The <strong className="text-ink">north-east (Ishanya)</strong> is the corner kept lowest, lightest, emptiest and sacred: it belongs to Ishana, a form of Shiva, and to the water element. That is why the pooja, open space, the sump and the borewell go there, and toilets, kitchens, staircases and heavy loads stay out.</p>
            <p className="mt-4">The <strong className="text-ink">north-west (Vayavya)</strong> belongs to Vayu, the air element: movement, coming and going. It suits guest rooms, grown children, storage, parking, toilets and the septic tank. It is not the corner to keep empty, and not the place for the pooja.</p>
          </div>
        </Container>
      </section>

      <section>
        <Container className="py-14">
          <h2 className="text-[30px] sm:text-[40px]">The four corners</h2>
          <div className="mt-10 grid gap-px border border-ink bg-ink md:grid-cols-2">
            {CORNERS.map((c) => (
              <article key={c.zone} className="bg-white p-6 sm:p-8">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="wide text-[28px] font-medium">{c.zone}, {c.name}</h3>
                  <p className="text-[13px] text-muted">{c.element}, guarded by {c.guardian}</p>
                </div>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div><p className="text-[13px] font-semibold text-neem">Belongs here</p><ul className="mt-2 space-y-1 text-[14.5px] text-body">{c.keep.map((k) => <li key={k}>{k}</li>)}</ul></div>
                  <div><p className="text-[13px] font-semibold text-chilli">Keep out</p><ul className="mt-2 space-y-1 text-[14.5px] text-body">{c.avoid.map((k) => <li key={k}>{k}</li>)}</ul></div>
                </div>
                <p className="mt-5 border-t border-line pt-4 text-[14px] text-body">{c.site}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-line">
        <Container className="grid gap-10 py-14 lg:grid-cols-[0.8fr_1.2fr]">
          <h2 className="text-[30px] sm:text-[40px]">Why each room goes where it does</h2>
          <dl className="divide-y divide-line border-y border-line">
            {([["Main entrance", "entrance"], ["Kitchen", "kitchen"], ["Master bedroom", "master"], ["Pooja", "pooja"], ["Toilets", "toilets"], ["The centre", "centre"], ["Staircase", "stair"], ["Living room", "living"], ["Other bedrooms", "bedrooms"], ["Open space", "open"], ["Sleeping direction", "sleep"], ["Cooking direction", "cook"], ["Corner plots", "corner"]] as const).map(([t, k]) => (
              <div key={k} className="grid gap-1 py-4 sm:grid-cols-[180px_1fr] sm:gap-6"><dt className="font-semibold text-ink">{t}</dt><dd className="text-[15px] leading-relaxed text-body">{WHY[k]}</dd></div>
            ))}
          </dl>
        </Container>
      </section>

      <section className="bg-ink text-white">
        <Container className="flex flex-col items-start gap-6 py-14 sm:flex-row sm:items-center sm:justify-between">
          <p className="wide max-w-xl text-[26px] font-medium leading-tight !text-white">Every plan VastuPlan draws is checked against these rules, corner by corner.</p>
          <ButtonLink to="/design" variant="secondary" className="shrink-0">Design your house</ButtonLink>
        </Container>
      </section>
      <p className="sr-only"><Link to="/method">How plans are made</Link></p>
    </>
  );
}
