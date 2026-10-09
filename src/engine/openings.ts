/** Doors, the main entrance and windows. */
import { exteriorEdges, sharedWall, type Segment } from "./geometry";
import { auspiciousStretch } from "./vastu";
import type { Facing, Opening, Rect, Room, RoomType } from "./types";

/** Which spaces a room may open off, in order of preference. */
const ACCESS: Record<RoomType, RoomType[]> = {
  living: ["passage", "sitout"],
  dining: ["living", "passage"],
  kitchen: ["dining", "passage", "living", "lounge"],
  utility: ["kitchen", "passage", "dining"],
  master: ["dining", "lounge", "passage", "living"],
  bedroom: ["dining", "lounge", "passage", "living"],
  study: ["living", "dining", "lounge", "passage"],
  toilet: ["passage", "dining", "lounge", "living"],
  dress: [],
  pooja: ["living", "dining", "lounge", "passage"],
  stair: ["dining", "living", "passage", "lounge"],
  parking: [],
  store: ["kitchen", "utility", "dining", "passage", "living", "lounge"],
  sitout: ["living", "lounge", "study", "bedroom", "master", "passage", "dining"],
  lounge: ["stair", "passage", "lounge"],
  balcony: ["lounge", "master", "bedroom", "study", "passage"],
  passage: ["dining", "living", "lounge", "stair"],
};

const OPEN_LINKS = new Set(["dining-living", "passage-dining", "passage-living", "stair-dining", "stair-living", "stair-passage", "stair-lounge", "lounge-stair", "passage-lounge", "lounge-passage", "dress-master", "dress-bedroom", "sitout-living", "dining-passage", "living-passage"]);

function doorWidth(room: Room, via: Room): number {
  if (room.type === "dining" && via.type === "living") return 5;
  if (room.type === "toilet" || room.type === "dress" || room.type === "utility" || room.type === "pooja" || room.type === "store") return 2.5;
  if (room.type === "stair" || room.type === "passage" || room.type === "lounge") return 3.5;
  return 3;
}

/** Place an opening of width w on a wall segment, near the end closest to `toward`. */
function onSegment(seg: Segment, w: number, toward: { x: number; y: number } | null): { x1: number; y1: number; x2: number; y2: number } | null {
  const len = seg.length;
  const width = Math.min(w, len - 0.8);
  if (width < 2.3) return null;
  const margin = 0.5;
  let c: number; // centre, measured along the segment from its start
  if (!toward) c = len / 2;
  else {
    const startCloser = seg.vertical ? Math.abs(toward.y - seg.y1) < Math.abs(toward.y - seg.y2) : Math.abs(toward.x - seg.x1) < Math.abs(toward.x - seg.x2);
    c = startCloser ? margin + width / 2 : len - margin - width / 2;
  }
  c = Math.max(width / 2 + 0.3, Math.min(len - width / 2 - 0.3, c));
  return seg.vertical
    ? { x1: seg.x1, y1: seg.y1 + c - width / 2, x2: seg.x1, y2: seg.y1 + c + width / 2 }
    : { x1: seg.x1 + c - width / 2, y1: seg.y1, x2: seg.x1 + c + width / 2, y2: seg.y1 };
}

const centre = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

export interface OpeningResult { openings: Opening[]; unreachable: string[]; mainDoor?: Opening; mainInStretch: boolean; mainNearStretch: boolean }

