/** Wall lines of a floor (merged, with exterior walls marked) and the openings on each. */
import type { Opening, Rect, Room } from "../engine/types";

export interface Seg { horizontal: boolean; at: number; a: number; b: number; outer: boolean }

/** Every wall line as merged intervals, with exterior walls marked. */
export function wallSegments(rooms: Room[], fp: Rect): Seg[] {
  const key = (h: boolean, at: number) => `${h ? "h" : "v"}${at.toFixed(2)}`;
  const lines = new Map<string, { horizontal: boolean; at: number; iv: [number, number][] }>();
  const add = (h: boolean, at: number, a: number, b: number) => {
    const k = key(h, at);
    if (!lines.has(k)) lines.set(k, { horizontal: h, at, iv: [] });
    lines.get(k)!.iv.push([Math.min(a, b), Math.max(a, b)]);
  };
  const near = (p: number, q: number) => Math.abs(p - q) < 0.01;
  for (const r of rooms) {
    const R = r.rect;
    const edges: [boolean, number, number, number, boolean][] = [
      [true, R.y, R.x, R.x + R.w, near(R.y, fp.y)],
      [true, R.y + R.h, R.x, R.x + R.w, near(R.y + R.h, fp.y + fp.h)],
      [false, R.x, R.y, R.y + R.h, near(R.x, fp.x)],
      [false, R.x + R.w, R.y, R.y + R.h, near(R.x + R.w, fp.x + fp.w)],
    ];
    for (const [h, at, a, b, ext] of edges) {
      if (ext && r.open) continue; // open side of parking, sit-out or balcony
      add(h, at, a, b);
    }
  }
  const out: Seg[] = [];
  for (const l of lines.values()) {
    l.iv.sort((p, q) => p[0] - q[0]);
    let [a, b] = l.iv[0];
    const outer = l.horizontal ? near(l.at, fp.y) || near(l.at, fp.y + fp.h) : near(l.at, fp.x) || near(l.at, fp.x + fp.w);
    for (const [c, d] of l.iv.slice(1)) { if (c <= b + 0.01) b = Math.max(b, d); else { out.push({ horizontal: l.horizontal, at: l.at, a, b, outer }); [a, b] = [c, d]; } }
    out.push({ horizontal: l.horizontal, at: l.at, a, b, outer });
  }
  return out;
}

export function openingsOn(seg: Seg, openings: Opening[]): { a: number; b: number; kind: Opening["kind"] }[] {
  return openings
    .filter((o) => (seg.horizontal ? Math.abs(o.y1 - seg.at) < 0.02 && Math.abs(o.y2 - seg.at) < 0.02 : Math.abs(o.x1 - seg.at) < 0.02 && Math.abs(o.x2 - seg.at) < 0.02))
    .map((o) => ({ a: seg.horizontal ? Math.min(o.x1, o.x2) : Math.min(o.y1, o.y2), b: seg.horizontal ? Math.max(o.x1, o.x2) : Math.max(o.y1, o.y2), kind: o.kind }))
    .filter((o) => o.b > seg.a && o.a < seg.b)
    .sort((p, q) => p.a - q.a);
}

