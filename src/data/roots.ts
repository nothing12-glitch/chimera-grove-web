import { mulberry } from "../core/rng";

export const CAVE_W = 48;
export const CAVE_H = 30;
export const MAX_LAYER = 4;

export type PropKind = "shaft" | "deep" | "node" | "spent" | "cap" | "debris";

export type Cave = {
  layer: number;
  seed: number;
  /** 0 = solid rock, 1 = mycelium floor, 2 = floor threaded with light */
  tiles: Uint8Array;
  prop: (PropKind | undefined)[];
  /** tile index -> light radius in tiles, for every glow source on this layer */
  lights: Map<number, number>;
  entry: { tx: number; ty: number };
  exit: { tx: number; ty: number };
  spawn: { tx: number; ty: number };
  nodeCount: number;
};

export const caveIdx = (tx: number, ty: number) => ty * CAVE_W + tx;
export const inCave = (tx: number, ty: number) =>
  tx >= 0 && ty >= 0 && tx < CAVE_W && ty < CAVE_H;

export function caveSolid(c: Cave, tx: number, ty: number): boolean {
  if (!inCave(tx, ty)) return true;
  const i = caveIdx(tx, ty);
  if (c.tiles[i] === 0) return true;
  return c.prop[i] === "debris";
}

export function propAt(c: Cave, tx: number, ty: number): PropKind | undefined {
  if (!inCave(tx, ty)) return undefined;
  return c.prop[caveIdx(tx, ty)];
}

type Room = { x: number; y: number; w: number; h: number };

/**
 * Rooms carved out of solid rock, joined by corridors, then seasoned with mycelium.
 * Deterministic in (worldSeed, layer), so a dive survives a page reload.
 */
export function generateCave(layer: number, worldSeed: number): Cave {
  const seed = (worldSeed + layer * 7919) >>> 0;
  const rnd = mulberry(seed);
  const tiles = new Uint8Array(CAVE_W * CAVE_H);
  const prop: (PropKind | undefined)[] = new Array(CAVE_W * CAVE_H).fill(
    undefined,
  );
  const lights = new Map<number, number>();

  const rooms = carveRooms(tiles, rnd);
  linkRooms(tiles, rooms, rnd);
  roughen(tiles, rnd);
  // The stone must never swallow the stairs: re-open the rock around both shafts.
  const around = [
    [0, 0],
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ] as const;
  for (const room of [rooms[0], rooms[rooms.length - 1]]) {
    const at = centerOf(room);
    for (const [dx, dy] of around) {
      const tx = at.tx + dx;
      const ty = at.ty + dy;
      if (tx > 1 && ty > 1 && tx < CAVE_W - 2 && ty < CAVE_H - 2)
        tiles[caveIdx(tx, ty)] = 1;
    }
  }

  // Bright threads thicken with depth, so lower layers are less black.
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] === 1 && rnd() < 0.05 + layer * 0.025) tiles[i] = 2;
  }

  const glow = Math.max(2.6, 4.2 - layer * 0.35);
  const entry = centerOf(rooms[0]);
  const exit = centerOf(rooms[rooms.length - 1]);
  prop[caveIdx(entry.tx, entry.ty)] = "shaft";
  prop[caveIdx(exit.tx, exit.ty)] = "deep";
  lights.set(caveIdx(entry.tx, entry.ty), glow + 1.2);
  lights.set(caveIdx(exit.tx, exit.ty), glow);

  placeNodes(prop, lights, rooms, rnd, layer, glow, tiles);
  placeDecor(prop, tiles, lights, rnd, glow);
  unclog(tiles, prop, caveIdx(entry.tx, entry.ty));

  const nodeCount = prop.reduce((n, p) => (p === "node" ? n + 1 : n), 0);

  return {
    layer,
    seed,
    tiles,
    prop,
    lights,
    entry,
    exit,
    spawn: freeNeighbour(tiles, prop, entry),
    nodeCount,
  };
}

function carveRooms(tiles: Uint8Array, rnd: () => number): Room[] {
  const rooms: Room[] = [];
  const target = 7 + Math.floor(rnd() * 3);
  let guard = 0;
  while (rooms.length < target && guard++ < 400) {
    const w = 5 + Math.floor(rnd() * 7);
    const h = 4 + Math.floor(rnd() * 5);
    const x = 2 + Math.floor(rnd() * (CAVE_W - w - 4));
    const y = 2 + Math.floor(rnd() * (CAVE_H - h - 4));
    const next: Room = { x, y, w, h };
    if (rooms.some((r) => touches(r, next))) continue;
    rooms.push(next);
    for (let ty = y; ty < y + h; ty++) {
      for (let tx = x; tx < x + w; tx++) tiles[ty * CAVE_W + tx] = 1;
    }
  }
  return rooms.sort((a, b) => a.y - b.y || a.x - b.x);
}

