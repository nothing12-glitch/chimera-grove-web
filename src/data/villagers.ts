import type { PackClip } from "../core/sheets";

/** The four faces of the hamlet. Each walks its own patch of the green. */
export type VillagerId = "marta" | "hryts" | "orysia" | "taras";

export type VillagerDef = {
  id: VillagerId;
  name: string;
  /** how far from home, in tiles, this one is willing to drift */
  radius: number;
  /** pixels per second */
  pace: number;
  idle: PackClip;
  walk: PackClip;
  /** the pack draws every citizen from one side; this is the side it looks at */
  faces: "left" | "right";
  lines: string[];
};

function citizen(
  folder: string,
  idleFile: string,
  walkFile: string,
): { idle: PackClip; walk: PackClip } {
  // Citizens live inside a 64-pixel cell with their boots on the bottom edge,
  // so both strips are cut to the same 32×32 body box as the alchemist.
  return {
    idle: {
      src: `entities/npcs/citizen_f/${folder}/idle/${idleFile}.png`,
      cell: 64,
      frames: 4,
      box: [16, 16, 32, 32],
    },
    walk: {
      src: `entities/npcs/citizen_f/${folder}/walk/${walkFile}.png`,
      cell: 64,
      frames: 6,
      box: [16, 16, 32, 32],
    },
  };
}

function adventurer(
  folder: string,
): { idle: PackClip; walk: PackClip } {
  // The knight, wizzard and rogue keep a whole 32-pixel cell when breathing and
  // a 64-pixel one when moving; cut the moving body down to its boots so both
  // frames share one anchor.
  return {
    idle: { src: `entities/npcs/${folder}/idle/Idle.png`, cell: 32, frames: 4 },
    walk: {
      src: `entities/npcs/${folder}/run/Run.png`,
      cell: 64,
      frames: 6,
      box: [16, 32, 32, 32],
    },
  };
}

const MARTA = citizen("peasant_a", "Idle", "Walk");
const HRYTS = citizen("tavern_a", "Idle_Side", "Walk_Side");
const ORYSIA = adventurer("wizzard");
const TARAS = adventurer("knight");

export const VILLAGERS: Record<VillagerId, VillagerDef> = {
  marta: {
    id: "marta",
    name: "Марта",
    radius: 5,
    pace: 20,
    ...MARTA,
    faces: "right",
    lines: [
      "Місячна Пелюстка любить вологий ґрунт. Полий звечора — і вранці вона вже інша.",
      "Не ору кам'янисту гряду: мотика тупиться, а земля ображається.",
      "Серп уночі — не зброя, а молитва. Головне — не запізнитися.",
      "Колись тут росла Шепотна Лоза. Тепер вона шепоче лише духам.",
    ],
  },
  hryts: {
    id: "hryts",
    name: "Гриць",
    radius: 4,
    pace: 17,
    ...HRYTS,
    faces: "right",
    lines: [
      "Вогонь не гасне, поки є кому розповідати історії. Сідай, алхіміку.",
      "Уночі за тином ходять химери. Я вже два дні не виходжу з-за столу.",
      "Порожній Капелюх тхне, як мокрий пес, але камінь він їсть краще за мене.",
      "Довіра духів — то як добре пиво: спочатку гірко, потім хочеться ще.",
    ],
  },
  orysia: {
    id: "orysia",
    name: "Орися",
    radius: 4,
    pace: 16,
    ...ORYSIA,
    faces: "left",
    lines: [
      "Казан показує те, що ти поклав. Поклади жменю — отримаєш ковток.",
      "Скляна Папороть росте там, де Коріння торкається сну.",
      "Зілля швидкості не робить тебе сміливішим. Лише швидшим.",
      "Коли побачиш Кореневого Володаря — не дивись йому в очі. Дивись на серп.",
    ],
  },
  taras: {
    id: "taras",
    name: "Тарас",
    radius: 5,
    pace: 22,
    ...TARAS,
    faces: "left",
    lines: [
      "Серп знімає п'ять ударів, але замах починай до стрибка.",
      "Орки на хребті бояться вогню. Не тому, що теплий, а тому що живий.",
      "Кістки в болоті встають щоночі. Їх не вбити назавжди, лише розкидати.",
      "Тримайся стежки. Коріння під землею чує кроки краще, ніж ти — його.",
    ],
  },
};

/** Every strip the hamlet needs, for the loader to fetch with the rest of the pack. */
export const VILLAGER_CLIPS: PackClip[] = Object.values(VILLAGERS).flatMap(
  (v) => [v.idle, v.walk],
);
