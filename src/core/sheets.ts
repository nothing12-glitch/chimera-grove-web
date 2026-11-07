/**
 * The grove is drawn from the Pixel Crawler pack (Anokolisa, free to use):
 * real 16×16 tiles instead of flat fills. Everything here is optional —
 * if a sheet never arrives, the renderer keeps its procedural art, so the
 * game runs offline, in tests and on a cold cache alike.
 */
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
