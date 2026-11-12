import type { PackClip } from "../core/sheets";
import type { EnemyId } from "./enemies";
import { VILLAGER_CLIPS } from "./villagers";

/**
 * The moving parts of the grove come out of the Pixel Crawler pack, which
 * draws every creature inside a square cell with generous air around it.
 * A `box` is the part of that cell the sprite really fills, so a frame can be
 * cut to the same 32×32 for every clip: feet on the bottom edge, body in the
 * middle. That is what lets the renderer keep its old shadows and y-sort.
 */
export const CELL = 32;

/** The four ways the pack draws a body: three rows, and left is a mirrored right. */
export type Face = "down" | "side" | "up";

const FOLDER = { down: "Down", side: "Side", up: "Up" } as const;

/** Alchemist clips: the pack's own body_a, 64-pixel cells, body at x16..47, y16..47. */
function body(anim: string, face: Face, frames: number): PackClip {
  const base = anim.toLowerCase();
  return {
    src: `entities/characters/body_a/animations/${base}_base/${anim}_${FOLDER[face]}.png`,
    cell: 64,
    frames,
    box: [16, 16, CELL, CELL],
  };
}

export type PlayerSet = {
  idle: PackClip;
  walk: PackClip;
  run: PackClip;
  hit: PackClip;
};

export const PLAYER_CLIPS: Record<Face, PlayerSet> = {
  down: {
    idle: body("Idle", "down", 4),
    walk: body("Walk", "down", 6),
    run: body("Run", "down", 6),
    hit: body("Hit", "down", 4),
  },
  side: {
    idle: body("Idle", "side", 4),
    walk: body("Walk", "side", 6),
    run: body("Run", "side", 6),
    hit: body("Hit", "side", 4),
  },
  up: {
    idle: body("Idle", "up", 4),
    walk: body("Walk", "up", 6),
    run: body("Run", "up", 6),
    hit: body("Hit", "up", 4),
  },
};

/** A crew is one species of the pack: four breathing frames, six moving ones,
 *  and the fall it plays when the sickle is done with it. */
export type Crew = { idle: PackClip; run: PackClip; death: PackClip };

/** Death strips are framed by the artist per body, so each one names its own grid. */
type DeathGrid = { cell: number; cellH?: number; frames: number };

function crew(root: string, death: DeathGrid): Crew {
  // The pack keeps a mob's boots on the bottom edge of its cell and its body
  // in the middle, in both strips, so a whole cell is already an anchored frame.
  return {
    idle: { src: `${root}/idle/Idle.png`, cell: 32, frames: 4 },
    run: { src: `${root}/run/Run.png`, cell: 64, frames: 6 },
    death: { src: `${root}/death/Death.png`, ...death },
  };
}

/**
 * Who wears whose face. The free pack has humanoids only, so each chimera
 * takes the crew whose shape and size matches how it behaves.
 */
export const ENEMY_CREWS: Record<EnemyId, Crew> = {
  wisp: crew("entities/npcs/wizzard", { cell: 64, cellH: 32, frames: 6 }),
  marsh_husk: crew("entities/mobs/skeleton_crew/skeleton_base", {
    cell: 96,
    cellH: 64,
    frames: 8,
  }),
  ridge_stalker: crew("entities/mobs/orc_crew/orc_rogue", {
    cell: 64,
    frames: 6,
  }),
  bog_orc: crew("entities/mobs/orc_crew/orc", { cell: 64, frames: 6 }),
  ridge_reaver: crew("entities/mobs/orc_crew/orc_warrior", {
    cell: 96,
    cellH: 80,
    frames: 6,
  }),
  bone_chanter: crew("entities/mobs/skeleton_crew/skeleton_mage", {
    cell: 64,
    frames: 6,
  }),
  root_crawler: crew("entities/mobs/skeleton_crew/skeleton_rogue", {
    cell: 64,
    frames: 6,
  }),
  spore_bloat: crew("entities/mobs/orc_crew/orc_shaman", {
    cell: 64,
    frames: 7,
  }),
  crypt_warden: crew("entities/mobs/skeleton_crew/skeleton_warrior", {
    cell: 64,
    cellH: 48,
    frames: 6,
  }),
};

/** The crown of Серце Мережі is a war-chief of the pack, drawn twice as large. */
export const BOSS_CREW = crew("entities/mobs/orc_crew/orc_warrior", {
  cell: 96,
  cellH: 80,
  frames: 6,
});
export const BOSS_SCALE = 2;

export const FPS = {
  idle: 5,
  walk: 9,
  run: 12,
  hit: 20,
  crewIdle: 4,
  crewRun: 10,
} as const;

/** Everything the game means to play, asked for together with the tile sheets. */
export const PACK_CLIPS: PackClip[] = (() => {
  const all: PackClip[] = [];
  for (const set of Object.values(PLAYER_CLIPS)) all.push(...Object.values(set));
  for (const c of [...Object.values(ENEMY_CREWS), BOSS_CREW])
    all.push(c.idle, c.run);
  all.push(...VILLAGER_CLIPS);
  const seen = new Set<string>();
  return all.filter((clip) => {
    if (seen.has(clip.src)) return false;
    seen.add(clip.src);
    return true;
  });
})();

/**
 * The falls, kept apart from the living strips: the artist framed every death
 * differently, so these are checked by presence and grid rather than by the
 * boot-line rules the walking cycles obey.
 */
export const DEATH_CLIPS: PackClip[] = (() => {
  const all = [
    ...Object.values(ENEMY_CREWS).map((c) => c.death),
    BOSS_CREW.death,
  ];
  const seen = new Set<string>();
  return all.filter((clip) => {
    if (seen.has(clip.src)) return false;
    seen.add(clip.src);
    return true;
  });
})();
