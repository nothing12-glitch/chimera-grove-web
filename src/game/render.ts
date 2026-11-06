import { buildSprite, buildTinted, flipX } from "../core/sprites";
import {
  ALCHEMY_TABLE,
  BUSH,
  CAVE_CAP,
  CAVE_DEBRIS,
  DEEP_WELL,
  FENCE,
  FLASK,
  GRASS_TUFT,
  MYCEL_NODE,
  MYCEL_SPENT,
  PINE,
  PLAYER_DOWN,
  PLAYER_DOWN_WALK,
  PLAYER_SIDE,
  PLAYER_UP,
  ROCK,
  ROUND_TREE,
  SEED_STALL,
  SHAFT_UP,
  SHRINE,
  SIGNPOST,
  SINKHOLE,
  STUMP,
  TILLED,
  TILLED_WET_PAL,
  WATER_0,
  WATER_1,
  WILD_FLOWER,
} from "../data/art";
import { CROPS } from "../data/crops";
import { SPIRITS, type SpiritDef } from "../data/spirits";
import {
  CAVE_H,
  CAVE_W,
  caveIdx,
  inCave,
  type Cave,
  type PropKind,
} from "../data/roots";
import {
  MAP_H,
  MAP_W,
  TILE,
  idx,
  objectAt,
  tileAt,
  type World,
} from "../data/world";
import { DAY_LENGTH, type Game } from "./state";
import { glowRadius, tideRatio, type RootsRun } from "./roots";
import type { Spirit } from "./spirits";
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
};

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
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const kind = tileAt(w, tx, ty);
        const x = tx * TILE;
        const y = ty * TILE;
        if (kind === "water") {
          c.fillStyle = "#123a4e";
          c.fillRect(x, y, TILE, TILE);
          continue;
        }
        if (kind === "path") {
          c.fillStyle = "#6d5236";
          c.fillRect(x, y, TILE, TILE);
          dab(c, tx, ty, "#87663f", 5, 1);
          dab(c, tx, ty, "#5b4227", 4, 2);
          continue;
        }
        // Grass: one base tone plus low-frequency patches. Per-tile tones read as a grid.
        const patch = hash(tx >> 2, ty >> 2);
        c.fillStyle =
          patch < 0.3 ? "#33532c" : patch < 0.65 ? "#35562e" : "#385a30";
        c.fillRect(x, y, TILE, TILE);
        dab(c, tx, ty, "#47733f", 7, 3);
        dab(c, tx, ty, "#284222", 5, 4);
      }
    }
    // Damp shore where land meets the pond, so the water does not end on a hard edge.
    for (let ty = 1; ty < MAP_H - 1; ty++) {
      for (let tx = 1; tx < MAP_W - 1; tx++) {
        const k = tileAt(w, tx, ty);
        if (k === "water") continue;
        const x = tx * TILE;
        const y = ty * TILE;
        for (const [dx, dy] of [
          [0, -1],
          [0, 1],
          [-1, 0],
          [1, 0],
        ] as const) {
          if (tileAt(w, tx + dx, ty + dy) !== "water") continue;
          c.fillStyle = "#22404c";
          if (dy === -1) c.fillRect(x, y, TILE, 2);
          else if (dy === 1) c.fillRect(x, y + TILE - 2, TILE, 2);
          else if (dx === -1) c.fillRect(x, y, 2, TILE);
          else c.fillRect(x + TILE - 2, y, 2, TILE);
        }
      }
    }
    // Decoration pass: tufts and flowers only where nothing else stands.
    for (let ty = 1; ty < MAP_H - 1; ty++) {
      for (let tx = 1; tx < MAP_W - 1; tx++) {
        if (tileAt(w, tx, ty) !== "grass" || objectAt(w, tx, ty)) continue;
        const r = hash(tx, ty);
        if (r < 0.06) c.drawImage(spriteFor("tuft"), tx * TILE, ty * TILE - 2);
        else if (r > 0.94)
          c.drawImage(
            buildSprite("flower", WILD_FLOWER),
            tx * TILE,
            ty * TILE - 2,
          );
      }
    }
    return cvs;
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

  playerSprite(g: Game): HTMLCanvasElement {
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

  draw(g: Game, fx: FX[], t: number, spirits: Spirit[]): void {
    const c = this.vctx;
    const w = this.world;
    const cam = this.camera(g);
    c.clearRect(0, 0, VIEW_W, VIEW_H);
    c.save();
    c.translate(-cam.x + cam.shakeX, -cam.y + cam.shakeY);

    c.drawImage(this.ground, 0, 0);

    // Animated water with per-tile glints so the pond never looks like a repeating grid.
    const base = Math.floor(t * 1.6) % 2;
    for (const i of w.waterTiles) {
      const tx = i % MAP_W;
      const ty = Math.floor(i / MAP_W);
      if (!visible(tx, ty, cam)) continue;
      const x = tx * TILE;
      const y = ty * TILE;
      const h = hash(tx, ty);
      c.drawImage(this.water[(base + (h > 0.5 ? 1 : 0)) % 2], x, y);
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
    type Item = { y: number; draw(): void };
    const items: Item[] = [];
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
        const spr = spriteFor(o);
        const anchor = OBJ_ANCHOR[o] ?? { oy: 0, base: 16 };
        // Sub-pixel-grid jitter so the forest wall doesn't read as a perfect lattice.
        const x = tx * TILE + Math.round((hash(tx, ty) - 0.5) * 5);
        const y =
          ty * TILE +
          anchor.oy +
          Math.round((hash(tx + 31, ty + 17) - 0.5) * 3);
        items.push({
          y: ty * TILE + anchor.base,
          draw: () => {
            shadow(c, x + 8, y + spr.height - 2, o === "bush" ? 6 : 5);
            c.drawImage(spr, x, y);
          },
        });
      }
    }
    const px = Math.round(g.px);
    const py = Math.round(g.py);
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
    const playerSpr = this.playerSprite(g);
    items.push({
      y: py + 20,
      draw: () => {
        shadow(c, px + 8, py + 20, 5);
        c.drawImage(playerSpr, px, py);
      },
    });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();

    for (const p of fx) {
      c.globalAlpha = Math.min(1, p.life * 2.5);
      c.fillStyle = p.color;
      c.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
      c.globalAlpha = 1;
    }

    c.restore();
    this.drawLight(g, t);
    this.present();
  }

  /**
   * The Root Network: its own ground cache, its own light model, no daylight tint.
   * Darkness is a separate mask punched out by the alchemist's glow and every light source.
   */
  drawCave(g: Game, cave: Cave, run: RootsRun, fx: FX[], t: number): void {
    const c = this.vctx;
    const cam = this.caveCamera(g);
    c.clearRect(0, 0, VIEW_W, VIEW_H);
    c.save();
    c.translate(-cam.x + cam.shakeX, -cam.y + cam.shakeY);
    c.drawImage(this.caveGroundCanvas(cave), 0, 0);

    type Item = { y: number; draw(): void };
    const items: Item[] = [];
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

    const px = Math.round(g.px);
    const py = Math.round(g.py);
    const playerSpr = this.playerSprite(g);
    items.push({
      y: py + 20,
      draw: () => {
        shadow(c, px + 8, py + 20, 5);
        c.drawImage(playerSpr, px, py);
      },
    });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();

    for (const p of fx) {
      c.globalAlpha = Math.min(1, p.life * 2.5);
      c.fillStyle = p.color;
      c.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
      c.globalAlpha = 1;
    }

    c.restore();
    this.drawCaveDark(g, cave, cam, t);
    this.drawTide(run, t);
    this.present();
  }

  private caveGroundCanvas(cave: Cave): HTMLCanvasElement {
    const key = `${cave.seed}:${cave.layer}:${cave.nodeCount}`;
    if (this.caveGround && this.caveKey === key) return this.caveGround;
    const cvs = document.createElement("canvas");
    cvs.width = CAVE_W * TILE;
    cvs.height = CAVE_H * TILE;
    const c = cvs.getContext("2d")!;
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

export function loadWorldFromSave(w: World, kind: number[]): void {
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
