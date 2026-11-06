import type { CropId } from "./crops";

export type PotionId = "dew" | "quintessence" | "lamp_oil" | "calm_wind";

export type PotionEffect = "speed" | "growth" | "light" | "calm";

export type PotionDef = {
  id: PotionId;
  name: string;
  latin: string;
  effect: PotionEffect;
  /** ingredients: harvested crops burned in the cauldron */
  needs: Partial<Record<CropId, number>>;
  /** seconds of real time the flask stays active; ignored by growth tonics */
  seconds: number;
  /** dawns of extra growth for every watered plot; ignored by timed flasks */
  dawns: number;
  /** the liquid, for HUD chips and splash particles */
  color: string;
  blurb: string;
};

export const POTIONS: Record<PotionId, PotionDef> = {
  dew: {
    id: "dew",
    name: "Роса Швидкості",
    latin: "Dew of Haste",
    effect: "speed",
    needs: { moonpetal: 3 },
    seconds: 45,
    dawns: 0,
    color: "#8fb7ff",
    blurb: "Три пелюстки, розтерті у росу. Ноги стають легші за вітер.",
  },
  quintessence: {
    id: "quintessence",
    name: "Квінтесенція Росту",
    latin: "Growth Quintessence",
    effect: "growth",
    needs: { ember_root: 2, glass_fern: 1 },
    seconds: 0,
    dawns: 2,
    color: "#f0a75c",
    blurb:
      "Жар кореня у склі папороті. Два світанки поспіль грядка росте вдвічі.",
  },
  lamp_oil: {
    id: "lamp_oil",
    name: "Лампадове Мастило",
    latin: "Lamp Oil",
    effect: "light",
    needs: { voidcap: 2 },
    seconds: 90,
    dawns: 0,
    color: "#cbb8ff",
    blurb: "Олія зі спор. Темрява Мережі відступає вдвічі далі.",
  },
  calm_wind: {
    id: "calm_wind",
    name: "Спокійний Вітер",
    latin: "Calm Wind",
    effect: "calm",
    needs: { whisper_vine: 2 },
    seconds: 90,
    dawns: 0,
    color: "#9fe3d6",
    blurb: "Лоза вміє лише шепотіти. Вітер повторює її спокій для приливу.",
  },
};

export const POTION_ORDER: PotionId[] = [
  "dew",
  "quintessence",
  "lamp_oil",
  "calm_wind",
];

export function canBrew(have: Record<CropId, number>, def: PotionDef): boolean {
  return Object.entries(def.needs).every(
    ([crop, qty]) => have[crop as CropId] >= (qty ?? 0),
  );
}

export function recipeText(def: PotionDef): string {
  const names: Record<CropId, string> = {
    moonpetal: "Місячна Пелюстка",
    ember_root: "Палаючий Корінь",
    glass_fern: "Скляна Папороть",
    voidcap: "Порожній Капелюх",
    whisper_vine: "Шепотна Лоза",
  };
  return Object.entries(def.needs)
    .map(([crop, qty]) => `${names[crop as CropId]} ×${qty}`)
    .join(" + ");
}
