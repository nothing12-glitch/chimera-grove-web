import type { Sprite } from "../core/sprites";
import {
  CROP_GROWING,
  CROP_SEED,
  CROP_SPROUT,
  MATURE_EMBER_ROOT,
  MATURE_GLASS_FERN,
  MATURE_MOONPETAL,
  MATURE_VOIDCAP,
  MATURE_WHISPER_VINE,
} from "./art";

export type CropId = "moonpetal" | "ember_root" | "glass_fern" | "voidcap" | "whisper_vine";

export type CropDef = {
  id: CropId;
  name: string;
  latin: string;
  /** growth points needed per visible stage */
  pointsPerStage: number;
  /** growth points at which the crop is harvestable (stage 3) */
  matureAt: number;
  seedCost: number;
  sellPrice: number;
  /** water drained from a plot each dawn */
  thirst: number;
  shapes: [Sprite, Sprite, Sprite, Sprite];
  palettes: [Record<string, string>, Record<string, string>, Record<string, string>, Record<string, string>];
  blurb: string;
};

const leaf = (a: string, d: string, k = "#1d2a18") => ({ a, d, k, c: a, b: a });

export const CROPS: Record<CropId, CropDef> = {
  moonpetal: {
    id: "moonpetal",
    name: "Місячна Пелюстка",
    latin: "Moonpetal",
    pointsPerStage: 1,
    matureAt: 3,
    seedCost: 12,
    sellPrice: 26,
    thirst: 1,
    shapes: [CROP_SEED, CROP_SPROUT, CROP_GROWING, MATURE_MOONPETAL],
    palettes: [
      { ...leaf("#4e7f8c", "#c9d8f5"), c: "#8fb7ff" },
      leaf("#4e7f8c", "#c9d8f5"),
      leaf("#4e7f8c", "#a8c6e8", "#182035"),
      { k: "#182035", a: "#4e7f8c", b: "#c9d8f5", c: "#7ea8ff", d: "#f2f7ff" },
    ],
    blurb: "Пелюстки світла вбирають місячне сяйво. Найпростіший початок для вигнанця.",
  },
  ember_root: {
    id: "ember_root",
    name: "Палаючий Корінь",
    latin: "Ember Root",
    pointsPerStage: 2,
    matureAt: 6,
    seedCost: 30,
    sellPrice: 74,
    thirst: 2,
    shapes: [CROP_SEED, CROP_SPROUT, CROP_GROWING, MATURE_EMBER_ROOT],
    palettes: [
      { ...leaf("#6f7f3a", "#e0c07a"), c: "#ffc45e" },
      leaf("#6f7f3a", "#e0c07a"),
      leaf("#6f7f3a", "#ffb95e", "#2b1106"),
      { k: "#2b1106", a: "#6f7f3a", b: "#e0603a", c: "#ffc45e", d: "#ffe9a8" },
    ],
    blurb: "Гарячий на дотик. Поливай двічі на день, інакше згасне.",
  },
  glass_fern: {
    id: "glass_fern",
    name: "Скляна Папороть",
    latin: "Glass Fern",
    pointsPerStage: 2,
    matureAt: 6,
    seedCost: 45,
    sellPrice: 108,
    thirst: 1,
    shapes: [CROP_SEED, CROP_SPROUT, CROP_GROWING, MATURE_GLASS_FERN],
    palettes: [
      { ...leaf("#4f9b8f", "#9fe3d6"), c: "#d8fff7" },
      leaf("#4f9b8f", "#9fe3d6"),
      leaf("#4f9b8f", "#d8fff7", "#1b3a3a"),
      { k: "#1b3a3a", a: "#4f9b8f", b: "#9fe3d6", c: "#d8fff7", d: "#6fc4b6" },
    ],
    blurb: "Прозорий, як льодовик. Цене тінь, а не сонце.",
  },
  voidcap: {
    id: "voidcap",
    name: "Порожній Капелюх",
    latin: "Voidcap",
    pointsPerStage: 3,
    matureAt: 9,
    seedCost: 60,
    sellPrice: 165,
    thirst: 1,
    shapes: [CROP_SEED, CROP_SPROUT, CROP_GROWING, MATURE_VOIDCAP],
    palettes: [
      { ...leaf("#6b5a8a", "#cfd6e8"), c: "#b487e8" },
      leaf("#6b5a8a", "#cfd6e8"),
      leaf("#6b5a8a", "#b487e8", "#150e26"),
      { k: "#150e26", a: "#cfd6e8", b: "#6b3fa0", c: "#b487e8", d: "#e0d0ff" },
    ],
    blurb: "Росте з міцелію Мережі Коренів. Довго, але дорого.",
  },
  whisper_vine: {
    id: "whisper_vine",
    name: "Шепотна Лоза",
    latin: "Whisper Vine",
    pointsPerStage: 3,
    matureAt: 9,
    seedCost: 80,
    sellPrice: 210,
    thirst: 2,
    shapes: [CROP_SEED, CROP_SPROUT, CROP_GROWING, MATURE_WHISPER_VINE],
    palettes: [
      { ...leaf("#5c8a4a", "#a9d17a"), c: "#e3d1ff" },
      leaf("#5c8a4a", "#a9d17a"),
      leaf("#5c8a4a", "#e3d1ff", "#241b2e"),
      { k: "#241b2e", a: "#5c8a4a", b: "#8f6fd6", c: "#e3d1ff", d: "#a9d17a" },
    ],
    blurb: "Передає чутки духам. Духи платять за це зерням.",
  },
};

export const CROP_ORDER: CropId[] = [
  "moonpetal",
  "ember_root",
  "glass_fern",
  "voidcap",
  "whisper_vine",
];
