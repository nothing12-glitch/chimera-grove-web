import { CROPS, CROP_ORDER, type CropId } from "../data/crops";
import {
  SPIRITS,
  TRUST_MAX,
  type SpiritDef,
  type SpiritId,
} from "../data/spirits";
import {
  MAP_W,
  TILE,
  inBounds,
  objectAt,
  tileAt,
  type World,
} from "../data/world";
import { dayLength, earn, type Game } from "./state";
import type { Events } from "./systems";

export type Spirit = {
  id: SpiritId;
  x: number;
  y: number;
  dir: "left" | "right" | "up" | "down";
  moving: boolean;
  anim: number;
  trust: number;
  want: CropId;
  /** fed since the last dawn */
  fed: boolean;
  home: { tx: number; ty: number };
  pause: number;
  vx: number;
  vy: number;
};

const STEP_DIRS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function spawnSpirits(w: World): Spirit[] {
  return w.spiritHomes.map((home, i) => {
    const def = SPIRITS[orderFor(i)];
    return {
      id: def.id,
      x: home.tx * TILE,
      y: home.ty * TILE,
      dir: "down" as const,
      moving: false,
      anim: Math.random() * 4,
      trust: 0,
      want: rollWant(def),
      fed: false,
      home,
      pause: Math.random() * 2,
      vx: 0,
      vy: 0,
    };
  });
}

function orderFor(i: number): SpiritId {
  const ids: SpiritId[] = ["moss_boar", "glass_moth", "ash_fox"];
  return ids[i % ids.length];
}

function rollWant(def: SpiritDef): CropId {
  return Math.random() < 0.55
    ? def.favorite
    : CROP_ORDER[Math.floor(Math.random() * CROP_ORDER.length)];
}

/** Spirits roam near their dolmen; at dusk they drift home to sleep. */
export function stepSpirits(
  list: Spirit[],
  g: Game,
  w: World,
  dt: number,
): void {
  const night = g.dayTime / dayLength() > 0.82;
  for (const s of list) {
    const def = SPIRITS[s.id];
    if (s.pause > 0) {
      s.pause -= dt;
      s.moving = false;
      continue;
    }
    let dx = s.vx;
    let dy = s.vy;
    if (night) {
      const hx = s.home.tx * TILE + 8;
      const hy = s.home.ty * TILE + 8;
      const d = Math.hypot(hx - s.x, hy - s.y);
      if (d < 14) {
        s.moving = false;
        s.pause = 0.8;
        continue;
      }
      dx = (hx - s.x) / d;
      dy = (hy - s.y) / d;
    } else if (!dx && !dy) {
      if (Math.random() < 0.3) {
        s.pause = 0.7 + Math.random() * 1.8;
        continue;
      }
      [dx, dy] = STEP_DIRS[Math.floor(Math.random() * STEP_DIRS.length)];
    }

    const nx = s.x + dx * def.speed * dt;
    const ny = s.y + dy * def.speed * dt;
    if (
      blocked(w, nx, ny, def.hover) ||
      outOfRange(s, nx, ny, def.homeRadius)
    ) {
      s.vx = 0;
      s.vy = 0;
      s.pause = 0.5 + Math.random() * 1.5;
      s.moving = false;
      continue;
    }
    s.x = nx;
    s.y = ny;
    s.moving = true;
    s.anim += dt * 6;
    if (dx < -0.01) s.dir = "left";
    else if (dx > 0.01) s.dir = "right";
    else if (dy > 0.01) s.dir = "down";
    else if (dy < -0.01) s.dir = "up";
    if (!night && Math.random() < dt * 0.4) {
      s.vx = 0;
      s.vy = 0;
      s.pause = 0.9 + Math.random() * 2.4;
    }
  }
}

function blocked(w: World, x: number, y: number, hover: boolean): boolean {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (!inBounds(tx, ty)) return true;
  if (objectAt(w, tx, ty)) return true;
  if (!hover && tileAt(w, tx, ty) === "water") return true;
  return false;
}

function outOfRange(s: Spirit, x: number, y: number, radius: number): boolean {
  const dx = Math.abs(Math.floor(x / TILE) - s.home.tx);
  const dy = Math.abs(Math.floor(y / TILE) - s.home.ty);
  return dx > radius || dy > radius;
}

