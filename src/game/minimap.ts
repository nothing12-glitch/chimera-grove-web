import {
  BIOME_NAME,
  BIOME_ORDER,
  MAP_H,
  MAP_W,
  TILE,
  biomeAt,
  inBounds,
  objectAt,
  tileAt,
  type BiomeId,
  type World,
} from "../data/world";
import type { Game } from "./state";
import type { Spirit } from "./spirits";
import type { Enemy } from "./enemies";
import { VIEW_H, VIEW_W } from "./render";

/** One pixel per tile: the whole grove is a 200x120 thumbnail. */
const TERRAIN: Record<BiomeId, string> = {
  home: "#3d6335",
  thicket: "#22402a",
  marsh: "#33493c",
  ridge: "#4a5058",
  ruins: "#4a4840",
};

const PATH: Record<BiomeId, string> = {
  home: "#7b5c39",
  thicket: "#66503a",
  marsh: "#5c5a3c",
  ridge: "#6d727c",
  ruins: "#6f6953",
};

const SOIL = "#b98a4e";
const SEALED = "#e0503a";
const OPEN = "#7fc4d8";
const MOUTH = "#b487e8";
const HOARD = "#ffd98a";
const SPIRIT_DOT = "#8fd6c0";
const FOE = "#e0503a";
const SELF = "#ffe9a8";
const FRAME = "#eaf4ff";

export type LegendEntry = { color: string; label: string };

export const BIOME_LEGEND: LegendEntry[] = BIOME_ORDER.map((b) => ({
  color: TERRAIN[b],
  label: BIOME_NAME[b],
}));

export const MARK_LEGEND: LegendEntry[] = [
  { color: SELF, label: "ви" },
  { color: SOIL, label: "грядка" },
  { color: HOARD, label: "кореневий вузлик" },
  { color: MOUTH, label: "провал Мережі" },
  { color: SEALED, label: "завалений хід" },
  { color: OPEN, label: "відкритий хід" },
];

export class Minimap {
  private base: HTMLCanvasElement;

  constructor(private world: World) {
    this.base = document.createElement("canvas");
    this.base.width = MAP_W;
    this.base.height = MAP_H;
    this.bake();
  }

  /** Call when something permanent changes the props — a pass dissolving, mostly. */
  invalidate(): void {
    this.bake();
  }

  private bake(): void {
    const w = this.world;
    const c = this.base.getContext("2d")!;
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const k = tileAt(w, tx, ty);
        const b = biomeAt(w, tx, ty);
        c.fillStyle =
          k === "water" ? "#0f2f42" : k === "path" ? PATH[b] : TERRAIN[b];
        c.fillRect(tx, ty, 1, 1);
        const o = objectAt(w, tx, ty);
        if (o === "rockfall") {
          c.fillStyle = SEALED;
          c.fillRect(tx, ty, 1, 1);
        } else if (o === "rubble" && w.opened.has(ty * MAP_W + tx)) {
          // only the passes the alchemist dissolved; rubble also lies naturally in the ruins
          c.fillStyle = OPEN;
          c.fillRect(tx, ty, 1, 1);
        }
      }
    }
  }

  /** The corner radar: a window of the baked map centred on the alchemist. */
  paintWindow(
    target: HTMLCanvasElement,
    g: Game,
    spirits: Spirit[],
    foes: Enemy[] = [],
    radius = 34,
  ): void {
    const size = radius * 2 + 1;
    if (target.width !== size) {
      target.width = size;
      target.height = size;
    }
    const c = target.getContext("2d")!;
    const here = this.tileOf(g);
    c.clearRect(0, 0, size, size);
    c.drawImage(
      this.base,
      here.tx - radius,
      here.ty - radius,
      size,
      size,
      0,
      0,
      size,
      size,
    );
    const mark = (tx: number, ty: number, color: string): void => {
      c.fillStyle = color;
      c.fillRect(tx - here.tx + radius, ty - here.ty + radius, 1, 1);
    };
    for (const [i] of this.world.plots)
      mark(i % MAP_W, Math.floor(i / MAP_W), SOIL);
    for (const i of this.world.caches)
      if (!this.world.looted.has(i))
        mark(i % MAP_W, Math.floor(i / MAP_W), HOARD);
    for (const s of this.world.sinkholes) mark(s.tx, s.ty, MOUTH);
    for (const s of spirits)
      mark(Math.floor(s.x / TILE), Math.floor(s.y / TILE), SPIRIT_DOT);
    // Red on the radar means something with teeth is between you and home.
    for (const e of foes)
      mark(Math.floor(e.x / TILE), Math.floor(e.y / TILE), FOE);
    c.fillStyle = SELF;
    c.fillRect(radius - 1, radius - 1, 3, 3);
  }

  paint(
    target: HTMLCanvasElement,
    g: Game,
    spirits: Spirit[],
    foes: Enemy[] = [],
  ): void {
    target.width = MAP_W;
    target.height = MAP_H;
    const c = target.getContext("2d")!;
    c.drawImage(this.base, 0, 0);
    const stamp = (x: number, y: number, color: string, size: number): void => {
      const half = Math.floor(size / 2);
      c.fillStyle = color;
      c.fillRect(x - half, y - half, size, size);
    };
    for (const [i] of this.world.plots)
      stamp(i % MAP_W, Math.floor(i / MAP_W), SOIL, 1);
    for (const i of this.world.caches)
      if (!this.world.looted.has(i))
        stamp(i % MAP_W, Math.floor(i / MAP_W), HOARD, 1);
    for (const s of this.world.sinkholes) stamp(s.tx, s.ty, MOUTH, 2);
    for (const v of this.world.vaults) stamp(v.tx, v.ty, "#f2f7ff", 1);
    for (const s of spirits)
      stamp(Math.floor(s.x / TILE), Math.floor(s.y / TILE), SPIRIT_DOT, 1);
    for (const e of foes)
      stamp(Math.floor(e.x / TILE), Math.floor(e.y / TILE), FOE, 1);
    const here = this.tileOf(g);
    stamp(here.tx, here.ty, SELF, 3);
    const halfW = VIEW_W / TILE / 2;
    const halfH = VIEW_H / TILE / 2;
    c.strokeStyle = FRAME;
    c.lineWidth = 1;
    c.strokeRect(here.tx - halfW, here.ty - halfH, halfW * 2, halfH * 2);
  }

  tileOf(g: Game): { tx: number; ty: number } {
    return {
      tx: Math.floor((g.px + 8) / TILE),
      ty: Math.floor((g.py + 12) / TILE),
    };
  }

  name(g: Game): string {
    const { tx, ty } = this.tileOf(g);
    if (!inBounds(tx, ty)) return BIOME_NAME.thicket;
    return BIOME_NAME[biomeAt(this.world, tx, ty)];
  }
}
