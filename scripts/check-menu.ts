/**
 * The menu is DOM, but everything it shows is arithmetic: badges are
 * thresholds over a score, the score is persisted, and the clock is a setting
 * rather than a constant. Those promises are checked here, headless.
 * Run with `npm run check:menu`.
 */
import {
  ACHIEVEMENTS,
  achievementRows,
  isUnlocked,
  unlockedCount,
} from "../src/data/achievements.ts";
import { CROP_ORDER } from "../src/data/crops.ts";
import { POTION_ORDER } from "../src/data/potions.ts";
import { newStats, statsFromSaved, type Stats } from "../src/data/stats.ts";
import { TILE, generateWorld } from "../src/data/world.ts";
import { freshAchievements, achievementsFromSaved } from "../src/game/achievements.ts";
import { newRun } from "../src/game/roots.ts";
import { spawnSpirits } from "../src/game/spirits.ts";
import { spawnVillagers } from "../src/game/villagers.ts";
import { Combat } from "../src/game/enemies.ts";
import {
  dayLength,
  DEFAULT_DAY_MINUTES,
  earn,
  loadGame,
  newGame,
  saveGame,
  setDayLength,
} from "../src/game/state.ts";
import { tickTime, movePlayer, type Ctx, type Events } from "../src/game/systems.ts";

const problems: string[] = [];
const fail = (message: string): void => {
  problems.push(message);
};

/** saveGame and loadGame both swallow a missing storage; this one answers. */
const stash = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  setItem: (k: string, v: string) => stash.set(k, v),
  getItem: (k: string) => stash.get(k) ?? null,
  removeItem: (k: string) => stash.delete(k),
};

const quiet: Events = {
  toast: () => {},
  fx: () => {},
  shake: () => {},
  enterRoots: () => {},
  descend: () => {},
  ascend: () => {},
};

function maxedStats(): Stats {
  const s = newStats();
  for (const key of Object.keys(s) as (keyof Stats)[]) {
    if (typeof s[key] === "number") (s[key] as number) = 99_999;
  }
  for (const c of CROP_ORDER) s.crops[c] = 40;
  for (const p of POTION_ORDER) s.brews[p] = 9;
  return s;
}

// 1 — every badge is a real, uniquely named, positive threshold.
const ids = new Set<string>();
for (const a of ACHIEVEMENTS) {
  if (ids.has(a.id)) fail(`досягнення "${a.id}" зустрілось двічі`);
  ids.add(a.id);
  if (!(a.goal > 0)) fail(`«${a.name}» має ціль ${a.goal}`);
  if (!a.name || !a.blurb) fail(`«${a.id}» не має назви чи опису`);
  if (!Number.isFinite(a.value(newStats())))
    fail(`«${a.name}» рахує не число на порожньому лічильнику`);
}

// 2 — nothing is unreachable: a finished score unlocks the whole wall.
const full = maxedStats();
if (unlockedCount(full) !== ACHIEVEMENTS.length)
  fail(
    `на заповненому лічильнику розблоковано ${unlockedCount(full)} з ${ACHIEVEMENTS.length}`,
  );
const empty = newStats();
if (unlockedCount(empty) !== 0) fail("порожній лічильник уже щось здобув");
for (const row of achievementRows(full)) {
  if (!row.unlocked) fail(`«${row.a.name}» не рахується здобутим`);
  if (row.value !== row.a.goal)
    fail(`рядок «${row.a.name}» показує ${row.value} замість ${row.a.goal}`);
}
if (isUnlocked(ACHIEVEMENTS[0], empty)) fail("перше досягнення здобуто на порожньому лічильнику");

// 3 — applause happens exactly once per badge.
const game = newGame();
game.stats = maxedStats();
const first = freshAchievements(game);
if (first.length !== ACHIEVEMENTS.length)
  fail(`перше оголошення дало ${first.length} замість ${ACHIEVEMENTS.length}`);
