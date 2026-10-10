/**
 * Regenerates the homepage "plot studies" (axonometric drawings + scores) from the engine.
 * Run after engine changes:  GEN_STUDIES=1 npx vitest run src/gen
 */
import { it } from "vitest";
import { writeFileSync } from "node:fs";
import { generate } from "../engine/design";
import { renderAxonSvg } from "../render/axonSvg";
import { DEFAULT_INPUT } from "../lib/share";
import type { HouseInput } from "../engine/types";

const STUDIES: { id: string; title: string; note: string; input: Partial<HouseInput> }[] = [
  { id: "30x40-east", title: "30 × 40, east-facing", note: "2 BHK on the most common city plot. Kitchen in the south-east, master bedroom in the south-west.", input: { plotWidth: 30, plotDepth: 40, facing: "E", bhk: 2 } },
  { id: "40x60-courtyard", title: "40 × 60, west-facing", note: "3 BHK around a mutram open to the sky, keeping the Brahmasthan open.", input: { plotWidth: 40, plotDepth: 60, facing: "W", bhk: 3, courtyard: true } },
  { id: "30x40-north-g1", title: "30 × 40, north-facing", note: "3 BHK on two floors, with parking at the front and bedrooms upstairs.", input: { plotWidth: 30, plotDepth: 40, facing: "N", bhk: 3, floors: 2, parking: true } },
  { id: "30x50-south", title: "30 × 50, south-facing", note: "3 BHK with the master bedroom in the south-west at the front, where Vastu puts it.", input: { plotWidth: 30, plotDepth: 50, facing: "S", bhk: 3 } },
  { id: "60x40-wide", title: "60 × 40, east-facing", note: "A wide plot: a compact house, an internal courtyard and a garden on the north.", input: { plotWidth: 60, plotDepth: 40, facing: "E", bhk: 2 } },
  { id: "20x30-compact", title: "20 × 30, north-facing", note: "1 BHK with a combined living and dining room on a small plot.", input: { plotWidth: 20, plotDepth: 30, facing: "N", bhk: 1, pooja: false, utility: false } },
];

it.runIf(process.env.GEN_STUDIES === "1")("generate plot studies", { timeout: 120000 }, () => {
  const meta = STUDIES.map((s) => {
    const input = { ...DEFAULT_INPUT, ...s.input };
    const d = generate(input)[0];
    writeFileSync(`public/studies/${s.id}.svg`, renderAxonSvg(d, d.floors[0], { wallHeight: 5.5, furniture: true }));
    return { id: s.id, title: s.title, note: s.note, input, vastu: d.vastuScore, livability: d.livabilityScore, builtUp: d.builtUpArea, floors: d.floors.length };
  });
  writeFileSync("src/data/studies.json", JSON.stringify(meta, null, 2));
});
