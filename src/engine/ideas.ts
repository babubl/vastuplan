/**
 * Design ideas for the plot, the way an architect would open the first meeting:
 * a few concrete suggestions with the reason, each one you can try with a click.
 */
import type { HouseDesign, HouseInput } from "./types";

export interface Idea { id: string; title: string; body: string; apply?: Partial<HouseInput>; applied?: boolean }

export function ideasFor(i: HouseInput, d?: HouseDesign): Idea[] {
  const out: Idea[] = [];
  const area = i.plotWidth * i.plotDepth;
  const ratio = i.plotWidth / i.plotDepth;
  const fpArea = d ? d.footprint.w * d.footprint.h : 0;
  const garden = d ? area - fpArea : 0;

  if (!i.courtyard && area >= 1800 && i.floors === 1) out.push({ id: "court", title: "A courtyard at the heart of the house", body: "A mutram open to the sky keeps the Brahmasthan open, as Vastu asks, brings daylight and cross-breeze into the middle rooms, and cools the house in a Chennai summer.", apply: { courtyard: true } });
  if (i.courtyard) out.push({ id: "court-on", title: "Your courtyard", body: "Slope the courtyard floor gently to a drain on its north-east side, and give it a sloped roof edge with a rain chain. Keep it planted with tulsi or a small frangipani, never a large tree.", applied: true });
  if (ratio >= 1.3) out.push({ id: "wide", title: "Use the width for a garden, not a corridor", body: `On a ${i.plotWidth} ft wide plot the house is kept to a comfortable width and the rest becomes a ${i.facing === "N" || i.facing === "S" ? "side garden on the east" : "garden on the north"}, the side Vastu wants open. A wide plot can also take a separate office or rental room with its own door.` });
  if (ratio <= 0.6) out.push({ id: "deep", title: "Long and narrow: light from the middle", body: "Deep plots leave the middle rooms dark. A courtyard or a skylight over the staircase lights the centre, and a second floor frees the ground for living.", apply: i.floors === 1 ? { floors: 2 } : { courtyard: true } });
  if (area < 1100 && i.floors === 1 && i.bhk >= 2) out.push({ id: "small", title: "Build up, not out", body: "On a small plot a ground-plus-one house gives every room a proper size and leaves open space around the house for light and air.", apply: { floors: 2 } });
  if (garden > 400) out.push({ id: "garden", title: `About ${Math.round(garden / 10) * 10} sq ft of open land`, body: "Plant low shrubs and a lawn on the north and east, and taller trees such as coconut or neem on the south and west to shade the house in the afternoon." });
  if (i.facing === "S" || i.facing === "W") out.push({ id: "sw", title: `Making a ${i.facing === "S" ? "south" : "west"}-facing plot work`, body: `Place the gate and main door in the auspicious padas (shown in the Vastu report), keep the ${i.facing === "S" ? "south" : "west"} compound wall higher and solid, and give the north and east more openings. These are good plots with the right planning.` });
  if (!i.study) out.push({ id: "study", title: "A room for work from home", body: "A 9 × 9 ft study in the north or east gets steady daylight for video calls and keeps work out of the bedrooms.", apply: { study: true } });
  if (i.floors === 2 && !i.groundBedroom) out.push({ id: "parents", title: "A bedroom on the ground floor", body: "For parents, guests, or for you later in life: a ground-floor bedroom with its own toilet saves the stairs.", apply: { groundBedroom: true } });
  out.push({ id: "climate", title: "Built for the climate", body: "Shade west windows with a 2 ft sunshade, use a light-coloured or weathering-tile roof, and line up windows across rooms for cross-ventilation from the south-west monsoon breeze." });
  out.push({ id: "rwh", title: "Water: harvest it, store it right", body: "Rainwater harvesting is compulsory for new buildings in Tamil Nadu. A recharge pit on the north or east, a sump in the north-east and an overhead tank over the south-west suit both Vastu and gravity." });
  return out.slice(0, 7);
}
