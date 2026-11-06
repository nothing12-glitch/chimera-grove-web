import { CROPS, type CropId } from "../data/crops";
import {
  idx,
  isSolid,
  isTillable,
  setTile,
  tileAt,
  type Plot,
  type World,
} from "../data/world";
import { CAN_CAPACITY, DAY_LENGTH, MOISTURE_MAX, saveGame, type Dir, type Game } from "./state";
import { SPIRITS, TRUST_MAX, type SpiritId } from "../data/spirits";
import { feedSpirit, spiritDawn, spiritInReach, type Spirit } from "./spirits";

export type FX = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  kind: "spark" | "drop" | "leaf";
};

export type Events = {
  toast(text: string, tone?: "good" | "bad" | "info"): void;
  fx(x: number, y: number, color: string, kind?: FX["kind"]): void;
  shake(power: number): void;
};

export function facingTile(g: Game): { tx: number; ty: number } {
  const cx = Math.floor((g.px + 8) / 16);
  const cy = Math.floor((g.py + 12) / 16);
  const off: Record<Dir, [number, number]> = {
    down: [0, 1],
    up: [0, -1],
    left: [-1, 0],
    right: [1, 0],
  };
  const [dx, dy] = off[g.dir];
  return { tx: cx + dx, ty: cy + dy };
}

export function nearStall(g: Game, w: World): boolean {
  const px = g.px / 16;
  const py = g.py / 16;
  return Math.hypot(px - (w.stall.tx + 0.5), py - (w.stall.ty + 0.5)) < 2.6;
}

export function movePlayer(g: Game, w: World, dx: number, dy: number, dt: number): void {
  const speed = 78;
  const nx = g.px + dx * speed * dt;
  const ny = g.py + dy * speed * dt;
  if (dx) g.dir = dx > 0 ? "right" : "left";
  if (dy) g.dir = dy > 0 ? "down" : "up";
  g.moving = !!(dx || dy);
  if (g.moving) g.anim += dt * 7;

  if (!walkable(w, nx, g.py)) g.px = nx;
  if (!walkable(w, g.px, ny)) g.py = ny;
}

/** The alchemist's boots decide collision, not the whole sprite box. */
function walkable(w: World, x: number, y: number): boolean {
  const x0 = Math.floor((x + 3) / 16);
  const x1 = Math.floor((x + 12) / 16);
  const y0 = Math.floor((y + 13) / 16);
  const y1 = Math.floor((y + 19) / 16);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (isSolid(w, tx, ty)) return true;
    }
  }
  return false;
}

export type Hint = { label: string; key: string };

export function currentHint(g: Game, w: World, spirits: Spirit[]): Hint | null {
  if (g.shopOpen) return null;
  const reach = spiritInReach(g, spirits);
  if (reach) {
    const def = SPIRITS[reach.id];
    return {
      key: "E",
      label: reach.fed ? `${def.name} ситий · довіра ${reach.trust}/${TRUST_MAX}` : `Пригостити: ${def.name} хоче «${CROPS[reach.want].name}»`,
    };
  }
  if (nearStall(g, w)) return { key: "E", label: "Відкрити прилавок" };
  const { tx, ty } = facingTile(g);
  const plot = w.plots.get(idx(tx, ty));
  if (plot?.crop && isMature(plot)) return { key: "E", label: `Зібрати ${CROPS[plot.crop].name}` };
  const slot = g.slots[g.selected];
  const tile = tileAt(w, tx, ty);
  if (tile === "water" && slot.kind === "tool" && slot.tool === "can")
    return { key: "E", label: g.charges >= CAN_CAPACITY ? "Лійка вже повна" : "Наповнити лійку" };
  if (slot.kind === "tool" && slot.tool === "hoe" && isTillable(w, tx, ty))
    return { key: "E", label: "Розорати грядку" };
  if (slot.kind === "tool" && slot.tool === "can" && tile === "soil" && plot && plot.moisture < MOISTURE_MAX)
    return { key: "E", label: "Поливити" };
  if (tile === "soil" && !plot?.crop && slot.kind === "seed" && g.seeds[slot.crop] > 0)
    return { key: "E", label: `Посадити ${CROPS[slot.crop].name}` };
  return null;
}

