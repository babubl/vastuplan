/**
 * Vastu Shastra knowledge base, kept as data so it can be reviewed and corrected.
 * These are traditional guidelines as commonly taught; they are not engineering requirements.
 */
import type { Facing, Rect, RoomType, Zone } from "./types";

export const ZONES: Record<Zone, { name: string; meaning: string; colours: { name: string; hex: string }[] }> = {
  NE: { name: "Ishanya", meaning: "Water and clarity. Kept light, open and clean: prayer, living, open space.", colours: [{ name: "Ivory white", hex: "#F6F2E8" }, { name: "Pale yellow", hex: "#F3E6B3" }, { name: "Sky blue", hex: "#CFE3EE" }] },
  N: { name: "Uttara", meaning: "Opportunity and wealth (Kubera). Good for living, study and openings.", colours: [{ name: "Sage green", hex: "#C9D8C0" }, { name: "Mist blue", hex: "#D6E4EC" }, { name: "Ivory", hex: "#F4EFE4" }] },
  NW: { name: "Vayavya", meaning: "Air and movement. Good for guests, children, storage and toilets.", colours: [{ name: "Pearl grey", hex: "#E3E1DC" }, { name: "Cream", hex: "#F2EAD8" }, { name: "Soft white", hex: "#F7F5F0" }] },
  E: { name: "Purva", meaning: "Sunrise and health. Good for living, study, prayer and windows.", colours: [{ name: "Leaf green", hex: "#CFDDBF" }, { name: "Warm white", hex: "#F5F0E6" }, { name: "Light jade", hex: "#C4DCCF" }] },
  C: { name: "Brahmasthan", meaning: "The centre. Kept open and uncluttered: no toilets, stairs or heavy walls.", colours: [{ name: "Chalk white", hex: "#F7F4EE" }, { name: "Sand", hex: "#EADFCB" }] },
  W: { name: "Paschima", meaning: "Gains and stability. Good for children's rooms, dining and study.", colours: [{ name: "Slate blue", hex: "#C3CFD9" }, { name: "Dove grey", hex: "#D9D7D2" }, { name: "Off-white", hex: "#F3F0E9" }] },
  SE: { name: "Agneya", meaning: "Fire. The traditional place for the kitchen and electrical equipment.", colours: [{ name: "Peach", hex: "#F2CDB3" }, { name: "Terracotta", hex: "#D9906B" }, { name: "Rose sand", hex: "#EBC9BE" }] },
  S: { name: "Dakshina", meaning: "Strength and rest. Good for bedrooms, stairs and heavy storage.", colours: [{ name: "Coral clay", hex: "#E4B4A0" }, { name: "Warm beige", hex: "#E7D6C1" }, { name: "Brick tint", hex: "#D9A88F" }] },
  SW: { name: "Nairutya", meaning: "Earth and stability. The master bedroom, heavy furniture and the overhead tank.", colours: [{ name: "Earth beige", hex: "#DCC8AA" }, { name: "Clay brown", hex: "#B99474" }, { name: "Biscuit", hex: "#E6D3B5" }] },
};

