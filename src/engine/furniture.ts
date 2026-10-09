/**
 * Furniture to scale, placed the way an interior architect would, with Vastu orientation:
 * bed head to the south (or east), hob on the east wall so the cook faces east, sofa facing
 * north or east, WC on a north-south axis, prayer facing east, study facing north or east.
 */
import type { Facing, Furniture, Opening, Rect, Room } from "./types";

type Side = "N" | "E" | "S" | "W";
const INSET = 0.3; // half a wall plus a skirting gap
const OPP: Record<Side, Side> = { N: "S", S: "N", E: "W", W: "E" };

const inter = (a: Rect, b: Rect) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0.05 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0.05;
const inside = (a: Rect, r: Rect) => a.x >= r.x + INSET - 0.01 && a.y >= r.y + INSET - 0.01 && a.x + a.w <= r.x + r.w - INSET + 0.01 && a.y + a.h <= r.y + r.h - INSET + 0.01;

/** Length of a wall (inside the insets) and whether it runs east-west. */
const wallLen = (r: Rect, s: Side) => (s === "N" || s === "S" ? r.w : r.h) - 2 * INSET;

/** A rectangle of `len` along wall `s` and `depth` into the room, at position t (0 start .. 1 end) along the wall. */
function against(r: Rect, s: Side, len: number, depth: number, t = 0.5): Rect {
  const L = wallLen(r, s);
  const off = INSET + Math.max(0, (L - len) * t);
  switch (s) {
    case "N": return { x: r.x + off, y: r.y + INSET, w: len, h: depth };
    case "S": return { x: r.x + off, y: r.y + r.h - INSET - depth, w: len, h: depth };
    case "W": return { x: r.x + INSET, y: r.y + off, w: depth, h: len };
    case "E": return { x: r.x + r.w - INSET - depth, y: r.y + off, w: depth, h: len };
  }
}

/** Keep-clear zones: the swing of every door and a walkway in front of every opening. */
function clearZones(room: Room, openings: Opening[]): Rect[] {
  const r = room.rect;
  const zones: Rect[] = [];
  for (const o of openings) {
    if (o.kind === "window" || o.kind === "ventilator") continue;
    if (o.a !== room.id && o.b !== room.id) continue;
    const vertical = Math.abs(o.x1 - o.x2) < 0.01;
    const len = vertical ? Math.abs(o.y2 - o.y1) : Math.abs(o.x2 - o.x1);
    const reach = Math.min(3.2, Math.max(2.6, len));
    if (vertical) {
      const x = Math.abs(o.x1 - r.x) < 0.05 ? r.x : r.x + r.w - reach;
      zones.push({ x, y: Math.min(o.y1, o.y2) - 0.2, w: reach, h: len + 0.4 });
    } else {
      const y = Math.abs(o.y1 - r.y) < 0.05 ? r.y : r.y + r.h - reach;
      zones.push({ x: Math.min(o.x1, o.x2) - 0.2, y, w: len + 0.4, h: reach });
    }
  }
  return zones;
}

/** Sides of the room that have a window or ventilator (keep tall units off them). */
function windowSides(room: Room, openings: Opening[]): Set<Side> {
  const r = room.rect, s = new Set<Side>();
  for (const o of openings) {
    if ((o.kind !== "window" && o.kind !== "ventilator") || o.a !== room.id) continue;
    if (Math.abs(o.x1 - o.x2) < 0.01) s.add(Math.abs(o.x1 - r.x) < 0.05 ? "W" : "E");
    else s.add(Math.abs(o.y1 - r.y) < 0.05 ? "N" : "S");
  }
  return s;
}

