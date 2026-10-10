import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { MessageSquare, X } from "lucide-react";
import { config } from "../config";
import { cx } from "./ui";

const ISSUES = "https://github.com/babubl/vastuplan/issues/new";

/** "Send feedback" form. Posts to the worker when it is configured, otherwise opens a GitHub issue. */
export function FeedbackDialog({ open, onClose, plan }: { open: boolean; onClose: () => void; plan?: string }) {
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const box = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = box.current; if (!d) return;
    if (open && !d.open) { setState("idle"); d.showModal?.(); }
    if (!open && d.open) d.close();
  }, [open]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 3) return;
    const page = location.pathname + location.search;
    if (!config.askUrl) {
      const body = `${message}\n\nRating: ${rating ?? "-"}\nPage: ${page}`;
      window.open(`${ISSUES}?title=${encodeURIComponent("Feedback: " + message.slice(0, 60))}&body=${encodeURIComponent(body)}`, "_blank", "noopener");
      setState("sent");
      return;
    }
    setState("sending");
    try {
      const r = await fetch(`${config.askUrl}/feedback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, contact, rating, page, plan }) });
      if (!r.ok) throw new Error(String(r.status));
      setState("sent"); setMessage(""); setContact(""); setRating(null);
    } catch { setState("error"); }
  };

  return (
    <dialog ref={box} onClose={onClose} onClick={(e) => { if (e.target === box.current) onClose(); }}
      className="m-auto w-[min(520px,calc(100vw-32px))] bg-white p-0 text-ink shadow-xl backdrop:bg-ink/40">
      <form onSubmit={send} className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[22px] leading-tight">Tell us what to fix</h2>
            <p className="mt-1 text-[13.5px] text-muted">VastuPlan is in beta. A wrong room, a Vastu rule you disagree with, a plot it can't handle: every note is read.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-muted hover:text-ink" aria-label="Close"><X className="size-5" /></button>
        </div>
        {state === "sent" ? (
          <div className="mt-6">
            <p className="text-[16px] font-semibold">Thank you. Your note has been sent.</p>
            <button type="button" onClick={onClose} className="mt-5 bg-ink px-5 py-2.5 text-[14px] font-medium text-white hover:bg-cobalt">Close</button>
          </div>
        ) : (
          <>
            <fieldset className="mt-5">
              <legend className="text-[13px] font-semibold">How useful was the plan?</legend>
              <div className="mt-1.5 flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" aria-pressed={rating === n} onClick={() => setRating(n)}
                    className={cx("num size-9 border text-[14px] font-medium", rating === n ? "border-ink bg-ink text-white" : "border-line hover:border-ink")}>{n}</button>
                ))}
              </div>
            </fieldset>
            <label className="mt-4 block">
              <span className="text-[13px] font-semibold">Your feedback</span>
              <textarea required minLength={3} maxLength={3000} rows={5} value={message} onChange={(e) => setMessage(e.target.value)}
                className="mt-1 block w-full border border-line p-2.5 text-[15px] outline-none focus:border-ink" placeholder="The kitchen on my 30×50 west-facing plot should be…" />
            </label>
            <label className="mt-3 block">
              <span className="text-[13px] font-semibold">Email or phone <span className="font-normal text-muted">(optional, only if you want a reply)</span></span>
              <input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} className="mt-1 block w-full border-b border-line py-2 text-[15px] outline-none focus:border-ink" />
            </label>
            <p className="mt-3 text-[12px] text-muted">{plan ? "Your current plot settings are attached so we can reproduce the plan. " : ""}See the <Link to="/legal#privacy" onClick={onClose} className="text-cobalt">privacy note</Link>.</p>
            {state === "error" && <p className="mt-2 text-[13px] text-chilli">Couldn't send just now. Please try again in a minute.</p>}
            <button disabled={state === "sending" || message.trim().length < 3} className="mt-5 bg-ink px-5 py-2.5 text-[14px] font-medium text-white hover:bg-cobalt disabled:opacity-50">{state === "sending" ? "Sending…" : "Send feedback"}</button>
          </>
        )}
      </form>
    </dialog>
  );
}

export default function FeedbackButton({ plan, className, label = "Feedback" }: { plan?: string; className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className ?? "flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-semibold text-ink hover:bg-ink/5"}><MessageSquare className="size-4" />{label}</button>
      {createPortal(<FeedbackDialog open={open} onClose={() => setOpen(false)} plan={plan} />, document.body)}
    </>
  );
}
