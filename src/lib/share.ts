import type { HouseInput } from "../engine/types";

export const DEFAULT_INPUT: HouseInput = { plotWidth: 30, plotDepth: 40, facing: "E", floors: 1, bhk: 2, pooja: true, study: false, parking: false, utility: true, groundBedroom: false };

const KEYS: (keyof HouseInput)[] = ["plotWidth", "plotDepth", "facing", "floors", "bhk", "pooja", "study", "parking", "utility", "groundBedroom", "courtyard"];

export function inputToQuery(i: HouseInput): string {
  const p = new URLSearchParams();
  KEYS.forEach((k) => { const v = i[k]; if (v === undefined) return; p.set(k, typeof v === "boolean" ? (v ? "1" : "0") : String(v)); });
  if (i.corner) p.set("corner", i.corner);
  return p.toString();
}

export function inputFromQuery(q: string): HouseInput {
  const p = new URLSearchParams(q);
  const num = (k: string, d: number, lo: number, hi: number) => { const v = Number(p.get(k)); return Number.isFinite(v) && v >= lo && v <= hi ? v : d; };
  const bool = (k: string, d: boolean) => (p.has(k) ? p.get(k) === "1" : d);
  const d = DEFAULT_INPUT;
  const f = p.get("facing");
  return {
    plotWidth: num("plotWidth", d.plotWidth, 15, 120), plotDepth: num("plotDepth", d.plotDepth, 20, 150),
    facing: f === "N" || f === "E" || f === "S" || f === "W" ? f : d.facing,
    floors: num("floors", d.floors, 1, 2) as 1 | 2, bhk: num("bhk", d.bhk, 1, 4) as 1 | 2 | 3 | 4,
    pooja: bool("pooja", d.pooja), study: bool("study", d.study), parking: bool("parking", d.parking), utility: bool("utility", d.utility), groundBedroom: bool("groundBedroom", d.groundBedroom),
    courtyard: bool("courtyard", false),
    corner: ((c) => (c === "N" || c === "E" || c === "S" || c === "W" ? c : undefined))(p.get("corner")),
  };
}
