/** Apartment planner: Vastu audit and furnishing for an existing flat, room by room. */
import { furnish } from "./furniture";
import { prefOf } from "./vastu";
import type { Check, CheckStatus, Facing, Furniture, Opening, Room, RoomType, Zone } from "./types";

export type Wall = "N" | "E" | "S" | "W";
export interface FlatRoom { id: string; type: RoomType; label: string; width: number; length: number; zone: Zone; door: Wall; window: Wall | "none" }
export interface FlatInput { entrance: Facing; rooms: FlatRoom[] }

const status = (s: number): CheckStatus => (s >= 0.85 ? "pass" : s >= 0.45 ? "partial" : "fail");

export function auditFlat(f: FlatInput): { checks: Check[]; score: number } {
  const checks: Check[] = [];
  const entrance = { E: 1, N: 1, W: 0.6, S: 0.45 }[f.entrance];
  checks.push({ id: "entrance", title: "Main door direction", weight: 10, score: entrance, status: status(entrance), detail: `The main door faces ${({ N: "north", E: "east", S: "south", W: "west" })[f.entrance]}. ${entrance >= 0.85 ? "East and north are the most favoured directions." : "Workable: Vastu favours the auspicious padas on this side, usually the middle-to-east stretch of a south door or middle-to-north of a west door."}` });
  const W: Partial<Record<RoomType, number>> = { kitchen: 10, master: 10, pooja: 6, toilet: 8, living: 5, bedroom: 4, study: 3 };
  for (const r of f.rooms) {
    const w = W[r.type]; if (!w) continue;
    const s = prefOf(r.type, r.zone);
    checks.push({ id: r.id, title: `${r.label} in the ${r.zone === "C" ? "centre" : r.zone}`, weight: w, score: s, status: status(s), detail: s >= 0.85 ? "Ideal zone for this room." : s >= 0.45 ? "An accepted zone for this room." : r.type === "toilet" ? "Toilets in the north-east, centre or south-west are traditionally avoided. Keep it spotless, with the door closed and the exhaust running." : "Not a preferred zone. Furniture placement and colours below help balance it." });
  }
  const tw = checks.reduce((a, c) => a + c.weight, 0);
  return { checks, score: Math.round((checks.reduce((a, c) => a + c.weight * c.score, 0) / tw) * 100) };
}

/** Furnish one room on its own, with its door and window where the user said they are. */
export function furnishRoom(fr: FlatRoom): { room: Room; openings: Opening[]; furniture: Furniture[] } {
  const room: Room = { id: fr.id, type: fr.type, label: fr.label, rect: { x: 0, y: 0, w: fr.width, h: fr.length }, zone: fr.zone };
  const R = room.rect;
  const seg = (side: Wall, len: number, at: number): Omit<Opening, "a" | "b" | "kind"> => {
    const L = side === "N" || side === "S" ? R.w : R.h;
    const c = Math.max(len / 2 + 0.5, Math.min(L - len / 2 - 0.5, L * at));
    switch (side) {
      case "N": return { x1: c - len / 2, y1: 0, x2: c + len / 2, y2: 0 };
      case "S": return { x1: c - len / 2, y1: R.h, x2: c + len / 2, y2: R.h };
      case "W": return { x1: 0, y1: c - len / 2, x2: 0, y2: c + len / 2 };
      case "E": return { x1: R.w, y1: c - len / 2, x2: R.w, y2: c + len / 2 };
    }
  };
  const openings: Opening[] = [{ ...seg(fr.door, fr.type === "toilet" ? 2.5 : 3, 0.2), a: room.id, b: "out", into: room.id, kind: "door" }];
  if (fr.window !== "none") openings.push({ ...seg(fr.window, Math.min(fr.type === "toilet" ? 2 : 5, (fr.window === "N" || fr.window === "S" ? R.w : R.h) - 2), 0.5), a: room.id, b: "out", kind: fr.type === "toilet" ? "ventilator" : "window" });
  return { room, openings, furniture: furnish(room, openings) };
}

export const DEFAULT_FLAT: FlatInput = {
  entrance: "E",
  rooms: [
    { id: "r1", type: "living", label: "Living", width: 12, length: 15, zone: "NE", door: "E", window: "N" },
    { id: "r2", type: "kitchen", label: "Kitchen", width: 8, length: 10, zone: "SE", door: "W", window: "E" },
    { id: "r3", type: "master", label: "Master bedroom", width: 12, length: 13, zone: "SW", door: "N", window: "S" },
    { id: "r4", type: "bedroom", label: "Bedroom 2", width: 11, length: 11, zone: "NW", door: "E", window: "W" },
    { id: "r5", type: "toilet", label: "Toilet", width: 5, length: 8, zone: "W", door: "E", window: "W" },
  ],
};
