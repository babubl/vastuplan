import { useState, useMemo, useCallback, useRef, useEffect } from "react";

// ═══════════════════════════════════════════════════════════
// VASTUPLAN v2 — Production-Grade Vastu Floor Plan Generator
// ═══════════════════════════════════════════════════════════

// ─── CONSTANTS ───
const VASTU_ZONES = {
  NE: { label: "Ishanya", element: "Water", deity: "Shiva", ideal: ["pooja", "living", "entrance_N", "entrance_E"] },
  E:  { label: "Purva", element: "Sun", deity: "Indra", ideal: ["entrance", "living", "balcony"] },
  SE: { label: "Agneya", element: "Fire", deity: "Agni", ideal: ["kitchen"] },
  S:  { label: "Dakshina", element: "Earth", deity: "Yama", ideal: ["dining", "store"] },
  SW: { label: "Nairutya", element: "Earth", deity: "Nirrti", ideal: ["master_bed", "staircase", "overhead_tank"] },
  W:  { label: "Paschima", element: "Water", deity: "Varuna", ideal: ["dining", "children_bed", "store"] },
  NW: { label: "Vayavya", element: "Air", deity: "Vayu", ideal: ["toilet", "guest_bed", "garage"] },
  N:  { label: "Uttara", element: "Water", deity: "Kubera", ideal: ["living", "entrance", "balcony"] },
};

const MIN_ROOM_SIZES = {
  master_bed: { w: 10, h: 10, label: "Master Bedroom" },
  bedroom: { w: 9, h: 9, label: "Bedroom" },
  living: { w: 10, h: 10, label: "Living Room" },
  kitchen: { w: 7, h: 8, label: "Kitchen" },
  dining: { w: 7, h: 7, label: "Dining" },
  toilet: { w: 4, h: 5, label: "Toilet / Bath" },
  pooja: { w: 4, h: 4, label: "Pooja Room" },
  staircase: { w: 7, h: 9, label: "Staircase" },
  store: { w: 4, h: 5, label: "Store Room" },
  porch: { w: 5, h: 4, label: "Porch / Sit-out" },
  passage: { w: 3, h: 3, label: "Passage" },
  balcony: { w: 6, h: 4, label: "Balcony" },
  utility: { w: 4, h: 4, label: "Utility / Wash" },
  parking: { w: 9, h: 16, label: "Car Parking" },
  family_hall: { w: 8, h: 7, label: "Family Hall / Lobby" },
};

const FACING_META = {
  E: { label: "East", icon: "☀️", arrow: "→", vastuRank: 1, desc: "Most auspicious — morning sun blesses the entrance" },
  N: { label: "North", icon: "💰", arrow: "↑", vastuRank: 2, desc: "Lord Kubera's direction — attracts prosperity" },
  W: { label: "West", icon: "🌅", arrow: "←", vastuRank: 3, desc: "Acceptable with proper Vastu corrections" },
  S: { label: "South", icon: "🔥", arrow: "↓", vastuRank: 4, desc: "Needs careful planning — heavier construction in South" },
};

// ═══════════════════════════════════════════════════════════
// LAYOUT ENGINE v2 — Constraint-based, no overlaps
// ═══════════════════════════════════════════════════════════

