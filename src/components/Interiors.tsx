import { fmtFt } from "../engine/geometry";
import { schemeFor, STYLES, type InteriorStyle, type StyleId } from "../engine/interior";
import type { HouseDesign } from "../engine/types";
import { Swatch } from "./RoomPanel";
import { cx } from "./ui";

export function StylePicker({ value, onChange }: { value: StyleId; onChange: (s: StyleId) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Interior style">
      {STYLES.map((s) => (
        <button key={s.id} role="radio" aria-checked={value === s.id} onClick={() => onChange(s.id)}
          className={cx(" bg-white p-2.5 text-left ring-1 transition", value === s.id ? "ring-2 ring-ink" : "ring-line hover:ring-ink/30")}>
          <span className="flex h-6 overflow-hidden rounded" aria-hidden>{[s.floors.living.hex, s.wood.hex, s.fabric.hex, s.accent.hex].map((h) => <span key={h} className="flex-1" style={{ background: h }} />)}</span>
          <span className="mt-2 block text-[13px] font-semibold leading-tight text-ink">{s.name}</span>
        </button>
      ))}
    </div>
  );
}

export default function Interiors({ design, style, onStyle }: { design: HouseDesign; style: InteriorStyle; onStyle: (s: StyleId) => void }) {
  const rooms = design.floors.flatMap((f) => f.rooms).filter((r) => ["living", "dining", "kitchen", "master", "bedroom", "pooja", "study", "lounge", "toilet"].includes(r.type) && !(r.type === "toilet" && r.owner));
  return (
    <div>
      <StylePicker value={style.id} onChange={onStyle} />
      <p className="mt-3 text-[14px] text-body">{style.summary}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {rooms.map((r) => {
          const s = schemeFor(r, style);
          return (
            <article key={r.id} className=" bg-white p-4 ring-1 ring-line">
              <div className="mb-3 flex h-16 overflow-hidden" aria-hidden>
                <span className="flex-[3]" style={{ background: s.wall.hex }} />
                <span className="flex-[2]" style={{ background: s.floor.hex }} />
                <span className="flex-1" style={{ background: s.wood.hex }} />
                <span className="w-4" style={{ background: s.accent.hex }} />
              </div>
              <h4 className="font-bold text-ink">{r.label}</h4>
              <p className="num text-[12.5px] text-muted">{fmtFt(r.rect.w)} × {fmtFt(r.rect.h)}, {r.zone === "C" ? "centre" : r.zone} zone</p>
              <div className="mt-3 grid gap-2.5">
                <Swatch hex={s.wall.hex} name={s.wall.name} sub="Walls" />
                <Swatch hex={s.floor.hex} name={s.floor.name} sub={s.floor.material} />
              </div>
              {s.lighting && <p className="mt-3 text-[12.5px] text-body">{s.lighting}</p>}
            </article>
          );
        })}
      </div>
    </div>
  );
}
