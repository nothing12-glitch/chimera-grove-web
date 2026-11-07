import { CROPS } from "../data/crops";
import {
  BOSS,
  ENEMIES,
  HP_MAX,
  HURT_LOCK,
  SICKLE_DAMAGE,
  enemiesForBiome,
  enemiesForLayer,
  type EnemyId,
} from "../data/enemies";
import { CAVE_H, CAVE_W, caveSolid, type Cave } from "../data/roots";
import {
  MAP_H,
  MAP_W,
  TILE,
  biomeAt,
  inBounds,
  objectAt,
  tileAt,
  type World,
} from "../data/world";
import { DAY_LENGTH, type Dir, type Game } from "./state";
import type { Events } from "./systems";

export type Enemy = {
  id: EnemyId;
  x: number;
  y: number;
  hp: number;
  dir: Dir;
  anim: number;
  pause: number;
  /** knockback still being applied */
  vx: number;
  vy: number;
  /** seconds of white flash after a sickle hit */
  flash: number;
  home: { tx: number; ty: number };
};

export type Shot = { x: number; y: number; vx: number; vy: number; life: number };

export type Boss = {
  x: number;
  y: number;
  hp: number;
  /** chase | volley | burrow | rise */
  pattern: "chase" | "volley" | "burrow" | "rise";
  timer: number;
  burrowed: boolean;
  flash: number;
  shots: Shot[];
};

/** Walkability, so the same AI can hunt on the surface and in the tunnels. */
export type Field = {
  tiles: number;
  rows: number;
  solid(x: number, y: number): boolean;
};

export function groveField(w: World): Field {
  return {
    tiles: MAP_W,
    rows: MAP_H,
    solid(x: number, y: number): boolean {
      const tx = Math.floor(x / TILE);
      const ty = Math.floor(y / TILE);
      if (!inBounds(tx, ty)) return true;
      if (objectAt(w, tx, ty)) return true;
      return tileAt(w, tx, ty) === "water";
    },
  };
}

export function caveField(cave: Cave): Field {
  return {
    tiles: CAVE_W,
    rows: CAVE_H,
    solid(x: number, y: number): boolean {
      const tx = Math.floor(x / TILE);
      const ty = Math.floor(y / TILE);
      return caveSolid(cave, tx, ty);
    },
  };
}

function spot(field: Field, px: number, py: number, min: number, max: number): {
  x: number;
  y: number;
} | null {
  const cx = px / TILE;
  const cy = py / TILE;
  for (let n = 0; n < 60; n++) {
    const a = Math.random() * Math.PI * 2;
    const d = min + Math.random() * (max - min);
    const tx = Math.round(cx + Math.cos(a) * d);
    const ty = Math.round(cy + Math.sin(a) * d);
    if (tx < 1 || ty < 1 || tx >= field.tiles - 1 || ty >= field.rows - 1)
      continue;
    const x = tx * TILE + 4;
    const y = ty * TILE;
    if (field.solid(x, y)) continue;
    return { x, y };
  }
  return null;
}

/** Nightfall on the surface: species follow the biome they were rolled in. */
export function spawnSurface(
  w: World,
  g: Game,
  field: Field,
  count: number,
): Enemy[] {
  const list: Enemy[] = [];
  for (let n = 0; n < count * 6 && list.length < count; n++) {
    const at = spot(field, g.px, g.py, 9, 24);
    if (!at) continue;
    const biome = biomeAt(w, Math.floor(at.x / TILE), Math.floor(at.y / TILE));
    const pool = enemiesForBiome(biome);
    if (!pool.length) continue;
    list.push(roll(pool[Math.floor(Math.random() * pool.length)], at));
  }
  return list;
}

export function spawnCave(
  cave: Cave,
  field: Field,
  g: Game,
  count: number,
): Enemy[] {
  const pool = enemiesForLayer(cave.layer);
  if (!pool.length) return [];
  const list: Enemy[] = [];
  for (let n = 0; n < count * 6 && list.length < count; n++) {
    const at = spot(field, g.px, g.py, 6, 18);
    if (!at) continue;
    list.push(roll(pool[Math.floor(Math.random() * pool.length)], at));
  }
  return list;
}