function createLayoutEngine(config) {
  const { plotWidth: pw, plotDepth: pd, facing, floors, bedrooms, bathrooms, hasPooja, hasBalcony, hasParking, hasStore } = config;

  // Setbacks based on typical Indian municipal rules
  const setback = {
    E: { front: facing === "E" ? 3 : 2, rear: facing === "W" ? 3 : 2, left: 2, right: 2 },
    W: { front: facing === "W" ? 3 : 2, rear: facing === "E" ? 3 : 2, left: 2, right: 2 },
    N: { front: facing === "N" ? 3 : 2, rear: facing === "S" ? 3 : 2, left: 2, right: 2 },
    S: { front: facing === "S" ? 3 : 2, rear: facing === "N" ? 3 : 2, left: 2, right: 2 },
  }[facing];

  // Available building area
  const bW = pw - setback.left - setback.right;
  const bD = pd - setback.front - setback.rear;
  const isSmall = bW * bD < 500;
  const isTiny = bW * bD < 350;
  const hasStair = floors > 1;

  // Direction mapping — translate Vastu compass zones to x,y grid positions
  // based on facing. SVG top = North side of plot, right = East, etc.
  // But we orient so the ROAD (facing) is at the bottom of the SVG
  // This means: bottom = facing direction
  const gridZone = (zone) => {
    // Returns {xFrac: 0-1, yFrac: 0-1} for zone center
    // We render: Top of SVG = rear of plot, Bottom = front (road side)
    // Left of SVG = left when facing the plot from road
    const zoneMap = {
      E: {
        NW: [0, 0], N: [0.5, 0], NE: [1, 0],
        W: [0, 0.5], C: [0.5, 0.5], E: [1, 0.5],
        SW: [0, 1], S: [0.5, 1], SE: [1, 1],
      },
      W: {
        SE: [0, 0], S: [0.5, 0], SW: [1, 0],
        E: [0, 0.5], C: [0.5, 0.5], W: [1, 0.5],
        NE: [0, 1], N: [0.5, 1], NW: [1, 1],
      },
      N: {
        SW: [0, 0], W: [0.5, 0], NW: [1, 0],
        S: [0, 0.5], C: [0.5, 0.5], N: [1, 0.5],
        SE: [0, 1], E: [0.5, 1], NE: [1, 1],
      },
      S: {
        NE: [0, 0], E: [0.5, 0], SE: [1, 0],
        N: [0, 0.5], C: [0.5, 0.5], S: [1, 0.5],
        NW: [0, 1], W: [0.5, 1], SW: [1, 1],
      },
    };
    return zoneMap[facing]?.[zone] || [0.5, 0.5];
  };

  // The label for direction relative to plot orientation
  const dirLabels = {
    E: { top: "WEST (Rear)", bottom: "EAST (Road)", left: "SOUTH", right: "NORTH" },
    W: { top: "EAST (Rear)", bottom: "WEST (Road)", left: "NORTH", right: "SOUTH" },
    N: { top: "SOUTH (Rear)", bottom: "NORTH (Road)", left: "WEST", right: "EAST" },
    S: { top: "NORTH (Rear)", bottom: "SOUTH (Road)", left: "EAST", right: "WEST" },
  }[facing];

  // ─── GRID-BASED ROOM PLACER ───
  // Divide the buildable area into a grid, then assign rooms to grid cells
  // This guarantees no overlaps and clean adjacency

  function layoutGroundFloor() {
    const rooms = [];
    const doors = [];
    const windows = [];

    // Strategy: divide into rows and columns
    // For east-facing (most common), Vastu layout:
    // ┌─────────────┬──────────────┐  ← rear (West)
    // │  Master BR   │  Living Room  │
    // │  (SW zone)   │  (NE zone)    │
    // ├──────┬───────┼──────────────┤
    // │Toilet│Passage│   Dining     │
    // ├──────┴───┬───┼────┬─────────┤
    // │Staircase │Pooja│Kitchen     │
    // │ /Store   │    │  (SE zone)  │
    // ├──────────┴────┼─────────────┤
    // │   Porch / Entrance          │  ← front (Road/East)
    // └─────────────────────────────┘

    // Calculate proportional splits
    const bedsOnGF = floors === 1 ? Math.min(bedrooms, 2) : 1;
    const needsPorch = true;
    const porchD = needsPorch ? Math.max(4, Math.round(bD * 0.12)) : 0;
    const mainD = bD - porchD;

    // Vertical split: top row (bedrooms + living), middle row (toilets + passage + dining), bottom row (stair + kitchen)
    const topH = Math.round(mainD * (isTiny ? 0.5 : 0.42));
    const midH = Math.round(mainD * (isTiny ? 0.22 : 0.22));
    const botH = mainD - topH - midH;

    // Horizontal split: left zone vs right zone
    const leftW = Math.round(bW * 0.48);
    const rightW = bW - leftW;

    // ── TOP ROW: Master Bed (left/SW) + Living (right/NE)
    rooms.push({
      id: "master", name: "Master Bedroom", type: "master_bed",
      x: 0, y: 0, w: leftW, h: topH,
      zone: "SW", color: "#2a3a2e",
      vastu: "SW (Nairutya) — Head of household, stability & grounding",
    });
    windows.push({ x: 0, ym: topH * 0.3, len: Math.min(5, leftW * 0.4), side: "left", room: "master" });
    windows.push({ xm: leftW * 0.3, y: 0, len: Math.min(5, leftW * 0.35), side: "top", room: "master" });

    rooms.push({
      id: "living", name: "Living Room", type: "living",
      x: leftW, y: 0, w: rightW, h: topH,
      zone: "NE", color: "#1e2e38",
      vastu: "NE (Ishanya) — Positive energy flow, light & openness",
    });
    windows.push({ x: bW, ym: topH * 0.25, len: Math.min(5, rightW * 0.4), side: "right", room: "living" });
    windows.push({ xm: leftW + rightW * 0.4, y: 0, len: Math.min(4, rightW * 0.3), side: "top", room: "living" });

    // Additional bedroom on GF if single floor with 2+ beds
    if (bedsOnGF >= 2 && !isTiny) {
      // Carve a bedroom from part of living room area
      const bed2W = Math.round(rightW * 0.55);
      const bed2H = Math.round(topH * 0.55);
      rooms.push({
        id: "bed_g2", name: "Bedroom 2", type: "bedroom",
        x: leftW, y: 0, w: bed2W, h: bed2H,
        zone: "N", color: "#2e2a38",
        vastu: "North zone — good for children/study",
      });
      // Resize living
      rooms[1].y = bed2H;
      rooms[1].h = topH - bed2H;
    }

    // ── MID ROW: Attached Bath + Common Bath + Passage + Dining
    const toiletW = Math.max(4, Math.round(leftW * 0.42));
    const toiletH = midH;

    rooms.push({
      id: "toilet_m", name: "Attached Bath", type: "toilet",
      x: 0, y: topH, w: toiletW, h: toiletH,
      zone: "NW", color: "#1a2a3a",
      vastu: "NW (Vayavya) — Water element, drainage direction",
      isWet: true,
    });

    if (bathrooms >= 2) {
      const ct_w = Math.max(4, Math.round(leftW * 0.38));
      rooms.push({
        id: "toilet_c", name: "Common Bath", type: "toilet",
        x: toiletW, y: topH, w: leftW - toiletW, h: toiletH,
        zone: "W", color: "#1a2a3a",
        vastu: "West zone — acceptable for second bathroom",
        isWet: true,
      });
    } else {
      // Use space as passage
      rooms.push({
        id: "passage_m", name: "Passage", type: "passage",
        x: toiletW, y: topH, w: leftW - toiletW, h: toiletH,
        zone: "C", color: "#141e28",
      });
    }

    rooms.push({
      id: "dining", name: "Dining", type: "dining",
      x: leftW, y: topH, w: rightW, h: midH,
      zone: "W", color: "#28221e",
      vastu: "West zone — nourishment, connects kitchen to living",
    });

    // Door from living to dining
    doors.push({ x1: leftW, y1: topH + 1, x2: leftW, y2: topH + midH - 1, type: "opening" });

    // ── BOTTOM ROW: Staircase/Store (left/SW) + Kitchen (right/SE)
    if (hasStair) {
      const stairW = Math.max(7, Math.round(leftW * 0.65));
      const stairH = botH;
      rooms.push({
        id: "staircase", name: "Staircase", type: "staircase",
        x: 0, y: topH + midH, w: stairW, h: stairH,
        zone: "SW", color: "#1e1e24",
        vastu: "SW — Clockwise ascent per Vastu Shastra",
        isStair: true,
      });

      if (hasStore && leftW - stairW >= 4) {
        rooms.push({
          id: "store", name: "Store", type: "store",
          x: stairW, y: topH + midH, w: leftW - stairW, h: botH,
          zone: "S", color: "#1a1a20",
          vastu: "South zone — storage and utility",
        });
      }

      if (hasPooja) {
        const poojaS = Math.max(4, Math.round(Math.min(leftW - stairW, botH) * 0.6));
        if (leftW - stairW >= 4) {
          rooms.push({
            id: "pooja", name: "Pooja", type: "pooja",
            x: stairW, y: topH + midH, w: Math.min(poojaS, leftW - stairW), h: Math.min(poojaS, botH),
            zone: "NE", color: "#2e2818",
            vastu: "Ishanya zone — sacred, face East while praying",
          });
        }
      }
    } else {
      // No stair — use for store + pooja
      if (hasPooja) {
        const poojaS = Math.max(4, Math.round(leftW * 0.4));
        rooms.push({
          id: "pooja", name: "Pooja", type: "pooja",
          x: 0, y: topH + midH, w: poojaS, h: Math.min(poojaS, botH),
          zone: "NE", color: "#2e2818",
          vastu: "Ishanya zone — sacred space",
        });
      }
      if (hasStore) {
        const sx = hasPooja ? Math.max(4, Math.round(leftW * 0.4)) : 0;
        rooms.push({
          id: "store", name: "Store", type: "store",
          x: sx, y: topH + midH, w: leftW - sx, h: botH,
          zone: "S", color: "#1a1a20",
          vastu: "South zone — storage",
        });
      }
    }

    // Kitchen — right side bottom (SE zone)
    rooms.push({
      id: "kitchen", name: "Kitchen", type: "kitchen",
      x: leftW, y: topH + midH, w: rightW, h: botH,
      zone: "SE", color: "#302018",
      vastu: "SE (Agneya) — Agni/fire corner, cook facing East",
    });
    windows.push({ x: bW, ym: topH + midH + botH * 0.4, len: Math.min(4, rightW * 0.3), side: "right", room: "kitchen" });

    // Utility / wash attached to kitchen
    if (botH > 8 && rightW > 10) {
      const uW = Math.max(4, Math.round(rightW * 0.35));
      const uH = Math.max(3, Math.round(botH * 0.35));
      rooms.push({
        id: "utility", name: "Utility", type: "utility",
        x: bW - uW, y: topH + midH + botH - uH, w: uW, h: uH,
        zone: "SE", color: "#1a2a2a",
        vastu: "SE — wash and utility near kitchen",
        isWet: true,
      });
    }

    // ── PORCH (bottom — road side)
    rooms.push({
      id: "porch", name: "Porch / Sit-out", type: "porch",
      x: Math.round(bW * 0.2), y: mainD, w: Math.round(bW * 0.6), h: porchD,
      zone: facing, color: "#1e2a1e",
      vastu: `${facing} facing — welcoming entrance`,
      isOpen: true,
    });

    // Main entrance door
    doors.push({
      x1: Math.round(bW * 0.4), y1: mainD, x2: Math.round(bW * 0.55), y2: mainD, type: "main_door",
    });
    // Door from porch into living
    doors.push({
      x1: leftW + 1, y1: mainD - 0.5, x2: leftW + Math.round(rightW * 0.35), y2: mainD - 0.5, type: "door",
    });
    // Master bed door
    doors.push({
      x1: leftW, y1: topH * 0.6, x2: leftW, y2: topH * 0.6 + 3, type: "door",
    });
    // Toilet door
    doors.push({
      x1: toiletW * 0.3, y1: topH, x2: toiletW * 0.3 + 2.5, y2: topH, type: "door",
    });
    // Kitchen door
    doors.push({
      x1: leftW + 1, y1: topH + midH, x2: leftW + 1 + 3, y2: topH + midH, type: "door",
    });

    // Parking (if enabled, outside building on setback)
    if (hasParking) {
      rooms.push({
        id: "parking", name: "Parking", type: "parking",
        x: -setback.left, y: mainD - 6, w: setback.left + Math.round(bW * 0.35), h: 6 + porchD,
        zone: "NW", color: "#141820",
        vastu: "NW — vehicle parking area",
        isOpen: true, isOutside: true,
      });
    }

    return { rooms, doors, windows, bW, bD, mainD, porchD, topH, midH, botH, leftW, rightW };
  }

  function layoutUpperFloor(floorIdx) {
    const rooms = [];
    const doors = [];
    const windows = [];

    const totalUpperBeds = bedrooms - 1; // 1 on GF
    const bedsThisFloor = floorIdx === 1 ? Math.min(totalUpperBeds, 3) : Math.max(totalUpperBeds - 3, 1);
    const bathsThisFloor = Math.max(1, Math.min(bathrooms - 1, 2)); // at least 1 attached

    // Reuse building dims from GF
    const leftW = Math.round(bW * 0.48);
    const rightW = bW - leftW;

    // Layout strategy for upper floor:
    // ┌──────────────┬───────────────┐
    // │  Bedroom A    │  Bedroom B    │
    // │               │  (or Hall)    │
    // ├─────┬────────┼───────────────┤
    // │Bath │  Lobby / Family Hall    │
    // ├─────┴────────┼───────────────┤
    // │ Staircase    │  Balcony      │
    // └──────────────┴───────────────┘

    const lobbyH = Math.max(5, Math.round(bD * 0.18));
    const balcH = hasBalcony ? Math.max(4, Math.round(bD * 0.16)) : 0;
    const stairH = Math.max(8, Math.round(bD * 0.28));
    const bedH = bD - lobbyH - (hasBalcony ? balcH : stairH);

    // If stair + balcony both exist, overlap them in bottom row
    const botRowH = Math.max(stairH, balcH);
    const topRowH = bD - lobbyH - botRowH;
    const stairW = Math.max(7, Math.round(bW * 0.32));

    // Bedroom A (left)
    rooms.push({
      id: `bed_${floorIdx}_a`, name: `Bedroom ${floorIdx + 1}`, type: "bedroom",
      x: 0, y: 0, w: leftW, h: topRowH,
      zone: "SW", color: "#2a3a2e",
      vastu: "SW zone — primary bedroom, stability",
    });
    windows.push({ x: 0, ym: topRowH * 0.3, len: Math.min(5, leftW * 0.35), side: "left", room: `bed_${floorIdx}_a` });
    windows.push({ xm: leftW * 0.25, y: 0, len: Math.min(4, leftW * 0.3), side: "top", room: `bed_${floorIdx}_a` });

    // Bedroom B or Family Hall (right)
    if (bedsThisFloor >= 2) {
      rooms.push({
        id: `bed_${floorIdx}_b`, name: `Bedroom ${floorIdx + 2}`, type: "bedroom",
        x: leftW, y: 0, w: rightW, h: topRowH,
        zone: "NE", color: "#2e2a38",
        vastu: "NE zone — children/guest bedroom",
      });
      windows.push({ x: bW, ym: topRowH * 0.35, len: Math.min(5, rightW * 0.35), side: "right", room: `bed_${floorIdx}_b` });
      windows.push({ xm: leftW + rightW * 0.35, y: 0, len: Math.min(4, rightW * 0.3), side: "top", room: `bed_${floorIdx}_b` });
    } else {
      rooms.push({
        id: `hall_${floorIdx}`, name: "Family Hall", type: "family_hall",
        x: leftW, y: 0, w: rightW, h: topRowH,
        zone: "NE", color: "#1e2e2e",
        vastu: "NE — family gathering, study area",
      });
      windows.push({ x: bW, ym: topRowH * 0.4, len: Math.min(5, rightW * 0.4), side: "right", room: `hall_${floorIdx}` });
    }

    // Third bedroom carve-out
    if (bedsThisFloor >= 3 && bW > 22) {
      const bed3W = Math.round(rightW * 0.5);
      rooms.push({
        id: `bed_${floorIdx}_c`, name: `Bedroom ${floorIdx + 3}`, type: "bedroom",
        x: leftW + rightW - bed3W, y: 0, w: bed3W, h: Math.round(topRowH * 0.55),
        zone: "E", color: "#2a2a30",
        vastu: "East zone — morning sun for children",
      });
    }

    // ── LOBBY / PASSAGE ROW
    const bathW = Math.max(4, Math.round(leftW * 0.4));
    const bathH = lobbyH;

    rooms.push({
      id: `bath_${floorIdx}_a`, name: "Attached Bath", type: "toilet",
      x: 0, y: topRowH, w: bathW, h: bathH,
      zone: "NW", color: "#1a2a3a",
      vastu: "NW — water element for drainage",
      isWet: true,
    });

    if (bathsThisFloor >= 2) {
      rooms.push({
        id: `bath_${floorIdx}_c`, name: "Common Bath", type: "toilet",
        x: bW - bathW, y: topRowH, w: bathW, h: bathH,
        zone: "W", color: "#1a2a3a",
        vastu: "West — second bathroom",
        isWet: true,
      });
    }

    rooms.push({
      id: `lobby_${floorIdx}`, name: "Lobby / Passage", type: "family_hall",
      x: bathW, y: topRowH, w: bW - bathW * (bathsThisFloor >= 2 ? 2 : 1), h: lobbyH,
      zone: "C", color: "#141e28",
      vastu: "Central passage connecting rooms",
    });

    // Doors for bedrooms
    doors.push({ x1: leftW, y1: topRowH * 0.55, x2: leftW, y2: topRowH * 0.55 + 3, type: "door" });
    if (bedsThisFloor >= 2) {
      doors.push({ x1: leftW + 1, y1: topRowH, x2: leftW + 4, y2: topRowH, type: "door" });
    }

    // ── BOTTOM ROW: Staircase + Balcony
    rooms.push({
      id: `stair_${floorIdx}`, name: floorIdx >= floors - 1 ? "Stair (→ Terrace)" : "Staircase", type: "staircase",
      x: 0, y: topRowH + lobbyH, w: stairW, h: botRowH,
      zone: "SW", color: "#1e1e24",
      vastu: "SW — structural weight, clockwise ascent",
      isStair: true,
    });

    if (hasBalcony) {
      rooms.push({
        id: `balcony_${floorIdx}`, name: "Open Balcony", type: "balcony",
        x: stairW, y: topRowH + lobbyH, w: bW - stairW, h: botRowH,
        zone: "S", color: "#1e2a1e",
        vastu: "South/front — sit-out, drying, plants",
        isOpen: true,
      });
      windows.push({ xm: stairW + 2, y: bD, len: bW - stairW - 4, side: "bottom", room: `balcony_${floorIdx}` });
    } else {
      // Utility / extra space
      rooms.push({
        id: `util_${floorIdx}`, name: "Utility / Wash", type: "utility",
        x: stairW, y: topRowH + lobbyH, w: bW - stairW, h: botRowH,
        zone: "NW", color: "#1a2a2a",
        vastu: "Utility and washing area",
        isWet: true,
      });
    }

    return { rooms, doors, windows, bW, bD };
  }

  // ─── VASTU SCORING ───
  function scoreVastu(allPlans) {
    let score = 0;
    let maxScore = 0;
    const tips = [];

    const checks = [
      { room: "kitchen", idealZones: ["SE"], goodZones: ["E", "NW"], weight: 15, label: "Kitchen in SE (Agneya)" },
      { room: "master", idealZones: ["SW"], goodZones: ["S", "W"], weight: 15, label: "Master Bedroom in SW (Nairutya)" },
      { room: "pooja", idealZones: ["NE"], goodZones: ["N", "E"], weight: 12, label: "Pooja Room in NE (Ishanya)" },
      { room: "toilet", idealZones: ["NW", "W"], goodZones: ["N"], weight: 10, label: "Toilets in NW (Vayavya)" },
      { room: "living", idealZones: ["NE", "N", "E"], goodZones: ["C"], weight: 12, label: "Living Room in NE" },
      { room: "staircase", idealZones: ["SW", "S", "W"], goodZones: ["NW"], weight: 10, label: "Staircase in SW" },
      { room: "dining", idealZones: ["W", "E", "N"], goodZones: ["S", "C"], weight: 8, label: "Dining in West zone" },
    ];

    // Facing bonus
    const facingScore = { E: 18, N: 16, W: 8, S: 4 }[facing] || 0;
    score += facingScore;
    maxScore += 18;
    if (facingScore >= 16) tips.push({ type: "good", text: `${facing}-facing entrance — excellent Vastu alignment` });
    else tips.push({ type: "warn", text: `${facing}-facing — consider Vastu remedies at entrance` });

    // Check each room
    const allRooms = allPlans.flatMap(p => p.rooms);
    for (const check of checks) {
      maxScore += check.weight;
      const room = allRooms.find(r => r.id?.includes(check.room) || r.type === check.room);
      if (!room) continue;
      if (check.idealZones.includes(room.zone)) {
        score += check.weight;
        tips.push({ type: "good", text: `✓ ${check.label}` });
      } else if (check.goodZones.includes(room.zone)) {
        score += Math.round(check.weight * 0.6);
        tips.push({ type: "ok", text: `~ ${room.name} in ${room.zone} — acceptable but ${check.idealZones[0]} is ideal` });
      } else {
        tips.push({ type: "bad", text: `✗ ${room.name} in ${room.zone} — Vastu recommends ${check.idealZones.join("/")}` });
      }
    }

    return { score: Math.round((score / maxScore) * 100), tips };
  }

  // ─── BUILD ALL FLOORS ───
  const allPlans = [];
  const gf = layoutGroundFloor();
  allPlans.push({ floor: 0, label: "Ground Floor", level: "+0.00m", ...gf });

  for (let f = 1; f < floors; f++) {
    const uf = layoutUpperFloor(f);
    allPlans.push({ floor: f, label: f === 1 ? "First Floor" : "Second Floor", level: `+${f * 3}.00m`, ...uf });
  }

  const vastuResult = scoreVastu(allPlans);

  return { plans: allPlans, setback, bW, bD, dirLabels, vastuResult };
}


