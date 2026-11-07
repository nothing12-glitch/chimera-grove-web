import { mulberry, rand01 } from "../core/rng";
import type { CropId } from "./crops";

export const TILE = 16;
export const MAP_W = 200;
export const MAP_H = 120;

export type TileKind = "grass" | "path" | "water" | "soil";

export type BiomeId = "home" | "thicket" | "marsh" | "ridge" | "ruins";

export const BIOME_ORDER: BiomeId[] = [
  "home",
  "thicket",
  "marsh",
  "ridge",
  "ruins",
];

export const BIOME_NAME: Record<BiomeId, string> = {
  home: "Рідний Гай",
  thicket: "Темна Чаща",
  marsh: "Сиве Болото",
  ridge: "Кам'яні Гребені",
  ruins: "Забуті Руїни",
};

/** Which biomes still accept a seed. Stone and old mortar hold nothing. */
const TILLABLE: Record<BiomeId, boolean> = {
  home: true,
  thicket: true,
  marsh: true,
  ridge: false,
  ruins: false,
};

export type ObjectKind =
  | "pine"
  | "round_tree"
  | "bush"
  | "rock"
  | "stump"
  | "stall"
  | "sign"
  | "fence"
  | "shrine"
  | "sinkhole"
  | "table"
  | "reed"
  | "swamp_tree"
  | "mushroom"
  | "dead_tree"
  | "pillar"
  | "crystal"
  | "scree"
  | "rockfall"
  | "rubble"
  | "cache"
  | "cache_open";

export type Plot = {
  moisture: number;
  crop?: CropId;
  /** accumulated growth points */
  points: number;
  /** 0..1 visual sway offset */
  sway: number;
};

export type Vault = {
  name: string;
  biome: BiomeId;
  tx: number;
  ty: number;
  /** the shaft waiting inside, and the depth it drops you to */
  layer: number;
};

export type World = {
  kind: Uint8Array;
  biome: Uint8Array;
  obj: ObjectKind[];
  /** tile index -> plot data (only for soil) */
  plots: Map<number, Plot>;
  stall: { tx: number; ty: number };
  /** the alchemist's own brewing bench */
  table: { tx: number; ty: number };
  /** every mouth of the Root Network, with the depth it delivers you to */
  sinkholes: { tx: number; ty: number; layer: number }[];
  spawn: { tx: number; ty: number };
  /** where each spirit was born; they wander around these */
  spiritHomes: { tx: number; ty: number }[];
  waterTiles: number[];
  vaults: Vault[];
  /** tile index of every root-knot hoard, for the map */
  caches: number[];
  /** rockfalls already dissolved — a pass stays open forever */
  opened: Set<number>;
  /** hoards already emptied */
  looted: Set<number>;
};

const KIND_BY_INDEX: TileKind[] = ["grass", "path", "water", "soil"];
const INDEX_BY_KIND: Record<TileKind, number> = {
  grass: 0,
  path: 1,
  water: 2,
  soil: 3,
};

const BIOME_BY_INDEX: BiomeId[] = BIOME_ORDER;
const INDEX_BY_BIOME: Record<BiomeId, number> = {
  home: 0,
  thicket: 1,
  marsh: 2,
  ridge: 3,
  ruins: 4,
};

export const idx = (tx: number, ty: number) => ty * MAP_W + tx;
export const inBounds = (tx: number, ty: number) =>
  tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H;

export function tileAt(w: World, tx: number, ty: number): TileKind {
  if (!inBounds(tx, ty)) return "water";
  return KIND_BY_INDEX[w.kind[idx(tx, ty)]];
}

export function biomeAt(w: World, tx: number, ty: number): BiomeId {
  if (!inBounds(tx, ty)) return "thicket";
  return BIOME_BY_INDEX[w.biome[idx(tx, ty)]];
}

export function setTile(
  w: World,
  tx: number,
  ty: number,
  kind: TileKind,
): void {
  if (!inBounds(tx, ty)) return;
  w.kind[idx(tx, ty)] = INDEX_BY_KIND[kind];
}

export function objectAt(
  w: World,
  tx: number,
  ty: number,
): ObjectKind | undefined {
  if (!inBounds(tx, ty)) return undefined;
  return w.obj[idx(tx, ty)];
}

const SOLID: Record<ObjectKind, boolean> = {
  pine: true,
  round_tree: true,
  bush: true,
  rock: true,
  stump: true,
  stall: true,
  table: true,
  sign: true,
  fence: true,
  shrine: true,
  reed: true,
  swamp_tree: true,
  dead_tree: true,
  pillar: true,
  /** a sealed pass is the hardest wall in the grove */
  rockfall: true,
  /** you can stand on the rim of the sinkhole — that is the point */
  sinkhole: false,
  mushroom: false,
  crystal: false,
  scree: false,
  rubble: false,
  cache: false,
  cache_open: false,
};