function touches(a: Room, b: Room): boolean {
  return (
    a.x - 2 < b.x + b.w &&
    b.x - 2 < a.x + a.w &&
    a.y - 2 < b.y + b.h &&
    b.y - 2 < a.y + a.h
  );
}

function linkRooms(tiles: Uint8Array, rooms: Room[], rnd: () => number): void {
  const pairs: [number, number][] = [];
  for (let i = 1; i < rooms.length; i++) pairs.push([i - 1, i]);
  for (let i = 0; i < 2 && rooms.length > 3; i++) {
    const a = Math.floor(rnd() * rooms.length);
    const b = Math.floor(rnd() * rooms.length);
    if (a !== b) pairs.push([a, b]);
  }
  for (const [a, b] of pairs)
    carveTunnel(tiles, centerOf(rooms[a]), centerOf(rooms[b]), rnd() < 0.5);
}

function carveTunnel(
  tiles: Uint8Array,
  from: { tx: number; ty: number },
  to: { tx: number; ty: number },
  horizontalFirst: boolean,
): void {
  const dig = (tx: number, ty: number) => {
    if (tx < 1 || ty < 1 || tx >= CAVE_W - 1 || ty >= CAVE_H - 1) return;
    tiles[ty * CAVE_W + tx] = 1;
  };
  const runX = (
    from: number,
    to: number,
    at: () => number,
    side: () => number,
  ) => {
    let n = from;
    while (n !== to) {
      dig(n, at());
      dig(n, side());
      n += Math.sign(to - n);
    }
  };
  const runY = (
    from: number,
    to: number,
    at: () => number,
    side: () => number,
  ) => {
    let n = from;
    while (n !== to) {
      dig(at(), n);
      dig(side(), n);
      n += Math.sign(to - n);
    }
  };
  if (horizontalFirst) {
    runX(
      from.tx,
      to.tx,
      () => from.ty,
      () => from.ty + 1,
    );
    runY(
      from.ty,
      to.ty,
      () => to.tx,
      () => to.tx + 1,
    );
  } else {
    runY(
      from.ty,
      to.ty,
      () => from.tx,
      () => from.tx + 1,
    );
    runX(
      from.tx,
      to.tx,
      () => to.ty,
      () => to.ty + 1,
    );
  }
  dig(to.tx, to.ty);
}

function centerOf(r: Room): { tx: number; ty: number } {
  return { tx: r.x + Math.floor(r.w / 2), ty: r.y + Math.floor(r.h / 2) };
}

const DIRS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;

/** Floor that is safe to walk on: never the outer shell of the layer. */
function carveable(tiles: Uint8Array, tx: number, ty: number): boolean {
  return (
    tx > 1 &&
    ty > 1 &&
    tx < CAVE_W - 2 &&
    ty < CAVE_H - 2 &&
    tiles[caveIdx(tx, ty)] === 1
  );
}

/** True when taking this tile away cannot split the tunnels it touches. */
function removable(tiles: Uint8Array, tx: number, ty: number): boolean {
  const live = (x: number, y: number) =>
    carveable(tiles, x, y) && !(x === tx && y === ty);
  const seeds: [number, number][] = [];
  for (const [dx, dy] of DIRS) {
    if (live(tx + dx, ty + dy)) seeds.push([tx + dx, ty + dy]);
  }
  if (seeds.length < 2) return true;
  const seen = new Set<number>([caveIdx(seeds[0][0], seeds[0][1])]);
  const stack: [number, number][] = [seeds[0]];
  while (stack.length) {
    const [x, y] = stack.pop()!;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (Math.abs(nx - tx) > 2 || Math.abs(ny - ty) > 2) continue;
      const i = caveIdx(nx, ny);
      if (seen.has(i) || !live(nx, ny)) continue;
      seen.add(i);
      stack.push([nx, ny]);
    }
  }
  return seeds.every(([x, y]) => seen.has(caveIdx(x, y)));
}

/**
 * Straight room walls look drawn, not dug. Nibble the rock back tile by tile —
 * each bite is checked against the graph as it stands, so the network stays walkable.
 */
function roughen(tiles: Uint8Array, rnd: () => number): void {
  const order: number[] = [];
  for (let i = 0; i < tiles.length; i++) if (tiles[i] === 1) order.push(i);
  for (let n = order.length - 1; n > 0; n--) {
    const j = Math.floor(rnd() * (n + 1));
    const tmp = order[n];
    order[n] = order[j];
    order[j] = tmp;
  }
  for (const i of order) {
    if (tiles[i] !== 1 || rnd() > 0.45) continue;
    const tx = i % CAVE_W;
    const ty = Math.floor(i / CAVE_W);
    if (!carveable(tiles, tx, ty)) continue;
    const rock = DIRS.filter(([dx, dy]) => !carveable(tiles, tx + dx, ty + dy));
    if (rock.length === 0) continue;
    if (removable(tiles, tx, ty)) tiles[i] = 0;
  }
  // Then let the walls bulge where the stone is already almost gone.
  for (let ty = 2; ty < CAVE_H - 2; ty++) {
    for (let tx = 2; tx < CAVE_W - 2; tx++) {
      const i = caveIdx(tx, ty);
      if (tiles[i] !== 0) continue;
      const open = DIRS.filter(
        ([dx, dy]) => tiles[caveIdx(tx + dx, ty + dy)] === 1,
      ).length;
      if (open >= 3 && rnd() < 0.5) tiles[i] = 1;
    }
  }
}

