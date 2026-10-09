/**
 * Shared types for the VastuPlan engine.
 *
 * Coordinates are in feet on a compass grid with North up:
 *   x grows from West to East, y grows from North to South.
 * Every room is an axis-aligned rectangle measured to wall centre-lines.
 */
export type Facing = "N" | "E" | "S" | "W";
export type Zone = "NW" | "N" | "NE" | "W" | "C" | "E" | "SW" | "S" | "SE";
export type Band = "front" | "middle" | "rear";

export interface Rect { x: number; y: number; w: number; h: number }

export type RoomType =
  | "living" | "dining" | "kitchen" | "utility" | "master" | "bedroom" | "toilet" | "dress"
  | "pooja" | "study" | "stair" | "parking" | "store" | "sitout" | "lounge" | "balcony" | "passage";

export interface Room {
  id: string;
  type: RoomType;
  label: string;
  rect: Rect;
  zone: Zone;
  /** For attached toilets and dress areas: the bedroom they belong to. */
  owner?: string;
  /** Open to the sky or semi-open (sit-out, balcony, parking). */
  open?: boolean;
}

export interface Opening {
  /** Segment of the opening along a wall, in compass feet. */
  x1: number; y1: number; x2: number; y2: number;
  /** Room the leaf swings into (doors only). */
  into?: string;
  /** Rooms on either side; "out" for the exterior. */
  a: string; b: string;
  kind: "main" | "door" | "opening" | "window" | "ventilator";
}

export interface Furniture {
  room: string;
  kind: string;
  label?: string;
  rect: Rect;
  /** Direction the item "faces" or the head of a bed points, where it matters for Vastu. */
  facing?: Facing;
}

export interface FloorPlan {
  level: 0 | 1;
  name: string;
  rooms: Room[];
  openings: Opening[];
  furniture: Furniture[];
}

export interface Setbacks { front: number; rear: number; left: number; right: number }

export interface HouseInput {
  /** Width along the road, in feet. */
  plotWidth: number;
  /** Depth away from the road, in feet. */
  plotDepth: number;
  facing: Facing;
  floors: 1 | 2;
  bhk: 1 | 2 | 3 | 4;
  pooja: boolean;
  study: boolean;
  parking: boolean;
  utility: boolean;
  /** Keep one bedroom on the ground floor (two-storey homes), for parents or guests. */
  groundBedroom: boolean;
  setbacks?: Setbacks;
}

export type CheckStatus = "pass" | "partial" | "fail" | "info";

export interface Check {
  id: string;
  title: string;
  status: CheckStatus;
  detail: string;
  weight: number;
  /** 0..1 */
  score: number;
}

export interface HouseDesign {
  id: string;
  input: HouseInput;
  plot: Rect;
  buildable: Rect;
  footprint: Rect;
  floors: FloorPlan[];
  vastu: Check[];
  livability: Check[];
  vastuScore: number;
  livabilityScore: number;
  score: number;
  builtUpArea: number;
  notes: string[];
}