class Fitter {
  items: Furniture[] = [];
  constructor(public room: Room, public blocked: Rect[]) {}
  ok(rect: Rect) { return inside(rect, this.room.rect) && !this.blocked.some((b) => inter(b, rect)) && !this.items.some((i) => inter(i.rect, rect)); }
  /** Try walls in order, sliding along each wall, and place the first fit. */
  place(kind: string, sides: Side[], len: number, depth: number, opts: { label?: string; facing?: (s: Side) => Facing; ts?: number[] } = {}): Furniture | null {
    const ts = opts.ts ?? [0.5, 0.25, 0.75, 0, 1];
    for (const s of sides) {
      if (wallLen(this.room.rect, s) < len) continue;
      for (const t of ts) {
        const rect = against(this.room.rect, s, len, depth, t);
        if (this.ok(rect)) { const f: Furniture = { room: this.room.id, kind, label: opts.label, rect, facing: opts.facing?.(s) }; this.items.push(f); return f; }
      }
    }
    return null;
  }
  add(kind: string, rect: Rect, extra: Partial<Furniture> = {}) { if (this.ok(rect)) { const f = { room: this.room.id, kind, rect, ...extra }; this.items.push(f); return f; } return null; }
}

/** Free-standing rectangle centred in the room, avoiding door zones. */
function centred(r: Rect, w: number, h: number, dx = 0, dy = 0): Rect { return { x: r.x + (r.w - w) / 2 + dx, y: r.y + (r.h - h) / 2 + dy, w, h }; }

