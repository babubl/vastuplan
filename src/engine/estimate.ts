/**
 * The numbers a house owner, mason and engineer ask for: area statement, door and window schedule,
 * material quantities by common Indian thumb rules, and an indicative cost. All approximate.
 */
import { area } from "./geometry";
import type { HouseDesign, Opening } from "./types";

const SQM = 10.7639;

export interface AreaRow { floor: string; room: string; sqft: number }
export function areaStatement(d: HouseDesign) {
  const rows: AreaRow[] = d.floors.flatMap((f) => f.rooms.filter((r) => !(r.open && r.type !== "parking")).map((r) => ({ floor: f.name, room: r.label, sqft: Math.round(area(r.rect)) })));
  const plotArea = d.input.plotWidth * d.input.plotDepth;
  // per floor, to wall centre-lines, less anything open to the sky (courtyard)
  const openToSky = d.floors[0].rooms.filter((r) => r.type === "courtyard").reduce((s, r) => s + area(r.rect), 0);
  const plinth = Math.round(area(d.footprint) - openToSky);
  const builtUp = d.builtUpArea;
  // carpet area: inside the walls (about 0.375 ft off each side of every room)
  const carpet = Math.round(d.floors.flatMap((f) => f.rooms).filter((r) => !r.open).reduce((s, r) => s + Math.max(0, r.rect.w - 0.375) * Math.max(0, r.rect.h - 0.375), 0));
  return { rows, plotArea, plinth, builtUp, carpet, coverage: Math.round((plinth / plotArea) * 100), fsi: +(builtUp / plotArea).toFixed(2), sqm: (n: number) => (n / SQM).toFixed(1) };
}

export interface ScheduleRow { mark: string; type: string; size: string; count: number }
export function openingSchedule(d: HouseDesign): ScheduleRow[] {
  const groups = new Map<string, ScheduleRow>();
  const len = (o: Opening) => Math.hypot(o.x2 - o.x1, o.y2 - o.y1);
  const ftin = (ft: number) => { const i = Math.round(ft * 12); return `${Math.floor(i / 12)}'${i % 12 ? `${i % 12}"` : ""}`; };
  for (const f of d.floors) for (const o of f.openings) {
    const w = Math.round(len(o) * 2) / 2;
    let type: string, h: string;
    switch (o.kind) {
      case "main": type = "Main door (teak, panelled)"; h = "7'"; break;
      case "door": type = w <= 2.6 ? "Toilet / utility door (WPC or FRP)" : "Room door (flush)"; h = "7'"; break;
      case "opening": type = "Opening with arch or frame"; h = "7'"; break;
      case "window": type = "Window (sill 3', with grill)"; h = "4'"; break;
      default: type = "Ventilator (sill 5'6\")"; h = "1'6\""; break;
    }
    const k = `${type}|${w}`;
    const row = groups.get(k) ?? { mark: "", type, size: `${ftin(w)} × ${h}`, count: 0 };
    row.count++;
    groups.set(k, row);
  }
  const order = ["Main", "Room", "Toilet", "Opening", "Window", "Ventilator"];
  const rows = [...groups.values()].sort((a, b) => order.findIndex((o) => a.type.startsWith(o)) - order.findIndex((o) => b.type.startsWith(o)) || b.size.localeCompare(a.size));
  let dn = 0, wn = 0, vn = 0, on = 0;
  rows.forEach((r) => { r.mark = r.type.startsWith("Window") ? `W${++wn}` : r.type.startsWith("Ventilator") ? `V${++vn}` : r.type.startsWith("Opening") ? `O${++on}` : `D${++dn}`; });
  return rows;
}

/** Thumb rules per square foot of built-up area for an RCC-framed house with brick walls. */
export const RULES_OF_THUMB = [
  { item: "Cement", per: 0.4, unit: "bags (50 kg)" },
  { item: "Steel", per: 4, unit: "kg" },
  { item: "Sand", per: 1.8, unit: "cft" },
  { item: "Aggregate (jelly)", per: 1.35, unit: "cft" },
  { item: "Bricks", per: 8, unit: "nos" },
  { item: "Flooring tiles", per: 1.3, unit: "sq ft" },
  { item: "Paint", per: 0.18, unit: "litres" },
];

export function quantities(builtUp: number) {
  return RULES_OF_THUMB.map((r) => ({ ...r, qty: Math.round(r.per * builtUp) }));
}

export const COST_TIERS = [
  { id: "basic", name: "Basic", rate: 2000, note: "Standard materials, ceramic tiles, flush doors" },
  { id: "standard", name: "Standard", rate: 2500, note: "Vitrified tiles, branded fittings, teak main door" },
  { id: "premium", name: "Premium", rate: 3300, note: "Granite or wood floors, premium fittings, false ceilings" },
] as const;
