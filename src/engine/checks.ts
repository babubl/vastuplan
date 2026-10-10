/** Scoring: Vastu guidelines and livability (National Building Code minimums, light, access). */
import { area, centreOverlap, exteriorEdges, sharedWall } from "./geometry";
import { CORNERS, DIRECTION_NAME, ENTRANCE_PADAS, WHY, ZONES, prefOf } from "./vastu";
import type { Check, CheckStatus, Facing, FloorPlan, Furniture, HouseInput, Rect, Room, RoomType, Zone } from "./types";

const status = (s: number): CheckStatus => (s >= 0.85 ? "pass" : s >= 0.45 ? "partial" : "fail");
const zname = (z: Zone) => `${z === "C" ? "centre" : z} (${ZONES[z].name})`;
const SQM = 10.7639;

export interface CheckInput {
  floors: FloorPlan[];
  footprint: Rect;
  plot: Rect;
  facing: Facing;
  mainInStretch: boolean;
  mainNearStretch: boolean;
  hasMain: boolean;
  unreachable: string[];
}

function bestRoom(rooms: Room[], type: Room["type"]) { return rooms.find((r) => r.type === type); }

export function vastuChecks(c: CheckInput): Check[] {
  const all = c.floors.flatMap((f) => f.rooms);
  const ground = c.floors[0].rooms;
  const out: Check[] = [];
  const add = (id: string, title: string, weight: number, score: number, detail: string) => out.push({ id, title, weight, score, status: status(score), detail });

  // 1. Main entrance
  const pad = ENTRANCE_PADAS[c.facing];
  add("entrance", "Main entrance position", 12, !c.hasMain ? 0 : c.mainInStretch ? 1 : c.mainNearStretch ? 0.55 : 0.2,
    c.mainInStretch ? `The main door is in the auspicious padas of the ${DIRECTION_NAME[c.facing]} wall: ${pad.names}.`
      : `The ideal position on the ${DIRECTION_NAME[c.facing]} wall is ${pad.names}. The door is as close to it as the living room allows.`);

  // 2. Kitchen
  const k = bestRoom(ground, "kitchen");
  if (k) { const s = prefOf("kitchen", k.zone); add("kitchen", "Kitchen in the fire zone", 10, s, s >= 0.85 ? `Kitchen in the ${zname(k.zone)}, the traditional fire corner.` : s >= 0.45 ? `Kitchen in the ${zname(k.zone)}, an accepted alternative to the south-east.` : `Kitchen in the ${zname(k.zone)}. The south-east is preferred; north-west is the accepted alternative.`); }

  // 3. Master bedroom
  const m = all.find((r) => r.type === "master");
  if (m) { const s = prefOf("master", m.zone); add("master", "Master bedroom in the south-west", 10, s, s >= 0.85 ? `Master bedroom in the ${zname(m.zone)}, the zone of stability for the head of the family.` : `Master bedroom in the ${zname(m.zone)}. The south-west is ideal; south or west are good.`); }

  // 4. Pooja
  const p = bestRoom(all, "pooja");
  if (p) {
    let s = prefOf("pooja", p.zone);
    const nextToToilet = all.some((r) => r.type === "toilet" && sharedWall(r.rect, p.rect));
    if (nextToToilet) s = Math.min(s, 0.4);
    add("pooja", "Pooja room in the north-east", 6, s, `Pooja in the ${zname(p.zone)}.${nextToToilet ? " It shares a wall with a toilet, which is traditionally avoided." : s >= 0.85 ? " Ideal for morning prayer facing east." : " North-east is ideal; east or north are good."}`);
  }

  // 5. Toilets
  const toilets = all.filter((r) => r.type === "toilet");
  if (toilets.length) {
    const worst = Math.min(...toilets.map((t) => prefOf("toilet", t.zone)));
    const bad = toilets.filter((t) => prefOf("toilet", t.zone) < 0.45).map((t) => t.zone);
    add("toilets", "Toilets away from the north-east and centre", 8, worst >= 0.45 ? Math.max(0.85, worst) : worst,
      bad.length ? `A toilet falls in the ${[...new Set(bad)].map(zname).join(", ")}, which Vastu asks to avoid. North-west and west are preferred.` : `All toilets are in acceptable zones (${[...new Set(toilets.map((t) => t.zone))].join(", ")}). None in the north-east or the centre.`);
  }

  // 6. Brahmasthan
  const heavy = all.filter((r) => ["toilet", "stair", "kitchen", "store"].includes(r.type));
  const intrusion = Math.max(0, ...heavy.map((r) => centreOverlap(r.rect, c.footprint)));
  add("centre", "Brahmasthan (centre) kept open", 8, intrusion < 0.1 ? 1 : intrusion < 0.35 ? 0.6 : 0.2,
    intrusion < 0.1 ? "The centre of the house is dining or hall space, kept free of toilets, stairs and the kitchen." : "Part of a toilet, staircase or kitchen reaches into the centre of the house, which is traditionally kept open.");

  // 7. Staircase
  const st = bestRoom(ground, "stair");
  if (st) { const s = prefOf("stair", st.zone); add("stair", "Staircase in the south or west", 6, s, `Staircase in the ${zname(st.zone)}.${s >= 0.85 ? " Heavier structures belong in the south and west." : " South, west or south-west is preferred; never the north-east or centre."}`); }

  // 8. Living
  const l = bestRoom(ground, "living");
  if (l) { const s = prefOf("living", l.zone); add("living", "Living room in the north or east", 5, s, `Living room in the ${zname(l.zone)}.${s >= 0.85 ? " Good morning light and an open, welcoming zone." : ""}`); }

  // 9. Other bedrooms
  const beds = all.filter((r) => r.type === "bedroom");
  if (beds.length) { const s = Math.min(...beds.map((b) => prefOf("bedroom", b.zone))); add("bedrooms", "Other bedrooms in the west, north-west or south", 4, s, `Bedrooms in ${beds.map((b) => b.zone).join(", ")}. Children's and guest rooms suit the west and north-west.`); }

  // 10. Open space in north and east
  const openN = c.footprint.y - c.plot.y, openS = c.plot.y + c.plot.h - (c.footprint.y + c.footprint.h);
  const openW = c.footprint.x - c.plot.x, openE = c.plot.x + c.plot.w - (c.footprint.x + c.footprint.w);
  const ne = openN + openE, sw = openS + openW;
  add("open", "More open space on the north and east", 5, ne >= sw ? 1 : ne >= sw * 0.75 ? 0.6 : 0.3,
    `Open space: north ${openN.toFixed(1)} ft, east ${openE.toFixed(1)} ft, south ${openS.toFixed(1)} ft, west ${openW.toFixed(1)} ft. ${ne >= sw ? "More open to the north and east, as Vastu prefers." : "The south and west have more open space than the north and east."}`);

  // 11 & 12 depend on furniture
  const furn = c.floors.flatMap((f) => f.furniture);
  const bedsF = furn.filter((f) => f.kind === "bed");
  if (bedsF.length) {
    const good = bedsF.filter((b) => b.facing === "S" || b.facing === "E").length;
    const s = good / bedsF.length;
    add("sleep", "Sleeping with the head to the south or east", 5, s, `${good} of ${bedsF.length} beds are placed so you sleep with your head to the south or east. Head to the north is avoided.`);
  }
  const stove = furn.find((f) => f.kind === "hob");
  if (stove) add("cook", "Cooking while facing east", 4, stove.facing === "E" ? 1 : stove.facing === "N" ? 0.6 : 0.3, stove.facing === "E" ? "The hob is on the east wall, so the cook faces east." : `The hob is placed so the cook faces ${DIRECTION_NAME[stove.facing ?? "N"]}. East is preferred; north is acceptable.`);

  // 13. Plot proportion
  const ratio = Math.max(c.plot.w, c.plot.h) / Math.min(c.plot.w, c.plot.h);
  add("plot", "Plot proportion", 3, ratio <= 1.5 ? 1 : ratio <= 2 ? 0.75 : 0.4, `Plot ratio 1 : ${ratio.toFixed(2)}. Square or up to 1 : 2 is considered balanced.`);

  return out;
}

