import { fmtFt } from "../engine/geometry";
import { ZONES } from "../engine/vastu";
import type { HouseDesign } from "../engine/types";

/** Plain-text description of a design, for the AI architect and for sharing. */
export function summarise(d: HouseDesign): string {
  const i = d.input;
  const lines = [
    `Plot ${i.plotWidth} x ${i.plotDepth} ft, ${i.facing}-facing (road on the ${i.facing} side). ${i.bhk}BHK, ${i.floors === 2 ? "ground + first floor" : "single storey"}. Built-up area about ${d.builtUpArea} sq ft.`,
    `House footprint ${fmtFt(d.footprint.w)} (east-west) x ${fmtFt(d.footprint.h)} (north-south).`,
    `Scores: Vastu ${d.vastuScore}/100, livability ${d.livabilityScore}/100.`,
  ];
  for (const f of d.floors) {
    lines.push(`${f.name}:`);
    for (const r of f.rooms) lines.push(`- ${r.label}: ${fmtFt(r.rect.w)} x ${fmtFt(r.rect.h)}, ${r.zone} zone (${ZONES[r.zone].name})`);
  }
  lines.push("Vastu checks:", ...d.vastu.map((c) => `- [${c.status}] ${c.title}: ${c.detail}`));
  lines.push("Livability checks:", ...d.livability.map((c) => `- [${c.status}] ${c.title}: ${c.detail}`));
  return lines.join("\n");
}
