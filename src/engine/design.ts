/** Generates and ranks complete house designs for a plot. */
import { area, localFrame, toCompass } from "./geometry";
import { assignments, bandDepths, bandOptions, toRooms, BANDS, HUB_CAP, type BandGeom, type BandOption, type Ctx, type Placed } from "./layout";
import { firstProgram, groundProgram, type Spec } from "./program";
import { computeOpenings, type OpeningResult } from "./openings";
import { cornerChecks, livabilityChecks, scoreOf, vastuChecks } from "./checks";
import { WHY } from "./vastu";
import { columnsFor, servicesFor } from "./site";
import { furnish } from "./furniture";
import type { Band, FloorPlan, HouseDesign, HouseInput, Rect, Setbacks } from "./types";

export function defaultSetbacks(i: Pick<HouseInput, "plotWidth" | "plotDepth">): Setbacks {
  const front = i.plotDepth <= 30 ? 3 : i.plotDepth <= 40 ? 5 : i.plotDepth <= 60 ? 6.5 : 10;
  const rear = i.plotDepth <= 30 ? 2 : i.plotDepth <= 40 ? 3 : 5;
  const side = i.plotWidth <= 25 ? 1.5 : i.plotWidth <= 30 ? 2.5 : i.plotWidth <= 40 ? 3.5 : 5;
  return { front, rear, left: side, right: side };
}

function plotRects(i: HouseInput) {
  const ns = i.facing === "N" || i.facing === "S";
  const plot: Rect = { x: 0, y: 0, w: ns ? i.plotWidth : i.plotDepth, h: ns ? i.plotDepth : i.plotWidth };
  const sb = i.setbacks ?? defaultSetbacks(i);
  const side = (sb.left + sb.right) / 2;
  let b: Rect;
  switch (i.facing) {
    case "N": b = { x: side, y: sb.front, w: plot.w - 2 * side, h: plot.h - sb.front - sb.rear }; break;
    case "S": b = { x: side, y: sb.rear, w: plot.w - 2 * side, h: plot.h - sb.front - sb.rear }; break;
    case "E": b = { x: sb.rear, y: side, w: plot.w - sb.front - sb.rear, h: plot.h - 2 * side }; break;
    case "W": b = { x: sb.front, y: side, w: plot.w - sb.front - sb.rear, h: plot.h - 2 * side }; break;
  }
  return { plot, buildable: b, setbacks: sb };
}

interface Candidate { placed: Placed[]; geoms: BandGeom[]; footprint: Rect; ctx: Ctx; quick: number; openings: OpeningResult }

function evaluate(ctx: Ctx, placed: Placed[], input: HouseInput, plot: Rect) {
  const rooms = toRooms(ctx, placed);
  const op = computeOpenings(rooms, ctx.footprint, input.facing, ctx.level);
  const fp: FloorPlan = { level: ctx.level, name: ctx.level ? "First floor" : "Ground floor", rooms, openings: op.openings, furniture: [] };
  return { rooms, op, fp, plot };
}

function quickScore(floors: FloorPlan[], footprint: Rect, plot: Rect, input: HouseInput, ops: OpeningResult[]) {
  const unreachable = ops.flatMap((o) => o.unreachable);
  const ci = { floors, footprint, plot, facing: input.facing, mainInStretch: ops[0].mainInStretch, mainNearStretch: ops[0].mainNearStretch, hasMain: !!ops[0].mainDoor, unreachable };
  const v = scoreOf(vastuChecks(ci)), l = scoreOf(livabilityChecks(ci, input.parking));
  // A room you cannot walk into is not a trade-off; it disqualifies the plan.
  return 0.55 * v + 0.45 * l - unreachable.length * 30;
}

function* product<T>(lists: T[][]): Generator<T[]> {
  if (!lists.length) { yield []; return; }
  const [head, ...rest] = lists;
  for (const h of head) for (const r of product(rest)) yield [h, ...r];
}

