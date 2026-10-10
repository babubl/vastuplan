/**
 * Builds a three.js model of a floor: floor finishes, walls with real door and window openings,
 * and furniture at true heights. Units are feet; x = east, z = south, y = up.
 */
import * as THREE from "three";
import type { FloorPlan, Furniture, HouseDesign, Rect } from "../engine/types";
import { floorColour, type InteriorStyle } from "../engine/interior";
import { openingsOn, wallSegments } from "./walls";

const WALL_H = 10;
const DOOR_H = 7;
const SILL = 3;
const WIN_H = 7;
const VENT_SILL = 5;

const mat = (color: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts });

function box(w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material): THREE.Mesh {
  const g = new THREE.BoxGeometry(Math.max(0.01, w), Math.max(0.01, h), Math.max(0.01, d));
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x + w / 2, y + h / 2, z + d / 2);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

const FURN_H: Record<string, number> = { bed: 1.9, side: 1.8, wardrobe: 7, desk: 2.5, sofa: 2.6, table: 1.4, tv: 1.8, chair: 2.6, dining: 2.5, crockery: 3, counter: 2.8, hob: 2.95, sink: 2.9, fridge: 6, wc: 1.4, basin: 2.7, shower: 0.05, altar: 3, shelf: 6, car: 4.8, washer: 2.8, planter: 2, stairs: 0 };

