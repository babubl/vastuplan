import type { Facing, Rect, Zone } from "./types";

export const EPS = 0.01;
export const area = (r: Rect) => r.w * r.h;
export const round = (n: number, step = 0.25) => Math.round(n / step) * step;

/** Which of the nine Vastu zones a point falls in, relative to a frame (the house footprint). */
export function zoneAt(px: number, py: number, frame: Rect): Zone {
  const fx = (px - frame.x) / frame.w;
  const fy = (py - frame.y) / frame.h;
  const col = fx < 1 / 3 ? "W" : fx > 2 / 3 ? "E" : "";
  const row = fy < 1 / 3 ? "N" : fy > 2 / 3 ? "S" : "";
  return ((row + col) || "C") as Zone;
}

export const zoneOf = (r: Rect, frame: Rect): Zone => zoneAt(r.x + r.w / 2, r.y + r.h / 2, frame);

/** Fraction of a rectangle lying in the central Brahmasthan (middle ninth) of a frame. */
export function centreOverlap(r: Rect, frame: Rect): number {
  const c: Rect = { x: frame.x + frame.w / 3, y: frame.y + frame.h / 3, w: frame.w / 3, h: frame.h / 3 };
  const ox = Math.max(0, Math.min(r.x + r.w, c.x + c.w) - Math.max(r.x, c.x));
  const oy = Math.max(0, Math.min(r.y + r.h, c.y + c.h) - Math.max(r.y, c.y));
  return (ox * oy) / area(r);
}

export interface Segment { x1: number; y1: number; x2: number; y2: number; length: number; vertical: boolean }

/** The wall two rectangles share, if any. */
export function sharedWall(a: Rect, b: Rect): Segment | null {
  const near = (p: number, q: number) => Math.abs(p - q) < EPS;
  // vertical walls
  for (const [xa, xb] of [[a.x + a.w, b.x], [a.x, b.x + b.w]] as const) {
    if (near(xa, xb)) {
      const y1 = Math.max(a.y, b.y), y2 = Math.min(a.y + a.h, b.y + b.h);
      if (y2 - y1 > EPS) return { x1: xa, y1, x2: xa, y2, length: y2 - y1, vertical: true };
    }
  }
  for (const [ya, yb] of [[a.y + a.h, b.y], [a.y, b.y + b.h]] as const) {
    if (near(ya, yb)) {
      const x1 = Math.max(a.x, b.x), x2 = Math.min(a.x + a.w, b.x + b.w);
      if (x2 - x1 > EPS) return { x1, y1: ya, x2, y2: ya, length: x2 - x1, vertical: false };
    }
  }
  return null;
}

export type Side = "N" | "E" | "S" | "W";

/** Edges of a rectangle that lie on the frame's outer boundary. */
export function exteriorEdges(r: Rect, frame: Rect): { side: Side; seg: Segment }[] {
  const out: { side: Side; seg: Segment }[] = [];
  const near = (p: number, q: number) => Math.abs(p - q) < EPS;
  if (near(r.y, frame.y)) out.push({ side: "N", seg: { x1: r.x, y1: r.y, x2: r.x + r.w, y2: r.y, length: r.w, vertical: false } });
  if (near(r.y + r.h, frame.y + frame.h)) out.push({ side: "S", seg: { x1: r.x, y1: r.y + r.h, x2: r.x + r.w, y2: r.y + r.h, length: r.w, vertical: false } });
  if (near(r.x, frame.x)) out.push({ side: "W", seg: { x1: r.x, y1: r.y, x2: r.x, y2: r.y + r.h, length: r.h, vertical: true } });
  if (near(r.x + r.w, frame.x + frame.w)) out.push({ side: "E", seg: { x1: r.x + r.w, y1: r.y, x2: r.x + r.w, y2: r.y + r.h, length: r.h, vertical: true } });
  return out;
}

/**
 * Local frame used while laying out: u runs along the road frontage, v runs from the front
 * (road side) to the rear. Converting to compass coordinates depends on which way the plot faces.
 */
export interface LocalFrame { facing: Facing; fp: Rect; frontage: number; depth: number }

export function localFrame(facing: Facing, fp: Rect): LocalFrame {
  const ns = facing === "N" || facing === "S";
  return { facing, fp, frontage: ns ? fp.w : fp.h, depth: ns ? fp.h : fp.w };
}

/** Local rectangle (u, v, along-frontage width, depth) to compass rectangle. */
export function toCompass(f: LocalFrame, u: number, v: number, w: number, d: number): Rect {
  const { fp } = f;
  switch (f.facing) {
    case "N": return { x: fp.x + u, y: fp.y + v, w, h: d };
    case "S": return { x: fp.x + u, y: fp.y + fp.h - v - d, w, h: d };
    case "E": return { x: fp.x + fp.w - v - d, y: fp.y + u, w: d, h: w };
    case "W": return { x: fp.x + v, y: fp.y + u, w: d, h: w };
  }
}

/** Display unit for lengths and areas. The engine always works in feet; this only changes labels. */
let unit: "ft" | "m" = "ft";
export const setDisplayUnit = (u: "ft" | "m") => { unit = u; };
export const displayUnit = () => unit;
export const FT_PER_M = 1 / 0.3048;
export const SQFT_PER_SQM = 10.7639;
/** Area label in the current unit, e.g. "1,240 sq ft" or "115 m²". */
export const fmtArea = (sqft: number) => unit === "m" ? `${Math.round(sqft / SQFT_PER_SQM).toLocaleString("en-IN")} m²` : `${Math.round(sqft).toLocaleString("en-IN")} sq ft`;
export const fmtFt = (ft: number) => {
  if (unit === "m") return `${(ft * 0.3048).toFixed(2)} m`;
  const whole = Math.floor(ft + 1e-6);
  const inches = Math.round((ft - whole) * 12);
  return inches === 12 ? `${whole + 1}'` : inches ? `${whole}'${inches}"` : `${whole}'`;
};
