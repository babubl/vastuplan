/**
 * Renders a floor plan as an SVG string, drawn in feet (1 unit = 1 ft) like an architect's drawing:
 * thick outer walls, thin partitions, door swings, glazed windows, furniture to scale,
 * dimension chains, a north arrow and the road.
 */
import { fmtFt } from "../engine/geometry";
import { ZONES } from "../engine/vastu";
import type { FloorPlan, Furniture, HouseDesign, Opening, Rect, Room, RoomType } from "../engine/types";

export interface RenderOptions { furniture?: boolean; vastuGrid?: boolean; dims?: boolean; services?: boolean; columns?: boolean; palette?: Partial<Record<RoomType, string>>; mono?: boolean }

const INK = "#1D2733";
const PAPER = "#FFFFFF";
const FILL: Record<RoomType, string> = {
  living: "#F1F2EC", dining: "#F3F3EE", kitchen: "#F4EEE4", utility: "#E8EEF0", master: "#EEF0F2", bedroom: "#EEF0F2",
  toilet: "#E4EDF1", dress: "#F0F1F2", pooja: "#F8F0D8", study: "#EDF1EC", stair: "#ECEDEC", parking: "#EFEFEE",
  store: "#EEEFEC", courtyard: "#E3EDDC", sitout: "#E9F0E6", lounge: "#F1F2EC", balcony: "#E9F0E6", passage: "#F6F6F3",
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const n = (v: number) => +v.toFixed(3);

function line(x1: number, y1: number, x2: number, y2: number, stroke: string, w: number, extra = "") {
  return `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${stroke}" stroke-width="${w}" ${extra}/>`;
}
function rect(r: Rect, attrs: string) { return `<rect x="${n(r.x)}" y="${n(r.y)}" width="${n(r.w)}" height="${n(r.h)}" ${attrs}/>`; }

export function door(o: Opening, rooms: Room[]): string {
  const vertical = Math.abs(o.x1 - o.x2) < 0.01;
  const len = vertical ? Math.abs(o.y2 - o.y1) : Math.abs(o.x2 - o.x1);
  let s = vertical ? line(o.x1, o.y1, o.x2, o.y2, PAPER, 0.85) : line(o.x1, o.y1, o.x2, o.y2, PAPER, 0.85);
  if (o.kind === "opening") return s;
  const into = rooms.find((r) => r.id === o.into);
  if (!into) return s;
  // direction into the room
  const c = { x: into.rect.x + into.rect.w / 2, y: into.rect.y + into.rect.h / 2 };
  const dir = vertical ? Math.sign(c.x - o.x1) || 1 : Math.sign(c.y - o.y1) || 1;
  const hx = o.x1, hy = o.y1; // hinge
  const leafEnd = vertical ? { x: hx + dir * len, y: hy } : { x: hx, y: hy + dir * len };
  const free = { x: o.x2, y: o.y2 };
  const sweep = vertical ? (dir > 0 ? 0 : 1) : (dir > 0 ? 1 : 0);
  s += line(hx, hy, leafEnd.x, leafEnd.y, INK, o.kind === "main" ? 0.14 : 0.09);
  s += `<path d="M ${n(leafEnd.x)} ${n(leafEnd.y)} A ${n(len)} ${n(len)} 0 0 ${sweep} ${n(free.x)} ${n(free.y)}" fill="none" stroke="${INK}" stroke-width="0.05" stroke-dasharray="0.25 0.18"/>`;
  return s;
}

export function windowMark(o: Opening): string {
  const vertical = Math.abs(o.x1 - o.x2) < 0.01;
  let s = line(o.x1, o.y1, o.x2, o.y2, PAPER, 0.7);
  const off = 0.16;
  if (vertical) { s += line(o.x1 - off, o.y1, o.x2 - off, o.y2, INK, 0.05) + line(o.x1 + off, o.y1, o.x2 + off, o.y2, INK, 0.05) + line(o.x1 - 0.36, o.y1, o.x1 + 0.36, o.y1, INK, 0.06) + line(o.x2 - 0.36, o.y2, o.x2 + 0.36, o.y2, INK, 0.06); }
  else { s += line(o.x1, o.y1 - off, o.x2, o.y2 - off, INK, 0.05) + line(o.x1, o.y1 + off, o.x2, o.y2 + off, INK, 0.05) + line(o.x1, o.y1 - 0.36, o.x1, o.y1 + 0.36, INK, 0.06) + line(o.x2, o.y2 - 0.36, o.x2, o.y2 + 0.36, INK, 0.06); }
  if (o.kind === "window") s += vertical ? line(o.x1, o.y1, o.x2, o.y2, INK, 0.03) : line(o.x1, o.y1, o.x2, o.y2, INK, 0.03);
  return s;
}

export function furnitureSvg(f: Furniture): string {
  const r = f.rect, st = `fill="#FFFFFF" stroke="#4A5560" stroke-width="0.06"`;
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  switch (f.kind) {
    case "bed": {
      // pillows at the head end
      const s = f.facing;
      let p = "";
      const pw = (s === "N" || s === "S" ? r.w : r.h) / 2 - 0.35;
      for (const k of [0, 1]) {
        const pr: Rect = s === "S" ? { x: r.x + 0.25 + k * (pw + 0.2), y: r.y + r.h - 1.3, w: pw, h: 0.95 }
          : s === "N" ? { x: r.x + 0.25 + k * (pw + 0.2), y: r.y + 0.35, w: pw, h: 0.95 }
          : s === "E" ? { x: r.x + r.w - 1.3, y: r.y + 0.25 + k * (pw + 0.2), w: 0.95, h: pw }
          : { x: r.x + 0.35, y: r.y + 0.25 + k * (pw + 0.2), w: 0.95, h: pw };
        p += rect(pr, `rx="0.2" ${st}`);
      }
      const fold: Rect = s === "S" ? { x: r.x, y: r.y + r.h * 0.18, w: r.w, h: 0.01 } : s === "N" ? { x: r.x, y: r.y + r.h * 0.82, w: r.w, h: 0.01 } : s === "E" ? { x: r.x + r.w * 0.18, y: r.y, w: 0.01, h: r.h } : { x: r.x + r.w * 0.82, y: r.y, w: 0.01, h: r.h };
      return rect(r, `rx="0.25" ${st}`) + p + rect(fold, `fill="none" stroke="#4A5560" stroke-width="0.05"`);
    }
    case "sofa": {
      const back = 0.7;
      const s = f.facing; // direction the sitter faces
      const backR: Rect = s === "N" ? { x: r.x, y: r.y + r.h - back, w: r.w, h: back } : s === "S" ? { x: r.x, y: r.y, w: r.w, h: back } : s === "E" ? { x: r.x, y: r.y, w: back, h: r.h } : { x: r.x + r.w - back, y: r.y, w: back, h: r.h };
      return rect(r, `rx="0.35" ${st}`) + rect(backR, `rx="0.25" ${st}`);
    }
    case "dining": {
      let chairs = "";
      const horiz = r.w >= r.h;
      const seats = r.w * r.h > 15 ? 3 : 2;
      for (let k = 0; k < seats; k++) {
        if (horiz) {
          const x = r.x + (r.w / seats) * (k + 0.5) - 0.7;
          chairs += rect({ x, y: r.y - 1.6, w: 1.4, h: 1.3 }, `rx="0.2" ${st}`) + rect({ x, y: r.y + r.h + 0.3, w: 1.4, h: 1.3 }, `rx="0.2" ${st}`);
        } else {
          const y = r.y + (r.h / seats) * (k + 0.5) - 0.7;
          chairs += rect({ x: r.x - 1.6, y, w: 1.3, h: 1.4 }, `rx="0.2" ${st}`) + rect({ x: r.x + r.w + 0.3, y, w: 1.3, h: 1.4 }, `rx="0.2" ${st}`);
        }
      }
      return chairs + rect(r, `rx="0.3" ${st}`);
    }
    case "hob": return rect(r, `fill="#FFFFFF" stroke="#4A5560" stroke-width="0.05"`) + [0.28, 0.72].map((fy) => `<circle cx="${n(cx)}" cy="${n(r.y + r.h * fy)}" r="${n(Math.min(r.w, r.h) * 0.26)}" fill="none" stroke="#4A5560" stroke-width="0.05"/>`).join("");
    case "sink": return rect(r, `rx="0.25" fill="#EEF3F5" stroke="#4A5560" stroke-width="0.05"`);
    case "wc": return `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(r.w / 2.3)}" ry="${n(r.h / 2.3)}" ${st}/>`;
    case "basin": return `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(r.w / 2.2)}" ry="${n(r.h / 2.2)}" ${st}/>`;
    case "shower": return rect(r, `fill="none" stroke="#4A5560" stroke-width="0.05" stroke-dasharray="0.2 0.15"`) + line(r.x, r.y, r.x + r.w, r.y + r.h, "#4A5560", 0.03) + line(r.x + r.w, r.y, r.x, r.y + r.h, "#4A5560", 0.03);
    case "car": return rect(r, `rx="1" fill="#FFFFFF" stroke="#4A5560" stroke-width="0.07"`) + (r.h > r.w ? rect({ x: r.x + 0.5, y: r.y + r.h * 0.3, w: r.w - 1, h: r.h * 0.35 }, `rx="0.5" fill="none" stroke="#4A5560" stroke-width="0.05"`) : rect({ x: r.x + r.w * 0.3, y: r.y + 0.5, w: r.w * 0.35, h: r.h - 1 }, `rx="0.5" fill="none" stroke="#4A5560" stroke-width="0.05"`));
    case "stairs": {
      // Dog-legged stair: two flights along the long side with a landing at the far end.
      const long = r.h >= r.w;
      const landing = 3.25;
      let s = "";
      const run = (long ? r.h : r.w) - landing;
      const treads = Math.max(6, Math.round(run / 0.85));
      if (long) {
        s += line(r.x + r.w / 2, r.y + landing, r.x + r.w / 2, r.y + r.h, "#4A5560", 0.06) + line(r.x, r.y + landing, r.x + r.w, r.y + landing, "#4A5560", 0.05);
        for (let k = 1; k < treads; k++) { const y = r.y + landing + (run / treads) * k; s += line(r.x + 0.2, y, r.x + r.w - 0.2, y, "#8C96A0", 0.03); }
        s += `<path d="M ${n(r.x + r.w * 0.25)} ${n(r.y + r.h - 0.6)} L ${n(r.x + r.w * 0.25)} ${n(r.y + 1.6)} L ${n(r.x + r.w * 0.75)} ${n(r.y + 1.6)} L ${n(r.x + r.w * 0.75)} ${n(r.y + r.h - 1.6)}" fill="none" stroke="${INK}" stroke-width="0.06" marker-end="url(#arrow)"/>`;
      } else {
        s += line(r.x + landing, r.y + r.h / 2, r.x + r.w, r.y + r.h / 2, "#4A5560", 0.06) + line(r.x + landing, r.y, r.x + landing, r.y + r.h, "#4A5560", 0.05);
        for (let k = 1; k < treads; k++) { const x = r.x + landing + (run / treads) * k; s += line(x, r.y + 0.2, x, r.y + r.h - 0.2, "#8C96A0", 0.03); }
        s += `<path d="M ${n(r.x + r.w - 0.6)} ${n(r.y + r.h * 0.75)} L ${n(r.x + 1.6)} ${n(r.y + r.h * 0.75)} L ${n(r.x + 1.6)} ${n(r.y + r.h * 0.25)} L ${n(r.x + r.w - 1.6)} ${n(r.y + r.h * 0.25)}" fill="none" stroke="${INK}" stroke-width="0.06" marker-end="url(#arrow)"/>`;
      }
      return s;
    }
    case "planter": return `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r.w / 2)}" fill="#E3ECD9" stroke="#6E8460" stroke-width="0.05"/>`;
    case "chair": return rect(r, `rx="0.35" ${st}`);
    case "table": return rect(r, `rx="0.2" ${st}`);
    case "altar": return rect(r, `fill="#F7E7B5" stroke="#8A6D2B" stroke-width="0.06"`) + `<circle cx="${n(cx)}" cy="${n(cy)}" r="0.3" fill="#C98A1B"/>`;
    default: return rect(r, `rx="0.1" ${st}`);
  }
}

function dimChain(x1: number, y1: number, x2: number, y2: number, label: string, vertical: boolean): string {
  const tick = 0.45;
  let s = line(x1, y1, x2, y2, "#6C7782", 0.05);
  s += vertical ? line(x1 - tick, y1 + tick, x1 + tick, y1 - tick, "#6C7782", 0.07) + line(x2 - tick, y2 + tick, x2 + tick, y2 - tick, "#6C7782", 0.07)
    : line(x1 - tick, y1 + tick, x1 + tick, y1 - tick, "#6C7782", 0.07) + line(x2 - tick, y2 + tick, x2 + tick, y2 - tick, "#6C7782", 0.07);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  s += vertical
    ? `<text x="${n(mx - 0.5)}" y="${n(my)}" font-size="0.95" fill="#3F4B57" text-anchor="middle" transform="rotate(-90 ${n(mx - 0.5)} ${n(my)})">${label}</text>`
    : `<text x="${n(mx)}" y="${n(my - 0.5)}" font-size="0.95" fill="#3F4B57" text-anchor="middle">${label}</text>`;
  return s;
}

const SHORT: Record<string, string> = { "Common toilet": "Toilet", "Master bedroom": "Master bed", "Parents' bedroom": "Parents' bed", "Car parking": "Parking", "Family lounge": "Lounge", "Open terrace": "Terrace", Staircase: "Stair", Utility: "Util." };
const textW = (t: string, fs: number) => t.length * fs * 0.64;

/** The largest label that fits the room: full name, then a short name, then a smaller font. */
function fitLabel(label: string, width: number, fs: number): { text: string; fs: number } | null {
  for (const t of [label, SHORT[label] ?? (label.startsWith("Bedroom ") ? label.replace("Bedroom ", "Bed ") : label)]) {
    if (textW(t, fs) <= width) return { text: t, fs };
    const smaller = width / (t.length * 0.64);
    if (smaller >= 0.55) return { text: t, fs: Math.min(fs, smaller) };
  }
  return null;
}

export function planViewBox(d: HouseDesign): Rect {
  const { plot } = d;
  const facing = d.input.facing;
  const pad = 4.5, road = 5;
  return { x: plot.x - pad - (facing === "W" ? road : 0), y: plot.y - pad - (facing === "N" ? road : 0), w: plot.w + 2 * pad + (facing === "E" || facing === "W" ? road : 0), h: plot.h + 2 * pad + (facing === "N" || facing === "S" ? road : 0) };
}

export function renderPlanSvg(d: HouseDesign, floor: FloorPlan, opt: RenderOptions = {}): string {
  const { plot, footprint: fp } = d;
  const facing = d.input.facing;
  const road = 5;
  const vb = planViewBox(d);
  const p: string[] = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(vb.x)} ${n(vb.y)} ${n(vb.w)} ${n(vb.h)}" font-family="'Archivo Variable', Archivo, 'Helvetica Neue', Arial, sans-serif">`);
  p.push(`<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${INK}"/></marker>
    <pattern id="hatch" width="0.6" height="0.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="0.6" stroke="#C6CDD3" stroke-width="0.08"/></pattern></defs>`);
  p.push(rect(vb, `fill="${PAPER}"`));

  // Road
  const roadR: Rect = facing === "N" ? { x: vb.x, y: vb.y, w: vb.w, h: road } : facing === "S" ? { x: vb.x, y: vb.y + vb.h - road, w: vb.w, h: road } : facing === "E" ? { x: vb.x + vb.w - road, y: vb.y, w: road, h: vb.h } : { x: vb.x, y: vb.y, w: road, h: vb.h };
  p.push(rect(roadR, `fill="#E4E7EA"`));
  const rc = { x: roadR.x + roadR.w / 2, y: roadR.y + roadR.h / 2 };
  p.push(`<text x="${n(rc.x)}" y="${n(rc.y + 0.4)}" font-size="1.2" letter-spacing="0.6" fill="#7C8690" text-anchor="middle" ${facing === "E" || facing === "W" ? `transform="rotate(-90 ${n(rc.x)} ${n(rc.y)})"` : ""}>ROAD</text>`);

  // Plot boundary and open space
  p.push(rect(plot, `fill="#F4F5F2" stroke="#8A949E" stroke-width="0.12" stroke-dasharray="0.8 0.4"`));
  p.push(`<text x="${n(plot.x + 0.6)}" y="${n(plot.y + plot.h - 0.7)}" font-size="0.85" fill="#8A949E">Plot ${fmtFt(d.input.plotWidth)} × ${fmtFt(d.input.plotDepth)}</text>`);

  // Vastu grid
  if (opt.vastuGrid) {
    const zones = ["NW", "N", "NE", "W", "C", "E", "SW", "S", "SE"] as const;
    zones.forEach((z, k) => {
      const zr: Rect = { x: fp.x + (fp.w / 3) * (k % 3), y: fp.y + (fp.h / 3) * Math.floor(k / 3), w: fp.w / 3, h: fp.h / 3 };
      p.push(rect(zr, `fill="${ZONES[z].colours[0].hex}" fill-opacity="0.45" stroke="#C98F12" stroke-width="0.06" stroke-dasharray="0.4 0.3"`));
    });
  }

  // Rooms
  for (const r of floor.rooms) {
    const fill = opt.palette?.[r.type] ?? FILL[r.type];
    p.push(rect(r.rect, `fill="${opt.vastuGrid ? "none" : r.open ? "url(#hatch)" : fill}" ${opt.vastuGrid ? "" : `fill-opacity="${r.open ? 1 : 0.95}"`}`));
  }
  // Partitions then outer walls
  for (const r of floor.rooms) p.push(rect(r.rect, `fill="none" stroke="${INK}" stroke-width="0.375"`));
  p.push(rect(fp, `fill="none" stroke="${INK}" stroke-width="0.75"`));
  // Open edges of parking, sit-outs and balconies on the outside
  for (const r of floor.rooms.filter((x) => x.open)) {
    const R = r.rect;
    const edges = [
      [R.x, R.y, R.x + R.w, R.y, Math.abs(R.y - fp.y) < 0.01],
      [R.x, R.y + R.h, R.x + R.w, R.y + R.h, Math.abs(R.y + R.h - fp.y - fp.h) < 0.01],
      [R.x, R.y, R.x, R.y + R.h, Math.abs(R.x - fp.x) < 0.01],
      [R.x + R.w, R.y, R.x + R.w, R.y + R.h, Math.abs(R.x + R.w - fp.x - fp.w) < 0.01],
    ] as const;
    for (const [x1, y1, x2, y2, ext] of edges) if (ext) p.push(line(x1 + (x1 === x2 ? 0 : 0.4), y1 + (y1 === y2 ? 0 : 0.4), x2 - (x1 === x2 ? 0 : 0.4), y2 - (y1 === y2 ? 0 : 0.4), PAPER, 0.85) + line(x1, y1, x2, y2, INK, 0.06, `stroke-dasharray="0.5 0.3"`));
  }

  // Openings
  for (const o of floor.openings) p.push(o.kind === "window" || o.kind === "ventilator" ? windowMark(o) : door(o, floor.rooms));

  // Furniture
  if (opt.furniture !== false) for (const f of floor.furniture) p.push(furnitureSvg(f));

  // Structural columns, 9" x 12"
  if (opt.columns && floor.columns) for (const c of floor.columns) p.push(rect({ x: c.x - 0.375, y: c.y - 0.5, w: 0.75, h: 1 }, `fill="${INK}"`));

  // Garden in open land wider than 8 ft
  {
    const strips: Rect[] = [
      { x: plot.x, y: plot.y, w: plot.w, h: fp.y - plot.y },
      { x: plot.x, y: fp.y + fp.h, w: plot.w, h: plot.y + plot.h - fp.y - fp.h },
      { x: plot.x, y: fp.y, w: fp.x - plot.x, h: fp.h },
      { x: fp.x + fp.w, y: fp.y, w: plot.x + plot.w - fp.x - fp.w, h: fp.h },
    ];
    for (const st of strips) {
      if (Math.min(st.w, st.h) < 8) continue;
      const trees = Math.max(1, Math.floor(Math.max(st.w, st.h) / 14));
      for (let k = 0; k < trees; k++) {
        const t = (k + 0.5) / trees;
        const cx = st.w > st.h ? st.x + st.w * t : st.x + st.w * 0.3;
        const cy = st.w > st.h ? st.y + st.h * 0.3 : st.y + st.h * t;
        p.push(`<circle cx="${n(cx)}" cy="${n(cy)}" r="1.6" fill="#DCE6D3" stroke="#7E9771" stroke-width="0.06"/><circle cx="${n(cx)}" cy="${n(cy)}" r="0.15" fill="#7E9771"/>`);
      }
      p.push(`<text x="${n(st.x + st.w / 2)}" y="${n(st.y + st.h * (st.w > st.h ? 0.72 : 0.5))}" font-size="0.9" fill="#6E8460" text-anchor="middle" letter-spacing="0.2">Garden</text>`);
    }
  }

  // Site services: sump, borewell, septic, rainwater pit; overhead tank on the top floor
  if (opt.services && d.services) {
    const top = floor.level === d.floors.length - 1;
    for (const sv of d.services) {
      if (sv.onRoof ? !top : floor.level !== 0) continue;
      const col = sv.kind === "septic" ? "#8A6B3A" : sv.kind === "tank" ? "#2E3A87" : "#2C7DA0";
      if (sv.onRoof) p.push(rect({ x: sv.x - sv.r, y: sv.y - sv.r, w: sv.r * 2, h: sv.r * 2 }, `fill="none" stroke="${col}" stroke-width="0.12" stroke-dasharray="0.4 0.25"`) + `<text x="${n(sv.x)}" y="${n(sv.y + 0.3)}" font-size="0.65" fill="${col}" text-anchor="middle" font-weight="600">OHT</text>`);
      else if (sv.kind === "septic") p.push(rect({ x: sv.x - sv.r, y: sv.y - sv.r * 0.7, w: sv.r * 2, h: sv.r * 1.4 }, `fill="#F4EEE4" stroke="${col}" stroke-width="0.1"`) + `<text x="${n(sv.x)}" y="${n(sv.y + 0.25)}" font-size="0.6" fill="${col}" text-anchor="middle" font-weight="600">${sv.label}</text>`);
      else p.push(`<circle cx="${n(sv.x)}" cy="${n(sv.y)}" r="${n(sv.r)}" fill="#EAF3F7" stroke="${col}" stroke-width="0.1"/><text x="${n(sv.x)}" y="${n(sv.y + 0.25)}" font-size="${sv.r < 1 ? 0.45 : 0.6}" fill="${col}" text-anchor="middle" font-weight="600">${sv.label}</text>`);
    }
  }

  // Labels
  for (const r of floor.rooms) {
    const R = r.rect;
    const small = Math.min(R.w, R.h) < 5.5;
    const fs = small ? 0.72 : 1.0;
    const furn = floor.furniture.filter((f) => f.room === r.id && f.kind !== "stairs");
    // put the label where the room is emptiest: centre, or above/below the furniture
    let ly = R.y + R.h / 2;
    const clash = furn.some((f) => Math.abs(f.rect.y + f.rect.h / 2 - ly) < f.rect.h / 2 + 1 && Math.abs(f.rect.x + f.rect.w / 2 - (R.x + R.w / 2)) < f.rect.w / 2 + 2);
    if (clash && opt.furniture !== false) {
      const topFree = Math.min(...furn.map((f) => f.rect.y)) - R.y;
      const botFree = R.y + R.h - Math.max(...furn.map((f) => f.rect.y + f.rect.h));
      ly = topFree >= botFree ? R.y + Math.max(1.6, topFree / 2 + 0.4) : R.y + R.h - Math.max(1.4, botFree / 2);
    }
    const halo = `paint-order="stroke" stroke="${PAPER}" stroke-width="0.35" stroke-linejoin="round"`;
    const fit = fitLabel(r.type === "stair" ? "Stair" : r.label, R.w - 0.7, fs);
    if (fit && R.h >= 2.5) {
      p.push(`<text x="${n(R.x + R.w / 2)}" y="${n(ly)}" font-size="${n(fit.fs)}" font-weight="600" letter-spacing="0.06" fill="${INK}" text-anchor="middle" ${halo}>${esc(fit.text.toUpperCase())}</text>`);
      const dimTxt = `${fmtFt(R.w)} × ${fmtFt(R.h)}`;
      if (!small && opt.dims !== false && r.type !== "passage" && dimTxt.length * 0.82 * 0.55 < R.w - 0.6) p.push(`<text x="${n(R.x + R.w / 2)}" y="${n(ly + 1.15)}" font-size="0.82" fill="#56616C" text-anchor="middle" ${halo}>${dimTxt}</text>`);
    }
  }

  // Main entrance marker
  const main = floor.openings.find((o) => o.kind === "main");
  if (main) {
    const mx = (main.x1 + main.x2) / 2, my = (main.y1 + main.y2) / 2;
    const off = 2.2;
    const [tx, ty] = facing === "N" ? [mx, my - off] : facing === "S" ? [mx, my + off + 0.8] : facing === "E" ? [mx + off + 1.4, my + 0.3] : [mx - off - 1.4, my + 0.3];
    p.push(`<text x="${n(tx)}" y="${n(ty)}" font-size="0.9" font-weight="700" letter-spacing="0.3" fill="#2E3A87" text-anchor="middle">ENTRY</text>`);
  }

  // Dimensions of the house
  if (opt.dims !== false) {
    const hy = facing === "N" ? fp.y + fp.h + 2.6 : fp.y - 2.6;
    const vx = facing === "W" ? fp.x + fp.w + 2.6 : fp.x - 2.6;
    p.push(dimChain(fp.x, hy, fp.x + fp.w, hy, fmtFt(fp.w), false));
    p.push(dimChain(vx, fp.y, vx, fp.y + fp.h, fmtFt(fp.h), true));
  }

  // North arrow
  const na = { x: facing === "E" ? vb.x + 3.2 : vb.x + vb.w - 3.2, y: facing === "N" ? vb.y + road + 3.4 : vb.y + 3.4 };
  p.push(`<g><circle cx="${n(na.x)}" cy="${n(na.y)}" r="1.9" fill="none" stroke="${INK}" stroke-width="0.07"/><path d="M ${n(na.x)} ${n(na.y - 1.6)} L ${n(na.x + 0.7)} ${n(na.y + 0.9)} L ${n(na.x)} ${n(na.y + 0.45)} L ${n(na.x - 0.7)} ${n(na.y + 0.9)} Z" fill="${INK}"/><text x="${n(na.x)}" y="${n(na.y - 2.3)}" font-size="1" font-weight="700" text-anchor="middle" fill="${INK}">N</text></g>`);
  // Scale bar (10 ft)
  const sb = { x: facing === "W" ? vb.x + road + 1.2 : vb.x + 1.2, y: facing === "S" ? vb.y + vb.h - road - 1.2 : vb.y + vb.h - 1.2 };
  p.push(rect({ x: sb.x, y: sb.y - 0.25, w: 5, h: 0.25 }, `fill="${INK}"`) + rect({ x: sb.x + 5, y: sb.y - 0.25, w: 5, h: 0.25 }, `fill="none" stroke="${INK}" stroke-width="0.05"`) + `<text x="${n(sb.x)}" y="${n(sb.y - 0.6)}" font-size="0.8" fill="${INK}">0</text><text x="${n(sb.x + 10)}" y="${n(sb.y - 0.6)}" font-size="0.8" fill="${INK}" text-anchor="middle">10 ft</text>`);
  p.push(`</svg>`);
  return p.join("");
}

/** A single furnished room, for the apartment planner. */
export function renderRoomSvg(room: Room, openings: Opening[], furniture: Furniture[]): string {
  const r = room.rect, pad = 1.6;
  const p: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(r.x - pad)} ${n(r.y - pad)} ${n(r.w + 2 * pad)} ${n(r.h + 2 * pad)}" font-family="'Archivo Variable', Archivo, Arial, sans-serif">`];
  p.push(rect(r, `fill="${FILL[room.type]}" stroke="${INK}" stroke-width="0.5"`));
  for (const o of openings) p.push(o.kind === "window" || o.kind === "ventilator" ? windowMark(o) : door(o, [room]));
  for (const f of furniture) p.push(furnitureSvg(f));
  p.push(`</svg>`);
  return p.join("");
}
