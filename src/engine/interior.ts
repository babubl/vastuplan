/**
 * Interior schemes: a style sets materials, accents and furniture finishes; the room's Vastu zone
 * picks the wall colour family. Lighting follows the room's use.
 */
import { ZONES } from "./vastu";
import type { Room, RoomType } from "./types";

export type StyleId = "contemporary" | "minimal" | "chettinad" | "scandi" | "japandi" | "industrial";

export interface Swatch { name: string; hex: string }
export interface InteriorStyle {
  id: StyleId;
  name: string;
  summary: string;
  accent: Swatch;
  wood: Swatch;
  fabric: Swatch;
  metal: string;
  floors: { living: Swatch & { material: string }; bed: Swatch & { material: string }; wet: Swatch & { material: string }; kitchen: Swatch & { material: string } };
  furnitureTone: string;
}

export const STYLES: InteriorStyle[] = [
  {
    id: "contemporary", name: "Contemporary Indian", summary: "Clean lines with warm wood, brass accents and handloom textiles.",
    accent: { name: "Indigo", hex: "#34408C" }, wood: { name: "Teak", hex: "#9A6A3E" }, fabric: { name: "Handloom cotton", hex: "#E9E2D3" }, metal: "Brushed brass",
    floors: { living: { name: "Warm grey", hex: "#C9C4BA", material: "Large-format vitrified tiles" }, bed: { name: "Teak", hex: "#B08458", material: "Engineered wood" }, wet: { name: "Slate grey", hex: "#8E9399", material: "Anti-skid matte tiles" }, kitchen: { name: "Kota stone", hex: "#8C9A8F", material: "Kota stone" } },
    furnitureTone: "#B08458",
  },
  {
    id: "minimal", name: "Modern minimal", summary: "White, grey and oak. Handle-less storage and nothing on show.",
    accent: { name: "Graphite", hex: "#3B3F45" }, wood: { name: "Light oak", hex: "#C8A97E" }, fabric: { name: "Stone linen", hex: "#DCD9D2" }, metal: "Matte black",
    floors: { living: { name: "Concrete grey", hex: "#CFCDC8", material: "Matte porcelain, 4 × 2 ft" }, bed: { name: "Oak", hex: "#D2B48C", material: "Laminate wood" }, wet: { name: "Ash", hex: "#A5A7A8", material: "Anti-skid porcelain" }, kitchen: { name: "Concrete grey", hex: "#C3C1BC", material: "Matte porcelain" } },
    furnitureTone: "#E7E4DE",
  },
  {
    id: "chettinad", name: "Chettinad heritage", summary: "Athangudi tiles, Burma teak, carved pillars and deep jewel colours.",
    accent: { name: "Temple red", hex: "#9E2B25" }, wood: { name: "Burma teak", hex: "#6E4527" }, fabric: { name: "Kanchi silk ochre", hex: "#C99A2E" }, metal: "Antique brass",
    floors: { living: { name: "Athangudi pattern", hex: "#B8573E", material: "Athangudi handmade tiles" }, bed: { name: "Red oxide", hex: "#9A4A3A", material: "Red oxide flooring" }, wet: { name: "Granite", hex: "#5F5F5F", material: "Flamed granite" }, kitchen: { name: "Kota stone", hex: "#7E8C82", material: "Kota stone" } },
    furnitureTone: "#6E4527",
  },
  {
    id: "scandi", name: "Scandinavian warm", summary: "Pale wood, soft whites and textured fabrics. Bright and calm.",
    accent: { name: "Sage", hex: "#8FA58A" }, wood: { name: "Birch", hex: "#D9C3A0" }, fabric: { name: "Oat bouclé", hex: "#E6DCCB" }, metal: "White powder-coat",
    floors: { living: { name: "Birch", hex: "#DCC8A6", material: "Engineered oak, matte" }, bed: { name: "Birch", hex: "#DCC8A6", material: "Engineered oak" }, wet: { name: "Pebble", hex: "#B9B6AE", material: "Terrazzo-look tiles" }, kitchen: { name: "Pebble", hex: "#C9C3B6", material: "Terrazzo-look tiles" } },
    furnitureTone: "#D9C3A0",
  },
  {
    id: "japandi", name: "Japandi", summary: "Low furniture, natural fibres, charcoal and walnut, plenty of space.",
    accent: { name: "Charcoal", hex: "#3A3633" }, wood: { name: "Walnut", hex: "#6B4E3A" }, fabric: { name: "Undyed linen", hex: "#D8D0C2" }, metal: "Blackened steel",
    floors: { living: { name: "Smoked oak", hex: "#9B8165", material: "Wide-plank engineered wood" }, bed: { name: "Smoked oak", hex: "#9B8165", material: "Wide-plank engineered wood" }, wet: { name: "Basalt", hex: "#6E6C69", material: "Honed stone-look tiles" }, kitchen: { name: "Basalt", hex: "#7A7774", material: "Honed stone-look tiles" } },
    furnitureTone: "#6B4E3A",
  },
  {
    id: "industrial", name: "Urban industrial", summary: "Exposed concrete, black metal, leather and Edison lighting.",
    accent: { name: "Rust", hex: "#A0522D" }, wood: { name: "Reclaimed pine", hex: "#8A6A4A" }, fabric: { name: "Tan leather", hex: "#A57145" }, metal: "Black iron",
    floors: { living: { name: "Polished concrete", hex: "#A9A7A2", material: "IPS concrete, sealed" }, bed: { name: "Dark oak", hex: "#6F5440", material: "Engineered wood" }, wet: { name: "Charcoal", hex: "#56585A", material: "Anti-skid tiles" }, kitchen: { name: "Polished concrete", hex: "#9E9C97", material: "IPS concrete" } },
    furnitureTone: "#3D3B39",
  },
];

