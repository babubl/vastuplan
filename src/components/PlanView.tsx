import { useMemo, useRef, useState, type PointerEvent as RPE, type WheelEvent as RWE } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import { planViewBox, renderPlanSvg } from "../render/planSvg";
import { fmtFt } from "../engine/geometry";
import type { HouseDesign } from "../engine/types";
import { cx } from "./ui";

export interface Layers { furniture: boolean; grid: boolean; dims: boolean }

export default function PlanView({ design, floor, layers, selected, onSelect, className }: {
  design: HouseDesign; floor: number; layers: Layers; selected?: string | null; onSelect?: (id: string | null) => void; className?: string;
}) {
  const f = design.floors[Math.min(floor, design.floors.length - 1)];
  const svg = useMemo(() => renderPlanSvg(design, f, { furniture: layers.furniture, vastuGrid: layers.grid, dims: layers.dims }), [design, f, layers.furniture, layers.grid, layers.dims]);
  const vb = planViewBox(design);
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const [hover, setHover] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean; pinch?: number; s0?: number } | null>(null);

  const clamp = (v: { s: number; x: number; y: number }) => {
    const el = box.current; if (!el) return v;
    const s = Math.max(1, Math.min(6, v.s));
    const w = el.clientWidth, h = el.clientHeight;
    return { s, x: Math.min(0, Math.max(w - w * s, v.x)), y: Math.min(0, Math.max(h - h * s, v.y)) };
  };
  const zoomAt = (factor: number, cx0: number, cy0: number) => setView((v) => {
    const s = Math.max(1, Math.min(6, v.s * factor));
    const k = s / v.s;
    return clamp({ s, x: cx0 - (cx0 - v.x) * k, y: cy0 - (cy0 - v.y) * k });
  });
  const onWheel = (e: RWE) => {
    if (!e.ctrlKey && !e.metaKey && view.s === 1 && e.deltaY > 0) return; // let the page scroll when not zoomed
    e.preventDefault();
    const r = box.current!.getBoundingClientRect();
    zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
  };
  const onDown = (e: RPE) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.target as Element).setPointerCapture?.(e.pointerId);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      drag.current = { x: 0, y: 0, vx: view.x, vy: view.y, moved: true, pinch: Math.hypot(a.x - b.x, a.y - b.y), s0: view.s };
    } else drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
  };
  const onMove = (e: RPE) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const d = drag.current; if (!d) return;
    if (d.pinch && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const r = box.current!.getBoundingClientRect();
      const s = Math.max(1, Math.min(6, (d.s0 ?? 1) * Math.hypot(a.x - b.x, a.y - b.y) / d.pinch));
      const mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
      setView((v) => { const k = s / v.s; return clamp({ s, x: mx - (mx - v.x) * k, y: my - (my - v.y) * k }); });
      return;
    }
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    if (d.moved && view.s > 1) setView(clamp({ s: view.s, x: d.vx + dx, y: d.vy + dy }));
  };
  const onUp = (e: RPE) => { pointers.current.delete(e.pointerId); if (pointers.current.size === 0) setTimeout(() => (drag.current = null), 0); };
  const click = (id: string) => { if (drag.current?.moved) return; onSelect?.(selected === id ? null : id); };
  const centre = () => { const el = box.current!; return [el.clientWidth / 2, el.clientHeight / 2] as const; };

  const hovered = f.rooms.find((r) => r.id === hover);
  return (
    <div className={cx("select-none overflow-hidden rounded-lg bg-white ring-1 ring-line", className ?? "relative")}>
      <div ref={box} className="relative h-full w-full touch-none" style={{ cursor: view.s > 1 ? "grab" : "default" }}
        onWheel={onWheel} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <div className="absolute inset-0 origin-top-left" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}>
          <div className="relative flex h-full w-full items-center justify-center">
            <div className="relative h-full w-full">
              <div className="absolute inset-0 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
              <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} className="absolute inset-0 h-full w-full" role="group" aria-label={`${f.name} rooms`}>
                {f.rooms.map((r) => {
                  const on = selected === r.id, hov = hover === r.id;
                  return (
                    <rect key={r.id} x={r.rect.x} y={r.rect.y} width={r.rect.w} height={r.rect.h}
                      fill={on ? "rgba(46,58,135,0.13)" : hov ? "rgba(46,58,135,0.06)" : "transparent"}
                      stroke={on || hov ? "#2E3A87" : "none"} strokeWidth={on ? 0.35 : 0.22}
                      style={{ cursor: "pointer" }} tabIndex={0} role="button" aria-label={`${r.label}, ${fmtFt(r.rect.w)} by ${fmtFt(r.rect.h)}`} aria-pressed={on}
                      onFocus={() => setHover(r.id)} onBlur={() => setHover((h) => (h === r.id ? null : h))} onPointerEnter={() => setHover(r.id)} onPointerLeave={() => setHover((h) => (h === r.id ? null : h))}
                      onClick={() => click(r.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(selected === r.id ? null : r.id); } }} />
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>
      {hovered && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-ink px-2.5 py-1.5 text-[13px] text-white shadow-lg">
          <span className="font-semibold">{hovered.label}</span> <span className="num text-white/70">{fmtFt(hovered.rect.w)} × {fmtFt(hovered.rect.h)}, {Math.round(hovered.rect.w * hovered.rect.h)} sq ft</span>
        </div>
      )}
      <div className="no-print absolute bottom-3 right-3 flex overflow-hidden rounded-md bg-white shadow-[0_1px_3px_rgba(29,39,51,.2)] ring-1 ring-line">
        <button className="p-2 text-ink hover:bg-paper" aria-label="Zoom in" onClick={() => zoomAt(1.4, ...centre())}><Plus className="size-4" /></button>
        <button className="border-x border-line p-2 text-ink hover:bg-paper" aria-label="Zoom out" onClick={() => zoomAt(1 / 1.4, ...centre())}><Minus className="size-4" /></button>
        <button className="p-2 text-ink hover:bg-paper" aria-label="Fit to view" onClick={() => setView({ s: 1, x: 0, y: 0 })}><Maximize2 className="size-4" /></button>
      </div>
    </div>
  );
}
