import type { DecorationKind, TableShape } from "../domain/types";

export interface ZoneLayout {
  key: string;
  name: string;
  minSpend: number;
  color: string;
  capacity: number;
  labelPrefix: string;
  shape: TableShape;
  width: number;
  height: number;
  /** Lijevi gornji kutovi stolova. */
  positions: readonly { x: number; y: number }[];
}

export interface DecorationLayout {
  kind: DecorationKind;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FloorLayout {
  key: string;
  name: string;
  width: number;
  height: number;
  zones: readonly ZoneLayout[];
  decorations: readonly DecorationLayout[];
}

/** Pozicije u mreži: redak po redak, lijevo-desno. */
export function grid(options: {
  x: number;
  y: number;
  cols: number;
  rows: number;
  stepX: number;
  stepY: number;
}): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  for (let row = 0; row < options.rows; row += 1) {
    for (let col = 0; col < options.cols; col += 1) {
      positions.push({ x: options.x + col * options.stepX, y: options.y + row * options.stepY });
    }
  }
  return positions;
}

/** Prizemlje: 50 stolova (Standard 30, Premium 16, Platinum 4). */
export const GROUND_FLOOR: FloorLayout = {
  key: "prizemlje",
  name: "Prizemlje",
  width: 1000,
  height: 700,
  decorations: [
    { kind: "dj", label: "DJ", x: 425, y: 20, width: 150, height: 60 },
    { kind: "dancefloor", label: "Podij", x: 300, y: 110, width: 400, height: 260 },
    { kind: "bar", label: "Šank", x: 300, y: 600, width: 400, height: 60 },
    { kind: "stairs", label: "Stepenice", x: 20, y: 600, width: 100, height: 80 },
    { kind: "wc", label: "WC", x: 880, y: 600, width: 100, height: 80 },
  ],
  zones: [
    {
      key: "standard",
      name: "Standard",
      minSpend: 150,
      color: "#64748b",
      capacity: 4,
      labelPrefix: "S",
      shape: "round",
      width: 50,
      height: 50,
      positions: [
        ...grid({ x: 20, y: 30, cols: 3, rows: 5, stepX: 60, stepY: 110 }),
        ...grid({ x: 810, y: 30, cols: 3, rows: 5, stepX: 60, stepY: 110 }),
      ],
    },
    {
      key: "premium",
      name: "Premium",
      minSpend: 300,
      color: "#0ea5e9",
      capacity: 6,
      labelPrefix: "P",
      shape: "round",
      width: 44,
      height: 44,
      positions: [
        ...grid({ x: 215, y: 110, cols: 1, rows: 4, stepX: 0, stepY: 70 }),
        ...grid({ x: 741, y: 110, cols: 1, rows: 4, stepX: 0, stepY: 70 }),
        ...grid({ x: 308, y: 395, cols: 8, rows: 1, stepX: 50, stepY: 0 }),
      ],
    },
    {
      key: "platinum",
      name: "Platinum",
      minSpend: 800,
      color: "#a855f7",
      capacity: 10,
      labelPrefix: "PL",
      shape: "rect",
      width: 70,
      height: 50,
      positions: [
        { x: 240, y: 25 },
        { x: 330, y: 25 },
        { x: 600, y: 25 },
        { x: 690, y: 25 },
      ],
    },
  ],
};

/** Kat: 40 stolova (Lounge 24, VIP 12, Balkon 4). */
export const FIRST_FLOOR: FloorLayout = {
  key: "kat",
  name: "Kat",
  width: 1000,
  height: 700,
  decorations: [
    { kind: "void", label: "Pogled na podij", x: 300, y: 150, width: 400, height: 250 },
    { kind: "bar", label: "Šank", x: 900, y: 200, width: 70, height: 300 },
    { kind: "stairs", label: "Stepenice", x: 20, y: 600, width: 100, height: 80 },
    { kind: "wc", label: "WC", x: 880, y: 20, width: 100, height: 80 },
  ],
  zones: [
    {
      key: "lounge",
      name: "Lounge",
      minSpend: 250,
      color: "#14b8a6",
      capacity: 6,
      labelPrefix: "L",
      shape: "rect",
      width: 60,
      height: 55,
      positions: [
        ...grid({ x: 30, y: 160, cols: 3, rows: 4, stepX: 80, stepY: 100 }),
        ...grid({ x: 730, y: 150, cols: 2, rows: 6, stepX: 80, stepY: 70 }),
      ],
    },
    {
      key: "vip",
      name: "VIP",
      minSpend: 500,
      color: "#f59e0b",
      capacity: 8,
      labelPrefix: "V",
      shape: "rect",
      width: 80,
      height: 50,
      positions: grid({ x: 140, y: 20, cols: 6, rows: 2, stepX: 120, stepY: 60 }),
    },
    {
      key: "balkon",
      name: "Balkon",
      minSpend: 1000,
      color: "#ec4899",
      capacity: 10,
      labelPrefix: "B",
      shape: "rect",
      width: 70,
      height: 50,
      positions: grid({ x: 310, y: 410, cols: 4, rows: 1, stepX: 100, stepY: 0 }),
    },
  ],
};

export const DEFAULT_FLOORS: readonly FloorLayout[] = [GROUND_FLOOR, FIRST_FLOOR];