function roll(id: EnemyId, at: { x: number; y: number }): Enemy {
  return {
    id,
    x: at.x,
    y: at.y,
    hp: ENEMIES[id].hp,
    dir: "down",
    anim: Math.random() * 4,
    pause: Math.random(),
    vx: 0,
    vy: 0,
    flash: 0,
    home: { tx: Math.floor(at.x / TILE), ty: Math.floor(at.y / TILE) },
  };
}

export function isNight(g: Game): boolean {
  const clock = g.dayTime / DAY_LENGTH;
  return clock > 0.84 || clock < 0.04;
}

/** Chase when you are close, drift when you are not, and bite on contact. */
export function stepEnemies(
  list: Enemy[],
  g: Game,
  field: Field,
  dt: number,
  ev: Events,
  onDeath: (e: Enemy) => void,
): void {
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i];
    const def = ENEMIES[e.id];
    if (e.flash > 0) e.flash -= dt;
    if (e.hp <= 0) {
      onDeath(e);
      list.splice(i, 1);
      continue;
    }
    const dx = g.px - e.x;
    const dy = g.py - e.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 13) {
      hitPlayer(g, def.damage, ev);
      continue;
    }
    let mx = 0;
    let my = 0;
    if (e.vx || e.vy) {
      mx = e.vx;
      my = e.vy;
      e.vx *= 0.82;
      e.vy *= 0.82;
      if (Math.abs(e.vx) < 4) e.vx = 0;
      if (Math.abs(e.vy) < 4) e.vy = 0;
    } else if (dist < def.aggro * TILE) {
      mx = dx / dist;
      my = dy / dist;
    } else if (e.pause > 0) {
      e.pause -= dt;
      continue;
    } else {
      e.pause = 0.6 + Math.random() * 1.6;
      const a = Math.random() * Math.PI * 2;
      mx = Math.cos(a);
      my = Math.sin(a);
    }
    const nx = e.x + mx * def.speed * dt;
    const ny = e.y + my * def.speed * dt;
    const far =
      Math.abs(Math.floor(nx / TILE) - e.home.tx) > def.homeRadius ||
      Math.abs(Math.floor(ny / TILE) - e.home.ty) > def.homeRadius;
    if (field.solid(nx, ny) || field.solid(nx, e.y) || far) {
      e.pause = 0.3 + Math.random();
      continue;
    }
    e.x = nx;
    e.y = ny;
    e.anim += dt * 7;
    if (mx < -0.01) e.dir = "left";
    else if (mx > 0.01) e.dir = "right";
    else if (my > 0.01) e.dir = "down";
    else if (my < -0.01) e.dir = "up";
  }
}

export function swingSickle(g: Game): void {
  g.swing = 0.26;
}

/** How far the sickle carries, measured to the middle of what it aims at. */
export const SWING_REACH = 16;
/** The crown is bigger, so the same swing reaches further into its bulk. */
export const BOSS_REACH = 26;

/** The arc in front of the alchemist, sampled at the moment the swing starts. */
export function resolveSwing(list: Enemy[], g: Game, ev: Events): void {
  const reach = facingPoint(g);
  for (const e of list) {
    const dx = e.x + 8 - reach.x;
    const dy = e.y + 8 - reach.y;
    if (Math.hypot(dx, dy) > SWING_REACH) continue;
    e.hp -= SICKLE_DAMAGE;
    e.flash = 0.18;
    const d = Math.hypot(dx, dy) || 1;
    e.vx = (dx / d) * 90;
    e.vy = (dy / d) * 90;
    ev.fx(e.x + 8, e.y + 8, e.hp <= 0 ? "#e0503a" : "#ffd98a", "spark");
  }
}

/** The closest thing the sickle would actually reach, or null. */
export function nearestTarget(g: Game, combat: Combat): string | null {
  const reach = facingPoint(g);
  let name: string | null = null;
  let best = SWING_REACH;
  for (const e of combat.enemies) {
    const d = Math.hypot(e.x + 8 - reach.x, e.y + 8 - reach.y);
    if (d > best) continue;
    best = d;
    name = ENEMIES[e.id].name;
  }
  const b = combat.boss;
  if (b && !b.burrowed && Math.hypot(b.x + 16 - reach.x, b.y + 14 - reach.y) <= BOSS_REACH)
    name = BOSS.name;
  return name;
}