export function isSolid(w: World, tx: number, ty: number): boolean {
  if (!inBounds(tx, ty)) return true;
  if (tileAt(w, tx, ty) === "water") return true;
  const o = objectAt(w, tx, ty);
  return o ? SOLID[o] : false;
}

export function isTillable(w: World, tx: number, ty: number): boolean {
  if (!inBounds(tx, ty)) return false;
  if (!TILLABLE[biomeAt(w, tx, ty)]) return false;
  const k = tileAt(w, tx, ty);
  if (k !== "grass" && k !== "path") return false;
  return !objectAt(w, tx, ty);
}

/** The middle of the map is home; everything else is measured from it. */
const HOME = { x: MAP_W >> 1, y: MAP_H >> 1 };
const CLEAR_R = 17;
const VAULT_R = 10;

const VAULTS: Vault[] = [
  { name: "Кришталева Комора", biome: "ridge", tx: 168, ty: 24, layer: 2 },
  { name: "Сад Забутих Руїн", biome: "ruins", tx: 28, ty: 30, layer: 1 },
  { name: "Око Болота", biome: "marsh", tx: 152, ty: 98, layer: 3 },
];

/** Bilinear value noise on a coarse lattice: blobs, not static. */
function noise(tx: number, ty: number, cell: number, salt: number): number {
  const gx = Math.floor(tx / cell);
  const gy = Math.floor(ty / cell);
  const fx = tx / cell - gx;
  const fy = ty / cell - gy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = rand01(gx, gy, salt);
  const n10 = rand01(gx + 1, gy, salt);
  const n01 = rand01(gx, gy + 1, salt);
  const n11 = rand01(gx + 1, gy + 1, salt);
  const top = n00 + (n10 - n00) * sx;
  const bot = n01 + (n11 - n01) * sx;
  return top + (bot - top) * sy;
}

function vaultNear(tx: number, ty: number): Vault | undefined {
  for (const v of VAULTS) {
    if (Math.hypot(tx - v.tx, ty - v.ty) <= VAULT_R + 2) return v;
  }
  return undefined;
}

function biomeOf(tx: number, ty: number): BiomeId {
  const v = vaultNear(tx, ty);
  if (v) return v.biome;
  const d = Math.hypot(tx - HOME.x, ty - HOME.y);
  if (d < CLEAR_R) return "home";
  if (d < CLEAR_R + 7) return "thicket";
  const elev = noise(tx, ty, 15, 101);
  const wet = noise(tx, ty, 17, 202);
  const old = noise(tx, ty, 19, 303);
  if (elev > 0.63 && elev > wet && elev > old) return "ridge";
  if (wet > 0.63 && wet > old) return "marsh";
  if (old > 0.66) return "ruins";
  return "thicket";
}

