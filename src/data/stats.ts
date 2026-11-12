import type { CropId } from "./crops";
import { CROP_ORDER } from "./crops";
import type { PotionId } from "./potions";
import { POTION_ORDER } from "./potions";

/**
 * What the grove remembers about the way you have played it. Every rule that
 * hands out a coin, a harvest or a wound also nudges one of these numbers, and
 * the achievements are nothing but thresholds over this object.
 */
export type Stats = {
  /** sunrises the alchemist has lived through */
  dawns: number;
  /** squares of earth turned over */
  tilled: number;
  /** seeds put into the ground */
  sown: number;
  /** watering-can pours onto a bed */
  watered: number;
  /** crops cut and put in the sack */
  harvested: number;
  /** harvest per culture, so "all five" is a real goal */
  crops: Record<CropId, number>;
  /** suncents ever earned, spending not deducted */
  earned: number;
  /** flasks pulled off the cauldron */
  brewed: number;
  /** brews per recipe */
  brews: Record<PotionId, number>;
  /** chimeras felled */
  felled: number;
  /** times the alchemist woke beside the house */
  wounds: number;
  /** deepest Root Network layer reached, counted from one */
  deepest: number;
  /** root knots untied */
  knots: number;
  /** rockfalls dissolved */
  passes: number;
  /** treats a spirit actually liked */
  treats: number;
  /** conversations in the hamlet */
  talked: number;
  /** tiles walked on foot */
  steps: number;
  /** spirits at full trust, refreshed on every save */
  friends: number;
  /** one, once the Root Lord has fallen */
  crown: number;
};

export function newStats(): Stats {
  const crops = {} as Record<CropId, number>;
  for (const c of CROP_ORDER) crops[c] = 0;
  const brews = {} as Record<PotionId, number>;
  for (const p of POTION_ORDER) brews[p] = 0;
  return {
    dawns: 0,
    tilled: 0,
    sown: 0,
    watered: 0,
    harvested: 0,
    crops,
    earned: 0,
    brewed: 0,
    brews,
    felled: 0,
    wounds: 0,
    deepest: 0,
    knots: 0,
    passes: 0,
    treats: 0,
    talked: 0,
    steps: 0,
    friends: 0,
    crown: 0,
  };
}

/** Old saves carry no score at all; fill the holes instead of trusting them. */
export function statsFromSaved(saved: Partial<Stats> | undefined): Stats {
  const fresh = newStats();
  if (!saved) return fresh;
  return {
    ...fresh,
    ...saved,
    crops: { ...fresh.crops, ...(saved.crops ?? {}) },
    brews: { ...fresh.brews, ...(saved.brews ?? {}) },
  };
}

/** Cultures actually harvested at least once — the denominator of "all five". */
export function cropsGrown(s: Stats): number {
  return CROP_ORDER.filter((c) => (s.crops[c] ?? 0) > 0).length;
}

/** Recipes actually brewed at least once. */
export function potionsBrewed(s: Stats): number {
  return POTION_ORDER.filter((p) => (s.brews[p] ?? 0) > 0).length;
}
