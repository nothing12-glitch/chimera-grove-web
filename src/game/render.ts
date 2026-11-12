import {
  buildSprite,
  buildTinted,
  flipX,
  silhouette,
  type Sprite,
} from "../core/sprites";
import {
  ALCHEMY_TABLE,
  BOG_ORC,
  BONE_CHANTER,
  BUSH,
  CACHE,
  CACHE_OPEN,
  CAVE_CAP,
  CAVE_DEBRIS,
  CRYPT_WARDEN,
  CRYSTAL,
  DEAD_TREE,
  DEEP_WELL,
  FENCE,
  FLASK,
  GRASS_TUFT,
  MARSH_HUSK,
  MUSHROOM,
  MYCEL_NODE,
  MYCEL_SPENT,
  PILLAR,
  PINE,
  PLAYER_DOWN,
  PLAYER_DOWN_WALK,
  PLAYER_SIDE,
  PLAYER_UP,
  REED,
  RIDGE_REAVER,
  RIDGE_STALKER,
  ROCK,
  ROCKFALL,
  ROOT_CRAWLER,
  ROOT_LORD,
  ROUND_TREE,
  RUBBLE,
  SCREE,
  SEED_STALL,
  SHAFT_UP,
  SHRINE,
  SIGNPOST,
  SINKHOLE,
  SPORE_BLOAT,
  SWING_0,
  SWING_1,
  SWING_2,
  STUMP,
  SWAMP_TREE,
  TILLED,
  TILLED_WET_PAL,
  WATER_0,
  WATER_1,
  WILD_FLOWER,
  WISP,
} from "../data/art";
import { CROPS } from "../data/crops";
import {
  ENEMIES,
  HURT_LOCK,
  HP_MAX,
  type EnemyId,
} from "../data/enemies";
import { SPIRITS, type SpiritDef } from "../data/spirits";
import { VILLAGERS } from "../data/villagers";
import { MAT, surfaceFor } from "../data/tiles";
import { packFrame, packRect, tileSome } from "../core/sheets";
import {
  ALCHEMY_CLIP,
  BANNERS,
  BONFIRE_CLIP,
  BRAZIERS,
  COTTAGE,
  FIRE_CLIP,
  PROP_ART,
  SCYTHE_ART,
  type PropArt,
} from "../data/packprops";
import {
  BOSS_CREW,
  BOSS_SCALE,
  ENEMY_CREWS,
  FPS,
  PLAYER_CLIPS,
  type Face,
} from "../data/pack";
import {
  CAVE_H,
  CAVE_W,
  MAX_LAYER,
  caveIdx,
  inCave,
  type Cave,
  type PropKind,
} from "../data/roots";
import {
  MAP_H,
  MAP_W,
  TILE,
  biomeAt,
  idx,
  objectAt,
  tileAt,
  type BiomeId,
  type World,
} from "../data/world";
import { DAY_LENGTH, type Game } from "./state";
import { DEATH_TIME, facingPoint, type Boss, type Combat, type Enemy } from "./enemies";
import { glowRadius, tideRatio, type RootsRun } from "./roots";
import type { Spirit } from "./spirits";
import type { Villager } from "./villagers";
import { stageOf, type FX } from "./systems";

export const VIEW_W = 320;
export const VIEW_H = 180;

const EARTH_PAL = {
  r: "#4a3120",
  e: "#6b4728",
  s: "#8a6038",
  c: "#ffffff",
  d: "#ffffff",
};

/** Ground colours per biome: stone and old mortar get no green at all. */
type GroundPal = {
  tones: [string, string, string];
  dabA: string;
  dabB: string;
  path: string;
  pathA: string;
  pathB: string;
  shore: string;
  scatter: "green" | "grey" | "dead";
};

const GROUND: Record<BiomeId, GroundPal> = {
  home: {
    tones: ["#33532c", "#35562e", "#385a30"],
    dabA: "#47733f",
    dabB: "#284222",
    path: "#6d5236",
    pathA: "#87663f",
    pathB: "#5b4227",
    shore: "#22404c",
    scatter: "green",
  },
  thicket: {
    tones: ["#1f3a24", "#22402a", "#26462e"],
    dabA: "#35613b",
    dabB: "#142519",
    path: "#5a452e",
    pathA: "#715a3a",
    pathB: "#45341f",
    shore: "#1b3540",
    scatter: "green",
  },
  marsh: {
    tones: ["#2c4033", "#33473a", "#3a4f40"],
    dabA: "#55764f",
    dabB: "#1c2b24",
    path: "#4e4c30",
    pathA: "#6b6842",
    pathB: "#37361f",
    shore: "#1f4340",
    scatter: "green",
  },
  ridge: {
    tones: ["#3a3d44", "#42464d", "#4a4f57"],
    dabA: "#5c626d",
    dabB: "#262a30",
    path: "#5a5e66",
    pathA: "#767b85",
    pathB: "#3d4046",
    shore: "#1d3138",
    scatter: "grey",
  },
  ruins: {
    tones: ["#3c3b33", "#43423a", "#4a4940"],
    dabA: "#5f6a4c",
    dabB: "#26261f",
    path: "#5c5847",
    pathA: "#78725c",
    pathB: "#3f3c2f",
    shore: "#21363c",
    scatter: "dead",
  },
};

export function spriteFor(kind: string): HTMLCanvasElement {
  switch (kind) {
    case "pine":
      return buildSprite("pine", PINE);
    case "round_tree":
      return buildSprite("round_tree", ROUND_TREE);
    case "bush":
      return buildSprite("bush", BUSH);
    case "rock":
      return buildSprite("rock", ROCK);
    case "stump":
      return buildSprite("stump", STUMP);
    case "stall":
      return buildSprite("stall", SEED_STALL);
    case "sign":
      return buildSprite("sign", SIGNPOST);
    case "fence":
      return buildSprite("fence", FENCE);
    case "shrine":
      return buildSprite("shrine", SHRINE);
    case "sinkhole":
      return buildSprite("sinkhole", SINKHOLE);
    case "table":
      return buildSprite("table", ALCHEMY_TABLE);
    case "reed":
      return buildSprite("reed", REED);
    case "swamp_tree":
      return buildSprite("swamp_tree", SWAMP_TREE);
    case "mushroom":
      return buildSprite("mushroom", MUSHROOM);
    case "dead_tree":
      return buildSprite("dead_tree", DEAD_TREE);
    case "pillar":
      return buildSprite("pillar", PILLAR);
    case "crystal":
      return buildSprite("crystal", CRYSTAL);
    case "scree":
      return buildSprite("scree", SCREE);
    case "rockfall":
      return buildSprite("rockfall", ROCKFALL);
    case "rubble":
      return buildSprite("rubble", RUBBLE);
    case "cache":
      return buildSprite("cache", CACHE);
    case "cache_open":
      return buildSprite("cache_open", CACHE_OPEN);
    default:
      return buildSprite("tuft", GRASS_TUFT);
  }
}

/** A flask of brew, repainted with the potion's own liquid colour. */
export function flaskSprite(color: string): HTMLCanvasElement {
  return buildTinted(`flask_${color}`, FLASK, { ...FLASK.pal, l: color });
}

const OBJ_ANCHOR: Record<string, { oy: number; base: number }> = {
  pine: { oy: -16, base: 16 },
  round_tree: { oy: -12, base: 16 },
  stall: { oy: -16, base: 16 },
  sign: { oy: -4, base: 20 },
  bush: { oy: 4, base: 16 },
  rock: { oy: 6, base: 16 },
  stump: { oy: 2, base: 16 },
  fence: { oy: 0, base: 16 },
  shrine: { oy: -8, base: 16 },
  table: { oy: -4, base: 20 },
  reed: { oy: -6, base: 16 },
  swamp_tree: { oy: -14, base: 16 },
  mushroom: { oy: 2, base: 16 },
  dead_tree: { oy: -12, base: 16 },
  pillar: { oy: -10, base: 16 },
  crystal: { oy: -2, base: 16 },
  scree: { oy: 6, base: 16 },
  rockfall: { oy: -10, base: 16 },
  rubble: { oy: 4, base: 16 },
  cache: { oy: 0, base: 16 },
  cache_open: { oy: 0, base: 16 },
};