if (freshAchievements(game).length !== 0)
  fail("досягнення оголошено вдруге");
if (game.ach.length !== ACHIEVEMENTS.length)
  fail("у сейві не записано всіх здобутих спогадів");
if (achievementsFromSaved(["nope", ACHIEVEMENTS[0].id]).length !== 1)
  fail("невідомий ідентифікатор спогаду не відфільтровано");

// 4 — the score and the badges survive a save round-trip.
const world = generateWorld();
const spirits = spawnSpirits(world);
const villagers = spawnVillagers(world);
const run = newRun(game.px, game.py, game.dir);
const combat = new Combat();
const ctx: Ctx = { spirits, villagers, run, cave: null, combat };
game.stats = newStats();
game.stats.harvested = 17;
game.stats.crops.moonpetal = 11;
game.stats.steps = 8.5;
saveGame(game, world, [], [], { layer: 0, tide: 0, picked: {}, surface: [0, 0, "down"] });
const restored = loadGame();
if (!restored) fail("сейв не повернувся з сховища");
else {
  const back = statsFromSaved(restored.game.stats);
  if (back.harvested !== 17) fail("лічильник врожаю не пережив сейв");
  if (back.crops.moonpetal !== 11) fail("лічильник культур не пережив сейв");
  if (back.crops.ember_root !== 0) fail("порожня культура стала ненульовою");
  if (Math.abs(back.steps - 8.5) > 1e-9) fail("кроки загубилися в сейві");
  if (restored.game.ach?.length !== ACHIEVEMENTS.length)
    fail("спогади не пережили сейв");
  if (restored.game.dayLen !== dayLength()) fail("сейв не пам'ятає тривалість доби");
}
if (statsFromSaved(undefined).harvested !== 0)
  fail("старий сейв без лічильника не стає порожнім");

// 5 — suncents and the ledger never disagree.
const purse = newGame();
earn(purse, 25);
if (purse.coins !== newGame().coins + 25) fail("гаманець не отримав сонцязі");
if (purse.stats.earned !== 25) fail("лічильник заробітку не поповнився");

// 6 — the day is a setting, not a constant.
setDayLength(6);
if (dayLength() !== 360) fail("шестихвилинна доба не стала 360 с");
const clocked = newGame();
let dawns = 0;
const beforeDay = clocked.day;
for (let t = 0; t < 361; t++) {
  tickTime(clocked, world, 1, quiet, ctx);
  dawns = clocked.day - beforeDay;
}
if (dawns !== 1) fail(`за 361 с шестихвилинної доби світанків: ${dawns}`);
setDayLength(24);
if (dayLength() !== 1440) fail("двадцятичотирихвилинна доба не стала 1440 с");
if (clocked.dayTime / dayLength() >= 1) fail("годинник виліз за межі довгої доби");
setDayLength(DEFAULT_DAY_MINUTES);
if (dayLength() !== DEFAULT_DAY_MINUTES * 60) fail("звична доба не повернулася");

// 7 — steps count boots, and the title screen's stroll does not.
const walker = newGame();
walker.px = world.spawn.tx * TILE;
walker.py = world.spawn.ty * TILE - 2;
movePlayer(walker, world, 1, 0, 0.5, true);
if (walker.stats.steps <= 0) fail("ходьба не рахує кроків");
const still = walker.stats.steps;
movePlayer(walker, world, 1, 0, 0.5, false);
if (walker.stats.steps !== still) fail("демо-хід не повинна рахувати кроки");

if (problems.length) {
  for (const p of problems) console.error(`FAIL ${p}`);
  process.exit(1);
}
console.log(
  `  ${ACHIEVEMENTS.length} badges, ${Object.keys(newStats()).length} counters, ` +
    `day ${DEFAULT_DAY_MINUTES} min = ${DEFAULT_DAY_MINUTES * 60} s`,
);
console.log("OK: menu checks passed");
