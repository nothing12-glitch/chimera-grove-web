import { DEFAULT_DAY_MINUTES, setDayLength } from "./state";

/** Everything a player may change without touching the save file. */
export type Settings = {
  /** the screen jumps when the sickle bites or the ground gives way */
  shake: boolean;
  /** the little radar under the side panel */
  radar: boolean;
  /** the line under the alchemist that says what E will do */
  hints: boolean;
  /** real minutes one in-game day lasts */
  dayMinutes: number;
};

const KEY = "chimeragrove.settings.v1";

export const DEFAULT_SETTINGS: Settings = {
  shake: true,
  radar: true,
  hints: true,
  dayMinutes: DEFAULT_DAY_MINUTES,
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      shake: parsed.shake ?? DEFAULT_SETTINGS.shake,
      radar: parsed.radar ?? DEFAULT_SETTINGS.radar,
      hints: parsed.hints ?? DEFAULT_SETTINGS.hints,
      dayMinutes:
        parsed.dayMinutes && parsed.dayMinutes > 0
          ? parsed.dayMinutes
          : DEFAULT_SETTINGS.dayMinutes,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** The clock is the only setting the rules read through a function, so it is pushed in here. */
export function applySettings(s: Settings): void {
  setDayLength(s.dayMinutes);
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage blocked — the settings still hold for this sitting */
  }
  applySettings(s);
}