export function generateWorld(): World {
  const size = MAP_W * MAP_H;
  const kind = new Uint8Array(size);
  const biome = new Uint8Array(size);
  const obj: (ObjectKind | undefined)[] = new Array(size).fill(undefined);
  const rnd = mulberry(1337);

  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      biome[idx(tx, ty)] = INDEX_BY_BIOME[biomeOf(tx, ty)];
    }
  }

  // Ground water: marsh mires and ridge tarns. The home pond is added by hand.
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const i = idx(tx, ty);
      const b = BIOME_BY_INDEX[biome[i]];
      if (b === "home") continue;
      const limit = b === "marsh" ? 0.75 : b === "ridge" ? 0.86 : 0.89;
      if (noise(tx, ty, 6, 404) > limit) kind[i] = 2;
    }
  }

  const pond = { x: HOME.x + 11, y: HOME.y - 9, rx: 5, ry: 3.4 };
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const dx = (tx - pond.x) / pond.rx;
      const dy = (ty - pond.y) / pond.ry;
      if (dx * dx + dy * dy < 1) kind[idx(tx, ty)] = 2;
    }
  }

  // Props, chosen by biome and never on open water.
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const i = idx(tx, ty);
      if (kind[i] === 2) continue;
      const b = BIOME_BY_INDEX[biome[i]];
      const r = rand01(tx, ty, 500 + INDEX_BY_BIOME[b]);
      if (b === "home") {
        if (r < 0.02) obj[i] = "bush";
      } else if (b === "ridge") {
        if (r < 0.3) obj[i] = "rock";
        else if (r < 0.36) obj[i] = "scree";
        else if (r < 0.4) obj[i] = "crystal";
        else if (r < 0.45) obj[i] = "pine";
      } else if (b === "marsh") {
        if (r < 0.22) obj[i] = "reed";
        else if (r < 0.3) obj[i] = "swamp_tree";
        else if (r < 0.34) obj[i] = "mushroom";
        else if (r < 0.4) obj[i] = "round_tree";
      } else if (b === "ruins") {
        if (r < 0.16) obj[i] = "pillar";
        else if (r < 0.26) obj[i] = "dead_tree";
        else if (r < 0.31) obj[i] = "mushroom";
        else if (r < 0.36) obj[i] = "rubble";
        else if (r < 0.42) obj[i] = "bush";
      } else {
        if (r < 0.34) obj[i] = "pine";
        else if (r < 0.5) obj[i] = "round_tree";
        else if (r < 0.56) obj[i] = "bush";
        else if (r < 0.59) obj[i] = "stump";
        else if (r < 0.61) obj[i] = "dead_tree";
      }
    }
  }

  // The home clearing stays open: thin the forest, keep the brambles pretty.
  for (let ty = HOME.y - CLEAR_R; ty <= HOME.y + CLEAR_R; ty++) {
    for (let tx = HOME.x - CLEAR_R; tx <= HOME.x + CLEAR_R; tx++) {
      if (!inBounds(tx, ty)) continue;
      if (Math.hypot(tx - HOME.x, ty - HOME.y) > CLEAR_R) continue;
      const i = idx(tx, ty);
      if (kind[i] === 2) continue;
      const o = obj[i];
      if (o === "pine" || o === "round_tree" || o === "swamp_tree") {
        obj[i] = rand01(tx, ty, 601) < 0.25 ? "bush" : undefined;
      }
    }
  }

  const stall = { tx: HOME.x - 9, ty: HOME.y - 1 };
  obj[idx(stall.tx, stall.ty)] = "stall";
  obj[idx(stall.tx + 4, stall.ty + 2)] = "sign";

  const table = { tx: stall.tx, ty: stall.ty + 3 };
  obj[idx(table.tx, table.ty)] = "table";
  kind[idx(table.tx, table.ty)] = 0;

  const spawn = { tx: HOME.x + 1, ty: HOME.y + 4 };
  carvePath(kind, obj, spawn.tx, spawn.ty, stall.tx + 1, stall.ty);
  carvePath(kind, obj, stall.tx + 1, stall.ty, stall.tx + 6, stall.ty + 5);

  for (let ty = HOME.y + 1; ty < HOME.y + 7; ty++) {
    for (let tx = HOME.x + 3; tx < HOME.x + 13; tx++) {
      if (!inBounds(tx, ty)) continue;
      obj[idx(tx, ty)] = undefined;
      kind[idx(tx, ty)] = 0;
    }
  }

  const shrine = { tx: HOME.x - 12, ty: HOME.y - 8 };
  obj[idx(shrine.tx, shrine.ty)] = "shrine";
  const spiritHomes = [
    { tx: shrine.tx + 2, ty: shrine.ty + 1 },
    { tx: shrine.tx - 2, ty: shrine.ty + 3 },
    { tx: shrine.tx + 4, ty: shrine.ty - 1 },
  ];
  for (const h of spiritHomes) {
    obj[idx(h.tx, h.ty)] = undefined;
    kind[idx(h.tx, h.ty)] = 0;
  }

  const sinkholes = [{ tx: pond.x - 5, ty: pond.y + 5, layer: 0 }];
  for (const s of sinkholes) {
    obj[idx(s.tx, s.ty)] = "sinkhole";
    kind[idx(s.tx, s.ty)] = 0;
  }

  const rings = new Set<number>();
  for (const v of VAULTS)
    for (const i of sealVault(v, kind, biome, obj, sinkholes)) rings.add(i);

  // Roads out to every pass, so the scale reads as somewhere you can reach.
  for (const v of VAULTS) {
    const gate = gateMouth(v);
    carvePath(kind, obj, spawn.tx, spawn.ty, gate.tx, gate.ty, rings);
  }

  const caches: number[] = [];
  const placeCache = (tx: number, ty: number): void => {
    if (!inBounds(tx, ty)) return;
    const i = idx(tx, ty);
    if (obj[i] || kind[i] === 2) return;
    obj[i] = "cache";
    if (kind[i] !== 1) kind[i] = 0;
    caches.push(i);
  };
  for (const v of VAULTS) {
    placeCache(v.tx - 3, v.ty - 2);
    placeCache(v.tx + 3, v.ty + 2);
  }
  for (let n = 0; n < 40 && caches.length < 20; n++) {
    const tx = 6 + Math.floor(rnd() * (MAP_W - 12));
    const ty = 6 + Math.floor(rnd() * (MAP_H - 12));
    if (Math.hypot(tx - HOME.x, ty - HOME.y) < CLEAR_R + 4) continue;
    placeCache(tx, ty);
  }

  // Loose scatter on the living ground only, well away from anything useful.
  for (let ty = 2; ty < MAP_H - 2; ty++) {
    for (let tx = 2; tx < MAP_W - 2; tx++) {
      const i = idx(tx, ty);
      if (obj[i] || kind[i] !== 0) continue;
      if (Math.hypot(tx - spawn.tx, ty - spawn.ty) < 3) continue;
      if (Math.hypot(tx - stall.tx, ty - stall.ty) < 3) continue;
      if (Math.hypot(tx - table.tx, ty - table.ty) < 2) continue;
      if (Math.hypot(tx - shrine.tx, ty - shrine.ty) < 3) continue;
      const b = BIOME_BY_INDEX[biome[i]];
      if (b === "ridge" || b === "ruins") continue;
      const r = rnd();
      if (r < 0.03) obj[i] = "bush";
      else if (r < 0.045) obj[i] = "rock";
      else if (r < 0.055) obj[i] = "stump";
    }
  }

  // Hard border, so nobody walks off the map into an endless forest.
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const edge = Math.min(tx, ty, MAP_W - 1 - tx, MAP_H - 1 - ty);
      if (edge > 1) continue;
      const i = idx(tx, ty);
      kind[i] = 0;
      obj[i] = rand01(tx, ty, 707) < 0.5 ? "pine" : "rock";
    }
  }

  const waterTiles: number[] = [];
  for (let i = 0; i < size; i++) if (kind[i] === 2) waterTiles.push(i);

  return {
    kind,
    biome,
    obj: obj as ObjectKind[],
    plots: new Map(),
    stall,
    table,
    sinkholes,
    spawn,
    spiritHomes,
    waterTiles,
    vaults: VAULTS,
    caches,
    opened: new Set(),
    looted: new Set(),
  };
}

