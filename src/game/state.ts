import type { CropId } from "../data/crops";
import type { SpiritId } from "../data/spirits";

export type ToolKind = "hoe" | "can";
export type Slot =
  | { kind: "tool"; tool: ToolKind }
  | { kind: "seed"; crop: CropId }
  | { kind: "empty" };

export const SLOT_COUNT = 8;
export const DAY_LENGTH = 45;
export const CAN_CAPACITY = 4;
export const MOISTURE_MAX = 3;

export type Save = {
  v: 1;
  px: number;
  py: number;
  dir: Dir;
  coins: number;
  day: number;
  dayTime: number;
  charges: number;
  slots: Slot[];
  selected: number;
  seeds: Record<CropId, number>;
  harvest: Record<CropId, number>;
  plots: [number, number, number, CropId?, number?][];
  /** [species, x, y, dir, trust, want] — absent in saves written before spirits existed */
  spirits?: [SpiritId, number, number, Dir, number, CropId][];
  /** absent in saves written before the Root Network existed */
  roots?: RootsSave;
  scene?: Scene;
};

export type Scene = "grove" | "roots";

export type RootsSave = {
  layer: number;
  tide: number;
  /** cave tile indices emptied today, keyed by layer */
  picked: Record<number, number[]>;
  /** where the alchemist stood above ground before descending */
  surface: [number, number, Dir];
};

export type Dir = "down" | "up" | "left" | "right";

export type Game = {
  px: number;
  py: number;
  dir: Dir;
  moving: boolean;
  anim: number;
  coins: number;
  day: number;
  dayTime: number;
  charges: number;
  slots: Slot[];
  selected: number;
  seeds: Record<CropId, number>;
  harvest: Record<CropId, number>;
  /** seconds of fast-forward fade left, or 0 */
  skip: number;
  shopOpen: boolean;
  scene: Scene;
};

const KEY = "chimeragrove.save.v1";

export function newGame(): Game {
  const seeds: Record<CropId, number> = {
    moonpetal: 8,
    ember_root: 0,
    glass_fern: 0,
    voidcap: 0,
    whisper_vine: 0,
  };
  const harvest: Record<CropId, number> = {
    moonpetal: 0,
    ember_root: 0,
    glass_fern: 0,
    voidcap: 0,
    whisper_vine: 0,
  };
  return {
    px: 0,
    py: 0,
    dir: "down",
    moving: false,
    anim: 0,
    coins: 60,
    day: 1,
    dayTime: 0,
    charges: CAN_CAPACITY,
    slots: [
      { kind: "tool", tool: "hoe" },
      { kind: "tool", tool: "can" },
      { kind: "seed", crop: "moonpetal" },
      { kind: "seed", crop: "ember_root" },
      { kind: "seed", crop: "glass_fern" },
      { kind: "seed", crop: "voidcap" },
      { kind: "seed", crop: "whisper_vine" },
      { kind: "empty" },
    ],
    selected: 2,
    seeds,
    harvest,
    skip: 0,
    shopOpen: false,
    scene: "grove",
  };
}

export function saveGame(
  g: Game,
  kind: Uint8Array,
  plots: Save["plots"],
  spirits: Save["spirits"],
  roots: RootsSave,
): void {
  const data: Save = {
    v: 1,
    px: g.px,
    py: g.py,
    dir: g.dir,
    coins: g.coins,
    day: g.day,
    dayTime: g.dayTime,
    charges: g.charges,
    slots: g.slots,
    selected: g.selected,
    seeds: g.seeds,
    harvest: g.harvest,
    plots,
    spirits,
    roots,
    scene: g.scene,
  };
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ game: data, kind: Array.from(kind) }),
    );
  } catch {
    /* storage full or blocked — the run still works in-memory */
  }
}

export function loadGame(): { game: Save; kind: number[] } | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.game?.v !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
