/**
 * Axonometric line drawing of a floor, in the style architects use for presentation:
 * walls extruded with real door and window openings, floors toned by use, furniture as volumes.
 * Pure SVG (no WebGL), so it renders instantly, prints crisply and works everywhere.
 *
 * The house is turned so the road side faces the viewer, seen from the front-right.
 */
import type { FloorPlan, HouseDesign, Rect, RoomType } from "../engine/types";
import { openingsOn, wallSegments } from "./walls";

interface Box { x: number; y: number; z: number; w: number; d: number; h: number; top: string; south: string; east: string; stroke?: string; sw?: number }

const COS = Math.cos(Math.PI / 6), SIN = Math.sin(Math.PI / 6);

const FLOOR: Partial<Record<RoomType, string>> = {
  living: "#EFEDE7", dining: "#F2F0EA", lounge: "#EFEDE7", kitchen: "#ECE6DC", master: "#E9E4DA", bedroom: "#E9E4DA", study: "#E9E4DA",
  toilet: "#DFE6E9", utility: "#DFE6E9", dress: "#E9E4DA", pooja: "#F1E6C6", stair: "#E4E4E1", parking: "#E2E2DF",
  sitout: "#E4EADF", balcony: "#E4EADF", courtyard: "#D9E4D2", passage: "#F2F0EA", store: "#E6E5E1",
};

const FURN_H: Record<string, number> = { bed: 1.8, side: 1.7, wardrobe: 7, desk: 2.5, sofa: 2.5, table: 1.4, tv: 1.8, chair: 2.4, dining: 2.5, crockery: 3, counter: 2.8, fridge: 6, wc: 1.4, basin: 2.7, altar: 3, shelf: 6, car: 4.5, washer: 2.8, planter: 2 };

export interface AxonOptions { wallHeight?: number; furniture?: boolean; stroke?: string; ink?: string; showLabels?: boolean; site?: boolean }

export function renderAxonSvg(d: HouseDesign, floor: FloorPlan, opt: AxonOptions = {}): string {
  const H = opt.wallHeight ?? 9;
  const ink = opt.ink ?? "#141414";
  const facing = d.input.facing;
  const plot = d.plot;
  // Turn the plan so the road edge is at the bottom (towards the viewer).
  const turn = (x: number, y: number): [number, number] => {
    switch (facing) {
      case "S": return [x, y];
      case "N": return [plot.w - x, plot.h - y];
      case "E": return [plot.h - y, x];
      case "W": return [y, plot.w - x];
    }
  };
  const turnRect = (r: Rect): Rect => {
    const [ax, ay] = turn(r.x, r.y), [bx, by] = turn(r.x + r.w, r.y + r.h);
    return { x: Math.min(ax, bx), y: Math.min(ay, by), w: Math.abs(bx - ax), h: Math.abs(by - ay) };
  };
  const P = (x: number, y: number, z: number): [number, number] => [(x - y) * COS, (x + y) * SIN - z];

  const boxes: Box[] = [];
  const wallTop = "#FFFFFF", wallS = "#E7E7E4", wallE = "#D4D4D0";
  const fp = d.footprint;
  // walls, split into short pieces so the painter's sort stays correct
  for (const seg of wallSegments(floor.rooms, fp)) {
    const t = seg.outer ? 0.75 : 0.4;
    const pieces: [number, number, number, number][] = []; // a, b, z0, z1
    let cur = seg.a;
    for (const o of openingsOn(seg, floor.openings)) {
      pieces.push([cur, o.a, 0, H]);
      if (o.kind === "window" || o.kind === "ventilator") { pieces.push([o.a, o.b, 0, o.kind === "window" ? 3 : 5.5]); pieces.push([o.a, o.b, 7, H]); }
      else pieces.push([o.a, o.b, 7, H]);
      cur = Math.max(cur, o.b);
    }
    pieces.push([cur, seg.b, 0, H]);
    for (const [a, b, z0, z1] of pieces) {
      if (b - a < 0.05 || z1 - z0 < 0.05) continue;
      const r: Rect = seg.horizontal ? { x: a, y: seg.at - t / 2, w: b - a, h: t } : { x: seg.at - t / 2, y: a, w: t, h: b - a };
      const R = turnRect(r);
      boxes.push({ x: R.x, y: R.y, z: z0, w: R.w, d: R.h, h: z1 - z0, top: wallTop, south: wallS, east: wallE });
    }
  }
  // parapets on open edges
  for (const r of floor.rooms.filter((x) => x.open && x.type !== "parking" && x.type !== "courtyard")) {
    const near = (p: number, q: number) => Math.abs(p - q) < 0.01;
    const R = r.rect;
    const edges: Rect[] = [];
    if (near(R.y, fp.y)) edges.push({ x: R.x, y: R.y - 0.2, w: R.w, h: 0.4 });
    if (near(R.y + R.h, fp.y + fp.h)) edges.push({ x: R.x, y: R.y + R.h - 0.2, w: R.w, h: 0.4 });
    if (near(R.x, fp.x)) edges.push({ x: R.x - 0.2, y: R.y, w: 0.4, h: R.h });
    if (near(R.x + R.w, fp.x + fp.w)) edges.push({ x: R.x + R.w - 0.2, y: R.y, w: 0.4, h: R.h });
    for (const e of edges) { const T = turnRect(e); boxes.push({ x: T.x, y: T.y, z: 0, w: T.w, d: T.h, h: 3, top: wallTop, south: wallS, east: wallE }); }
  }
  if (opt.furniture !== false) {
    for (const f of floor.furniture) {
      const h0 = FURN_H[f.kind];
      if (!h0) continue;
      const h = Math.min(h0, H - 0.4);
      const R = turnRect(f.rect);
      const tone = f.kind === "bed" ? "#FAFAF8" : f.kind === "car" ? "#C9CCD0" : f.kind === "planter" ? "#B9CDB0" : "#F5F4F0";
      boxes.push({ x: R.x, y: R.y, z: 0.05, w: R.w, d: R.h, h, top: tone, south: "#E2E1DC", east: "#D0CFCA", stroke: "#6A6A66", sw: 0.05 });
    }
  }
  const ordered = depthOrder(boxes);

  // bounds
  const T = turnRect(plot);
  const corners = [P(T.x, T.y, 0), P(T.x + T.w, T.y, 0), P(T.x, T.y + T.h, 0), P(T.x + T.w, T.y + T.h, 0), P(T.x, T.y, H + 1), P(T.x + T.w, T.y + T.h, H + 1)];
  const xs = corners.map((c) => c[0]), ys = corners.map((c) => c[1]);
  const pad = 2;
  const vb = { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + 2 * pad, h: Math.max(...ys) - Math.min(...ys) + 2 * pad };
  const n = (v: number) => +v.toFixed(2);
  const poly = (pts: [number, number][], fill: string, stroke = ink, sw = 0.08) => `<polygon points="${pts.map(([a, b]) => `${n(a)},${n(b)}`).join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  const out: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(vb.x)} ${n(vb.y)} ${n(vb.w)} ${n(vb.h)}">`];

  // site: plot outline and road
  out.push(poly([P(T.x, T.y, 0), P(T.x + T.w, T.y, 0), P(T.x + T.w, T.y + T.h, 0), P(T.x, T.y + T.h, 0)], "#F3F3F0", "#9A9A96", 0.06));
  const road = { x: T.x - 6, y: T.y + T.h + 1, w: T.w + 12, h: 5 };
  out.push(poly([P(road.x, road.y, 0), P(road.x + road.w, road.y, 0), P(road.x + road.w, road.y + road.h, 0), P(road.x, road.y + road.h, 0)], "#E4E4E1", "none", 0));
  // floors
  for (const r of floor.rooms) {
    const R = turnRect(r.rect);
    out.push(poly([P(R.x, R.y, 0), P(R.x + R.w, R.y, 0), P(R.x + R.w, R.y + R.h, 0), P(R.x, R.y + R.h, 0)], FLOOR[r.type] ?? "#EEE", "#B8B8B4", 0.04));
  }
  for (const b of ordered) {
    const { x, y, z, w, d: dd, h } = b;
    const st = b.stroke ?? ink, sw = b.sw ?? 0.07;
    // south face (y + d), east face (x + w), top
    out.push(poly([P(x, y + dd, z), P(x + w, y + dd, z), P(x + w, y + dd, z + h), P(x, y + dd, z + h)], b.south, st, sw));
    out.push(poly([P(x + w, y, z), P(x + w, y + dd, z), P(x + w, y + dd, z + h), P(x + w, y, z + h)], b.east, st, sw));
    out.push(poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + dd, z + h), P(x, y + dd, z + h)], b.top, st, sw));
  }
  if (opt.showLabels) {
    for (const r of floor.rooms) {
      if (r.open || r.type === "passage" || r.type === "store" || r.type === "dress" || Math.min(r.rect.w, r.rect.h) < 6) continue;
      const R = turnRect(r.rect);
      const [lx, ly] = P(R.x + R.w / 2, R.y + R.h / 2, H + 0.2);
      out.push(`<text x="${n(lx)}" y="${n(ly)}" font-size="1.1" font-family="'Archivo Variable', Archivo, Arial, sans-serif" font-weight="600" text-anchor="middle" fill="${ink}" paint-order="stroke" stroke="#FFFFFF" stroke-width="0.35">${r.label}</text>`);
    }
  }
  out.push("</svg>");
  return out.join("");
}

