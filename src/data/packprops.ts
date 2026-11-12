import type { PackClip, PackRect } from "../core/sheets";
import type { ObjectKind } from "./world";

/**
 * Scenery from the Pixel Crawler pack. The pack scatters its props across
 * sheets by eye, so every entry here names the exact pixel rectangle and how
 * the cut-out sits on its tile. Anything missing keeps the hand-drawn fallback
 * in art.ts, so a cold cache still grows a grove.
 */
export type PropArt = {
  /** path under art/pack/ */
  src: string;
  rect: PackRect;
  /** horizontal nudge from the tile centre, in pixels */
  dx?: number;
  /** positive sinks the base into the ground */
  dy?: number;
  /** shadow radius under the base */
  shadow?: number;
  /** integer upscale for stonework that reads small at a 16-pixel tile */
  scale?: number;
};

const VEG = "environment/props/static/Vegetation.png";
const ROCK = "environment/props/static/Rocks.png";
const RES = "environment/props/static/Resources.png";
const FARM = "environment/props/static/Farm.png";
const DUNG = "environment/props/static/Dungeon_Props.png";
const TREE1 = "environment/props/static/trees/model_01/Size_02.png";
const TREE2 = "environment/props/static/trees/model_02/Size_02.png";
const TREE3 = "environment/props/static/trees/model_03/Size_02.png";

const art = (
  src: string,
  rect: PackRect,
  extra: Omit<PropArt, "src" | "rect"> = {},
): PropArt => ({ src, rect, ...extra });

/** Four seasonal broadleaves share one row: spring, summer, autumn, ember. */
const broadleaves: PropArt[] = [
  art(TREE1, [32, 2, 32, 62]),
  art(TREE1, [96, 2, 32, 62]),
  art(TREE1, [32, 66, 32, 62]),
  art(TREE1, [96, 66, 32, 62]),
];

const conifers: PropArt[] = [
  art(TREE2, [3, 1, 45, 47]),
  art(TREE2, [67, 1, 45, 47]),
  art(TREE2, [3, 49, 45, 47]),
  art(TREE2, [67, 49, 45, 47]),
];

const bushes: PropArt[] = [
  art(VEG, [2, 5, 29, 27], { shadow: 7 }),
  art(VEG, [50, 5, 29, 27], { shadow: 7 }),
  art(VEG, [98, 5, 29, 27], { shadow: 7 }),
  art(VEG, [146, 5, 29, 27], { shadow: 7 }),
  art(VEG, [2, 99, 43, 43], { shadow: 9 }),
  art(VEG, [50, 99, 43, 43], { shadow: 9 }),
  art(VEG, [98, 99, 43, 43], { shadow: 9 }),
  art(VEG, [146, 99, 43, 43], { shadow: 9 }),
];

/** A grove is mostly what grows in it; the renderer picks a variant per tile. */
export const PROP_ART: Partial<Record<ObjectKind, PropArt[]>> = {
  pine: conifers,
  round_tree: [
    ...broadleaves,
    art(TREE3, [0, 5, 30, 75]),
    art(TREE3, [64, 5, 30, 75]),
  ],
  swamp_tree: [
    art(TREE3, [0, 85, 30, 75]),
    art(TREE3, [64, 85, 30, 75]),
    art(TREE3, [0, 5, 30, 75]),
  ],
  dead_tree: [art(TREE1, [161, 17, 26, 47]), art(TREE1, [225, 18, 26, 46])],
  bush: bushes,
  rock: [
    art(ROCK, [35, 19, 26, 27], { shadow: 7 }),
    art(ROCK, [131, 19, 26, 27], { shadow: 7 }),
    art(ROCK, [35, 115, 26, 27], { shadow: 7 }),
  ],
  stump: [
    art(RES, [16, 85, 32, 6], { shadow: 7 }),
    art(RES, [32, 68, 32, 7], { shadow: 7 }),
    art(RES, [5, 80, 6, 32], { shadow: 5 }),
  ],
  stall: [art(FARM, [128, 71, 48, 25], { shadow: 9 })],
  shrine: [
    art(DUNG, [113, 2, 14, 20], { shadow: 8, scale: 2 }),
    art(DUNG, [129, 2, 14, 20], { shadow: 8, scale: 2 }),
  ],
  reed: [
    art(VEG, [195, 161, 11, 31]),
    art(VEG, [212, 165, 9, 27]),
    art(VEG, [229, 176, 8, 16]),
  ],
  mushroom: [
    art(VEG, [49, 338, 14, 14], { shadow: 4 }),
    art(VEG, [113, 338, 13, 9], { shadow: 4 }),
    art(VEG, [36, 340, 8, 9], { shadow: 3 }),
  ],
  pillar: [
    art(DUNG, [97, 1, 14, 21], { shadow: 7, scale: 2 }),
    art(DUNG, [129, 2, 14, 20], { shadow: 7, scale: 2 }),
    art(DUNG, [113, 2, 14, 20], { shadow: 7, scale: 2 }),
  ],
  crystal: [
    art(ROCK, [146, 279, 12, 25], { shadow: 5 }),
    art(ROCK, [179, 289, 10, 15], { shadow: 5 }),
    art(ROCK, [164, 289, 8, 15], { shadow: 4 }),
  ],
  scree: [
    art(ROCK, [48, 51, 15, 10], { shadow: 5 }),
    art(ROCK, [144, 51, 15, 10], { shadow: 5 }),
    art(ROCK, [35, 53, 10, 7], { shadow: 4 }),
  ],
  rockfall: [
    art(ROCK, [2, 19, 28, 43], { shadow: 10, dy: 2 }),
    art(ROCK, [98, 19, 28, 43], { shadow: 10, dy: 2 }),
    art(ROCK, [2, 115, 28, 43], { shadow: 10, dy: 2 }),
  ],
  rubble: [
    art(ROCK, [65, 19, 14, 11], { shadow: 4 }),
    art(ROCK, [161, 19, 14, 11], { shadow: 4 }),
    art(ROCK, [48, 51, 15, 10], { shadow: 5 }),
  ],
};

