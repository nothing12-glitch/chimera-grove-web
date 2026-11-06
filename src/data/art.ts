import type { Sprite } from "../core/sprites";

/**
 * All art is authored as 16-wide pixel strings; '.' = transparent.
 * Plant shapes use shared chars (k outline, a stem/leaf, b body, c accent/glow,
 * d highlight) and each crop just swaps its palette.
 */

export const EARTH: Record<string, string> = {
  r: "#4a3120",
  e: "#6b4728",
  s: "#8a6038",
};

export const TILLED: Sprite = {
  w: 16,
  h: 16,
  pal: { a: "#5b3b23", b: "#6f4a2c", c: "#3a2415", k: "#241408", l: "#7d5734" },
  rows: [
    "aabaaabaaabaaaba",
    "lbbalblbbalbbalb",
    "bbaababbaabbaaab",
    "cccccccccccccccc",
    "kckckkkckckkkckk",
    "aaabaaabaaabaaab",
    "bbalbbbabbabbbal",
    "aabaaabaaabaaaba",
    "cccccccccccccccc",
    "kkckkckkkkckkckk",
    "abaaabaaabaaabaa",
    "baablaabbaabbaal",
    "aababbaababbaaba",
    "cccccccccccccccc",
    "kckkkkckkckkkkck",
    "aaabaaabaaabaaab",
  ],
};

export const TILLED_WET_PAL: Record<string, string> = {
  a: "#3a2415",
  b: "#4a2f1c",
  c: "#241408",
  k: "#160c05",
  l: "#5a3a22",
};

export const WATER_0: Sprite = {
  w: 16,
  h: 16,
  pal: { a: "#2b6a8c", b: "#357f9f" },
  rows: [
    "aaaaaaaaaaaaaaaa",
    "aaaaaaaaaaaaaaaa",
    "aabbaaaaaaaaaabb",
    "aaaaaaaaaaaaaaaa",
    "aaaaabbbbaaaaaaa",
    "aaaaaaaaaaaaaaaa",
    "aaaaaaaaaaaaaaaa",
    "aaaaaaaabbbbaaaa",
    "aaaaaaaaaaaaaaaa",
    "aaaaaaaaabbbaaaa",
    "aaaaaaaaaaaaaaaa",
    "aaaaaaaaaaaaaaaa",
    "aabbaaaaabbbaaaa",
    "aaaaaaaaaaaaaaaa",
    "aaaaaaaaaaaaaaaa",
    "aaaaaaaaaaaaaaaa",
  ],
};

export const WATER_1: Sprite = {
  w: 16,
  h: 16,
  pal: WATER_0.pal,
  rows: [
    "aaaaaaaaaaaaaaaa",
    "aaaaaaaaaaaaaaaa",
    "aaaaaaaaaaaaaaaa",
    "aaaabbbaaaaaaaaa",
    "aaaaaaaaaaaaaaaa",
    "aaaaaaaaaabbbaaa",
    "aaaaaaaaaaaaaaaa",
    "aaaaaaaaaaaaaaaa",
    "aabbbbaaaaaaaaaa",
    "aaaaaaaaaaaaaaaa",
    "aaaaaaaabbbbaaaa",
    "aaaaaaaaaaaaaaaa",
    "aaaaaaaaaaaaaaaa",
    "aaaaaaaaabbbbaaa",
    "aaaaaaaaaaaaaaaa",
    "aaaaaaaaaaaaaaaa",
  ],
};

