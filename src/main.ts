import {
  attachInput,
  axis,
  endFrame,
  takeWheel,
  wasPressed,
} from "./core/input";
import { buildSprite } from "./core/sprites";
import { initSplash } from "./core/splash";
import {
  artSettled,
  loadArt,
  loadPack,
  loadPackSheets,
  packSettled,
} from "./core/sheets";
import { DEATH_CLIPS, PACK_CLIPS } from "./data/pack";
import { PACK_PROP_SOURCES, STATION_CLIPS } from "./data/packprops";
import { HOE, SICKLE, WATERING_CAN } from "./data/art";
import { BOSS, HP_MAX } from "./data/enemies";
import { caveName, type Cave } from "./data/roots";
import { generateWorld, type World } from "./data/world";
import { Combat } from "./game/enemies";
import { Hud, type BrewAction, type ShopAction } from "./game/hud";
import { Minimap } from "./game/minimap";
import {
  flaskSprite,
  loadWorldFromSave,
  Renderer,
  VIEW_H,
  VIEW_W,
} from "./game/render";
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
  freshAchievements,
  achievementsFromSaved,
} from "./game/achievements";
import { Menu, type MenuAction, type MenuView } from "./game/menu";
import {
  applySettings,
  loadSettings,
  saveSettings,
  type Settings,
} from "./game/settings";
import {
  advanceDay,
  brew,
  buySeeds,
  commit,
  countReady,
  currentHint,
  drink,
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
  DAY_MINUTES,
  dayLength,
  loadGame,
  newGame,
  SLOT_COUNT,
  type Game,
  type Slot,
} from "./game/state";
import { statsFromSaved } from "./data/stats";
import { spawnSpirits, stepSpirits, type Spirit } from "./game/spirits";
import {
  spawnVillagers,
  stepVillagers,
  type Villager,
} from "./game/villagers";

const canvasEl = document.querySelector<HTMLCanvasElement>("#game");
if (!canvasEl) throw new Error("#game canvas missing");
const canvas: HTMLCanvasElement = canvasEl;
const hudEl = document.querySelector<HTMLElement>("#hud");
const settings: Settings = loadSettings();
applySettings(settings);
const splash = initSplash();
loadArt();
loadPack([...PACK_CLIPS, ...DEATH_CLIPS, ...STATION_CLIPS]);
loadPackSheets(PACK_PROP_SOURCES);

splash?.stage("Проростає гай…");
const world: World = generateWorld();
let game: Game = newGame();
const saved = loadGame();

if (saved) {
  loadWorldFromSave(world, saved.kind, saved.game.opened, saved.game.looted);
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
    potions: { ...game.potions, ...(s.potions ?? {}) },
    effects: {
      speed: s.effects?.[0] ?? 0,
      light: s.effects?.[1] ?? 0,
      calm: s.effects?.[2] ?? 0,
    },
    growth: s.growth ?? 0,
    hp: s.hp ?? HP_MAX,
    bossDowned: s.bossDowned ?? false,
    stats: statsFromSaved(s.stats),
    ach: achievementsFromSaved(s.ach),
  };
  // The clock was wound at the length the save remembers; rewinding it to the
  // length the player chose now keeps the same hour on the wall.
  if (s.dayLen) game.dayTime = (game.dayTime / s.dayLen) * dayLength();
  world.plots.clear();
  for (const [i, moisture, points, crop, sway] of s.plots) {
    world.plots.set(i, { moisture, points, crop, sway: sway ?? Math.random() });
  }
}
if (!saved) {
  game.px = world.spawn.tx * 16;
  game.py = world.spawn.ty * 16 - 2;
}
let hasSave = !!saved;

/** The title screen and the pause overlay both stop the world from ticking. */
type Mode = "title" | "play" | "pause";
let mode: Mode = "title";
let introShown = false;

const spirits: Spirit[] = spawnSpirits(world);
const villagers: Villager[] = spawnVillagers(world);
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