function searchFloor(ctxBase: Omit<Ctx, "footprint" | "frame">, specs: Spec[], input: HouseInput, plot: Rect, buildable: Rect, opts: { fixedGeoms?: BandGeom[]; footprint?: Rect; fixed?: Placed[]; keep: number }): Candidate[] {
  const bFrame = localFrame(input.facing, buildable);
  const cache = new Map<string, BandOption[]>();
  const results: Candidate[] = [];
  const seen = new Set<string>();
  for (const by of assignments(specs)) {
    const shapes: { footprint: Rect; geoms: BandGeom[] }[] = [];
    if (opts.fixedGeoms && opts.footprint) shapes.push({ footprint: opts.footprint, geoms: opts.fixedGeoms });
    else {
      // Two-storey homes: bedrooms upstairs sit over the front and rear bands, so those bands must be bedroom-deep.
      if (input.floors === 2 && !by.rear.length) continue;
      const d = bandDepths(by, bFrame.depth, undefined, input.floors === 2 ? { rear: { min: 10.5, ideal: 12.5, max: 14 }, front: { min: 10.5, ideal: 12, max: 14 } } : undefined);
      if (!d) continue;
      const north = input.facing === "N" || input.facing === "E"; // keep the extra open space on the north/east
      const voff = north ? bFrame.depth - d.used : 0;
      for (const W of widthsFor(by, bFrame.frontage)) {
        // Unused width becomes a side garden on the east (N/S-facing plots) or north (E/W-facing plots).
        const uoff = input.facing === "E" || input.facing === "W" ? bFrame.frontage - W : 0;
        shapes.push({ footprint: toCompass(bFrame, uoff, voff, W, d.used), geoms: d.geoms });
      }
    }
    for (const { footprint, geoms } of shapes) {
    const ctx: Ctx = { ...ctxBase, frame: localFrame(input.facing, footprint), footprint };
    const perBand: BandOption[][] = [];
    let ok = true;
    for (const b of BANDS) {
      const g = geoms.find((x) => x.band === b);
      const specsB = by[b];
      if (!g) { if (specsB.length) { ok = false; break; } continue; }
      const fixed = (opts.fixed ?? []).filter((f) => f.band === b).map((f) => ({ u: f.u, w: f.w, placed: f }));
      const key = `${b}|${specsB.map((s) => s.key).sort().join(",")}|${g.v.toFixed(2)}|${g.d.toFixed(2)}|${footprint.w.toFixed(2)}x${footprint.h.toFixed(2)}`;
      let o = cache.get(key);
      if (!o) { o = bandOptions(ctx, g, specsB, ctx.frame.frontage, 6, fixed); cache.set(key, o); }
      if (!o.length) { ok = false; break; }
      perBand.push(o);
    }
    if (!ok) continue;
    for (const combo of product(perBand.map((o) => o.slice(0, 5)))) {
      const placed = combo.flatMap((c) => c.placed);
      const sig = placed.map((p) => `${p.key}:${p.u.toFixed(1)},${p.v.toFixed(1)}`).sort().join("|");
      if (seen.has(sig)) continue;
      seen.add(sig);
      const { fp, op } = evaluate(ctx, placed, input, plot);
      const quick = ctx.level === 0 ? quickScore([fp], footprint, plot, input, [op]) : -op.unreachable.length * 30;
      results.push({ placed, geoms, footprint, ctx, quick: quick + combo.reduce((s, c) => s + c.proxy, 0) * 0.15, openings: op });
    }
    }
  }
  results.sort((a, b) => b.quick - a.quick);
  return results.slice(0, opts.keep);
}

const frontageOf = (i: HouseInput, b: Rect) => (i.facing === "N" || i.facing === "S" ? b.w : b.h);


/**
 * Candidate house widths. On a wide plot, stretching every room to the full frontage gives a
 * corridor-like dining hall; a narrower house with a garden on the north or east is better
 * architecture and better Vastu, so both are tried and the scoring decides.
 */
function widthsFor(by: Record<Band, Spec[]>, frontage: number): number[] {
  const cap = Math.max(...BANDS.map((b) => by[b].reduce((s, x) => s + (x.hub ? Math.min(x.maxW, HUB_CAP[x.type] ?? x.maxW) : x.maxW) + (x.suite ? 5.5 : 0), 0)));
  const out = [frontage];
  if (frontage - cap >= 6) out.push(Math.max(cap, 18));
  if (frontage - cap >= 16) out.push(Math.round((frontage + cap) / 2));
  return out;
}

export function generate(input: HouseInput, count = 3): HouseDesign[] {
  const out = generateExact(input, count);
  if (out.length || !input.parking) return out;
  // Not enough depth for a covered car bay: plan without it and park in the front open space.
  const alt = generateExact({ ...input, parking: false }, count);
  alt.forEach((d) => { d.input = input; d.notes.unshift("A covered car bay did not fit on this plot along with the rooms you asked for, so the plan keeps the front open space for parking."); });
  return alt;
}

const footprintFrontage = (i: HouseInput, f: Rect) => (i.facing === "N" || i.facing === "S" ? f.w : f.h);

