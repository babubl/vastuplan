import { useEffect, useRef, useState } from "react";
import type { HouseDesign, HouseInput } from "../engine/types";

/** Runs the layout search in a Web Worker (it can take a second on large plots) and keeps the latest result. */
export function useDesigns(input: HouseInput, delay = 250) {
  const [designs, setDesigns] = useState<HouseDesign[] | null>(null);
  const [busy, setBusy] = useState(true);
  const worker = useRef<Worker | null>(null);
  const seq = useRef(0);
  useEffect(() => {
    worker.current = new Worker(new URL("../engine/worker.ts", import.meta.url), { type: "module" });
    worker.current.onmessage = (e: MessageEvent<{ id: number; designs: HouseDesign[] }>) => {
      if (e.data.id !== seq.current) return;
      setDesigns(e.data.designs);
      setBusy(false);
    };
    return () => worker.current?.terminate();
  }, []);
  const key = JSON.stringify(input);
  useEffect(() => {
    setBusy(true);
    const t = setTimeout(() => { seq.current += 1; worker.current?.postMessage({ id: seq.current, input }); }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, delay]);
  return { designs, busy };
}
