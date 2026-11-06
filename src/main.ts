import {
  attachInput,
  axis,
  endFrame,
  takeWheel,
  wasPressed,
} from "./core/input";
import { buildSprite } from "./core/sprites";
import { HOE, WATERING_CAN } from "./data/art";
import { caveName, type Cave } from "./data/roots";
import { generateWorld, type World } from "./data/world";
import { Hud, type ShopAction } from "./game/hud";
import { loadWorldFromSave, Renderer, VIEW_H, VIEW_W } from "./game/render";
import {
  enterLayer,
  moveInCave,
  newRun,
  openLayer,
  placeAtSpawn,
  stepTide,
  tideEjects,
  tideRatio,
} from "./game/roots";
import {
  buySeeds,
  commit,
  countReady,
  currentHint,
  interact,
  movePlayer,
  sellStock,
  startSkip,
  tickTime,
  type Ctx,
  type Events,
  type FX,
} from "./game/systems";
import {
  clearSave,
  loadGame,
  newGame,
  SLOT_COUNT,
  type Game,
  type Slot,
} from "./game/state";
import { spawnSpirits, stepSpirits, type Spirit } from "./game/spirits";

const canvasEl = document.querySelector<HTMLCanvasElement>("#game");
if (!canvasEl) throw new Error("#game canvas missing");
const canvas: HTMLCanvasElement = canvasEl;

const world: World = generateWorld();
let game: Game = newGame();
const saved = loadGame();

if (saved) {
  loadWorldFromSave(world, saved.kind);
  const s = saved.game;
  game = {
    ...game,
    px: s.px,
    py: s.py,
    dir: s.dir,
    coins: s.coins,
    day: s.day,
    dayTime: s.dayTime,
    charges: s.charges,
    slots: s.slots.slice(0, SLOT_COUNT),
    selected: s.selected,
    seeds: { ...game.seeds, ...s.seeds },
    harvest: { ...game.harvest, ...s.harvest },
    scene: s.scene ?? "grove",
  };
  world.plots.clear();
  for (const [i, moisture, points, crop, sway] of s.plots) {
    world.plots.set(i, { moisture, points, crop, sway: sway ?? Math.random() });
  }
}
if (!saved) {
  game.px = world.spawn.tx * 16;
  game.py = world.spawn.ty * 16 - 2;
}

const spirits: Spirit[] = spawnSpirits(world);
if (saved) {
  for (const [id, x, y, dir, trust, want] of saved.game.spirits ?? []) {
    const s = spirits.find((sp) => sp.id === id);
    if (!s) continue;
    s.x = x;
    s.y = y;
    s.dir = dir;
    s.trust = trust;
    s.want = want;
  }
}

const renderer = new Renderer(canvas, world);
const fx: FX[] = [];

const run = newRun(game.px, game.py, game.dir);
if (saved?.game.roots) {
  const r = saved.game.roots;
  run.layer = r.layer;
  run.tide = r.tide;
  run.picked = r.picked ?? {};
  run.surface = { px: r.surface[0], py: r.surface[1], dir: r.surface[2] };
}
// A dive cut short by closing the tab resumes at the rim, never stranded inside a cave.
if (game.scene === "roots") {
  run.surface = {
    px: world.sinkhole.tx * 16,
    py: world.sinkhole.ty * 16 - 2,
    dir: "down",
  };
}

/** The same grove always hides the same tunnels: the sinkhole seeds every layer. */
const worldSeed =
  (0x5eed + world.sinkhole.tx * 7919 + world.sinkhole.ty * 104729) >>> 0;
const ctx: Ctx = {
  spirits,
  run,
  cave: game.scene === "roots" ? openLayer(run.layer, worldSeed, run) : null,
};

const events: Events = {
  toast: (text, tone) => hud.toast(text, tone),
  fx: (x, y, color, kind = "spark") => spawn(fx, x, y, color, kind),
  shake: (power) => {
    renderer.shake = Math.max(renderer.shake, power / 16);
  },
  enterRoots() {
    run.surface = { px: game.px, py: game.py, dir: game.dir };
    const cave = descendTo(0);
    enterLayer(game, run, cave);
    hud.toast("Коріння йде під ноги. Шукай вузли міцелію.", "info");
    commit(game, world, ctx);
  },
  descend() {
    descendTo(run.layer + 1);
  },
  ascend() {
    if (run.layer === 0) surfaceTime();
    else descendTo(run.layer - 1);
  },
};

function descendTo(layer: number): Cave {
  run.layer = layer;
  const cave = openLayer(layer, worldSeed, run);
  ctx.cave = cave;
  game.scene = "roots";
  placeAtSpawn(game, cave);
  hud.toast(`Глибина ${layer + 1} — «${caveName(layer)}»`, "info");
  commit(game, world, ctx);
  return cave;
}

function surfaceTime(): void {
  ctx.cave = null;
  game.scene = "grove";
  game.px = run.surface.px;
  game.py = run.surface.py;
  game.dir = run.surface.dir;
  run.tide = 0;
  run.haul = 0;
  hud.toast("Світло гаю. У кишені — спори.", "good");
  commit(game, world, ctx);
}

const hud = new Hud((slot) => slotIcon(renderer, slot));
hud.onSlotClick((i) => {
  game.selected = i;
  commit(game, world, ctx);
});
hud.onShopAction((a: ShopAction) => {
  if (a.type === "buy") buySeeds(game, world, a.crop, a.qty, events, ctx);
  else sellStock(game, world, a.crop, a.qty, events, ctx);
  hud.setShop(true, game);
});
hud.onShopClose(() => closeShop());
hud.onHelpToggle((open) => hud.setHelp(open));
hud.onReset(() => {
  // The unload save must not resurrect the run we are about to erase.
  window.removeEventListener("beforeunload", saveOnUnload);
  clearSave();
  location.reload();
});

