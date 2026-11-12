import {
  cropsGrown,
  potionsBrewed,
  type Stats,
} from "./stats";

/**
 * One threshold over the score. Nothing here knows about the game: the panel
 * and the unlocking toast both work from a Stats object alone, which is why
 * `npm run check:menu` can prove every badge is reachable without a browser.
 */
export type Achievement = {
  id: string;
  name: string;
  blurb: string;
  goal: number;
  value: (s: Stats) => number;
  /** how the number reads in the panel: plain count, tiles, layers… */
  unit?: string;
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_seed",
    name: "Перше зерно",
    blurb: "Посіяти будь-яку культуру.",
    goal: 1,
    value: (s) => s.sown,
  },
  {
    id: "tiller",
    name: "Роль",
    blurb: "Тридцять разів переорати землю.",
    goal: 30,
    value: (s) => s.tilled,
  },
  {
    id: "rain",
    name: "Дощ у лійці",
    blurb: "Полити грядки п'ятдесят разів.",
    goal: 50,
    value: (s) => s.watered,
  },
  {
    id: "harvest10",
    name: "Перші жнива",
    blurb: "Зібрати десять урожаїв.",
    goal: 10,
    value: (s) => s.harvested,
  },
  {
    id: "five_crops",
    name: "П'ять культур",
    blurb: "Хоча б раз зібрати кожну з п'яти культур гаю.",
    goal: 5,
    value: cropsGrown,
  },
  {
    id: "coins500",
    name: "Сонцязі на тилю",
    blurb: "Заробити загалом 500 сонцязь.",
    goal: 500,
    value: (s) => s.earned,
  },
  {
    id: "first_flask",
    name: "Перша фляга",
    blurb: "Зварити будь-яке зілля.",
    goal: 1,
    value: (s) => s.brewed,
  },
  {
    id: "four_fires",
    name: "Чотири вогні казана",
    blurb: "Спробувати всі чотири рецепти.",
    goal: 4,
    value: potionsBrewed,
  },
  {
    id: "first_blood",
    name: "Зуби ночі",
    blurb: "Валити першу химеру серпом.",
    goal: 1,
    value: (s) => s.felled,
  },
  {
    id: "hunter",
    name: "Мисливець гаю",
    blurb: "Валити тридцять істот.",
    goal: 30,
    value: (s) => s.felled,
  },
  {
    id: "knots",
    name: "Кореневий злодій",
    blurb: "Розв'язати десять кореневих вузликів.",
    goal: 10,
    value: (s) => s.knots,
  },
  {
    id: "three_passes",
    name: "Усі три ходи",
    blurb: "Роз'їсти пліснявою кожен із трьох завалів.",
    goal: 3,
    value: (s) => s.passes,
  },
  {
    id: "deep_five",
    name: "Серце Мережі",
    blurb: "Дійти до п'ятої глибини підземелля.",
    goal: 5,
    unit: "глибин",
    value: (s) => s.deepest,
  },
  {
    id: "crown",
    name: "Корону зрізано",
    blurb: "Валити Кореневого Володаря.",
    goal: 1,
    value: (s) => s.crown,
  },
  {
    id: "three_friends",
    name: "Троє друзів",
    blurb: "Довіра всіх трьох духів — три ◐.",
    goal: 3,
    value: (s) => s.friends,
  },
  {
    id: "neighbours",
    name: "Сусідство",
    blurb: "Поговорити з мешканцями гаю дванадцять разів.",
    goal: 12,
    value: (s) => s.talked,
  },
  {
    id: "walker",
    name: "Довга стежка",
    blurb: "Пройти пішки дві тисячі п'ятсот тайлів.",
    goal: 2500,
    unit: "тайлів",
    value: (s) => s.steps,
  },
  {
    id: "longliver",
    name: "Довгожитель",
    blurb: "Перечекати двадцять діб у гаю.",
    goal: 20,
    unit: "світанків",
    value: (s) => s.dawns,
  },
];

export function isUnlocked(a: Achievement, s: Stats): boolean {
  return a.value(s) >= a.goal;
}

/** The badge list for the panel, in a stable order, with progress attached. */
export type AchievementRow = {
  a: Achievement;
  value: number;
  unlocked: boolean;
};

export function achievementRows(s: Stats): AchievementRow[] {
  return ACHIEVEMENTS.map((a) => ({
    a,
    value: Math.min(a.value(s), a.goal),
    unlocked: a.value(s) >= a.goal,
  }));
}

export function unlockedCount(s: Stats): number {
  return ACHIEVEMENTS.filter((a) => a.value(s) >= a.goal).length;
}
