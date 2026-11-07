/**
 * Night is a promise: something with teeth is out there, and the sickle is
 * the answer to it. These are the real combat rules run headlessly — no
 * browser, no DOM — so a number that stops holding together fails loudly.
 * Run with `npm run check:combat`.
 */
import { CROPS } from "../src/data/crops.ts";
import {
  BOSS,
  ENEMIES,
  ENEMY_ORDER,
  HP_MAX,
  HURT_LOCK,
  SICKLE_DAMAGE,
  enemiesForBiome,
  enemiesForLayer,
  type EnemyId,
} from "../src/data/enemies.ts";
import { MAX_LAYER, generateCave } from "../src/data/roots.ts";
import {
  BIOME_ORDER,
  MAP_H,
  MAP_W,
  TILE,
  biomeAt,
  generateWorld,
  type BiomeId,
} from "../src/data/world.ts";
import {
  Combat,
  caveField,
  facingPoint,
  groveField,
  hitBoss,
  nearestTarget,
  resolveSwing,
  spawnBoss,
  spawnSurface,
  stepBoss,
  stepEnemies,
  SWING_REACH,
  type Enemy,
  type Field,
} from "../src/game/enemies.ts";
import { DAY_LENGTH, newGame } from "../src/game/state.ts";

const problems: string[] = [];
const fail = (message: string): void => {
  problems.push(message);
};

const quiet = {
  toast: () => {},
  fx: () => {},
  shake: () => {},
  enterRoots: () => {},
  descend: () => {},
  ascend: () => {},
};

const world = generateWorld();
const field: Field = groveField(world);
const game = newGame();

/* 1. The roster itself. */
if (HP_MAX % 2) fail("HP_MAX must be even: the HUD draws two points per heart");
for (const id of ENEMY_ORDER) {
  const def = ENEMIES[id];
  if (def.damage >= HP_MAX) fail(`${def.name}: one touch can kill outright`);
  const swings = Math.ceil(def.hp / SICKLE_DAMAGE);
  if (swings > 5) fail(`${def.name}: ${swings} swings is a chore, not a fight`);
  if (!CROPS[def.drop.crop])
    fail(`${def.name}: drops a crop that does not exist`);
  if (def.drop.chance <= 0 || def.drop.chance > 1)
    fail(`${def.name}: drop chance is not a probability`);
  if (!def.biomes.length === !def.layers.length)
    fail(`${def.name}: lives above ground or below, never both`);
  if (!def.speed || def.coins <= 0) fail(`${def.name}: no speed or no purse`);
}

/* 2. Nowhere in the world is safe by accident, nowhere is empty by accident. */
for (const biome of BIOME_ORDER) {
  if (!enemiesForBiome(biome).length) fail(`biome ${biome}: nothing hunts there`);
}
for (let layer = 0; layer <= MAX_LAYER; layer++) {
  const pool = enemiesForLayer(layer);
  if (!pool.length) fail(`layer ${layer + 1}: the tunnels are empty`);
  for (const id of pool)
    if (ENEMIES[id].biomes.length)
      fail(`layer ${layer + 1}: ${ENEMIES[id].name} belongs to the surface`);
}

/* 3. Spawning on real ground: legal species, standable tiles, sane distance. */
function centroid(biome: BiomeId): { tx: number; ty: number } {
  let n = 0;
  let sx = 0;
  let sy = 0;
  for (let ty = 0; ty < MAP_H; ty++)
    for (let tx = 0; tx < MAP_W; tx++)
      if (biomeAt(world, tx, ty) === biome) {
        n++;
        sx += tx;
        sy += ty;
      }
  return { tx: Math.floor(sx / n), ty: Math.floor(sy / n) };
}

for (const biome of BIOME_ORDER) {
  const at = centroid(biome);
  game.px = at.tx * TILE;
  game.py = at.ty * TILE - 4;
  let spawned = 0;
  for (let n = 0; n < 12; n++) {
    for (const e of spawnSurface(world, game, field, 9)) {
      spawned++;
      if (field.solid(e.x + 8, e.y + 8))
        fail(`${biome}: ${e.id} spawned inside a wall`);
      // A nightfall chimera answers to the ground it woke on, which may be a
      // neighbouring biome a few tiles away — not where the alchemist stands.
      const on = biomeAt(
        world,
        Math.floor((e.x + 8) / TILE),
        Math.floor((e.y + 8) / TILE),
      );
      if (!enemiesForBiome(on).includes(e.id))
        fail(`${on}: ${e.id} has no business there`);
      const d = Math.hypot(e.x - game.px, e.y - game.py);
      if (d < 90 || d > 520) fail(`${biome}: spawned ${Math.round(d)}px away`);
    }
  }
  if (!spawned) fail(`biome ${biome}: nightfall produced nothing at all`);
}

/* 4. Teeth: contact hurts, and the mercy window holds the crowd back. */
function pawn(id: EnemyId, x: number, y: number): Enemy {
  return {
    id,
    x,
    y,
    hp: ENEMIES[id].hp,
    dir: "down",
    anim: 0,
    pause: 0,
    vx: 0,
    vy: 0,
    flash: 0,
    home: { tx: Math.floor(x / TILE), ty: Math.floor(y / TILE) },
  };
}