/** All nine face right in the art, so only a leftward walk needs a mirror. */
const ENEMY_ART: Record<EnemyId, Sprite> = {
  wisp: WISP,
  marsh_husk: MARSH_HUSK,
  ridge_stalker: RIDGE_STALKER,
  bog_orc: BOG_ORC,
  ridge_reaver: RIDGE_REAVER,
  bone_chanter: BONE_CHANTER,
  root_crawler: ROOT_CRAWLER,
  spore_bloat: SPORE_BLOAT,
  crypt_warden: CRYPT_WARDEN,
};

/** First frame is the wind-up, last is the blade settling. */
const SWING_FRAMES: Sprite[] = [SWING_0, SWING_1, SWING_2];

/** Anything the y-sort can place: trees, spirits, chimeras, the alchemist. */
type SceneItem = { y: number; draw(): void };

export class Renderer {
  private ground: HTMLCanvasElement;
  private view: HTMLCanvasElement;
  private vctx: CanvasRenderingContext2D;
  private dctx: CanvasRenderingContext2D;
  private water: [HTMLCanvasElement, HTMLCanvasElement];
  private soil: [HTMLCanvasElement, HTMLCanvasElement];
  private dark: HTMLCanvasElement;
  private darkCtx: CanvasRenderingContext2D;
  private caveGround: HTMLCanvasElement | null = null;
  private caveKey = "";

  constructor(
    private canvas: HTMLCanvasElement,
    private world: World,
  ) {
    this.ground = this.buildGround();
    this.view = document.createElement("canvas");
    this.view.width = VIEW_W;
    this.view.height = VIEW_H;
    this.vctx = this.view.getContext("2d")!;
    this.vctx.imageSmoothingEnabled = false;
    this.dctx = canvas.getContext("2d")!;
    this.water = [
      buildSprite("water0", WATER_0),
      buildSprite("water1", WATER_1),
    ];
    this.soil = [
      buildSprite("soil", TILLED),
      buildTinted("soil-wet", TILLED, TILLED_WET_PAL),
    ];
    this.dark = document.createElement("canvas");
    this.dark.width = VIEW_W;
    this.dark.height = VIEW_H;
    this.darkCtx = this.dark.getContext("2d")!;
  }