/**
 * A ring wall with one gap, and that gap packed with rockfall. Each vault also
 * hides its own shaft, so opening a pass buys depth in the Root Network too.
 */
function sealVault(
  v: Vault,
  kind: Uint8Array,
  biome: Uint8Array,
  obj: (ObjectKind | undefined)[],
  sinkholes: { tx: number; ty: number; layer: number }[],
): Set<number> {
  const towardHome = Math.atan2(HOME.y - v.ty, HOME.x - v.tx);
  const wall =
    v.biome === "ridge" ? "rock" : v.biome === "ruins" ? "pillar" : "reed";
  const ring = new Set<number>();
  for (let ty = v.ty - VAULT_R - 2; ty <= v.ty + VAULT_R + 2; ty++) {
    for (let tx = v.tx - VAULT_R - 2; tx <= v.tx + VAULT_R + 2; tx++) {
      if (!inBounds(tx, ty)) continue;
      const i = idx(tx, ty);
      const d = Math.hypot(tx - v.tx, ty - v.ty);
      if (d > VAULT_R + 1) continue;
      let diff = Math.abs(Math.atan2(ty - v.ty, tx - v.tx) - towardHome);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      biome[i] = INDEX_BY_BIOME[v.biome];
      if (d < VAULT_R - 1) {
        kind[i] = 0;
        obj[i] = undefined;
        continue;
      }
      ring.add(i);
      if (diff < 0.34) {
        kind[i] = 0;
        obj[i] = "rockfall";
        continue;
      }
      kind[i] = 0;
      obj[i] = wall;
    }
  }
  const shaft = { tx: v.tx + 2, ty: v.ty - 3, layer: v.layer };
  obj[idx(shaft.tx, shaft.ty)] = "sinkhole";
  kind[idx(shaft.tx, shaft.ty)] = 0;
  sinkholes.push(shaft);
  return ring;
}

/** The tile outside a vault's sealed mouth, where the road should end. */
function gateMouth(v: Vault): { tx: number; ty: number } {
  const a = Math.atan2(HOME.y - v.ty, HOME.x - v.tx);
  return {
    tx: Math.round(v.tx + Math.cos(a) * (VAULT_R + 4)),
    ty: Math.round(v.ty + Math.sin(a) * (VAULT_R + 4)),
  };
}

/** Roads drain water into a causeway but never erase a sealed pass or a hoard. */
function carvePath(
  kind: Uint8Array,
  obj: (ObjectKind | undefined)[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  ring?: Set<number>,
): void {
  const open = (x: number, y: number): void => {
    if (!inBounds(x, y)) return;
    const i = idx(x, y);
    const o = obj[i];
    kind[i] = 1;
    if (o === "rockfall" || o === "cache" || o === "sinkhole") return;
    // A road may cross the map, but it may not cut a hole in a vault wall.
    if (ring?.has(i)) return;
    obj[i] = undefined;
  };
  let x = x0;
  let y = y0;
  let guard = 0;
  while ((x !== x1 || y !== y1) && guard++ < 1200) {
    open(x, y);
    const dx = x1 - x;
    const dy = y1 - y;
    if (Math.abs(dx) >= Math.abs(dy)) x += Math.sign(dx);
    else y += Math.sign(dy);
    open(x, y);
  }
}