function furnitureMesh(f: Furniture, style: InteriorStyle, base: number, group: THREE.Group) {
  const r = f.rect, h = FURN_H[f.kind] ?? 2;
  const wood = mat(style.furnitureTone);
  const fabric = mat(style.fabric.hex);
  const white = mat("#F7F7F5", { roughness: 0.4 });
  const accent = mat(style.accent.hex);
  switch (f.kind) {
    case "bed": {
      group.add(box(r.w, 1.2, r.h, r.x, base, r.y, wood));
      group.add(box(r.w - 0.2, 0.7, r.h - 0.2, r.x + 0.1, base + 1.2, r.y + 0.1, white));
      // headboard
      const s = f.facing;
      const hb = s === "S" ? [r.x, r.y + r.h - 0.3, r.w, 0.3] : s === "N" ? [r.x, r.y, r.w, 0.3] : s === "E" ? [r.x + r.w - 0.3, r.y, 0.3, r.h] : [r.x, r.y, 0.3, r.h];
      group.add(box(hb[2], 3.6, hb[3], hb[0], base, hb[1], accent));
      return;
    }
    case "sofa": {
      group.add(box(r.w, 1.4, r.h, r.x, base, r.y, fabric));
      const s = f.facing, t = 0.7;
      const back = s === "N" ? [r.x, r.y + r.h - t, r.w, t] : s === "S" ? [r.x, r.y, r.w, t] : s === "E" ? [r.x, r.y, t, r.h] : [r.x + r.w - t, r.y, t, r.h];
      group.add(box(back[2], 2.7, back[3], back[0], base, back[1], fabric));
      return;
    }
    case "dining": {
      group.add(box(r.w, 0.15, r.h, r.x, base + 2.35, r.y, wood));
      for (const [dx, dz] of [[0.2, 0.2], [r.w - 0.4, 0.2], [0.2, r.h - 0.4], [r.w - 0.4, r.h - 0.4]]) group.add(box(0.2, 2.35, 0.2, r.x + dx, base, r.y + dz, wood));
      const horiz = r.w >= r.h, seats = r.w * r.h > 15 ? 3 : 2;
      for (let k = 0; k < seats; k++) {
        if (horiz) { const x = r.x + (r.w / seats) * (k + 0.5) - 0.7; group.add(box(1.4, 1.5, 1.3, x, base, r.y - 1.6, fabric)); group.add(box(1.4, 1.5, 1.3, x, base, r.y + r.h + 0.3, fabric)); }
        else { const z = r.y + (r.h / seats) * (k + 0.5) - 0.7; group.add(box(1.3, 1.5, 1.4, r.x - 1.6, base, z, fabric)); group.add(box(1.3, 1.5, 1.4, r.x + r.w + 0.3, base, z, fabric)); }
      }
      return;
    }
    case "counter": group.add(box(r.w, 2.8, r.h, r.x, base, r.y, wood)); group.add(box(r.w, 0.12, r.h, r.x, base + 2.8, r.y, mat("#3A3B3D", { roughness: 0.3 }))); return;
    case "hob": group.add(box(r.w * 0.8, 0.1, r.h * 0.8, r.x + r.w * 0.1, base + 2.93, r.y + r.h * 0.1, mat("#111", { roughness: 0.2 }))); return;
    case "sink": group.add(box(r.w, 0.1, r.h, r.x, base + 2.9, r.y, mat("#C9D1D6", { metalness: 0.6, roughness: 0.3 }))); return;
    case "wc": case "basin": group.add(box(r.w, h, r.h, r.x, base, r.y, white)); return;
    case "shower": group.add(box(r.w, 0.05, r.h, r.x, base, r.y, mat("#9FB4BF", { roughness: 0.3 }))); return;
    case "car": {
      const m = mat("#5C6670", { metalness: 0.5, roughness: 0.35 });
      group.add(box(r.w, 2.6, r.h, r.x, base + 0.6, r.y, m));
      const cab = r.h > r.w ? [r.x + 0.4, r.y + r.h * 0.3, r.w - 0.8, r.h * 0.4] : [r.x + r.w * 0.3, r.y + 0.4, r.w * 0.4, r.h - 0.8];
      group.add(box(cab[2], 1.6, cab[3], cab[0], base + 3.2, cab[1], mat("#2B3138", { metalness: 0.3, roughness: 0.2 })));
      return;
    }
    case "planter": group.add(box(r.w, 1.2, r.h, r.x, base, r.y, mat("#8A6B52"))); group.add(box(r.w * 0.9, 1.6, r.h * 0.9, r.x + r.w * 0.05, base + 1.2, r.y + r.h * 0.05, mat("#5E8A55"))); return;
    case "altar": group.add(box(r.w, 3, r.h, r.x, base, r.y, mat("#C9A04A", { metalness: 0.3 }))); return;
    case "fridge": group.add(box(r.w, 6, r.h, r.x, base, r.y, mat("#D8DCDF", { metalness: 0.3, roughness: 0.4 }))); return;
    case "tv": group.add(box(r.w, 1.8, r.h, r.x, base, r.y, wood)); group.add(box(r.w * 0.8, 2.6, 0.15, r.x + r.w * 0.1, base + 3, r.y + r.h / 2, mat("#111", { roughness: 0.2 }))); return;
    case "stairs": return;
    default: group.add(box(r.w, h, r.h, r.x, base, r.y, f.kind === "wardrobe" || f.kind === "shelf" || f.kind === "crockery" ? wood : f.kind === "chair" ? fabric : wood));
  }
}

function stairsMesh(r: Rect, base: number, group: THREE.Group) {
  const long = r.h >= r.w;
  const landing = 3.25;
  const run = (long ? r.h : r.w) - landing;
  const treads = Math.max(8, Math.round(run / 0.85));
  const rise = WALL_H / 2 / treads;
  const m = mat("#C8C2B8");
  const half = (long ? r.w : r.h) / 2;
  // first flight goes away from the entry end, second comes back after the landing
  for (let k = 0; k < treads; k++) {
    const t = run / treads;
    if (long) group.add(box(half - 0.1, rise * (k + 1), t, r.x, base, r.y + r.h - t * (k + 1), m));
    else group.add(box(t, rise * (k + 1), half - 0.1, r.x + r.w - t * (k + 1), base, r.y + r.h - half + 0.1, m));
  }
  if (long) group.add(box(r.w, WALL_H / 2, landing, r.x, base, r.y, m));
  else group.add(box(landing, WALL_H / 2, r.h, r.x, base, r.y, m));
}

