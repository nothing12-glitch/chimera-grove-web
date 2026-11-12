import type { CropId } from "../data/crops";
import { HP_MAX } from "../data/enemies";
import type { PotionId } from "../data/potions";
import type { SpiritId } from "../data/spirits";
import { newStats, type Stats } from "../data/stats";
import type { World } from "../data/world";

export type ToolKind = "hoe" | "can" | "sickle";
export type Slot =
  | { kind: "tool"; tool: ToolKind }
  | { kind: "seed"; crop: CropId }
  | { kind: "empty" };

export const SLOT_COUNT = 8;
/**
 * A day is 8:00 → 20:00, twelve game hours. The default is 720 real seconds —
 * one game minute per second — but the menu lets you make the grove hurry
 * (six minutes) or take its time (twenty-four), so the clock lives in a
 * variable the settings write to rather than a constant the rules read.
 */
export const DAY_MINUTES = [6, 12, 24] as const;
export const DEFAULT_DAY_MINUTES = 12;
export const CAN_CAPACITY = 4;
export const MOISTURE_MAX = 3;

let daySeconds = DEFAULT_DAY_MINUTES * 60;

export function dayLength(): number {
  return daySeconds;
}

export function setDayLength(minutes: number): void {
  daySeconds = Math.max(1, Math.round(minutes)) * 60;
}

export type Save = {
  v: 2;
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
  /** absent in saves written before the alchemical table existed */
  potions?: Record<PotionId, number>;
  /** [speed, light, calm] seconds left */
  effects?: [number, number, number];
  growth?: number;
  /** tile indices of dissolved passes and emptied hoards — the map remembers these */
  opened?: number[];
  looted?: number[];
  /** absent in saves written before the grove grew teeth */
  hp?: number;
  /** the crown stays dead once it has been cut down */
  bossDowned?: boolean;
  /** absent in saves written before the grove kept score */
  stats?: Stats;
  /** achievement ids already announced, so a title never toasts twice */
  ach?: string[];
  /** how long a day ran when this save was written, in real seconds */
  dayLen?: number;
};

export type Scene = "grove" | "roots";

/** Seconds of real time left on each brewed flask. */
export type Effects = { speed: number; light: number; calm: number };

export const NO_EFFECTS: Effects = { speed: 0, light: 0, calm: 0 };

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
  brewOpen: boolean;
  scene: Scene;
  potions: Record<PotionId, number>;
  effects: Effects;
  /** dawns of doubled growth still owed by the Quintessence */
  growth: number;
  /** hit points; the sickle is the only thing that keeps them from draining */
  hp: number;
  /** seconds of the swing arc still on screen */
  swing: number;
  /** mercy seconds after a hit, during which contact does nothing */
  hurt: number;
  /** the Crown of the Root Network has been cut down for good */
  bossDowned: boolean;
  /** what the grove remembers: harvest, kills, dives, conversations */
  stats: Stats;
  /** badges the player has already been congratulated for */
  ach: string[];
};

const KEY = "chimeragrove.save.v2";

export function newPotions(): Record<PotionId, number> {
  return { dew: 0, quintessence: 0, lamp_oil: 0, calm_wind: 0 };
}

/**
 * The only honest way to hand out suncents: every gain is also income the
 * grove remembers, so the ledger never disagrees with the purse.
 */
export function earn(g: Game, amount: number): void {
  g.coins += amount;
  g.stats.earned += amount;
}

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
      { kind: "tool", tool: "sickle" },
    ],
    selected: 2,
    seeds,
    harvest,
    skip: 0,
    shopOpen: false,
    brewOpen: false,
    scene: "grove",
    potions: newPotions(),
    effects: { ...NO_EFFECTS },
    growth: 0,
    hp: HP_MAX,
    swing: 0,
    hurt: 0,
    bossDowned: false,
    stats: newStats(),
    ach: [],
  };
}

export function saveGame(
  g: Game,
  w: World,
  plots: Save["plots"],
  spirits: Save["spirits"],
  roots: RootsSave,
): void {
  const data: Save = {
    v: 2,
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
    potions: g.potions,
    effects: [g.effects.speed, g.effects.light, g.effects.calm],
    growth: g.growth,
    opened: [...w.opened],
    looted: [...w.looted],
    hp: g.hp,
    bossDowned: g.bossDowned,
    stats: g.stats,
    ach: g.ach,
    dayLen: dayLength(),
  };
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ game: data, kind: Array.from(w.kind) }),
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
    if (parsed?.game?.v !== 2) return null;
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
