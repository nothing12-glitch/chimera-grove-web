export type Sprite = {
  w: number;
  h: number;
  rows: string[];
  pal: Record<string, string>;
};

const cache = new Map<string, HTMLCanvasElement>();
/** Same-size sprites must not share a flipped cache entry. */
const srcIds = new WeakMap<HTMLCanvasElement, number>();
let srcCount = 0;

export function buildSprite(key: string, sprite: Sprite): HTMLCanvasElement {
  const hit = cache.get(key);
  if (hit) return hit;
  const cvs = document.createElement("canvas");
  cvs.width = sprite.w;
  cvs.height = sprite.h;
  const ctx = cvs.getContext("2d")!;
  const img = ctx.createImageData(sprite.w, sprite.h);
  for (let y = 0; y < sprite.h; y++) {
    const row = sprite.rows[y] ?? "";
    for (let x = 0; x < sprite.w; x++) {
      const ch = row[x] ?? ".";
      if (ch === "." || ch === " ") continue;
      const color = sprite.pal[ch];
      if (!color)
        throw new Error(
          `sprite "${key}": no palette entry for "${ch}" at ${x},${y}`,
        );
      const i = (y * sprite.w + x) * 4;
      const c = parseHex(color);
      img.data[i] = c[0];
      img.data[i + 1] = c[1];
      img.data[i + 2] = c[2];
      img.data[i + 3] =
        color.length === 9 ? parseInt(color.slice(7, 9), 16) : 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  cache.set(key, cvs);
  srcIds.set(cvs, ++srcCount);
  return cvs;
}

const hexCache = new Map<string, [number, number, number, number]>();

/**
 * A canvas cut somewhere else (a pack frame, say) still needs an id before
 * flipX or silhouette can cache its copy — otherwise two different sprites of
 * the same size would share one flipped result.
 */
export function markSource(src: HTMLCanvasElement): void {
  if (!srcIds.has(src)) srcIds.set(src, ++srcCount);
}

function parseHex(hex: string): [number, number, number, number] {
  const hit = hexCache.get(hex);
  if (hit) return hit;
  const body = hex.slice(1);
  const out: [number, number, number, number] = [
    parseInt(body.slice(0, 2), 16),
    parseInt(body.slice(2, 4), 16),
    parseInt(body.slice(4, 6), 16),
    255,
  ];
  hexCache.set(hex, out);
  return out;
}

/** Repaint a sprite with a different palette (same pixel shape). */
export function buildTinted(
  key: string,
  sprite: Sprite,
  pal: Record<string, string>,
): HTMLCanvasElement {
  return buildSprite(key, { ...sprite, pal });
}

export function flipX(src: HTMLCanvasElement): HTMLCanvasElement {
  const key = `flip:${srcIds.get(src) ?? 0}:${src.width}x${src.height}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const cvs = document.createElement("canvas");
  cvs.width = src.width;
  cvs.height = src.height;
  const ctx = cvs.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.translate(src.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  cache.set(key, cvs);
  srcIds.set(cvs, ++srcCount);
  return cvs;
}

/** The sprite's shape filled with one flat colour — the white of a landed hit. */
export function silhouette(
  src: HTMLCanvasElement,
  color: string,
): HTMLCanvasElement {
  const key = `flat:${srcIds.get(src) ?? 0}:${color}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const cvs = document.createElement("canvas");
  cvs.width = src.width;
  cvs.height = src.height;
  const ctx = cvs.getContext("2d")!;
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, src.width, src.height);
  cache.set(key, cvs);
  srcIds.set(cvs, ++srcCount);
  return cvs;
}
