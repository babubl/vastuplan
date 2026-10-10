/** Site services (Vastu placements a mason and plumber need) and the structural column grid. */
import type { Rect, Room, SiteService } from "./types";

/**
 * Sump and borewell in the north-east, septic tank in the north-west (away from the north-east and
 * the walls), rainwater-harvesting pit on the north or east, overhead tank on the south-west of the roof.
 */
export function servicesFor(plot: Rect, fp: Rect): SiteService[] {
  const openN = fp.y - plot.y, openS = plot.y + plot.h - (fp.y + fp.h);
  const openW = fp.x - plot.x, openE = plot.x + plot.w - (fp.x + fp.w);
  const out: SiteService[] = [];
  const ne = openN >= openE
    ? { x: plot.x + plot.w - Math.max(2.2, Math.min(openE, 6) / 2 + 1.5), y: plot.y + openN / 2 }
    : { x: plot.x + plot.w - openE / 2, y: plot.y + Math.max(2.2, Math.min(openN, 6) / 2 + 1.5) };
  out.push({ kind: "sump", label: "Sump", ...ne, r: Math.min(2, Math.max(1, Math.max(openN, openE) / 2 - 0.4)), why: "Underground water belongs in the north-east, the water corner, which should also be the lowest point of the plot." });
  const bore = openN >= openE ? { x: ne.x - 5, y: ne.y } : { x: ne.x, y: ne.y + 5 };
  out.push({ kind: "borewell", label: "Bore", ...bore, r: 0.7, why: "A borewell or well, like the sump, goes in the north-east, the lowest and most sacred zone." });
  const nw = openW >= openN
    ? { x: plot.x + openW / 2, y: plot.y + plot.h * 0.22 }
    : { x: plot.x + plot.w * 0.18, y: plot.y + openN / 2 };
  out.push({ kind: "septic", label: "Septic", ...nw, r: Math.min(2, Math.max(1, Math.max(openW, openN) / 2 - 0.4)), why: "The septic tank goes in the north-west, the air zone, kept off the corner and away from the north-east and the walls." });
  const rwh = openN >= openE ? { x: plot.x + plot.w * 0.55, y: plot.y + openN / 2 } : { x: plot.x + plot.w - openE / 2, y: plot.y + plot.h * 0.45 };
  out.push({ kind: "rwh", label: "RWH", ...rwh, r: 1, why: "A rainwater-harvesting recharge pit, required for new buildings in Tamil Nadu, sits naturally on the north or east where the ground slopes." });
  out.push({ kind: "tank", label: "Overhead tank", x: fp.x + 3, y: fp.y + fp.h - 3, r: 2.5, onRoof: true, why: "The overhead tank is the heaviest thing on the roof, so it goes over the south-west, which should be the highest and heaviest point." });
  if (Math.min(openS, openW) > 0) { /* south and west kept as narrow as the rules allow */ }
  return out;
}

const key = (x: number, y: number) => `${x.toFixed(2)},${y.toFixed(2)}`;

/**
 * Columns at every wall junction of the ground floor, plus intermediate columns so no beam spans
 * more than about 15 ft. The first floor reuses the same grid so loads go straight down.
 */
export function columnsFor(rooms: Room[], fp: Rect): { x: number; y: number }[] {
  const pts = new Map<string, { x: number; y: number }>();
  for (const r of rooms) {
    const R = r.rect;
    for (const [x, y] of [[R.x, R.y], [R.x + R.w, R.y], [R.x, R.y + R.h], [R.x + R.w, R.y + R.h]]) pts.set(key(x, y), { x, y });
  }
  // add midpoints on long runs along the outer walls and band lines
  const list = [...pts.values()];
  const lines = new Map<string, number[]>();
  for (const p of list) {
    lines.set(`h${p.y.toFixed(2)}`, [...(lines.get(`h${p.y.toFixed(2)}`) ?? []), p.x]);
    lines.set(`v${p.x.toFixed(2)}`, [...(lines.get(`v${p.x.toFixed(2)}`) ?? []), p.y]);
  }
  for (const [k, vals] of lines) {
    const at = Number(k.slice(1));
    const sorted = [...new Set(vals.map((v) => +v.toFixed(2)))].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i] - sorted[i - 1];
      if (gap > 15) {
        const n = Math.ceil(gap / 15);
        for (let j = 1; j < n; j++) {
          const v = sorted[i - 1] + (gap / n) * j;
          const p = k[0] === "h" ? { x: v, y: at } : { x: at, y: v };
          // only on real walls: the outer boundary
          const onBoundary = Math.abs(p.x - fp.x) < 0.01 || Math.abs(p.x - fp.x - fp.w) < 0.01 || Math.abs(p.y - fp.y) < 0.01 || Math.abs(p.y - fp.y - fp.h) < 0.01;
          if (onBoundary) pts.set(key(p.x, p.y), p);
        }
      }
    }
  }
  return [...pts.values()];
}