export const GRASS_TUFT: Sprite = {
  w: 16,
  h: 16,
  pal: { a: "#3f6d3a", b: "#527f44", c: "#679653" },
  rows: [
    "................",
    "................",
    "................",
    ".....c....c.....",
    "....cb....bc....",
    "....cbb..bbc....",
    "...cbbccccbbbc..",
    "...cbbbbbbbbbc..",
    "....abba..abba..",
    ".....aba...aba..",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
};

export const WILD_FLOWER: Sprite = {
  w: 16,
  h: 16,
  pal: { b: "#54853f", c: "#e6c34a", d: "#e0607a", e: "#9d7fd6" },
  rows: [
    "................",
    "................",
    "......c.d.e.....",
    ".....cccddddee..",
    ".....cccddddee..",
    "......c.d.e.....",
    ".......b........",
    ".......b........",
    ".....bb.bbb.....",
    "......bbb.......",
    ".......b........",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
};

/* ---------------- crops: shared shapes, per-crop palette ---------------- */

export const CROP_SEED: Sprite = {
  w: 16,
  h: 16,
  pal: { ...EARTH, c: "#ffffff" },
  rows: [
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "......eeee......",
    ".....ecccece....",
    "....errrrrrre...",
    "...rrrrrrrrrrr..",
    "..rrrrrrrrrrrrr.",
  ],
};

export const CROP_SPROUT: Sprite = {
  w: 16,
  h: 16,
  pal: { k: "#1d2a18", a: "#4e8043", d: "#77ad5c" },
  rows: [
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "..dd......dd....",
    ".dddd....dddd...",
    ".ddddk..kdddd...",
    "..kkdd..ddkk....",
    "......aa........",
    "......aa........",
    "......aa........",
    "......aa........",
    ".....kakk.......",
    "................",
  ],
};

export const CROP_GROWING: Sprite = {
  w: 16,
  h: 16,
  pal: { k: "#1d2a18", a: "#4e8043", d: "#77ad5c", c: "#9ecb6d" },
  rows: [
    "................",
    ".......c........",
    "......kck.......",
    "......kck.......",
    "..dd...k...dd...",
    ".dddd......dddd.",
    ".ddddk....kdddd.",
    "..kkdd....ddkk..",
    "......kakk......",
    "....dd.aa.dd....",
    "...dddd..dddd...",
    "...dddd..dddd...",
    "....kk.aa.kk....",
    ".......aa.......",
    "......kakk......",
    "................",
  ],
};

export const MATURE_MOONPETAL: Sprite = {
  w: 16,
  h: 16,
  pal: { k: "#182035", a: "#4e7f8c", b: "#c9d8f5", c: "#7ea8ff", d: "#f2f7ff" },
  rows: [
    "................",
    "......bbbb......",
    ".....bdddccb....",
    "....bddcccddb...",
    "...bdcccacccdb..",
    "..bdcckakkccdb..",
    "..bdcckakkccdb..",
    "...bdcckakkcdb..",
    "....bdccccddb...",
    ".....bddcddb....",
    ".......ak.......",
    "..aa...ak...aa..",
    ".aaaa..ak..aaaa.",
    ".aaaak.ak.kaaaa.",
    "..kkkaaaaakkk...",
    "................",
  ],
};

export const MATURE_EMBER_ROOT: Sprite = {
  w: 16,
  h: 16,
  pal: { k: "#2b1106", a: "#6f7f3a", b: "#e0603a", c: "#ffc45e", d: "#ffe9a8" },
  rows: [
    "................",
    "........c.......",
    ".......cdc......",
    "......ccdcc.....",
    ".....bbccbabb...",
    ".....bbcccbdb...",
    "....abbbbbbbba..",
    "....abbbbbbbba..",
    ".....abbbbbba...",
    "......abbbba....",
    ".......abba.....",
    ".......kak......",
    "..dd..kak...dd..",
    ".dddd.kak.dddd..",
    "..kkkkakkkkkk...",
    "................",
  ],
};

export const MATURE_GLASS_FERN: Sprite = {
  w: 16,
  h: 16,
  pal: { k: "#1b3a3a", a: "#4f9b8f", b: "#9fe3d6", c: "#d8fff7", d: "#6fc4b6" },
  rows: [
    "..........cc....",
    ".......d..ccd...",
    "......ddd...cc..",
    ".....dbbdd....c.",
    "....dbabbd...cd.",
    "...dbaaabd..ccd.",
    "..dbaaaabddccdd.",
    ".kbaaaaaabkkkkk.",
    "..baaaaabddccdd.",
    "...baaabdd.ccd..",
    "....baabd...cd..",
    "....kbak.....d..",
    ".....kak........",
    ".....kak........",
    "....kkaakk......",
    "................",
  ],
};

export const MATURE_VOIDCAP: Sprite = {
  w: 16,
  h: 16,
  pal: { k: "#150e26", a: "#cfd6e8", b: "#6b3fa0", c: "#b487e8", d: "#e0d0ff" },
  rows: [
    "................",
    "................",
    "......kkkk......",
    "....kkbbbbkk....",
    "...kbbcbbcbkk...",
    "..kbbbccbbcbkk..",
    "..kbbccbbccbbk..",
    ".kbbbbbbbbbbcbk.",
    ".kaaaaaaaaaaaak.",
    "..kkaaaaaaaakk..",
    "....kaaaaakk....",
    ".....kaaaak.....",
    ".....kaaaak.....",
    "....kkaaaakk....",
    "...dddddddddd...",
    "................",
  ],
};

/** Climbing tendril with three hanging bells — built from rects so it stays pixel-exact. */
export const MATURE_WHISPER_VINE: Sprite = rects(16, 16, [
  // stem shadow, then lit stem one pixel left of it
  [8, 0, 1, 3, "#241b2e"],
  [7, 3, 1, 3, "#241b2e"],
  [9, 6, 1, 3, "#241b2e"],
  [8, 9, 1, 3, "#241b2e"],
  [7, 12, 1, 4, "#241b2e"],
  [7, 0, 1, 3, "#5c8a4a"],
  [6, 3, 1, 3, "#5c8a4a"],
  [8, 6, 1, 3, "#5c8a4a"],
  [7, 9, 1, 3, "#5c8a4a"],
  [6, 12, 1, 4, "#5c8a4a"],
  // top curl
  [8, 0, 3, 1, "#5c8a4a"],
  [10, 1, 2, 1, "#a9d17a"],
  // leaves
  [4, 2, 2, 1, "#a9d17a"],
  [3, 3, 2, 1, "#5c8a4a"],
  [9, 5, 2, 1, "#a9d17a"],
  [10, 6, 2, 1, "#5c8a4a"],
  [4, 10, 2, 1, "#a9d17a"],
  [3, 11, 2, 1, "#5c8a4a"],
  [9, 13, 2, 1, "#a9d17a"],
  // bell 1
  [4, 4, 1, 1, "#5c8a4a"],
  [3, 4, 3, 1, "#241b2e"],
  [3, 5, 3, 2, "#8f6fd6"],
  [4, 7, 1, 1, "#e3d1ff"],
  // bell 2
  [9, 7, 1, 1, "#5c8a4a"],
  [10, 7, 3, 1, "#241b2e"],
  [10, 8, 3, 2, "#8f6fd6"],
  [11, 10, 1, 1, "#e3d1ff"],
  // bell 3
  [5, 12, 1, 1, "#5c8a4a"],
  [4, 12, 3, 1, "#241b2e"],
  [4, 13, 3, 2, "#8f6fd6"],
  [5, 15, 1, 1, "#e3d1ff"],
], { k: "#241b2e", a: "#5c8a4a", b: "#8f6fd6", c: "#e3d1ff", d: "#a9d17a" });

/* ---------------- player ---------------- */

export const PLAYER_PAL: Record<string, string> = {
  k: "#1b1410",
  h: "#2f4a3a",
  H: "#3d5c48",
  s: "#e0aa7c",
  e: "#241a12",
  r: "#4f7a52",
  R: "#3c5f41",
  g: "#d9a441",
  b: "#3a2b1e",
  p: "#6b4a2a",
  w: "#eef2ea",
};

export const PLAYER_DOWN: Sprite = {
  w: 16,
  h: 20,
  pal: PLAYER_PAL,
  rows: [
    "....kkkkkkkk....",
    "..kkhhhhhhhhkk..",
    ".khhhhhhhhhhhhk.",
    ".khhsssssssskk..",
    ".khhksesesesk...",
    ".khhssssssskh...",
    "..kksssssskk....",
    "...kkgggggkk....",
    "..kkrrrrrrkkk...",
    ".khrRRrrRRrhk...",
    ".khrrrrrrrrrk...",
    ".khRrrgggrrhk...",
    ".khRrrgggrrhk...",
    "..krrrrrrrrk....",
    "..kRrrrrrrRk....",
    "...kbbbbbbk.....",
    "...kbk..kbk.....",
    "...kbk..kbk.....",
    "...kkk..kkk.....",
    "................",
  ],
};

export const PLAYER_DOWN_WALK: Sprite = {
  w: 16,
  h: 20,
  pal: PLAYER_PAL,
  rows: PLAYER_DOWN.rows.map((r, i) =>
    i >= 15 && i <= 18
      ? ["...kbbbbbbk.....", "...kbk..kbk.....", "....kbk.kbk.....", "....kkk.kkk....."][i - 15]
      : r,
  ),
};

export const PLAYER_UP: Sprite = {
  w: 16,
  h: 20,
  pal: PLAYER_PAL,
  rows: [
    "....kkkkkkkk....",
    "..kkhhhhhhhhkk..",
    ".khhhhhhhhhhhhk.",
    ".khhhhhhhhhhhhk.",
    ".khhHHhhhhHHhhk.",
    ".khhhhhhhhhhhhk.",
    "..khhhhhhhhhhk..",
    "...kkgggggkk....",
    "..kkrrrrrrkkk...",
    ".khrRRrrRRrhk...",
    ".khrrppprrrrk...",
    ".khRrppprrrhk...",
    ".khRrrrrrrrhk...",
    "..krrrrrrrrk....",
    "..kRrrrrrrRk....",
    "...kbbbbbbk.....",
    "...kbk..kbk.....",
    "...kbk..kbk.....",
    "...kkk..kkk.....",
    "................",
  ],
};

export const PLAYER_SIDE: Sprite = {
  w: 16,
  h: 20,
  pal: PLAYER_PAL,
  rows: [
    "....kkkkkkk.....",
    "..kkhhhhhhhhk...",
    ".khhhhhhhhhhhk..",
    ".khhssssssshk...",
    ".khhssesesshk...",
    ".khssssssssk....",
    "..kksssskk......",
    "...kkgggkk......",
    "..kkrrrrrkk.....",
    ".khrrrrrrrrk....",
    ".khrrrrrrrrk....",
    ".khRrggrrrk.....",
    ".khRrggrrrk.....",
    "..krrrrrrk......",
    "..kRrrrrRk......",
    "...kbbbbk.......",
    "...kbkbbk.......",
    "...kbk.bk.......",
    "...kkk.kkk......",
    "................",
  ],
};

/* ---------------- scenery ---------------- */

export const PINE: Sprite = {
  w: 16,
  h: 32,
  pal: { k: "#131f14", g: "#2c4a2a", G: "#3f6237", l: "#587c42", w: "#4a3120", W: "#5f4029" },
  rows: [
    ".......kk.......",
    "......kllk......",
    "......klGlk.....",
    ".....kGGGGGk....",
    ".....kGgGgGk....",
    "....klllllllk...",
    "....klGGGGGlk...",
    "...kGGgGGgGGGk..",
    "...kGllGGllGk...",
    "..klllllllllGk..",
    "..klGGGGGGGlk...",
    ".kGGgGGGGGgGGk..",
    ".kGllllllllGgk..",
    "kGGGGGGGGGGGGGk.",
    "kgGGGGGGGGGGGgk.",
    "....kWwWWwWk....",
    "....kWwWWwWk....",
    "....kWwWWwWk....",
    "....kWwWWwWk....",
    "....kwwwwwk.....",
    "...kkkkkkkkk....",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
};

export const ROUND_TREE: Sprite = {
  w: 16,
  h: 28,
  pal: { k: "#16220f", g: "#39602f", G: "#4d7a3b", l: "#6d9a4b", w: "#4a3120", W: "#63432a" },
  rows: [
    "....kkkkkkkk....",
    "...kgGGGGGGgk...",
    "..kGGllGGGGGGk..",
    ".kGlGGGllGGGGGk.",
    ".kGGGgGGGGGllGk.",
    "kGGlGGggGGGGGGGk",
    "kGggGGllllGGggGk",
    "kGGGGGllGGGGlGGk",
    ".kGlgGGGGGgGlGk.",
    ".kGGllGGGGGGlGk.",
    "..kGGGllGGGGGk..",
    "...kgGGGGGggk...",
    "....kkGGGGkk....",
    "......kwWk......",
    "......kwWk......",
    "......kwWk......",
    "......kWwk......",
    "......kWwk......",
    "......kWwk......",
    ".....kkWWkk.....",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
};

export const BUSH: Sprite = {
  w: 16,
  h: 14,
  pal: { k: "#16220f", g: "#39602f", G: "#4d7a3b", l: "#6d9a4b", c: "#d94f5c" },
  rows: [
    "....kkkkkkkk....",
    "..kkGGGGGGGGkk..",
    ".kGGllGGGGllGGk.",
    "kGllGGcGGGGllGGk",
    "kGGGGGGGGGcGGGGk",
    "kGGGllGGGGGGlGGk",
    ".kGGGGllGGGGGGk.",
    ".kgGGGGGGGGGgk..",
    "..kkkgGGGkkkk...",
    "....kkkkkkkk....",
    "................",
    "................",
    "................",
    "................",
  ],
};

export const ROCK: Sprite = {
  w: 16,
  h: 12,
  pal: { k: "#2a2c31", s: "#6b7178", S: "#8b9299", l: "#b6bcc2" },
  rows: [
    "....kkkkkkkk....",
    "..kksssssssskk..",
    ".kssSSSSSSSSSsk.",
    "kssSSllSSSSSSSsk",
    "ksSSllSSSSSSSSSk",
    "kSSSSSSSSSSllSSk",
    "kSSSSSSSSSSSSlSk",
    ".kkSSSSSSSSSSkk.",
    "..kkkkkkkkkkkk..",
    "................",
    "................",
    "................",
  ],
};

export const STUMP: Sprite = {
  w: 16,
  h: 16,
  pal: { k: "#241408", w: "#6b4728", W: "#8a6038", r: "#c39a63", m: "#3f6d3a" },
  rows: [
    "................",
    "....kkkkkkkk....",
    "...kmmrrrrrrk...",
    "..kmWwwwwwWrk...",
    "..kmWwrrrWwrk...",
    "..krWwrkrrWwrk..",
    "..krWwrkrrWwrk..",
    "..krWwrrrWwrk...",
    "..krWwwwwwWrk...",
    "...krrrrrrrrk...",
    "..kWwWwWwWwWk...",
    "..kkkkkkkkkkk...",
    "................",
    "................",
    "................",
    "................",
  ],
};

export const SEED_STALL: Sprite = {
  w: 16,
  h: 32,
  pal: {
    k: "#221410",
    c: "#c4574b",
    C: "#e0796a",
    l: "#f4d9b8",
    w: "#6b4728",
    W: "#8a6038",
    g: "#d9a441",
    y: "#ffe08a",
    p: "#7d5c3a",
  },
  rows: [
    "....kkkkkkkk....",
    "..kkcccccccckk..",
    ".kCCCllllllCCCk.",
    "kCClllCClllCClck",
    "kClllllllllllCck",
    "kCllCCllllCCllck",
    "kkClllllllllCkkk",
    ".kkCCCCCCCCCkk..",
    "kkkkkkkkkkkkkkkk",
    "..kgggggggggggk.",
    "..kgwwwwwwwwwgk.",
    "..kgwpppppppwgk.",
    "..kgwpyyyypwggk.",
    "..kgwwwwwwwwwgk.",
    "..kgggggggggggk.",
    "..kkkkkkkkkkkkk.",
    "...kwWk...kwWk..",
    "...kwWk...kwWk..",
    "...kwWk...kwWk..",
    "...kwWk...kwWk..",
    "...kwWk...kwWk..",
    "...kwWk...kwWk..",
    "..kkkWkkkkkWkk..",
    "..kpppppppppppk.",
    "..kpWWWpWWWpWpk.",
    "..kpWcWpWWWpWpk.",
    "..kpWWWpWgWpWpk.",
    "..kpppppppppppk.",
    "..kkkkkkkkkkkkk.",
    "................",
    "................",
    "................",
  ],
};

export const FENCE: Sprite = {
  w: 16,
  h: 16,
  pal: { k: "#2f2013", w: "#8a6a42", W: "#a5814f" },
  rows: [
    "..kk......kk....",
    ".kWwk....kWwk...",
    ".kWWk....kWWk...",
    ".kWWkkkkkkkWWk..",
    ".kWWwWWWWWWwWWk.",
    ".kWWk....kWWk...",
    ".kWWk....kWWk...",
    ".kWWkkkkkkkWWk..",
    ".kWWwWWWWWWwWWk.",
    ".kWWk....kWWk...",
    ".kWWk....kWWk...",
    ".kWwk....kWwk...",
    "..kk......kk....",
    "................",
    "................",
    "................",
  ],
};

export const SIGNPOST: Sprite = {
  w: 16,
  h: 20,
  pal: { k: "#2f2013", w: "#8a6a42", W: "#a5814f", s: "#e6d3a3" },
  rows: [
    "................",
    "................",
    "................",
    "................",
    "..kkkkkkkkkkkk..",
    "..kWssssssswWk..",
    "..kssssssssssk..",
    "..kWssssssswWk..",
    "..kkkkkkkkkkkk..",
    ".......kwk......",
    ".......kwk......",
    ".......kWk......",
    ".......kwk......",
    ".......kwk......",
    ".......kwk......",
    ".......kwk......",
    "......kkwkk.....",
    "................",
    "................",
    "................",
  ],
};

/** Rect-command builder: keeps tool/UI icons pixel-exact without hand-counting rows. */
function rects(
  w: number,
  h: number,
  ops: [number, number, number, number, string][],
  force?: Record<string, string>,
): Sprite {
  const pal: Record<string, string> = { ...(force ?? {}) };
  const taken = new Set(Object.keys(pal));
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  let cursor = 0;
  const freeChar = (): string => {
    while (taken.has(alphabet[cursor])) cursor++;
    const ch = alphabet[cursor++];
    if (!ch) throw new Error("ran out of palette chars");
    taken.add(ch);
    return ch;
  };
  const grid: string[][] = Array.from({ length: h }, () => Array.from({ length: w }, () => "."));
  for (const [x, y, rw, rh, color] of ops) {
    const ch = Object.keys(pal).find((k) => pal[k] === color) ?? freeChar();
    pal[ch] = color;
    for (let j = y; j < y + rh; j++) {
      for (let i = x; i < x + rw; i++) {
        if (grid[j] && i >= 0 && i < w) grid[j][i] = ch;
      }
    }
  }
  return { w, h, rows: grid.map((r) => r.join("")), pal };
}

const WOOD = "#8a6a42";
const WOOD_D = "#5b3b23";
const STEEL = "#b6bcc2";
const STEEL_D = "#6b7178";

export const HOE = rects(16, 16, [
  [11, 1, 5, 1, STEEL_D],
  [11, 2, 4, 1, STEEL],
  [10, 3, 3, 1, STEEL],
  [9, 4, 2, 2, STEEL_D],
  [8, 6, 2, 1, WOOD_D],
  [7, 7, 2, 1, WOOD],
  [6, 8, 2, 1, WOOD_D],
  [5, 9, 2, 1, WOOD],
  [4, 10, 2, 1, WOOD_D],
  [3, 11, 2, 1, WOOD],
  [2, 12, 2, 1, WOOD_D],
  [1, 13, 2, 2, WOOD],
]);

export const WATERING_CAN = rects(16, 16, [
  [3, 6, 8, 7, "#3f7a8c"],
  [4, 7, 6, 2, "#5f9aab"],
  [3, 12, 8, 1, "#2b5766"],
  [4, 2, 6, 1, "#2b5766"],
  [4, 3, 1, 3, "#2b5766"],
  [9, 3, 1, 3, "#2b5766"],
  [11, 7, 3, 1, "#3f7a8c"],
  [13, 5, 2, 2, "#5f9aab"],
  [14, 4, 1, 1, "#7fc4d8"],
  [3, 6, 8, 1, "#d9a441"],
]);

export const COIN = rects(8, 8, [
  [2, 0, 4, 1, "#8a6a2f"],
  [1, 1, 6, 5, "#e8bf5e"],
  [2, 2, 3, 3, "#ffe9a8"],
  [2, 6, 4, 1, "#8a6a2f"],
]);

/* ---------- Forest spirits ---------- */

const BOAR = "#6b4728";
const BOAR_LIT = "#8a6038";
const BOAR_DARK = "#3a2415";
const MOSS = "#4e8043";
const MOSS_LIT = "#77ad5c";
const SNOUT = "#b06b6b";
const SHADOW_LINE = "#241408";

/** Moss Boarlet — a piglet chimera with a fern growing out of its back. Faces left. */
export const MOSS_BOAR: Sprite = rects(16, 14, [
  [8, 2, 1, 2, MOSS],
  [7, 3, 1, 1, MOSS_LIT],
  [9, 3, 1, 1, MOSS_LIT],
  [4, 4, 10, 1, MOSS],
  [5, 3, 3, 1, MOSS_LIT],
  [3, 4, 1, 1, "#5a3a22"],
  [1, 5, 3, 4, BOAR_LIT],
  [3, 5, 11, 5, BOAR],
  [4, 5, 9, 2, BOAR_LIT],
  [0, 7, 2, 2, SNOUT],
  [2, 6, 1, 1, SHADOW_LINE],
  [3, 10, 9, 1, SHADOW_LINE],
  [4, 11, 1, 3, BOAR_DARK],
  [7, 11, 1, 3, BOAR_DARK],
  [10, 11, 1, 3, BOAR_DARK],
  [13, 11, 1, 2, BOAR_DARK],
]);

export const MOSS_BOAR_STEP: Sprite = rects(16, 14, [
  [8, 2, 1, 2, MOSS],
  [7, 3, 1, 1, MOSS_LIT],
  [9, 3, 1, 1, MOSS_LIT],
  [4, 4, 10, 1, MOSS],
  [5, 3, 3, 1, MOSS_LIT],
  [3, 4, 1, 1, "#5a3a22"],
  [1, 5, 3, 4, BOAR_LIT],
  [3, 5, 11, 5, BOAR],
  [4, 5, 9, 2, BOAR_LIT],
  [0, 7, 2, 2, SNOUT],
  [2, 6, 1, 1, SHADOW_LINE],
  [3, 10, 9, 1, SHADOW_LINE],
  [5, 11, 1, 3, BOAR_DARK],
  [8, 11, 1, 2, BOAR_DARK],
  [11, 11, 1, 3, BOAR_DARK],
  [13, 11, 1, 1, BOAR_DARK],
]);

const MOTH = "#9fe3d6";
const MOTH_LIT = "#d8fff7";
const MOTH_DARK = "#4f9b8f";
const MOTH_LINE = "#1b3a3a";

/** Glass Moth — a moth whose wings are thin sheets of glazier's fern leaf. */
export const GLASS_MOTH: Sprite = rects(16, 14, [
  [5, 1, 1, 1, MOTH_LINE],
  [6, 2, 1, 1, MOTH_LINE],
  [10, 1, 1, 1, MOTH_LINE],
  [9, 2, 1, 1, MOTH_LINE],
  [1, 3, 6, 6, MOTH],
  [9, 3, 6, 6, MOTH],
  [1, 3, 6, 1, MOTH_LIT],
  [9, 3, 6, 1, MOTH_LIT],
  [1, 8, 6, 1, MOTH_LINE],
  [9, 8, 6, 1, MOTH_LINE],
  [1, 4, 1, 4, MOTH_LINE],
  [14, 4, 1, 4, MOTH_LINE],
  [3, 5, 1, 3, MOTH_DARK],
  [12, 5, 1, 3, MOTH_DARK],
  [7, 4, 2, 6, MOTH_DARK],
  [7, 4, 1, 4, MOTH],
  [7, 3, 1, 1, MOTH_LIT],
  [8, 3, 1, 1, MOTH_LIT],
]);

export const GLASS_MOTH_W: Sprite = rects(16, 14, [
  [5, 2, 1, 1, MOTH_LINE],
  [6, 3, 1, 1, MOTH_LINE],
  [10, 2, 1, 1, MOTH_LINE],
  [9, 3, 1, 1, MOTH_LINE],
  [1, 5, 6, 5, MOTH],
  [9, 5, 6, 5, MOTH],
  [1, 5, 6, 1, MOTH_LIT],
  [9, 5, 6, 1, MOTH_LIT],
  [1, 9, 6, 1, MOTH_LINE],
  [9, 9, 6, 1, MOTH_LINE],
  [1, 6, 1, 3, MOTH_LINE],
  [14, 6, 1, 3, MOTH_LINE],
  [3, 7, 1, 2, MOTH_DARK],
  [12, 7, 1, 2, MOTH_DARK],
  [7, 4, 2, 6, MOTH_DARK],
  [7, 4, 1, 4, MOTH],
  [7, 3, 1, 1, MOTH_LIT],
  [8, 3, 1, 1, MOTH_LIT],
]);

const ASH = "#8b9299";
const ASH_LIT = "#b6bcc2";
const ASH_DARK = "#6b7178";
const ASH_LINE = "#2a2c31";
const EMBER = "#e0603a";
const EMBER_LIT = "#ffc45e";

/** Ash Fox — a fox of cold coals; its tail still remembers the fire. Faces left. */
export const ASH_FOX: Sprite = rects(16, 14, [
  [10, 4, 5, 3, EMBER],
  [14, 4, 2, 2, EMBER_LIT],
  [2, 3, 1, 2, ASH_DARK],
  [4, 3, 1, 1, ASH_DARK],
  [1, 4, 4, 4, ASH],
  [4, 5, 8, 4, ASH],
  [5, 5, 6, 2, ASH_LIT],
  [0, 6, 2, 2, ASH_LIT],
  [2, 5, 1, 1, EMBER_LIT],
  [4, 9, 8, 1, ASH_LINE],
  [5, 10, 1, 3, ASH_DARK],
  [8, 10, 1, 3, ASH_DARK],
  [11, 10, 1, 2, ASH_DARK],
]);

export const ASH_FOX_STEP: Sprite = rects(16, 14, [
  [10, 3, 5, 3, EMBER],
  [14, 3, 2, 2, EMBER_LIT],
  [2, 3, 1, 2, ASH_DARK],
  [4, 3, 1, 1, ASH_DARK],
  [1, 4, 4, 4, ASH],
  [4, 5, 8, 4, ASH],
  [5, 5, 6, 2, ASH_LIT],
  [0, 6, 2, 2, ASH_LIT],
  [2, 5, 1, 1, EMBER_LIT],
  [4, 9, 8, 1, ASH_LINE],
  [6, 10, 1, 3, ASH_DARK],
  [9, 10, 1, 2, ASH_DARK],
  [11, 10, 1, 3, ASH_DARK],
]);

const STONE = "#6b7178";
const STONE_LIT = "#8b9299";
const STONE_DARK = "#2a2c31";
const RUNE = "#8f6fd6";
const RUNE_LIT = "#e3d1ff";

/** Spirit dolmen: the grove's three spirits sleep under this cap. */
export const SHRINE: Sprite = rects(16, 24, [
  [2, 5, 4, 1, MOSS],
  [9, 5, 5, 1, MOSS],
  [3, 4, 2, 1, MOSS_LIT],
  [1, 6, 14, 4, STONE],
  [2, 6, 12, 1, STONE_LIT],
  [1, 9, 14, 1, STONE_DARK],
  [3, 10, 3, 10, STONE],
  [10, 10, 3, 10, STONE],
  [3, 10, 1, 10, STONE_LIT],
  [10, 10, 1, 10, STONE_LIT],
  [7, 11, 2, 4, RUNE],
  [7, 12, 1, 2, RUNE_LIT],
  [2, 20, 12, 3, STONE],
  [3, 19, 10, 1, STONE_LIT],
  [2, 22, 12, 1, STONE_DARK],
]);


