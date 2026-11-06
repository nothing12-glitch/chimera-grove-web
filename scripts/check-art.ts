import * as art from "../src/data/art.ts";

let bad = 0;
for (const [name, spr] of Object.entries(art)) {
  if (!spr || typeof spr !== "object" || !Array.isArray(spr.rows)) continue;
  const { w, h, rows, pal } = spr as { w: number; h: number; rows: string[]; pal: Record<string, string> };
  if (rows.length !== h) {
    console.log(`${name}: rows=${rows.length} but h=${h}`);
    bad++;
  }
  rows.forEach((r, i) => {
    if (r.length !== w) {
      console.log(`${name}[row ${i}]: len=${r.length} expected ${w}  "${r}"`);
      bad++;
    }
    for (const ch of r) {
      if (ch === ".") continue;
      if (!(ch in pal)) {
        console.log(`${name}[row ${i}]: char "${ch}" missing from palette`);
        bad++;
        break;
      }
    }
  });
  const used = new Set(rows.join(""));
  const unused = Object.keys(pal).filter((k) => !used.has(k) && k !== ".");
  if (unused.length) console.log(`${name}: unused palette keys ${unused.join(",")}`);
}
console.log(bad ? `FAILED: ${bad} problems` : `OK: ${Object.keys(art).length} exports checked`);