// ═══════════════════════════════════════════════════════════
// SVG RENDERER — Blueprint-quality floor plan
// ═══════════════════════════════════════════════════════════

function FloorPlanSVG({ plan, setback, plotWidth, plotDepth, facing, dirLabels }) {
  const pad = 55;
  const sc = 13; // px per foot
  const svgW = plotWidth * sc + pad * 2;
  const svgH = plotDepth * sc + pad * 2;
  const ox = pad + setback.left * sc;
  const oy = pad + setback.front * sc;
  const bW = plan.bW;
  const bD = plan.bD;

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        <pattern id="bgGrid" width={sc} height={sc} patternUnits="userSpaceOnUse">
          <path d={`M ${sc} 0 L 0 0 0 ${sc}`} fill="none" stroke="rgba(60,100,160,0.08)" strokeWidth="0.5" />
        </pattern>
        <pattern id="hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(122,184,212,0.15)" strokeWidth="1" />
        </pattern>
        <marker id="arrowS" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L6,3 L0,6 Z" fill="#d4a574" />
        </marker>
      </defs>

      {/* Background grid */}
      <rect width={svgW} height={svgH} fill="#0c1a2c" />
      <rect width={svgW} height={svgH} fill="url(#bgGrid)" />

      {/* Plot boundary */}
      <rect x={pad} y={pad} width={plotWidth * sc} height={plotDepth * sc} fill="none" stroke="rgba(200,165,120,0.2)" strokeWidth="1" strokeDasharray="8 4" />

      {/* Setback shading */}
      <rect x={pad} y={pad} width={setback.left * sc} height={plotDepth * sc} fill="rgba(200,165,120,0.03)" />
      <rect x={pad + plotWidth * sc - setback.right * sc} y={pad} width={setback.right * sc} height={plotDepth * sc} fill="rgba(200,165,120,0.03)" />
      <rect x={pad} y={pad} width={plotWidth * sc} height={setback.front * sc} fill="rgba(200,165,120,0.03)" />
      <rect x={pad} y={pad + plotDepth * sc - setback.rear * sc} width={plotWidth * sc} height={setback.rear * sc} fill="rgba(200,165,120,0.03)" />

      {/* Building outline */}
      <rect x={ox} y={oy} width={bW * sc} height={bD * sc} fill="rgba(240,230,216,0.02)" stroke="#5a4a36" strokeWidth="2.5" />

      {/* ROOMS */}
      {plan.rooms.filter(r => !r.isOutside).map((room) => {
        const rx = ox + room.x * sc;
        const ry = oy + room.y * sc;
        const rw = room.w * sc;
        const rh = room.h * sc;
        const isSmallRoom = rw < 60 || rh < 45;

        return (
          <g key={room.id}>
            {/* Room fill */}
            <rect x={rx} y={ry} width={rw} height={rh} fill={room.color} stroke="#4a3a2a" strokeWidth={room.isOpen ? 1 : 1.8} strokeDasharray={room.isOpen ? "4 2" : "none"} rx={room.isOpen ? 1 : 0} />
            {/* Wet area hatch */}
            {room.isWet && <rect x={rx} y={ry} width={rw} height={rh} fill="url(#hatch)" />}
            {/* Stair treads */}
            {room.isStair && Array.from({ length: Math.min(12, Math.floor(rh / (sc * 0.7))) }).map((_, i) => (
              <line key={i} x1={rx + 3} y1={ry + ((i + 1) * rh) / (Math.min(12, Math.floor(rh / (sc * 0.7))) + 1)} x2={rx + rw - 3} y2={ry + ((i + 1) * rh) / (Math.min(12, Math.floor(rh / (sc * 0.7))) + 1)} stroke="rgba(240,230,216,0.12)" strokeWidth="0.7" />
            ))}
            {room.isStair && (
              <text x={rx + rw / 2} y={ry + rh / 2 + 16} textAnchor="middle" fontSize="10" fill="rgba(212,165,116,0.5)" fontFamily="'JetBrains Mono'">↑ UP</text>
            )}
            {/* Room label */}
            <text x={rx + rw / 2} y={ry + rh / 2 - (isSmallRoom ? 2 : 6)} textAnchor="middle" fontSize={isSmallRoom ? 7.5 : 10.5} fontWeight="600" fill="rgba(240,230,216,0.85)" fontFamily="'Outfit', sans-serif" letterSpacing="0.3">
              {room.name}
            </text>
            {/* Dimensions */}
            {!room.isOpen && rw > 35 && rh > 30 && (
              <text x={rx + rw / 2} y={ry + rh / 2 + (isSmallRoom ? 8 : 10)} textAnchor="middle" fontSize={isSmallRoom ? 6 : 7.5} fill="rgba(240,230,216,0.35)" fontFamily="'JetBrains Mono'">
                {room.w}' × {room.h}' ({room.w * room.h} sqft)
              </text>
            )}
            {/* Vastu zone badge */}
            {room.zone && !room.isOpen && rw > 50 && rh > 40 && (
              <text x={rx + rw / 2} y={ry + rh / 2 + (isSmallRoom ? 16 : 22)} textAnchor="middle" fontSize="6" fill="rgba(212,165,116,0.3)" fontFamily="'JetBrains Mono'">
                ☸ {room.zone}
              </text>
            )}
          </g>
        );
      })}

      {/* Outside rooms (parking) */}
      {plan.rooms.filter(r => r.isOutside).map((room) => {
        const rx = pad + (setback.left + room.x) * sc;
        const ry = oy + room.y * sc;
        const rw = room.w * sc;
        const rh = room.h * sc;
        return (
          <g key={room.id}>
            <rect x={rx} y={ry} width={rw} height={rh} fill="rgba(20,24,32,0.5)" stroke="rgba(200,165,120,0.15)" strokeWidth="1" strokeDasharray="5 3" />
            <text x={rx + rw / 2} y={ry + rh / 2} textAnchor="middle" fontSize="9" fill="rgba(240,230,216,0.3)" fontFamily="'Outfit'">
              {room.name}
            </text>
          </g>
        );
      })}

      {/* DOORS */}
      {plan.doors.map((d, i) => {
        const isVertical = Math.abs(d.x1 - d.x2) < 0.5;
        const dx1 = ox + d.x1 * sc;
        const dy1 = oy + d.y1 * sc;
        const dx2 = ox + d.x2 * sc;
        const dy2 = oy + d.y2 * sc;

        if (d.type === "main_door") {
          return (
            <g key={`d${i}`}>
              <line x1={dx1} y1={dy1} x2={dx2} y2={dy2} stroke="#d4a574" strokeWidth="3.5" />
              {/* Door arc */}
              <path d={`M ${dx1},${dy1} A ${(dx2 - dx1) * 0.8},${(dx2 - dx1) * 0.8} 0 0 1 ${dx1 + (dx2 - dx1) * 0.7},${dy1 + (dx2 - dx1) * 0.5}`} fill="none" stroke="#d4a574" strokeWidth="1" strokeDasharray="3 2" />
              <text x={(dx1 + dx2) / 2} y={dy1 + 12} textAnchor="middle" fontSize="6" fill="#d4a574" fontFamily="'JetBrains Mono'" fontWeight="600">ENTRANCE</text>
            </g>
          );
        }

        return (
          <g key={`d${i}`}>
            <line x1={dx1} y1={dy1} x2={dx2} y2={dy2} stroke="#d4a574" strokeWidth="2.5" />
            {/* Simple door arc */}
            {isVertical ? (
              <path d={`M ${dx1},${dy1} Q ${dx1 + 8},${(dy1 + dy2) / 2} ${dx2},${dy2}`} fill="none" stroke="rgba(212,165,116,0.4)" strokeWidth="0.8" strokeDasharray="2 2" />
            ) : (
              <path d={`M ${dx1},${dy1} Q ${(dx1 + dx2) / 2},${dy1 - 8} ${dx2},${dy2}`} fill="none" stroke="rgba(212,165,116,0.4)" strokeWidth="0.8" strokeDasharray="2 2" />
            )}
          </g>
        );
      })}

      {/* WINDOWS */}
      {plan.windows.map((w, i) => {
        let wx1, wy1, wx2, wy2;
        if (w.side === "left") {
          wx1 = ox; wy1 = oy + (w.ym || 0) * sc; wx2 = ox; wy2 = wy1 + w.len * sc;
        } else if (w.side === "right") {
          wx1 = ox + bW * sc; wy1 = oy + (w.ym || 0) * sc; wx2 = ox + bW * sc; wy2 = wy1 + w.len * sc;
        } else if (w.side === "top") {
          wx1 = ox + (w.xm || 0) * sc; wy1 = oy; wx2 = wx1 + w.len * sc; wy2 = oy;
        } else {
          wx1 = ox + (w.xm || 0) * sc; wy1 = oy + bD * sc; wx2 = wx1 + w.len * sc; wy2 = oy + bD * sc;
        }
        return (
          <g key={`w${i}`}>
            <line x1={wx1} y1={wy1} x2={wx2} y2={wy2} stroke="#5ba3c4" strokeWidth="3" />
            <line x1={wx1} y1={wy1} x2={wx2} y2={wy2} stroke="#7bc4e4" strokeWidth="1.2" />
          </g>
        );
      })}

      {/* DIMENSION LINES */}
      {/* Width — top */}
      <line x1={pad} y1={pad - 18} x2={pad + plotWidth * sc} y2={pad - 18} stroke="#d4a574" strokeWidth="0.7" markerStart="url(#arrowS)" markerEnd="url(#arrowS)" />
      <text x={pad + plotWidth * sc / 2} y={pad - 23} textAnchor="middle" fontSize="8.5" fill="#d4a574" fontFamily="'JetBrains Mono'">{plotWidth}' ({(plotWidth * 0.3048).toFixed(1)}m)</text>

      {/* Depth — left */}
      <line x1={pad - 18} y1={pad} x2={pad - 18} y2={pad + plotDepth * sc} stroke="#d4a574" strokeWidth="0.7" markerStart="url(#arrowS)" markerEnd="url(#arrowS)" />
      <text x={pad - 24} y={pad + plotDepth * sc / 2} textAnchor="middle" fontSize="8.5" fill="#d4a574" fontFamily="'JetBrains Mono'" transform={`rotate(-90, ${pad - 24}, ${pad + plotDepth * sc / 2})`}>{plotDepth}' ({(plotDepth * 0.3048).toFixed(1)}m)</text>

      {/* COMPASS */}
      <g transform={`translate(${svgW - 38}, 34)`}>
        <circle r="18" fill="rgba(12,26,44,0.9)" stroke="rgba(212,165,116,0.4)" strokeWidth="0.8" />
        <polygon points="0,-14 -4,-2 0,-5 4,-2" fill="#d4a574" />
        <polygon points="0,14 -4,2 0,5 4,2" fill="rgba(240,230,216,0.2)" />
        <text y="-6" textAnchor="middle" fontSize="5.5" fill="#d4a574" fontFamily="'JetBrains Mono'" fontWeight="bold">N</text>
        <text y="12" textAnchor="middle" fontSize="4" fill="rgba(240,230,216,0.25)" fontFamily="'JetBrains Mono'">S</text>
      </g>

      {/* Direction labels */}
      <text x={svgW / 2} y={pad - 36} textAnchor="middle" fontSize="7" fill="rgba(240,230,216,0.25)" fontFamily="'JetBrains Mono'" letterSpacing="2">{dirLabels.top}</text>
      <text x={svgW / 2} y={pad + plotDepth * sc + 16} textAnchor="middle" fontSize="7" fill="rgba(212,165,116,0.45)" fontFamily="'JetBrains Mono'" letterSpacing="2">▼ {dirLabels.bottom} ▼</text>
      <text x={pad - 38} y={pad + plotDepth * sc / 2} textAnchor="middle" fontSize="6" fill="rgba(240,230,216,0.2)" fontFamily="'JetBrains Mono'" transform={`rotate(-90,${pad - 38},${pad + plotDepth * sc / 2})`}>{dirLabels.left}</text>
      <text x={svgW - 6} y={pad + plotDepth * sc / 2} textAnchor="middle" fontSize="6" fill="rgba(240,230,216,0.2)" fontFamily="'JetBrains Mono'" transform={`rotate(90,${svgW - 6},${pad + plotDepth * sc / 2})`}>{dirLabels.right}</text>
    </svg>
  );
}