function generateExact(input: HouseInput, count: number): HouseDesign[] {
  const { plot, buildable } = plotRects(input);
  if (buildable.w < 14 || buildable.h < 14) return [];
  const ground = searchFloor({ facing: input.facing, level: 0 }, groundProgram(input, frontageOf(input, buildable), input.facing === "N" || input.facing === "S" ? buildable.h : buildable.w), input, plot, buildable, { keep: 14 });
  const designs: HouseDesign[] = [];
  for (const g of ground) {
    const floors: FloorPlan[] = [];
    const ops: OpeningResult[] = [g.openings];
    const gRooms = toRooms(g.ctx, g.placed);
    floors.push({ level: 0, name: "Ground floor", rooms: gRooms, openings: g.openings.openings, furniture: [] });
    if (input.floors === 2) {
      const stair = g.placed.find((p) => p.type === "stair");
      if (!stair) continue;
      // The staircase and any courtyard carry straight up through the first floor.
      const fixed = g.placed.filter((p) => p.type === "stair" || p.type === "courtyard").map((p) => (p.type === "courtyard" ? { ...p, label: "Open to sky" } : p));
      const first = searchFloor({ facing: input.facing, level: 1 }, firstProgram(input, footprintFrontage(input, g.footprint)), input, plot, buildable, { fixedGeoms: g.geoms, footprint: g.footprint, fixed, keep: 6 });
      const best = first
        .map((f) => { const rooms = toRooms(f.ctx, f.placed); const fp: FloorPlan = { level: 1, name: "First floor", rooms, openings: f.openings.openings, furniture: [] }; return { f, fp, s: quickScore([floors[0], fp], g.footprint, plot, input, [g.openings, f.openings]) }; })
        .sort((a, b) => b.s - a.s)[0];
      if (!best) continue;
      floors.push(best.fp);
      ops.push(best.f.openings);
    }
    for (const f of floors) f.furniture = f.rooms.flatMap((r) => furnish(r, f.openings));
    const ci = { floors, footprint: g.footprint, plot, facing: input.facing, mainInStretch: ops[0].mainInStretch, mainNearStretch: ops[0].mainNearStretch, hasMain: !!ops[0].mainDoor, unreachable: ops.flatMap((o) => o.unreachable) };
    for (const f of floors) f.columns = columnsFor(floors[0].rooms, g.footprint);
    const vastu = [...vastuChecks(ci), ...cornerChecks(ci, input)].map((c) => ({ ...c, why: c.why ?? WHY[c.id] }));
    const livability = livabilityChecks(ci, input.parking);
    const vastuScore = scoreOf(vastu), livabilityScore = scoreOf(livability);
    const builtUpArea = Math.round(floors.reduce((s, f) => s + f.rooms.filter((r) => !(r.open && r.type !== "parking")).reduce((a, r) => a + area(r.rect), 0), 0));
    designs.push({
      id: "", input, plot, buildable, footprint: g.footprint, floors, vastu, livability, vastuScore, livabilityScore,
      score: Math.round(0.55 * vastuScore + 0.45 * livabilityScore), builtUpArea, notes: notesFor(input, livability), services: servicesFor(plot, g.footprint),
    });
  }
  designs.sort((a, b) => b.score - a.score);
  // Never offer a plan with a room you cannot walk into when a fully connected one exists.
  const connected = designs.filter((d) => d.livability.find((c) => c.id === "access")?.status === "pass");
  if (connected.length) designs.splice(0, designs.length, ...connected);
  // Keep options that genuinely differ (different kitchen or master position, or different band layout).
  const out: HouseDesign[] = [];
  const sigs = new Set<string>();
  for (const d of designs) {
    const sig = d.floors[0].rooms.filter((r) => ["kitchen", "master", "living", "stair", "pooja", "bedroom", "toilet"].includes(r.type) && !r.owner).map((r) => `${r.type}${r.zone}`).sort().join(",");
    if (sigs.has(sig)) continue;
    sigs.add(sig);
    out.push(d);
    if (out.length >= count) break;
  }
  out.forEach((d, i) => (d.id = String.fromCharCode(65 + i)));
  return out;
}

function notesFor(i: HouseInput, liv: { id: string; score: number }[]): string[] {
  const n = [
    "Place the overhead water tank on the south-west of the roof, the highest and heaviest point.",
    "Underground sump or borewell: north-east. Septic tank: north-west, away from the north-east.",
    "Keep the north-east of the plot lowest and most open; slope the ground and roof drainage towards it.",
  ];
  if (i.parking && liv.find((c) => c.id === "parking" && c.score < 1)) n.push("Parking did not fit inside the house on this frontage. The front open space can take a car if the front setback is 15 ft or more.");
  return n;
}

export const BAND_LABEL: Record<Band, string> = { front: "Front", middle: "Middle", rear: "Rear" };