export function livabilityChecks(c: CheckInput, wantParking: boolean): Check[] {
  const all = c.floors.flatMap((f) => f.rooms);
  const out: Check[] = [];
  const add = (id: string, title: string, weight: number, score: number, detail: string) => out.push({ id, title, weight, score, status: status(score), detail });

  add("access", "Every room can be reached", 15, c.unreachable.length ? 0 : 1, c.unreachable.length ? `Some spaces have no door to the rest of the house: ${c.unreachable.map((id) => all.find((r) => r.id === id)?.label).join(", ")}.` : "Every room opens off the living, dining, lounge or a passage, with no room passing through another bedroom.");

  // National Building Code 2016 (Part 3) minimums
  const habit = all.filter((r) => r.type === "master" || r.type === "bedroom" || r.type === "study");
  const small: string[] = [];
  habit.forEach((r, i) => {
    const a = area(r.rect) / SQM, minSide = Math.min(r.rect.w, r.rect.h) * 0.3048;
    if (a < (i === 0 ? 9.5 : 7.5) || minSide < 2.4) small.push(r.label);
  });
  const kit = all.find((r) => r.type === "kitchen");
  if (kit && (area(kit.rect) / SQM < 5 || Math.min(kit.rect.w, kit.rect.h) * 0.3048 < 1.8)) small.push("Kitchen");
  all.filter((r) => r.type === "toilet").forEach((t) => { if (area(t.rect) / SQM < 2.8 || Math.min(t.rect.w, t.rect.h) * 0.3048 < 1.2) small.push(t.label); });
  add("sizes", "Rooms meet National Building Code minimums", 10, small.length ? Math.max(0, 1 - small.length * 0.3) : 1, small.length ? `Below the NBC 2016 minimum size: ${[...new Set(small)].join(", ")}.` : "Bedrooms, kitchen and toilets meet the NBC 2016 minimum areas and widths (e.g. 9.5 m² and 2.4 m wide for the main room).");

  const needLight = all.filter((r) => ["living", "master", "bedroom", "study", "kitchen"].includes(r.type));
  const courts = all.filter((r) => r.type === "courtyard");
  const lit = (r: Room) => exteriorEdges(r.rect, c.footprint).length > 0 || courts.some((k) => sharedWall(k.rect, r.rect));
  const dark = needLight.filter((r) => !lit(r));
  add("light", "Daylight and air in every habitable room", 10, dark.length ? Math.max(0, 1 - dark.length * 0.35) : 1, dark.length ? `No outside wall for: ${dark.map((r) => r.label).join(", ")}.` : "Every bedroom, the living room and the kitchen has an outside wall for windows.");

  const wcs = all.filter((r) => r.type === "toilet");
  const shut = wcs.filter((r) => !lit(r));
  add("vent", "Toilets can be ventilated", 5, shut.length ? Math.max(0, 1 - shut.length * 0.5) : 1, shut.length ? `${shut.length} toilet(s) without an outside wall would need a duct.` : "Every toilet has an outside wall for a ventilator.");

  const dining = all.find((r) => r.type === "dining");
  if (kit && dining) { const adj = !!sharedWall(kit.rect, dining.rect); add("kitchen-dining", "Kitchen next to dining", 5, adj ? 1 : 0.4, adj ? "Kitchen opens straight onto the dining area." : "Kitchen and dining are not next to each other."); }

  const fromLiving = c.floors[0].openings.filter((o) => o.kind === "door" && all.find((r) => r.id === o.a && (r.type === "master" || r.type === "bedroom")) && all.find((r) => r.id === o.b && r.type === "living")).length;
  add("privacy", "Bedrooms open off private space", 5, fromLiving ? 0.6 : 1, fromLiving ? "A bedroom opens directly off the living room. Fine for a guest room, less private for family." : "Bedrooms open off the dining area or lounge, not the formal living room.");

  const odd = all.filter((r) => !["passage", "store", "balcony", "sitout", "utility", "dress", "toilet", "stair"].includes(r.type) && Math.max(r.rect.w, r.rect.h) / Math.min(r.rect.w, r.rect.h) > 2.1);
  add("shape", "Well-proportioned rooms", 5, odd.length ? Math.max(0.3, 1 - odd.length * 0.25) : 1, odd.length ? `Long and narrow: ${odd.map((r) => r.label).join(", ")}.` : "No room is more than about twice as long as it is wide.");

  const fpArea = area(c.footprint) * c.floors.length;
  const leftover = all.filter((r) => r.type === "store" || (r.type === "balcony" && r.label === "Open terrace" && c.floors.length === 1)).reduce((a, r) => a + area(r.rect), 0);
  const waste = leftover / fpArea;
  add("space", "Space well used", 5, waste < 0.06 ? 1 : waste < 0.12 ? 0.6 : 0.25, waste < 0.06 ? "Almost all of the built area goes to rooms you will use." : `About ${Math.round(waste * 100)}% of the built area is store or leftover space. A narrower house with more garden may suit this plot better.`);

  if (wantParking) { const has = all.some((r) => r.type === "parking"); add("parking", "Car parking", 5, has ? 1 : 0, has ? "A covered car parking bay at the front." : "The plot is too narrow for a parking bay alongside the living room; use the front open space."); }
  return out;
}