export function isMature(plot: Plot): boolean {
  if (!plot.crop) return false;
  return plot.points >= CROPS[plot.crop].matureAt;
}

export function stageOf(plot: Plot): number {
  if (!plot.crop) return 0;
  const def = CROPS[plot.crop];
  const total = Math.max(1, Math.ceil(def.matureAt / def.pointsPerStage));
  const stage = Math.min(3, Math.floor((plot.points / def.matureAt) * total));
  return plot.points >= def.matureAt ? 3 : Math.min(2, stage);
}

/** Primary interaction: feed a spirit / till / plant / water / refill / harvest / open shop. */
export function interact(g: Game, w: World, ev: Events, spirits: Spirit[]): void {
  if (g.shopOpen) return;
  const reach = spiritInReach(g, spirits);
  if (reach) {
    feedSpirit(reach, g, ev);
    commit(g, w, spirits);
    return;
  }
  if (nearStall(g, w)) {
    g.shopOpen = true;
    ev.toast("Прилавок стародавньої торгівлі", "info");
    return;
  }
  const { tx, ty } = facingTile(g);
  const i = idx(tx, ty);
  const plot = w.plots.get(i);
  const slot = g.slots[g.selected];
  const tile = tileAt(w, tx, ty);
  const cx = tx * 16 + 8;
  const cy = ty * 16 + 8;

  if (plot?.crop && isMature(plot)) {
    const def = CROPS[plot.crop];
    const yieldCount = 1 + (Math.random() < 0.3 ? 1 : 0);
    g.harvest[def.id] += yieldCount;
    plot.crop = undefined;
    plot.points = 0;
    ev.fx(cx, cy, "#ffd98a", "leaf");
    ev.toast(`+${yieldCount} ${def.name}`, "good");
    return;
  }

  if (tile === "water" && slot.kind === "tool" && slot.tool === "can") {
    if (g.charges < CAN_CAPACITY) {
      g.charges = CAN_CAPACITY;
      ev.fx(cx, cy, "#7fc4d8", "drop");
      ev.toast("Лійку наповнено з озера", "good");
    }
    return;
  }

  if (slot.kind === "tool" && slot.tool === "hoe") {
    if (isTillable(w, tx, ty)) {
      setTile(w, tx, ty, "soil");
      const p: Plot = { moisture: 0, points: 0, sway: Math.random() };
      w.plots.set(i, p);
      ev.fx(cx, cy, "#6f4a2c", "spark");
      ev.shake(2);
      if (plot) w.plots.delete(i);
    } else if (tile === "soil" && !plot?.crop) {
      ev.toast("Тут уже родюча земля");
    } else if (tile === "soil" && plot?.crop && !isMature(plot)) {
      w.plots.delete(i);
      setTile(w, tx, ty, "grass");
      ev.fx(cx, cy, "#8a6038", "spark");
      ev.toast("Рослину викорчовано", "bad");
    }
    return;
  }

  if (slot.kind === "tool" && slot.tool === "can") {
    if (tile === "soil" && plot) {
      if (g.charges <= 0) {
        ev.toast("Лійка порожня — набери води з озера", "bad");
        return;
      }
      g.charges -= 1;
      plot.moisture = MOISTURE_MAX;
      ev.fx(cx, cy, "#7fc4d8", "drop");
      return;
    }
    ev.toast("Лійка працює на грядках", "info");
    return;
  }

  if (slot.kind === "seed" && tile === "soil") {
    if (!plot) {
      ev.toast("Спершу розори це мотикою", "bad");
      return;
    }
    if (plot.crop) {
      ev.toast("Грядка зайнята");
      return;
    }
    if (g.seeds[slot.crop] <= 0) {
      ev.toast(`Немає насіння: ${CROPS[slot.crop].name}`, "bad");
      return;
    }
    g.seeds[slot.crop] -= 1;
    plot.crop = slot.crop;
    plot.points = 0;
    ev.fx(cx, cy, CROPS[slot.crop].palettes[3].c ?? "#9fe3d6", "spark");
    ev.toast(`Посаджено ${CROPS[slot.crop].name}`, "good");
    return;
  }

  ev.toast("Нічого робити", "info");
}

