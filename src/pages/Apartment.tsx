import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { auditFlat, DEFAULT_FLAT, furnishRoom, type FlatInput, type FlatRoom, type Wall } from "../engine/apartment";
import { renderRoomSvg } from "../render/planSvg";
import { schemeFor, styleById, type StyleId } from "../engine/interior";
import { prefOf, ZONES } from "../engine/vastu";
import { StylePicker } from "../components/Interiors";
import { Swatch } from "../components/RoomPanel";
import { Container, Score, Segmented, cx } from "../components/ui";
import type { Facing, RoomType, Zone } from "../engine/types";

const TYPES: { value: RoomType; label: string }[] = [
  { value: "living", label: "Living" }, { value: "dining", label: "Dining" }, { value: "kitchen", label: "Kitchen" }, { value: "master", label: "Master bedroom" },
  { value: "bedroom", label: "Bedroom" }, { value: "toilet", label: "Toilet" }, { value: "pooja", label: "Pooja" }, { value: "study", label: "Study" }, { value: "utility", label: "Utility" },
];
const GRID: Zone[] = ["NW", "N", "NE", "W", "C", "E", "SW", "S", "SE"];
const WALLS: Wall[] = ["N", "E", "S", "W"];

function ZonePicker({ value, onChange, label }: { value: Zone; onChange: (z: Zone) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid w-[84px] grid-cols-3 gap-0.5">
      {GRID.map((z) => <button key={z} type="button" role="radio" aria-checked={value === z} title={`${z === "C" ? "Centre" : z} (${ZONES[z].name})`} onClick={() => onChange(z)}
        className={cx("h-6 rounded-sm text-[10px] font-bold", value === z ? "bg-indigo text-white" : "bg-ink/[0.06] text-muted hover:bg-ink/15")}>{z}</button>)}
    </div>
  );
}

const sel = "rounded-md border border-line bg-white px-2 py-1.5 text-[14px] text-ink outline-none focus:border-indigo";

