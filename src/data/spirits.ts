import {
  ASH_FOX,
  ASH_FOX_STEP,
  GLASS_MOTH,
  GLASS_MOTH_W,
  MOSS_BOAR,
  MOSS_BOAR_STEP,
} from "./art";
import type { CropId } from "./crops";
import type { Sprite } from "../core/sprites";

export type SpiritId = "moss_boar" | "glass_moth" | "ash_fox";

export const TRUST_MAX = 3;

export type SpiritDef = {
  id: SpiritId;
  name: string;
  latin: string;
  blurb: string;
  /** [idle, step] */
  frames: [Sprite, Sprite];
  /** the art looks to the left, so walking right needs a mirror */
  facesLeft: boolean;
  /** moths drift a head above the grass */
  hover: boolean;
  favorite: CropId;
  homeRadius: number;
  speed: number;
  /** gifted the first time trust reaches 2, then 3 */
  gifts: [CropId, CropId];
};

export const SPIRIT_ORDER: SpiritId[] = ["moss_boar", "glass_moth", "ash_fox"];

export const SPIRITS: Record<SpiritId, SpiritDef> = {
  moss_boar: {
    id: "moss_boar",
    name: "Моховий Веприк",
    latin: "Moss Boarlet",
    blurb:
      "Химерний порося, на спині якого росте папороть. Риючись у листі, піднімає родючий ґрунт.",
    frames: [MOSS_BOAR, MOSS_BOAR_STEP],
    facesLeft: true,
    hover: false,
    favorite: "ember_root",
    homeRadius: 7,
    speed: 26,
    gifts: ["ember_root", "glass_fern"],
  },
  glass_moth: {
    id: "glass_moth",
    name: "Скляна Міль",
    latin: "Glass Moth",
    blurb:
      "Крила з тонкого листя скляної папороті. Сяє над грядками до самого ранку.",
    frames: [GLASS_MOTH, GLASS_MOTH_W],
    facesLeft: false,
    hover: true,
    favorite: "moonpetal",
    homeRadius: 9,
    speed: 34,
    gifts: ["glass_fern", "moonpetal"],
  },
  ash_fox: {
    id: "ash_fox",
    name: "Попелястий Лис",
    latin: "Ash Fox",
    blurb:
      "Лис із холодного вугілля; хвіст ще пам'ятає вогонь. Нишпорить ніччю й стереже зерносховище.",
    frames: [ASH_FOX, ASH_FOX_STEP],
    facesLeft: true,
    hover: false,
    favorite: "voidcap",
    homeRadius: 8,
    speed: 30,
    gifts: ["voidcap", "whisper_vine"],
  },
};
