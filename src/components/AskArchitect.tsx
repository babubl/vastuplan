import { useState } from "react";
import { ArrowUp } from "lucide-react";
import { config, aiEnabled } from "../config";
import { summarise } from "../lib/summary";
import { prefOf, ZONES } from "../engine/vastu";
import type { HouseDesign } from "../engine/types";
import { cx } from "./ui";

interface Msg { role: "user" | "assistant"; text: string }

const STARTERS = ["Why is the kitchen where it is?", "Is the master bedroom good for Vastu?", "What would you change in this plan?", "Where should the water tank go?"];

/** Answers from the plan itself when the AI architect is not connected. */
function localAnswer(q: string, d: HouseDesign): string {
  const all = d.floors.flatMap((f) => f.rooms);
  const find = (t: string) => all.find((r) => r.type === t);
  const lower = q.toLowerCase();
  const about = (t: string, name: string) => {
    const r = find(t); if (!r) return `This plan has no ${name}.`;
    const fit = prefOf(r.type, r.zone);
    return `The ${r.label.toLowerCase()} is in the ${r.zone} zone (${ZONES[r.zone].name}). ${fit >= 0.85 ? "That is the ideal zone for it." : fit >= 0.45 ? "That is an accepted zone for it." : "That is not a preferred zone; the plot's shape and the other rooms pushed it there."} ${d.vastu.find((c) => c.id === (t === "master" ? "master" : t))?.detail ?? ""}`;
  };
  if (lower.includes("kitchen")) return about("kitchen", "kitchen");
  if (lower.includes("master") || lower.includes("bedroom")) return about("master", "master bedroom");
  if (lower.includes("pooja") || lower.includes("prayer")) return about("pooja", "pooja room");
  if (lower.includes("stair")) return about("stair", "staircase");
  if (lower.includes("tank") || lower.includes("sump") || lower.includes("septic") || lower.includes("bore")) return d.notes.slice(0, 2).join(" ");
  if (lower.includes("change") || lower.includes("improve")) {
    const weak = [...d.vastu, ...d.livability].filter((c) => c.status !== "pass");
    return weak.length ? `The points I would look at: ${weak.slice(0, 3).map((c) => `${c.title.toLowerCase()} (${c.detail})`).join(" ")} Try the other options above, or change the plot facing or rooms on the left.` : "Every Vastu and livability check passes. The next step is a licensed architect to turn it into approval drawings.";
  }
  return "The full architect chat isn't connected yet. Tap a room on the plan to see its zone, size and interior scheme, and open the Vastu report for the reasoning behind each room.";
}

export default function AskArchitect({ design }: { design: HouseDesign }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async (q: string) => {
    q = q.trim(); if (!q || busy) return;
    setInput("");
    const next = [...msgs, { role: "user" as const, text: q }];
    setMsgs(next);
    if (!aiEnabled) { setMsgs([...next, { role: "assistant", text: localAnswer(q, design) }]); return; }
    setBusy(true);
    try {
      const res = await fetch(`${config.askUrl}/ask`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next, plan: summarise(design) }) });
      const data = (await res.json()) as { text?: string };
      setMsgs([...next, { role: "assistant", text: data.text ?? localAnswer(q, design) }]);
    } catch { setMsgs([...next, { role: "assistant", text: localAnswer(q, design) }]); }
    setBusy(false);
  };
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3" aria-live="polite">
        {!msgs.length && <div className="flex flex-wrap gap-2">{STARTERS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full bg-white px-3 py-1.5 text-[13px] font-medium text-ink ring-1 ring-line hover:ring-ink">{s}</button>)}</div>}
        {msgs.map((m, i) => <div key={i} className={cx("flex", m.role === "user" && "justify-end")}><p className={cx("max-w-[90%] whitespace-pre-line px-3.5 py-2.5 text-[14px] leading-relaxed", m.role === "user" ? "bg-ink text-white" : "bg-white text-body ring-1 ring-line")}>{m.text}</p></div>)}
        {busy && <p className="text-sm text-muted">Looking at your plan…</p>}
      </div>
      <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <label htmlFor="ask" className="sr-only">Ask about this plan</label>
        <input id="ask" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about this plan" className="min-w-0 flex-1 border border-line bg-white px-3 py-2.5 text-[15px] outline-none focus:border-ink" />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="flex size-11 items-center justify-center bg-ink text-white disabled:opacity-40"><ArrowUp className="size-5" /></button>
      </form>
    </div>
  );
}
