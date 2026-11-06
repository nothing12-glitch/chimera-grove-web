import { CROPS } from "../data/crops";
import {
  MAX_LAYER,
  caveName,
  caveIdx,
  caveSolid,
  generateCave,
  propAt,
  type Cave,
} from "../data/roots";
import type { Dir, Game } from "./state";
import type { Events } from "./systems";

export type RootsRun = {
  layer: number;
  /** seconds the spore tide has been rising during this visit */
  tide: number;
  /** voidcap seeds carried out of the cave during this visit */
  haul: number;
  /** cave tile indices emptied today, per layer, so a day's forage cannot be farmed by re-entering */
  picked: Record<number, number[]>;
  /** where the alchemist stood on the surface before descending */
  surface: { px: number; py: number; dir: Dir };
};

export const TIDE_SECONDS = 105;
export const TIDE_WARN = 0.62;

export function newRun(px: number, py: number, dir: Dir): RootsRun {
  return { layer: 0, tide: 0, haul: 0, picked: {}, surface: { px, py, dir } };
}

/** A layer's map is deterministic; only today's foraging is overlaid on top of it. */
export function openLayer(
  layer: number,
  worldSeed: number,
  run: RootsRun,
): Cave {
  const cave = generateCave(layer, worldSeed);
  for (const i of run.picked[layer] ?? []) {
    if (cave.prop[i] === "node") cave.prop[i] = "spent";
  }
  return cave;
}

export function placeAtSpawn(g: Game, cave: Cave): void {
  g.px = cave.spawn.tx * 16;
  g.py = cave.spawn.ty * 16 - 2;
  g.dir = "down";
}

/** The first dive of a visit: this is where the tide clock starts. */
export function enterLayer(g: Game, run: RootsRun, cave: Cave): void {
  placeAtSpawn(g, cave);
  run.tide = 0;
  run.haul = 0;
}

/** The tide spares nobody: it dumps you at the sinkhole and takes what you carried. */
export function tideEjects(
  g: Game,
  run: RootsRun,
  cave: Cave,
  ev: Events,
): void {
  const lost = Math.min(run.haul, g.seeds.voidcap);
  g.seeds.voidcap -= lost;
  ev.toast("Прилив спор накрив печеру!", "bad");
  if (lost)
    ev.toast(`Забрано ${lost} спор — тримайтеся світла і не затягуйте`, "bad");
  run.layer = 0;
  run.tide = 0;
  run.haul = 0;
  enterLayer(g, run, cave);
}

export function stepTide(
  run: RootsRun,
  dt: number,
  ev: Events,
): "warn" | "eject" | null {
  if (run.tide >= TIDE_SECONDS) return "eject";
  const before = run.tide / TIDE_SECONDS;
  run.tide += dt;
  const after = run.tide / TIDE_SECONDS;
  if (before < TIDE_WARN && after >= TIDE_WARN) {
    ev.toast("Під корінням зашуміло — прилив спор надходить", "bad");
    return "warn";
  }
  return null;
}

export function tideRatio(run: RootsRun): number {
  return Math.min(1, run.tide / TIDE_SECONDS);
}

export function moveInCave(
  g: Game,
  cave: Cave,
  dx: number,
  dy: number,
  dt: number,
): void {
  const speed = 72;
  g.dir =
    dx > 0
      ? "right"
      : dx < 0
        ? "left"
        : dy > 0
          ? "down"
          : dy < 0
            ? "up"
            : g.dir;
  g.moving = !!(dx || dy);
  if (g.moving) g.anim += dt * 7;
  const nx = g.px + dx * speed * dt;
  const ny = g.py + dy * speed * dt;
  if (!blockedInCave(cave, nx, g.py)) g.px = nx;
  if (!blockedInCave(cave, g.px, ny)) g.py = ny;
}

/** Boots decide collision, same as above ground, so the cave mouth never swallows the sprite. */
function blockedInCave(cave: Cave, x: number, y: number): boolean {
  const x0 = Math.floor((x + 3) / 16);
  const x1 = Math.floor((x + 12) / 16);
  const y0 = Math.floor((y + 13) / 16);
  const y1 = Math.floor((y + 19) / 16);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (!caveSolid(cave, tx, ty)) return true;
    }
  }
  return false;
}