/** Dawn tick: every watered plot grows; moisture drains. */
export function advanceDay(g: Game, w: World, ev: Events, spirits: Spirit[]): void {
  g.day += 1;
  g.dayTime = 0;
  let grew = 0;
  let dried = 0;
  for (const [, plot] of w.plots) {
    if (!plot.crop) continue;
    const def = CROPS[plot.crop];
    if (plot.moisture > 0 && !isMature(plot)) {
      plot.points += 1;
      grew += 1;
    }
    plot.moisture = Math.max(0, plot.moisture - def.thirst);
    if (plot.moisture === 0 && !isMature(plot) && plot.points < def.matureAt) dried += 1;
  }
  const ready = countReady(w);
  if (ready > 0) ev.toast(`${ready} грядок дозріло. Час збирати!`, "good");
  else if (grew) ev.toast(`День ${g.day}: ${grew} грядок виросло`);
  if (dried) ev.toast(`${dried} грядкам потрібна вода`, "bad");
  spiritDawn(spirits, g, w, ev);
  commit(g, w, spirits);
}

export function countReady(w: World): number {
  let n = 0;
  for (const [, p] of w.plots) if (p.crop && isMature(p)) n += 1;
  return n;
}

export function tickTime(g: Game, w: World, dt: number, ev: Events, spirits: Spirit[]): void {
  if (g.skip > 0) {
    g.skip -= dt;
    g.dayTime += dt * (DAY_LENGTH / 0.5);
    if (g.dayTime >= DAY_LENGTH || g.skip <= 0) {
      g.skip = 0;
      advanceDay(g, w, ev, spirits);
    }
    return;
  }
  g.dayTime += dt;
  if (g.dayTime >= DAY_LENGTH) advanceDay(g, w, ev, spirits);
}

export function startSkip(g: Game, ev: Events): void {
  if (g.shopOpen) return;
  g.skip = 0.5;
  ev.toast("Алхімік чекає світанку…", "info");
}

export function commit(g: Game, w: World, spirits: Spirit[]): void {
  const plots = [...w.plots.entries()].map(
    ([i, p]) => [i, p.moisture, p.points, p.crop, p.sway] as [number, number, number, CropId | undefined, number],
  );
  const sp = spirits.map(
    (s) => [s.id, Math.round(s.x), Math.round(s.y), s.dir, s.trust, s.want] as [
      SpiritId,
      number,
      number,
      Dir,
      number,
      CropId,
    ],
  );
  saveGame(g, w.kind, plots, sp);
}

export function sellStock(g: Game, w: World, crop: CropId, qty: number, ev: Events, spirits: Spirit[]): void {
  const n = Math.min(qty, g.harvest[crop]);
  if (n <= 0) return;
  const gain = n * CROPS[crop].sellPrice;
  g.harvest[crop] -= n;
  g.coins += gain;
  ev.toast(`Продано ${n} × ${CROPS[crop].name} за ${gain} сонцязь`, "good");
  commit(g, w, spirits);
}

export function buySeeds(g: Game, w: World, crop: CropId, qty: number, ev: Events, spirits: Spirit[]): void {
  const cost = CROPS[crop].seedCost * qty;
  if (g.coins < cost) {
    ev.toast(`Бракує ${cost - g.coins} сонцязь`, "bad");
    return;
  }
  g.coins -= cost;
  g.seeds[crop] += qty;
  ev.toast(`Куплено ${qty} насіння «${CROPS[crop].name}»`, "good");
  commit(g, w, spirits);
}
