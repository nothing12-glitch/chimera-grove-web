// node scripts/crop.mjs <sheet.png> <cellX> <cellY> <countX> <countY> <scale> <out.png> [cell=16]
import { readPng, writePng, crop } from "./png.mjs";

const [file, cx, cy, nx, ny, scale, out, cellArg] = process.argv.slice(2);
const cell = Number(cellArg ?? 16);
const png = readPng(file);
const c = crop(
  png,
  Number(cx),
  Number(cy),
  Number(nx),
  Number(ny),
  cell,
  Number(scale),
);
writePng(out, c.w, c.h, c.rgba);
console.log(out, c.w + "x" + c.h);
