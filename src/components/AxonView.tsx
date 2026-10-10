import { useMemo } from "react";
import { renderAxonSvg } from "../render/axonSvg";
import type { HouseDesign } from "../engine/types";
import { cx } from "./ui";

/** Axonometric cut model of one floor, walls cut at 5½ ft so every room reads. */
export default function AxonView({ design, floor, className }: { design: HouseDesign; floor: number; className?: string }) {
  const f = design.floors[Math.min(floor, design.floors.length - 1)];
  const svg = useMemo(() => renderAxonSvg(design, f, { wallHeight: 5.5, showLabels: true }), [design, f]);
  return (
    <figure className={cx("flex flex-col bg-white ring-1 ring-line", className ?? "relative")}>
      <div className="min-h-0 flex-1 p-4 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} role="img" aria-label={`Axonometric drawing of the ${f.name.toLowerCase()}`} />
      <figcaption className="border-t border-line px-4 py-2 text-[12.5px] text-muted">{f.name}, seen from the road side. Walls cut at 5½ ft to show the rooms.</figcaption>
    </figure>
  );
}