/**
 * Drawing order for axis-aligned boxes seen from the south-east: a box must be drawn before any box
 * in front of it (further south or east, or above it). Topological sort over that relation.
 */
function depthOrder(boxes: Box[]): Box[] {
  const e = 0.01;
  const behind = (a: Box, b: Box) => {
    const xo = a.x < b.x + b.w - e && b.x < a.x + a.w - e;
    const yo = a.y < b.y + b.d - e && b.y < a.y + a.d - e;
    if (a.x + a.w <= b.x + e && (yo || a.y < b.y + b.d)) return true; // a west of b
    if (a.y + a.d <= b.y + e && (xo || a.x < b.x + b.w)) return true; // a north of b
    if (xo && yo) return a.z + a.h <= b.z + e; // stacked
    return false;
  };
  const n = boxes.length;
  const indeg = new Array(n).fill(0);
  const adj: number[][] = boxes.map(() => []);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j && behind(boxes[i], boxes[j]) && !behind(boxes[j], boxes[i])) { adj[i].push(j); indeg[j]++; }
  const key = (b: Box) => b.x + b.w / 2 + b.y + b.d / 2 + b.z * 0.01;
  const ready = boxes.map((_, i) => i).filter((i) => indeg[i] === 0).sort((a, b) => key(boxes[a]) - key(boxes[b]));
  const out: Box[] = [];
  const done = new Array(n).fill(false);
  while (out.length < n) {
    let i = ready.shift();
    if (i === undefined) { // a cycle: fall back to the nearest remaining box
      i = boxes.map((_, k) => k).filter((k) => !done[k]).sort((a, b) => key(boxes[a]) - key(boxes[b]))[0];
    }
    if (done[i]) continue;
    done[i] = true;
    out.push(boxes[i]);
    for (const j of adj[i]) if (--indeg[j] === 0 && !done[j]) { ready.push(j); ready.sort((a, b) => key(boxes[a]) - key(boxes[b])); }
  }
  return out;
}
