/** Architect's review sweep across many plots. Run: SWEEP=1 npx vitest run src/gen/sweep */
import { it } from "vitest";
import { writeFileSync } from "node:fs";
import { generate } from "../engine/design";
import type { HouseInput } from "../engine/types";

const run = process.env.SWEEP === "1";
it.skipIf(!run)("sweep", () => {
  const rows: string[] = [];
  const problems: Record<string, number> = {};
  let n = 0, empty = 0;
  const t0 = Date.now();
  for (const facing of (process.env.SWEEP_FACING ?? "NESW").split("") as ("N" | "E" | "S" | "W")[])
    for (const [w, dd] of [[20, 30], [25, 40], [30, 40], [30, 50], [35, 50], [40, 60], [50, 50], [60, 40], [60, 80]])
      for (const bhk of [1, 2, 3, 4] as const)
        for (const floors of [1, 2] as const) {
          if (bhk === 4 && floors === 1 && w * dd < 2000) continue;
          const input: HouseInput = { plotWidth: w, plotDepth: dd, facing, floors, bhk, pooja: true, study: false, parking: w >= 30, utility: true, groundBedroom: floors === 2 };
          n++;
          const ds = generate(input, 1);
          const tag = `${w}x${dd} ${facing} ${bhk}BHK ${floors === 2 ? "G+1" : "G"}`;
          if (!ds.length) { empty++; rows.push(`${tag}\tNONE`); continue; }
          const d = ds[0];
          const bad = [...d.vastu, ...d.livability].filter((c) => c.status === "fail").map((c) => c.id);
          bad.forEach((b) => (problems[b] = (problems[b] ?? 0) + 1));
          rows.push(`${tag}\tV${d.vastuScore} L${d.livabilityScore}\t${bad.join(",")}`);
        }
  const summary = `cases ${n}, no plan ${empty}, ${((Date.now() - t0) / n).toFixed(0)} ms each\nfail counts: ${JSON.stringify(problems)}\n\n${rows.join("\n")}`;
  writeFileSync(process.env.SWEEP_OUT ?? "sweep.txt", summary);
}, 600000);