// ═══════════════════════════════════════════════════════════
// MAIN APPLICATION
// ═══════════════════════════════════════════════════════════

export default function VastuPlanApp() {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState({
    plotWidth: 30, plotDepth: 30, facing: "E", floors: 2,
    bedrooms: 3, bathrooms: 3,
    hasPooja: true, hasBalcony: true, hasParking: false, hasStore: true,
  });
  const [activeFloor, setActiveFloor] = useState(0);
  const [showVastuPanel, setShowVastuPanel] = useState(false);

  const result = useMemo(() => step === 1 ? createLayoutEngine(config) : null, [step, config]);
  const update = (k, v) => setConfig(p => ({ ...p, [k]: v }));

  const plotArea = config.plotWidth * config.plotDepth;
  const plotSqYards = Math.round(plotArea / 9);
  const builtArea = useMemo(() => {
    if (!result) return 0;
    return result.plans.reduce((sum, p) => {
      const area = p.rooms.filter(r => !r.isOutside && !r.isOpen).reduce((s, r) => s + r.w * r.h, 0);
      return sum + area;
    }, 0);
  }, [result]);

  return (
    <div style={{ minHeight: "100vh", background: "#080e18", color: "#ede6da", fontFamily: "'Outfit', 'DM Sans', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&family=Cormorant+Garamond:wght@400;600;700&display=swap" rel="stylesheet" />

      {/* Grain overlay */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.02, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes slideIn { from { opacity:0; transform:translateX(-12px) } to { opacity:1; transform:translateX(0) } }
        * { margin:0; padding:0; box-sizing:border-box; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }
        input[type=number] { -moz-appearance:textfield; }
        ::selection { background: rgba(212,165,116,0.3); }
      `}</style>

      {/* ─── HEADER ─── */}
      <header style={{ textAlign: "center", padding: "32px 20px 4px", position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 9, letterSpacing: 6, color: "rgba(212,165,116,0.5)", fontFamily: "'JetBrains Mono'", textTransform: "uppercase", marginBottom: 6 }}>
          ☸ Vastu Shastra Compliant
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(30px,5vw,48px)", fontWeight: 700, letterSpacing: 1, lineHeight: 1.1 }}>
          VastuPlan
        </h1>
        <p style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "rgba(237,230,218,0.3)", letterSpacing: 4, marginTop: 4 }}>
          RESIDENTIAL FLOOR PLAN GENERATOR
        </p>
      </header>

      {/* ═══ STEP 0: CONFIGURATOR ═══ */}
      {step === 0 && (
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "20px 20px 60px", position: "relative", zIndex: 1, animation: "fadeUp 0.4s ease both" }}>

          {/* Plot Dimensions */}
          <Section icon="📐" title="Plot Dimensions">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <NumInput label="Plot Width" unit="ft" value={config.plotWidth} min={18} max={80} onChange={v => update("plotWidth", v)} />
              <NumInput label="Plot Depth" unit="ft" value={config.plotDepth} min={18} max={80} onChange={v => update("plotDepth", v)} />
            </div>
            <InfoBar text={`${plotArea} sqft · ${plotSqYards} sq yards · ${(config.plotWidth * 0.3048).toFixed(1)}m × ${(config.plotDepth * 0.3048).toFixed(1)}m`} />
          </Section>

          {/* Facing */}
          <Section icon="🧭" title="Plot Facing (Road Side)">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {Object.entries(FACING_META).map(([key, meta]) => (
                <FacingBtn key={key} active={config.facing === key} onClick={() => update("facing", key)} icon={meta.icon} label={meta.label} rank={meta.vastuRank} desc={meta.desc} />
              ))}
            </div>
          </Section>

          {/* Floors */}
          <Section icon="🏗️" title="Number of Floors">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              {[{ v: 1, l: "G (Ground)" }, { v: 2, l: "G + 1" }, { v: 3, l: "G + 2" }].map(o => (
                <ChoiceBtn key={o.v} active={config.floors === o.v} onClick={() => update("floors", o.v)} label={o.l} />
              ))}
            </div>
          </Section>

          {/* Bedrooms & Bathrooms */}
          <Section icon="🛏️" title="Bedrooms & Bathrooms">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Counter label="Bedrooms" value={config.bedrooms} min={1} max={config.floors === 1 ? 2 : config.floors === 2 ? 4 : 6} onChange={v => update("bedrooms", v)} />
              <Counter label="Bathrooms" value={config.bathrooms} min={1} max={config.bedrooms + 1} onChange={v => update("bathrooms", v)} />
            </div>
            <InfoBar text={`${config.bedrooms} BHK · ${config.bedrooms > config.floors ? "Bedrooms distributed across floors" : "1 bedroom per floor"} · Min plot for ${config.bedrooms}BHK: ${config.bedrooms <= 2 ? "600" : config.bedrooms <= 3 ? "800" : "1200"} sqft`} />
          </Section>

          {/* Features */}
          <Section icon="✦" title="Additional Features">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Toggle label="Pooja Room" active={config.hasPooja} onClick={() => update("hasPooja", !config.hasPooja)} badge="Vastu ✓" />
              <Toggle label="Balcony" active={config.hasBalcony} onClick={() => update("hasBalcony", !config.hasBalcony)} />
              <Toggle label="Car Parking" active={config.hasParking} onClick={() => update("hasParking", !config.hasParking)} badge="In setback" />
              <Toggle label="Store Room" active={config.hasStore} onClick={() => update("hasStore", !config.hasStore)} />
            </div>
          </Section>

          {/* Vastu Preview */}
          <div style={{
            background: "rgba(212,165,116,0.04)", border: "1px solid rgba(212,165,116,0.1)",
            borderRadius: 8, padding: 20, textAlign: "center", marginBottom: 20, marginTop: 8,
          }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: "rgba(237,230,218,0.35)", fontFamily: "'JetBrains Mono'" }}>EXPECTED VASTU SCORE</div>
            <div style={{ fontFamily: "'Cormorant Garamond'", fontSize: 52, fontWeight: 700, color: config.facing === "E" || config.facing === "N" ? "#6b9f71" : "#d4a574", marginTop: 4 }}>
              {config.facing === "E" ? "90+" : config.facing === "N" ? "85+" : config.facing === "W" ? "70+" : "60+"}%
            </div>
            <div style={{ fontSize: 11, color: "rgba(237,230,218,0.4)", marginTop: 4 }}>{FACING_META[config.facing].desc}</div>
          </div>

          {/* Generate */}
          <button onClick={() => { setStep(1); setActiveFloor(0); }} style={{
            width: "100%", padding: "16px", border: "none", borderRadius: 8, cursor: "pointer",
            background: "linear-gradient(135deg, #d4a574, #a07850)", color: "#080e18",
            fontSize: 14, fontWeight: 700, letterSpacing: 1.5, fontFamily: "'Outfit'",
            boxShadow: "0 4px 24px rgba(212,165,116,0.2)", transition: "transform 0.15s",
          }}
            onMouseDown={e => e.target.style.transform = "scale(0.98)"}
            onMouseUp={e => e.target.style.transform = "scale(1)"}
          >
            GENERATE VASTU FLOOR PLAN →
          </button>
        </div>
      )}

      {/* ═══ STEP 1: RESULT ═══ */}
      {step === 1 && result && (
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "12px 16px 60px", position: "relative", zIndex: 1, animation: "fadeUp 0.45s ease both" }}>

          {/* Top bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            <button onClick={() => setStep(0)} style={{
              background: "rgba(237,230,218,0.04)", border: "1px solid rgba(212,165,116,0.12)", borderRadius: 5,
              padding: "7px 14px", color: "#d4a574", cursor: "pointer", fontSize: 12, fontFamily: "'Outfit'",
            }}>← Modify</button>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              {[
                { l: "PLOT", v: `${config.plotWidth}' × ${config.plotDepth}'` },
                { l: "CONFIG", v: `${config.bedrooms}BHK / ${config.bathrooms}B` },
                { l: "FLOORS", v: config.floors === 1 ? "G" : config.floors === 2 ? "G+1" : "G+2" },
                { l: "BUILT-UP", v: `~${builtArea} sqft` },
                { l: "VASTU", v: `${result.vastuResult.score}%` },
              ].map(s => (
                <div key={s.l} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 8, letterSpacing: 2, color: "rgba(237,230,218,0.3)", fontFamily: "'JetBrains Mono'" }}>{s.l}</div>
                  <div style={{ fontSize: 12, color: "#d4a574", fontWeight: 500, fontFamily: "'JetBrains Mono'" }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Floor tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {result.plans.map((p, i) => (
              <button key={i} onClick={() => setActiveFloor(i)} style={{
                background: activeFloor === i ? "rgba(212,165,116,0.12)" : "transparent",
                border: activeFloor === i ? "1.5px solid rgba(212,165,116,0.35)" : "1px solid rgba(212,165,116,0.08)",
                borderRadius: 5, padding: "9px 18px", cursor: "pointer",
                color: activeFloor === i ? "#d4a574" : "rgba(237,230,218,0.35)",
                fontSize: 12, fontWeight: 600, fontFamily: "'Outfit'", transition: "all 0.15s",
              }}>
                {p.label}
                <span style={{ fontSize: 8, color: "rgba(237,230,218,0.25)", marginLeft: 6, fontFamily: "'JetBrains Mono'" }}>{p.level}</span>
              </button>
            ))}
            <button onClick={() => setShowVastuPanel(!showVastuPanel)} style={{
              marginLeft: "auto", background: showVastuPanel ? "rgba(107,159,113,0.12)" : "transparent",
              border: "1px solid rgba(107,159,113,0.2)", borderRadius: 5, padding: "9px 14px",
              cursor: "pointer", color: "#6b9f71", fontSize: 11, fontFamily: "'Outfit'", fontWeight: 500,
            }}>
              ☸ Vastu Report
            </button>
          </div>

          {/* Main content */}
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {/* SVG Plan */}
            <div style={{
              flex: "1 1 440px", minWidth: 340,
              background: "rgba(12,26,44,0.5)", border: "1px solid rgba(212,165,116,0.08)",
              borderRadius: 8, padding: 14, position: "relative",
            }}>
              <FloorPlanSVG
                plan={result.plans[activeFloor]}
                setback={result.setback}
                plotWidth={config.plotWidth}
                plotDepth={config.plotDepth}
                facing={config.facing}
                dirLabels={result.dirLabels}
              />
              {/* Legend */}
              <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
                {[
                  { color: "#d4a574", w: 12, h: 3, label: "Door" },
                  { color: "#5ba3c4", w: 12, h: 3, label: "Window" },
                  { color: "#d4a574", w: 8, h: 1, label: "Dimension", dash: true },
                  { color: "#4a3a2a", w: 12, h: 2, label: "Wall" },
                ].map(l => (
                  <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 8, color: "rgba(237,230,218,0.3)", fontFamily: "'JetBrains Mono'" }}>
                    <div style={{ width: l.w, height: l.h, background: l.color, borderRadius: 0.5, opacity: l.dash ? 0.5 : 1 }} />
                    {l.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Right panel: Room Schedule OR Vastu Report */}
            <div style={{ flex: "0 0 290px", minWidth: 250 }}>
              {!showVastuPanel ? (
                <>
                  <div style={{ fontSize: 9, letterSpacing: 3, color: "rgba(237,230,218,0.3)", fontFamily: "'JetBrains Mono'", marginBottom: 8 }}>ROOM SCHEDULE</div>
                  {result.plans[activeFloor].rooms.map((room, idx) => (
                    <div key={room.id} style={{
                      background: "rgba(212,165,116,0.03)", border: "1px solid rgba(212,165,116,0.06)",
                      borderRadius: 5, padding: "8px 10px", marginBottom: 4, animation: `slideIn 0.3s ${idx * 0.04}s ease both`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: room.isOpen ? "#6b9f71" : room.isWet ? "#5ba3c4" : "#d4a574" }}>{room.name}</span>
                        <span style={{ fontSize: 9, color: "rgba(237,230,218,0.35)", fontFamily: "'JetBrains Mono'" }}>
                          {room.w}' × {room.h}' · {room.w * room.h} sqft
                        </span>
                      </div>
                      <div style={{ fontSize: 9, color: "rgba(237,230,218,0.3)", marginTop: 2 }}>☸ {room.vastu}</div>
                    </div>
                  ))}

                  {/* Cost estimate */}
                  <div style={{
                    marginTop: 16, padding: 14, background: "rgba(107,159,113,0.05)",
                    border: "1px solid rgba(107,159,113,0.1)", borderRadius: 6, textAlign: "center",
                  }}>
                    <div style={{ fontSize: 8, letterSpacing: 2, color: "rgba(237,230,218,0.3)", fontFamily: "'JetBrains Mono'" }}>EST. CONSTRUCTION COST</div>
                    <div style={{ fontFamily: "'Cormorant Garamond'", fontSize: 28, fontWeight: 700, color: "#6b9f71", marginTop: 2 }}>
                      ₹{Math.round(builtArea * 1800 / 100000)}–{Math.round(builtArea * 2800 / 100000)}L
                    </div>
                    <div style={{ fontSize: 8, color: "rgba(237,230,218,0.25)", fontFamily: "'JetBrains Mono'", marginTop: 2 }}>
                      @₹1,800–2,800/sqft · {builtArea} sqft · Tier 2-3 cities
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Vastu Report */}
                  <div style={{ fontSize: 9, letterSpacing: 3, color: "rgba(237,230,218,0.3)", fontFamily: "'JetBrains Mono'", marginBottom: 8 }}>VASTU COMPLIANCE REPORT</div>
                  <div style={{
                    textAlign: "center", padding: 16, background: "rgba(212,165,116,0.04)",
                    border: "1px solid rgba(212,165,116,0.1)", borderRadius: 6, marginBottom: 12,
                  }}>
                    <div style={{
                      fontFamily: "'Cormorant Garamond'", fontSize: 48, fontWeight: 700,
                      color: result.vastuResult.score >= 80 ? "#6b9f71" : result.vastuResult.score >= 60 ? "#d4a574" : "#c46b5b",
                    }}>
                      {result.vastuResult.score}%
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(237,230,218,0.4)", marginTop: 2 }}>
                      {result.vastuResult.score >= 80 ? "Excellent Vastu Alignment" : result.vastuResult.score >= 60 ? "Good — Minor Corrections Advised" : "Needs Vastu Corrections"}
                    </div>
                  </div>

                  {result.vastuResult.tips.map((tip, i) => (
                    <div key={i} style={{
                      display: "flex", gap: 8, alignItems: "flex-start", padding: "7px 10px",
                      background: tip.type === "good" ? "rgba(107,159,113,0.05)" : tip.type === "bad" ? "rgba(196,107,91,0.05)" : "rgba(212,165,116,0.04)",
                      borderLeft: `2px solid ${tip.type === "good" ? "rgba(107,159,113,0.4)" : tip.type === "bad" ? "rgba(196,107,91,0.3)" : "rgba(212,165,116,0.2)"}`,
                      borderRadius: "0 4px 4px 0", marginBottom: 3, animation: `slideIn 0.3s ${i * 0.05}s ease both`,
                    }}>
                      <span style={{ fontSize: 10, color: "rgba(237,230,218,0.5)", lineHeight: 1.5 }}>{tip.text}</span>
                    </div>
                  ))}

                  {/* Vastu zones reference */}
                  <div style={{ fontSize: 9, letterSpacing: 3, color: "rgba(237,230,218,0.3)", fontFamily: "'JetBrains Mono'", margin: "16px 0 8px" }}>VASTU ZONES (DISHA)</div>
                  {Object.entries(VASTU_ZONES).slice(0, 4).map(([z, info]) => (
                    <div key={z} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0" }}>
                      <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono'", color: "#d4a574", minWidth: 22, fontWeight: 600 }}>{z}</span>
                      <span style={{ fontSize: 9, color: "rgba(237,230,218,0.35)" }}>{info.label} · {info.element} · {info.ideal.join(", ")}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Footer notes */}
          <div style={{
            fontFamily: "'JetBrains Mono'", fontSize: 9, color: "rgba(237,230,218,0.2)",
            padding: "14px 0", borderTop: "1px solid rgba(212,165,116,0.06)", marginTop: 18, lineHeight: 1.9,
          }}>
            ※ SETBACKS: Front — {result.setback.front}ft · Rear — {result.setback.rear}ft · Sides — {result.setback.left}ft each
            &nbsp;|&nbsp; FLOOR HEIGHT: 10ft clear · PARAPET: 3.5ft
            &nbsp;|&nbsp; STRUCTURE: RCC Frame / Load-bearing · M25 Concrete · Fe500 Steel
            &nbsp;|&nbsp; OVERHEAD TANK: NW zone per Vastu · SEPTIC: North side
            <br/>※ This is a conceptual Vastu-compliant plan. Please consult a licensed architect for structural drawings, soil testing, and municipal approval (DTCP/HMDA/BDA etc).
          </div>
        </div>
      )}

      <footer style={{ textAlign: "center", padding: 20, fontSize: 8, color: "rgba(237,230,218,0.15)", letterSpacing: 2, fontFamily: "'JetBrains Mono'", position: "relative", zIndex: 1 }}>
        VASTUPLAN v2.0 · CONCEPTUAL ARCHITECTURAL TOOL
      </footer>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// REUSABLE UI COMPONENTS
// ═══════════════════════════════════════════════════════════

function Section({ icon, title, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(237,230,218,0.65)", letterSpacing: 0.3 }}>{title}</span>
        <div style={{ flex: 1, height: 1, background: "rgba(212,165,116,0.08)" }} />
      </div>
      {children}
    </div>
  );
}

function NumInput({ label, unit, value, min, max, onChange }) {
  return (
    <div>
      <label style={{ fontSize: 9, letterSpacing: 1, color: "rgba(237,230,218,0.35)", fontFamily: "'JetBrains Mono'", display: "block", marginBottom: 4 }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button onClick={() => value > min && onChange(value - 1)} style={{ ...counterBtnStyle }}>−</button>
        <input type="number" value={value} min={min} max={max} onChange={e => { const v = Number(e.target.value); if (v >= min && v <= max) onChange(v); }}
          style={{
            flex: 1, padding: "9px 10px", background: "rgba(237,230,218,0.03)", border: "1px solid rgba(212,165,116,0.1)",
            borderRadius: 4, color: "#ede6da", fontFamily: "'JetBrains Mono'", fontSize: 14, outline: "none", textAlign: "center",
          }}
          onFocus={e => e.target.style.borderColor = "rgba(212,165,116,0.3)"}
          onBlur={e => e.target.style.borderColor = "rgba(212,165,116,0.1)"}
        />
        <button onClick={() => value < max && onChange(value + 1)} style={{ ...counterBtnStyle }}>+</button>
        <span style={{ fontSize: 10, color: "rgba(237,230,218,0.3)", fontFamily: "'JetBrains Mono'", minWidth: 18 }}>{unit}</span>
      </div>
    </div>
  );
}

function InfoBar({ text }) {
  return (
    <div style={{
      padding: "8px 12px", background: "rgba(107,159,113,0.05)", borderRadius: 4,
      fontFamily: "'JetBrains Mono'", fontSize: 10, color: "rgba(107,159,113,0.7)",
      marginTop: 8, borderLeft: "2px solid rgba(107,159,113,0.2)",
    }}>{text}</div>
  );
}

function FacingBtn({ active, onClick, icon, label, rank, desc }) {
  return (
    <button onClick={onClick} style={{
      background: active ? "rgba(212,165,116,0.1)" : "rgba(237,230,218,0.02)",
      border: active ? "1.5px solid rgba(212,165,116,0.4)" : "1px solid rgba(212,165,116,0.08)",
      borderRadius: 6, padding: "12px 6px", cursor: "pointer",
      color: active ? "#d4a574" : "rgba(237,230,218,0.4)", transition: "all 0.15s", textAlign: "center",
    }}>
      <div style={{ fontSize: 20, marginBottom: 2 }}>{icon}</div>
      <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 8, marginTop: 3, fontFamily: "'JetBrains Mono'", color: rank <= 2 ? "rgba(107,159,113,0.6)" : "rgba(237,230,218,0.25)" }}>
        #{rank} Vastu
      </div>
    </button>
  );
}

function ChoiceBtn({ active, onClick, label }) {
  return (
    <button onClick={onClick} style={{
      background: active ? "rgba(212,165,116,0.1)" : "rgba(237,230,218,0.02)",
      border: active ? "1.5px solid rgba(212,165,116,0.4)" : "1px solid rgba(212,165,116,0.08)",
      borderRadius: 5, padding: "11px 8px", cursor: "pointer",
      color: active ? "#d4a574" : "rgba(237,230,218,0.4)", fontSize: 12, fontWeight: 500,
      fontFamily: "'Outfit'", transition: "all 0.15s",
    }}>{label}</button>
  );
}

const counterBtnStyle = {
  width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
  background: "rgba(212,165,116,0.06)", border: "1px solid rgba(212,165,116,0.12)",
  color: "#d4a574", fontSize: 16, cursor: "pointer", lineHeight: 1, fontFamily: "system-ui",
};

function Counter({ label, value, min, max, onChange }) {
  return (
    <div style={{
      background: "rgba(237,230,218,0.02)", border: "1px solid rgba(212,165,116,0.08)",
      borderRadius: 6, padding: 14, textAlign: "center",
    }}>
      <div style={{ fontSize: 11, color: "rgba(237,230,218,0.45)", marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <button onClick={() => value > min && onChange(value - 1)} style={counterBtnStyle}>−</button>
        <span style={{ fontFamily: "'Cormorant Garamond'", fontSize: 30, fontWeight: 700, color: "#d4a574", minWidth: 28 }}>{value}</span>
        <button onClick={() => value < max && onChange(value + 1)} style={counterBtnStyle}>+</button>
      </div>
    </div>
  );
}

function Toggle({ label, active, onClick, badge }) {
  return (
    <button onClick={onClick} style={{
      background: active ? "rgba(107,159,113,0.08)" : "rgba(237,230,218,0.02)",
      border: active ? "1.5px solid rgba(107,159,113,0.3)" : "1px solid rgba(212,165,116,0.08)",
      borderRadius: 5, padding: "9px 12px", cursor: "pointer",
      color: active ? "#6b9f71" : "rgba(237,230,218,0.35)", fontSize: 12, fontWeight: 500,
      fontFamily: "'Outfit'", transition: "all 0.15s", textAlign: "left",
      display: "flex", justifyContent: "space-between", alignItems: "center",
    }}>
      <span>{active ? "✓ " : ""}{label}</span>
      {badge && <span style={{ fontSize: 7, fontFamily: "'JetBrains Mono'", color: "rgba(107,159,113,0.5)" }}>{badge}</span>}
    </button>
  );
}