/** Walkable means carved and not buried: the same rule caveSolid uses. */
function passable(
  tiles: Uint8Array,
  prop: (PropKind | undefined)[],
  i: number,
): boolean {
  return tiles[i] !== 0 && prop[i] !== "debris";
}

function walkableFrom(
  tiles: Uint8Array,
  prop: (PropKind | undefined)[],
  start: number,
): Set<number> {
  const reach = new Set<number>([start]);
  const stack = [start];
  while (stack.length) {
    const i = stack.pop()!;
    const tx = i % CAVE_W;
    const ty = Math.floor(i / CAVE_W);
    for (const [dx, dy] of DIRS) {
      if (!inCave(tx + dx, ty + dy)) continue;
      const n = caveIdx(tx + dx, ty + dy);
      if (reach.has(n) || !passable(tiles, prop, n)) continue;
      reach.add(n);
      stack.push(n);
    }
  }
  return reach;
}

/**
 * A fallen stone must never wall a tunnel shut. Clear the debris that hides floor
 * from the light until every pocket of the layer breathes again.
 */
function unclog(
  tiles: Uint8Array,
  prop: (PropKind | undefined)[],
  start: number,
): void {
  for (let pass = 0; pass < 8; pass++) {
    const reach = walkableFrom(tiles, prop, start);
    const jammed: number[] = [];
    for (let i = 0; i < prop.length; i++) {
      if (prop[i] !== "debris") continue;
      const tx = i % CAVE_W;
      const ty = Math.floor(i / CAVE_W);
      let touchesLight = false;
      let hidesDark = false;
      for (const [dx, dy] of DIRS) {
        if (!inCave(tx + dx, ty + dy)) continue;
        const n = caveIdx(tx + dx, ty + dy);
        if (tiles[n] === 0) continue;
        if (reach.has(n)) touchesLight = true;
        else if (prop[n] !== "debris") hidesDark = true;
      }
      if (touchesLight && hidesDark) jammed.push(i);
    }
    if (jammed.length === 0) return;
    for (const i of jammed) prop[i] = undefined;
  }
}

function placeNodes(
  prop: (PropKind | undefined)[],
  lights: Map<number, number>,
  rooms: Room[],
  rnd: () => number,
  layer: number,
  glow: number,
  tiles: Uint8Array,
): void {
  const pool = rooms.slice(1, rooms.length - 1);
  if (pool.length === 0) return;
  const wanted = 4 + layer;
  let placed = 0;
  let guard = 0;
  while (placed < wanted && guard++ < 400) {
    const room = pool[Math.floor(rnd() * pool.length)];
    const tx = room.x + 1 + Math.floor(rnd() * (room.w - 2));
    const ty = room.y + 1 + Math.floor(rnd() * (room.h - 2));
    const i = caveIdx(tx, ty);
    if (prop[i] || tiles[i] === 0) continue;
    prop[i] = "node";
    lights.set(i, glow);
    placed++;
  }
}

function placeDecor(
  prop: (PropKind | undefined)[],
  tiles: Uint8Array,
  lights: Map<number, number>,
  rnd: () => number,
  glow: number,
): void {
  for (let ty = 1; ty < CAVE_H - 1; ty++) {
    for (let tx = 1; tx < CAVE_W - 1; tx++) {
      const i = caveIdx(tx, ty);
      if (tiles[i] !== 1 || prop[i]) continue;
      const r = rnd();
      if (r < 0.022) prop[i] = "debris";
      else if (r < 0.05) {
        prop[i] = "cap";
        lights.set(i, glow * 0.85);
      }
    }
  }
}

function freeNeighbour(
  tiles: Uint8Array,
  prop: (PropKind | undefined)[],
  at: { tx: number; ty: number },
): { tx: number; ty: number } {
  for (const [dx, dy] of [
    [0, 1],
    [1, 0],
    [-1, 0],
    [0, -1],
    [1, 1],
    [-1, 1],
  ] as const) {
    const tx = at.tx + dx;
    const ty = at.ty + dy;
    if (!inCave(tx, ty)) continue;
    const i = caveIdx(tx, ty);
    if (tiles[i] === 0 || prop[i]) continue;
    return { tx, ty };
  }
  return at;
}

export function caveName(layer: number): string {
  const names = [
    "Кореневий Провал",
    "Тиха Гнилиця",
    "Чорні Жили",
    "Дзвін Міцелію",
    "Серце Мережі",
  ];
  return names[Math.min(names.length - 1, Math.max(0, layer))];
}