function closeShop(): void {
  game.shopOpen = false;
  hud.setShop(false, game);
}

function handleKeys(): void {
  if (wasPressed("h")) hud.setHelp(!hud.helpOpen);
  if (wasPressed("escape")) {
    if (hud.helpOpen) hud.setHelp(false);
    else if (game.shopOpen) closeShop();
  }
  if (game.shopOpen || hud.helpOpen) return;

  for (let i = 0; i < SLOT_COUNT; i++) {
    if (wasPressed(String(i + 1))) game.selected = i;
  }
  const wheel = takeWheel();
  if (wheel) game.selected = (game.selected + wheel + SLOT_COUNT) % SLOT_COUNT;

  if (wasPressed("e") || wasPressed("space") || wasPressed("enter"))
    interact(game, world, events, ctx);
  if (wasPressed("f") && !ctx.cave) startSkip(game, events);
}

function spawn(
  list: FX[],
  x: number,
  y: number,
  color: string,
  kind: FX["kind"],
): void {
  const n = kind === "leaf" ? 12 : 9;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp =
      kind === "drop" ? 14 + Math.random() * 10 : 20 + Math.random() * 22;
    list.push({
      x: x + Math.cos(a) * 3,
      y: y + Math.sin(a) * 2,
      vx: Math.cos(a) * sp,
      vy: (kind === "drop" ? -1 : -0.7) * sp * (0.4 + Math.random() * 0.6),
      life: 0.45 + Math.random() * 0.4,
      color,
      kind,
    });
  }
}

function stepFx(list: FX[], dt: number): void {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life -= dt;
    if (p.life <= 0) {
      list.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += (p.kind === "drop" ? 90 : 42) * dt;
    p.vx *= 0.96;
  }
}

function resize(): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.floor(window.innerWidth * dpr);
  const h = Math.floor(window.innerHeight * dpr);
  const scale = Math.max(
    1,
    Math.min(Math.floor(w / VIEW_W), Math.floor(h / VIEW_H)),
  );
  canvas.width = VIEW_W * scale;
  canvas.height = VIEW_H * scale;
  canvas.style.width = `${(VIEW_W * scale) / dpr}px`;
  canvas.style.height = `${(VIEW_H * scale) / dpr}px`;
}

let last = performance.now();
let sinceSave = 0;

function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  handleKeys();

  if (!game.shopOpen && !hud.helpOpen) {
    const a = axis();
    if (ctx.cave) {
      moveInCave(game, ctx.cave, a.x, a.y, dt);
      if (stepTide(run, dt, events) === "eject") {
        const cave = openLayer(0, worldSeed, run);
        ctx.cave = cave;
        tideEjects(game, run, cave, events);
        sinceSave = 0;
        commit(game, world, ctx);
      }
    } else if (game.skip <= 0) {
      movePlayer(game, world, a.x, a.y, dt);
    }
  }
  if (game.skip > 0 && wasPressed("f")) game.skip = 0.02;

  tickTime(game, world, dt, events, ctx);
  if (game.skip <= 0) stepSpirits(spirits, game, world, dt);
  stepFx(fx, dt);
  renderer.shake = Math.max(0, renderer.shake - dt * 1.6);

  if (ctx.cave) renderer.drawCave(game, ctx.cave, run, fx, now / 1000);
  else renderer.draw(game, fx, now / 1000, spirits);
  hud.refresh(
    game,
    currentHint(game, world, ctx),
    countReady(world),
    spirits,
    ctx.cave
      ? { name: caveName(run.layer), layer: run.layer, tide: tideRatio(run) }
      : null,
  );

  sinceSave += dt;
  if (sinceSave > 12) {
    sinceSave = 0;
    commit(game, world, ctx);
  }
  endFrame();
  requestAnimationFrame(frame);
}

window.addEventListener("resize", resize);
window.addEventListener("beforeunload", saveOnUnload);
function saveOnUnload(): void {
  commit(game, world, ctx);
}
attachInput(window);
resize();
hud.refresh(game, null, 0, spirits, null);

if (saved) hud.toast(`Світанок дня ${game.day}. Город чекає на тебе.`, "info");
else {
  hud.toast("Ти вигнаний алхімік. Почни з Місячної Пелюстки.", "info");
  hud.toast("Мотика — 1, лійка — 2, насіння — 3-7. Дія: E.", "info");
  hud.toast(
    "У гаю живуть три духи. Пригости їх урожаєм — вони віддячать.",
    "info",
  );
  hud.toast(
    "Провал біля озера веде в Мережу Коренів — там дозріває Порожній Капелюх.",
    "info",
  );
}
commit(game, world, ctx);
requestAnimationFrame(frame);

if (import.meta.env.DEV) {
  (window as unknown as { __cg: unknown }).__cg = {
    game,
    world,
    renderer,
    fx,
    events,
    hud,
    spirits,
    run,
    ctx,
    worldSeed,
    descendTo,
    surfaceTime,
    stepTide,
    tideEjects,
    openLayer,
    interact,
    commit,
  };
}

function slotIcon(r: Renderer, slot: Slot): HTMLCanvasElement | null {
  if (slot.kind === "tool") {
    return slot.tool === "hoe"
      ? buildSprite("ui_hoe", HOE)
      : buildSprite("ui_can", WATERING_CAN);
  }
  if (slot.kind === "seed") return r.cropSprite(slot.crop, 3);
  return null;
}
