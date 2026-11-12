/**
 * Every animation clip the game registers has to be a real strip in the pack:
 * the cell must divide the sheet, the frames have to fit inside it, and the
 * sprite must not touch the edges of its box — a frame cut at the crown or at
 * the boots is worse than no frame at all.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { readPng } from "./png.mjs";
import {
  BOSS_CREW,
  DEATH_CLIPS,
  ENEMY_CREWS,
  PACK_CLIPS,
  PLAYER_CLIPS,
} from "../src/data/pack";

const PACK = "public/art/pack";

let bad = 0;
const fail = (msg: string) => {
  console.error(msg);
  bad++;
};

/** Opaque pixels of one region, as [x0, y0, x1, y1, count]. */
function content(
  png: { w: number; h: number; rgba: Buffer },
  x: number,
  y: number,
  w: number,
  h: number,
): [number, number, number, number, number] {
  let x0 = 1e9,
    y0 = 1e9,
    x1 = -1,
    y1 = -1,
    n = 0;
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++) {
      const px = x + dx;
      const py = y + dy;
      if (px >= png.w || py >= png.h) continue;
      if (png.rgba[(py * png.w + px) * 4 + 3] < 128) continue;
      n++;
      x0 = Math.min(x0, dx);
      y0 = Math.min(y0, dy);
      x1 = Math.max(x1, dx);
      y1 = Math.max(y1, dy);
    }
  return [x0, y0, x1, y1, n];
}

let sprites = 0;
for (const clip of PACK_CLIPS) {
  const path = join(PACK, clip.src);
  if (!existsSync(path)) {
    fail(`${clip.src}: not shipped in ${PACK}`);
    continue;
  }
  const png = readPng(path);
  const cellH = clip.cellH ?? clip.cell;
  const cols = Math.floor(png.w / clip.cell);
  const rows = Math.floor(png.h / cellH);
  if (png.w % clip.cell || png.h % cellH)
    fail(`${clip.src}: ${png.w}x${png.h} is not a grid of ${clip.cell}x${cellH}`);
  if (clip.frames < 2) fail(`${clip.src}: a strip needs more than one frame`);
  if (clip.frames > cols * rows)
    fail(`${clip.src}: asks ${clip.frames} frames, sheet has ${cols * rows}`);
  const [bx, by, bw, bh] = clip.box ?? [0, 0, clip.cell, cellH];
  if (bx + bw > clip.cell || by + bh > cellH)
    fail(`${clip.src}: box ${bx},${by},${bw}x${bh} escapes the ${clip.cell}x${cellH} cell`);

  for (let f = 0; f < clip.frames; f++) {
    sprites++;
    const cx = (f % cols) * clip.cell;
    const cy = Math.floor(f / cols) * cellH;
    // everything the artist painted in this cell, wherever it sits
    const [fx0, fy0, fx1, fy1, painted] = content(png, cx, cy, clip.cell, cellH);
    if (!painted) {
      fail(`${clip.src}: frame ${f} is empty`);
      continue;
    }
    if (fx0 < bx || fy0 < by || fx1 > bx + bw - 1 || fy1 > by + bh - 1)
      fail(
        `${clip.src}: frame ${f} paints ${fx0},${fy0}-${fx1},${fy1} but the box is ` +
          `${bx},${by}-${bx + bw - 1},${by + bh - 1} — the sprite would be cut off`,
      );
    const [,, , , inside] = content(png, cx + bx, cy + by, bw, bh);
    if (inside < bw * bh * 0.03)
      fail(`${clip.src}: frame ${f} covers only ${inside}px of ${bw}x${bh}`);
    // boots on the ground, body in the middle: what the renderer anchors on.
    // A stride lifts a foot and a flinch leans aside, so both have some play.
    if (fy1 < by + bh - 5)
      fail(
        `${clip.src}: frame ${f} ends ${by + bh - 1 - fy1}px above its own feet line`,
      );
    const centre = (fx0 + fx1) / 2;
    if (Math.abs(centre - (bx + bw / 2)) > 6)
      fail(
        `${clip.src}: frame ${f} sits at x${centre.toFixed(1)}, not in the middle of the cell`,
      );
  }
}

/**
 * Death strips are framed per body by the artist — some lie down, some grow —
 * so they only have to exist, tile evenly, and never present an empty frame.
 */
let falls = 0;
for (const clip of DEATH_CLIPS) {
  const path = join(PACK, clip.src);
  if (!existsSync(path)) {
    fail(`${clip.src}: the death strip is not shipped in ${PACK}`);
    continue;
  }
  const png = readPng(path);
  const cellH = clip.cellH ?? clip.cell;
  const cols = Math.floor(png.w / clip.cell);
  const rows = Math.floor(png.h / cellH);
  if (png.w % clip.cell || png.h % cellH)
    fail(`${clip.src}: ${png.w}x${png.h} is not a grid of ${clip.cell}x${cellH}`);
  if (clip.frames < 2) fail(`${clip.src}: a fall needs more than one frame`);
  if (clip.frames > cols * rows)
    fail(`${clip.src}: asks ${clip.frames} frames, sheet has ${cols * rows}`);
  for (let f = 0; f < clip.frames; f++) {
    const [,,, , painted] = content(
      png,
      (f % cols) * clip.cell,
      Math.floor(f / cols) * cellH,
      clip.cell,
      cellH,
    );
    if (!painted) fail(`${clip.src}: death frame ${f} is empty`);
    falls++;
  }
}

/** The registry must actually cover the casts the game draws. */
for (const [face, set] of Object.entries(PLAYER_CLIPS))
  for (const [anim, clip] of Object.entries(set))
    if (!clip.src.includes(`_${face[0].toUpperCase() + face.slice(1)}.png`))
      fail(`player ${face}.${anim} points at ${clip.src}`);
const crews = Object.keys(ENEMY_CREWS).length;
if (crews !== 9) fail(`only ${crews} chimeras have a crew`);
for (const [id, c] of Object.entries(ENEMY_CREWS))
  if (c.death.src !== c.idle.src.replace(/\/idle\/Idle\.png$/, "/death/Death.png"))
    fail(`${id}: the fall does not belong to the same crew as the walk`);
if (!BOSS_CREW.idle.src.startsWith("entities/")) fail("the boss has no sheet");
if (!BOSS_CREW.death.src.endsWith("/death/Death.png"))
  fail("the boss has no fall of its own");

console.log(
  `${PACK_CLIPS.length} strips, ${sprites} frames, ${falls} death frames, ${
    Object.keys(ENEMY_CREWS).length
  } crews + boss + player: ` + (bad ? `${bad} problem(s)` : "all animated"),
);
process.exit(bad ? 1 : 0);
