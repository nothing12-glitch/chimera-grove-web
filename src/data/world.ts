import { mulberry, rand01 } from "../core/rng";
import type { CropId } from "./crops";

export const TILE = 16;
export const MAP_W = 48;
export const MAP_H = 32;

export type TileKind = "grass" | "path" | "water" | "soil";
export type ObjectKind = "pine" | "round_tree" | "bush" | "rock" | "stump" | "stall" | "sign" | "fence";

export type Plot = {
  moisture: number;
  crop?: CropId;
  /** accumulated growth points */
  points: number;
  /** 0..1 visual sway offset */
  sway: number;
};

export type World = {
  kind: Uint8Array;
  obj: ObjectKind[];
  /** tile index -> plot data (only for soil) */
  plots: Map<number, Plot>;
  stall: { tx: number; ty: number };
  spawn: { tx: number; ty: number };
  waterTiles: number[];
};

const KIND_BY_INDEX: TileKind[] = ["grass", "path", "water", "soil"];
const INDEX_BY_KIND: Record<TileKind, number> = { grass: 0, path: 1, water: 2, soil: 3 };

export const idx = (tx: number, ty: number) => ty * MAP_W + tx;
export const inBounds = (tx: number, ty: number) => tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H;

export function tileAt(w: World, tx: number, ty: number): TileKind {
  if (!inBounds(tx, ty)) return "water";
  return KIND_BY_INDEX[w.kind[idx(tx, ty)]];
}

export function setTile(w: World, tx: number, ty: number, kind: TileKind): void {
  if (!inBounds(tx, ty)) return;
  w.kind[idx(tx, ty)] = INDEX_BY_KIND[kind];
}

export function objectAt(w: World, tx: number, ty: number): ObjectKind | undefined {
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
  sign: true,
  fence: true,
};

export function isSolid(w: World, tx: number, ty: number): boolean {
  if (!inBounds(tx, ty)) return true;
  if (tileAt(w, tx, ty) === "water") return true;
  const o = objectAt(w, tx, ty);
  return o ? SOLID[o] : false;
}

export function isTillable(w: World, tx: number, ty: number): boolean {
  if (!inBounds(tx, ty)) return false;
  const k = tileAt(w, tx, ty);
  if (k !== "grass" && k !== "path") return false;
  return !objectAt(w, tx, ty);
}

export function generateWorld(): World {
  const kind = new Uint8Array(MAP_W * MAP_H);
  const obj: ObjectKind[] = new Array(MAP_W * MAP_H).fill(undefined as unknown as ObjectKind);
  const waterTiles: number[] = [];

  const cx = MAP_W / 2;
  const cy = MAP_H / 2;

  // Clearing: anything inside the ellipse is walkable grass.
  const isClearing = (tx: number, ty: number) => {
    const dx = (tx - cx) / (MAP_W / 2 - 4);
    const dy = (ty - cy) / (MAP_H / 2 - 3);
    return dx * dx + dy * dy < 1;
  };

  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const i = idx(tx, ty);
      if (isClearing(tx, ty)) {
        kind[i] = 0;
        continue;
      }
      // Old Forest wall.
      const edge = Math.min(tx, ty, MAP_W - 1 - tx, MAP_H - 1 - ty);
      const deep = Math.hypot(tx - cx, ty - cy);
      if (edge <= 1 || deep > MAP_W / 2 + 2) {
        obj[i] = rand01(tx, ty, 7) < 0.55 ? "pine" : "round_tree";
      } else if (rand01(tx, ty, 11) < 0.42) {
        obj[i] = rand01(tx, ty, 12) < 0.6 ? "round_tree" : "bush";
      } else {
        kind[i] = 0;
        if (rand01(tx, ty, 13) < 0.05) obj[i] = "rock";
      }
      if (!isClearing(tx, ty) && !obj[i] && rand01(tx, ty, 17) < 0.3) obj[i] = "pine";
    }
  }

  // Mycelium pond in the north-east of the clearing.
  const rnd = mulberry(1337);
  const pond = { x: MAP_W - 15, y: 7, rx: 5, ry: 3.4 };
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const dx = (tx - pond.x) / pond.rx;
      const dy = (ty - pond.y) / pond.ry;
      if (dx * dx + dy * dy < 1) {
        const i = idx(tx, ty);
        obj[i] = undefined as unknown as ObjectKind;
        kind[i] = 2;
        waterTiles.push(i);
      }
    }
  }

  // Alchemist stall, west side, with a signpost pointing at it.
  const stall = { tx: 11, ty: cy - 1 };
  obj[idx(stall.tx, stall.ty)] = "stall";
  const sign = { tx: stall.tx + 4, ty: stall.ty + 2 };
  obj[idx(sign.tx, sign.ty)] = "sign";

  // Path: spawn -> stall -> south garden, drawn with a slight wiggle.
  const spawn = { tx: cx + 1, ty: cy + 4 };
  carvePath(kind, obj, spawn.tx, spawn.ty, stall.tx + 1, stall.ty);
  carvePath(kind, obj, stall.tx + 1, stall.ty, stall.tx + 6, stall.ty + 5);

  // Clear a garden plot area south-east of spawn and fence its north edge.
  for (let ty = cy + 1; ty < cy + 7; ty++) {
    for (let tx = cx + 3; tx < cx + 13; tx++) {
      if (!inBounds(tx, ty)) continue;
      obj[idx(tx, ty)] = undefined as unknown as ObjectKind;
      kind[idx(tx, ty)] = 0;
    }
  }

  // Scatter decorations that do not block walking.
  for (let ty = 2; ty < MAP_H - 2; ty++) {
    for (let tx = 2; tx < MAP_W - 2; tx++) {
      const i = idx(tx, ty);
      if (obj[i] || kind[i] !== 0) continue;
      const near = Math.hypot(tx - spawn.tx, ty - spawn.ty) + Math.hypot(tx - stall.tx, ty - stall.ty);
      if (near < 3) continue;
      const r = rnd();
      if (r < 0.03) obj[i] = "bush";
      else if (r < 0.045) obj[i] = "rock";
      else if (r < 0.055) obj[i] = "stump";
    }
  }

  return {
    kind,
    obj,
    plots: new Map(),
    stall,
    spawn,
    waterTiles,
  };
}

function carvePath(kind: Uint8Array, obj: ObjectKind[], x0: number, y0: number, x1: number, y1: number): void {
  let x = x0;
  let y = y0;
  let guard = 0;
  while ((x !== x1 || y !== y1) && guard++ < 400) {
    const i = idx(x, y);
    if (i >= 0 && i < kind.length) {
      kind[i] = 1;
      obj[i] = undefined as unknown as ObjectKind;
    }
    const dx = x1 - x;
    const dy = y1 - y;
    if (Math.abs(dx) >= Math.abs(dy)) x += Math.sign(dx);
    else y += Math.sign(dy);
    const j = idx(x, y);
    if (j >= 0 && j < kind.length) {
      kind[j] = 1;
      obj[j] = undefined as unknown as ObjectKind;
    }
  }
  const k = idx(x, y);
  kind[k] = 1;
  obj[k] = undefined as unknown as ObjectKind;
}