  private buildGround(): HTMLCanvasElement {
    const cvs = document.createElement("canvas");
    cvs.width = MAP_W * TILE;
    cvs.height = MAP_H * TILE;
    const c = cvs.getContext("2d")!;
    const w = this.world;
    // The pack sheets only answer once they have loaded; until then every
    // branch below falls back to the procedural grove.
    const pack = tileSome("floors", MAT.meadow.refs, 0) !== null;
    // Tone field first: smooth noise picks the shade, so patches have curvy edges.
    const tone = new Array<string | undefined>(MAP_W * MAP_H).fill(undefined);
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const kind = tileAt(w, tx, ty);
        if (kind === "water" || kind === "path") continue;
        const pal = GROUND[biomeAt(w, tx, ty)];
        const n = valueNoise(tx, ty, 9);
        tone[ty * MAP_W + tx] = pal.tones[n < 0.44 ? 0 : n < 0.74 ? 1 : 2];
      }
    }
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const kind = tileAt(w, tx, ty);
        const pal = GROUND[biomeAt(w, tx, ty)];
        const x = tx * TILE;
        const y = ty * TILE;
        if (kind === "water") {
          const cut = pack ? tileSome("water", MAT.water.refs, pick(tx, ty)) : null;
          if (cut) c.drawImage(cut, x, y);
          else {
            c.fillStyle = "#123a4e";
            c.fillRect(x, y, TILE, TILE);
          }
          continue;
        }
        const material =
          kind === "path"
            ? MAT.cobble
            : surfaceFor(biomeAt(w, tx, ty), valueNoise(tx, ty, 9));
        const cut = pack ? tileSome(material.sheet, material.refs, pick(tx, ty)) : null;
        if (cut) {
          c.drawImage(cut, x, y);
          continue;
        }
        if (kind === "path") {
          c.fillStyle = pal.path;
          c.fillRect(x, y, TILE, TILE);
          dab(c, tx, ty, pal.pathA, 5, 1);
          dab(c, tx, ty, pal.pathB, 4, 2);
          continue;
        }
        c.fillStyle = tone[ty * MAP_W + tx]!;
        c.fillRect(x, y, TILE, TILE);
        dab(c, tx, ty, pal.dabA, 7, 3);
        dab(c, tx, ty, pal.dabB, 5, 4);
      }
    }
    // Dither a two-pixel fringe wherever two shades meet, so borders never draw a line.
    if (!pack)
      for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const i = ty * MAP_W + tx;
        const here = tone[i];
        if (!here) continue;
        const x = tx * TILE;
        const y = ty * TILE;
        for (const [dx, dy] of EDGE) {
          const nx = tx + dx,
            ny = ty + dy;
          if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
          const there = tone[ny * MAP_W + nx];
          if (!there || there === here) continue;
          c.fillStyle = there;
          for (let k = 0; k < TILE; k += 4) {
            const o = (k + ((tx + ty) % 2) * 2) % TILE;
            if (dx === -1) c.fillRect(x, y + o, 2, 2);
            else if (dx === 1) c.fillRect(x + TILE - 2, y + o, 2, 2);
            else if (dy === -1) c.fillRect(x + o, y, 2, 2);
            else c.fillRect(x + o, y + TILE - 2, 2, 2);
          }
        }
      }
    }
    // Damp shore where land meets open water, so it does not end on a hard edge.
    for (let ty = 1; ty < MAP_H - 1; ty++) {
      for (let tx = 1; tx < MAP_W - 1; tx++) {
        const k = tileAt(w, tx, ty);
        if (k === "water") continue;
        const x = tx * TILE;
        const y = ty * TILE;
        for (const [dx, dy] of EDGE) {
          if (tileAt(w, tx + dx, ty + dy) !== "water") continue;
          c.fillStyle = GROUND[biomeAt(w, tx, ty)].shore;
          if (dy === -1) c.fillRect(x, y, TILE, 2);
          else if (dy === 1) c.fillRect(x, y + TILE - 2, TILE, 2);
          else if (dx === -1) c.fillRect(x, y, 2, TILE);
          else c.fillRect(x + TILE - 2, y, 2, TILE);
        }
      }
    }
    // Decoration pass: what the biome can actually grow, and only where nothing stands.
    const tuft = spriteFor("tuft");
    const flower = buildSprite("flower", WILD_FLOWER);
    const packTuft = tileSome("vegetation", MAT.sprout.refs, 1);
    const packFlower = tileSome("vegetation", MAT.flower.refs, 1);
    for (let ty = 1; ty < MAP_H - 1; ty++) {
      for (let tx = 1; tx < MAP_W - 1; tx++) {
        if (tileAt(w, tx, ty) !== "grass" || objectAt(w, tx, ty)) continue;
        const pal = GROUND[biomeAt(w, tx, ty)];
        const r = hash(tx, ty);
        const x = tx * TILE;
        const y = ty * TILE;
        if (pal.scatter === "green") {
          if (r < 0.06) c.drawImage(packTuft ?? tuft, x, packTuft ? y : y - 2);
          else if (r > 0.94)
            c.drawImage(packFlower ?? flower, x, packFlower ? y : y - 2);
        } else if (pal.scatter === "grey") {
          if (r < 0.09) {
            c.fillStyle = "#6d7480";
            c.fillRect(x + 3 + Math.floor(r * 50), y + 9, 3, 2);
          }
        } else if (r < 0.05) {
          c.fillStyle = "#55492f";
          c.fillRect(x + 2 + Math.floor(r * 60), y + 4, 6, 1);
        } else if (r > 0.96) {
          c.fillStyle = "#4c5a3c";
          c.fillRect(x + 6, y + 11, 1, 4);
          c.fillRect(x + 8, y + 10, 1, 5);
        }
      }
    }
    return cvs;
  }

  /**
   * The tile sheets arrive after the first frame; once they do, the baked
   * ground is thrown away and drawn again out of them.
   */
  rebuildGround(): void {
    this.ground = this.buildGround();
    this.caveGround = null;
    this.caveKey = "";
  }

  cropSprite(cropId: string, stage: number): HTMLCanvasElement {
    const def = CROPS[cropId as keyof typeof CROPS];
    const shape = def.shapes[stage];
    const pal =
      stage === 0 ? { ...EARTH_PAL, ...def.palettes[0] } : def.palettes[stage];
    return buildTinted(`${cropId}:${stage}`, shape, pal);
  }

  spiritSprite(s: Spirit, def: SpiritDef): HTMLCanvasElement {
    const step = s.moving && Math.floor(s.anim) % 2 ? 1 : 0;
    const built = buildSprite(`${s.id}:${step}`, def.frames[step]);
    const mirrored = def.facesLeft ? s.dir === "right" : s.dir === "left";
    return mirrored ? flipX(built) : built;
  }

  /** A chimera, walked out of the pack: four breathing frames, six chasing ones. */
  enemySprite(e: Enemy, t: number): HTMLCanvasElement {
    const crew = ENEMY_CREWS[e.id];
    const running = Math.abs(e.vx) + Math.abs(e.vy) > 1;
    const spr = packFrame(crew[running ? "run" : "idle"], Math.floor(t * (running ? FPS.crewRun : FPS.crewIdle)));
    const built = spr ?? buildSprite(`en_${e.id}`, ENEMY_ART[e.id]);
    const mirrored = e.dir === "left" ? flipX(built) : built;
    return e.flash > 0 ? silhouette(mirrored, "#f2e7ff") : mirrored;
  }

  /**
   * The alchemist, played out of the pack: breathing when she stands, six
   * frames when she walks, a flinch when the blow lands. Until a strip has
   * arrived the old hand-drawn body stands in for it.
   */
  /** A villager out of the hamlet: side-view sheets, breathing or walking. */
  villagerSprite(v: Villager, t: number): HTMLCanvasElement {
    const def = VILLAGERS[v.id];
    const clip = v.moving ? def.walk : def.idle;
    const spr = packFrame(
      clip,
      Math.floor(t * (v.moving ? FPS.crewRun : FPS.crewIdle)),
    );
    if (!spr) return buildSprite("p_down", PLAYER_DOWN);
    const mirror = (def.faces === "left") !== (v.face === "left");
    return mirror ? flipX(spr) : spr;
  }

  /** A stable variant per tile, so a stand of pines is not one copied tree. */
  private propVariant(o: string, tx: number, ty: number): PropArt | null {
    const list = PROP_ART[o as keyof typeof PROP_ART];
    if (!list?.length) return null;
    return list[Math.floor(hash(tx, ty) * list.length) % list.length];
  }

  playerSprite(g: Game, t: number): HTMLCanvasElement {
    const face: Face = g.dir === "left" || g.dir === "right" ? "side" : g.dir;
    const set = PLAYER_CLIPS[face];
    const anim =
      g.hurt > HURT_LOCK - 0.2
        ? "hit"
        : !g.moving
          ? "idle"
          : g.effects.speed > 0
            ? "run"
            : "walk";
    const spr = packFrame(set[anim], Math.floor(t * FPS[anim]));
    if (!spr) return this.plainPlayer(g);
    return g.dir === "left" ? flipX(spr) : spr;
  }

  /** The procedural body, kept for a cold cache and for tests. */
  private plainPlayer(g: Game): HTMLCanvasElement {
    const step = Math.floor(g.anim) % 2;
    if (g.dir === "up")
      return buildSprite(
        "p_up",
        g.moving && step ? PLAYER_DOWN_WALK : PLAYER_UP,
      );
    if (g.dir === "down")
      return buildSprite(
        "p_down",
        g.moving && step ? PLAYER_DOWN_WALK : PLAYER_DOWN,
      );
    const side = buildSprite("p_side", PLAYER_SIDE);
    if (g.dir === "left") return flipX(side);
    return side;
  }

  /**
   * Pack frames carry their boots on the bottom edge and their body in the
   * middle, so they go wherever the old flat sprite's feet were.
   */
  private static feetAt(
    spr: HTMLCanvasElement,
    cx: number,
    feet: number,
  ): { x: number; y: number } {
    return { x: Math.round(cx - spr.width / 2), y: Math.round(feet - spr.height) };
  }

  /**
   * Cottages and the village fire. A house is a wall, a gable roof, a door and
   * a window stacked by pixel rectangle; its base is the two rows of wall the
   * player cannot walk through, so it sorts like any other tall prop.
   */
  private pushVillage(
    items: SceneItem[],
    c: CanvasRenderingContext2D,
    t: number,
    cam: { x: number; y: number },
  ): void {
    for (const f of this.world.bonfires) {
      const x = f.tx * TILE;
      const y = f.ty * TILE;
      if (
        x > cam.x + VIEW_W + 64 ||
        x + 32 < cam.x - 64 ||
        y > cam.y + VIEW_H + 96 ||
        y + 32 < cam.y - 96
      )
        continue;
      const ring = packFrame(BONFIRE_CLIP, Math.floor(t * 6));
      const flame = packFrame(FIRE_CLIP, Math.floor(t * 8 + 1));
      const cx = x + 16;
      const feet = y + 32;
      items.push({
        y: feet,
        draw: () => {
          shadow(c, cx, feet - 3, 11);
          if (ring) c.drawImage(ring, cx - 16, feet - 32);
          else {
            c.fillStyle = "#3a2a20";
            c.fillRect(cx - 14, feet - 12, 28, 10);
          }
          if (flame) c.drawImage(flame, cx - 16, feet - 58);
          else {
            c.fillStyle = "#ff9a3c";
            c.fillRect(cx - 4, feet - 20, 8, 12);
          }
        },
      });
    }

    for (const [n, cot] of this.world.cottages.entries()) {
      const cx = cot.tx * TILE + 8;
      const base = cot.ty * TILE + TILE;
      const left = Math.round(cx - 48);
      const wallTop = base - 56;
      const roofTop = wallTop - 100;
      if (
        left > cam.x + VIEW_W + 8 ||
        left + 96 < cam.x - 8 ||
        base > cam.y + VIEW_H + 56 ||
        roofTop > cam.y + VIEW_H + 8
      )
        continue;
      const wall = packRect(COTTAGE.wall.src, COTTAGE.wall.rect);
      const roof = packRect(COTTAGE.roof.src, COTTAGE.roof.rect);
      const door = packRect(COTTAGE.door.src, COTTAGE.door.rect);
      const win = packRect(COTTAGE.window.src, COTTAGE.window.rect);
      const flagArt = BANNERS[n % BANNERS.length];
      const flag = packRect(flagArt.src, flagArt.rect);
      items.push({
        y: base,
        draw: () => {
          shadow(c, cx, base - 2, 26);
          if (!wall || !roof) {
            c.fillStyle = "#3a2718";
            c.fillRect(left, wallTop, 96, 56);
            c.fillStyle = "#5b3a22";
            c.beginPath();
            c.moveTo(cx, roofTop);
            c.lineTo(left - 6, wallTop);
            c.lineTo(left + 102, wallTop);
            c.closePath();
            c.fill();
            return;
          }
          // The gable gap is sky in the roof sheet; plank it in from behind.
          c.fillStyle = "#3a2416";
          c.beginPath();
          c.moveTo(cx, roofTop + 44);
          c.lineTo(left, wallTop);
          c.lineTo(left + 96, wallTop);
          c.closePath();
          c.fill();
          c.fillStyle = "#4a2f1c";
          const apex = roofTop + 44;
          for (let y = apex + 6; y < wallTop; y += 5) {
            const half = Math.round(((y - apex) / (wallTop - apex)) * 48);
            c.fillRect(cx - half, y, half * 2, 1);
          }
          c.drawImage(wall, left, wallTop);
          c.drawImage(roof, left, roofTop);
          if (door) c.drawImage(door, cx - 16, wallTop);
          if (win) c.drawImage(win, cx - 40, wallTop + 12);
          if (flag)
            c.drawImage(
              flag,
              cx + 26,
              wallTop + 8,
              flag.width * 2,
              flag.height * 2,
            );
        },
      });
    }
  }

  /** The alchemist in the y-sort, whether she comes from the pack or from art.ts. */
  private pushPlayer(
    items: SceneItem[],
    c: CanvasRenderingContext2D,
    g: Game,
    t: number,
  ): void {
    const cx = Math.round(g.px) + PLAYER_DOWN.w / 2;
    const feet = Math.round(g.py) + PLAYER_DOWN.h;
    const spr = this.hurtTint(g, this.playerSprite(g, t));
    const at = Renderer.feetAt(spr, cx, feet);
    items.push({
      y: feet,
      draw: () => {
        shadow(c, cx, feet, 5);
        c.drawImage(spr, at.x, at.y);
        this.drawWeapon(c, g, t, cx, feet);
      },
    });
  }

  /** The scythe stays in her hand, so the weapon reads even between swings. */
  private drawWeapon(
    c: CanvasRenderingContext2D,
    g: Game,
    t: number,
    cx: number,
    feet: number,
  ): void {
    const scythe = packRect(SCYTHE_ART.src, SCYTHE_ART.rect);
    if (!scythe) return;
    const bob = g.moving && Math.floor(t * 9) % 2 ? 1 : 0;
    const left = g.dir === "left" || g.dir === "up";
    const x = left ? cx - scythe.width - 5 : cx + 5;
    c.drawImage(left ? flipX(scythe) : scythe, x, feet - scythe.height + 1 - bob);
  }

  /** The hamlet's four walkers, queued into the same y-sort as everyone else. */
  private pushVillagers(
    items: SceneItem[],
    c: CanvasRenderingContext2D,
    t: number,
    cam: { x: number; y: number },
    g: Game,
    list: Villager[],
  ): void {
    for (const v of list) {
      if (!visible(Math.floor(v.x / TILE), Math.floor(v.y / TILE), cam)) continue;
      const spr = this.villagerSprite(v, t);
      const x = Math.round(v.x);
      const y = Math.round(v.y);
      const near =
        Math.hypot(v.x + 16 - (g.px + 8), v.y + 22 - (g.py + 16)) < 52;
      items.push({
        y: y + 31,
        draw: () => {
          shadow(c, x + 16, y + 30, 5);
          c.drawImage(spr, x, y);
          if (near || v.says > 0) this.chatMark(c, v, x, y);
        },
      });
    }
  }

  /** Three dots over a villager's head: "there is something to hear here". */
  private chatMark(
    c: CanvasRenderingContext2D,
    v: Villager,
    x: number,
    y: number,
  ): void {
    const bx = x + 9;
    const by = y + 1;
    c.globalAlpha = 0.82;
    c.fillStyle = "#0d1519";
    c.fillRect(bx, by, 14, 9);
    c.globalAlpha = 1;
    c.fillStyle = v.says > 0 ? "#ffe6a8" : "#8fb6c8";
    c.fillRect(bx, by, 14, 1);
    c.fillRect(bx, by + 8, 14, 1);
    c.fillRect(bx, by, 1, 9);
    c.fillRect(bx + 13, by, 1, 9);
    c.fillRect(bx + 6, by + 9, 2, 1);
    for (let i = 0; i < 3; i++)
      c.fillRect(bx + 3 + i * 4, by + 4, 2, 2);
  }

  /**
   * Anything with teeth, queued into the same y-sort as the trees,
   * so a husk can stand in front of a pine and still be hidden by it.
   */
  private pushHostiles(
    items: SceneItem[],
    c: CanvasRenderingContext2D,
    combat: Combat,
    t: number,
    cam: { x: number; y: number },
    cull: boolean,
  ): void {
    for (const e of combat.enemies) {
      if (cull && !visible(Math.floor(e.x / TILE), Math.floor(e.y / TILE), cam))
        continue;
      const def = ENEMIES[e.id];
      // The old flat sprite still owns the footprint: its centre is where the
      // shadow goes, its bottom edge is the ground the pack boots stand on.
      const box = buildSprite(`en_${e.id}`, ENEMY_ART[e.id]);
      const spr = this.enemySprite(e, t);
      const cx = Math.round(e.x) + box.width / 2;
      const feet =
        Math.round(e.y) -
        (def.hover ? 5 + Math.round(Math.sin(t * 2.6 + e.anim) * 2) : 0) +
        box.height;
      const at = Renderer.feetAt(spr, cx, feet);
      items.push({
        y: feet - 2,
        draw: () => {
          shadow(c, cx, feet - 1, 4);
          c.drawImage(spr, at.x, at.y);
        },
      });
    }

    for (const d of combat.deaths) {
      if (cull && !visible(Math.floor(d.x / TILE), Math.floor(d.y / TILE), cam))
        continue;
      const boss = d.id === "boss";
      const clip = d.id === "boss" ? BOSS_CREW.death : ENEMY_CREWS[d.id].death;
      const step = Math.min(
        clip.frames - 1,
        Math.floor((d.t / DEATH_TIME) * clip.frames),
      );
      const cut = packFrame(clip, step);
      if (!cut) continue;
      const box =
        d.id === "boss"
          ? buildSprite("boss_root_lord", ROOT_LORD)
          : buildSprite(`en_${d.id}`, ENEMY_ART[d.id]);
      const scale = boss ? BOSS_SCALE : 1;
      const w = cut.width * scale;
      const h = cut.height * scale;
      const cx = Math.round(d.x) + box.width / 2;
      const feet = Math.round(d.y) + box.height - (d.hover ? 5 : 0);
      const sx = Math.round(cx - w / 2);
      const sy = Math.round(feet - h);
      const spr = d.dir === "left" ? flipX(cut) : cut;
      const fade =
        d.t > DEATH_TIME - 0.18 ? Math.max(0, (DEATH_TIME - d.t) / 0.18) : 1;
      items.push({
        y: feet - 2,
        draw: () => {
          c.globalAlpha = fade;
          c.drawImage(spr, sx, sy, w, h);
          c.globalAlpha = 1;
        },
      });
    }

    const b = combat.boss;
    if (!b) return;
    const x = Math.round(b.x);
    const y = Math.round(b.y);
    if (b.burrowed) {
      // Under the floor: only the scar it drags along the stone.
      items.push({
        y: y + 26,
        draw: () => {
          c.globalAlpha = 0.45;
          c.fillStyle = "#120c1e";
          c.fillRect(x + 2, y + 20, 28, 6);
          c.fillStyle = "#6b5a9a";
          c.fillRect(x + 6 + Math.round(Math.sin(t * 5) * 6), y + 22, 4, 2);
          c.globalAlpha = 1;
        },
      });
      return;
    }
    const box = buildSprite("boss_root_lord", ROOT_LORD);
    const charge = b.pattern === "chase" || b.pattern === "rise";
    const clip = packFrame(
      BOSS_CREW[charge ? "run" : "idle"],
      Math.floor(t * (charge ? FPS.crewRun : FPS.crewIdle)),
    );
    const flat = clip ?? box;
    const spr = b.flash > 0 ? silhouette(flat, "#ffe6c9") : flat;
    const cx = x + box.width / 2;
    const feet = y + box.height;
    const size = spr.width * BOSS_SCALE;
    items.push({
      y: feet,
      draw: () => {
        shadow(c, cx, feet - 2, 13);
        c.drawImage(
          spr,
          Math.round(cx - size / 2),
          Math.round(feet - size),
          size,
          size,
        );
      },
    });
  }

  /** Spore shot hangs in the air above the floor, so it never sorts behind a cap. */
  private drawShots(
    c: CanvasRenderingContext2D,
    boss: Boss,
    t: number,
  ): void {
    for (const s of boss.shots) {
      c.globalAlpha = 0.35;
      c.fillStyle = "#b48ce0";
      c.fillRect(Math.round(s.x) - 3, Math.round(s.y) - 3, 6, 6);
      c.globalAlpha = 1;
      c.fillStyle = Math.floor(t * 12) % 2 ? "#e6c9ff" : "#8f6fb0";
      c.fillRect(Math.round(s.x) - 2, Math.round(s.y) - 2, 4, 4);
    }
  }

  /** The crescent the sickle leaves in the air, drawn last so it reads over the target. */
  private drawSwing(g: Game, c: CanvasRenderingContext2D): void {
    if (g.swing <= 0) return;
    const frame = g.swing > 0.17 ? 0 : g.swing > 0.08 ? 1 : 2;
    const built = buildSprite(`swing_${frame}`, SWING_FRAMES[frame]);
    const spr = g.dir === "left" ? flipX(built) : built;
    const at = facingPoint(g);
    c.globalAlpha = Math.min(1, g.swing * 6);
    c.drawImage(spr, Math.round(at.x - 10), Math.round(at.y - 10));
    c.globalAlpha = 1;
  }

  /** The instant a blow lands, the alchemist is the brightest thing on screen. */
  private hurtTint(g: Game, spr: HTMLCanvasElement): HTMLCanvasElement {
    return g.hurt > HURT_LOCK - 0.2 ? silhouette(spr, "#ffd9d0") : spr;
  }

  /** A red rim for the hit itself, and a slow one while the hearts run low. */
  private drawHurt(g: Game, t: number): void {
    const fresh = Math.min(1, g.hurt / 0.35);
    const low =
      g.hp > 0 && g.hp <= HP_MAX * 0.3 ? 0.25 + 0.15 * Math.sin(t * 3.4) : 0;
    const k = Math.max(fresh, low);
    if (k <= 0.01) return;
    const c = this.vctx;
    const vg = c.createRadialGradient(
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.3,
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.85,
    );
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, `rgba(178,34,28,${(0.45 * k).toFixed(3)})`);
    c.fillStyle = vg;
    c.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  draw(
    g: Game,
    fx: FX[],
    t: number,
    spirits: Spirit[],
    villagers: Villager[],
    combat: Combat,
  ): void {
    const c = this.vctx;
    const w = this.world;
    const cam = this.camera(g);
    c.clearRect(0, 0, VIEW_W, VIEW_H);
    c.save();
    c.translate(-cam.x + cam.shakeX, -cam.y + cam.shakeY);

    // The ground canvas spans the whole grove, so blit only the window in view.
    const sw = VIEW_W + 16;
    const sh = VIEW_H + 16;
    const gx = clamp(cam.x - 8, 0, MAP_W * TILE - sw);
    const gy = clamp(cam.y - 8, 0, MAP_H * TILE - sh);
    c.drawImage(this.ground, gx, gy, sw, sh, gx, gy, sw, sh);

    // Animated water with per-tile glints so the pond never looks like a repeating grid.
    const base = Math.floor(t * 1.6) % 2;
    for (const i of w.waterTiles) {
      const tx = i % MAP_W;
      const ty = Math.floor(i / MAP_W);
      if (!visible(tx, ty, cam)) continue;
      const x = tx * TILE;
      const y = ty * TILE;
      const h = hash(tx, ty);
      const frameIdx = (base + (h > 0.5 ? 1 : 0)) % 2;
      const refs = frameIdx ? MAT.waterRipple.refs : MAT.water.refs;
      const cut = tileSome("water", refs, pick(tx, ty));
      c.drawImage(cut ?? this.water[frameIdx], x, y);
      const glint = Math.sin(t * 1.9 + h * 12.6);
      if (glint > 0.25) {
        c.globalAlpha = 0.35 + 0.45 * glint;
        c.fillStyle = "#9fd8e8";
        c.fillRect(
          x + 2 + Math.floor(h * 10),
          y + 2 + Math.floor(hash(tx + 7, ty + 3) * 10),
          2,
          1,
        );
        c.globalAlpha = 1;
      }
    }

    // Soil + crops.
    for (const [i, plot] of w.plots) {
      const tx = i % MAP_W;
      const ty = Math.floor(i / MAP_W);
      if (!visible(tx, ty, cam)) continue;
      c.drawImage(
        plot.moisture > 0 ? this.soil[1] : this.soil[0],
        tx * TILE,
        ty * TILE,
      );
      if (plot.crop) {
        const stage = stageOf(plot);
        const bob =
          Math.sin(t * 1.7 + plot.sway * 6) * (stage === 3 ? 0.6 : 0.3);
        c.drawImage(
          this.cropSprite(plot.crop, stage),
          tx * TILE,
          ty * TILE + Math.round(bob),
        );
      }
    }

    // Y-sorted tall objects and the player.
    const items: SceneItem[] = [];
    for (
      let ty = Math.max(0, Math.floor(cam.y / TILE) - 2);
      ty < Math.min(MAP_H, cam.y / TILE + 15);
      ty++
    ) {
      for (
        let tx = Math.max(0, Math.floor(cam.x / TILE) - 1);
        tx < Math.min(MAP_W, cam.x / TILE + 22);
        tx++
      ) {
        const o = objectAt(w, tx, ty);
        if (!o) continue;
        // The brewing bench is the one prop with a life of its own: glass and
        // bubbles, thirty-three frames of them.
        if (o === "table") {
          const bench = packFrame(ALCHEMY_CLIP, Math.floor(t * 6));
          if (bench) {
            const cx = tx * TILE + 8;
            const feet = ty * TILE + TILE + 2;
            items.push({
              y: feet,
              draw: () => {
                shadow(c, cx, feet - 3, 11);
                c.drawImage(
                  bench,
                  Math.round(cx - bench.width / 2),
                  feet - bench.height,
                );
              },
            });
            continue;
          }
        }
        // The pack's own trees, boulders and reeds; the flat art stands in only
        // while a sheet is still in flight or for props the pack does not have.
        const prop = this.propVariant(o, tx, ty);
        const spr = prop ? packRect(prop.src, prop.rect) : null;
        if (spr && prop) {
          const size = prop.scale ?? 1;
          const wpx = spr.width * size;
          const hpx = spr.height * size;
          // Sub-pixel-grid jitter so the forest wall doesn't read as a perfect lattice.
          const cx =
            tx * TILE +
            8 +
            (prop.dx ?? 0) +
            Math.round((hash(tx, ty) - 0.5) * 4);
          const feet =
            ty * TILE +
            TILE +
            (prop.dy ?? 0) +
            Math.round((hash(tx + 31, ty + 17) - 0.5) * 2);
          items.push({
            y: feet,
            draw: () => {
              shadow(c, cx, feet - 2, prop.shadow ?? (o === "bush" ? 6 : 5));
              c.drawImage(
                spr,
                Math.round(cx - wpx / 2),
                Math.round(feet - hpx),
                Math.round(wpx),
                Math.round(hpx),
              );
            },
          });
          continue;
        }
        const fallback = spriteFor(o);
        const anchor = OBJ_ANCHOR[o] ?? { oy: 0, base: 16 };
        const x = tx * TILE + Math.round((hash(tx, ty) - 0.5) * 5);
        const y =
          ty * TILE +
          anchor.oy +
          Math.round((hash(tx + 31, ty + 17) - 0.5) * 3);
        items.push({
          y: ty * TILE + anchor.base,
          draw: () => {
            shadow(c, x + 8, y + fallback.height - 2, o === "bush" ? 6 : 5);
            c.drawImage(fallback, x, y);
          },
        });
      }
    }
    for (const s of spirits) {
      if (!visible(Math.floor(s.x / TILE), Math.floor(s.y / TILE), cam))
        continue;
      const def = SPIRITS[s.id];
      const spr = this.spiritSprite(s, def);
      const sx = Math.round(s.x);
      const sy =
        Math.round(s.y) -
        (def.hover ? 5 + Math.round(Math.sin(t * 2.4 + s.anim) * 2) : 0);
      items.push({
        y: sy + 14,
        draw: () => {
          shadow(c, sx + 8, sy + 15, 4);
          c.drawImage(spr, sx, sy);
          if (!s.fed) this.wantMark(c, s, sx, sy, g.px, g.py);
        },
      });
    }
    this.pushVillage(items, c, t, cam);
    this.pushVillagers(items, c, t, cam, g, villagers);
    this.pushPlayer(items, c, g, t);
    this.pushHostiles(items, c, combat, t, cam, true);
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();
    this.drawSwing(g, c);

    for (const p of fx) {
      c.globalAlpha = Math.min(1, p.life * 2.5);
      c.fillStyle = p.color;
      c.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
      c.globalAlpha = 1;
    }

    c.restore();
    this.drawLight(g, t);
    this.drawHurt(g, t);
    this.present();
  }

  /**
   * The Root Network: its own ground cache, its own light model, no daylight tint.
   * Darkness is a separate mask punched out by the alchemist's glow and every light source.
   */
  drawCave(
    g: Game,
    cave: Cave,
    run: RootsRun,
    fx: FX[],
    t: number,
    combat: Combat,
  ): void {
    const c = this.vctx;
    const cam = this.caveCamera(g);
    c.clearRect(0, 0, VIEW_W, VIEW_H);
    c.save();
    c.translate(-cam.x + cam.shakeX, -cam.y + cam.shakeY);
    c.drawImage(this.caveGroundCanvas(cave), 0, 0);

    const items: SceneItem[] = [];
    const x0 = Math.max(0, Math.floor(cam.x / TILE) - 1);
    const x1 = Math.min(CAVE_W, Math.ceil(cam.x / TILE) + 22);
    const y0 = Math.max(0, Math.floor(cam.y / TILE) - 2);
    const y1 = Math.min(CAVE_H, Math.ceil(cam.y / TILE) + 15);
    for (let ty = y0; ty < y1; ty++) {
      for (let tx = x0; tx < x1; tx++) {
        const p = cave.prop[caveIdx(tx, ty)];
        if (!p) continue;
        const spr = cavePropSprite(p);
        const oy = p === "shaft" ? -4 : 0;
        const jitter = Math.round((hash(tx, ty) - 0.5) * 3);
        const x = tx * TILE + jitter;
        const y = ty * TILE + oy;
        items.push({
          y: ty * TILE + 16,
          draw: () => {
            if (p === "node" || p === "cap") {
              const pulse = 0.55 + 0.45 * Math.sin(t * 2.2 + (tx + ty) * 1.7);
              c.globalAlpha = 0.28 * pulse;
              c.fillStyle = p === "node" ? "#cbb8ff" : "#9fe3d6";
              c.beginPath();
              c.arc(x + 8, y + spr.height / 2, 9 + pulse * 2, 0, Math.PI * 2);
              c.fill();
              c.globalAlpha = 1;
            }
            shadow(c, x + 8, y + spr.height - 2, p === "debris" ? 6 : 5);
            c.drawImage(spr, x, y);
          },
        });
      }
    }

    this.pushBossArena(items, c, cave, t, cam);
    this.pushPlayer(items, c, g, t);
    this.pushHostiles(items, c, combat, t, cam, false);
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();
    if (combat.boss) this.drawShots(c, combat.boss, t);
    this.drawSwing(g, c);

    for (const p of fx) {
      c.globalAlpha = Math.min(1, p.life * 2.5);
      c.fillStyle = p.color;
      c.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
      c.globalAlpha = 1;
    }

    c.restore();
    this.drawCaveDark(g, cave, cam, t);
    this.drawTide(run, t);
    this.drawHurt(g, t);
    this.present();
  }

  /** Floor tiles around the last chamber's door where a brazier can stand. */
  private arenaFires(cave: Cave): { tx: number; ty: number }[] {
    if (cave.layer !== MAX_LAYER) return [];
    const spots: { tx: number; ty: number }[] = [];
    const at = cave.entry;
    for (const [dx, dy] of [
      [-3, 0],
      [3, 0],
      [0, 2],
      [-2, 3],
      [2, 3],
    ] as const) {
      const tx = at.tx + dx;
      const ty = at.ty + dy;
      if (!inCave(tx, ty)) continue;
      const i = caveIdx(tx, ty);
      if (cave.tiles[i] === 0 || cave.prop[i]) continue;
      spots.push({ tx, ty });
      if (spots.length === 3) break;
    }
    return spots;
  }

  /** Braziers and banners turn the last chamber into a throne room. */
  private pushBossArena(
    items: SceneItem[],
    c: CanvasRenderingContext2D,
    cave: Cave,
    t: number,
    cam: { x: number; y: number },
  ): void {
    const fires = this.arenaFires(cave);
    for (const [n, { tx, ty }] of fires.entries()) {
      const x = tx * TILE + 8;
      const base = ty * TILE + TILE;
      const art = BRAZIERS[n % BRAZIERS.length];
      const spr = packRect(art.src, art.rect);
      if (!spr) continue;
      const w = spr.width * 2;
      const h = spr.height * 2;
      if (
        x < cam.x - 64 ||
        x > cam.x + VIEW_W + 64 ||
        base < cam.y - 96 ||
        base > cam.y + VIEW_H + 64
      )
        continue;
      items.push({
        y: base,
        draw: () => {
          shadow(c, x, base - 2, 6);
          c.globalAlpha = 0.22;
          c.fillStyle = "#ff8a2a";
          c.beginPath();
          c.arc(x, base - h + 6, 13, 0, Math.PI * 2);
          c.fill();
          c.globalAlpha = 1;
          c.drawImage(spr, Math.round(x - w / 2), Math.round(base - h), w, h);
          const f = 1 + Math.sin(t * 7 + n * 1.7) * 0.3;
          c.fillStyle = n % 2 ? "#ffb54a" : "#ffd98a";
          c.fillRect(Math.round(x) - 1, Math.round(base - h) + Math.round(4 - f), 3, Math.round(4 + f));
        },
      });

      // A banner hangs from the first stretch of rock above each fire.
      let wall = -1;
      for (let wy = ty - 1; wy >= ty - 6 && inCave(tx, wy); wy--)
        if (cave.tiles[caveIdx(tx, wy)] === 0) {
          wall = wy;
          break;
        }
      if (wall < 0) continue;
      const flagArt = BANNERS[n % BANNERS.length];
      const flag = packRect(flagArt.src, flagArt.rect);
      if (!flag) continue;
      const rail = wall * TILE + TILE - 4;
      items.push({
        y: rail,
        draw: () => {
          c.drawImage(
            flag,
            Math.round(x - flag.width),
            Math.round(rail - flag.height * 2 - 4),
            flag.width * 2,
            flag.height * 2,
          );
        },
      });
    }
  }

  private caveGroundCanvas(cave: Cave): HTMLCanvasElement {
    const key = `${cave.seed}:${cave.layer}:${cave.nodeCount}`;
    if (this.caveGround && this.caveKey === key) return this.caveGround;
    const cvs = document.createElement("canvas");
    cvs.width = CAVE_W * TILE;
    cvs.height = CAVE_H * TILE;
    const c = cvs.getContext("2d")!;
    const pack = tileSome("dungeon", MAT.caveFloor.refs, 0) !== null;
    for (let ty = 0; ty < CAVE_H; ty++) {
      for (let tx = 0; tx < CAVE_W; tx++) {
        const i = caveIdx(tx, ty);
        const x = tx * TILE;
        const y = ty * TILE;
        const tile = cave.tiles[i];
        const open = (dx: number, dy: number) =>
          inCave(tx + dx, ty + dy) &&
          cave.tiles[caveIdx(tx + dx, ty + dy)] !== 0;
        if (tile === 0) {
          const cut = pack
            ? tileSome("dungeon", MAT.caveWall.refs, pick(tx, ty))
            : null;
          if (cut) {
            c.drawImage(cut, x, y);
            continue;
          }
          // Stone near an open face catches the tunnels' light, so the walls have mass.
          const face = EDGE.some(([dx, dy]) => open(dx, dy));
          const halo = !face && NEIGH8.some(([dx, dy]) => open(dx, dy));
          c.fillStyle = face ? "#241b38" : halo ? "#1d1629" : "#171222";
          c.fillRect(x, y, TILE, TILE);
          dab(c, tx, ty, face ? "#2d2346" : "#1f1830", 6, 1);
          dab(c, tx, ty, "#0f0b18", 4, 3);
          if (hash(tx * 11, ty * 13) > 0.72) {
            c.fillStyle = "#302547";
            c.fillRect(
              x + 2 + Math.floor(hash(tx * 3, ty) * 10),
              y + 2 + Math.floor(hash(tx, ty * 5) * 10),
              2,
              2,
            );
          }
          continue;
        }
        const cut = pack
          ? tileSome(
              "dungeon",
              tile === 2 ? MAT.caveMoss.refs : MAT.caveFloor.refs,
              pick(tx, ty),
            )
          : null;
        if (cut) {
          c.drawImage(cut, x, y);
          continue;
        }
        c.fillStyle = tile === 2 ? "#2f2843" : "#292239";
        c.fillRect(x, y, TILE, TILE);
        dab(c, tx, ty, "#332b48", 6, 2);
        if (tile === 2) dab(c, tx, ty, "#6b5a9a", 4, 5);
        if (hash(tx * 5, ty * 3) > 0.82) {
          c.fillStyle = "#8f6fd6";
          c.fillRect(
            x + 3 + Math.floor(hash(tx, ty * 7) * 8),
            y + 4 + Math.floor(hash(tx + 9, ty) * 7),
            2,
            1,
          );
        }
      }
    }
    // Edges last, so a wall face never gets painted over by its own floor tile.
    for (let ty = 0; ty < CAVE_H; ty++) {
      for (let tx = 0; tx < CAVE_W; tx++) {
        const i = caveIdx(tx, ty);
        const x = tx * TILE;
        const y = ty * TILE;
        if (cave.tiles[i] === 0) continue;
        for (const [dx, dy] of EDGE) {
          if (
            inCave(tx + dx, ty + dy) &&
            cave.tiles[caveIdx(tx + dx, ty + dy)] !== 0
          )
            continue;
          c.fillStyle = "#1a1428";
          if (dy === -1) c.fillRect(x, y, TILE, 1);
          else if (dy === 1) c.fillRect(x, y + TILE - 1, TILE, 1);
          else if (dx === -1) c.fillRect(x, y, 1, TILE);
          else c.fillRect(x + TILE - 1, y, 1, TILE);
        }
      }
      for (let tx = 0; tx < CAVE_W; tx++) {
        const i = caveIdx(tx, ty);
        if (cave.tiles[i] !== 0) continue;
        const x = tx * TILE;
        const y = ty * TILE;
        for (const [dx, dy] of EDGE) {
          const nx = tx + dx;
          const ny = ty + dy;
          if (!inCave(nx, ny) || cave.tiles[caveIdx(nx, ny)] === 0) continue;
          c.fillStyle = "#463663";
          if (dy === -1) c.fillRect(x, y + TILE - 1, TILE, 1);
          else if (dy === 1) c.fillRect(x, y, TILE, 1);
          else if (dx === -1) c.fillRect(x + TILE - 1, y, 1, TILE);
          else c.fillRect(x, y, 1, TILE);
        }
      }
    }
    this.caveGround = cvs;
    this.caveKey = key;
    return cvs;
  }

  private caveCamera(g: Game): {
    x: number;
    y: number;
    shakeX: number;
    shakeY: number;
  } {
    const maxX = CAVE_W * TILE - VIEW_W;
    const maxY = CAVE_H * TILE - VIEW_H;
    const x = clamp(Math.round(g.px + 8 - VIEW_W / 2), 0, maxX);
    const y = clamp(Math.round(g.py + 12 - VIEW_H / 2), 0, maxY);
    const s = this.shake;
    return {
      x,
      y,
      shakeX: s > 0 ? Math.round(Math.sin(s * 42) * s) : 0,
      shakeY: s > 0 ? Math.round(Math.cos(s * 37) * s * 0.6) : 0,
    };
  }

  private drawCaveDark(
    g: Game,
    cave: Cave,
    cam: { x: number; y: number },
    t: number,
  ): void {
    const d = this.darkCtx;
    d.globalCompositeOperation = "source-over";
    d.clearRect(0, 0, VIEW_W, VIEW_H);
    d.fillStyle = "#06040c";
    d.fillRect(0, 0, VIEW_W, VIEW_H);
    d.globalCompositeOperation = "destination-out";
    // Lamp Oil pushes every darkness edge on this layer outward.
    const lamp = g.effects.light > 0 ? 1.7 : 1;
    const body = glowRadius(cave.layer) * lamp * (1 + Math.sin(t * 6.5) * 0.03);
    punch(d, g.px + 8 - cam.x, g.py + 12 - cam.y, body);
    const fires = this.arenaFires(cave);
    for (const { tx, ty } of fires)
      punch(
        d,
        tx * TILE + 8 - cam.x,
        ty * TILE + 8 - cam.y,
        2.6 * TILE * lamp * (1 + Math.sin(t * 3 + tx) * 0.05),
      );
    for (const [i, radius] of cave.lights) {
      if (radius <= 0) continue;
      const lx = (i % CAVE_W) * TILE + 8 - cam.x;
      const ly = Math.floor(i / CAVE_W) * TILE + 8 - cam.y;
      if (lx < -80 || ly < -80 || lx > VIEW_W + 80 || ly > VIEW_H + 80)
        continue;
      punch(
        d,
        lx,
        ly,
        radius * TILE * lamp * (1 + Math.sin(t * 1.8 + i) * 0.06),
      );
    }
    d.globalCompositeOperation = "source-over";
    const c = this.vctx;
    c.drawImage(this.dark, 0, 0);
    c.globalCompositeOperation = "lighter";
    for (const [i, radius] of cave.lights) {
      if (radius <= 0) continue;
      const lx = (i % CAVE_W) * TILE + 8 - cam.x;
      const ly = Math.floor(i / CAVE_W) * TILE + 8 - cam.y;
      if (lx < -60 || ly < -60 || lx > VIEW_W + 60 || ly > VIEW_H + 60)
        continue;
      glow(c, lx, ly, radius * TILE * 0.6, "#8f6fd6", 0.12);
    }
    for (const { tx, ty } of fires)
      glow(c, tx * TILE + 8 - cam.x, ty * TILE + 8 - cam.y, 40, "#ff9a3a", 0.16);
    c.globalCompositeOperation = "source-over";
    c.globalAlpha = 1;
  }

  /** The spore tide closes in: haze first, then drifting specks you can see coming. */
  private drawTide(run: RootsRun, t: number): void {
    const k = tideRatio(run);
    if (k <= 0.08) return;
    const c = this.vctx;
    c.globalAlpha = Math.min(0.4, k * 0.45);
    c.fillStyle = "#4a3b7a";
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    c.fillStyle = "#cbb8ff";
    for (let n = 0; n < 30; n++) {
      const h = hash(n * 13, 7);
      const x = Math.floor((h * VIEW_W + t * (6 + h * 22)) % VIEW_W);
      const y = Math.floor((hash(n, 11) * VIEW_H + t * (10 + h * 16)) % VIEW_H);
      c.globalAlpha = 0.2 + 0.6 * k;
      c.fillRect(x, y, 1, 1);
    }
    c.globalAlpha = 1;
  }

  /** Distant hungry spirits get a spark; the full want bubble only shows when you stand next to them. */
  private wantMark(
    c: CanvasRenderingContext2D,
    s: Spirit,
    x: number,
    y: number,
    px: number,
    py: number,
  ): void {
    if (Math.abs(x - px) <= 3 * TILE && Math.abs(y - py) <= 3 * TILE) {
      this.wantBubble(c, s, x, y);
      return;
    }
    c.fillStyle = "#2a1f3d";
    c.fillRect(x + 6, y - 6, 4, 4);
    c.fillStyle = "#e3d1ff";
    c.fillRect(x + 7, y - 5, 2, 2);
  }

  private wantBubble(
    c: CanvasRenderingContext2D,
    s: Spirit,
    x: number,
    y: number,
  ): void {
    const bx = x;
    const by = y - 19;
    c.globalAlpha = 0.78;
    c.fillStyle = "#0d1519";
    c.fillRect(bx - 1, by - 1, 18, 19);
    c.globalAlpha = 1;
    c.fillStyle = "#5f8496";
    c.fillRect(bx - 1, by - 1, 18, 1);
    c.fillRect(bx - 1, by + 17, 18, 1);
    c.fillRect(bx - 1, by, 1, 17);
    c.fillRect(bx + 16, by, 1, 17);
    c.fillRect(bx + 7, by + 18, 2, 1);
    c.drawImage(this.cropSprite(s.want, 3), bx, by);
  }

  private drawLight(g: Game, t: number): void {
    const c = this.vctx;
    const p = Math.min(1, g.dayTime / DAY_LENGTH);
    let tint = "rgba(0,0,0,0)";
    if (p < 0.12) tint = `rgba(255,196,120,${0.2 - p})`;
    else if (p > 0.72) {
      const k = (p - 0.72) / 0.28;
      tint = `rgba(${Math.round(30 + 60 * (1 - k))},${Math.round(30 + 20 * (1 - k))},${Math.round(90 - 20 * k)},${(0.12 + 0.45 * k).toFixed(3)})`;
    }
    if (g.skip > 0) tint = `rgba(6,8,20,${0.55 + 0.35 * Math.sin(t * 6)})`;
    c.fillStyle = tint;
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    const vg = c.createRadialGradient(
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.42,
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.95,
    );
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(4,7,10,0.42)");
    c.fillStyle = vg;
    c.fillRect(0, 0, VIEW_W, VIEW_H);

    // The village fire answers the dark: a warm pool that never quite sits still.
    const night = p > 0.72 ? (p - 0.72) / 0.28 : p < 0.12 ? 1 - p / 0.12 : 0;
    const warm = Math.max(night, 0.16);
    const cam = this.camera(g);
    c.globalCompositeOperation = "lighter";
    for (const f of this.world.bonfires) {
      const x = f.tx * TILE + 16 - cam.x;
      const y = f.ty * TILE + 18 - cam.y;
      if (x < -60 || y < -60 || x > VIEW_W + 60 || y > VIEW_H + 60) continue;
      const flicker = 0.85 + 0.15 * Math.sin(t * 9 + f.tx * 1.7);
      const r = 46 * flicker;
      const fire = c.createRadialGradient(x, y, 2, x, y, r);
      fire.addColorStop(0, `rgba(255,186,96,${(0.3 * warm).toFixed(3)})`);
      fire.addColorStop(0.5, `rgba(255,122,44,${(0.12 * warm).toFixed(3)})`);
      fire.addColorStop(1, "rgba(255,90,20,0)");
      c.fillStyle = fire;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
    c.globalCompositeOperation = "source-over";
  }

  private camera(g: Game): {
    x: number;
    y: number;
    shakeX: number;
    shakeY: number;
  } {
    const maxX = MAP_W * TILE - VIEW_W;
    const maxY = MAP_H * TILE - VIEW_H;
    const x = clamp(Math.round(g.px + 8 - VIEW_W / 2), 0, maxX);
    const y = clamp(Math.round(g.py + 12 - VIEW_H / 2), 0, maxY);
    const s = this.shake;
    return {
      x,
      y,
      shakeX: s > 0 ? Math.round(Math.sin(s * 42) * s) : 0,
      shakeY: s > 0 ? Math.round(Math.cos(s * 37) * s * 0.6) : 0,
    };
  }

  shake = 0;

  private present(): void {
    const d = this.dctx;
    const scale = Math.max(
      1,
      Math.floor(
        Math.min(this.canvas.width / VIEW_W, this.canvas.height / VIEW_H),
      ),
    );
    const w = VIEW_W * scale;
    const h = VIEW_H * scale;
    d.imageSmoothingEnabled = false;
    d.fillStyle = "#0a0f12";
    d.fillRect(0, 0, this.canvas.width, this.canvas.height);
    d.drawImage(
      this.view,
      Math.round((this.canvas.width - w) / 2),
      Math.round((this.canvas.height - h) / 2),
      w,
      h,
    );
  }

  get viewCanvas(): HTMLCanvasElement {
    return this.view;
  }
}