export const scoreOf = (checks: Check[]) => {
  const w = checks.reduce((s, c) => s + c.weight, 0);
  return w ? Math.round((checks.reduce((s, c) => s + c.weight * c.score, 0) / w) * 100) : 0;
};

export const furnitureOf = (f: FloorPlan[]): Furniture[] => f.flatMap((x) => x.furniture);

const CORNER_AVOID: Record<"NE" | "SE" | "SW" | "NW", RoomType[]> = {
  NE: ["toilet", "kitchen", "stair", "store", "master", "utility"],
  SE: ["pooja", "master", "toilet"],
  SW: ["toilet", "sitout", "parking", "kitchen", "pooja", "utility", "courtyard"],
  NW: ["master", "pooja"],
};

/** Corner thumb rules: what occupies each corner of the house, judged against the classic guidance. */
export function cornerChecks(c: CheckInput, input: HouseInput): Check[] {
  const out: Check[] = [];
  const fp = c.footprint;
  const cell = (z: "NE" | "SE" | "SW" | "NW"): Rect => ({ x: z.endsWith("E") ? fp.x + (fp.w * 2) / 3 : fp.x, y: z.startsWith("S") ? fp.y + (fp.h * 2) / 3 : fp.y, w: fp.w / 3, h: fp.h / 3 });
  for (const g of CORNERS) {
    const R = cell(g.zone);
    const inCorner = c.floors.flatMap((f) => f.rooms).filter((r) => {
      const ox = Math.max(0, Math.min(r.rect.x + r.rect.w, R.x + R.w) - Math.max(r.rect.x, R.x));
      const oy = Math.max(0, Math.min(r.rect.y + r.rect.h, R.y + R.h) - Math.max(r.rect.y, R.y));
      return ox * oy >= Math.min(area(R) * 0.25, area(r.rect) * 0.5);
    });
    const bad = [...new Set(inCorner.filter((r) => CORNER_AVOID[g.zone].includes(r.type)).map((r) => r.label))];
    const names = [...new Set(inCorner.map((r) => r.label))];
    const score = bad.length ? (bad.length > 1 ? 0.2 : 0.45) : 1;
    out.push({
      id: `corner-${g.zone}`, group: "corner", weight: 4, score, status: status(score),
      title: `${g.zone} corner, ${g.name} (${g.element.toLowerCase()})`,
      detail: `${names.length ? `Here: ${names.join(", ")}.` : "Open."} ${bad.length ? `Traditionally avoided here: ${bad.join(", ")}.` : `Suits this corner. Best uses: ${g.keep.slice(0, 3).join(", ").toLowerCase()}.`}`,
      why: `${g.guardian} guards the ${g.zone}, the ${g.element.toLowerCase()} corner. Keep: ${g.keep.join(", ").toLowerCase()}. Avoid: ${g.avoid.join(", ")}. ${g.site}`,
    });
  }
  if (input.corner) {
    const sides = new Set([input.facing, input.corner]);
    const kind = sides.has("N") && sides.has("E") ? "NE" : sides.has("S") && sides.has("W") ? "SW" : sides.has("N") && sides.has("W") ? "NW" : "SE";
    const score = kind === "NE" ? 1 : kind === "SW" ? 0.35 : 0.75;
    out.push({ id: "corner", group: "corner", weight: 5, score, status: status(score), title: `${kind} corner plot`, why: WHY.corner,
      detail: kind === "NE" ? "Roads on the north and east: the most auspicious corner plot. Keep the north-east open with a low compound wall." : kind === "SW" ? "Roads on the south and west. Build a higher, solid compound wall on the south and west and keep the main gate in the auspicious padas." : `Roads on the ${kind === "NW" ? "north and west" : "south and east"}: a good plot with care. Keep the gate away from the corner itself.` });
  }
  return out;
}
