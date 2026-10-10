/**
 * The "brief": which rooms a home needs, with architect's size ranges (feet).
 * W = width along the band (frontage direction), D = depth across the band.
 */
import type { Band, HouseInput, RoomType } from "./types";

export type Place = "full" | "inner" | "outer";

export interface Spec {
  key: string;
  type: RoomType;
  label: string;
  bands: Band[];
  minW: number; idealW: number; maxW: number;
  minD: number; idealD: number; maxD: number;
  /** Where the room sits in a band deeper than it needs: against the middle band, or the outside wall. */
  place: Place;
  /** Attached toilet + dress column. */
  suite?: boolean;
  /** Must sit next to this room in the band. */
  nextTo?: string;
  /** Should sit next to this room if they share a band. */
  nearTo?: string;
  /** Proxy weight in the layout search. */
  weight: number;
  /** Circulation spaces other rooms can open off. */
  hub?: boolean;
}

const S = (key: string, type: RoomType, label: string, bands: Band[], w: [number, number, number], d: [number, number, number], place: Place, weight: number, extra: Partial<Spec> = {}): Spec =>
  ({ key, type, label, bands, minW: w[0], idealW: w[1], maxW: w[2], minD: d[0], idealD: d[1], maxD: d[2], place, weight, ...extra });

export const SUITE_W = 5;
export const SUITE = { min: 4.5, ideal: 5, max: 5.5 };
export const TOILET_D = 7.5;

/** Attached toilets for every bedroom need frontage; below about 34 ft, secondary bedrooms share a toilet. */
export const allSuites = (frontage: number) => frontage >= 34;

export function groundProgram(i: HouseInput, frontage = 40, depth = 40): Spec[] {
  const two = i.floors === 2;
  const suites = allSuites(frontage);
  // Shallow plots cannot take three bands: living and dining become one room.
  const compact = depth < 31 && !two;
  const p: Spec[] = [
    S("living", "living", compact ? "Living & dining" : "Living", ["front"], [10, 15, 22], [11, 13, 18], "outer", 2, { hub: true }),
    ...(compact ? [] : [S("dining", "dining", "Dining", ["middle"], [8.5, 12, 22], [8.5, 10.5, 14], "full", 1.5, { hub: true })]),
    S("kitchen", "kitchen", "Kitchen", ["rear", "middle", "front"], [7, 10, 12], [8, 10, 13], "outer", 3),
  ];
  if (i.utility) p.push(S("utility", "utility", "Utility", ["rear", "middle"], [3.5, 5, 6], [5, 7, 9], "outer", 1, { nearTo: "kitchen" }));
  if (i.pooja) p.push(S("pooja", "pooja", "Pooja", ["front", "middle", "rear"], [4, 5, 6], [4, 5, 6.5], "inner", 2.5));
  if (i.parking) p.push(S("parking", "parking", "Car parking", ["front"], [9.5, 10, 11], [15, 17, 18], "outer", 1.5));
  if (i.courtyard) p.push(S("court", "courtyard", "Courtyard", ["middle"], [8, 11, 14], [8, 10, 14], "full", 2.5, { hub: true }));
  if (two) p.push(S("stair", "stair", "Staircase", ["middle", "rear", "front"], [7, 7.5, 8], [10.5, 11, 12], "inner", 2.5));

  if (!two) {
    p.push(S("master", "master", "Master bedroom", ["rear", "front", "middle"], [10, 13, 16], [11, 12.5, 15], "full", 3, { suite: i.bhk >= 2 }));
    for (let n = 2; n <= i.bhk; n++) p.push(S(`bed${n}`, "bedroom", `Bedroom ${n}`, n === 3 ? ["rear", "front", "middle"] : ["rear", "front"], [9.5, 11.5, 14], [10, 11.5, 14], "full", 1.2, { suite: i.bhk >= 3 && suites }));
    p.push(S("toilet", "toilet", "Common toilet", ["middle", "rear", "front"], [4.5, 5, 6], [6.5, 7.5, 8.5], "outer", 2.5));
    if (i.study) p.push(S("study", "study", "Study", ["front", "rear"], [8, 9, 11], [8, 9, 11], "inner", 1));
  } else {
    if (i.groundBedroom) p.push(S("bedG", "bedroom", "Parents' bedroom", ["rear", "front"], [10, 12, 14], [10, 11.5, 14], "full", 1.5, { suite: suites }));
    p.push(S("toilet", "toilet", "Common toilet", ["middle", "rear", "front"], [4.5, 5, 6], [6.5, 7.5, 8.5], "outer", 2.5));
  }
  return p;
}

export function firstProgram(i: HouseInput, frontage = 40): Spec[] {
  const suites = allSuites(frontage);
  const p: Spec[] = [
    S("lounge", "lounge", "Family lounge", ["middle"], [8, 11, 22], [8, 10, 14], "full", 1.5, { hub: true }),
    S("master", "master", "Master bedroom", ["rear", "front", "middle"], [10, 13, 16], [11, 12.5, 15], "full", 3, { suite: true }),
  ];
  const upstairs = i.bhk - 1 - (i.groundBedroom ? 1 : 0);
  for (let n = 0; n < upstairs; n++) p.push(S(`bed${n + 2}`, "bedroom", `Bedroom ${n + 2}`, n === 1 ? ["rear", "front", "middle"] : ["rear", "front"], [9.5, 11.5, 14], [10, 11.5, 14], "full", 1.2, { suite: i.bhk >= 3 && suites }));
  if ((i.bhk < 3 || !suites) && upstairs > 0) p.push(S("toilet", "toilet", "Common toilet", ["middle", "rear", "front"], [4.5, 5, 6], [6.5, 7.5, 8.5], "outer", 2.5));
  if (i.study) p.push(S("study", "study", "Study", ["front", "rear"], [8, 9, 11], [8, 9, 11], "inner", 1));
  p.push(S("balcony", "balcony", "Balcony", ["front"], [6, 10, 30], [4, 5, 6], "outer", 1));
  return p;
}
