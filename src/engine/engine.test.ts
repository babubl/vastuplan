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

describe("plot-aware design", () => {
  it("does not stretch the dining hall into a corridor on a wide plot", () => {
    const d = generate({ ...base, plotWidth: 60, plotDepth: 40, facing: "E" })[0];
    const dining = d.floors[0].rooms.find((r) => r.type === "dining")!;
    expect(Math.max(dining.rect.w, dining.rect.h) / Math.min(dining.rect.w, dining.rect.h)).toBeLessThanOrEqual(2.1);
  });
  it("adds a courtyard when asked and keeps every room reachable", () => {
    const d = generate({ ...base, plotWidth: 40, plotDepth: 60, bhk: 3, courtyard: true })[0];
    expect(d.floors[0].rooms.some((r) => r.type === "courtyard")).toBe(true);
    expect(d.livability.find((c) => c.id === "access")?.status).toBe("pass");
  });
  it("checks all four corners with reasons, and places site services", () => {
    const d = generate(base)[0];
    const corners = d.vastu.filter((c) => c.group === "corner");
    expect(corners.map((c) => c.id).sort()).toEqual(["corner-NE", "corner-NW", "corner-SE", "corner-SW"]);
    expect(corners.every((c) => c.why && c.why.length > 40)).toBe(true);
    expect(d.vastu.filter((c) => c.group !== "corner").every((c) => c.why)).toBe(true);
    expect(d.services.map((s) => s.kind).sort()).toEqual(["borewell", "rwh", "septic", "sump", "tank"]);
    const sump = d.services.find((s) => s.kind === "sump")!;
    expect(sump.x).toBeGreaterThan(d.plot.w / 2); // east half
    expect(sump.y).toBeLessThan(d.plot.h / 2); // north half
  });
  it("scores a north-east corner plot above a south-west one", () => {
    const ne = generate({ ...base, facing: "N", corner: "E" })[0].vastu.find((c) => c.id === "corner")!;
    const sw = generate({ ...base, facing: "S", corner: "W" })[0].vastu.find((c) => c.id === "corner")!;
    expect(ne.score).toBeGreaterThan(sw.score);
  });
  it("puts columns at every corner of the house", () => {
    const d = generate(base)[0];
    const fp = d.footprint;
    for (const [x, y] of [[fp.x, fp.y], [fp.x + fp.w, fp.y], [fp.x, fp.y + fp.h], [fp.x + fp.w, fp.y + fp.h]]) expect(d.floors[0].columns!.some((c) => Math.abs(c.x - x) < 0.01 && Math.abs(c.y - y) < 0.01)).toBe(true);
  });
  it("relaxes the brief on a narrow plot instead of giving up, and says what changed", () => {
    const ds = generate({ ...base, plotWidth: 20, plotDepth: 40, facing: "N", floors: 2, bhk: 3, groundBedroom: false });
    expect(ds.length).toBeGreaterThan(0);
    for (const d of ds) expect(d.livability.find((c) => c.id === "access")?.status).toBe("pass");
    expect(ds[0].adjustments?.length).toBeGreaterThan(0);
  });
  it("uses custom setbacks", () => {
    const d = generate({ ...base, setbacks: { front: 2, rear: 2, left: 1, right: 1 } })[0];
    expect(d.buildable.w).toBeCloseTo(28);
    expect(d.buildable.h).toBeCloseTo(36);
  });
});