/** The spirit the alchemist is offering a treat to: within arm's reach of the facing point. */
export function spiritInReach(g: Game, list: Spirit[]): Spirit | null {
  const fx = g.px + 8 + (g.dir === "left" ? -12 : g.dir === "right" ? 12 : 0);
  const fy = g.py + 12 + (g.dir === "up" ? -12 : g.dir === "down" ? 12 : 0);
  let best: Spirit | null = null;
  let bestD = 20;
  for (const s of list) {
    const d = Math.hypot(s.x + 8 - fx, s.y + 10 - fy);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

export function feedSpirit(s: Spirit, g: Game, ev: Events): void {
  const def = SPIRITS[s.id];
  if (s.fed) {
    ev.toast(`${def.name} сьогодні вже ласував`, "info");
    return;
  }
  if (g.harvest[s.want] > 0) {
    g.harvest[s.want] -= 1;
    s.fed = true;
    const gain = 10 + s.trust * 8;
    earn(g, gain);
    g.stats.treats += 1;
    s.trust = Math.min(TRUST_MAX, s.trust + 1);
    ev.fx(s.x + 8, s.y + 4, CROPS[s.want].palettes[3].c ?? "#ffd98a", "leaf");
    ev.toast(`${def.name} бере «${CROPS[s.want].name}»`, "good");
    ev.toast(`+${gain} сонцязь · довіра ${s.trust}/${TRUST_MAX}`, "good");
    applyGift(s, g, def, ev);
    return;
  }
  const other = CROP_ORDER.find((c) => g.harvest[c] > 0);
  if (other) {
    g.harvest[other] -= 1;
    s.fed = true;
    earn(g, 4);
    ev.toast(
      `${def.name} понюхав «${CROPS[other].name}» і відвернувся: хотів «${CROPS[s.want].name}»`,
      "bad",
    );
    return;
  }
  ev.toast(`${def.name} чекає на свіжу «${CROPS[s.want].name}»`, "info");
}

function applyGift(s: Spirit, g: Game, def: SpiritDef, ev: Events): void {
  if (s.trust === 2) {
    g.seeds[def.gifts[0]] += 2;
    ev.toast(
      `${def.name} лишив у долоні 2 насінини «${CROPS[def.gifts[0]].name}»`,
      "good",
    );
  } else if (s.trust === TRUST_MAX) {
    g.seeds[def.gifts[1]] += 1;
    ev.toast(
      `${def.name} визнав вас другом гаю: 1 насінина «${CROPS[def.gifts[1]].name}» і благословення грядок`,
      "good",
    );
  }
}

/** Dawn: spirits get new cravings, vines carry rumours, trusted spirits bless plots. */
export function spiritDawn(
  list: Spirit[],
  g: Game,
  w: World,
  ev: Events,
): void {
  if (g.harvest.whisper_vine > 0) {
    const shy = list
      .filter((s) => s.trust < TRUST_MAX)
      .sort((a, b) => a.trust - b.trust)[0];
    if (shy) {
      g.harvest.whisper_vine -= 1;
      shy.trust += 1;
      const def = SPIRITS[shy.id];
      ev.toast(
        `Лоза передала духам чутку про вашу турботу. ${def.name}: довіра ${shy.trust}/${TRUST_MAX}`,
        "good",
      );
      applyGift(shy, g, def, ev);
    }
  }
  let blessed = 0;
  for (const s of list) {
    s.fed = false;
    s.want = rollWant(SPIRITS[s.id]);
    if (s.trust < TRUST_MAX) continue;
    const growing = [...w.plots.entries()].filter(
      ([, p]) => p.crop && p.points < CROPS[p.crop].matureAt,
    );
    for (let n = 0; n < 2 && growing.length; n++) {
      const [i, p] = growing.splice(
        Math.floor(Math.random() * growing.length),
        1,
      )[0];
      p.points += 1;
      blessed += 1;
      ev.fx(
        (i % MAP_W) * TILE + 8,
        Math.floor(i / MAP_W) * TILE + 8,
        "#8f6fd6",
        "spark",
      );
    }
  }
  if (blessed)
    ev.toast(
      `Духи благословили грядки: ${blessed} дозріють на день швидше`,
      "good",
    );
}
