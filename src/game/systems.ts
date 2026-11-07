import { CROPS, NETWORK_ONLY_SEEDS, type CropId } from "../data/crops";
import { POTIONS, canBrew, recipeText, type PotionId } from "../data/potions";
import { rand01 } from "../core/rng";
import {
  MAP_W,
  type BiomeId,
  type ObjectKind,
  biomeAt,
  idx,
  inBounds,
  isSolid,
  isTillable,
  objectAt,
  setTile,
  tileAt,
  type Plot,
  type World,
} from "../data/world";
import {
  CAN_CAPACITY,
  DAY_LENGTH,
  MOISTURE_MAX,
  saveGame,
  type Dir,
  type Game,
} from "./state";
import { SPIRITS, TRUST_MAX, type SpiritId } from "../data/spirits";
import { caveName, type Cave } from "../data/roots";
import { caveHint, interactCave, rootsDawn, type RootsRun } from "./roots";
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
  enterRoots(layer: number): void;
  descend(): void;
  ascend(): void;
};

/** Everything a rule needs beyond the game and the grove: the three spirits and the active dive. */
export type Ctx = { spirits: Spirit[]; run: RootsRun; cave: Cave | null };

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

export function nearTable(g: Game, w: World): boolean {
  if (g.scene !== "grove") return false;
  const px = g.px / 16;
  const py = g.py / 16;
  return Math.hypot(px - (w.table.tx + 0.5), py - (w.table.ty + 1)) < 2.4;
}

/** The mouth of the Root Network you are standing at — and the depth it delivers you to. */
export function sinkholeNear(
  g: Game,
  w: World,
): { tx: number; ty: number; layer: number } | null {
  if (g.scene !== "grove") return null;
  const px = g.px / 16;
  const py = g.py / 16;
  for (const s of w.sinkholes) {
    if (Math.hypot(px - (s.tx + 0.5), py - (s.ty + 0.5)) < 1.7) return s;
  }
  return null;
}

/** Rockfall keeps everything out until the Root Network eats its own fruit. */
const PASS_FRUIT: CropId = "voidcap";

/** Stone and old mortar: the hoe finds nothing to turn over here. */
const BARREN: Set<BiomeId> = new Set(["ridge", "ruins"]);

/** A sealed pass or an unopened hoard, straight ahead of the alchemist. */
function facingFeature(
  g: Game,
  w: World,
): { kind: ObjectKind; i: number; tx: number; ty: number } | null {
  const { tx, ty } = facingTile(g);
  const o = objectAt(w, tx, ty);
  if (o === "rockfall" || o === "cache")
    return { kind: o, i: idx(tx, ty), tx, ty };
  return null;
}

/** Dissolve one sealed mouth: the whole connected pile gives way at once. */
const AROUND = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

function openPass(w: World, start: number): number[] {
  const queue = [start];
  const seen = new Set<number>([start]);
  while (queue.length) {
    const i = queue.shift()!;
    const tx = i % MAP_W;
    const ty = Math.floor(i / MAP_W);
    for (const [dx, dy] of AROUND) {
      const nx = tx + dx;
      const ny = ty + dy;
      if (!inBounds(nx, ny)) continue;
      const n = idx(nx, ny);
      if (seen.has(n) || w.obj[n] !== "rockfall") continue;
      seen.add(n);
      queue.push(n);
    }
  }
  const cells = [...seen];
  for (const i of cells) {
    w.obj[i] = "rubble";
    w.opened.add(i);
  }
  return cells;
}

const CACHE_TIERS = [0.34, 0.58, 0.78] as const;