game.hp = HP_MAX;
game.hurt = 0;
const biter = pawn("marsh_husk", game.px + 4, game.py + 4);
const teeth = [biter];
for (let n = 0; n < 20; n++) stepEnemies(teeth, game, field, 0.05, quiet, () => {});
const lost = HP_MAX - game.hp;
if (lost < 1) fail("a chimera standing on you did nothing");
if (lost > ENEMIES.marsh_husk.damage)
  fail(`the mercy window leaked: ${lost} damage in one second`);

/* 5. The sickle answers the arc it can see, and nothing further. */
game.hp = HP_MAX;
game.hurt = 0;
game.dir = "right";
const reach = facingPoint(game);
const close = pawn("wisp", reach.x - 4, reach.y);
const beyond = pawn("wisp", game.px + 120, game.py);
close.hp = 30;
beyond.hp = 30;
resolveSwing([close, beyond], game, quiet);
if (close.hp !== 30 - SICKLE_DAMAGE) fail("the swing missed what was in front of it");
if (beyond.hp !== 30) fail("the swing hit something it cannot reach");
if (!close.vx) fail("a hit thing must be knocked back");

/* 5b. The hint must promise exactly what the blade delivers. */
for (const [ox, oy] of [
  [0, 0],
  [SWING_REACH - 2, 0],
  [-(SWING_REACH - 2), 6],
  [SWING_REACH + 4, 0],
  [0, -(SWING_REACH + 4)],
  [SWING_REACH + 4, SWING_REACH + 4],
]) {
  const at = facingPoint(game);
  const foe = pawn("wisp", at.x + ox - 8, at.y + oy - 8);
  const probe = new Combat();
  probe.enemies = [foe];
  const promised = nearestTarget(game, probe) !== null;
  resolveSwing(probe.enemies, game, quiet);
  const cut = foe.hp < ENEMIES.wisp.hp;
  if (promised !== cut)
    fail(
      `at ${ox},${oy} the hint says ${promised ? "strike" : "nothing"} ` +
        `but the blade says ${cut ? "strike" : "nothing"}`,
    );
}

/* 6. Nightfall fills the grove, and a kill pays once. */
const combat = new Combat();
const home = centroid("home");
game.px = home.tx * TILE;
game.py = home.ty * TILE - 4;
game.dayTime = DAY_LENGTH * 0.9;
game.dir = "down";
game.hurt = HURT_LOCK;
for (let n = 0; n < 8 && !combat.enemies.length; n++)
  combat.update(game, world, null, 0.05, quiet);
if (!combat.enemies.length) fail("nightfall on the home grove woke nothing");
const victim = combat.enemies[0];
victim.hp = 0;
game.coins = 0;
combat.update(game, world, null, 0.05, quiet);
if (game.coins < ENEMIES[victim.id].coins) fail("butchering a chimera paid nothing");
if (combat.enemies.some((e) => e.hp <= 0))
  fail("a corpse stayed on the field to be killed again");
const purse = game.coins;
combat.update(game, world, null, 0.05, quiet);
if (game.coins !== purse) fail("the same corpse was plundered twice");

/* 7. The crown: reachable, beatable, and not a one-hit mistake. */
const cave = generateCave(MAX_LAYER, 0x5eed);
const boss = spawnBoss(cave);
const swings = Math.ceil(BOSS.hp / SICKLE_DAMAGE);
if (swings > 40) fail(`the crown needs ${swings} swings — that is a spreadsheet`);
if (BOSS.damage >= HP_MAX) fail("the crown can kill in one touch");
game.px = boss.x - 16;
game.py = boss.y - 2;
game.dir = "right";
game.hurt = HURT_LOCK;
for (let n = 0; n < swings; n++)
  if (!hitBoss(boss, game, quiet)) fail("the crown cannot be hit from arm's reach");
if (boss.hp > 0) fail("the crown outlived its own swing count");

/* 8. Both of its tricks actually fire, and dying is noticed. */
const volleys = spawnBoss(cave);
volleys.pattern = "volley";
volleys.timer = 0.05;
stepBoss(volleys, game, cave, caveField(cave), 0.05, quiet, () => {}, () => {});
// Ten spores leave the crown; any that burst straight into stone are gone on
// the same tick, so the ring only has to survive wide enough to be a threat.
if (volleys.shots.length < 8)
  fail(`a volley threw only ${volleys.shots.length} spores`);

let adds = 0;
const dug = spawnBoss(cave);
dug.pattern = "burrow";
dug.timer = 0.05;
stepBoss(dug, game, cave, caveField(cave), 0.05, quiet, (a) => {
  adds = a.length;
}, () => {});
if (adds !== 2) fail(`a burrow should tear up two crawlers, got ${adds}`);
if (dug.pattern !== "rise") fail("the crown does not surface after a burrow");
stepBoss(dug, game, cave, caveField(cave), 0.05, quiet, () => {}, () => {});
if (dug.burrowed) fail("the crown stays underground after rising");

let died = false;
const doomed = spawnBoss(cave);
doomed.hp = 0;
stepBoss(doomed, game, cave, caveField(cave), 0.05, quiet, () => {}, () => {
  died = true;
});
if (!died) fail("a felled crown never reported its death");

if (problems.length) {
  for (const p of problems) console.error(`FAIL ${p}`);
  process.exit(1);
}
console.log(
  `  ${ENEMY_ORDER.length} species, ${BIOME_ORDER.length} biomes, ` +
    `${MAX_LAYER + 1} layers, ${swings} swings for ${BOSS.name}`,
);
console.log("OK: combat checks passed");