export type CaveTarget = {
  kind: "node" | "spent" | "shaft" | "deep";
  tx: number;
  ty: number;
};

export function caveTarget(g: Game, cave: Cave): CaveTarget | null {
  const cx = Math.floor((g.px + 8) / 16);
  const cy = Math.floor((g.py + 12) / 16);
  const off: Record<Dir, [number, number]> = {
    down: [0, 1],
    up: [0, -1],
    left: [-1, 0],
    right: [1, 0],
  };
  const checks: [number, number][] = [
    off[g.dir],
    [0, 0],
    [0, 1],
    [0, -1],
    [-1, 0],
    [1, 0],
  ];
  for (const [dx, dy] of checks) {
    const tx = cx + dx;
    const ty = cy + dy;
    const p = propAt(cave, tx, ty);
    if (p === "node" || p === "spent" || p === "shaft" || p === "deep")
      return { kind: p, tx, ty };
  }
  return null;
}

export function caveHint(
  g: Game,
  run: RootsRun,
  cave: Cave,
): { label: string; key: string } | null {
  const target = caveTarget(g, cave);
  if (!target) return null;
  if (target.kind === "node")
    return { key: "E", label: "Витягнути спору з вузла" };
  if (target.kind === "spent")
    return { key: "E", label: "Вузол порожній — до наступного світанку" };
  if (target.kind === "shaft") {
    return run.layer === 0
      ? { key: "E", label: "Вилізти до гаю" }
      : { key: "E", label: `Піднятися до «${caveName(run.layer - 1)}»` };
  }
  if (run.layer >= MAX_LAYER)
    return { key: "E", label: "Коріння стискається — далі ходу немає" };
  return { key: "E", label: `Спуститися до «${caveName(run.layer + 1)}»` };
}

export type CaveOutcome = "none" | "ascend" | "descend";

/** Harvest a node, climb out, or drop a layer. Returns whether the scene has to change. */
export function interactCave(
  g: Game,
  run: RootsRun,
  cave: Cave,
  ev: Events,
): CaveOutcome {
  const target = caveTarget(g, cave);
  if (!target) {
    ev.toast("Тут лише холодне коріння", "info");
    return "none";
  }
  const i = caveIdx(target.tx, target.ty);

  if (target.kind === "spent") {
    ev.toast("Вузол уже віддав спори. Приде світанок", "info");
    return "none";
  }

  if (target.kind === "node") {
    const spores = 1 + (cave.layer >= 2 && Math.random() < 0.5 ? 1 : 0);
    const pay = 4 + cave.layer * 3;
    g.seeds.voidcap += spores;
    g.coins += pay;
    run.haul += spores;
    run.picked[cave.layer] = [...(run.picked[cave.layer] ?? []), i];
    cave.prop[i] = "spent";
    cave.lights.set(i, 0.9);
    ev.fx(target.tx * 16 + 8, target.ty * 16 + 4, "#e3d1ff", "spark");
    ev.shake(2);
    ev.toast(
      `+${spores} спора · +${pay} сонцязь · «${CROPS.voidcap.name}»`,
      "good",
    );
    if (run.haul === 1)
      ev.toast("Спори — єдине насіння Порожнього Капелюха", "info");
    return "none";
  }

  if (target.kind === "shaft") return "ascend";
  if (run.layer >= MAX_LAYER) {
    ev.toast("Коріння стискається — далі ходу немає", "info");
    return "none";
  }
  return "descend";
}

/** Nodes refill every dawn; the picked list only guards against the same day's double foraging. */
export function rootsDawn(run: RootsRun, cave: Cave): void {
  for (const i of run.picked[cave.layer] ?? []) {
    if (cave.prop[i] === "spent") cave.prop[i] = "node";
  }
  run.picked = {};
}

/** Light falls off from the alchemist and every glow source; deeper layers see less. */
export function glowRadius(layer: number): number {
  return Math.max(46, 74 - layer * 7);
}