function visible(
  tx: number,
  ty: number,
  cam: { x: number; y: number },
): boolean {
  return (
    tx * TILE + TILE > cam.x - 24 &&
    tx * TILE < cam.x + VIEW_W + 8 &&
    ty * TILE + TILE > cam.y - 20 &&
    ty * TILE < cam.y + VIEW_H + 8
  );
}

function shadow(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
): void {
  c.globalAlpha = 0.28;
  c.fillStyle = "#0c1208";
  c.beginPath();
  c.ellipse(x, y, r, Math.max(2, r / 2.4), 0, 0, Math.PI * 2);
  c.fill();
  c.globalAlpha = 1;
}

function dab(
  c: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  color: string,
  count: number,
  salt: number,
): void {
  c.fillStyle = color;
  for (let n = 0; n < count; n++) {
    const h = hash(tx * 31 + n, ty * 17 + salt);
    const x = tx * TILE + Math.floor(h * (TILE - 2));
    const y = ty * TILE + Math.floor(hash(tx + n, ty * 7 - salt) * (TILE - 2));
    c.fillRect(x, y, 2, 1);
  }
}

const EDGE = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;

const NEIGH8 = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
] as const;

/** Bilinear value noise on a coarse lattice: blobs with soft, curvy isolines. */
function valueNoise(tx: number, ty: number, cell: number): number {
  const gx = Math.floor(tx / cell);
  const gy = Math.floor(ty / cell);
  const fx = tx / cell - gx;
  const fy = ty / cell - gy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = hash(gx, gy);
  const n10 = hash(gx + 1, gy);
  const n01 = hash(gx, gy + 1);
  const n11 = hash(gx + 1, gy + 1);
  const top = n00 + (n10 - n00) * sx;
  const bot = n01 + (n11 - n01) * sx;
  return top + (bot - top) * sy;
}