/** Is there anything the sickle would actually reach right now? */
export function targetInReach(g: Game, combat: Combat): boolean {
  return nearestTarget(g, combat) !== null;
}

export function facingPoint(g: Game): { x: number; y: number } {
  const off: Record<Dir, [number, number]> = {
    down: [0, 16],
    up: [0, -16],
    left: [-16, 0],
    right: [16, 0],
  };
  const [dx, dy] = off[g.dir];
  return { x: g.px + 8 + dx, y: g.py + 12 + dy };
}

/** Contact damage, with the short mercy window that keeps a crowd from draining you. */
export function hitPlayer(g: Game, damage: number, ev: Events): boolean {
  if (g.hurt > 0) return false;
  g.hurt = HURT_LOCK;
  g.hp = Math.max(0, g.hp - damage);
  ev.fx(g.px + 8, g.py + 10, "#e0503a", "spark");
  ev.shake(4);
  return true;
}

export function healFully(g: Game): void {
  g.hp = HP_MAX;
}

/* ------------------------------------------------------------------ *
 * The crown of the Root Network
 * ------------------------------------------------------------------ */

export function spawnBoss(cave: Cave): Boss {
  const x = cave.spawn.tx * TILE;
  const y = cave.spawn.ty * TILE;
  return {
    x,
    y,
    hp: BOSS.hp,
    pattern: "chase",
    timer: 3,
    burrowed: false,
    flash: 0,
    shots: [],
  };
}

export function stepBoss(
  boss: Boss,
  g: Game,
  cave: Cave,
  field: Field,
  dt: number,
  ev: Events,
  onAdds: (at: { x: number; y: number }[]) => void,
  onDeath: () => void,
): void {
  if (boss.flash > 0) boss.flash -= dt;
  if (boss.hp <= 0) {
    onDeath();
    return;
  }
  boss.timer -= dt;
  const dx = g.px - boss.x;
  const dy = g.py - boss.y;
  const dist = Math.hypot(dx, dy) || 1;

  if (boss.pattern === "chase") {
    if (dist < 18) {
      hitPlayer(g, BOSS.damage, ev);
    }
    const nx = boss.x + (dx / dist) * BOSS.speed * dt;
    const ny = boss.y + (dy / dist) * BOSS.speed * dt;
    if (!caveSolid(cave, Math.floor(nx / TILE), Math.floor(ny / TILE))) {
      boss.x = nx;
      boss.y = ny;
    }
    if (boss.timer <= 0) {
      boss.pattern = Math.random() < 0.55 ? "volley" : "burrow";
      boss.timer = boss.pattern === "volley" ? 1.1 : 1.6;
    }
  } else if (boss.pattern === "volley") {
    if (boss.shots.length === 0) {
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 + boss.x * 0.01;
        boss.shots.push({
          x: boss.x + 16,
          y: boss.y + 14,
          vx: Math.cos(a) * 58,
          vy: Math.sin(a) * 58,
          life: 3,
        });
      }
      ev.shake(3);
    }
    if (boss.timer <= 0) {
      boss.pattern = "chase";
      boss.timer = 4;
    }
  } else if (boss.pattern === "burrow") {
    boss.burrowed = true;
    if (boss.timer <= 0) {
      onAdds([
        { x: boss.x, y: boss.y },
        { x: boss.x + 24, y: boss.y },
      ]);
      const at = spot(field, g.px, g.py, 2, 4) ?? {
        x: g.px + 26,
        y: g.py,
      };
      boss.x = at.x;
      boss.y = at.y;
      boss.pattern = "rise";
      boss.timer = 0.7;
      ev.shake(6);
    }
  } else {
    boss.burrowed = false;
    if (boss.timer <= 0) {
      boss.pattern = "chase";
      boss.timer = 4;
    }
  }

  for (let i = boss.shots.length - 1; i >= 0; i--) {
    const s = boss.shots[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    const tx = Math.floor(s.x / TILE);
    const ty = Math.floor(s.y / TILE);
    if (s.life <= 0 || caveSolid(cave, tx, ty)) {
      boss.shots.splice(i, 1);
      continue;
    }
    if (Math.hypot(s.x - (g.px + 8), s.y - (g.py + 12)) < 9) {
      boss.shots.splice(i, 1);
      hitPlayer(g, 3, ev);
    }
  }
}