/** How well each room type suits each zone (0 = avoid, 1 = ideal). */
export const PREF: Record<RoomType, Partial<Record<Zone, number>>> = {
  living: { NE: 1, N: 1, E: 1, NW: 0.7, W: 0.55, C: 0.5, SE: 0.4, S: 0.35, SW: 0.15 },
  dining: { W: 1, C: 0.85, E: 0.8, N: 0.75, S: 0.7, NW: 0.7, SE: 0.6, NE: 0.5, SW: 0.4 },
  kitchen: { SE: 1, NW: 0.8, E: 0.5, S: 0.5, W: 0.3, N: 0.15, C: 0, NE: 0, SW: 0.1 },
  utility: { NW: 1, SE: 0.85, W: 0.75, S: 0.65, N: 0.4, E: 0.4, SW: 0.3, NE: 0, C: 0 },
  master: { SW: 1, S: 0.8, W: 0.8, NW: 0.45, SE: 0.3, N: 0.25, E: 0.2, C: 0.1, NE: 0 },
  bedroom: { W: 1, NW: 0.9, S: 0.85, SW: 0.8, N: 0.7, E: 0.65, SE: 0.4, NE: 0.3, C: 0.1 },
  toilet: { NW: 1, W: 0.9, S: 0.7, SE: 0.55, N: 0.4, E: 0.4, SW: 0.1, NE: 0, C: 0 },
  dress: { SW: 0.9, S: 0.9, W: 0.9, NW: 0.8, SE: 0.6, N: 0.5, E: 0.5, NE: 0.2, C: 0.2 },
  pooja: { NE: 1, E: 0.9, N: 0.9, W: 0.5, NW: 0.5, C: 0.35, SE: 0.2, S: 0.1, SW: 0.1 },
  study: { N: 1, E: 1, NE: 0.9, W: 0.85, NW: 0.6, SW: 0.55, S: 0.45, SE: 0.35, C: 0.2 },
  stair: { SW: 1, S: 0.9, W: 0.9, SE: 0.6, NW: 0.6, E: 0.3, N: 0.3, C: 0, NE: 0 },
  parking: { NW: 1, SE: 0.9, N: 0.65, E: 0.65, W: 0.5, S: 0.5, NE: 0.4, SW: 0.1, C: 0 },
  store: { SW: 0.9, S: 0.85, W: 0.85, NW: 0.8, SE: 0.6, N: 0.4, E: 0.4, NE: 0.1, C: 0.2 },
  sitout: { NE: 1, N: 1, E: 1, NW: 0.7, SE: 0.6, W: 0.5, S: 0.4, SW: 0.3, C: 0.3 },
  lounge: { C: 0.9, N: 0.9, E: 0.9, NE: 0.9, W: 0.75, NW: 0.75, S: 0.6, SE: 0.55, SW: 0.45 },
  balcony: { N: 1, E: 1, NE: 1, NW: 0.65, SE: 0.6, W: 0.45, S: 0.35, SW: 0.2, C: 0.2 },
  passage: { NE: 0.8, N: 0.8, E: 0.8, NW: 0.8, W: 0.8, C: 0.8, S: 0.8, SE: 0.8, SW: 0.8 },
};

export const prefOf = (t: RoomType, z: Zone) => PREF[t][z] ?? 0.5;

/**
 * Auspicious main-door positions in the 32-pada scheme (8 padas per side), counted clockwise from
 * the corner each side starts at: East from NE, South from SE, West from SW, North from NW.
 * East: Jayant and Indra (E3–E4). South: Vitatha and Grihakshat (S3–S4).
 * West: Sugreeva and Pushpadanta (W3–W4). North: Mukhya, Bhallat and Soma (N3–N5).
 */
export const ENTRANCE_PADAS: Record<Facing, { from: number; to: number; names: string }> = {
  E: { from: 2 / 8, to: 4 / 8, names: "Jayant and Indra (E3–E4)" },
  S: { from: 2 / 8, to: 4 / 8, names: "Vitatha and Grihakshat (S3–S4)" },
  W: { from: 2 / 8, to: 4 / 8, names: "Sugreeva and Pushpadanta (W3–W4)" },
  N: { from: 2 / 8, to: 5 / 8, names: "Mukhya, Bhallat and Soma (N3–N5)" },
};

/** The auspicious stretch of the front wall, as a compass interval along that wall. */
export function auspiciousStretch(facing: Facing, fp: Rect): { a: number; b: number } {
  const p = ENTRANCE_PADAS[facing];
  switch (facing) {
    case "E": return { a: fp.y + p.from * fp.h, b: fp.y + p.to * fp.h }; // from north end, going south
    case "S": return { a: fp.x + fp.w - p.to * fp.w, b: fp.x + fp.w - p.from * fp.w }; // from east end, going west
    case "W": return { a: fp.y + fp.h - p.to * fp.h, b: fp.y + fp.h - p.from * fp.h }; // from south end, going north
    case "N": return { a: fp.x + p.from * fp.w, b: fp.x + p.to * fp.w }; // from west end, going east
  }
}

export const DIRECTION_NAME: Record<Facing, string> = { N: "north", E: "east", S: "south", W: "west" };
