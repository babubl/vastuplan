import { describe, expect, it } from "vitest";
import { generate } from "./design";
import { area } from "./geometry";
import type { HouseInput, Rect } from "./types";

const base: HouseInput = { plotWidth: 30, plotDepth: 40, facing: "N", floors: 1, bhk: 2, pooja: true, study: false, parking: false, utility: true, groundBedroom: false };
const overlap = (a: Rect, b: Rect) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0.05 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0.05;

const CASES: Partial<HouseInput>[] = [];
for (const facing of ["N", "E", "S", "W"] as const)
  for (const [plotWidth, plotDepth] of [[30, 40], [30, 50], [40, 60]])
    for (const bhk of [2, 3] as const) CASES.push({ facing, plotWidth, plotDepth, bhk });
CASES.push({ floors: 2, bhk: 3, parking: true }, { floors: 2, bhk: 4, plotWidth: 40, plotDepth: 60, facing: "E", groundBedroom: true, study: true }, { bhk: 1, plotWidth: 20, plotDepth: 30, pooja: false, utility: false });

describe("house generator", () => {
  for (const c of CASES) {
    const input = { ...base, ...c };
    const name = `${input.plotWidth}x${input.plotDepth} ${input.facing}-facing ${input.bhk}BHK${input.floors === 2 ? " G+1" : ""}`;
    it(name, () => {
      const ds = generate(input);
      expect(ds.length).toBeGreaterThan(0);
      for (const d of ds) {
        for (const f of d.floors) {
          // rooms tile the footprint exactly, with no overlaps
          const sum = f.rooms.reduce((s, r) => s + area(r.rect), 0);
          expect(Math.abs(sum - area(d.footprint))).toBeLessThan(1);
          for (let i = 0; i < f.rooms.length; i++) for (let j = i + 1; j < f.rooms.length; j++) expect(overlap(f.rooms[i].rect, f.rooms[j].rect), `${f.rooms[i].label} / ${f.rooms[j].label}`).toBe(false);
          // footprint inside the buildable area
          expect(d.footprint.x).toBeGreaterThanOrEqual(d.buildable.x - 0.01);
          expect(d.footprint.x + d.footprint.w).toBeLessThanOrEqual(d.buildable.x + d.buildable.w + 0.01);
          // furniture stays inside its room
          for (const fu of f.furniture) {
            const r = f.rooms.find((x) => x.id === fu.room)!.rect;
            expect(fu.rect.x >= r.x - 0.01 && fu.rect.y >= r.y - 0.01 && fu.rect.x + fu.rect.w <= r.x + r.w + 0.01 && fu.rect.y + fu.rect.h <= r.y + r.h + 0.01, `${fu.kind} in ${r}`).toBe(true);
          }
        }
        expect(d.livability.find((x) => x.id === "access")?.status, "every room reachable").toBe("pass");
        expect(d.floors[0].openings.some((o) => o.kind === "main")).toBe(true);
      }
      expect(ds[0].score).toBeGreaterThanOrEqual(70);
    });
  }

  it("puts the kitchen in the south-east and master in the south-west on a north-facing 30x40", () => {
    const d = generate(base)[0];
    const all = d.floors.flatMap((f) => f.rooms);
    expect(all.find((r) => r.type === "kitchen")?.zone).toMatch(/SE|NW|E|S/);
    expect(all.find((r) => r.type === "master")?.zone).toMatch(/SW|S|W/);
    expect(d.vastuScore).toBeGreaterThanOrEqual(85);
  });

  it("is deterministic", () => {
    expect(JSON.stringify(generate(base))).toBe(JSON.stringify(generate(base)));
  });
});
