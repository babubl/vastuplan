/**
 * Layout engine.
 *
 * An Indian house on a rectangular plot is planned as three bands parallel to the road:
 *   front  - living, parking, pooja, sit-out (public)
 *   middle - dining/hall (the circulation spine and Brahmasthan), staircase, common toilet
 *   rear   - bedrooms, kitchen, utility (private)
 * Every room in the front and rear bands opens off the middle band or the living room, so the plan
 * is always walkable. The engine tries every sensible assignment of flexible rooms to bands and every
 * ordering of rooms within a band, places them to real sizes, and keeps the plans that score best for
 * Vastu and livability.
 */
import { localFrame, toCompass, zoneOf, type LocalFrame } from "./geometry";
import { auspiciousStretch, prefOf } from "./vastu";
import { SUITE, TOILET_D, type Spec } from "./program";
import type { Band, Facing, Rect, Room, RoomType } from "./types";

export const BANDS: Band[] = ["front", "middle", "rear"];

export interface BandGeom { band: Band; v: number; d: number }

/** A room placed in local coordinates. */
export interface Placed { key: string; type: RoomType; label: string; u: number; v: number; w: number; d: number; band: Band; owner?: string; open?: boolean; hub?: boolean }

/* ------------------------------------------------------------------ widths */

interface Alloc { widths: number[]; leftover: number }

/** Share `total` among items: up to ideal, then up to max, then into hubs (or modestly past max). */
export function allocate(items: { min: number; ideal: number; max: number; hub?: boolean }[], total: number): Alloc | null {
  const mins = items.reduce((s, i) => s + i.min, 0);
  if (mins > total + 1e-6) return null;
  const w = items.map((i) => i.min);
  let rem = total - mins;
  const grow = (cap: (k: number) => number) => {
    for (let pass = 0; pass < 6 && rem > 1e-6; pass++) {
      const room = items.map((_, k) => Math.max(0, cap(k) - w[k]));
      const sum = room.reduce((s, x) => s + x, 0);
      if (sum < 1e-6) return;
      const give = Math.min(rem, sum);
      items.forEach((_, k) => { const g = (room[k] / sum) * give; w[k] += g; });
      rem -= give;
    }
  };
  grow((k) => items[k].ideal);
  grow((k) => items[k].max);
  if (rem > 1e-6 && items.some((i) => i.hub)) { const r0 = rem; grow((k) => (items[k].hub ? w[k] + r0 : w[k])); }
  grow((k) => items[k].max * 1.3);
  return { widths: w, leftover: rem };
}

/* ------------------------------------------------------------------ depths */

export type DepthFloor = Partial<Record<Band, { min: number; ideal: number; max: number }>>;

export function bandDepths(byBand: Record<Band, Spec[]>, available: number, fixed?: BandGeom[], floor?: DepthFloor): { geoms: BandGeom[]; used: number } | null {
  if (fixed) return { geoms: fixed, used: fixed.reduce((s, g) => s + g.d, 0) };
  const present = BANDS.filter((b) => byBand[b].length);
  const need = present.map((b) => {
    const f = floor?.[b];
    const n = needOf(b);
    return f ? { min: Math.max(n.min, f.min), ideal: Math.max(n.ideal, f.ideal), max: Math.max(n.max, f.max) } : n;
  });
  function needOf(b: Band) {
    const specs = byBand[b];
    const full = specs.filter((s) => s.place === "full" || s.hub);
    const pick = full.length ? full : specs;
    return {
      min: Math.max(...specs.map((s) => s.minD)),
      ideal: Math.max(...pick.map((s) => s.idealD)),
      max: Math.max(...pick.map((s) => s.maxD)),
    };
  }
  const a = allocate(need.map((n) => ({ ...n, max: n.max })), available);
  if (!a) return null;
  // Depth beyond the ideal maximum stays open (a yard), never a 20-foot-deep bedroom.
  const depths = need.map((n, k) => Math.min(a.widths[k], n.max));
  let v = 0;
  const geoms = present.map((b, k) => { const g = { band: b, v, d: depths[k] }; v += depths[k]; return g; });
  return { geoms, used: v };
}