export function furnish(room: Room, openings: Opening[]): Furniture[] {
  const r = room.rect;
  const F = new Fitter(room, clearZones(room, openings));
  const win = windowSides(room, openings);
  const longSides = (r.w >= r.h ? ["N", "S"] : ["E", "W"]) as Side[];

  switch (room.type) {
    case "master":
    case "bedroom": {
      const [bw, bl] = room.type === "master" ? [6, 6.5] : [5, 6.5];
      // Head against the south wall is best, east next; west acceptable; never north.
      let bed: Furniture | null = null;
      for (const s of ["S", "E", "W"] as Side[]) {
        const across = s === "N" || s === "S" ? r.h : r.w;
        if (across - 2 * INSET < bl + 2.5) continue;
        const rect = against(r, s, bw, bl, 0.5);
        for (const shift of [0, -1, 1, -2, 2, -3, 3]) {
          const moved = s === "N" || s === "S" ? { ...rect, x: rect.x + shift } : { ...rect, y: rect.y + shift };
          if (F.ok(moved)) { bed = F.add("bed", moved, { facing: s, label: room.type === "master" ? "King bed" : "Queen bed" }); break; }
        }
        if (bed) break;
      }
      if (bed) {
        const s = bed.facing as Side;
        const b = bed.rect;
        const st = 1.5;
        if (s === "N" || s === "S") {
          const y = s === "S" ? b.y + b.h - st : b.y;
          F.add("side", { x: b.x - st - 0.1, y, w: st, h: st }); F.add("side", { x: b.x + b.w + 0.1, y, w: st, h: st });
        } else {
          const x = s === "E" ? b.x + b.w - st : b.x;
          F.add("side", { x, y: b.y - st - 0.1, w: st, h: st }); F.add("side", { x, y: b.y + b.h + 0.1, w: st, h: st });
        }
        const wardrobeSides = (["S", "W", "N", "E"] as Side[]).filter((x) => x !== s && !win.has(x));
        F.place("wardrobe", wardrobeSides, Math.min(room.type === "master" ? 7 : 6, Math.max(4, Math.min(wallLen(r, "S"), wallLen(r, "W")) - 3)), 2, { label: "Wardrobe", ts: [1, 0, 0.5] });
        if (room.type === "master") F.place("desk", (["E", "N"] as Side[]).filter((x) => x !== s), 3.5, 1.75, { label: "Dresser", facing: (x) => x, ts: [0.5, 0, 1] });
      }
      break;
    }
    case "living":
    case "lounge": {
      // Sofa against the south or west wall, so you sit facing north or east.
      const sofaLen = Math.min(room.type === "living" ? 7.5 : 6.5, Math.max(wallLen(r, "S"), wallLen(r, "W")) - 2);
      const sofa = F.place("sofa", ["S", "W", "E", "N"], sofaLen, 3, { label: "Sofa", facing: (s) => OPP[s] });
      if (sofa) {
        const s = OPP[sofa.facing as Side];
        const b = sofa.rect;
        const gap = 1.6;
        const ct = s === "S" ? { x: b.x + (b.w - 4) / 2, y: b.y - gap - 2, w: 4, h: 2 }
          : s === "N" ? { x: b.x + (b.w - 4) / 2, y: b.y + b.h + gap, w: 4, h: 2 }
          : s === "W" ? { x: b.x + b.w + gap, y: b.y + (b.h - 4) / 2, w: 2, h: 4 }
          : { x: b.x - gap - 2, y: b.y + (b.h - 4) / 2, w: 2, h: 4 };
        F.add("table", ct, { label: "Coffee table" });
        F.place("tv", [OPP[s]], Math.min(6, wallLen(r, OPP[s]) - 1), 1.5, { label: "TV unit" });
        if (room.type === "living") {
          const chairs: Rect[] = s === "S" || s === "N" ? [{ x: ct.x - 3.2, y: ct.y - 0.2, w: 2.6, h: 2.6 }, { x: ct.x + ct.w + 0.6, y: ct.y - 0.2, w: 2.6, h: 2.6 }] : [{ x: ct.x - 0.3, y: ct.y - 3.2, w: 2.6, h: 2.6 }, { x: ct.x - 0.3, y: ct.y + ct.h + 0.6, w: 2.6, h: 2.6 }];
          chairs.forEach((c) => F.add("chair", c, { label: "Armchair" }));
        }
      }
      break;
    }
    case "dining": {
      const six = Math.min(r.w, r.h) >= 9.5 && Math.max(r.w, r.h) >= 11;
      const [tw, th] = six ? [6, 3.5] : [4.5, 3];
      const horizontal = r.w >= r.h;
      const t = horizontal ? centred(r, tw, th) : centred(r, th, tw);
      const table = F.add("dining", t, { label: six ? "6-seater table" : "4-seater table" }) ?? F.add("dining", horizontal ? centred(r, tw, th, 0, 1) : centred(r, th, tw, 1, 0), { label: six ? "6-seater table" : "4-seater table" });
      if (table) F.place("crockery", ["S", "W"], Math.min(5, wallLen(r, "S") - 2), 1.5, { label: "Crockery unit", ts: [0.5, 0, 1] });
      break;
    }
    case "kitchen": {
      // Hob on the east wall so the cook faces east; failing that the north wall (faces north).
      const D = 2;
      const hobSide = (["E", "N", "S", "W"] as Side[]).find((s) => F.ok(against(r, s, Math.min(wallLen(r, s), 6), D, 0.5)) || F.ok(against(r, s, Math.min(wallLen(r, s), 6), D, 1)) || F.ok(against(r, s, Math.min(wallLen(r, s), 6), D, 0))) ?? "E";
      const len = Math.min(wallLen(r, hobSide), 9);
      const main = F.place("counter", [hobSide], len, D, { label: "Counter", ts: [1, 0, 0.5] }) ?? F.place("counter", [hobSide], Math.max(4, len - 2.5), D, { label: "Counter", ts: [1, 0, 0.5] });
      if (main) {
        const m = main.rect;
        // hob towards the south end of an east/west counter (south-east corner), sink towards the north
        const hob: Rect = hobSide === "E" || hobSide === "W" ? { x: m.x, y: m.y + m.h - 2.6, w: m.w, h: 2.2 } : { x: hobSide === "N" ? m.x + m.w - 2.6 : m.x + m.w - 2.6, y: m.y, w: 2.2, h: m.h };
        F.items.push({ room: room.id, kind: "hob", rect: hob, facing: hobSide, label: "Hob" });
        // L-return along an adjacent wall, with the sink
        const adj = (hobSide === "E" || hobSide === "W" ? ["N", "S"] : ["E", "W"]) as Side[];
        const leg = F.place("counter", adj, Math.min(5, Math.max(3, Math.min(wallLen(r, adj[0]), wallLen(r, adj[1])) - D - 0.5)), D, { label: "Counter", ts: hobSide === "E" || hobSide === "S" ? [1, 0] : [0, 1] });
        const sinkHost = leg ?? main;
        const sr = sinkHost.rect;
        const sink: Rect = sr.w > sr.h ? { x: sr.x + sr.w / 2 - 1, y: sr.y + 0.2, w: 2, h: sr.h - 0.4 } : { x: sr.x + 0.2, y: sr.y + sr.h / 2 - 1, w: sr.w - 0.4, h: 2 };
        F.items.push({ room: room.id, kind: "sink", rect: sink, label: "Sink" });
      }
      F.place("fridge", ["W", "N", "S", "E"], 2.5, 2.5, { label: "Fridge", ts: [0, 1] });
      break;
    }
    case "toilet": {
      // WC on a north-south axis: against the north or south wall.
      F.place("wc", ["S", "N", "W", "E"], 1.6, 2.3, { label: "WC", ts: [1, 0, 0.5], facing: (s) => OPP[s] });
      F.place("basin", ["E", "W", "N", "S"], 1.6, 1.3, { label: "Basin", ts: [0, 1, 0.5] });
      const shower = F.place("shower", longSides, Math.min(3, Math.min(r.w, r.h) - 1), Math.min(3, Math.min(r.w, r.h) - 1), { label: "Shower", ts: [0, 1] });
      if (!shower) F.place("shower", ["N", "S", "E", "W"], 2.5, 2.5, { label: "Shower", ts: [0, 1] });
      break;
    }
    case "pooja": {
      // Altar on the east wall so you face east while praying.
      F.place("altar", ["E", "N", "W"], Math.min(3.5, Math.min(r.w, r.h) - 1.2), 1.5, { label: "Altar", facing: (s) => s });
      break;
    }
    case "study": {
      const desk = F.place("desk", ["E", "N", "W"], Math.min(4.5, wallLen(r, "E") - 1), 2, { label: "Desk", facing: (s) => s });
      if (desk) {
        const d = desk.rect, s = desk.facing as Side;
        const ch: Rect = s === "E" ? { x: d.x - 2.1, y: d.y + d.h / 2 - 1, w: 1.8, h: 2 } : s === "W" ? { x: d.x + d.w + 0.3, y: d.y + d.h / 2 - 1, w: 1.8, h: 2 } : { x: d.x + d.w / 2 - 1, y: d.y + d.h + 0.3, w: 2, h: 1.8 };
        F.add("chair", ch, { label: "Chair" });
      }
      F.place("shelf", ["S", "W"], Math.min(5, wallLen(r, "S") - 1), 1.3, { label: "Bookshelf" });
      break;
    }
    case "parking": {
      const along = r.h >= r.w;
      const [cw, cl] = [6, 14.5];
      const car = along ? centred(r, cw, Math.min(cl, r.h - 1)) : centred(r, Math.min(cl, r.w - 1), cw);
      F.items.push({ room: room.id, kind: "car", rect: car, label: "Car" });
      break;
    }
    case "utility": {
      F.place("washer", ["W", "N", "S", "E"], 2, 2, { label: "Washer", ts: [0, 1] });
      F.place("sink", ["E", "S", "N", "W"], 2, 1.6, { label: "Wash sink", ts: [1, 0] });
      break;
    }
    case "dress":
      F.place("wardrobe", longSides, Math.max(3, Math.max(r.w, r.h) - 3.5), 1.8, { label: "Wardrobe", ts: [0, 1, 0.5] });
      break;
    case "store":
      if (Math.min(r.w, r.h) >= 3.5) F.place("shelf", longSides, Math.max(2.5, Math.max(r.w, r.h) - 3.2), 1.3, { label: "Shelves", ts: [0, 1] });
      break;
    case "sitout":
    case "balcony":
      if (r.w * r.h >= 24 && Math.min(r.w, r.h) >= 4) {
        const c = centred(r, 2, 2);
        F.add("planter", { x: r.x + INSET + 0.1, y: r.y + INSET + 0.1, w: 1.4, h: 1.4 }, { label: "Planter" });
        F.add("chair", { ...c, x: c.x - 1.6 }, { label: "Chair" });
        F.add("chair", { ...c, x: c.x + 1.6 }, { label: "Chair" });
      }
      break;
    case "stair":
      F.items.push({ room: room.id, kind: "stairs", rect: { ...r }, label: "Up" });
      break;
  }
  return F.items;
}