function lootCache(g: Game, w: World, i: number, ev: Events): void {
  w.looted.add(i);
  w.obj[i] = "cache_open";
  const roll = rand01(i, 3, 911);
  const cx = (i % MAP_W) * 16 + 8;
  const cy = Math.floor(i / MAP_W) * 16 + 6;
  ev.fx(cx, cy, "#ffd98a", "leaf");
  if (roll < CACHE_TIERS[0]) {
    const n = 20 + Math.floor(roll * 90);
    g.coins += n;
    ev.toast(`У кореневому вузлику ${n} сонцязь`, "good");
  } else if (roll < CACHE_TIERS[1]) {
    g.seeds.voidcap += 2;
    ev.toast("Два згортки спор Порожнього Капелюха", "good");
  } else if (roll < CACHE_TIERS[2]) {
    g.seeds.glass_fern += 1;
    g.seeds.ember_root += 1;
    ev.toast("Насінина Скляної Папороті і Палаючого Кореня", "good");
  } else {
    g.seeds.whisper_vine += 1;
    ev.toast("Насінина Шепотної Лози — духи це запам'ятають", "good");
  }
}

export function movePlayer(
  g: Game,
  w: World,
  dx: number,
  dy: number,
  dt: number,
): void {
  const speed = 78 * (g.effects.speed > 0 ? 1.4 : 1);
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

export function currentHint(g: Game, w: World, ctx: Ctx): Hint | null {
  if (g.shopOpen || g.brewOpen) return null;
  if (ctx.cave && g.scene === "roots") return caveHint(g, ctx.run, ctx.cave);
  const mouth = sinkholeNear(g, w);
  if (mouth)
    return {
      key: "E",
      label:
        mouth.layer === 0
          ? "Спуститися в Мережу Коренів"
          : `Ковзнути в шахту «${caveName(mouth.layer)}»`,
    };
  if (nearTable(g, w)) return { key: "E", label: "Відкрити алхімічний стіл" };
  if (nearStall(g, w)) return { key: "E", label: "Відкрити прилавок" };
  const feature = facingFeature(g, w);
  if (feature?.kind === "rockfall")
    return {
      key: "E",
      label:
        g.harvest[PASS_FRUIT] > 0
          ? "Згодувати завалові Порожній Капелюх"
          : "Завал не пустить: потрібен Порожній Капелюх",
    };
  if (feature) return { key: "E", label: "Розв'язати кореневий вузлик" };
  const reach = spiritInReach(g, ctx.spirits);
  if (reach) {
    const def = SPIRITS[reach.id];
    return {
      key: "E",
      label: reach.fed
        ? `${def.name} ситий · довіра ${reach.trust}/${TRUST_MAX}`
        : `Пригостити: ${def.name} хоче «${CROPS[reach.want].name}»`,
    };
  }
  const { tx, ty } = facingTile(g);
  const plot = w.plots.get(idx(tx, ty));
  if (plot?.crop && isMature(plot))
    return { key: "E", label: `Зібрати ${CROPS[plot.crop].name}` };
  const slot = g.slots[g.selected];
  const tile = tileAt(w, tx, ty);
  if (tile === "water" && slot.kind === "tool" && slot.tool === "can")
    return {
      key: "E",
      label: g.charges >= CAN_CAPACITY ? "Лійка вже повна" : "Наповнити лійку",
    };
  if (slot.kind === "tool" && slot.tool === "hoe" && isTillable(w, tx, ty))
    return { key: "E", label: "Розорати грядку" };
  if (
    slot.kind === "tool" &&
    slot.tool === "can" &&
    tile === "soil" &&
    plot &&
    plot.moisture < MOISTURE_MAX
  )
    return { key: "E", label: "Поливити" };
  if (
    tile === "soil" &&
    !plot?.crop &&
    slot.kind === "seed" &&
    g.seeds[slot.crop] > 0
  )
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

/** Primary interaction: cave node / climb / descend, or feed a spirit / till / plant / water / refill / harvest / open shop. */
export function interact(g: Game, w: World, ev: Events, ctx: Ctx): void {
  if (g.shopOpen || g.brewOpen) return;
  const spirits = ctx.spirits;
  if (ctx.cave && g.scene === "roots") {
    const outcome = interactCave(g, ctx.run, ctx.cave, ev);
    if (outcome === "ascend") ev.ascend();
    else if (outcome === "descend") ev.descend();
    else commit(g, w, ctx);
    return;
  }
  const mouth = sinkholeNear(g, w);
  if (mouth) {
    ev.enterRoots(mouth.layer);
    return;
  }
  if (nearTable(g, w)) {
    g.brewOpen = true;
    ev.toast("Алхімічний стіл: вкинь урожай у казан", "info");
    return;
  }
  if (nearStall(g, w)) {
    g.shopOpen = true;
    ev.toast("Прилавок стародавньої торгівлі", "info");
    return;
  }
  const feature = facingFeature(g, w);
  if (feature?.kind === "rockfall") {
    if (g.harvest[PASS_FRUIT] < 1) {
      ev.toast(
        "Завал тримає. Лише плід Порожнього Капелюха роз'їдає камінь",
        "bad",
      );
      return;
    }
    g.harvest[PASS_FRUIT] -= 1;
    const cells = openPass(w, feature.i);
    for (const n of cells)
      ev.fx(
        (n % MAP_W) * 16 + 8,
        Math.floor(n / MAP_W) * 16 + 10,
        "#b6bcc2",
        "spark",
      );
    ev.shake(5);
    ev.toast("Каміння шипить і осідає порохом. Хід у долі відкрито", "good");
    commit(g, w, ctx);
    return;
  }
  if (feature) {
    lootCache(g, w, feature.i, ev);
    commit(g, w, ctx);
    return;
  }
  const reach = spiritInReach(g, spirits);
  if (reach) {
    feedSpirit(reach, g, ev);
    commit(g, w, ctx);
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
    } else if (BARREN.has(biomeAt(w, tx, ty))) {
      ev.toast("Камінь і давня кладка: тут не розорати грядки", "bad");
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
export function advanceDay(g: Game, w: World, ev: Events, ctx: Ctx): void {
  g.day += 1;
  g.dayTime = 0;
  let grew = 0;
  let dried = 0;
  for (const [, plot] of w.plots) {
    if (!plot.crop) continue;
    const def = CROPS[plot.crop];
    if (plot.moisture > 0 && !isMature(plot)) {
      plot.points += g.growth > 0 ? 2 : 1;
      grew += 1;
    }
    plot.moisture = Math.max(0, plot.moisture - def.thirst);
    if (plot.moisture === 0 && !isMature(plot) && plot.points < def.matureAt)
      dried += 1;
  }
  if (g.growth > 0) {
    g.growth -= 1;
    ev.toast(
      g.growth > 0
        ? `Квінтесенція тримає: ще ${g.growth} світанк${g.growth === 1 ? "" : "и"}`
        : "Квінтесенція вичерпалася",
      "info",
    );
  }
  const ready = countReady(w);
  if (ready > 0) ev.toast(`${ready} грядок дозріло. Час збирати!`, "good");
  else if (grew) ev.toast(`День ${g.day}: ${grew} грядок виросло`);
  if (dried) ev.toast(`${dried} грядкам потрібна вода`, "bad");
  spiritDawn(ctx.spirits, g, w, ev);
  if (ctx.cave) rootsDawn(ctx.run, ctx.cave);
  commit(g, w, ctx);
}

export function countReady(w: World): number {
  let n = 0;
  for (const [, p] of w.plots) if (p.crop && isMature(p)) n += 1;
  return n;
}

export function tickTime(
  g: Game,
  w: World,
  dt: number,
  ev: Events,
  ctx: Ctx,
): void {
  // Flasks burn on the wall clock, not the crop clock.
  for (const key of ["speed", "light", "calm"] as const) {
    if (g.effects[key] > 0) g.effects[key] = Math.max(0, g.effects[key] - dt);
  }
  if (g.skip > 0) {
    g.skip -= dt;
    g.dayTime += dt * (DAY_LENGTH / 0.5);
    if (g.dayTime >= DAY_LENGTH || g.skip <= 0) {
      g.skip = 0;
      advanceDay(g, w, ev, ctx);
    }
    return;
  }
  g.dayTime += dt;
  if (g.dayTime >= DAY_LENGTH) advanceDay(g, w, ev, ctx);
}

export function startSkip(g: Game, ev: Events): void {
  if (g.shopOpen || g.brewOpen) return;
  g.skip = 0.5;
  ev.toast("Алхімік чекає світанку…", "info");
}

export function commit(g: Game, w: World, ctx: Ctx): void {
  const plots = [...w.plots.entries()].map(
    ([i, p]) =>
      [i, p.moisture, p.points, p.crop, p.sway] as [
        number,
        number,
        number,
        CropId | undefined,
        number,
      ],
  );
  const sp = ctx.spirits.map(
    (s) =>
      [s.id, Math.round(s.x), Math.round(s.y), s.dir, s.trust, s.want] as [
        SpiritId,
        number,
        number,
        Dir,
        number,
        CropId,
      ],
  );
  const run = ctx.run;
  saveGame(g, w, plots, sp, {
    layer: run.layer,
    tide: run.tide,
    picked: run.picked,
    surface: [run.surface.px, run.surface.py, run.surface.dir],
  });
}

export function sellStock(
  g: Game,
  w: World,
  crop: CropId,
  qty: number,
  ev: Events,
  ctx: Ctx,
): void {
  const n = Math.min(qty, g.harvest[crop]);
  if (n <= 0) return;
  const gain = n * CROPS[crop].sellPrice;
  g.harvest[crop] -= n;
  g.coins += gain;
  ev.toast(`Продано ${n} × ${CROPS[crop].name} за ${gain} сонцязь`, "good");
  commit(g, w, ctx);
}

export function buySeeds(
  g: Game,
  w: World,
  crop: CropId,
  qty: number,
  ev: Events,
  ctx: Ctx,
): void {
  if (NETWORK_ONLY_SEEDS.includes(crop)) {
    ev.toast("Прилавок не торгує спорами — їх дає лише Мережа Коренів", "bad");
    return;
  }
  const cost = CROPS[crop].seedCost * qty;
  if (g.coins < cost) {
    ev.toast(`Бракує ${cost - g.coins} сонцязь`, "bad");
    return;
  }
  g.coins -= cost;
  g.seeds[crop] += qty;
  ev.toast(`Куплено ${qty} насіння «${CROPS[crop].name}»`, "good");
  commit(g, w, ctx);
}

/** The cauldron burns the harvest and leaves exactly one flask behind. */
export function brew(
  g: Game,
  w: World,
  potion: PotionId,
  ev: Events,
  ctx: Ctx,
): void {
  const def = POTIONS[potion];
  if (!canBrew(g.harvest, def)) {
    ev.toast(`Казан просить: ${recipeText(def)}`, "bad");
    return;
  }
  for (const [crop, qty] of Object.entries(def.needs)) {
    g.harvest[crop as CropId] -= qty ?? 0;
  }
  g.potions[potion] += 1;
  ev.fx(w.table.tx * 16 + 8, w.table.ty * 16 + 4, def.color, "spark");
  ev.shake(2);
  ev.toast(`Зварено «${def.name}»`, "good");
  commit(g, w, ctx);
}

/** Drinking starts the effect; a fresh flask simply extends the one already running. */
export function drink(
  g: Game,
  w: World,
  potion: PotionId,
  ev: Events,
  ctx: Ctx,
): void {
  if (g.potions[potion] <= 0) return;
  const def = POTIONS[potion];
  g.potions[potion] -= 1;
  if (def.effect === "growth") {
    g.growth += def.dawns;
    ev.toast(`Грядки ростуть вдвічі ще ${def.dawns} світанки`, "good");
  } else {
    const was = g.effects[def.effect];
    g.effects[def.effect] = Math.max(was, def.seconds);
    ev.toast(EFFECT_ANNOUNCE[def.effect], "good");
  }
  ev.fx(g.px + 8, g.py + 6, def.color, "spark");
  commit(g, w, ctx);
}

const EFFECT_ANNOUNCE: Record<"speed" | "light" | "calm", string> = {
  speed: "Роса на губах: ноги майже не торкаються землі",
  light: "Мастило пахне смолою — темрява відступає вдвічі далі",
  calm: "Вітер у кишені: прилив спор тече вдвічі повільніше",
};