/* ------------------------------------------------------------------ placing one band */

const FILLER_MIN = 3;

function fillerFor(band: Band, spec: Spec, roomIsOuter: boolean): { type: RoomType; label: string; open?: boolean; hub?: boolean } {
  if (band === "front") {
    if (!roomIsOuter) return { type: "sitout", label: "Sit-out", open: true };
    if (spec.type === "living") return { type: "passage", label: "Passage", hub: true };
    if (spec.type === "balcony") return { type: "lounge", label: "Sitting", hub: true };
    return { type: "store", label: "Store" };
  }
  if (band === "rear" && roomIsOuter && spec.type === "toilet") return { type: "passage", label: "Passage", hub: true };
  return { type: "store", label: "Store" };
}

/** Place an ordered band of rooms between u0 and u1 at the band's depth. */
function placeSegment(order: Spec[], suiteLo: Record<string, boolean>, g: BandGeom, u0: number, u1: number, level: number, out: Placed[]): number | null {
  if (!order.length) {
    if (u1 - u0 > 0.5) out.push({ key: `fill-${g.band}-${level}-${u0.toFixed(1)}`, type: g.band === "middle" || !level ? "store" : "balcony", label: level ? (g.band === "middle" ? "Store" : "Open terrace") : "Store", u: u0, v: g.v, w: u1 - u0, d: g.d, band: g.band, open: level > 0 && g.band !== "middle" });
    return 0;
  }
  // Each suite adds a toilet/dress column as its own flexible item.
  const items: { min: number; ideal: number; max: number; hub?: boolean }[] = [];
  const idx: { room: number; col: number }[] = [];
  order.forEach((s) => {
    idx.push({ room: items.length, col: s.suite ? items.length + 1 : -1 });
    items.push({ min: s.minW, ideal: s.idealW, max: s.maxW, hub: s.hub });
    if (s.suite) items.push(SUITE);
  });
  const a = allocate(items, u1 - u0);
  if (!a) return null;
  let u = u0;
  order.forEach((s, k) => {
    const rw = a.widths[idx[k].room];
    const cw = s.suite ? a.widths[idx[k].col] : 0;
    const lo = s.suite ? suiteLo[s.key] : false;
    const roomU = s.suite && lo ? u + cw : u;
    // depth inside the band
    let rd = g.d;
    if (!(s.place === "full" || s.hub)) {
      rd = Math.min(g.d, s.maxD);
      if (g.d - rd < FILLER_MIN) {
        // a rear toilet keeps a 3 ft passage in front of it, so it can always be reached
        rd = s.type === "toilet" && g.band === "rear" && g.d - FILLER_MIN >= s.minD ? g.d - FILLER_MIN : g.d;
      }
    } else if (g.d > s.maxD + 2 && !s.hub) {
      rd = Math.max(s.maxD, g.d - 6);
      if (g.d - rd < FILLER_MIN) rd = g.d;
    }
    const roomIsOuter = s.place === "outer";
    const outerLow = g.band === "front";
    const atLow = g.band === "middle" ? !roomIsOuter : roomIsOuter === outerLow;
    const rv = atLow ? g.v : g.v + g.d - rd;
    out.push({ key: s.key, type: s.type, label: s.label, u: roomU, v: rv, w: rw, d: rd, band: g.band, hub: s.hub, open: s.type === "parking" || s.type === "balcony" });
    if (rd < g.d - 1e-6) {
      const f = fillerFor(g.band, s, roomIsOuter);
      out.push({ key: `${s.key}-fill`, ...f, u: roomU, v: atLow ? g.v + rd : g.v, w: rw, d: g.d - rd, band: g.band, owner: f.hub ? undefined : s.key });
    }
    if (s.suite) {
      const cu = lo ? u : u + rw;
      // toilet against the outside wall of the band (for a ventilator), dress area towards the bedroom
      const td = g.d - TOILET_D >= FILLER_MIN ? TOILET_D : g.d;
      const tv = outerLow ? g.v : g.v + g.d - td;
      out.push({ key: `${s.key}-wc`, type: "toilet", label: "Toilet", u: cu, v: tv, w: cw, d: td, band: g.band, owner: s.key });
      if (td < g.d) out.push({ key: `${s.key}-dress`, type: "dress", label: "Dress", u: cu, v: outerLow ? g.v + td : g.v, w: cw, d: g.d - td, band: g.band, owner: s.key });
    }
    u += rw + cw;
  });
  if (a.leftover > 0.5) {
    // Width nobody could use becomes a store (or open terrace upstairs) at the end of the segment.
    const terrace = level > 0 && g.band !== "middle";
    out.push({ key: `rest-${g.band}-${level}-${u0.toFixed(1)}`, type: terrace ? "balcony" : "store", label: terrace ? "Open terrace" : "Store", u, v: g.v, w: a.leftover, d: g.d, band: g.band, open: terrace });
  }
  return a.leftover;
}