export const styleById = (id: StyleId) => STYLES.find((s) => s.id === id) ?? STYLES[0];

const floorKey = (t: RoomType): keyof InteriorStyle["floors"] =>
  t === "toilet" || t === "utility" ? "wet" : t === "kitchen" ? "kitchen" : t === "master" || t === "bedroom" || t === "study" || t === "dress" ? "bed" : "living";

const LIGHT: Partial<Record<RoomType, string>> = {
  living: "Warm 2700K cove light, two pendants over the seating, a reading lamp by the sofa.",
  dining: "One statement pendant 30 in above the table on a dimmer.",
  kitchen: "Bright 4000K under-cabinet strips over the counter, plus a ceiling panel.",
  master: "Warm 2700K bedside wall lights and indirect cove lighting; no light directly over the bed.",
  bedroom: "Warm 3000K ceiling light with a dimmer and a study lamp.",
  toilet: "Mirror light and a moisture-proof ceiling downlight.",
  pooja: "Soft warm spot on the altar and a diya niche.",
  study: "Neutral 4000K task lamp on the desk; daylight from the north or east.",
  lounge: "Warm cove light and a floor lamp.",
  stair: "Step lights at ankle height for safety.",
};

const TIP: Partial<Record<RoomType, string>> = {
  living: "Keep heavy cabinets on the south and west walls and the north-east corner light and open.",
  dining: "A rectangular or square table suits Vastu; avoid placing it under a beam.",
  kitchen: "Cook facing east; keep the sink and the hob on different counters, not side by side.",
  master: "Sleep with your head to the south; avoid a mirror facing the bed.",
  bedroom: "Head to the south or east; study table facing north or east.",
  toilet: "Keep the door closed and the exhaust fan running; no toilet seat facing east-west.",
  pooja: "Idols facing west so you face east while praying; never under a staircase or beside a toilet wall.",
  study: "Face north or east while working; keep books on the south or west wall.",
  stair: "Clockwise ascent; nothing stored in the space beneath.",
};

export interface RoomScheme { wall: Swatch; accent: Swatch; floor: Swatch & { material: string }; wood: Swatch; fabric: Swatch; metal: string; lighting?: string; tip?: string }

export function schemeFor(room: Room, style: InteriorStyle): RoomScheme {
  const zoneCols = ZONES[room.zone].colours;
  const wall = room.type === "toilet" || room.type === "kitchen" ? zoneCols[zoneCols.length - 1] : zoneCols[0];
  return { wall, accent: style.accent, floor: style.floors[floorKey(room.type)], wood: style.wood, fabric: style.fabric, metal: style.metal, lighting: LIGHT[room.type], tip: TIP[room.type] };
}

/** Floor colour per room for the plan and 3D view. */
export const floorColour = (room: Room, style: InteriorStyle) => style.floors[floorKey(room.type)].hex;