export function computeOpenings(rooms: Room[], footprint: Rect, facing: Facing, level: 0 | 1): OpeningResult {
  const openings: Opening[] = [];
  const byId = new Map(rooms.map((r) => [r.id, r]));
  const links = new Map<string, string[]>();
  const link = (a: string, b: string) => { links.set(a, [...(links.get(a) ?? []), b]); links.set(b, [...(links.get(b) ?? []), a]); };

  // Main entrance (ground floor): on the living room's front wall, inside the auspicious padas if possible.
  let mainDoor: Opening | undefined;
  let mainInStretch = false, mainNearStretch = false;
  if (level === 0) {
    const front = rooms.filter((r) => r.type === "living" || r.type === "passage" || r.type === "sitout")
      .map((r) => ({ r, e: exteriorEdges(r.rect, footprint).find((x) => x.side === facing) }))
      .filter((x) => x.e);
    const living = front.find((x) => x.r.type === "living") ?? front[0];
    if (living?.e) {
      const st = auspiciousStretch(facing, footprint);
      const seg = living.e.seg;
      const ns = !seg.vertical;
      const a0 = ns ? seg.x1 : seg.y1, a1 = ns ? seg.x2 : seg.y2;
      const lo = Math.max(a0, st.a), hi = Math.min(a1, st.b);
      const W = 3.5;
      let c: number;
      if (hi - lo >= W) { c = (lo + hi) / 2; mainInStretch = true; }
      else {
        const target = (st.a + st.b) / 2;
        c = Math.max(a0 + W / 2 + 0.5, Math.min(a1 - W / 2 - 0.5, target));
        mainNearStretch = Math.abs(c - target) < (st.b - st.a);
      }
      mainDoor = ns
        ? { x1: c - W / 2, y1: seg.y1, x2: c + W / 2, y2: seg.y1, a: living.r.id, b: "out", into: living.r.id, kind: "main" }
        : { x1: seg.x1, y1: c - W / 2, x2: seg.x1, y2: c + W / 2, a: living.r.id, b: "out", into: living.r.id, kind: "main" };
      openings.push(mainDoor);
      link(living.r.id, "out");
    }
  }

  // Interior doors.
  for (const room of rooms) {
    if (room.type === "living" && level === 0) continue;
    if (room.type === "parking" || (room.type === "sitout" && level === 0)) { link(room.id, "out"); if (room.type === "parking") continue; }
    const owner = room.owner ? byId.get(room.owner) : undefined;
    const ownDress = rooms.find((r) => r.type === "dress" && r.owner && r.owner === room.owner && r.id !== room.id);
    const candidates: Room[] = [];
    if (room.type === "toilet" && owner) { if (ownDress) candidates.push(ownDress); candidates.push(owner); }
    else if (room.type === "dress" && owner) candidates.push(owner);
    else if (owner && room.type === "store") candidates.push(owner);
    for (const t of ACCESS[room.type]) for (const r of rooms) if (r.type === t && r.id !== room.id && !(r.owner && r.type !== "passage")) candidates.push(r);
    let done = false;
    for (const via of candidates) {
      const seg = sharedWall(room.rect, via.rect);
      if (!seg) continue;
      const isOpen = OPEN_LINKS.has(`${room.type}-${via.type}`) || room.type === "sitout";
      const w = isOpen && room.type === "dining" ? Math.min(6, seg.length - 1) : doorWidth(room, via);
      const pos = onSegment(seg, w, isOpen ? null : centre(via.rect));
      if (!pos) continue;
      openings.push({ ...pos, a: room.id, b: via.id, into: isOpen ? undefined : room.id, kind: isOpen ? "opening" : "door" });
      link(room.id, via.id);
      done = true;
      break;
    }
    if (!done && room.type === "sitout") done = true;
  }

  // Reachability from the entrance (ground) or the staircase (upper floor).
  const start = level === 0 ? "out" : rooms.find((r) => r.type === "stair")?.id;
  const seen = new Set<string>();
  if (start) {
    const q = [start];
    while (q.length) { const n = q.shift()!; if (seen.has(n)) continue; seen.add(n); for (const m of links.get(n) ?? []) if (!seen.has(m)) q.push(m); }
  }
  const unreachable = rooms.filter((r) => !seen.has(r.id) && !(level > 0 && r.type === "balcony" && r.label === "Open terrace")).map((r) => r.id);

  // Windows on outside walls.
  for (const room of rooms) {
    if (room.open || room.type === "stair" || room.type === "passage") continue;
    const small = room.type === "toilet" || room.type === "utility" || room.type === "store" || room.type === "dress" || room.type === "pooja";
    const edges = exteriorEdges(room.rect, footprint).sort((a, b) => b.seg.length - a.seg.length);
    const take = small ? edges.slice(0, 1) : edges.slice(0, 2);
    for (const { seg } of take) {
      const w = small ? 2 : Math.min(room.type === "living" ? 6 : 5, seg.length - 2);
      if (w < 2) continue;
      let pos = onSegment(seg, w, null);
      if (pos && mainDoor && overlaps(pos, mainDoor)) {
        // keep the window clear of the main door: use the longer remaining stretch
        const ns = !seg.vertical;
        const a0 = ns ? seg.x1 : seg.y1, a1 = ns ? seg.x2 : seg.y2;
        const d0 = ns ? mainDoor.x1 : mainDoor.y1, d1 = ns ? mainDoor.x2 : mainDoor.y2;
        const [s0, s1] = d0 - a0 > a1 - d1 ? [a0, d0] : [d1, a1];
        const ww = Math.min(w, s1 - s0 - 1.5);
        if (ww < 2.5) continue;
        const c = (s0 + s1) / 2;
        pos = ns ? { x1: c - ww / 2, y1: seg.y1, x2: c + ww / 2, y2: seg.y1 } : { x1: seg.x1, y1: c - ww / 2, x2: seg.x1, y2: c + ww / 2 };
      }
      if (pos) openings.push({ ...pos, a: room.id, b: "out", kind: small ? "ventilator" : "window" });
    }
  }
  return { openings, unreachable, mainDoor, mainInStretch, mainNearStretch };
}

function overlaps(p: { x1: number; y1: number; x2: number; y2: number }, q: { x1: number; y1: number; x2: number; y2: number }) {
  const sameLine = Math.abs(p.x1 - p.x2) < 0.01 ? Math.abs(p.x1 - q.x1) < 0.01 && Math.abs(q.x1 - q.x2) < 0.01 : Math.abs(p.y1 - q.y1) < 0.01 && Math.abs(q.y1 - q.y2) < 0.01;
  if (!sameLine) return false;
  const [a0, a1] = Math.abs(p.x1 - p.x2) < 0.01 ? [p.y1, p.y2] : [p.x1, p.x2];
  const [b0, b1] = Math.abs(q.x1 - q.x2) < 0.01 ? [q.y1, q.y2] : [q.x1, q.x2];
  return Math.min(a1, b1) - Math.max(a0, b0) > -0.5;
}
