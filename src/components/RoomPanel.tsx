import { X } from "lucide-react";
import { fmtFt } from "../engine/geometry";
import { prefOf, ZONES } from "../engine/vastu";
import { schemeFor, type InteriorStyle } from "../engine/interior";
import type { HouseDesign } from "../engine/types";

const SQM = 10.7639;

export function Swatch({ hex, name, sub }: { hex: string; name: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="size-8 shrink-0 rounded-md ring-1 ring-black/10" style={{ background: hex }} aria-hidden />
      <span className="min-w-0 leading-tight"><span className="block text-[13.5px] font-semibold text-ink">{name}</span>{sub && <span className="block text-[12px] text-muted">{sub}</span>}</span>
    </div>
  );
}

export default function RoomPanel({ design, roomId, style, onClose }: { design: HouseDesign; roomId: string; style: InteriorStyle; onClose: () => void }) {
  const room = design.floors.flatMap((f) => f.rooms).find((r) => r.id === roomId);
  if (!room) return null;
  const furn = design.floors.flatMap((f) => f.furniture).filter((f) => f.room === room.id && f.label);
  const fit = prefOf(room.type, room.zone);
  const s = schemeFor(room, style);
  const sq = room.rect.w * room.rect.h;
  const verdict = fit >= 0.85 ? { t: "Ideal zone for this room", c: "text-neem" } : fit >= 0.45 ? { t: "Acceptable zone for this room", c: "text-[#9A6B00]" } : { t: "Not a recommended zone for this room", c: "text-chilli" };
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl">{room.label}</h3>
          <p className="num mt-0.5 text-[14px] text-muted">{fmtFt(room.rect.w)} × {fmtFt(room.rect.h)}, {Math.round(sq)} sq ft ({(sq / SQM).toFixed(1)} m²)</p>
        </div>
        <button onClick={onClose} className="rounded p-1 text-muted hover:bg-ink/5 hover:text-ink" aria-label="Close room details"><X className="size-5" /></button>
      </div>
      <div className="mt-4 rounded-md bg-paper p-3">
        <p className="text-[13.5px] text-ink"><span className="font-semibold">{room.zone === "C" ? "Centre" : room.zone}</span> zone, {ZONES[room.zone].name}</p>
        <p className="mt-0.5 text-[13px] text-muted">{ZONES[room.zone].meaning}</p>
        {!["passage", "store", "sitout", "balcony", "dress"].includes(room.type) && <p className={`mt-2 text-[13px] font-semibold ${verdict.c}`}>{verdict.t}</p>}
      </div>
      {!room.open && room.type !== "passage" && room.type !== "stair" && (
        <div className="mt-5 space-y-3">
          <p className="text-[13px] font-semibold text-ink">Interior, {style.name.toLowerCase()}</p>
          <Swatch hex={s.wall.hex} name={s.wall.name} sub="Walls, suited to this zone" />
          <Swatch hex={s.floor.hex} name={s.floor.name} sub={s.floor.material} />
          <Swatch hex={s.accent.hex} name={s.accent.name} sub="Accent wall or soft furnishings" />
          <Swatch hex={s.wood.hex} name={s.wood.name} sub={`Woodwork, with ${s.metal.toLowerCase()} fittings`} />
          {s.lighting && <p className="text-[13px] text-body"><span className="font-semibold text-ink">Lighting.</span> {s.lighting}</p>}
          {s.tip && <p className="text-[13px] text-body"><span className="font-semibold text-ink">Vastu tip.</span> {s.tip}</p>}
        </div>
      )}
      {furn.length > 0 && (
        <div className="mt-5">
          <p className="text-[13px] font-semibold text-ink">Furniture shown</p>
          <ul className="mt-1.5 space-y-1 text-[13px] text-body">{furn.map((f, k) => <li key={k} className="flex justify-between gap-3"><span>{f.label}</span><span className="num text-muted">{fmtFt(f.rect.w)} × {fmtFt(f.rect.h)}</span></li>)}</ul>
        </div>
      )}
    </div>
  );
}
