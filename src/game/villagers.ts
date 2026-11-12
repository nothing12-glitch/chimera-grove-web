import { TILE, inBounds, isSolid, type World } from "../data/world";
import { DAY_LENGTH, type Game } from "./state";
import { VILLAGERS, type VillagerDef, type VillagerId } from "../data/villagers";
import type { Events } from "./systems";

export type Villager = {
  id: VillagerId;
  /** top-left of the 32×32 sprite, like the enemies */
  x: number;
  y: number;
  /** the side the pack sheet currently shows */
  face: "left" | "right";
  moving: boolean;
  anim: number;
  /** tile the villager belongs to; night sends them back here */
  home: { tx: number; ty: number };
  pause: number;
  vx: number;
  vy: number;
  /** next line to say, so talks do not repeat until the list cycles */
  line: number;
  /** seconds the speech bubble stays bright after a talk */
  says: number;
};

const STEP_DIRS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Dusk: the hamlet stops working and drifts home before the teeth wake. */
const EVENING = 0.78;

function blocked(w: World, x: number, y: number): boolean {
  // The same boots box the alchemist uses: a villager's head may overlap a
  // fence, their feet may not.
  const x0 = Math.floor((x + 3) / TILE);
  const x1 = Math.floor((x + 12) / TILE);
  const y0 = Math.floor((y + 13) / TILE);
  const y1 = Math.floor((y + 19) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (!inBounds(tx, ty)) return true;
      if (isSolid(w, tx, ty)) return true;
    }
  }
  return false;
}

function findOpen(w: World, tx: number, ty: number): { tx: number; ty: number } {
  if (inBounds(tx, ty) && !isSolid(w, tx, ty)) return { tx, ty };
  for (let r = 1; r <= 4; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = tx + dx;
        const ny = ty + dy;
        if (inBounds(nx, ny) && !isSolid(w, nx, ny)) return { tx: nx, ty: ny };
      }
    }
  }
  return { tx, ty };
}

/** Four neighbours around the cottages and the fire, each with a patch to mind. */
export function spawnVillagers(w: World): Villager[] {
  const c0 = w.cottages[0] ?? w.spawn;
  const c1 = w.cottages[1] ?? w.spawn;
  const c2 = w.cottages[2] ?? w.spawn;
  const fire = w.bonfires[0] ?? w.spawn;
  const spots: [VillagerId, { tx: number; ty: number }][] = [
    ["marta", { tx: c0.tx - 2, ty: c0.ty + 2 }],
    ["hryts", { tx: c1.tx + 2, ty: c1.ty + 2 }],
    ["orysia", { tx: c2.tx - 2, ty: c2.ty + 2 }],
    ["taras", { tx: fire.tx - 2, ty: fire.ty + 2 }],
  ];
  return spots.map(([id, spot]) => {
    const home = findOpen(w, spot.tx, spot.ty);
    return {
      id,
      x: home.tx * TILE,
      y: home.ty * TILE - 2,
      face: VILLAGERS[id].faces,
      moving: false,
      anim: Math.random() * 4,
      home,
      pause: 1 + Math.random() * 3,
      vx: 0,
      vy: 0,
      line: 0,
      says: 0,
    };
  });
}

function distanceFromHome(v: Villager, x: number, y: number): number {
  const hx = v.home.tx * TILE + 8;
  const hy = v.home.ty * TILE + 16;
  return Math.hypot(x + 16 - hx, y + 24 - hy) / TILE;
}

/** Villagers wander their patch by day and walk home at dusk; none of them fight. */
export function stepVillagers(
  list: Villager[],
  g: Game,
  w: World,
  dt: number,
): void {
  const evening = g.dayTime / DAY_LENGTH > EVENING;
  for (const v of list) {
    const def = VILLAGERS[v.id];
    if (v.says > 0) v.says -= dt;
    if (v.pause > 0) {
      v.pause -= dt;
      v.moving = false;
      continue;
    }

    let dx = v.vx;
    let dy = v.vy;
    if (evening) {
      const hx = v.home.tx * TILE + 8;
      const hy = v.home.ty * TILE + 16;
      const d = Math.hypot(hx - (v.x + 16), hy - (v.y + 24));
      if (d < 7) {
        v.vx = 0;
        v.vy = 0;
        v.moving = false;
        v.pause = 1.2;
        continue;
      }
      dx = (hx - (v.x + 16)) / d;
      dy = (hy - (v.y + 24)) / d;
    } else if (!dx && !dy) {
      if (Math.random() < 0.3) {
        v.pause = 1 + Math.random() * 3;
        continue;
      }
      [dx, dy] = STEP_DIRS[Math.floor(Math.random() * STEP_DIRS.length)];
    }

    const nx = v.x + dx * def.pace * dt;
    const ny = v.y + dy * def.pace * dt;
    const far = distanceFromHome(v, nx, ny) > def.radius;
    let moved = false;
    if (!far && !blocked(w, nx, ny)) {
      v.x = nx;
      v.y = ny;
      moved = true;
    } else if (evening && !far && !blocked(w, nx, v.y)) {
      // Sliding around a cottage corner instead of pacing into it all evening.
      v.x = nx;
      moved = true;
    } else if (evening && !far && !blocked(w, v.x, ny)) {
      v.y = ny;
      moved = true;
    }

    if (!moved) {
      v.vx = 0;
      v.vy = 0;
      v.pause = 0.6 + Math.random() * 1.4;
      v.moving = false;
      continue;
    }

    v.moving = true;
    v.anim += dt * 6;
    if (Math.abs(dx) > 0.01) v.face = dx > 0 ? "right" : "left";
    if (!evening && Math.random() < dt * 0.25) {
      v.vx = 0;
      v.vy = 0;
      v.pause = 1 + Math.random() * 3;
    }
  }
}

/** The villager the alchemist is facing closely enough to greet. */
export function villagerInReach(g: Game, list: Villager[]): Villager | null {
  if (g.scene !== "grove") return null;
  const fx = g.px + 8 + (g.dir === "left" ? -12 : g.dir === "right" ? 12 : 0);
  const fy = g.py + 12 + (g.dir === "up" ? -12 : g.dir === "down" ? 12 : 0);
  let best: Villager | null = null;
  let bestD = 28;
  for (const v of list) {
    const d = Math.hypot(v.x + 16 - fx, v.y + 22 - fy);
    if (d < bestD) {
      bestD = d;
      best = v;
    }
  }
  return best;
}

/** One line per talk, cycling through the villager's own list. */
export function talkVillager(v: Villager, g: Game, ev: Events): void {
  const def: VillagerDef = VILLAGERS[v.id];
  const line = def.lines[v.line % def.lines.length];
  v.line = (v.line + 1) % def.lines.length;
  v.says = 3.5;
  v.vx = 0;
  v.vy = 0;
  v.pause = 1.4;
  v.moving = false;
  const dx = g.px - v.x;
  if (Math.abs(dx) > 8) v.face = dx > 0 ? "right" : "left";
  ev.toast(`${def.name}: «${line}»`, "info");
}