export function hitBoss(boss: Boss, g: Game, ev: Events): boolean {
  if (boss.burrowed) return false;
  const reach = facingPoint(g);
  const dx = boss.x + 16 - reach.x;
  const dy = boss.y + 14 - reach.y;
  if (Math.hypot(dx, dy) > BOSS_REACH) return false;
  boss.hp -= SICKLE_DAMAGE;
  boss.flash = 0.18;
  ev.fx(boss.x + 16, boss.y + 14, "#e0503a", "spark");
  return true;
}

/**
 * Everything with teeth, in one place: who is awake at night, which layer
 * is crawling, and what the Crown of the Root Network does about it.
 */
export class Combat {
  enemies: Enemy[] = [];
  boss: Boss | null = null;
  private night = false;
  private layer = -1;

  update(
    g: Game,
    w: World,
    cave: Cave | null,
    dt: number,
    ev: Events,
  ): boolean {
    const field = cave ? caveField(cave) : groveField(w);
    if (cave) {
      if (this.layer !== cave.layer) {
        this.layer = cave.layer;
        this.enemies = spawnCave(cave, field, g, 4 + cave.layer);
        if (cave.layer === 4 && !g.bossDowned) this.boss = spawnBoss(cave);
      }
    } else {
      this.layer = -1;
      this.boss = null;
      const dark = isNight(g);
      if (dark && !this.night) this.enemies = spawnSurface(w, g, field, 9);
      if (!dark) this.enemies = [];
      this.night = dark;
    }

    stepEnemies(
      this.enemies,
      g,
      field,
      dt,
      ev,
      (e) => this.plunder(e, g, ev),
    );

    if (this.boss) {
      const dead = { value: false };
      stepBoss(
        this.boss,
        g,
        cave as Cave,
        field,
        dt,
        ev,
        (spots) => {
          for (const at of spots) this.enemies.push(roll("root_crawler", at));
        },
        () => {
          dead.value = true;
        },
      );
      if (dead.value) this.defeatBoss(g, ev);
    }
    return g.hp <= 0;
  }

  /** The swing the sickle already started; hits land the moment it begins. */
  swing(g: Game, ev: Events): void {
    swingSickle(g);
    resolveSwing(this.enemies, g, ev);
    if (this.boss) hitBoss(this.boss, g, ev);
  }

  private plunder(e: Enemy, g: Game, ev: Events): void {
    const def = ENEMIES[e.id];
    g.coins += def.coins;
    ev.fx(e.x + 8, e.y + 8, "#ffd98a", "spark");
    if (Math.random() < def.drop.chance) {
      g.harvest[def.drop.crop] += 1;
      ev.toast(
        `${def.name} лишив у урожаї «${CROPS[def.drop.crop].name}»`,
        "good",
      );
    }
  }

  private defeatBoss(g: Game, ev: Events): void {
    g.bossDowned = true;
    g.coins += BOSS.coins;
    g.seeds.voidcap += 6;
    this.boss = null;
    this.enemies = [];
    ev.shake(9);
    ev.toast(
      `Кореневий Володар розсипався. ${BOSS.coins} сонцязі й 6 згортків спор — твої.`,
      "good",
    );
  }

  /** The grove takes the alchemist back to the house and bills him for it. */
  collapse(g: Game, w: World, ev: Events): void {
    const lost = Math.min(g.coins, 5 + Math.floor(g.coins * 0.15));
    g.coins -= lost;
    g.hp = HP_MAX;
    g.hurt = 2;
    g.px = w.spawn.tx * TILE;
    g.py = w.spawn.ty * TILE - 2;
    g.scene = "grove";
    this.enemies = [];
    this.boss = null;
    ev.toast(
      `Тіло не тримає. Ти отямився біля хати й загубив ${lost} сонцязі.`,
      "bad",
    );
  }
}
