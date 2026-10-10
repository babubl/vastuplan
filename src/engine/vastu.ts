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
  courtyard: { C: 1, NE: 0.9, N: 0.9, E: 0.9, NW: 0.7, W: 0.7, S: 0.6, SE: 0.6, SW: 0.4 },
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

/**
 * Why each rule exists, in the terms Vastu Shastra itself uses: the five elements (pancha bhoota),
 * the guardian of each direction, and the path of the sun in India. Shown with every check.
 */
export const WHY: Record<string, string> = {
  entrance: "The 32 padas around a house each carry a deity. The auspicious padas welcome energy and morning light at the door; corners and the south-west padas are avoided. A door on the north-east half of an east or north wall also catches the early sun.",
  kitchen: "The south-east (Agneya) is ruled by Agni, the fire element. Cooking there aligns fire with fire, and the morning sun from the east dries and lights the kitchen. North-west, the air corner, is the accepted alternative because air feeds fire.",
  master: "The south-west (Nairutya) is the earth element: the heaviest, most stable corner, ruled by Nirrti. It is meant for the head of the family, giving stability and authority. Thick walls on the south and west also shield this room from the hot afternoon sun.",
  pooja: "The north-east (Ishanya) is ruled by Ishana, a form of Shiva, and holds the water element. It is the most sacred corner: kept the lightest, lowest, cleanest and most open. Praying here, facing east, faces the rising sun.",
  toilets: "Waste is never placed in the sacred north-east or the centre. The north-west (air, movement) and west suit toilets because air carries odour away; the south-west is avoided because it must stay heavy and pure for the head of the family.",
  centre: "The centre (Brahmasthan) is the seat of Brahma, the space element. Traditional homes keep it open to the sky as a courtyard (mutram). Toilets, staircases and heavy walls here are said to press on the heart of the house.",
  stair: "Staircases are heavy and rise upward, so they belong where weight is wanted: the south, west or south-west. Climbing clockwise follows the sun's path. In the north-east or the centre they block the lightest, most open zones.",
  living: "The north and east bring soft daylight and the morning sun. North is ruled by Kubera (wealth) and east by Indra and Surya (the sun), making them the most welcoming zones for receiving guests.",
  bedrooms: "Children and guests suit the west (Varuna, gains and steadiness) and north-west (Vayu, air and movement). The north-west especially suits people who come and go: guests and grown children.",
  open: "The north and east should have more open space and the south and west more mass. Open north-east lets in the morning sun; heavier south-west blocks the harsher afternoon sun from the south-west in Indian summers.",
  sleep: "Sleep with your head to the south or east. With the head to the north, tradition says the body's magnetic polarity opposes the earth's, disturbing sleep. Head to the east is considered best for students.",
  cook: "Facing east while cooking means facing the morning sun and Indra, the guardian of the east, and keeps the cook in natural light.",
  plot: "Square and near-square plots are considered most balanced. Long, thin plots stretch the energy of the house; beyond about 1 : 2 the guidance is to split the plot or build along its length with courtyards.",
  corner: "A plot with roads on two sides takes its character from the corner it sits on. A north-east corner plot is the most prized; north-west and south-east corners are good with care; a south-west corner plot needs a solid, higher wall on the south and west.",
};

export interface CornerGuide { zone: "NE" | "SE" | "SW" | "NW"; name: string; element: string; guardian: string; keep: string[]; avoid: string[]; site: string }

/** Thumb rules for the four corners, the most-asked part of Vastu. */
export const CORNERS: CornerGuide[] = [
  { zone: "NE", name: "Ishanya", element: "Water", guardian: "Ishana (Shiva)", keep: ["Pooja", "living or sit-out", "open space and windows", "sump, borewell, well"], avoid: ["toilets or septic tank", "kitchen", "staircase", "heavy furniture or storage", "overhead tank", "high walls"], site: "The lowest point of the plot: slope floors, roof and ground drainage towards it." },
  { zone: "SE", name: "Agneya", element: "Fire", guardian: "Agni", keep: ["Kitchen", "electrical panel, inverter, generator", "transformer or meter"], avoid: ["sump or underground water", "pooja", "the couple's bedroom", "main entrance at the corner"], site: "Fire and water must not meet: keep water tanks and sumps out of this corner." },
  { zone: "SW", name: "Nairutya", element: "Earth", guardian: "Nirrti", keep: ["Master bedroom", "staircase", "heavy storage and wardrobes", "overhead water tank (the highest point)"], avoid: ["main entrance", "toilet or septic tank", "sump, borewell or any pit", "open space or windows larger than elsewhere", "kitchen"], site: "The highest and heaviest point: the overhead tank, a higher compound wall, tall trees." },
  { zone: "NW", name: "Vayavya", element: "Air", guardian: "Vayu", keep: ["Guest room or grown children's room", "toilets", "store for grains", "parking", "septic tank (away from the walls)"], avoid: ["master bedroom for the head of the family", "pooja", "underground water tank"], site: "A place of movement: suits things and people that come and go." },
];