export default function Apartment() {
  const [flat, setFlat] = useState<FlatInput>(DEFAULT_FLAT);
  const [styleId, setStyleId] = useState<StyleId>("contemporary");
  const style = styleById(styleId);
  const audit = useMemo(() => auditFlat(flat), [flat]);
  const furnished = useMemo(() => flat.rooms.map((r) => ({ fr: r, ...furnishRoom(r) })), [flat]);
  const update = (id: string, patch: Partial<FlatRoom>) => setFlat((f) => ({ ...f, rooms: f.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  const add = () => setFlat((f) => ({ ...f, rooms: [...f.rooms, { id: `r${Date.now()}`, type: "bedroom", label: `Bedroom ${f.rooms.filter((r) => r.type === "bedroom").length + 2}`, width: 10, length: 11, zone: "W", door: "E", window: "W" }] }));

  return (
    <Container className="py-10">
      <h1 className="text-[34px] leading-tight sm:text-[44px]">Plan your apartment</h1>
      <p className="mt-3 max-w-2xl text-[17px] text-body">You can't move the walls, but you can choose how each room is used and furnished. List your rooms, mark where each one sits in the flat, and see the Vastu check, a furnished layout and an interior scheme for every room.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="min-w-0 rounded-lg bg-white p-5 ring-1 ring-line">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg">Your rooms</h2>
            <div className="flex items-center gap-2 text-[13px]"><span className="font-semibold text-ink">Main door faces</span>
              <Segmented label="Main door faces" value={flat.entrance} onChange={(v: Facing) => setFlat((f) => ({ ...f, entrance: v }))} options={(["N", "E", "S", "W"] as Facing[]).map((x) => ({ value: x, label: x }))} /></div>
          </div>
          <p className="mt-2 text-[13px] text-muted">Zone: where the room sits within the flat, north at the top. Door and window: which wall of the room they are on.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="text-muted"><tr><th className="pb-2 font-semibold">Room</th><th className="pb-2 font-semibold">Size (ft)</th><th className="pb-2 font-semibold">Zone</th><th className="pb-2 font-semibold">Door</th><th className="pb-2 font-semibold">Window</th><th /></tr></thead>
              <tbody className="divide-y divide-line">
                {flat.rooms.map((r) => (
                  <tr key={r.id} className="align-middle">
                    <td className="py-2 pr-2">
                      <select aria-label="Room type" className={sel} value={r.type} onChange={(e) => update(r.id, { type: e.target.value as RoomType, label: TYPES.find((t) => t.value === e.target.value)!.label })}>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
                    </td>
                    <td className="py-2 pr-2"><span className="flex items-center gap-1">
                      <input aria-label="Width in feet" type="number" min={4} max={30} value={r.width} onChange={(e) => update(r.id, { width: Math.max(4, Math.min(30, Number(e.target.value) || 4)) })} className={cx(sel, "num w-14")} />×
                      <input aria-label="Length in feet" type="number" min={4} max={30} value={r.length} onChange={(e) => update(r.id, { length: Math.max(4, Math.min(30, Number(e.target.value) || 4)) })} className={cx(sel, "num w-14")} /></span></td>
                    <td className="py-2 pr-2"><ZonePicker label={`${r.label} zone`} value={r.zone} onChange={(z) => update(r.id, { zone: z })} /></td>
                    <td className="py-2 pr-2"><select aria-label="Door wall" className={sel} value={r.door} onChange={(e) => update(r.id, { door: e.target.value as Wall })}>{WALLS.map((w) => <option key={w}>{w}</option>)}</select></td>
                    <td className="py-2 pr-2"><select aria-label="Window wall" className={sel} value={r.window} onChange={(e) => update(r.id, { window: e.target.value as Wall | "none" })}>{[...WALLS, "none"].map((w) => <option key={w} value={w}>{w === "none" ? "None" : w}</option>)}</select></td>
                    <td className="py-2"><button aria-label={`Remove ${r.label}`} onClick={() => setFlat((f) => ({ ...f, rooms: f.rooms.filter((x) => x.id !== r.id) }))} className="rounded p-1.5 text-muted hover:bg-ink/5 hover:text-chilli"><Trash2 className="size-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={add} className="mt-3 inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[14px] font-semibold text-indigo hover:bg-indigo-50"><Plus className="size-4" />Add a room</button>
        </section>

        <section>
          <Score value={audit.score} label="Vastu score for this flat" size="lg" />
          <ul className="mt-5 space-y-3">
            {audit.checks.map((c) => <li key={c.id} className="text-[14px]"><span className={cx("font-semibold", c.status === "pass" ? "text-neem" : c.status === "partial" ? "text-[#8A5F00]" : "text-chilli")}>{c.title}.</span> <span className="text-body">{c.detail}</span></li>)}
          </ul>
        </section>
      </div>

      <section className="mt-12">
        <h2 className="text-[26px]">Room by room</h2>
        <div className="mt-4 max-w-2xl"><StylePicker value={styleId} onChange={setStyleId} /></div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {furnished.map(({ fr, room, openings, furniture }) => {
            const s = schemeFor(room, style);
            const fit = prefOf(room.type, room.zone);
            return (
              <article key={fr.id} className="rounded-lg bg-white p-4 ring-1 ring-line">
                <div className="flex items-baseline justify-between gap-2"><h3 className="text-[17px]">{fr.label}</h3><span className="num text-[12.5px] text-muted">{fr.width} × {fr.length} ft</span></div>
                <p className={cx("text-[12.5px] font-semibold", fit >= 0.85 ? "text-neem" : fit >= 0.45 ? "text-[#8A5F00]" : "text-chilli")}>{fr.zone === "C" ? "Centre" : fr.zone} zone, {fit >= 0.85 ? "ideal" : fit >= 0.45 ? "acceptable" : "not preferred"}</p>
                <div className="mt-3 aspect-[4/3] rounded-md bg-paper p-2 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: renderRoomSvg(room, openings, furniture) }} />
                <div className="mt-3 grid grid-cols-2 gap-2.5"><Swatch hex={s.wall.hex} name={s.wall.name} sub="Walls" /><Swatch hex={s.floor.hex} name={s.floor.name} sub="Floor" /></div>
                {s.tip && <p className="mt-3 text-[12.5px] text-body">{s.tip}</p>}
              </article>
            );
          })}
        </div>
      </section>
    </Container>
  );
}