/* ------------------------------------------------------------------ ordering search */

function* permutations<T>(arr: T[]): Generator<T[]> {
  if (arr.length <= 1) { yield arr.slice(); return; }
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const p of permutations(rest)) yield [arr[i], ...p];
  }
}

export interface Ctx { frame: LocalFrame; facing: Facing; level: 0 | 1; footprint: Rect }

function compassRoom(ctx: Ctx, p: Placed): Rect { return toCompass(ctx.frame, p.u, p.v, p.w, p.d); }

/** Quick score of one band ordering: zone fit, adjacency and constraints. */
function proxyScore(ctx: Ctx, g: BandGeom, placed: Placed[], order: Spec[], leftover: number): number {
  let s = 0;
  for (const p of placed) {
    const spec = order.find((o) => o.key === p.key);
    const weight = spec?.weight ?? (p.type === "toilet" ? 1.5 : 0.3);
    s += weight * prefOf(p.type, zoneOf(compassRoom(ctx, p), ctx.footprint));
  }
  const idx = (k: string) => order.findIndex((o) => o.key === k);
  order.forEach((o, i) => {
    if (o.nextTo && idx(o.nextTo) >= 0 && Math.abs(idx(o.nextTo) - i) !== 1) s -= 4;
    const atEnd = i === 0 || i === order.length - 1;
    if (g.band === "middle" && (o.type === "toilet" || o.type === "bedroom" || o.type === "master") && !atEnd) s -= 6; // needs an outside wall
    if (o.nearTo && idx(o.nearTo) >= 0 && Math.abs(idx(o.nearTo) - i) !== 1) s -= 2;
    if (o.type === "parking" && !atEnd) s -= 6;
    if (g.band === "middle" && o.type === "stair" && !atEnd) s -= 1;
    if (o.type === "kitchen" && !atEnd) s -= 1.5; // a kitchen wants an outside wall and a corner
    if (g.band === "middle" && o.type === "kitchen") { const d = idx("dining"); if (d >= 0 && Math.abs(d - i) !== 1) s -= 5; }
  });
  // The middle band's hall should sit centrally so front and rear rooms can all open onto it.
  const hub = placed.find((p) => p.hub && p.band === "middle");
  if (hub) {
    const mid = ctx.frame.frontage / 2;
    s -= Math.abs(hub.u + hub.w / 2 - mid) / ctx.frame.frontage * 3;
    s += Math.min(1, hub.w / ctx.frame.frontage) * 3;
  }
  if (ctx.level === 0 && g.band === "front") {
    const living = placed.find((p) => p.type === "living");
    if (living) {
      const r = compassRoom(ctx, living);
      const st = auspiciousStretch(ctx.facing, ctx.footprint);
      const [a, b] = ctx.facing === "N" || ctx.facing === "S" ? [r.x, r.x + r.w] : [r.y, r.y + r.h];
      if (Math.min(b, st.b) - Math.max(a, st.a) >= 3.5) s += 3;
    }
  }
  s -= leftover * 0.05;
  return s;
}