/** A stable index into a material's variants, so a tile never changes identity. */
function pick(tx: number, ty: number): number {
  return Math.floor(hash(tx * 7, ty * 11) * 997);
}

function hash(x: number, y: number): number {
  let h =
    Math.imul(x ^ 0x9e3779b9, 0x85ebca6b) ^
    Math.imul(y ^ 0xc2b2ae35, 0x27d4eb2d);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Removes darkness inside a soft circle from the light mask. */
function punch(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
): void {
  const gr = c.createRadialGradient(x, y, Math.max(2, r * 0.28), x, y, r);
  gr.addColorStop(0, "rgba(0,0,0,1)");
  gr.addColorStop(0.62, "rgba(0,0,0,0.6)");
  gr.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = gr;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}

/** Soft additive halo around a cave light, so glow never shows a hard rim. */
function glow(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  strength: number,
): void {
  const gr = c.createRadialGradient(x, y, 1, x, y, r);
  gr.addColorStop(0, color);
  gr.addColorStop(1, "rgba(0,0,0,0)");
  c.globalAlpha = strength;
  c.fillStyle = gr;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  c.globalAlpha = 1;
}

function cavePropSprite(kind: PropKind): HTMLCanvasElement {
  switch (kind) {
    case "node":
      return buildSprite("mycel_node", MYCEL_NODE);
    case "spent":
      return buildSprite("mycel_spent", MYCEL_SPENT);
    case "shaft":
      return buildSprite("shaft_up", SHAFT_UP);
    case "deep":
      return buildSprite("deep_well", DEEP_WELL);
    case "cap":
      return buildSprite("cave_cap", CAVE_CAP);
    default:
      return buildSprite("cave_debris", CAVE_DEBRIS);
  }
}

/**
 * The ground tiles come out of the save; the props are regenerated from the same
 * seed every boot, so only the two things a player permanently changes are replayed:
 * which sealed passes are open and which hoards are already empty.
 */
export function loadWorldFromSave(
  w: World,
  kind: number[],
  opened: number[] = [],
  looted: number[] = [],
): void {
  for (const i of opened) {
    w.opened.add(i);
    if (w.obj[i] === "rockfall") w.obj[i] = "rubble";
  }
  for (const i of looted) {
    w.looted.add(i);
    if (w.obj[i] === "cache") w.obj[i] = "cache_open";
  }
  w.kind.set(Uint8Array.from(kind));
  w.waterTiles.length = 0;
  for (let i = 0; i < kind.length; i++) {
    if (kind[i] === 2) w.waterTiles.push(i);
    const ty = Math.floor(i / MAP_W);
    const tx = i % MAP_W;
    if (kind[i] === 3 && !w.plots.has(idx(tx, ty)))
      w.plots.set(idx(tx, ty), { moisture: 0, points: 0, sway: 0 });
  }
}
