import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Box, Download, Layers3, Link2, Loader2, Map as MapIcon, Printer } from "lucide-react";
import PlanView, { type Layers } from "../components/PlanView";
import RoomPanel from "../components/RoomPanel";
import Report from "../components/Report";
import BuildPanel from "../components/BuildPanel";
import AxonView from "../components/AxonView";
import Ideas from "../components/Ideas";
import Interiors from "../components/Interiors";
import AskArchitect from "../components/AskArchitect";
import { NumberField, Segmented, Toggle, cx } from "../components/ui";
import { useDesigns } from "../lib/useDesigns";
import { inputFromQuery, inputToQuery } from "../lib/share";
import { defaultSetbacks } from "../engine/design";
import { FT_PER_M } from "../engine/geometry";
import { setUnit, useUnit } from "../lib/units";
import FeedbackButton from "../components/Feedback";
import { styleById, type StyleId } from "../engine/interior";
import { renderPlanSvg } from "../render/planSvg";
import type { Facing, HouseInput } from "../engine/types";

const View3D = lazy(() => import("../components/View3D"));

type Tab = "room" | "report" | "build" | "interiors" | "ask";

export default function Designer() {
  const [params, setParams] = useSearchParams();
  const [input, setInput] = useState<HouseInput>(() => inputFromQuery(params.toString()));
  const [styleId, setStyleId] = useState<StyleId>((params.get("style") as StyleId) || "contemporary");
  const [opt, setOpt] = useState(0);
  const [floor, setFloor] = useState(0);
  const [view, setView] = useState<"plan" | "axon" | "3d">("plan");
  const [layers, setLayers] = useState<Layers>({ furniture: true, grid: false, dims: true, services: true, columns: false });
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("report");
  const [copied, setCopied] = useState(false);
  const { designs, busy } = useDesigns(input);
  const style = styleById(styleId);

  useEffect(() => { setParams(inputToQuery(input) + `&style=${styleId}`, { replace: true }); }, [input, styleId, setParams]);
  useEffect(() => { setOpt(0); setSelected(null); if (input.floors === 1) setFloor(0); }, [designs, input.floors]);
  useEffect(() => { document.title = `${input.bhk}BHK on a ${input.plotWidth}×${input.plotDepth} plot · VastuPlan`; }, [input]);

  const d = designs?.[Math.min(opt, (designs?.length ?? 1) - 1)];
  const set = <K extends keyof HouseInput>(k: K, v: HouseInput[K]) => setInput((i) => {
    const next = { ...i, [k]: v };
    const opposite = { N: "S", S: "N", E: "W", W: "E" } as const;
    if (next.corner && (next.corner === next.facing || next.corner === opposite[next.facing])) next.corner = undefined;
    return next;
  });
  const sb = input.setbacks ?? defaultSetbacks(input);
  const unit = useUnit();
  const metric = unit === "m";
  // length fields show the chosen unit; the engine always gets feet
  const toU = (ft: number) => (metric ? +(ft / FT_PER_M).toFixed(1) : ft);
  const toFt = (v: number) => (metric ? +(v * FT_PER_M).toFixed(1) : v);
  const lim = (lo: number, hi: number) => (metric ? { min: +(lo / FT_PER_M).toFixed(1), max: +(hi / FT_PER_M).toFixed(1), step: 0.1 } : { min: lo, max: hi, step: lo < 1 || hi < 31 ? 0.5 : 1 });
  const setSb = (k: "front" | "rear" | "side", v: number) => setInput((i) => {
    const cur = i.setbacks ?? defaultSetbacks(i);
    return { ...i, setbacks: k === "side" ? { ...cur, left: v, right: v } : { ...cur, [k]: v } };
  });
  const select = (id: string | null) => { setSelected(id); if (id) { setTab("room"); const lvl = Number(id.split("-")[0]); if (!Number.isNaN(lvl)) setFloor(lvl); } else if (tab === "room") setTab("report"); };

  const download = () => {
    if (!d) return;
    const f = d.floors[Math.min(floor, d.floors.length - 1)];
    const blob = new Blob([renderPlanSvg(d, f, { furniture: layers.furniture, vastuGrid: layers.grid, dims: true, services: layers.services, columns: layers.columns })], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `vastuplan-${input.plotWidth}x${input.plotDepth}-${input.facing}-${input.bhk}bhk-${f.level ? "first" : "ground"}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const share = async () => {
    const url = location.href;
    try { if (navigator.share) await navigator.share({ title: "My VastuPlan", url }); else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } } catch { /* cancelled */ }
  };

  const facingOpts = useMemo(() => (["N", "E", "S", "W"] as Facing[]).map((f) => ({ value: f, label: f, title: { N: "North", E: "East", S: "South", W: "West" }[f] })), []);

  return (
    <div className="lg:grid lg:h-[calc(100vh-4rem)] lg:grid-cols-[300px_1fr_380px]">
      {/* Inputs */}
      <aside className="no-print border-b border-line bg-white px-5 py-5 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[22px] leading-tight">Your plot</h1>
          <Segmented label="Units" value={unit} onChange={setUnit} options={[{ value: "ft", label: "feet" }, { value: "m", label: "metres" }]} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <NumberField key={`w${unit}`} id="w" label="Width along road" value={toU(input.plotWidth)} onChange={(v) => set("plotWidth", toFt(v))} {...lim(18, 100)} step={metric ? 0.1 : 1} suffix={unit} />
          <NumberField key={`d${unit}`} id="d" label="Depth" value={toU(input.plotDepth)} onChange={(v) => set("plotDepth", toFt(v))} {...lim(25, 120)} step={metric ? 0.1 : 1} suffix={unit} />
        </div>
        <details className="group mt-3 border-y border-line py-2" open={!!input.setbacks}>
          <summary className="flex cursor-pointer list-none items-center justify-between text-[13px]">
            <span><span className="font-semibold text-ink">Setbacks</span> <span className="num text-muted">front {toU(sb.front)}, rear {toU(sb.rear)}, sides {toU(sb.left)} {unit}{input.setbacks ? "" : " (typical)"}</span></span>
            <span className="text-cobalt group-open:hidden">Edit</span>
          </summary>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <NumberField key={`sf${unit}`} id="sbf" label="Front" value={toU(sb.front)} onChange={(v) => setSb("front", toFt(v))} {...lim(0, 30)} suffix={unit} />
            <NumberField key={`sr${unit}`} id="sbr" label="Rear" value={toU(sb.rear)} onChange={(v) => setSb("rear", toFt(v))} {...lim(0, 20)} suffix={unit} />
            <NumberField key={`ss${unit}`} id="sbs" label="Each side" value={toU(sb.left)} onChange={(v) => setSb("side", toFt(v))} {...lim(0, 15)} suffix={unit} />
          </div>
          <p className="mt-2 text-[12px] leading-snug text-muted">Open space your local body requires on each side. It varies by city and plot size, so copy it from your approved layout or the building bye-laws.{input.setbacks && <> <button type="button" className="font-medium text-cobalt underline" onClick={() => setInput((i) => ({ ...i, setbacks: undefined }))}>Use typical values</button></>}</p>
        </details>
        <div className="mt-4">
          <p className="text-[13px] font-semibold text-ink">Road on the</p>
          <div className="mt-1"><Segmented full label="Plot facing" value={input.facing} onChange={(v) => set("facing", v)} options={facingOpts} /></div>
        </div>
        <h2 className="mt-7 text-[17px]">Your home</h2>
        <div className="mt-3 space-y-3">
          <div><p className="text-[13px] font-semibold text-ink">Bedrooms</p><div className="mt-1"><Segmented full label="Bedrooms" value={input.bhk} onChange={(v) => set("bhk", v)} options={[1, 2, 3, 4].map((n) => ({ value: n as 1 | 2 | 3 | 4, label: `${n} BHK` }))} /></div></div>
          <div><p className="text-[13px] font-semibold text-ink">Floors</p><div className="mt-1"><Segmented full label="Floors" value={input.floors} onChange={(v) => set("floors", v)} options={[{ value: 1, label: "Ground" }, { value: 2, label: "Ground + 1" }]} /></div></div>
        </div>
        <div className="mt-4 divide-y divide-line border-y border-line">
          <Toggle checked={input.pooja} onChange={(v) => set("pooja", v)} label="Pooja room" />
          <Toggle checked={input.parking} onChange={(v) => set("parking", v)} label="Covered car parking" />
          <Toggle checked={input.utility} onChange={(v) => set("utility", v)} label="Utility / wash area" />
          <Toggle checked={input.study} onChange={(v) => set("study", v)} label="Study or work-from-home room" />
          {input.floors === 2 && <Toggle checked={input.groundBedroom} onChange={(v) => set("groundBedroom", v)} label="Bedroom on the ground floor" hint="For parents or guests who prefer no stairs" />}
          <Toggle checked={!!input.courtyard} onChange={(v) => set("courtyard", v)} label="Central courtyard (mutram)" hint="Open to the sky, keeps the centre open" />
        </div>
        <div className="mt-4">
          <p className="text-[13px] font-semibold text-ink">Corner plot</p>
          <div className="mt-1"><Segmented full label="Second road" value={input.corner ?? "none"} onChange={(v) => set("corner", v === "none" ? undefined : (v as Facing))}
            options={[{ value: "none", label: "No" }, ...(["N", "E", "S", "W"] as Facing[]).filter((f) => f !== input.facing && f !== ({ N: "S", S: "N", E: "W", W: "E" } as const)[input.facing]).map((f) => ({ value: f, label: `Road on ${f}` }))]} /></div>
        </div>
        <p className="mt-5 text-[12.5px] leading-relaxed text-muted">Every change redraws the plan. Three options are ranked by Vastu and livability together. Concept plans only, see the <Link to="/legal" className="text-cobalt">terms</Link>.</p>
        <div className="mt-8"><Ideas input={input} design={d} onApply={(p) => setInput((i) => ({ ...i, ...p }))} /></div>
      </aside>

      {/* Canvas */}
      <section className="no-print flex min-w-0 flex-col bg-stone p-3 sm:p-4 lg:overflow-hidden">
        <div className="no-print flex flex-wrap items-center gap-2">
          <div className="flex gap-1.5" role="tablist" aria-label="Plan options">
            {(designs ?? []).map((x, k) => (
              <button key={x.id} role="tab" aria-selected={k === opt} onClick={() => { setOpt(k); setSelected(null); }}
                className={cx("px-3 py-1.5 text-left ring-1 transition", k === opt ? "bg-ink text-white ring-ink" : "bg-white text-ink ring-line hover:ring-ink")}>
                <span className="block text-[13px] font-bold">Option {x.id}</span>
                <span className={cx("num block text-[11.5px]", k === opt ? "text-white/70" : "text-muted")}>Vastu {x.vastuScore}, livability {x.livabilityScore}</span>
              </button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Segmented label="View" value={view} onChange={setView} options={[{ value: "plan", label: <span className="flex items-center gap-1.5"><MapIcon className="size-4" />Plan</span> }, { value: "axon", label: <span className="flex items-center gap-1.5"><Layers3 className="size-4" />Axonometric</span> }, { value: "3d", label: <span className="flex items-center gap-1.5"><Box className="size-4" />3D</span> }]} />
            {d && d.floors.length > 1 && <Segmented label="Floor" value={floor} onChange={setFloor} options={[{ value: 0, label: "Ground" }, { value: 1, label: "First" }]} />}
          </div>
        </div>

        <div className="relative mt-3 min-h-[60vh] flex-1 lg:min-h-0">
          {!d && busy && <div className="flex h-full min-h-[60vh] items-center justify-center bg-white ring-1 ring-line"><Loader2 className="size-6 animate-spin text-muted" aria-label="Designing" /></div>}
          {!d && !busy && <div className="flex h-full min-h-[60vh] items-center justify-center bg-white p-8 text-center ring-1 ring-line"><div className="max-w-md text-left text-body">
            <p className="text-[17px] font-semibold text-ink">These rooms don't fit on this plot as a connected house.</p>
            <p className="mt-2">After setbacks, the area you can build on is about {Math.round(Math.max(0, input.plotWidth - sb.left - sb.right))} × {Math.round(Math.max(0, input.plotDepth - sb.front - sb.rear))} ft. Try:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {input.floors === 1 && input.bhk >= 2 && input.plotDepth - sb.front - sb.rear >= 31 && <li><button className="text-cobalt underline" onClick={() => set("floors", 2)}>Ground + 1</button>, with bedrooms upstairs</li>}
              {input.bhk > 1 && <li><button className="text-cobalt underline" onClick={() => set("bhk", (input.bhk - 1) as 1 | 2 | 3)}>{input.bhk - 1} BHK</button></li>}
              {input.parking && <li><button className="text-cobalt underline" onClick={() => set("parking", false)}>No covered parking</button></li>}
              {input.setbacks && <li><button className="text-cobalt underline" onClick={() => setInput((i) => ({ ...i, setbacks: undefined }))}>Typical setbacks</button>, if your authority allows</li>}
              {input.floors === 2 && input.plotDepth - sb.front - sb.rear < 31 && <li>A two-storey plan needs about 31 ft of buildable depth for a staircase and rooms front and back. On shallower plots, a single-storey 1 BHK works best.</li>}
            </ul>
          </div></div>}
          {d && view === "plan" && <PlanView design={d} floor={floor} layers={layers} selected={selected} onSelect={select} className="absolute inset-0" />}
          {d && view === "axon" && <AxonView design={d} floor={floor} className="absolute inset-0" />}
          {d && view === "3d" && <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center bg-white ring-1 ring-line"><Loader2 className="size-6 animate-spin text-muted" aria-label="Loading 3D" /></div>}><View3D design={d} floor={floor} style={style} selected={selected} onSelect={select} className="absolute inset-0" /></Suspense>}
          {busy && d && <div className="absolute right-3 top-3 flex items-center gap-1.5 bg-white/90 px-2.5 py-1 text-[12px] text-muted ring-1 ring-line"><Loader2 className="size-3.5 animate-spin" />Redrawing</div>}
        </div>

        <div className="no-print mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          {view === "plan" && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
              {([["furniture", "Furniture"], ["grid", "Vastu grid"], ["dims", "Dimensions"], ["services", "Sump, tank, septic"], ["columns", "Columns"]] as const).map(([k, l]) => (
                <label key={k} className="flex cursor-pointer items-center gap-1.5 text-ink"><input type="checkbox" className="accent-black" checked={!!layers[k]} onChange={(e) => setLayers((x) => ({ ...x, [k]: e.target.checked }))} />{l}</label>
              ))}
            </div>
          )}
          <div className="ml-auto flex gap-1">
            <button onClick={share} className="flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-semibold text-ink hover:bg-ink/5"><Link2 className="size-4" />{copied ? "Link copied" : "Share"}</button>
            <button onClick={download} disabled={!d} className="flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-semibold text-ink hover:bg-ink/5"><Download className="size-4" />Drawing</button>
            <FeedbackButton plan={inputToQuery(input)} />
            <button onClick={() => window.print()} disabled={!d} className="flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-semibold text-ink hover:bg-ink/5"><Printer className="size-4" />Print or PDF</button>
          </div>
        </div>
      </section>

      {/* Details */}
      <aside className="no-print border-t border-line bg-white lg:flex lg:flex-col lg:overflow-hidden lg:border-l lg:border-t-0">
        <div className="no-print flex border-b border-line px-2" role="tablist" aria-label="Details">
          {([["room", "Room"], ["report", "Vastu"], ["build", "Build"], ["interiors", "Interiors"], ["ask", "Ask"]] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} disabled={k === "room" && !selected}
              className={cx("border-b-2 px-2.5 py-3 text-[14px] font-medium transition-colors disabled:opacity-40", tab === k ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink")}>{l}</button>
          ))}
        </div>
        <div className="px-5 py-5 lg:flex-1 lg:overflow-y-auto">
          {!d ? <p className="text-muted">Your plan will appear here.</p>
            : tab === "room" && selected ? <RoomPanel design={d} roomId={selected} style={style} onClose={() => select(null)} />
            : tab === "build" ? <BuildPanel design={d} />
            : tab === "interiors" ? <Interiors design={d} style={style} onStyle={setStyleId} />
            : tab === "ask" ? <AskArchitect key={d.id + JSON.stringify(input)} design={d} />
            : <Report design={d} />}
        </div>
      </aside>

      {/* Print layout */}
      {d && (
        <div className="hidden print:block">
          <h1 className="text-2xl">{input.bhk}BHK on a {toU(input.plotWidth)} × {toU(input.plotDepth)} {unit} {({ N: "north", E: "east", S: "south", W: "west" })[input.facing]}-facing plot, option {d.id}</h1>
          {d.floors.map((f) => <div key={f.level} className="print-page"><h2 className="mt-4 text-lg">{f.name}</h2><div dangerouslySetInnerHTML={{ __html: renderPlanSvg(d, f, { furniture: true, dims: true, services: true, columns: true }) }} /></div>)}
          <Report design={d} />
          <BuildPanel design={d} />
          <p className="mt-6 text-xs text-muted">Concept plan generated by VastuPlan. Not for construction. A licensed architect must prepare approval drawings and a structural engineer must design the structure.</p>
        </div>
      )}
    </div>
  );
}