/* ------------------------------------------------------------------ */
/* Stations, village and boss dressing                                 */
/* ------------------------------------------------------------------ */

const BONFIRE = "environment/structures/stations/bonfire";
const ALCH = "environment/structures/stations/alchemy";
const BUILD = "environment/structures/buildings";

/** The stone ring, four flickering frames. */
export const BONFIRE_CLIP: PackClip = {
  src: `${BONFIRE}/Bonfire_01.png`,
  cell: 32,
  frames: 4,
};

/** The flame itself, drawn above the ring and one frame out of step. */
export const FIRE_CLIP: PackClip = {
  src: `${BONFIRE}/Fire_01.png`,
  cell: 32,
  cellH: 48,
  frames: 4,
};

/** The brewing bench: 33 frames of glass, bubbles and steam. */
export const ALCHEMY_CLIP: PackClip = {
  src: `${ALCH}/Alchemy_Table_01.png`,
  cell: 64,
  frames: 33,
  box: [0, 16, 64, 48],
};

export const STATION_CLIPS: PackClip[] = [BONFIRE_CLIP, FIRE_CLIP, ALCHEMY_CLIP];

/** The scythe she carries: short haft, long blade, cut from the weapon sheet. */
export const SCYTHE_ART: PropArt = art("weapons/wood/Wood.png", [32, 49, 16, 31]);

/** A cottage is a wall, a gable roof, a door and a window, stacked by pixels. */
export const COTTAGE = {
  wall: art(`${BUILD}/Walls.png`, [0, 184, 96, 56]),
  roof: art(`${BUILD}/Roofs.png`, [272, 87, 96, 100]),
  door: art(`${BUILD}/Props.png`, [32, 20, 32, 56]),
  window: art(`${BUILD}/Props.png`, [145, 128, 30, 32]),
} as const;

export const BANNERS: PropArt[] = [
  art(DUNG, [67, 70, 10, 21], { scale: 2, shadow: 3 }),
  art(DUNG, [83, 70, 10, 21], { scale: 2, shadow: 3 }),
  art(DUNG, [99, 70, 10, 21], { scale: 2, shadow: 3 }),
];

export const BRAZIERS: PropArt[] = [
  art(DUNG, [19, 42, 10, 22], { scale: 2, shadow: 6 }),
  art(DUNG, [35, 44, 10, 20], { scale: 2, shadow: 6 }),
  art(DUNG, [51, 49, 10, 18], { scale: 2, shadow: 6 }),
];

/** Every static sheet the game means to cut, so boot can warm them together. */
export const PACK_PROP_SOURCES: string[] = (() => {
  const srcs = new Set<string>();
  for (const list of Object.values(PROP_ART))
    for (const a of list ?? []) srcs.add(a.src);
  srcs.add(SCYTHE_ART.src);
  for (const a of [COTTAGE.wall, COTTAGE.roof, COTTAGE.door, COTTAGE.window])
    srcs.add(a.src);
  for (const a of [...BANNERS, ...BRAZIERS]) srcs.add(a.src);
  return [...srcs];
})();