export interface BandOption { placed: Placed[]; proxy: number }

/** Best orderings of one band, optionally around a fixed staircase. */
export function bandOptions(ctx: Ctx, g: BandGeom, specs: Spec[], frontage: number, keep: number, fixed?: { u: number; w: number; placed: Placed }): BandOption[] {
  const results: BandOption[] = [];
  const suiteKeys = specs.filter((s) => s.suite).map((s) => s.key);
  const sideCombos = 1 << suiteKeys.length;
  const free = specs;
  const tryOrder = (order: Spec[], split: number) => {
    for (let mask = 0; mask < sideCombos; mask++) {
      const lo: Record<string, boolean> = {};
      suiteKeys.forEach((k, i) => (lo[k] = !!(mask & (1 << i))));
      const placed: Placed[] = [];
      let left: number | null;
      if (fixed) {
        const l = placeSegment(order.slice(0, split), lo, g, 0, fixed.u, ctx.level, placed);
        const r = placeSegment(order.slice(split), lo, g, fixed.u + fixed.w, frontage, ctx.level, placed);
        if (l === null || r === null) continue;
        placed.push({ ...fixed.placed, v: g.v, d: g.d });
        left = l + r;
      } else {
        left = placeSegment(order, lo, g, 0, frontage, ctx.level, placed);
        if (left === null) continue;
      }
      results.push({ placed, proxy: proxyScore(ctx, g, placed, order, left) });
    }
  };
  for (const order of permutations(free)) {
    if (fixed) for (let split = 0; split <= order.length; split++) tryOrder(order, split);
    else tryOrder(order, 0);
  }
  results.sort((a, b) => b.proxy - a.proxy);
  // keep distinct layouts
  const seen = new Set<string>();
  const out: BandOption[] = [];
  for (const r of results) {
    const sig = r.placed.map((p) => `${p.key}@${p.u.toFixed(1)}`).sort().join("|");
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(r);
    if (out.length >= keep) break;
  }
  return out;
}

/* ------------------------------------------------------------------ band assignments */

export function* assignments(specs: Spec[]): Generator<Record<Band, Spec[]>> {
  const flex = specs.filter((s) => s.bands.length > 1 && !s.nextTo);
  const fixedSpecs = specs.filter((s) => s.bands.length === 1 && !s.nextTo);
  const followers = specs.filter((s) => s.nextTo);
  const total = flex.reduce((n, s) => n * s.bands.length, 1);
  for (let code = 0; code < total; code++) {
    const by: Record<Band, Spec[]> = { front: [], middle: [], rear: [] };
    fixedSpecs.forEach((s) => by[s.bands[0]].push(s));
    let c = code;
    const bandOf: Record<string, Band> = {};
    fixedSpecs.forEach((s) => (bandOf[s.key] = s.bands[0]));
    for (const s of flex) { const b = s.bands[c % s.bands.length]; c = Math.floor(c / s.bands.length); by[b].push(s); bandOf[s.key] = b; }
    for (const f of followers) { const b = bandOf[f.nextTo!]; if (b && f.bands.includes(b)) by[b].push(f); else by[f.bands[0]].push(f); }
    yield by;
  }
}

export function toRooms(ctx: Ctx, placed: Placed[]): Room[] {
  return placed.map((p) => {
    const rect = compassRoom(ctx, p);
    return { id: `${ctx.level}-${p.key}`, type: p.type, label: p.label, rect, zone: zoneOf(rect, ctx.footprint), owner: p.owner ? `${ctx.level}-${p.owner}` : undefined, open: p.open };
  });
}

export { localFrame };
