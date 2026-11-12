import type { CropId } from "./crops";
import type { BiomeId } from "./world";

export type EnemyId =
  | "wisp"
  | "marsh_husk"
  | "ridge_stalker"
  | "bog_orc"
  | "ridge_reaver"
  | "bone_chanter"
  | "root_crawler"
  | "spore_bloat"
  | "crypt_warden";

export type EnemyDef = {
  id: EnemyId;
  name: string;
  /** hit points the sickle has to take off */
  hp: number;
  /** art pixels per second */
  speed: number;
  /** hearts worth of damage on contact */
  damage: number;
  /** how many tiles away it stops wandering and comes for you */
  aggro: number;
  /** tiles it may roam from where it appeared */
  homeRadius: number;
  hover: boolean;
  coins: number;
  /** where this one belongs */
  biomes: BiomeId[];
  /** cave layers it crawls out of; empty means surface only */
  layers: number[];
  drop: { crop: CropId; chance: number };
};

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  wisp: {
    id: "wisp",
    name: "Лозовий Вогник",
    hp: 8,
    speed: 34,
    damage: 2,
    aggro: 5,
    homeRadius: 14,
    hover: true,
    coins: 9,
    biomes: ["thicket", "home"],
    layers: [],
    drop: { crop: "moonpetal", chance: 0.3 },
  },
  marsh_husk: {
    id: "marsh_husk",
    name: "Болотяна Шкаралупа",
    hp: 14,
    speed: 22,
    damage: 4,
    aggro: 4,
    homeRadius: 12,
    hover: false,
    coins: 16,
    biomes: ["marsh"],
    layers: [],
    drop: { crop: "ember_root", chance: 0.25 },
  },
  ridge_stalker: {
    id: "ridge_stalker",
    name: "Гребеневий Стежач",
    hp: 18,
    speed: 26,
    damage: 4,
    aggro: 5,
    homeRadius: 10,
    hover: false,
    coins: 22,
    biomes: ["ridge", "ruins"],
    layers: [],
    drop: { crop: "glass_fern", chance: 0.25 },
  },
  bog_orc: {
    id: "bog_orc",
    name: "Багняний Орк",
    hp: 16,
    speed: 25,
    damage: 4,
    aggro: 5,
    homeRadius: 10,
    hover: false,
    coins: 24,
    biomes: ["marsh"],
    layers: [],
    drop: { crop: "ember_root", chance: 0.3 },
  },
  ridge_reaver: {
    id: "ridge_reaver",
    name: "Хребтовий Рубака",
    hp: 22,
    speed: 20,
    damage: 5,
    aggro: 5,
    homeRadius: 9,
    hover: false,
    coins: 32,
    biomes: ["ridge", "ruins"],
    layers: [],
    drop: { crop: "glass_fern", chance: 0.3 },
  },
  bone_chanter: {
    id: "bone_chanter",
    name: "Кістяний Співун",
    hp: 12,
    speed: 28,
    damage: 3,
    aggro: 6,
    homeRadius: 9,
    hover: false,
    coins: 26,
    biomes: ["ruins"],
    layers: [],
    drop: { crop: "whisper_vine", chance: 0.2 },
  },
  root_crawler: {
    id: "root_crawler",
    name: "Кореневий Повзун",
    hp: 10,
    speed: 30,
    damage: 2,
    aggro: 6,
    homeRadius: 9,
    hover: false,
    coins: 12,
    biomes: [],
    layers: [0, 1, 2],
    drop: { crop: "voidcap", chance: 0.35 },
  },
  spore_bloat: {
    id: "spore_bloat",
    name: "Споровий Напух",
    hp: 22,
    speed: 18,
    damage: 5,
    aggro: 5,
    homeRadius: 8,
    hover: false,
    coins: 30,
    biomes: [],
    layers: [2, 3, 4],
    drop: { crop: "voidcap", chance: 0.6 },
  },
  crypt_warden: {
    id: "crypt_warden",
    name: "Склепний Страж",
    hp: 20,
    speed: 20,
    damage: 5,
    aggro: 5,
    homeRadius: 8,
    hover: false,
    coins: 34,
    biomes: [],
    layers: [3, 4],
    drop: { crop: "voidcap", chance: 0.4 },
  },
};

export const ENEMY_ORDER: EnemyId[] = [
  "wisp",
  "marsh_husk",
  "ridge_stalker",
  "bog_orc",
  "ridge_reaver",
  "bone_chanter",
  "root_crawler",
  "spore_bloat",
  "crypt_warden",
];

export const SICKLE_DAMAGE = 5;
export const HP_MAX = 20;
/** seconds the alchemist ignores damage after a hit */
export const HURT_LOCK = 0.9;

export type BossDef = {
  name: string;
  hp: number;
  speed: number;
  damage: number;
  coins: number;
};

/** The crown that rules Серце Мережі. */
export const BOSS: BossDef = {
  name: "Кореневий Володар",
  hp: 140,
  speed: 26,
  damage: 6,
  coins: 320,
};

/** Which species belongs to this patch of the world. */
export function enemiesForBiome(biome: BiomeId): EnemyId[] {
  return ENEMY_ORDER.filter((id) => ENEMIES[id].biomes.includes(biome));
}

export function enemiesForLayer(layer: number): EnemyId[] {
  return ENEMY_ORDER.filter((id) => ENEMIES[id].layers.includes(layer));
}
