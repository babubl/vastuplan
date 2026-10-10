import { useSyncExternalStore } from "react";
import { displayUnit, setDisplayUnit } from "../engine/geometry";

export type Unit = "ft" | "m";
const listeners = new Set<() => void>();

try { const saved = localStorage.getItem("vp-unit"); if (saved === "m" || saved === "ft") setDisplayUnit(saved); } catch { /* storage blocked */ }

export function setUnit(u: Unit) {
  setDisplayUnit(u);
  try { localStorage.setItem("vp-unit", u); } catch { /* storage blocked */ }
  listeners.forEach((l) => l());
}

/** Current display unit; components re-render when it changes. */
export function useUnit(): Unit {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, displayUnit, () => "ft");
}
