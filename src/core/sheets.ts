/**
 * The grove is drawn from the Pixel Crawler pack (Anokolisa, free to use):
 * real 16×16 tiles instead of flat fills. Everything here is optional —
 * if a sheet never arrives, the renderer keeps its procedural art, so the
 * game runs offline, in tests and on a cold cache alike.
 */
import { markSource } from "./sprites";

const SHEETS = {
  floors: "floors.png",
  water: "water.png",
  dungeon: "dungeon.png",
  vegetation: "vegetation.png",
} as const;

export type SheetName = keyof typeof SHEETS;

/** A tile inside a sheet, addressed by its 16-pixel cell. */
export type TileRef = [number, number];

const images = new Map<SheetName, HTMLImageElement>();
const loaded = new Map<SheetName, boolean>();
const cut = new Map<string, HTMLCanvasElement>();

/** Kick this off as early as possible; the loading screen waits on it. */
export function loadArt(): void {
  for (const name of Object.keys(SHEETS) as SheetName[]) {
    const img = new Image();
    img.src = new URL(`art/${SHEETS[name]}`, document.baseURI).href;
    img.onload = () => {
      loaded.set(name, true);
    };
    img.onerror = () => {
      loaded.set(name, false);
    };
    images.set(name, img);
    loaded.set(name, false);
  }
}

/** True once every sheet we asked for has either loaded or failed. */
export function artSettled(): boolean {
  for (const name of Object.keys(SHEETS) as SheetName[])
    if (!images.get(name)?.complete) return false;
  return true;
}

/** The 16×16 canvas of one cell, or null when the sheet is not there. */
export function tile(
  name: SheetName,
  ref: TileRef,
  size = 16,
): HTMLCanvasElement | null {
  if (!loaded.get(name)) return null;
  const img = images.get(name)!;
  const key = `${name}:${ref[0]}:${ref[1]}:${size}`;
  const hit = cut.get(key);
  if (hit) return hit;
  const x = ref[0] * size;
  const y = ref[1] * size;
  if (x + size > img.width || y + size > img.height) return null;
  const cvs = document.createElement("canvas");
  cvs.width = size;
  cvs.height = size;
  const c = cvs.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  c.drawImage(img, x, y, size, size, 0, 0, size, size);
  cut.set(key, cvs);
  return cvs;
}

/** Any tile from a list, chosen by a stable per-tile number. */
export function tileSome(
  name: SheetName,
  refs: TileRef[],
  pick: number,
  size = 16,
): HTMLCanvasElement | null {
  if (!refs.length) return null;
  return tile(name, refs[Math.abs(Math.floor(pick)) % refs.length], size);
}

/**
 * One animation strip from the pack. The pack paints a creature inside a
 * square `cell` with a lot of air around it, so `box` says which part of the
 * cell the sprite really lives in; leaving it out takes the whole cell.
 */
export type PackClip = {
  /** path under art/pack/ */
  src: string;
  /** the square the pack draws each frame inside */
  cell: number;
  /** frame height when the strip is not square (fire is 32 wide, 48 tall) */
  cellH?: number;
  /** how many frames the strip holds, read left to right, then down */
  frames: number;
  /** the part of a cell worth drawing: [x, y, w, h] */
  box?: [number, number, number, number];
};

type PackSource = { img: HTMLImageElement; ready: boolean };

const packSheets = new Map<string, PackSource>();
const packCut = new Map<string, HTMLCanvasElement>();

function requestPack(src: string): void {
  if (packSheets.has(src)) return;
  const source: PackSource = { img: new Image(), ready: false };
  packSheets.set(src, source);
  source.img.onload = () => {
    source.ready = true;
  };
  source.img.onerror = () => {
    source.ready = false;
  };
  source.img.src = new URL(`art/pack/${src}`, document.baseURI).href;
}

/** Ask for every strip the game means to play, alongside the tile sheets. */
export function loadPack(clips: readonly PackClip[]): void {
  for (const clip of clips) requestPack(clip.src);
}

/** Static sheets (trees, rocks, buildings) have no grid; ask for them by path. */
export function loadPackSheets(srcs: readonly string[]): void {
  for (const src of srcs) requestPack(src);
}

/** True once every strip has either arrived or failed. */
export function packSettled(): boolean {
  for (const source of packSheets.values()) if (!source.img.complete) return false;
  return true;
}

/**
 * Frame `i` of a strip, cut to its box. Null until the sheet has arrived, so
 * the renderer can keep its procedural drawing and swap over on its own.
 */
export function packFrame(
  clip: PackClip,
  i: number,
): HTMLCanvasElement | null {
  const source = packSheets.get(clip.src);
  if (!source?.ready) return null;
  const img = source.img;
  const cellH = clip.cellH ?? clip.cell;
  if (img.width < clip.cell || img.height < cellH) return null;
  const perRow = Math.floor(img.width / clip.cell);
  const frame = ((i % clip.frames) + clip.frames) % clip.frames;
  const bx = clip.box ? clip.box[0] : 0;
  const by = clip.box ? clip.box[1] : 0;
  const bw = clip.box ? clip.box[2] : clip.cell;
  const bh = clip.box ? clip.box[3] : cellH;
  const key = `${clip.src}:${frame}:${bx}:${by}:${bw}:${bh}`;
  const hit = packCut.get(key);
  if (hit) return hit;
  if (frame >= perRow * Math.floor(img.height / cellH)) return null;
  const x = (frame % perRow) * clip.cell + bx;
  const y = Math.floor(frame / perRow) * cellH + by;
  if (x + bw > img.width || y + bh > img.height) return null;
  const cvs = document.createElement("canvas");
  cvs.width = bw;
  cvs.height = bh;
  const c = cvs.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  c.drawImage(img, x, y, bw, bh, 0, 0, bw, bh);
  markSource(cvs);
  packCut.set(key, cvs);
  return cvs;
}

/** A pixel rectangle inside a static sheet: [x, y, w, h]. */
export type PackRect = [number, number, number, number];

/**
 * Any hand-placed prop — a whole tree, a boulder, a door — cut out by pixels.
 * The pack lays these out by eye rather than on a grid, so the caller names
 * the exact rectangle. Cached like every other cut frame.
 */
export function packRect(src: string, rect: PackRect): HTMLCanvasElement | null {
  const source = packSheets.get(src);
  if (!source?.ready) return null;
  const img = source.img;
  const [x, y, w, h] = rect;
  if (x < 0 || y < 0 || w <= 0 || h <= 0) return null;
  if (x + w > img.width || y + h > img.height) return null;
  const key = `${src}|${x},${y},${w},${h}`;
  const hit = packCut.get(key);
  if (hit) return hit;
  const cvs = document.createElement("canvas");
  cvs.width = w;
  cvs.height = h;
  const c = cvs.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  c.drawImage(img, x, y, w, h, 0, 0, w, h);
  markSource(cvs);
  packCut.set(key, cvs);
  return cvs;
}
