import type { SheetName, TileRef } from "../core/sheets";
import type { BiomeId } from "./world";

/** One surface: a sheet and the full-coverage cells it may be cut from. */
export type Material = { sheet: SheetName; refs: TileRef[] };

/**
 * Which 16×16 cells of the Pixel Crawler sheets each surface of the grove
 * is made of. Every entry is a full-coverage cell: nothing here is a
 * transparent autotile fragment, so a tile can be blitted as-is.
 */
export const MAT = {
  meadow: { sheet: "floors", refs: [[1, 10], [2, 10], [3, 10]] },
  deepgrass: { sheet: "floors", refs: [[1, 11], [2, 11], [3, 11]] },
  mud: { sheet: "floors", refs: [[11, 11], [12, 11], [13, 11]] },
  clay: { sheet: "floors", refs: [[11, 10], [12, 10], [13, 10]] },
  rock: { sheet: "floors", refs: [[6, 10], [7, 10], [8, 10]] },
  slate: { sheet: "floors", refs: [[6, 11], [7, 11], [8, 11]] },
  cobble: { sheet: "floors", refs: [[15, 1], [16, 1], [17, 1], [18, 1], [19, 1]] },

  water: { sheet: "water", refs: [[1, 5], [2, 5], [3, 5]] },
  waterRipple: { sheet: "water", refs: [[1, 6], [2, 6], [3, 6]] },

  /* The pack draws a wall's bright cap and foot inside the neighbouring cell,
     so only the plain middle rows may be tiled: otherwise every 16 pixels the
     cave gets a stripe. */
  caveWall: { sheet: "dungeon", refs: [[0, 1], [1, 1], [2, 1]] },
  caveFloor: {
    sheet: "dungeon",
    refs: [[0, 11], [1, 11], [0, 12], [1, 12], [3, 5], [4, 5]],
  },
  caveMoss: {
    sheet: "dungeon",
    refs: [[5, 1], [6, 1], [7, 1], [5, 2], [6, 2], [7, 2]],
  },

  flower: { sheet: "vegetation", refs: [[4, 24], [6, 24], [8, 24], [10, 24]] },
  sprout: { sheet: "vegetation", refs: [[1, 4], [2, 4], [3, 4]] },
  bush: { sheet: "vegetation", refs: [[0, 2], [1, 2], [2, 2], [3, 2]] },
} satisfies Record<string, Material>;

/**
 * Biome character survives the switch to real tiles: each biome is a blend of
 * two materials, and the same noise field that used to pick the shade picks
 * which material a tile is made of.
 */
const BLEND: Record<BiomeId, [Material, Material, number]> = {
  home: [MAT.meadow, MAT.deepgrass, 0.74],
  thicket: [MAT.deepgrass, MAT.meadow, 0.22],
  marsh: [MAT.deepgrass, MAT.mud, 0.52],
  ridge: [MAT.rock, MAT.slate, 0.58],
  ruins: [MAT.cobble, MAT.slate, 0.46],
};

export function surfaceFor(biome: BiomeId, noise: number): Material {
  const [main, alt, split] = BLEND[biome];
  return noise < split ? main : alt;
}
