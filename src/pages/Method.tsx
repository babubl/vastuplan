import { Container, ButtonLink } from "../components/ui";
import { ENTRANCE_PADAS, ZONES } from "../engine/vastu";
import type { Zone } from "../engine/types";

const ORDER: Zone[] = ["NW", "N", "NE", "W", "C", "E", "SW", "S", "SE"];

export default function Method() {
  return (
    <Container className="max-w-3xl py-12">
      <h1 className="text-[34px] leading-tight sm:text-[44px]">How VastuPlan designs a house</h1>
      <p className="mt-4 text-[17px] leading-relaxed text-body">Most Indian homes on a rectangular plot follow the same logic: public rooms at the front, a central hall that connects everything, and private rooms at the back. VastuPlan starts there, then tests every reasonable arrangement against Vastu and livability.</p>

      <h2 className="mt-12 text-2xl">The layout</h2>
      <ol className="mt-4 list-decimal space-y-3 pl-5 text-[16px] leading-relaxed text-body">
        <li>Your plot minus the setbacks gives the area you can build on. Any extra depth is left open on the north or east side, as Vastu prefers.</li>
        <li>The house is planned in three bands parallel to the road: front (living, parking, pooja), middle (dining hall, staircase, common toilet) and rear (bedrooms, kitchen). Small plots use two bands with a combined living and dining room.</li>
        <li>Rooms that could go in more than one band are tried in each. Within a band, every order is tried, with real room sizes based on architects' standard ranges.</li>
        <li>Each plan is given doors, a main entrance, windows on outside walls and furniture to scale, then scored. Plans with a room you can't walk into are discarded.</li>
        <li>The three best plans that differ from each other are shown as options A, B and C.</li>
      </ol>

      <h2 className="mt-12 text-2xl">The nine zones</h2>
      <div className="mt-4 grid grid-cols-3 gap-1.5">
        {ORDER.map((z) => (
          <div key={z} className="rounded-md p-3 ring-1 ring-black/5" style={{ background: ZONES[z].colours[0].hex }}>
            <p className="font-bold text-ink">{z === "C" ? "Centre" : z} <span className="font-medium text-muted">{ZONES[z].name}</span></p>
            <p className="mt-1 text-[12.5px] leading-snug text-body">{ZONES[z].meaning}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-2xl">The main entrance</h2>
      <p className="mt-3 text-[16px] leading-relaxed text-body">Each side of the house is divided into eight padas, counted clockwise from the corner. The main door is placed in the auspicious padas of the side facing the road:</p>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[16px] text-body">{(["N", "E", "S", "W"] as const).map((f) => <li key={f}><span className="font-semibold text-ink">{({ N: "North", E: "East", S: "South", W: "West" })[f]}:</span> {ENTRANCE_PADAS[f].names}</li>)}</ul>

      <h2 className="mt-12 text-2xl">Livability and the building code</h2>
      <p className="mt-3 text-[16px] leading-relaxed text-body">Rooms are checked against the National Building Code of India 2016 minimums: the main habitable room at least 9.5 m² and 2.4 m wide, other bedrooms at least 7.5 m², kitchens at least 5 m², and a combined bath and WC at least 2.8 m². Every bedroom, the living room and the kitchen must have an outside wall for daylight, and every toilet an outside wall for a ventilator.</p>

      <h2 className="mt-12 text-2xl">What it does not do</h2>
      <p className="mt-3 text-[16px] leading-relaxed text-body">It does not replace an architect. Setbacks, floor area ratio and height limits vary by city and plot (CMDA, DTCP, BBMP and others), and the plan has no structural design. Use it to decide what you want, then take it to a licensed architect for approval drawings and to a structural engineer for the structure.</p>
      <ButtonLink to="/design" className="mt-10 px-6 py-3 text-base">Start with your plot</ButtonLink>
    </Container>
  );
}
