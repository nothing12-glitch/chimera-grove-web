/**
 * Every tile the grove asks the Pixel Crawler sheets for must actually be a
 * full, opaque cell in the shipped png. A half-transparent autotile fragment
 * baked into the ground would show the void through the floor.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MAT } from "../src/data/tiles";
import { cells, hex, readPng } from "./png.mjs";

const ART = "public/art";
const FILE = {
  floors: "floors.png",
  water: "water.png",
  dungeon: "dungeon.png",
  vegetation: "vegetation.png",
};

let bad = 0;
const fail = (msg: string) => {
  console.error(msg);
  bad++;
};

const sheets = new Map<string, { w: number; h: number; rgba: Buffer }>();
for (const [name, file] of Object.entries(FILE)) {
  const path = join(ART, file);
  if (!existsSync(path)) fail(`${path} is missing from public/art`);
  sheets.set(name, readPng(path));
}

/** Decor sits on top of the ground, so it is allowed to be mostly air. */
const DECOR = new Set(["flower", "sprout", "bush"]);

let checked = 0;
for (const [id, material] of Object.entries(MAT)) {
  const png = sheets.get(material.sheet);
  if (!png) {
    fail(`${id}: unknown sheet ${material.sheet}`);
    continue;
  }
  const { cols, list } = cells(png);
  const rows = Math.floor(png.h / 16);
  for (const [cx, cy] of material.refs) {
    checked++;
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) {
      fail(`${id}: cell ${cx},${cy} is off the ${cols}x${rows} sheet`);
      continue;
    }
    const cell = list[cy * cols + cx];
    const want = DECOR.has(id) ? 0.04 : 0.95;
    if (cell.coverage < want)
      fail(
        `${id}: cell ${cx},${cy} covers ${Math.round(cell.coverage * 100)}%, ` +
          `needs ${Math.round(want * 100)}%`,
      );
    if (!DECOR.has(id) && cell.shades < 1) fail(`${id}: cell ${cx},${cy} is empty`);
    if (!DECOR.has(id) && cell.shades > 12)
      fail(
        `${id}: cell ${cx},${cy} has ${cell.shades} shades (${hex(cell.rgb)}) ` +
          `— that is a drawn object, not a floor`,
      );
  }
}

const license = readFileSync(join(ART, "LICENSE-Pixel-Crawler.txt"), "utf8");
if (!/anokolisa/i.test(license)) fail("the pack licence does not name its author");

console.log(
  `${Object.keys(MAT).length} materials, ${checked} cells, 4 sheets: ` +
    (bad ? `${bad} problem(s)` : "all cut from real tiles"),
);
process.exit(bad ? 1 : 0);