splash?.stage("Крою пікселі…");
const renderer = new Renderer(canvas, world);
const minimap = new Minimap(world);
let openedSeen = world.opened.size;
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
const homeMouth = world.sinkholes[0];
if (game.scene === "roots") {
  run.surface = {
    px: homeMouth.tx * 16,
    py: homeMouth.ty * 16 - 2,
    dir: "down",
  };
}

/** The same grove always hides the same tunnels: the sinkhole seeds every layer. */
const worldSeed = (0x5eed + homeMouth.tx * 7919 + homeMouth.ty * 104729) >>> 0;
const combat = new Combat();
const ctx: Ctx = {
  spirits,
  villagers,
  run,
  cave: game.scene === "roots" ? openLayer(run.layer, worldSeed, run) : null,
  combat,
};

const events: Events = {
  toast: (text, tone) => hud.toast(text, tone),
  fx: (x, y, color, kind = "spark") => spawn(fx, x, y, color, kind),
  shake: (power) => {
    if (!settings.shake) return;
    renderer.shake = Math.max(renderer.shake, power / 16);
  },
  enterRoots(layer) {
    run.surface = { px: game.px, py: game.py, dir: game.dir };
    const cave = descendTo(layer);
    enterLayer(game, run, cave);
    hud.toast(
      layer === 0
        ? "Коріння йде під ноги. Шукай вузли міцелію."
        : "Шахта веде геть униз, до серця Мережі.",
      "info",
    );
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

const hud = new Hud(
  (slot) => slotIcon(renderer, slot),
  (color) => flaskSprite(color),
);
hud.onSlotClick((i) => {
  game.selected = i;
  commit(game, world, ctx);
});
hud.onShopAction((a: ShopAction) => {
  if (a.type === "buy") buySeeds(game, world, a.crop, a.qty, events, ctx);
  else sellStock(game, world, a.crop, a.qty, events, ctx);
  hud.setShop(true, game);
});
hud.onBrewAction((a: BrewAction) => {
  if (a.type === "brew") brew(game, world, a.potion, events, ctx);
  else drink(game, world, a.potion, events, ctx);
  hud.setBrew(true, game);
});
hud.onBrewClose(() => closeBrew());
hud.onShopClose(() => closeShop());
hud.onMapClose(() => closeMap());
hud.onMapToggle(() =>
  hud.setMap(!hud.mapOpen, minimap, game, spirits, combat.enemies),
);
hud.onHelpToggle((open) => hud.setHelp(open));
hud.onReset(() => {
  // The unload save must not resurrect the run we are about to erase.
  window.removeEventListener("beforeunload", saveOnUnload);
  clearSave();
  location.reload();
});

const menu = new Menu(menuView());
menu.onAction(runMenuAction);

function menuView(): MenuView {
  return {
    hasSave,
    day: game.day,
    place: minimap.name(game),
    stats: game.stats,
    settings,
    dayOptions: DAY_MINUTES,
  };
}

function switchTo(next: Mode): void {
  mode = next;
  const overlay = next !== "play";
  hudEl?.classList.toggle("menu-mode", overlay);
  canvas.classList.toggle("dim", overlay);
  if (!overlay) {
    menu.close();
    if (!introShown) {
      introShown = true;
      showIntro();
    }
    return;
  }
  menu.open(next, menuView());
}

function runMenuAction(a: MenuAction): void {
  switch (a.type) {
    case "resume":
      switchTo("play");
      return;
    case "saveNow":
      commit(game, world, ctx);
      hasSave = true;
      hud.toast("Світанок і кишеню записано в сейв", "good");
      return;
    case "toTitle":
      commit(game, world, ctx);
      hasSave = true;
      switchTo("title");
      return;
    case "help":
      hud.setHelp(true);
      return;
    case "dropSave":
      window.removeEventListener("beforeunload", saveOnUnload);
      clearSave();
      location.reload();
      return;
    case "toggle":
      settings[a.key] = !settings[a.key];
      saveSettings(settings);
      menu.update(menuView());
      return;
    case "dayLength": {
      // The hour on the wall must not jump when the length of a day does.
      const before = dayLength();
      settings.dayMinutes = a.minutes;
      saveSettings(settings);
      game.dayTime = (game.dayTime / before) * dayLength();
      menu.update(menuView());
      return;
    }
  }
}

let wanderT = 0;
let wanderX = 0;
let wanderY = 0;

/** The alchemist strolls the green behind the title, so the menu is never a poster. */
function titleWalk(dt: number): void {
  if (ctx.cave || game.scene !== "grove") return;
  wanderT -= dt;
  if (wanderT <= 0) {
    const dirs = [
      [0, 1],
      [0, -1],
      [-1, 0],
      [1, 0],
      [0, 0],
      [0, 0],
    ];
    const [dx, dy] = dirs[(Math.random() * dirs.length) | 0];
    wanderX = dx;
    wanderY = dy;
    wanderT = dx || dy ? 1.4 + Math.random() * 1.8 : 0.8 + Math.random() * 1.6;
  }
  movePlayer(game, world, wanderX, wanderY, dt, false);
}

let sinceBadge = 0;

/** Badges are announced the moment the score crosses them, then never again. */
function announceBadges(dt: number): void {
  sinceBadge += dt;
  if (sinceBadge < 0.5) return;
  sinceBadge = 0;
  const got = freshAchievements(game);
  if (!got.length) return;
  for (const a of got) hud.toast(`Спогад гаю: «${a.name}» — ${a.blurb}`, "good");
  commit(game, world, ctx);
}

function closeShop(): void {
  game.shopOpen = false;
  hud.setShop(false, game);
}

function closeBrew(): void {
  game.brewOpen = false;
  hud.setBrew(false, game);
}

function closeMap(): void {
  hud.setMap(false, minimap, game, spirits);
}

function handleKeys(): void {
  if (hud.helpOpen && (wasPressed("escape") || wasPressed("h"))) {
    hud.setHelp(false);
    return;
  }
  if (menu.isOpen) {
    if (hud.helpOpen) return;
    let move = 0;
    if (wasPressed("arrowup") || wasPressed("w")) move -= 1;
    if (wasPressed("arrowdown") || wasPressed("s")) move += 1;
    menu.nav(
      move,
      wasPressed("enter") || wasPressed("space"),
      wasPressed("escape"),
    );
    return;
  }

  if (wasPressed("h")) hud.setHelp(true);
  if (wasPressed("m")) hud.setMap(!hud.mapOpen, minimap, game, spirits);
  if (wasPressed("escape")) {
    if (hud.mapOpen) closeMap();
    else if (game.shopOpen) closeShop();
    else if (game.brewOpen) closeBrew();
    else switchTo("pause");
  }
  if (game.shopOpen || game.brewOpen || hud.mapOpen) return;

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
let booted = false;
let artOn = false;
/** The strips land inside the first second; nobody waits on the network longer. */
const packDeadline = last + 3000;

function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // The tile sheets are still loading while the first frames run; the moment
  // they settle, the baked ground is redrawn out of them.
  if (!artOn && artSettled()) {
    artOn = true;
    renderer.rebuildGround();
  }

  handleKeys();

  const paused = mode !== "play";
  const blocked =
    paused ||
    game.shopOpen ||
    game.brewOpen ||
    hud.helpOpen ||
    hud.mapOpen;
  if (!blocked) {
    const a = axis();
    if (ctx.cave) {
      moveInCave(game, ctx.cave, a.x, a.y, dt);
      const slow = game.effects.calm > 0 ? 0.5 : 1;
      if (stepTide(run, dt, events, slow) === "eject") {
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

  if (paused) {
    // The title screen is an attract mode: the hamlet keeps living, the clock does not.
    if (mode === "title") {
      titleWalk(dt);
      stepSpirits(spirits, game, world, dt);
      if (!ctx.cave) stepVillagers(villagers, game, world, dt);
    }
  } else {
    if (game.skip > 0 && wasPressed("f")) game.skip = 0.02;
    tickTime(game, world, dt, events, ctx);
    if (game.skip <= 0) stepSpirits(spirits, game, world, dt);
    if (game.skip <= 0 && !ctx.cave) stepVillagers(villagers, game, world, dt);
    // Nobody hunts you while you are asleep, in a menu, or waiting for dawn.
    const felled =
      !blocked &&
      game.skip <= 0 &&
      combat.update(game, world, ctx.cave, dt, events);
    if (felled) {
      combat.collapse(game, world, events);
      ctx.cave = null;
      run.layer = 0;
      run.tide = 0;
      run.haul = 0;
      commit(game, world, ctx);
    }
    announceBadges(dt);
  }
  stepFx(fx, dt);
  renderer.shake = Math.max(0, renderer.shake - dt * 1.6);

  if (ctx.cave)
    renderer.drawCave(game, ctx.cave, run, fx, now / 1000, combat);
  else renderer.draw(game, fx, now / 1000, spirits, villagers, combat);
  if (world.opened.size !== openedSeen) {
    openedSeen = world.opened.size;
    minimap.invalidate();
  }
  if (hud.mapOpen) hud.setMap(true, minimap, game, spirits, combat.enemies);
  hud.setPlace(minimap.name(game));
  const radarOn = settings.radar && game.scene === "grove" && !ctx.cave;
  hud.setRadar(minimap, game, spirits, radarOn, combat.enemies);
  hud.setBoss(
    combat.boss
      ? { name: BOSS.name, hp: combat.boss.hp, max: BOSS.hp }
      : null,
  );
  // The loading screen holds until the pack strips are in hand, so the first
  // thing anybody sees is the animated grove, never the stand-in drawings.
  if (!booted && (packSettled() || now >= packDeadline)) {
    booted = true;
    splash?.stage(`День ${game.day} · гай прокинувся`);
    splash?.ready(() => switchTo("title"));
  }
  hud.refresh(
    game,
    settings.hints ? currentHint(game, world, ctx) : null,
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

/** Waits for the splash to fade, otherwise the first tips scroll by unseen. */
function showIntro(): void {
  if (saved)
    hud.toast(`Світанок дня ${game.day}. Город чекає на тебе.`, "info");
  else {
    hud.toast("Ти вигнаний алхімік. Почни з Місячної Пелюстки.", "info");
    hud.toast("Мотика — 1, лійка — 2, насіння — 3-7, серп — 8. Дія: E.", "info");
    hud.toast(
      "У серпні один замах знімає 5 очок. Уночі гай повен зубів — бережи десять сердець.",
      "info",
    );
    hud.toast(
      "У гаю живуть три духи. Пригости їх урожаєм — вони віддячать.",
      "info",
    );
    hud.toast(
      "Провал біля озера веде в Мережу Коренів — там дозріває Порожній Капелюх.",
      "info",
    );
    hud.toast(
      "Казан просто на південь від прилавку: вари зілля з урожаю й пий перед стрибком.",
      "info",
    );
    hud.toast(
      "Гай великий: п'ять біомів, дороги до трьох завалених ходів. Порожній Капелюх ламає камінь.",
      "info",
    );
    hud.toast(
      "M — мапа: червоні крапки ще не відкриті, блакитні вже прохідні.",
      "info",
    );
  }
}
if (!splash) switchTo("title");
commit(game, world, ctx);
requestAnimationFrame(frame);

if (import.meta.env.DEV) {
  (window as unknown as { __cg: unknown }).__cg = {
    game,
    world,
    renderer,
    splash,
    fx,
    events,
    hud,
    spirits,
    villagers,
    run,
    ctx,
    combat,
    minimap,
    worldSeed,
    menu,
    settings,
    switchTo,
    runMenuAction,
    descendTo,
    surfaceTime,
    stepTide,
    tideEjects,
    openLayer,
    interact,
    brew,
    drink,
    movePlayer,
    advanceDay,
    tickTime,
    commit,
  };
}

function slotIcon(r: Renderer, slot: Slot): HTMLCanvasElement | null {
  if (slot.kind === "tool") {
    if (slot.tool === "hoe") return buildSprite("ui_hoe", HOE);
    if (slot.tool === "can") return buildSprite("ui_can", WATERING_CAN);
    return buildSprite("ui_sickle", SICKLE);
  }
  if (slot.kind === "seed") return r.cropSprite(slot.crop, 3);
  return null;
}
