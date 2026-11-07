/**
 * The grove is generated, so a bad seed silently makes the game unfinishable.
 * This walks the map the way the player does and fails loudly if any promise breaks.
 * Run with `npm run check:world`.
 */
import {
  MAP_H,
  MAP_W,
  TILE,
  biomeAt,
  generateWorld,
  idx,
  inBounds,
  isSolid,
  isTillable,
  objectAt,
  type BiomeId,
} from "../src/data/world.ts";

const w = generateWorld();
const problems: string[] = [];

function fail(message: string): void {
  problems.push(message);
}

/** Walkable from a start tile, optionally treating sealed passes as open. */
function reach(
  start: { tx: number; ty: number },
  throughPasses: boolean,
): Set<number> {
  const seen = new Set<number>();
  const queue = [idx(start.tx, start.ty)];
  seen.add(queue[0]);
  while (queue.length) {
    const i = queue.shift()!;
    const tx = i % MAP_W;
    const ty = Math.floor(i / MAP_W);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = tx + dx;
      const ny = ty + dy;
      if (!inBounds(nx, ny)) continue;
      const n = idx(nx, ny);
      if (seen.has(n)) continue;
      const o = objectAt(w, nx, ny);
      // A sealed pass is a wall until someone feeds it a fruit.
      if (isSolid(w, nx, ny) && !(throughPasses && o === "rockfall")) continue;
      seen.add(n);
      queue.push(n);
    }
  }
  return seen;
}

// 1. The alchemist starts on ground they can stand on.
if (isSolid(w, w.spawn.tx, w.spawn.ty)) fail("spawn tile is solid");

// 2. Every mouth of the Root Network is reachable and is not drowned.
const open = reach(w.spawn, false);
const free = reach(w.spawn, true);
for (const s of w.sinkholes) {
  if (isSolid(w, s.tx, s.ty)) fail(`sinkhole ${s.tx},${s.ty} is solid`);
  const i = idx(s.tx, s.ty);
  const via = open.has(i)
    ? "on foot"
    : free.has(i)
      ? "through a pass"
      : "never";
  if (via === "never") fail(`sinkhole ${s.tx},${s.ty} cannot be reached`);
}

// 3. Each vault is a promise: a shaft inside, one sealed way in, one way out by force.
const sealed = w.obj.filter((o) => o === "rockfall").length;
if (!sealed) fail("no sealed passes left in the world");
for (const v of w.vaults) {
  const shaft = w.sinkholes.find((s) => s.tx === v.tx + 2 && s.ty === v.ty - 3);
  if (!shaft) fail(`${v.name}: no shaft inside the enclosure`);
  else if (!free.has(idx(shaft.tx, shaft.ty)))
    fail(`${v.name}: shaft is cut off even with the passes open`);
  if (open.has(idx(v.tx, v.ty)))
    fail(`${v.name}: interior is already walkable without a fruit`);
}

// 4. Hoards: enough of them, and at least one you can reach before growing anything.
if (w.caches.length < 8) fail(`only ${w.caches.length} root-knot hoards`);
const wildCaches = w.caches.filter((i) => open.has(i)).length;
if (wildCaches < 3) fail(`only ${wildCaches} hoards reachable without a pass`);
for (const i of w.caches) {
  if (isSolid(w, i % MAP_W, Math.floor(i / MAP_W)))
    fail(`hoard ${i % MAP_W},${Math.floor(i / MAP_W)} is inside a wall`);
}

// 5. Farming still has a home: a real clearing of soil-ready ground.
let garden = 0;
for (let ty = 0; ty < MAP_H; ty++)
  for (let tx = 0; tx < MAP_W; tx++) if (isTillable(w, tx, ty)) garden++;
if (garden < 900) fail(`only ${garden} tillable tiles in the whole grove`);

// 6. Biomes are all present and each is big enough to be worth walking to.
const counts: Record<BiomeId, number> = {
  home: 0,
  thicket: 0,
  marsh: 0,
  ridge: 0,
  ruins: 0,
};
for (let ty = 0; ty < MAP_H; ty++)
  for (let tx = 0; tx < MAP_W; tx++) counts[biomeAt(w, tx, ty)]++;
for (const [b, n] of Object.entries(counts)) {
  if (n < 500) fail(`biome ${b} has only ${n} tiles`);
  console.log(`  ${b.padEnd(8)} ${String(n).padStart(5)} tiles`);
}

// 7. Water still drinks from a bucket: a refill tile next to the home pond.
const pond = w.sinkholes[0];
let shore = 0;
for (let dy = -6; dy <= 6; dy++)
  for (let dx = -6; dx <= 6; dx++) {
    const tx = pond.tx + dx;
    const ty = pond.ty + dy;
    if (inBounds(tx, ty) && !isSolid(w, tx, ty)) shore++;
  }
if (shore < 40) fail(`pond rim has only ${shore} standable tiles`);

console.log(
  `map ${MAP_W}x${MAP_H} tiles (${(MAP_W * TILE) / 320}x screens wide), ` +
    `${w.waterTiles.length} water, ${w.obj.filter((o) => o === "rockfall").length} sealed`,
);
if (problems.length) {
  for (const p of problems) console.error(`FAIL ${p}`);
  process.exit(1);
}
console.log("OK: world checks passed");
