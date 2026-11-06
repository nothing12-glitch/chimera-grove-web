/** Cheap deterministic 32-bit hash + PRNG so ground scatter is stable across reloads. */
export function hash2(x: number, y: number, seed = 0): number {
  let h = seed ^ 0x9e3779b9;
  h = Math.imul(h ^ (x * 0x85ebca6b), 0xc2b2ae35);
  h ^= h >>> 13;
  h = Math.imul(h ^ (y * 0x27d4eb2d), 0x165667b1);
  h ^= h >>> 16;
  return h >>> 0;
}

export function rand01(x: number, y: number, seed = 0): number {
  return hash2(x, y, seed) / 0xffffffff;
}

export function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
