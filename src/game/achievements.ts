import { ACHIEVEMENTS, isUnlocked } from "../data/achievements";
import type { Game } from "./state";

/** A badge the alchemist has just earned, in the words the toast needs. */
export type Announce = { name: string; blurb: string };

/**
 * Every badge already satisfied but not yet congratulated. The ids live in the
 * save, so returning to a finished grove never repeats the applause.
 */
export function freshAchievements(g: Game): Announce[] {
  const out: Announce[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!isUnlocked(a, g.stats) || g.ach.includes(a.id)) continue;
    g.ach.push(a.id);
    out.push({ name: a.name, blurb: a.blurb });
  }
  return out;
}

/** Old saves have no badge list; unknown ids from a future build are dropped. */
export function achievementsFromSaved(ids: string[] | undefined): string[] {
  const known = new Set(ACHIEVEMENTS.map((a) => a.id));
  return (ids ?? []).filter((id) => known.has(id));
}