export function buildFloor(d: HouseDesign, f: FloorPlan, style: InteriorStyle, level: number, opts: { cutaway: boolean; furniture: boolean }): { group: THREE.Group; pickables: THREE.Mesh[] } {
  const group = new THREE.Group();
  const pickables: THREE.Mesh[] = [];
  const base = level * (WALL_H + 1);
  const fp = d.footprint;
  // slab
  group.add(box(fp.w + 0.75, 1, fp.h + 0.75, fp.x - 0.375, base - 1, fp.y - 0.375, mat("#B9B4AA")));
  // floor finishes
  for (const r of f.rooms) {
    const m = mat(r.open ? "#C9CDC4" : floorColour(r, style), { roughness: r.type === "toilet" ? 0.5 : 0.75 });
    const mesh = box(r.rect.w - 0.1, 0.12, r.rect.h - 0.1, r.rect.x + 0.05, base, r.rect.y + 0.05, m);
    mesh.userData.roomId = r.id;
    mesh.castShadow = false;
    group.add(mesh);
    pickables.push(mesh);
  }
  // walls
  const wallH = opts.cutaway ? 4.2 : WALL_H;
  const wallMat = mat("#F2F1EC");
  const outerMat = mat("#E9E5DC");
  const glass = new THREE.MeshStandardMaterial({ color: "#A9C4D3", transparent: true, opacity: 0.35, roughness: 0.1 });
  for (const seg of wallSegments(f.rooms, fp)) {
    const t = seg.outer ? 0.75 : 0.375;
    const m = seg.outer ? outerMat : wallMat;
    const piece = (a: number, b: number, y0: number, y1: number, mm: THREE.Material = m) => {
      const top = Math.min(y1, wallH);
      if (b - a < 0.02 || top - y0 < 0.02) return;
      if (seg.horizontal) group.add(box(b - a, top - y0, t, a, base + y0, seg.at - t / 2, mm));
      else group.add(box(t, top - y0, b - a, seg.at - t / 2, base + y0, a, mm));
    };
    let cur = seg.a;
    for (const o of openingsOn(seg, f.openings)) {
      piece(cur, o.a, 0, WALL_H);
      if (o.kind === "window" || o.kind === "ventilator") {
        const sill = o.kind === "window" ? SILL : VENT_SILL;
        piece(o.a, o.b, 0, sill);
        piece(o.a, o.b, WIN_H, WALL_H);
        if (!opts.cutaway || wallH > sill) piece(o.a, o.b, sill, Math.min(WIN_H, wallH), glass);
      } else piece(o.a, o.b, DOOR_H, WALL_H);
      cur = Math.max(cur, o.b);
    }
    piece(cur, seg.b, 0, WALL_H);
  }
  // balcony and sit-out parapets
  for (const r of f.rooms.filter((x) => x.open && x.type !== "parking")) {
    const R = r.rect, p = mat("#E9E5DC");
    const near = (a: number, b: number) => Math.abs(a - b) < 0.01;
    if (near(R.y, fp.y)) group.add(box(R.w, 3, 0.4, R.x, base, R.y - 0.2, p));
    if (near(R.y + R.h, fp.y + fp.h)) group.add(box(R.w, 3, 0.4, R.x, base, R.y + R.h - 0.2, p));
    if (near(R.x, fp.x)) group.add(box(0.4, 3, R.h, R.x - 0.2, base, R.y, p));
    if (near(R.x + R.w, fp.x + fp.w)) group.add(box(0.4, 3, R.h, R.x + R.w - 0.2, base, R.y, p));
  }
  if (opts.furniture) for (const fu of f.furniture) fu.kind === "stairs" ? stairsMesh(fu.rect, base, group) : furnitureMesh(fu, style, base + 0.12, group);
  return { group, pickables };
}

export const FLOOR_HEIGHT = WALL_H + 1;
