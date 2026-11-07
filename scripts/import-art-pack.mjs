/**
 * Copies the Pixel Crawler pack into the game.
 *
 *   node scripts/import-art-pack.mjs "/path/to/Pixel Crawler - Free Pack"
 *
 * Every PNG keeps its place in the pack's own tree, but the folders are
 * slugified so a URL never has to carry a space or an apostrophe, and the
 * "-Sheet" suffix disappears: a file is either a still or an animation, and
 * the code that reads it says which. Mock-ups (reference pictures, never
 * sprites) and the pack's own "-export" duplicates are left behind.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, "../public/art/pack");
const src = resolve(process.argv[2] || "");

if (!existsSync(src)) {
  console.error(`pack folder not found: ${src}`);
  console.error("usage: node scripts/import-art-pack.mjs <Pixel Crawler - Free Pack>");
  process.exit(1);
}

const SKIP_DIRS = new Set(["MockUps"]);

function slug(segment) {
  return segment
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function name(file) {
  return file.replace(/-Sheet\.png$/i, ".png").replace(/[^A-Za-z0-9._-]+/g, "_");
}

function walk(dir, parts) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      out.push(...walk(p, [...parts, slug(entry)]));
    } else if (entry.toLowerCase().endsWith(".png") && !/-export/i.test(entry)) {
      out.push({ from: p, to: [...parts, name(entry)].join("/") });
    }
  }
  return out;
}

rmSync(OUT, { recursive: true, force: true });
const files = walk(src, []);
let bytes = 0;
for (const f of files) {
  const dest = join(OUT, f.to);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(f.from, dest);
  bytes += statSync(dest).size;
}

const tree = files.map((f) => f.to).sort();
writeFileSync(
  join(OUT, "index.json"),
  JSON.stringify({ source: "Pixel Crawler Free Pack 2.11", files: tree }, null, 2) + "\n",
);

console.log(`${tree.length} sheets copied, ${(bytes / 1024).toFixed(0)} KB`);
for (const line of process.argv.includes("--list") ? tree : []) console.log("  " + line);
