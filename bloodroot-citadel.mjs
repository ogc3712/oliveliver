import {
  GAME_TITLE,
  WORLD,
  FLUIDS,
  WEAPON_FAMILIES,
  WEAPONS,
  ITEMS,
  ITEM_ICON_SPECS,
  CLASSES,
  GEAR_SLOTS,
  ENEMIES,
  BOSSES,
  ROOMS,
  getRoom,
  assertDataIntegrity
} from "./bloodroot-citadel-data.mjs";
import {
  initAudio,
  installAudioUnlock,
  setMusicEnabled,
  setSfxEnabled,
  startMusic,
  stopMusic,
  sfx
} from "./bloodroot-audio.mjs";
import { bloodrootAudioLoop, bloodrootBossAudioLoop, castleWarAudioLoop, swampBogAudioLoop } from "./bloodroot-music-notes.mjs";
import {
  AMBIENT_MOTES,
  MOSS_DUST,
  STONE_CHIPS,
  CLASS_ABILITY_ACCENT_COLORS,
  KNIFE_BREAK_BURST
} from "./bloodroot-particle-recipes.mjs";

assertDataIntegrity();

document.body.dataset.build = "boss-arena-no-platforms-v108";

const forestOfHopeAudioLoop = {
  ...bloodrootAudioLoop,
  title: "Forest of Hope",
  assetSrc: "./assets/audio/forest-of-hope.mp3",
  fallbackLoop: bloodrootAudioLoop
};
const bossBattleAudioLoop = {
  ...bloodrootBossAudioLoop,
  title: "Boss Battle",
  assetSrc: "./assets/audio/boss-battle.wav",
  fallbackLoop: bloodrootBossAudioLoop
};

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

function loadAssetImage(src) {
  const image = new Image();
  image.loaded = false;
  image.onload = () => {
    image.loaded = true;
  };
  image.onerror = () => {
    image.loaded = false;
  };
  image.src = src;
  return image;
}

const artAssets = {
  player: loadAssetImage("./assets/sprites/random-guy-sprite-game-v2-sheet.png"),
  ground: loadAssetImage("./assets/tiles/mossy-ruin-ground-v2-tile.png"),
  underfloor: loadAssetImage("./assets/tiles/mossy-ruin-underfloor-v1-tile.png")
};
const USE_PLAYER_SPRITE_ASSET = false;

const W = WORLD.canvasWidth;
const H = WORLD.canvasHeight;
const TAU = Math.PI * 2;
const AIM_ORBIT_DISTANCE = 132;
const MIN_AIM_DISTANCE = 90;
const MAX_AIM_DISTANCE = 168;
const AIM_RADIAL_PULL = 0.2;
const AIM_RADIAL_CONTROL = 0.28;
const AIM_ORBIT_TURN_RATE = 1.18;
const TOUCH_STICK_DEADZONE = 0.16;
const INTERACT_HINT_RADIUS = 178;
const INTERACT_USE_RADIUS = 78;
const EXIT_HINT_RADIUS = 190;
const EXIT_USE_RADIUS = 82;
const PIXEL_FONT = '"Press Start 2P", "Courier New", Consolas, monospace';
const DESKTOP_PARTICLE_BUDGET = 260;
const MOBILE_PARTICLE_BUDGET = 180;
const WORLD_EDGE_OVERSCAN = 900;
const RUINS_CHEST_LOOT = "diggersAmulet";
const STARTING_COINS = 90;
const SANDBOX_COINS = 999999;
const SAVE_STORAGE_KEY = "randomGaeme.saveSlots.v1";
const SAVE_SLOT_COUNT = 3;
const CHALLENGE_ENEMY_MULTIPLIER = 1.5;
const CHALLENGE_PLAYER_DAMAGE_SCALE = 2 / 3;
const BASIC_STAT_POINTS_PER_LEVEL = 3;
const MAX_BASIC_HP_REGEN = 3;
const BASIC_STAT_DEFS = Object.freeze({
  maxHp: {
    label: "Max HP",
    short: "+5 HP",
    perPoint: 5,
    desc: "More room for mistakes before harder rooms."
  },
  damage: {
    label: "Weapon Damage",
    short: "+1 DMG",
    perPoint: 1,
    desc: "Raises basic weapon hit damage."
  },
  stamina: {
    label: "Max Stamina",
    short: "+5 STA",
    perPoint: 5,
    desc: "More attacks, rolls, and ranged pressure."
  },
  staminaRegen: {
    label: "Stamina Recovery",
    short: "+3/s",
    perPoint: 3,
    desc: "Recover faster after committing attacks."
  },
  hpRegen: {
    label: "HP Regen",
    short: "+0.25/s",
    perPoint: 0.25,
    desc: "Slow recovery between hits. Basic stat cap: 3 HP/s."
  }
});
const BASIC_STAT_ORDER = Object.freeze(["maxHp", "damage", "stamina", "staminaRegen", "hpRegen"]);
const MERCHANT_STOCK = [
  { itemId: "knightHelm", price: 35 },
  { itemId: "knightChestplate", price: 60 },
  { itemId: "knightGauntlets", price: 32 },
  { itemId: "knightGreaves", price: 42 },
  { itemId: "knightBoots", price: 32 },
  { itemId: "sunkenGuardMask", price: 42 },
  { itemId: "sunkenGuardMail", price: 68 },
  { itemId: "sunkenGuardBracers", price: 38 },
  { itemId: "sunkenGuardGreaves", price: 48 },
  { itemId: "sunkenGuardTreads", price: 40 },
  { itemId: "brawlerWraps", price: 38 },
  { itemId: "trainingBow", price: 48 },
  { itemId: "apprenticeStaff", price: 86 },
  { itemId: "ruinDagger", price: 44 },
  { itemId: "ruinAxe", price: 58 },
  { itemId: "twinRuinBlades", price: 62 },
  { itemId: "knightSword", price: 72 },
  { itemId: "knightGreatsword", price: 96 },
  { itemId: "ironSpear", price: 68 },
  { itemId: "stoneHammer", price: 82 },
  { itemId: "handCrossbow", price: 74 },
  { itemId: "sparkWand", price: 76 },
  { itemId: "sunkenSaber", price: 78 },
  { itemId: "sunkenPike", price: 72 },
  { itemId: "sunkenArbalest", price: 88 },
  { itemId: "sunkenFang", price: 66 }
];
const WARDEN_UNLOCK_STOCK = [
  { itemId: "ironWardensSigil", price: 680 },
  { itemId: "oathkeeperArmor", price: 940 }
];
const SANDBOX_STOCK = Object.values(ITEMS)
  .filter((item) => item.type === "weapon" || item.type === "gear")
  .map((item) => ({
    itemId: item.id,
    price: MERCHANT_STOCK.find((entry) => entry.itemId === item.id)?.price ?? {
      story: 1,
      starter: 5,
      common: 8,
      rare: 14,
      shop: 10
    }[item.rarity] ?? 10
  }));
const SELL_RARITY_VALUE = {
  starter: 10,
  common: 16,
  rare: 34,
  shop: 22
};
const MOB_DROP_TABLE = {
  rootMote: { itemId: "wingedChestplate", chance: 0.1 },
  rootCrawler: { itemId: "bugChargeMod", chance: 0.05 },
  rootWorm: { itemId: "dirt", chance: 1 / 3 },
  hugeLobster: [
    { itemId: "sunkenArbalest", chance: 0.08 },
    { itemId: "sunkenGuardBracers", chance: 0.06 }
  ],
  alligator: [
    { itemId: "sunkenFang", chance: 0.08 },
    { itemId: "sunkenGuardGreaves", chance: 0.06 }
  ],
  seaJelly: [
    { itemId: "sunkenGuardTreads", chance: 0.08 },
    { itemId: "sunkenGuardMask", chance: 0.06 }
  ],
  drownedKnight: [
    { itemId: "sunkenPike", chance: 0.08 },
    { itemId: "sunkenGuardMail", chance: 0.06 }
  ],
  castleKnight: [
    { itemId: "dentedGuardHelm", chance: 0.1 },
    { itemId: "shieldHabitMod", chance: 0.06 },
    { itemId: "guardMace", chance: 0.08 }
  ],
  castleArcher: [
    { itemId: "guardBow", chance: 0.1 },
    { itemId: "quickNockMod", chance: 0.06 }
  ],
  gargoyle: [
    { itemId: "gargoyleClaw", chance: 0.1 },
    { itemId: "stoneWingHabitMod", chance: 0.06 }
  ],
  spikedBrute: [
    { itemId: "spikedPauldron", chance: 0.1 },
    { itemId: "spikeRetortMod", chance: 0.06 }
  ]
};
const ENEMY_COIN_VALUE = {
  rootCrawler: [5, 9],
  rootMote: [7, 12],
  rootWorm: [8, 14],
  hugeLobster: [10, 18],
  alligator: [11, 19],
  seaJelly: [8, 14],
  drownedKnight: [10, 18],
  castleKnight: [12, 20],
  castleArcher: [10, 18],
  gargoyle: [13, 22],
  spikedBrute: [16, 26]
};
const ENEMY_XP = {
  rootCrawler: 7,
  rootMote: 9,
  rootWorm: 10,
  hugeLobster: 13,
  alligator: 14,
  seaJelly: 11,
  drownedKnight: 13,
  castleKnight: 16,
  castleArcher: 14,
  gargoyle: 18,
  spikedBrute: 22
};
const CASTLE_GATE_ROOM_ID = "splitArch";
const SWAMP_GATE_ROOM_ID = "swampGate";
const SWAMP_ROOM_IDS = new Set(["swampGate", "marshCrossing", "drownedCauseway", "isletGauntlet", "redWolfDen"]);
const CASTLE_ROOM_IDS = new Set(["splitArch", "outerGateHall", "wallWalk", "gargoyleRoofline", "spikedArmory", "kingsHallApproach", "ironWardenArena"]);
const BIOME_SAVE_ROOMS = new Set(["swampGate", "splitArch"]);
const STORY_START_POINTS = [
  { id: "beginning", label: "Beginning", roomId: "wakingStones", note: "Full run" },
  { id: "swamp", label: "Swamp Gate", roomId: SWAMP_GATE_ROOM_ID, note: "Skip to marsh" },
  { id: "castle", label: "Castle Gate", roomId: CASTLE_GATE_ROOM_ID, note: "Skip to keep" }
];
const RANGED_SECONDARY_FAMILIES = new Set(["bow", "crossbow", "wand", "scepter"]);
const COMBO_RESET_TIME = 0.78;
const DEFAULT_COMBO_STEPS = [
  { name: "Cut", kind: "slash", sweepStart: -1, sweepEnd: 1, activeScale: 1.08 },
  { name: "Return Cut", kind: "slash", sweepStart: 1, sweepEnd: -1, damageScale: 1.05, windScale: 0.9 },
  { name: "Forward Jab", kind: "jab", reachScale: 1.12, damageScale: 1.14, cooldownScale: 1.06, staminaScale: 1.08, activeScale: 0.88 }
];
const WEAPON_FAMILY_COMBOS = {
  sword: [
    { name: "Clean Cut", kind: "slash", sweepStart: -0.92, sweepEnd: 0.86, activeScale: 1.08, arcScale: 0.94 },
    { name: "Return Edge", kind: "slash", sweepStart: 0.76, sweepEnd: -0.98, damageScale: 1.06, windScale: 0.92 },
    { name: "Point Thrust", kind: "jab", reachScale: 1.24, damageScale: 1.2, cooldownScale: 1.1, staminaScale: 1.08, activeScale: 0.82, thickness: 10 }
  ],
  axe: [
    { name: "Heavy Cleave", kind: "slash", sweepStart: -0.72, sweepEnd: 0.82, damageScale: 1.04, staminaScale: 1.04, windScale: 1.08, activeScale: 0.92, reachScale: 0.95 },
    { name: "Hook Chop", kind: "slash", sweepStart: 0.48, sweepEnd: -0.92, damageScale: 1.1, reachScale: 0.92, arcScale: 0.82, thickness: 17 },
    { name: "Root Splitter", kind: "slash", sweepStart: -1.18, sweepEnd: 0.82, damageScale: 1.35, cooldownScale: 1.16, staminaScale: 1.18, windScale: 1.18, activeScale: 1.16, thickness: 21 }
  ],
  great: [
    { name: "Drag Swing", kind: "slash", sweepStart: 0.96, sweepEnd: -0.62, damageScale: 0.96, staminaScale: 1.05, windScale: 1.18, activeScale: 1.24, recoverScale: 1.08, thickness: 22 },
    { name: "Overhead Drop", kind: "slash", sweepStart: -1.25, sweepEnd: 0.55, damageScale: 1.14, staminaScale: 1.1, windScale: 1.26, activeScale: 1.08, thickness: 24 },
    { name: "Crushing Drive", kind: "jab", reachScale: 1.18, damageScale: 1.34, cooldownScale: 1.18, staminaScale: 1.16, activeScale: 1.08, thickness: 26 }
  ],
  dagger: [
    { name: "Quick Stab", kind: "jab", reachScale: 0.82, cooldownScale: 0.84, activeScale: 0.72, thickness: 7 },
    { name: "Back Slice", kind: "slash", sweepStart: 0.46, sweepEnd: -0.5, damageScale: 1.04, cooldownScale: 0.88, arcScale: 0.66, thickness: 7 },
    { name: "Knife Lunge", kind: "jab", reachScale: 1.18, damageScale: 1.22, cooldownScale: 1.02, windScale: 0.86, activeScale: 0.7, thickness: 8 }
  ],
  punching: [
    { name: "Jab", kind: "jab", angleOffset: -0.08, reachScale: 0.78, cooldownScale: 0.82, activeScale: 0.7, thickness: 12 },
    { name: "Cross", kind: "jab", angleOffset: 0.08, reachScale: 0.88, damageScale: 1.08, cooldownScale: 0.86, activeScale: 0.72, thickness: 13 },
    { name: "Uppercut", kind: "slash", sweepStart: 0.7, sweepEnd: -1.12, reachScale: 0.98, damageScale: 1.24, cooldownScale: 1.04, activeScale: 0.78, thickness: 16 }
  ],
  spear: [
    { name: "Long Jab", kind: "jab", reachScale: 1.12, damageScale: 0.95, activeScale: 0.78, thickness: 8 },
    { name: "High Pick", kind: "jab", angleOffset: -0.24, reachScale: 1.18, damageScale: 1.05, windScale: 0.92, thickness: 8 },
    { name: "Skewer", kind: "jab", reachScale: 1.42, damageScale: 1.26, cooldownScale: 1.12, activeScale: 0.82, thickness: 10 }
  ],
  dual: [
    { name: "Left Cut", kind: "slash", sweepStart: -0.55, sweepEnd: 0.72, cooldownScale: 0.88, activeScale: 0.82, thickness: 9 },
    { name: "Right Cut", kind: "slash", sweepStart: 0.72, sweepEnd: -0.55, damageScale: 1.06, cooldownScale: 0.88, activeScale: 0.82, thickness: 9 },
    { name: "Cross Slash", kind: "slash", sweepStart: -0.96, sweepEnd: 0.96, damageScale: 1.24, cooldownScale: 1.04, staminaScale: 1.12, activeScale: 0.96, thickness: 14 }
  ],
  bow: [
    { name: "Loose Arrow", kind: "shot", projectileCount: 1, cooldownScale: 0.9, windScale: 0.9 },
    { name: "Split Nock", kind: "shot", projectileCount: 2, projectileSpread: 0.11, damageScale: 0.82, staminaScale: 1.1, windScale: 1.05 },
    { name: "Piercing Arrow", kind: "shot", projectileCount: 1, damageScale: 1.25, pierceBonus: 1, projectileKind: "piercing", cooldownScale: 1.1, windScale: 1.24 }
  ],
  crossbow: [
    { name: "Bolt", kind: "shot", projectileCount: 1, windScale: 1.08, recoverScale: 1.08 },
    { name: "Double Tap", kind: "shot", projectileCount: 2, projectileSpread: 0.06, damageScale: 0.78, staminaScale: 1.08, windScale: 0.92 },
    { name: "Heavy Bolt", kind: "shot", projectileCount: 1, damageScale: 1.32, pierceBonus: 1, projectileKind: "bolt", cooldownScale: 1.12, windScale: 1.25, projectileRadiusScale: 1.16 }
  ],
  wand: [
    { name: "Wand Spark", kind: "shot", projectileCount: 1, cooldownScale: 0.84, windScale: 0.78, activeScale: 0.8 },
    { name: "Fork Spark", kind: "shot", projectileCount: 2, projectileSpread: 0.14, damageScale: 0.76, cooldownScale: 0.9, windScale: 0.86 },
    { name: "Bright Spark", kind: "shot", projectileCount: 1, damageScale: 1.34, projectileRadiusScale: 1.2, cooldownScale: 1.02, staminaScale: 1.1, windScale: 1.02 }
  ],
  scepter: [
    { name: "Heavy Spark", kind: "shot", projectileCount: 1, projectileRadiusScale: 1.08, windScale: 1.16, recoverScale: 1.08 },
    { name: "Twin Burst", kind: "shot", projectileCount: 2, projectileSpread: 0.16, damageScale: 0.76, staminaScale: 1.12, windScale: 1.08 },
    { name: "Ruin Bloom", kind: "shot", projectileCount: 1, damageScale: 1.42, projectileRadiusScale: 1.42, cooldownScale: 1.16, staminaScale: 1.2, windScale: 1.3, recoverScale: 1.12 }
  ]
};
const WEAPON_COMBOS = {
  huntingKnife: [
    { name: "Quick Stab", kind: "jab", reachScale: 0.95, cooldownScale: 0.94 },
    { name: "Low Slice", kind: "slash", sweepStart: 0.65, sweepEnd: -0.85, damageScale: 1.03 },
    { name: "Knife Lunge", kind: "jab", reachScale: 1.18, damageScale: 1.2, cooldownScale: 1.08 }
  ],
  brokenKnife: [
    { name: "Short Poke", kind: "jab", reachScale: 0.9 },
    { name: "Frayed Cut", kind: "slash", sweepStart: -0.7, sweepEnd: 0.65, damageScale: 1.05 },
    { name: "Desperate Jab", kind: "jab", reachScale: 1.08, damageScale: 1.18, cooldownScale: 1.1 }
  ],
  ruinDagger: [
    { name: "Dagger Prick", kind: "jab", reachScale: 0.95, cooldownScale: 0.92 },
    { name: "Reverse Cut", kind: "slash", sweepStart: 0.8, sweepEnd: -0.75, damageScale: 1.05 },
    { name: "Deep Jab", kind: "jab", reachScale: 1.24, damageScale: 1.22, cooldownScale: 1.12 }
  ],
  rustySword: [
    { name: "Down Cut", kind: "slash", sweepStart: -1, sweepEnd: 1 },
    { name: "Rising Cut", kind: "slash", sweepStart: 1, sweepEnd: -1, damageScale: 1.05 },
    { name: "Rust Thrust", kind: "jab", reachScale: 1.18, damageScale: 1.18, cooldownScale: 1.08 }
  ],
  knightSword: [
    { name: "Knight Cut", kind: "slash", sweepStart: -1, sweepEnd: 0.85, damageScale: 1.02 },
    { name: "Back Edge", kind: "slash", sweepStart: 0.9, sweepEnd: -1, damageScale: 1.08 },
    { name: "Guard Thrust", kind: "jab", reachScale: 1.2, damageScale: 1.2, cooldownScale: 1.1 }
  ],
  knightGreatsword: [
    { name: "Slash Up", kind: "slash", sweepStart: 1, sweepEnd: -1, damageScale: 0.96, staminaScale: 1.02 },
    { name: "Slash Down", kind: "slash", sweepStart: -1, sweepEnd: 1, damageScale: 1.08, staminaScale: 1.08 },
    { name: "Forward Jab", kind: "jab", reachScale: 1.28, damageScale: 1.22, cooldownScale: 1.16, staminaScale: 1.14, thickness: 16 }
  ],
  ironSpear: [
    { name: "Long Jab", kind: "jab", reachScale: 1.02, damageScale: 0.95 },
    { name: "High Pick", kind: "jab", angleOffset: -0.18, reachScale: 1.08, damageScale: 1.05 },
    { name: "Skewer", kind: "jab", reachScale: 1.34, damageScale: 1.26, cooldownScale: 1.12, thickness: 10 }
  ],
  stoneHammer: [
    { name: "Side Bash", kind: "slash", sweepStart: -0.85, sweepEnd: 0.85, damageScale: 0.95 },
    { name: "Back Bash", kind: "slash", sweepStart: 0.85, sweepEnd: -0.85, damageScale: 1.03 },
    { name: "Stone Shove", kind: "jab", reachScale: 1.04, damageScale: 1.3, cooldownScale: 1.18, staminaScale: 1.12, thickness: 24 }
  ],
  guardMace: [
    { name: "Heavy Swing", kind: "slash", sweepStart: -0.82, sweepEnd: 0.88, damageScale: 1.02, windScale: 1.04, activeScale: 1.12, thickness: 22 },
    { name: "Backhand", kind: "slash", sweepStart: 0.74, sweepEnd: -0.9, damageScale: 1.08, reachScale: 0.94, activeScale: 1.04, thickness: 23 },
    { name: "Overhead Crush", kind: "slash", sweepStart: -1.3, sweepEnd: 0.48, damageScale: 1.34, cooldownScale: 1.18, staminaScale: 1.18, windScale: 1.2, activeScale: 1.12, thickness: 27 }
  ],
  brawlerWraps: [
    { name: "Jab", kind: "jab", angleOffset: -0.06, reachScale: 0.92, cooldownScale: 0.92 },
    { name: "Cross", kind: "jab", angleOffset: 0.06, reachScale: 1.02, damageScale: 1.08 },
    { name: "Uppercut", kind: "slash", sweepStart: 0.65, sweepEnd: -1.05, reachScale: 1.08, damageScale: 1.24, cooldownScale: 1.08 }
  ],
  trainingBow: [
    { name: "Loose Arrow", kind: "shot", projectileCount: 1, cooldownScale: 0.95 },
    { name: "Split Nock", kind: "shot", projectileCount: 2, projectileSpread: 0.08, damageScale: 0.82, staminaScale: 1.1 },
    { name: "Piercing Arrow", kind: "shot", projectileCount: 1, damageScale: 1.25, pierceBonus: 1, projectileKind: "piercing", cooldownScale: 1.1 }
  ],
  handCrossbow: [
    { name: "Bolt", kind: "shot", projectileCount: 1 },
    { name: "Double Tap", kind: "shot", projectileCount: 2, projectileSpread: 0.05, damageScale: 0.78, staminaScale: 1.08 },
    { name: "Heavy Bolt", kind: "shot", projectileCount: 1, damageScale: 1.32, pierceBonus: 1, cooldownScale: 1.12 }
  ],
  apprenticeStaff: [
    { name: "Heavy Spark", kind: "shot", projectileCount: 1, projectileRadiusScale: 1.05 },
    { name: "Twin Burst", kind: "shot", projectileCount: 2, projectileSpread: 0.13, damageScale: 0.76, staminaScale: 1.12 },
    { name: "Ruin Bloom", kind: "shot", projectileCount: 1, damageScale: 1.42, projectileRadiusScale: 1.36, staminaScale: 1.2, cooldownScale: 1.16 }
  ],
  sparkWand: [
    { name: "Wand Spark", kind: "shot", projectileCount: 1, cooldownScale: 0.95 },
    { name: "Fork Spark", kind: "shot", projectileCount: 2, projectileSpread: 0.1, damageScale: 0.76 },
    { name: "Bright Spark", kind: "shot", projectileCount: 1, damageScale: 1.42, projectileRadiusScale: 1.28, cooldownScale: 1.12, staminaScale: 1.12 }
  ]
};
const WEAPON_COMBO_VISUALS = {
  sword: [
    { pose: "guardCut", trailStyle: "cleanArc", hitStyle: "swordCut", finisher: "edgeThrust" },
    { pose: "returnGuard", trailStyle: "returnArc", hitStyle: "swordCut" },
    { pose: "pointThrust", trailStyle: "needleThrust", hitStyle: "swordThrust", finisher: "pointFlash" }
  ],
  axe: [
    { pose: "shoulderChop", trailStyle: "wedgeCleave", hitStyle: "axeChip" },
    { pose: "hookChop", trailStyle: "hookBite", hitStyle: "axeHook" },
    { pose: "rootSplitter", trailStyle: "splitter", hitStyle: "axeSplit", finisher: "rootSplit" }
  ],
  great: [
    { pose: "lowDrag", trailStyle: "groundDrag", hitStyle: "greatDrag" },
    { pose: "overhead", trailStyle: "fallingSlab", hitStyle: "greatCrush" },
    { pose: "drive", trailStyle: "shockThrust", hitStyle: "greatDrive", finisher: "quakeDrive" }
  ],
  dagger: [
    { pose: "quickPrick", trailStyle: "pinStab", hitStyle: "daggerPrick" },
    { pose: "backSlice", trailStyle: "shortFlick", hitStyle: "daggerSlice" },
    { pose: "lunge", trailStyle: "lungingNeedle", hitStyle: "daggerLunge", finisher: "knifeGlint" }
  ],
  punching: [
    { pose: "leftJab", trailStyle: "knucklePop", hitStyle: "punchJab" },
    { pose: "cross", trailStyle: "crossPop", hitStyle: "punchCross" },
    { pose: "uppercut", trailStyle: "uppercutLift", hitStyle: "punchUpper", finisher: "upperShock" }
  ],
  spear: [
    { pose: "longLine", trailStyle: "spearLine", hitStyle: "spearPuncture" },
    { pose: "highPick", trailStyle: "highPick", hitStyle: "spearPick" },
    { pose: "skewer", trailStyle: "skewerLine", hitStyle: "spearSkewer", finisher: "skewerFlash" }
  ],
  dual: [
    { pose: "leftBlade", trailStyle: "leftRibbon", hitStyle: "dualLeft" },
    { pose: "rightBlade", trailStyle: "rightRibbon", hitStyle: "dualRight" },
    { pose: "crossBlades", trailStyle: "crossRibbon", hitStyle: "dualCross", finisher: "crossFlash" }
  ],
  bow: [
    { pose: "quickLoose", projectilePattern: "singleArrow", hitStyle: "arrowHit" },
    { pose: "splitNock", projectilePattern: "wideFan", hitStyle: "arrowFan" },
    { pose: "piercingDraw", projectilePattern: "piercingLine", hitStyle: "arrowPierce", finisher: "pierceWake" }
  ],
  crossbow: [
    { pose: "braceBolt", projectilePattern: "bolt", hitStyle: "boltHit" },
    { pose: "doubleTap", projectilePattern: "stackedBolts", hitStyle: "boltTap" },
    { pose: "heavyBolt", projectilePattern: "heavyBolt", hitStyle: "boltHeavy", finisher: "boltKick" }
  ],
  wand: [
    { pose: "flickSpark", projectilePattern: "spark", hitStyle: "wandSpark" },
    { pose: "forkSpark", projectilePattern: "fork", hitStyle: "wandFork" },
    { pose: "brightSpark", projectilePattern: "bright", hitStyle: "wandBright", finisher: "sparkStar" }
  ],
  scepter: [
    { pose: "heavySpark", projectilePattern: "orb", hitStyle: "scepterOrb" },
    { pose: "twinBurst", projectilePattern: "twinOrbs", hitStyle: "scepterTwin" },
    { pose: "ruinBloom", projectilePattern: "bloom", hitStyle: "scepterBloom", finisher: "ruinBloom" }
  ]
};
const CLAW_COMBO_WEAPON = {
  id: "clawComboClaws",
  name: "Claw Combo",
  family: "punching",
  color: "#ffd879",
  reach: 58,
  arc: 0.64,
  lightDamage: 16,
  lightCooldown: 0.09,
  staminaCost: 0,
  wind: 0.025,
  active: 0.065,
  recover: 0.075
};
const BEAST_FORM_WEAPON = {
  id: "beastClaws",
  name: "Beast Claws",
  family: "punching",
  color: "#ff5f4a",
  reach: 88,
  arc: 0.98,
  lightDamage: 29,
  lightCooldown: 0.16,
  staminaCost: 0,
  wind: 0.045,
  active: 0.105,
  recover: 0.12
};
const POST_BOSS_STARTER_WEAPON_ID = "rustySword";
const BOSS_SCRAP_XP = 44;
const CLASS_SKILL_TREES = {
  rootbound: {
    root: { title: "Root Memory", kind: "Memory", icon: "root", desc: "Opens the curse tree and improves Chant gain.", gaugeGain: 0.12, gaugePassive: 0.35 },
    paths: {
      briar: {
        id: "briar",
        name: "Briar Path",
        desc: "Thorns, hooks, patience, and barbed control.",
        color: "#86a653",
        nodes: [
          { title: "Bramble Step", kind: "Passive", icon: "boot", desc: "Move a little faster and gain Chant when rolling.", move: 5, gaugeGain: 0.08 },
          { title: "Briar Hook", kind: "Buff", icon: "hook", desc: "Thorn Grab hits harder and pulls harder.", abilityPower: 4, gaugeGain: 0.08 },
          { title: "Thorn Split", kind: "Ability", icon: "split", desc: "Unlock a split-thorn cast for an extra key.", abilityId: "thornSplit", abilityPower: 2 },
          { title: "Barbed Patience", kind: "Passive", icon: "thorn", desc: "Chant drips faster when you wait between hits.", gaugePassive: 0.6, abilityCooldown: 0.25 },
          { title: "Briar Crown", kind: "Aura", icon: "crown", desc: "Final Upgrade: a thorn aura bites close attackers.", final: true, aura: "briar crown", hp: 8, abilityPower: 3 }
        ]
      },
      oath: {
        id: "oath",
        name: "Oath Path",
        desc: "Old chants, stone roots, and binding words.",
        color: "#d6ad55",
        nodes: [
          { title: "Old Chant", kind: "Passive", icon: "chant", desc: "More stamina and better Chant gain.", stamina: 8, gaugeGain: 0.1 },
          { title: "Stone Root", kind: "Passive", icon: "stone", desc: "More HP and steadier roots.", hp: 12, abilityCooldown: 0.2 },
          { title: "Wolf Oath", kind: "Ability", icon: "wolf", desc: "Unlock a short-lived wolf memory bite.", abilityId: "wolfOath", damage: 1 },
          { title: "Binding Words", kind: "Aura", icon: "words", desc: "Rootbound aura slows enemies you hit.", aura: "binding words", abilityPower: 2 },
          { title: "Ancient Oath", kind: "Passive", icon: "oath", desc: "Final Upgrade: stronger stats and stronger Chant gain.", final: true, hp: 10, stamina: 8, gaugeGain: 0.18 }
        ]
      },
      howl: {
        id: "howl",
        name: "Howl Path",
        desc: "Wild memory, marks, and pack calls.",
        color: "#5f8d62",
        nodes: [
          { title: "Moss Blood", kind: "Passive", icon: "blood", desc: "Tiny HP recovery and better Chant from kills.", hp: 6, gaugeGain: 0.08 },
          { title: "Howl Mark", kind: "Buff", icon: "mark", desc: "Marked targets take more origin damage.", damage: 1, abilityPower: 3 },
          { title: "Stag Call", kind: "Ability", icon: "stag", desc: "Unlock a forward stag memory charge.", abilityId: "stagCall", abilityPower: 2 },
          { title: "Wild Chorus", kind: "Aura", icon: "chorus", desc: "A moss chorus flashes when origin power surges.", aura: "wild chorus", gaugePassive: 0.45 },
          { title: "Pack Memory", kind: "Aura", icon: "pack", desc: "Final Upgrade: companion memory hits harder.", final: true, aura: "pack memory", damage: 2, abilityPower: 2 }
        ]
      }
    }
  },
  frenzied: {
    root: { title: "Frenzy Memory", kind: "Memory", icon: "fang", desc: "Opens the curse tree and improves Frenzy gain.", gaugeGain: 0.14, attackSpeed: 0.03 },
    paths: {
      fang: {
        id: "fang",
        name: "Fang Path",
        desc: "Fast bites, ripping chains, and attack pressure.",
        color: "#c94c38",
        nodes: [
          { title: "Quick Bite", kind: "Passive", icon: "bite", desc: "Faster attack rhythm and better Frenzy from hits.", attackSpeed: 0.06, gaugeGain: 0.1 },
          { title: "Ripping Chain", kind: "Buff", icon: "chain", desc: "Combo hits build more Frenzy and do more damage.", damage: 1, gaugeGain: 0.12 },
          { title: "Beast Swipe", kind: "Ability", icon: "claw", desc: "Unlock a close-range beast swipe.", abilityId: "beastSwipe", abilityPower: 2 },
          { title: "Blood Tempo", kind: "Passive", icon: "tempo", desc: "A short attack speed surge after kills.", attackSpeed: 0.05, abilityCooldown: 0.2 },
          { title: "Fang Breaker", kind: "Buff", icon: "breaker", desc: "Final Upgrade: heavy third hits hit much harder.", final: true, damage: 3, attackSpeed: 0.04 }
        ]
      },
      ruin: {
        id: "ruin",
        name: "Ruin Path",
        desc: "Slam weight, bone shock, and mammoth force.",
        color: "#d6ad55",
        nodes: [
          { title: "Heavy Landing", kind: "Passive", icon: "landing", desc: "Ground Slam Jump has a larger impact.", abilityPower: 3, hp: 6 },
          { title: "Bone Shock", kind: "Buff", icon: "shock", desc: "Slam shockwaves hit farther.", abilityPower: 4 },
          { title: "Mammoth Rush", kind: "Ability", icon: "mammoth", desc: "Unlock a heavy forward rush.", abilityId: "mammothRush", abilityPower: 2 },
          { title: "Ruin Hide", kind: "Aura", icon: "hide", desc: "A rust aura reduces damage after R.", aura: "ruin hide", hp: 8 },
          { title: "Ruin Body", kind: "Aura", icon: "body", desc: "Final Upgrade: bigger slam shape and more HP.", final: true, aura: "ruin body", hp: 14, abilityPower: 2 }
        ]
      },
      hide: {
        id: "hide",
        name: "Hide Path",
        desc: "Pain laughs, no brakes, and unstable survival.",
        color: "#7f4338",
        nodes: [
          { title: "Pain Laugh", kind: "Passive", icon: "laugh", desc: "Gain Frenzy faster while hurt.", hp: 8, gaugeGain: 0.1 },
          { title: "No Brakes", kind: "Passive", icon: "brake", desc: "Move faster while attacking.", move: 8, attackSpeed: 0.03 },
          { title: "Rage Hide", kind: "Ability", icon: "rage", desc: "Unlock a short defensive rage.", abilityId: "rageHide", hp: 6 },
          { title: "Unsteady Heart", kind: "Aura", icon: "heart", desc: "A red pulse flashes when low.", aura: "unsteady heart", damage: 1 },
          { title: "Frenzied Shape", kind: "Aura", icon: "shape", desc: "Final Upgrade: the origin silhouette hits harder.", final: true, aura: "frenzied shape", damage: 2, move: 6 }
        ]
      }
    }
  },
  hollow: {
    root: { title: "Hollow Memory", kind: "Memory", icon: "hollow", desc: "Opens the curse tree and improves Blood gain.", gaugeGain: 0.12, stamina: 6 },
    paths: {
      vein: {
        id: "vein",
        name: "Vein Path",
        desc: "Black pulses, leech marks, and hungry blood.",
        color: "#8e5bd8",
        nodes: [
          { title: "Black Pulse", kind: "Passive", icon: "pulse", desc: "Unstable Blast cools down sooner.", abilityCooldown: 0.35 },
          { title: "Leech Mark", kind: "Buff", icon: "leech", desc: "Origin hits leech a little more.", abilityPower: 3, hp: 4 },
          { title: "Blood Tether", kind: "Ability", icon: "tether", desc: "Unlock a tether that steals a small amount of HP.", abilityId: "bloodTether", abilityPower: 2 },
          { title: "Red Empty", kind: "Aura", icon: "empty", desc: "A violet-red aura strengthens leech magic.", aura: "red empty", abilityPower: 2 },
          { title: "Vein Hunger", kind: "Passive", icon: "hunger", desc: "Final Upgrade: better Blood gain and leech scaling.", final: true, gaugeGain: 0.18, abilityPower: 3 }
        ]
      },
      grave: {
        id: "grave",
        name: "Grave Path",
        desc: "Whispers, bursts, and something small crawling after you.",
        color: "#d6ad55",
        nodes: [
          { title: "Grave Whisper", kind: "Passive", icon: "whisper", desc: "More stamina and Blood drip.", stamina: 10, gaugePassive: 0.4 },
          { title: "Grave Burst", kind: "Buff", icon: "burst", desc: "Dark bursts hit harder.", abilityPower: 4 },
          { title: "Grave Imp", kind: "Ability", icon: "imp", desc: "Unlock a tiny grave memory helper.", abilityId: "graveImp", abilityPower: 1 },
          { title: "Bone Echo", kind: "Aura", icon: "echo", desc: "A hollow aura echoes after casts.", aura: "bone echo", abilityCooldown: 0.2 },
          { title: "Open Grave", kind: "Ability", icon: "grave", desc: "Final Upgrade: grave magic blooms wider.", final: true, abilityPower: 4, stamina: 8 }
        ]
      },
      echo: {
        id: "echo",
        name: "Echo Path",
        desc: "Reach, blinking, bad reflections, and echo teeth.",
        color: "#5b4d75",
        nodes: [
          { title: "Unstable Reach", kind: "Passive", icon: "reach", desc: "Origin projectiles travel farther.", abilityPower: 2, gaugeGain: 0.08 },
          { title: "Hollow Blink", kind: "Ability", icon: "blink", desc: "Unlock a short aim blink with a dark cut.", abilityId: "hollowBlink", abilityCooldown: 0.2 },
          { title: "Bad Reflection", kind: "Aura", icon: "mirror", desc: "A shadow reflection trails the body.", aura: "bad reflection", move: 4 },
          { title: "Echo Bite", kind: "Buff", icon: "bite", desc: "Echo hits bite twice.", damage: 1, abilityPower: 3 },
          { title: "Echo Self", kind: "Aura", icon: "self", desc: "Final Upgrade: the echo aura becomes stronger.", final: true, aura: "echo self", damage: 2, abilityPower: 2 }
        ]
      }
    }
  }
};

const LEARNED_ABILITY_KEYS = ["F", "T", "G"];
const LEARNED_ABILITIES = {
  briarPatch: {
    id: "briarPatch",
    name: "Briar Patch",
    label: "Briar",
    classId: "rootbound",
    cooldown: 7.5,
    desc: "Aimed thorn zone that slows and deals damage over time."
  },
  oldTreeRise: {
    id: "oldTreeRise",
    name: "Old Tree Rise",
    label: "Tree",
    classId: "rootbound",
    cooldown: 10.5,
    desc: "Auto-targets an enemy, grows a huge healing tree, then erupts for high damage."
  },
  wolfSpirit: {
    id: "wolfSpirit",
    name: "Wolf Spirit",
    label: "Wolf",
    classId: "rootbound",
    cooldown: 14,
    desc: "Summons a temporary wolf ally that chases and bites enemies."
  },
  clawCombo: {
    id: "clawCombo",
    name: "Claw Combo",
    label: "Claws",
    classId: "frenzied",
    cooldown: 12,
    desc: "Temporarily replaces weapon attacks with a fast three-hit claw combo."
  },
  beastUppercut: {
    id: "beastUppercut",
    name: "Beast Uppercut",
    label: "Upper",
    classId: "frenzied",
    cooldown: 8.5,
    desc: "A close heavy uppercut that launches enemies upward."
  },
  beastForm: {
    id: "beastForm",
    name: "Beast Form",
    label: "Beast",
    classId: "frenzied",
    cooldown: 24,
    desc: "Transforms for 6 seconds: left click swipes and Q becomes a faster beast dodge."
  },
  bloodNeedle: {
    id: "bloodNeedle",
    name: "Blood Needle",
    label: "Needle",
    classId: "hollow",
    cooldown: 5.8,
    desc: "A dark projectile that damages and applies a blood mark."
  },
  markCut: {
    id: "markCut",
    name: "Mark Cut",
    label: "Cut",
    classId: "hollow",
    cooldown: 8.8,
    desc: "A long-range dash cut that pops blood marks for heavy damage."
  },
  blackMaw: {
    id: "blackMaw",
    name: "Black Maw",
    label: "Maw",
    classId: "hollow",
    cooldown: 18,
    desc: "Auto-targets an enemy with a blackhole creature that pulls, ticks damage, then explodes."
  }
};

function lineNode(title, kind, icon, desc, extras = {}) {
  return { title, kind, icon, desc, ...extras };
}

const CLASS_SKILL_LINES = {
  rootbound: [
    { branchName: "Root", color: "#d6ad55", node: lineNode("Root Memory", "Memory", "root", "R will become Thorn Spear after the starter weapon is remembered.", { abilityPower: 1 }) },
    { branchName: "Briar", color: "#86a653", node: lineNode("Bramble Feet", "Passive", "boot", "Move a little faster through danger.", { move: 6 }) },
    { branchName: "Oath", color: "#d6ad55", node: lineNode("Stone Skin", "Passive", "stone", "Gain a small HP buffer.", { hp: 8 }) },
    { branchName: "Briar", color: "#86a653", node: lineNode("Thorn Bite", "Buff", "thorn", "Thorn Spear and root magic deal more damage.", { abilityPower: 3 }) },
    { branchName: "Briar", color: "#86a653", node: lineNode("Briar Patch", "Ability", "briar", "Unlock F: auto-target thorn zone that slows and deals thorn damage over time.", { abilityId: "briarPatch", abilityPower: 1 }) },
    { branchName: "Oath", color: "#d6ad55", node: lineNode("Old Bark", "Passive", "bark", "More stamina and steadier control.", { stamina: 8, hp: 4 }) },
    { branchName: "Howl", color: "#5f8d62", node: lineNode("Wild Pull", "Buff", "pull", "Root effects hold enemies longer and hit harder.", { abilityPower: 2, abilityCooldown: 0.15 }) },
    { branchName: "Briar", color: "#86a653", node: lineNode("Barbed Weapon", "Buff", "burn", "Weapon hits gain a small thorn-burn chance.", { weaponBurnChance: 0.05 }) },
    { branchName: "Howl", color: "#5f8d62", node: lineNode("Moss Blood", "Passive", "blood", "Gain HP and a little damage.", { hp: 8, damage: 1 }) },
    { branchName: "Oath", color: "#d6ad55", node: lineNode("Old Tree Rise", "Ability", "tree", "Unlock T: auto-target warning mark, then a huge healing tree eruption.", { abilityId: "oldTreeRise", abilityPower: 2 }) },
    { branchName: "Howl", color: "#5f8d62", node: lineNode("Wolf Oath", "Passive", "wolf", "Companion and summon effects hit harder.", { abilityPower: 2, attackSpeed: 0.03 }) },
    { branchName: "Briar", color: "#86a653", node: lineNode("Briar Skin", "Aura", "aura", "A subtle moss aura bites back through ability damage.", { aura: "briar skin", hp: 8 }) },
    { branchName: "Oath", color: "#d6ad55", node: lineNode("Ancient Words", "Buff", "words", "Cooldowns recover slightly faster.", { abilityCooldown: 0.35 }) },
    { branchName: "Howl", color: "#5f8d62", node: lineNode("Pack Memory", "Passive", "pack", "More damage while the line is nearly complete.", { damage: 2 }) },
    { branchName: "Howl", color: "#5f8d62", node: lineNode("Wolf Spirit", "Ability", "wolf", "Final Upgrade. Unlock G: temporary wolf ally with HP that chases and bites enemies.", { abilityId: "wolfSpirit", final: true, abilityPower: 3, aura: "pack memory" }) }
  ],
  frenzied: [
    { branchName: "Ruin", color: "#d6ad55", node: lineNode("Frenzied Memory", "Memory", "fang", "R will become Ruin Pounce after the starter weapon is remembered.", { hp: 4 }) },
    { branchName: "Fang", color: "#c94c38", node: lineNode("Quick Bite", "Passive", "bite", "Attack rhythm is a little faster.", { attackSpeed: 0.06 }) },
    { branchName: "Hide", color: "#7f4338", node: lineNode("Pain Laugh", "Passive", "laugh", "Gain HP and keep fighting close.", { hp: 10 }) },
    { branchName: "Ruin", color: "#d6ad55", node: lineNode("Heavy Landing", "Buff", "landing", "Ruin Pounce ground cracks deal more damage.", { abilityPower: 3 }) },
    { branchName: "Fang", color: "#c94c38", node: lineNode("Claw Combo", "Ability", "claw", "Unlock F: temporarily replace weapon attacks with a fast three-hit claw combo.", { abilityId: "clawCombo", attackSpeed: 0.04 }) },
    { branchName: "Hide", color: "#7f4338", node: lineNode("No Brakes", "Passive", "brake", "Move faster while pressuring enemies.", { move: 8 }) },
    { branchName: "Fang", color: "#c94c38", node: lineNode("Ripping Chain", "Buff", "chain", "Combo damage and claw damage improve.", { damage: 1, abilityPower: 2 }) },
    { branchName: "Ruin", color: "#d6ad55", node: lineNode("Bone Shock", "Buff", "shock", "Impact abilities reach farther.", { abilityPower: 2 }) },
    { branchName: "Hide", color: "#7f4338", node: lineNode("Ruin Hide", "Aura", "hide", "A rust aura hardens the body briefly after origin casts.", { aura: "ruin hide", hp: 8 }) },
    { branchName: "Ruin", color: "#d6ad55", node: lineNode("Beast Uppercut", "Ability", "upper", "Unlock T: close-range launching heavy attack.", { abilityId: "beastUppercut", abilityPower: 2 }) },
    { branchName: "Fang", color: "#c94c38", node: lineNode("Blood Tempo", "Passive", "tempo", "Fast pressure lasts slightly longer.", { attackSpeed: 0.05, abilityCooldown: 0.15 }) },
    { branchName: "Hide", color: "#7f4338", node: lineNode("Unsteady Heart", "Aura", "heart", "More damage when the line is almost complete.", { damage: 1, aura: "unsteady heart" }) },
    { branchName: "Ruin", color: "#d6ad55", node: lineNode("Mammoth Weight", "Buff", "mammoth", "Pounces and uppercuts hit harder.", { abilityPower: 3, hp: 6 }) },
    { branchName: "Fang", color: "#c94c38", node: lineNode("Fang Breaker", "Buff", "breaker", "Weapon finishers hit harder.", { damage: 2 }) },
    { branchName: "Hide", color: "#7f4338", node: lineNode("Beast Form", "Ability", "beast", "Final Upgrade. Unlock G: 6-second form with beast swipes and a fast beast dodge.", { abilityId: "beastForm", final: true, abilityPower: 3, aura: "beast form" }) }
  ],
  hollow: [
    { branchName: "Vein", color: "#8e5bd8", node: lineNode("Hollow Memory", "Memory", "void", "R will become Ambush Cut after the starter weapon is remembered.", { stamina: 6 }) },
    { branchName: "Echo", color: "#5b4d75", node: lineNode("Unstable Reach", "Passive", "reach", "Dark cuts and curse shots reach farther.", { abilityPower: 2 }) },
    { branchName: "Grave", color: "#d6ad55", node: lineNode("Grave Whisper", "Passive", "whisper", "More stamina for risky spacing.", { stamina: 10 }) },
    { branchName: "Vein", color: "#8e5bd8", node: lineNode("Black Pulse", "Buff", "pulse", "Ambush Cut recovers slightly faster.", { abilityCooldown: 0.25 }) },
    { branchName: "Vein", color: "#8e5bd8", node: lineNode("Blood Needle", "Ability", "needle", "Unlock F: projectile that damages and applies a blood mark.", { abilityId: "bloodNeedle", abilityPower: 1 }) },
    { branchName: "Grave", color: "#d6ad55", node: lineNode("Bone Echo", "Aura", "echo", "A violet echo trails after dark casts.", { aura: "bone echo", move: 4 }) },
    { branchName: "Echo", color: "#5b4d75", node: lineNode("Bad Reflection", "Aura", "mirror", "Leech magic and blink cuts grow sharper.", { abilityPower: 2, aura: "bad reflection" }) },
    { branchName: "Vein", color: "#8e5bd8", node: lineNode("Leech Mark", "Buff", "leech", "Marked targets feed a little more HP.", { hp: 4, abilityPower: 2 }) },
    { branchName: "Grave", color: "#d6ad55", node: lineNode("Grave Burst", "Buff", "burst", "Dark explosions hit harder.", { abilityPower: 3 }) },
    { branchName: "Echo", color: "#5b4d75", node: lineNode("Mark Cut", "Ability", "cut", "Unlock T: long-range dash cut that pops blood marks for heavy damage.", { abilityId: "markCut", damage: 1 }) },
    { branchName: "Vein", color: "#8e5bd8", node: lineNode("Red Empty", "Aura", "empty", "A violet-red aura strengthens risky leech magic.", { aura: "red empty", abilityPower: 2 }) },
    { branchName: "Grave", color: "#d6ad55", node: lineNode("Open Grave", "Buff", "grave", "Black Maw and dark bursts grow wider.", { abilityPower: 3 }) },
    { branchName: "Echo", color: "#5b4d75", node: lineNode("Echo Bite", "Buff", "bite", "Marked targets take more pop damage.", { damage: 1, abilityPower: 2 }) },
    { branchName: "Vein", color: "#8e5bd8", node: lineNode("Vein Hunger", "Passive", "hunger", "Leech effects heal a little more.", { hp: 8, abilityPower: 1 }) },
    { branchName: "Grave", color: "#d6ad55", node: lineNode("Black Maw", "Ability", "maw", "Final Upgrade. Unlock G: auto-target blackhole creature pulls, ticks damage, then explodes.", { abilityId: "blackMaw", final: true, abilityPower: 3, aura: "black maw" }) }
  ]
};

function resizeCanvas() {
  const dpr = Math.min(2.5, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
  canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
  ctx.imageSmoothingEnabled = false;
}

addEventListener("resize", resizeCanvas);
resizeCanvas();

const ui = {
  center: document.getElementById("centerCard"),
  prompt: document.getElementById("prompt"),
  hpText: document.getElementById("hpText"),
  hpFill: document.getElementById("hpFill"),
  stFill: document.getElementById("stFill"),
  weaponText: document.getElementById("weaponText"),
  journalText: document.getElementById("journalText"),
  coinText: document.getElementById("coinText"),
  roomText: document.getElementById("roomText"),
  xpPanel: document.getElementById("xpPanel"),
  levelText: document.getElementById("levelText"),
  xpText: document.getElementById("xpText"),
  xpFill: document.getElementById("xpFill"),
  stick: document.getElementById("stick"),
  stickKnob: document.getElementById("stickKnob"),
  attackBtn: document.getElementById("attackBtn"),
  jumpBtn: document.getElementById("jumpBtn"),
  dodgeBtn: document.getElementById("dodgeBtn"),
  interactBtn: document.getElementById("interactBtn"),
  journalBtn: document.getElementById("journalBtn"),
  cameraBtn: document.getElementById("cameraBtn"),
  abilityOrb: document.getElementById("abilityOrb"),
  abilityFill: document.getElementById("abilityFill"),
  abilityText: document.getElementById("abilityText"),
  abilityKey: document.getElementById("abilityKey"),
  extraAbilityPanel: document.getElementById("extraAbilityPanel"),
  extraAbilityButtons: Array.from(document.querySelectorAll(".extraAbilityBtn"))
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (min, max) => min + Math.random() * (max - min);
const sign = (value) => value < 0 ? -1 : 1;

installAudioUnlock(window);

function formatPercent(value, max) {
  return `${clamp((value / max) * 100, 0, 100)}%`;
}

function isCoarsePointer() {
  return Boolean(window.matchMedia?.("(pointer: coarse)")?.matches);
}

function particleBudget() {
  return isCoarsePointer() ? MOBILE_PARTICLE_BUDGET : DESKTOP_PARTICLE_BUDGET;
}

function pushParticle(particle) {
  state.particles.push(particle);
  const budget = particleBudget();
  while (state.particles.length > budget) {
    const ambientIndex = state.particles.findIndex((item) => item.kind === "ambientMote");
    state.particles.splice(ambientIndex >= 0 ? ambientIndex : 0, 1);
  }
}

function playSfx(name) {
  if (!state.options.sfxEnabled) return false;
  return sfx[name]?.() ?? false;
}

function playLimitedSfx(name, cooldownKey = "hitSfxCooldown", cooldown = 0.045) {
  if (state[cooldownKey] > 0) return false;
  const played = playSfx(name);
  if (played) state[cooldownKey] = cooldown;
  return played;
}

function playFirstSfx(names) {
  if (!state.options.sfxEnabled) return false;
  for (const name of names) {
    if (sfx[name]) return sfx[name]();
  }
  return false;
}

function weaponSfxName(weapon) {
  if (weapon.family === "punching") return "brawlerPunch";
  if (weapon.family === "bow" || weapon.family === "crossbow") return "bowRelease";
  if (weapon.family === "wand" || weapon.family === "scepter") return "staffCast";
  if (weapon.family === "dagger") return "knifeSlash";
  return "swordSlash";
}

function playWeaponSfx(weapon) {
  if (weapon.mode !== "projectile" && sfx.weaponMelee) return sfx.weaponMelee(weapon.family);
  return playFirstSfx([weaponSfxName(weapon), "attack"]);
}

function playAbilitySfx(abilityId) {
  const names = {
    thornSpear: "rootboundThornGrab",
    briarPatch: "rootboundThornGrab",
    oldTreeRise: "rootboundThornGrab",
    wolfSpirit: "rootboundThornGrab",
    ruinPounce: "frenziedGroundSlamJump",
    clawCombo: "brawlerPunch",
    beastUppercut: "brawlerPunch",
    beastForm: "frenziedGroundSlamJump",
    ambushCut: "hollowUnstableBlast",
    bloodNeedle: "hollowUnstableBlast",
    markCut: "dodge",
    blackMaw: "hollowUnstableBlast"
  };
  return playFirstSfx([names[abilityId], "ability"]);
}

function syncAudioOptions() {
  setMusicEnabled(state.options.musicEnabled);
  setSfxEnabled(state.options.sfxEnabled);
}

let activeMusicTrack = null;

function startGameMusic() {
  syncAudioOptions();
  const biome = state.room?.biome;
  const nextTrack = biome === "Castle" ? "castle" : biome === "Swamp" ? "swamp" : "normal";
  if (activeMusicTrack === nextTrack) return;
  activeMusicTrack = nextTrack;
  const loop = biome === "Castle" ? castleWarAudioLoop : biome === "Swamp" ? swampBogAudioLoop : forestOfHopeAudioLoop;
  startMusic(loop);
}

function startBossMusic() {
  syncAudioOptions();
  if (activeMusicTrack === "boss") return;
  activeMusicTrack = "boss";
  startMusic(bossBattleAudioLoop);
}

function stopGameMusic() {
  activeMusicTrack = null;
  stopMusic();
}

function rangeValue(range, fallback = 0) {
  return Array.isArray(range) ? rand(range[0], range[1]) : (range ?? fallback);
}

function rangeCount(range, fallback = 1) {
  return Math.max(0, Math.round(rangeValue(range, fallback)));
}

function pick(list, fallback = "#ffffff") {
  if (!list?.length) return fallback;
  return list[Math.floor(Math.random() * list.length)] ?? fallback;
}

function cameraBounds(room = state.room, zoom = state.camera.zoom) {
  if (!room) return { minX: W * 0.5, maxX: W * 0.5, viewW: W };
  const viewW = W / Math.max(0.1, zoom);
  if (viewW >= room.width) {
    const center = room.width * 0.5;
    return { minX: center, maxX: center, viewW };
  }
  return {
    minX: viewW * 0.5,
    maxX: room.width - viewW * 0.5,
    viewW
  };
}

function worldDrawBounds(room = state.room) {
  const overscan = WORLD_EDGE_OVERSCAN;
  return {
    left: -overscan,
    right: (room?.width ?? W) + overscan,
    width: (room?.width ?? W) + overscan * 2,
    top: -overscan,
    bottom: H + overscan,
    height: H + overscan * 2
  };
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy || 1;
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / lengthSq, 0, 1);
  const sx = x1 + dx * t;
  const sy = y1 + dy * t;
  return Math.hypot(px - sx, py - sy);
}

function setCard(html) {
  ui.center.classList.toggle("journalOpen", html.includes("journalCard"));
  ui.center.classList.toggle("startOpen", html.includes("titleCard") || html.includes("classCard") || html.includes("optionsCard"));
  ui.center.classList.toggle("shopOpen", html.includes("shopCard"));
  ui.center.innerHTML = html;
}

function clearCard() {
  ui.center.classList.remove("journalOpen");
  ui.center.classList.remove("startOpen");
  ui.center.classList.remove("shopOpen");
  ui.center.innerHTML = "";
}

function setGameChromeVisible(visible) {
  document.body.classList.toggle("gameActive", visible);
}

function setCinematicChromeVisible(active) {
  document.body.classList.toggle("cinematicActive", active);
}

const ITEM_ICON_FALLBACK = {
  svg: `<rect x="6" y="6" width="20" height="20" fill="#d6ad55" stroke="#1b120c" stroke-width="2"/><path d="M11 11h10v10H11z" fill="#2c2116"/><path d="M14 14h4v4h-4z" fill="#fff0b5"/>`
};
const itemIconHtmlCache = new Map();
const itemCardHtmlCache = new Map();

function itemIconHtml(item) {
  if (!item) return "";
  if (itemIconHtmlCache.has(item.id)) return itemIconHtmlCache.get(item.id);
  const icon = ITEM_ICON_SPECS[item.id] ?? ITEM_ICON_FALLBACK;
  const missing = ITEM_ICON_SPECS[item.id] ? "" : " missingIcon";
  const html = `<span class="itemIcon${missing}" data-item-icon="${escapeHtml(item.id)}" aria-hidden="true"><svg class="itemIconSvg" viewBox="0 0 32 32" shape-rendering="crispEdges" focusable="false">${icon.svg}</svg></span>`;
  itemIconHtmlCache.set(item.id, html);
  return html;
}

function itemCategory(item) {
  if (!item) return "";
  if (item.category) return item.category;
  if (item.type === "weapon") return "Weapon";
  if (item.type === "gear") return "Gear";
  return item.type;
}

function weaponFamilyLabel(weapon) {
  return WEAPON_FAMILIES[weapon?.family]?.label ?? "Weapon";
}

function itemWeapon(item) {
  return item?.weaponId ? WEAPONS[item.weaponId] : null;
}

function itemFamilyHtml(item) {
  const weapon = itemWeapon(item);
  if (!weapon) return "";
  return `<span class="itemFamily">${escapeHtml(weaponFamilyLabel(weapon))}</span>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char]);
}

function itemEffectText(item) {
  const effects = item?.effects ?? {};
  const lines = [];
  const weapon = itemWeapon(item);
  if (weapon) {
    lines.push(`${weapon.lightDamage} dmg`);
    lines.push(`${weapon.reach} reach`);
    if (weapon.staminaCost) lines.push(`${weapon.staminaCost} sta`);
  }
  if (effects.hpRegen) lines.push(`+${effects.hpRegen} HP/s`);
  if (effects.maxHp) lines.push(`+${effects.maxHp} max HP`);
  if (effects.moveSpeed) lines.push(`${effects.moveSpeed > 0 ? "+" : ""}${effects.moveSpeed} move`);
  if (effects.dashDamage) lines.push(`dash hits ${effects.dashDamage}`);
  if (effects.shieldHabit) lines.push("front guard");
  if (effects.quickNock) lines.push("faster arrows");
  if (effects.airControl) lines.push("air drift");
  if (effects.landingChip) lines.push(`landing hits ${effects.landingChip}`);
  if (effects.spikeRetort) lines.push(`retort ${effects.spikeRetort}`);
  if (effects.lastStand) lines.push(`last stand +${Math.round(effects.lastStand * 100)}%`);
  return lines.join(" | ");
}

function itemCardHtml(item) {
  if (!item) return "";
  if (itemCardHtmlCache.has(item.id)) return itemCardHtmlCache.get(item.id);
  const effects = itemEffectText(item);
  const category = item.type === "weapon" ? "" : `<span class="itemCategory">${escapeHtml(itemCategory(item))}</span>`;
  const family = item.type === "weapon" ? "" : itemFamilyHtml(item);
  const html = `${itemIconHtml(item)}<strong>${escapeHtml(item.name)}</strong>${category}${family}${effects ? `<span class="itemEffect">${escapeHtml(effects)}</span>` : ""}`;
  itemCardHtmlCache.set(item.id, html);
  return html;
}

const keys = Object.create(null);
const pressed = new Set();
const touch = {
  moveX: 0,
  moveY: 0,
  aimX: 1,
  aimY: 0,
  hasAim: false,
  stickPointer: null,
  attackPointer: null,
  attackHeld: false
};

const mouse = {
  screenX: W * 0.62,
  screenY: H * 0.5,
  worldX: 270,
  worldY: 520,
  offsetX: 120,
  offsetY: -10,
  inside: false,
  active: false,
  aimIntent: false,
  locked: false
};

const viewport = {
  scale: 1,
  offsetX: 0,
  offsetY: 0
};

const state = {
  mode: "menu",
  room: null,
  roomId: "wakingStones",
  roomClears: new Set(),
  flags: {
    journalFound: false,
    knifeBroken: false,
    bossDefeated: false,
    bossIntroPlayed: false,
    swordClaimed: false,
    starterWeaponClaimed: false,
    starterChestOpened: false,
    ruinsChestOpened: false,
    castleChestOpened: false,
    postBossScrapSpawned: false,
    postBossScrapRead: false,
    progressionUnlocked: false,
    ironWardenIntroPlayed: false,
    ironWardenDefeated: false,
    ironWardenRewardsClaimed: false,
    redWolfIntroPlayed: false,
    redWolfDefeated: false,
    demoComplete: false
  },
  enemies: [],
  boss: null,
  chests: [],
  merchants: [],
  dummies: [],
  scraps: [],
  pickups: [],
  projectiles: [],
  enemyProjectiles: [],
  roars: [],
  summons: [],
  burns: [],
  feints: [],
  particles: [],
  stains: [],
  slashes: [],
  hazards: [],
  floaters: [],
  cinematic: null,
  opening: {
    moved: false,
    jumped: false,
    attacked: false,
    chestGuide: false
  },
  options: {
    screenShake: "full",
    openingHints: true,
    musicEnabled: true,
    sfxEnabled: true,
    touchLayout: "compact"
  },
  camera: {
    x: W * 0.5,
    y: H * 0.5,
    zoom: 1,
    leadX: 0,
    shake: 0,
    recenterTimer: 0
  },
  hitPause: 0,
  time: 0,
  ambientTimer: 0,
  hitSfxCooldown: 0,
  dummyHitSfxCooldown: 0,
  enemyLungeSfxCooldown: 0,
  promptAction: null,
  journalTab: "inventory",
  inventorySort: "type",
  inventoryPage: 0,
  selectedInventoryItemId: null,
  skillPreviewKey: null,
  journalUnread: false,
  toastTimer: 0,
  toastText: "",
  selectedClassId: "rootbound",
  pendingRunMode: "story",
  pendingStartPoint: "beginning",
  runMode: "story",
  castleCheckpoint: null,
  miniChestRooms: new Set()
};

const PLAYER_COLORS = {
  outline: "#17110f",
  hair: "#2b2119",
  hairLight: "#3a2b1f",
  skin: "#f0b96c",
  skinShadow: "#b87438",
  shirt: "#6426c9",
  shirtShadow: "#35146f",
  shirtLight: "#8a55f0",
  pants: "#111622",
  pantsLight: "#2a3040",
  shoe: "#050505"
};

const CLASS_RENDER = {
  rootbound: {
    scaleX: 1,
    scaleY: 1,
    accent: "#9ba95f",
    shadow: "#465334",
    label: "Chant"
  },
  frenzied: {
    scaleX: 1,
    scaleY: 1,
    accent: "#c94c38",
    shadow: "#682d26",
    label: "Frenzy"
  },
  hollow: {
    scaleX: 1,
    scaleY: 1,
    accent: "#8e5bd8",
    shadow: "#352542",
    label: "Blood"
  }
};

const player = {
  x: 170,
  y: 560,
  vx: 0,
  vy: 0,
  w: 30,
  h: 58,
  hp: 100,
  maxHp: 100,
  st: 100,
  maxSt: 100,
  moveX: 0,
  facing: 1,
  aimAngle: 0,
  aimX: 1,
  aimY: 0,
  animTime: 0,
  animState: "idle",
  runTime: 0,
  stepDust: 0,
  land: 0,
  hurt: 0,
  onGround: false,
  coyote: 0,
  jumpBuffer: 0,
  invuln: 0,
  dodge: 0,
  dodgeHitIds: new Set(),
  dodgeFxTimer: 0,
  classId: "rootbound",
  moveSpeed: 285,
  attackSpeedBonus: 0,
  abilityCooldown: 0,
  abilityMaxCooldown: CLASSES.rootbound.ability.cooldown,
  abilityFlash: 0,
  originGauge: 0,
  originGaugePulse: 0,
  buffs: {
    attackSpeed: 0,
    clawCombo: 0,
    beastForm: 0
  },
  classAction: null,
  classDamageReduction: 0,
  attack: null,
  attackBuffer: 0,
  attackCooldown: 0,
  extraAbilityCooldowns: {},
  combo: {
    weaponId: null,
    index: -1,
    timer: 0
  },
  weaponId: "huntingKnife",
  activeWeaponSlot: "weapon",
  coins: STARTING_COINS,
  inventory: ["huntingKnife"],
  equipment: {
    head: null,
    body: null,
    hands: null,
    legs: null,
    feet: null,
    trinket: null,
    crest: null,
    modification: null,
    weapon: "huntingKnife",
    secondaryWeapon: null
  },
  progression: {
    unlocked: false,
    level: 1,
    xp: 0,
    xpNext: 44,
    skillPoints: 0,
    basicStatPoints: 0,
    basicStatsSpent: {
      maxHp: 0,
      damage: 0,
      stamina: 0,
      staminaRegen: 0,
      hpRegen: 0
    },
    rootUnlocked: false,
    branchRanks: {},
    masteredBranch: null,
    learnedAbilities: [],
    evolutionTier: 0,
    hpBonus: 0,
    damageBonus: 0,
    moveBonus: 0,
    staminaBonus: 0,
    abilityPowerBonus: 0,
    abilityCooldownBonus: 0,
    originGaugeGainBonus: 0,
    originGaugePassiveBonus: 0,
    originCostReduction: 0,
    attackSpeedBonus: 0,
    weaponBurnChance: 0,
    aura: null,
    lastNodeTitle: null
  },
  notes: [
    "The old knife was already in my hand."
  ],
  newItems: new Set()
};

document.body.dataset.touchLayout = state.options.touchLayout;

function equippedItem(slot) {
  const itemId = player.equipment[slot];
  return itemId ? ITEMS[itemId] : null;
}

function itemDesign(slot, fallback = null) {
  return equippedItem(slot)?.design ?? fallback;
}

function equippedEffects() {
  const effects = {
    hpRegen: 0,
    maxHp: 0,
    moveSpeed: 0
  };
  for (const itemId of Object.values(player.equipment)) {
    const item = itemId ? ITEMS[itemId] : null;
    for (const [key, value] of Object.entries(item?.effects ?? {})) {
      effects[key] = (effects[key] ?? 0) + value;
    }
  }
  return effects;
}

function currentClass() {
  return CLASSES[player.classId] ?? CLASSES.rootbound;
}

function selectedClass() {
  return CLASSES[state.selectedClassId] ?? CLASSES.rootbound;
}

function isSandboxRun() {
  return state.runMode === "sandbox";
}

function isChallengeRun() {
  return state.runMode === "challenge";
}

function isSwampRoom(roomId = state.roomId) {
  return SWAMP_ROOM_IDS.has(roomId);
}

function isCastleRoom(roomId = state.roomId) {
  return CASTLE_ROOM_IDS.has(roomId);
}

function isCastleGateRoom(roomId = state.roomId) {
  return roomId === CASTLE_GATE_ROOM_ID;
}

function canSaveRun() {
  return (state.mode === "play" || state.mode === "journal") && !isSandboxRun() && BIOME_SAVE_ROOMS.has(state.roomId) && !state.boss;
}

function bossDefeatedFlag(bossId) {
  return bossId === "hugeRootCrawler" ? "bossDefeated" : `${bossId}Defeated`;
}

function bossIntroFlag(bossId) {
  return bossId === "hugeRootCrawler" ? "bossIntroPlayed" : `${bossId}IntroPlayed`;
}

function bossIsDefeated(bossId) {
  return Boolean(state.flags[bossDefeatedFlag(bossId)]);
}

function markBossDefeated(bossId) {
  state.flags[bossDefeatedFlag(bossId)] = true;
}

function bossIntroPlayed(bossId) {
  return Boolean(state.flags[bossIntroFlag(bossId)]);
}

function markBossIntroPlayed(bossId) {
  state.flags[bossIntroFlag(bossId)] = true;
}

function cloneSet(set) {
  return Array.from(set ?? []);
}

function restoreSet(values) {
  return new Set(values ?? []);
}

function emptyBasicStats() {
  return Object.fromEntries(BASIC_STAT_ORDER.map((key) => [key, 0]));
}

function ensureProgressionShape() {
  if (!player.progression) player.progression = {};
  const progression = player.progression;
  if (progression.basicStatPoints !== Infinity && !Number.isFinite(progression.basicStatPoints)) {
    progression.basicStatPoints = 0;
  }
  progression.basicStatsSpent = {
    ...emptyBasicStats(),
    ...(progression.basicStatsSpent ?? {})
  };
  for (const key of BASIC_STAT_ORDER) {
    const value = progression.basicStatsSpent[key];
    progression.basicStatsSpent[key] = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }
  return progression;
}

function progressionSnapshot() {
  const progression = ensureProgressionShape();
  return {
    ...progression,
    basicStatsSpent: { ...(progression.basicStatsSpent ?? emptyBasicStats()) },
    branchRanks: { ...(progression.branchRanks ?? {}) },
    learnedAbilities: [...(progression.learnedAbilities ?? [])]
  };
}

function captureCastleCheckpoint(reason = "gate") {
  if (!isCastleGateRoom() || isSandboxRun()) return;
  state.castleCheckpoint = {
    reason,
    inventory: [...player.inventory],
    equipment: { ...player.equipment },
    activeWeaponSlot: player.activeWeaponSlot,
    weaponId: player.weaponId,
    progression: progressionSnapshot(),
    notes: [...player.notes],
    newItems: cloneSet(player.newItems),
    flags: { ...state.flags },
    roomClears: cloneSet(state.roomClears)
  };
}

function shouldUseCastleCheckpointOnDeath() {
  return false;
}

function restoreCastleCheckpointAfterDeath() {
  const checkpoint = state.castleCheckpoint;
  if (!checkpoint) return false;
  const preservedCoins = player.coins;
  player.inventory = [...checkpoint.inventory];
  player.equipment = { ...checkpoint.equipment };
  player.activeWeaponSlot = checkpoint.activeWeaponSlot ?? "weapon";
  player.weaponId = checkpoint.weaponId ?? player.equipment.weapon ?? "huntingKnife";
  player.progression = {
    ...checkpoint.progression,
    basicStatsSpent: { ...emptyBasicStats(), ...(checkpoint.progression?.basicStatsSpent ?? {}) },
    branchRanks: { ...(checkpoint.progression.branchRanks ?? {}) },
    learnedAbilities: [...(checkpoint.progression.learnedAbilities ?? [])]
  };
  ensureProgressionShape();
  player.notes = [...(checkpoint.notes ?? player.notes)];
  player.newItems = restoreSet(checkpoint.newItems);
  player.coins = preservedCoins;
  state.flags = { ...checkpoint.flags };
  state.roomClears = restoreSet(checkpoint.roomClears);
  state.mode = "play";
  setGameChromeVisible(true);
  startGameMusic();
  enterRoom(CASTLE_GATE_ROOM_ID, "left", { fromCastleDeath: true });
  syncActiveWeapon({ resetCombo: true });
  applyEquipmentEffects(0);
  player.hp = player.maxHp;
  player.st = player.maxSt;
  player.invuln = 1.1;
  player.hurt = 0;
  player.attack = null;
  player.dodge = 0;
  player.vx = 0;
  player.vy = 0;
  toast("Castle checkpoint restored. Gold kept.", 1800);
  captureCastleCheckpoint("deathRestore");
  return true;
}

function readSaveSlots() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_STORAGE_KEY) || "[]");
    return Array.from({ length: SAVE_SLOT_COUNT }, (_, index) => parsed[index] ?? null);
  } catch {
    return Array.from({ length: SAVE_SLOT_COUNT }, () => null);
  }
}

function writeSaveSlots(slots) {
  try {
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(slots.slice(0, SAVE_SLOT_COUNT)));
    return true;
  } catch {
    return false;
  }
}

function saveSlotLabel(snapshot, index) {
  if (!snapshot) return `Slot ${index + 1}: Empty`;
  const title = getRoom(snapshot.roomId)?.name ?? snapshot.roomId;
  const mode = snapshot.runMode === "challenge" ? "Challenge" : "Story";
  return `Slot ${index + 1}: ${title} | LV ${snapshot.progression?.level ?? 1} | ${mode}`;
}

function makeSaveSnapshot() {
  return {
    version: 1,
    savedAt: Date.now(),
    runMode: state.runMode,
    roomId: state.roomId,
    classId: player.classId,
    hp: player.hp,
    maxHp: player.maxHp,
    st: player.st,
    maxSt: player.maxSt,
    coins: player.coins,
    inventory: [...player.inventory],
    equipment: { ...player.equipment },
    activeWeaponSlot: player.activeWeaponSlot,
    weaponId: player.weaponId,
    progression: progressionSnapshot(),
    notes: [...player.notes],
    newItems: cloneSet(player.newItems),
    flags: { ...state.flags },
    roomClears: cloneSet(state.roomClears),
    miniChestRooms: cloneSet(state.miniChestRooms)
  };
}

function restoreSaveSnapshot(snapshot) {
  if (!snapshot?.roomId || !getRoom(snapshot.roomId)) return false;
  state.mode = "play";
  state.runMode = snapshot.runMode === "challenge" ? "challenge" : "story";
  state.flags = { ...snapshot.flags };
  state.roomClears = restoreSet(snapshot.roomClears);
  state.miniChestRooms = restoreSet(snapshot.miniChestRooms);
  state.castleCheckpoint = null;
  player.classId = snapshot.classId ?? "rootbound";
  player.inventory = [...(snapshot.inventory ?? ["huntingKnife"])];
  player.equipment = { ...player.equipment, ...(snapshot.equipment ?? {}) };
  player.activeWeaponSlot = snapshot.activeWeaponSlot ?? "weapon";
  player.weaponId = snapshot.weaponId ?? player.equipment.weapon ?? "huntingKnife";
  player.progression = {
    ...snapshot.progression,
    basicStatsSpent: { ...emptyBasicStats(), ...(snapshot.progression?.basicStatsSpent ?? {}) },
    branchRanks: { ...(snapshot.progression?.branchRanks ?? {}) },
    learnedAbilities: [...(snapshot.progression?.learnedAbilities ?? [])]
  };
  ensureProgressionShape();
  player.notes = [...(snapshot.notes ?? ["The old knife was already in my hand."])];
  player.newItems = restoreSet(snapshot.newItems);
  player.coins = snapshot.coins ?? STARTING_COINS;
  player.hp = snapshot.hp ?? snapshot.maxHp ?? player.maxHp;
  player.maxHp = snapshot.maxHp ?? player.maxHp;
  player.st = snapshot.st ?? snapshot.maxSt ?? player.maxSt;
  player.maxSt = snapshot.maxSt ?? player.maxSt;
  player.vx = 0;
  player.vy = 0;
  player.attack = null;
  player.attackCooldown = 0;
  player.dodge = 0;
  player.invuln = 0.6;
  syncActiveWeapon({ resetCombo: true });
  applyEquipmentEffects(0);
  enterRoom(snapshot.roomId, "left");
  player.hp = clamp(snapshot.hp ?? player.maxHp, 1, player.maxHp);
  player.st = clamp(snapshot.st ?? player.maxSt, 0, player.maxSt);
  setGameChromeVisible(true);
  clearCard();
  startGameMusic();
  toast("Save loaded.", 1200);
  requestGamePointerLock();
  return true;
}

function saveGameSlot(index) {
  if (!canSaveRun()) {
    toast("Save at Swamp Gate or Castle Gate.", 1400);
    return false;
  }
  const slots = readSaveSlots();
  slots[index] = makeSaveSnapshot();
  const ok = writeSaveSlots(slots);
  toast(ok ? `Saved to slot ${index + 1}.` : "Save failed.", 1400);
  return ok;
}

function loadGameSlot(index) {
  const snapshot = readSaveSlots()[index];
  if (!snapshot) return false;
  initAudio();
  return restoreSaveSnapshot(snapshot);
}

function showSaveSlots(returnTo = "title") {
  exitGamePointerLock();
  stopGameMusic();
  setGameChromeVisible(false);
  state.mode = "saves";
  const slots = readSaveSlots();
  const slotButtons = slots.map((snapshot, index) => `
    <button class="saveSlotButton" data-slot="${index}" ${snapshot ? "" : "disabled"}>
      <strong>${escapeHtml(saveSlotLabel(snapshot, index))}</strong>
      <span>${snapshot ? new Date(snapshot.savedAt).toLocaleString() : "No checkpoint save yet."}</span>
    </button>
  `).join("");
  setCard(`
    <div class="card saveCard">
      <h2>Save Slots</h2>
      <p>Runs save at biome gates. Loading starts you at that checkpoint room.</p>
      <div class="saveSlotGrid">${slotButtons}</div>
      <div class="buttons">
        <button class="alt" id="saveBackBtn">Back</button>
      </div>
    </div>
  `);
  for (const button of ui.center.querySelectorAll(".saveSlotButton[data-slot]")) {
    button.onclick = () => loadGameSlot(Number(button.dataset.slot));
  }
  document.getElementById("saveBackBtn").onclick = () => {
    if (returnTo === "journal") openJournal(state.journalTab);
    else mainMenu();
  };
}

function skillPointText() {
  return player.progression.skillPoints === Infinity ? "INF memory" : `${player.progression.skillPoints} memory point${player.progression.skillPoints === 1 ? "" : "s"}`;
}

function starterWeaponItemId() {
  return POST_BOSS_STARTER_WEAPON_ID;
}

function starterWeaponName() {
  return ITEMS[starterWeaponItemId()]?.name ?? "Starter Weapon";
}

function spawnStarterWeaponReward(x = player.x + player.facing * 90, options = {}) {
  const itemId = starterWeaponItemId();
  if (!ITEMS[itemId] || state.flags.starterWeaponClaimed || ownsItem(itemId) || pickupExists(itemId)) return false;
  const room = state.room;
  const floorY = room?.floorY ?? player.y + player.h * 0.5;
  const roomWidth = room?.width ?? W;
  spawnPickup(itemId, clamp(x, 120, roomWidth - 120), floorY - 24, {
    y: options.y ?? floorY - 80,
    vx: options.vx ?? player.facing * 120,
    vy: options.vy ?? -330,
    fromDrop: options.fromDrop ?? true
  });
  return true;
}

function abilityUnlocked() {
  return originAbilityIsFull();
}

function originAbilityIsFull() {
  return state.flags.starterWeaponClaimed || player.equipment.weapon === starterWeaponItemId() || hasItem(starterWeaponItemId()) || isSandboxRun();
}

function originAbilityStage() {
  if (!abilityUnlocked()) return "locked";
  return "full";
}

function originGaugeData() {
  return currentClass().gauge ?? { label: "Origin", color: "#d6ad55", glow: "#fff0b5", cost: 55, passiveGain: 2.5, hitGain: 6, killGain: 12 };
}

function originGaugeMax() {
  return 100;
}

function originGaugeCost() {
  const cost = originGaugeData().cost ?? 55;
  return Math.max(20, cost - (player.progression?.originCostReduction || 0));
}

function originGaugeRatio() {
  return clamp(player.originGauge / originGaugeMax(), 0, 1);
}

function gainOriginGauge(amount, x = player.x, y = player.y - player.h * 0.7) {
  return;
}

function bugChargeEquipped() {
  return player.equipment.modification === "bugChargeMod";
}

function bugChargeDamage() {
  return ITEMS.bugChargeMod?.effects?.dashDamage ?? 16;
}

function xpForNextLevel(level, tier = player.progression?.evolutionTier ?? 0) {
  return Math.floor(36 + Math.pow(Math.max(1, level), 1.18) * 8 + tier * 12);
}

function resetProgression() {
  player.extraAbilityCooldowns = {};
  player.progression = {
    unlocked: false,
    level: 1,
    xp: 0,
    xpNext: xpForNextLevel(1, 0),
    skillPoints: 0,
    basicStatPoints: 0,
    basicStatsSpent: emptyBasicStats(),
    rootUnlocked: false,
    branchRanks: {},
    masteredBranch: null,
    learnedAbilities: [],
    evolutionTier: 0,
    hpBonus: 0,
    damageBonus: 0,
    moveBonus: 0,
    staminaBonus: 0,
    abilityPowerBonus: 0,
    abilityCooldownBonus: 0,
    originGaugeGainBonus: 0,
    originGaugePassiveBonus: 0,
    originCostReduction: 0,
    attackSpeedBonus: 0,
    weaponBurnChance: 0,
    aura: null,
    lastNodeTitle: null
  };
}

function basicStatSpent(key) {
  return ensureProgressionShape().basicStatsSpent[key] || 0;
}

function basicStatBonus(key) {
  const def = BASIC_STAT_DEFS[key];
  if (!def) return 0;
  const raw = basicStatSpent(key) * def.perPoint;
  if (key === "hpRegen") return Math.min(MAX_BASIC_HP_REGEN, raw);
  return raw;
}

function basicHpRegenBonus() {
  return basicStatBonus("hpRegen");
}

function basicStaminaRegenBonus() {
  return basicStatBonus("staminaRegen");
}

function canSpendBasicStat(key) {
  const progression = ensureProgressionShape();
  if (!BASIC_STAT_DEFS[key]) return false;
  if (progression.basicStatPoints !== Infinity && progression.basicStatPoints <= 0) return false;
  if (key === "hpRegen" && basicHpRegenBonus() >= MAX_BASIC_HP_REGEN) return false;
  return true;
}

function spendBasicStat(key) {
  const progression = ensureProgressionShape();
  if (!canSpendBasicStat(key)) {
    toast(key === "hpRegen" ? "Basic HP regen is capped." : "No Basic Stat Points.", 1100);
    return false;
  }
  const def = BASIC_STAT_DEFS[key];
  if (progression.basicStatPoints !== Infinity) progression.basicStatPoints -= 1;
  progression.basicStatsSpent[key] = (progression.basicStatsSpent[key] || 0) + 1;
  const previousMaxHp = player.maxHp;
  const previousMaxSt = player.maxSt;
  applyEquipmentEffects(0);
  if (key === "maxHp") player.hp = clamp(player.hp + (player.maxHp - previousMaxHp), 1, player.maxHp);
  if (key === "stamina") player.st = clamp(player.st + (player.maxSt - previousMaxSt), 0, player.maxSt);
  playSfx("interact");
  toast(`${def.label} ${def.short}`, 1200);
  if (isCastleGateRoom()) captureCastleCheckpoint("basicStat");
  return true;
}

function progressionDamageBonus() {
  return player.progression?.unlocked ? (player.progression.damageBonus || 0) + basicStatBonus("damage") : 0;
}

function royalCrestLastStandActive() {
  return player.equipment.crest === "royalCrest" && player.maxHp > 0 && player.hp / player.maxHp <= 0.35;
}

function playerDamageAmount(amount, options = {}) {
  let total = amount + progressionDamageBonus();
  if (options.source === "weapon" && royalCrestLastStandActive()) {
    total *= 1 + (ITEMS.royalCrest?.effects?.lastStand ?? 0.25);
  }
  if (isChallengeRun()) total *= CHALLENGE_PLAYER_DAMAGE_SCALE;
  return Math.max(1, Math.round(total));
}

function baseSkillTree(classId = player.classId) {
  return CLASS_SKILL_TREES[classId] ?? CLASS_SKILL_TREES.rootbound;
}

function evolvedSkillTree(classId, masteredBranchId) {
  const base = baseSkillTree(classId);
  const baseBranch = base.paths?.[masteredBranchId] ?? Object.values(base.paths ?? {})[0];
  const klass = CLASSES[classId] ?? CLASSES.rootbound;
  const tier = (player.progression?.evolutionTier ?? 1) + 1;
  const branchId = `${baseBranch?.id ?? "final"}Final`;
  const branchName = baseBranch?.name ?? "Mastery Path";
  const color = baseBranch?.color ?? "#ffd84d";
  return {
    root: {
      title: `${branchName} Memory`,
      kind: "Memory",
      desc: `The mastered path reforms into upgraded ${klass.name} class upgrades.`,
      abilityPower: 2 + tier,
      stamina: 4 + tier
    },
    paths: {
      [branchId]: {
        id: branchId,
        name: `${branchName} Mastery`,
        desc: "A one-branch evolved tree. Max it, then it resets stronger.",
        color,
        nodes: [
          { title: `${klass.ability.name} Shape`, kind: "Ability", desc: `${klass.ability.name} gains stronger origin scaling.`, abilityPower: 4 + tier, abilityCooldown: 0.2 },
          { title: `${branchName} Skin`, kind: "Aura", desc: "The mastered path becomes a visible class aura.", aura: `${baseBranch?.id ?? "mastery"} mastery`, hp: 6 + tier * 2 },
          { title: `${klass.name} Drive`, kind: "Passive", desc: "More damage, stamina, and movement from the evolved tree.", damage: 1 + Math.floor(tier * 0.5), stamina: 8 + tier * 2, move: 4 + tier },
          { title: `${branchName} Apex`, kind: "Buff", desc: "Final Upgrade: max this path to reset the one-branch tree stronger.", final: true, abilityPower: 3 + tier, damage: 1, hp: 8 + tier * 2 }
        ]
      }
    }
  };
}

function currentSkillTree() {
  const progression = player.progression;
  if (progression?.masteredBranch) return evolvedSkillTree(player.classId, progression.masteredBranch);
  return baseSkillTree(player.classId);
}

function currentSkillBranches() {
  return currentSkillTree().paths ?? {};
}

function getSkillBranch(branchId) {
  return currentSkillBranches()[branchId] ?? null;
}

function branchRank(branchId) {
  return player.progression?.branchRanks?.[branchId] ?? 0;
}

function setBranchRank(branchId, rank) {
  if (!player.progression.branchRanks) player.progression.branchRanks = {};
  player.progression.branchRanks[branchId] = rank;
}

function learnedAbilityKey(abilityId) {
  const index = player.progression?.learnedAbilities?.indexOf(abilityId) ?? -1;
  return index >= 0 ? LEARNED_ABILITY_KEYS[index] : null;
}

function nextLearnedAbilityKey() {
  return LEARNED_ABILITY_KEYS[player.progression?.learnedAbilities?.length ?? 0] ?? LEARNED_ABILITY_KEYS[LEARNED_ABILITY_KEYS.length - 1];
}

function learnedAbilityByKey(key) {
  const index = LEARNED_ABILITY_KEYS.indexOf(key);
  const abilityId = index >= 0 ? player.progression?.learnedAbilities?.[index] : null;
  return abilityId ? LEARNED_ABILITIES[abilityId] : null;
}

function skillNodeKindText(node) {
  const base = node?.final ? `${node.kind} Final Upgrade` : node?.kind ?? "";
  if (!node?.abilityId) return base;
  return `${base} ${learnedAbilityKey(node.abilityId) ?? nextLearnedAbilityKey()}`;
}

function skillNodeDescText(node) {
  if (!node?.abilityId) return node?.desc ?? "";
  const key = learnedAbilityKey(node.abilityId);
  return `${node.desc} ${key ? `Assigned to ${key}.` : `Will assign to ${nextLearnedAbilityKey()}.`}`;
}

function unlockLearnedAbility(abilityId) {
  if (!abilityId || !LEARNED_ABILITIES[abilityId]) return;
  const learned = player.progression.learnedAbilities ?? (player.progression.learnedAbilities = []);
  if (learned.includes(abilityId)) return;
  if (learned.length >= LEARNED_ABILITY_KEYS.length) {
    toast("No extra ability slot open.", 1100);
    return;
  }
  learned.push(abilityId);
  player.extraAbilityCooldowns[abilityId] = 0;
  const key = learnedAbilityKey(abilityId);
  spawnFloater(`${key} ${LEARNED_ABILITIES[abilityId].name}`, player.x, player.y - player.h * 1.08, "#fff0b5");
}

function progressionAbilityPowerBonus() {
  return player.progression?.unlocked ? player.progression.abilityPowerBonus || 0 : 0;
}

function classAbilityDamage(amount) {
  return Math.max(1, amount + progressionAbilityPowerBonus());
}

function progressionWeaponBurnChance() {
  return player.progression?.unlocked ? player.progression.weaponBurnChance || 0 : 0;
}

function abilityCooldownSeconds(ability) {
  const reduction = player.progression?.unlocked ? player.progression.abilityCooldownBonus || 0 : 0;
  return Math.max(1.1, (ability.cooldown ?? 1) - reduction);
}

function abilityOrbLabel(ability) {
  if (ability.id === "thornSpear") return "Spear";
  if (ability.id === "ruinPounce") return "Pounce";
  if (ability.id === "ambushCut") return "Ambush";
  return ability.name;
}

function classRenderProfile(classId = player.classId) {
  return CLASS_RENDER[classId] ?? CLASS_RENDER.rootbound;
}

function classTagsHtml(klass) {
  const tags = {
    rootbound: ["Cooldown R", "Root Control", "Thorn Spear"],
    frenzied: ["Cooldown R", "Close Pressure", "Ruin Pounce"],
    hollow: ["Cooldown R", "Leech Cut", "Ambush R"]
  }[klass.id] ?? [classRenderProfile(klass.id).label];
  return tags.map((tag) => `<span class="classTag">${tag}</span>`).join("");
}

function attackSpeedMultiplier() {
  const classMult = currentClass().stats.attackSpeed ?? 1;
  const buffMult = player.buffs.attackSpeed > 0 ? 1.28 : 1;
  const progressionMult = 1 + (player.progression?.attackSpeedBonus || 0);
  return classMult * buffMult * progressionMult;
}

function comboStepsForWeapon(weapon) {
  const familySteps = WEAPON_FAMILY_COMBOS[weapon.family] ?? DEFAULT_COMBO_STEPS;
  const namedSteps = WEAPON_COMBOS[weapon.id];
  return familySteps.map((step, index) => ({
    ...(WEAPON_COMBO_VISUALS[weapon.family]?.[index] ?? {}),
    ...step,
    ...(weapon.id === "guardMace" ? (namedSteps?.[index] ?? {}) : {}),
    name: namedSteps?.[index]?.name ?? step.name
  }));
}

function resetWeaponCombo() {
  player.combo.weaponId = null;
  player.combo.index = -1;
  player.combo.timer = 0;
}

function previewNextWeaponComboStep(weapon) {
  const steps = comboStepsForWeapon(weapon);
  const sameWeapon = player.combo.weaponId === weapon.id && player.combo.timer > 0;
  const index = sameWeapon ? (player.combo.index + 1) % steps.length : 0;
  return { ...steps[index], index };
}

function commitWeaponComboStep(weapon, index) {
  player.combo.weaponId = weapon.id;
  player.combo.index = index;
  player.combo.timer = COMBO_RESET_TIME;
}

function weaponAttackProfile(weapon, comboStep = null) {
  const speed = attackSpeedMultiplier();
  const effects = equippedEffects();
  const quickNock = effects.quickNock && (weapon.family === "bow" || weapon.family === "crossbow");
  const damageScale = comboStep?.damageScale ?? 1;
  const reachScale = (comboStep?.reachScale ?? 1) * (quickNock ? 1.16 : 1);
  const arcScale = comboStep?.arcScale ?? 1;
  const cooldownScale = comboStep?.cooldownScale ?? 1;
  const windScale = comboStep?.windScale ?? 1;
  const activeScale = comboStep?.activeScale ?? 1;
  const recoverScale = comboStep?.recoverScale ?? 1;
  const projectileRadiusScale = comboStep?.projectileRadiusScale ?? 1;
  return {
    ...weapon,
    lightDamage: Math.max(1, Math.round(weapon.lightDamage * damageScale)),
    reach: weapon.reach * reachScale,
    arc: weapon.arc * arcScale,
    visualArc: (weapon.visualArc ?? weapon.arc) * arcScale,
    wind: (weapon.wind * windScale) / speed,
    active: Math.max(0.035, (weapon.active * activeScale) / speed),
    recover: (weapon.recover * recoverScale) / speed,
    lightCooldown: (weapon.lightCooldown * cooldownScale) / speed,
    projectileRadius: (weapon.projectileRadius ?? 10) * projectileRadiusScale,
    projectilePierce: (weapon.projectilePierce ?? 1) + (comboStep?.pierceBonus ?? 0),
    projectileSpeed: (weapon.projectileSpeed ?? 560) * (quickNock ? 1.18 : 1),
    projectileKind: comboStep?.projectileKind ?? weapon.projectileKind
  };
}

function isPhysicalProjectileKind(kind) {
  return ["arrow", "piercing", "bolt"].includes(kind);
}

function isMagicProjectileKind(kind) {
  return ["magic", "wand", "scepter", "hollow"].includes(kind);
}

function projectileSparkleColor(kind) {
  if (kind === "bolt") return "#fff0b5";
  if (kind === "arrow" || kind === "piercing") return "#d8ecb2";
  if (kind === "hollow") return "#d9b7ff";
  if (kind === "scepter") return "#fff0b5";
  return "#caa7ff";
}

function weaponSwingThickness(weapon, comboStep = null) {
  if (comboStep?.thickness) return comboStep.thickness;
  const base = {
    dagger: 8,
    sword: 12,
    axe: 15,
    great: 18,
    spear: 9,
    dual: 10,
    punching: 12
  }[weapon?.family] ?? 9;
  return comboStep?.index === 2 ? base + 2 : base;
}

function weaponAttackShake(weapon, comboStep = null) {
  const base = {
    dagger: 0.036,
    sword: 0.052,
    axe: 0.066,
    great: 0.09,
    spear: 0.048,
    dual: 0.045,
    punching: 0.048,
    bow: 0.035,
    crossbow: 0.045,
    wand: 0.04,
    scepter: 0.07
  }[weapon?.family] ?? 0.045;
  return comboStep?.index === 2 ? base + 0.025 : base;
}

addEventListener("keydown", (event) => {
  if (!keys[event.code]) pressed.add(event.code);
  keys[event.code] = true;
  if (["Space", "Tab", "KeyR", "KeyF", "KeyT", "KeyG"].includes(event.code)) {
    event.preventDefault();
  }
  if (event.code === "Enter" && state.mode === "title") {
    initAudio();
    state.pendingRunMode = "story";
    showClassSelect();
  } else if (event.code === "Enter" && state.mode === "menu" && !document.activeElement?.classList?.contains("classOption")) {
    initAudio();
    startRun();
  }
  if (event.code === "Tab" && state.flags.journalFound && !event.repeat) {
    if (state.mode === "play" && !cinematicLocksControls()) openJournal();
    else if (state.mode === "journal") resumeGame();
    else if (state.mode === "shop") resumeGame();
  }
});

addEventListener("keyup", (event) => {
  keys[event.code] = false;
});

function consume(code) {
  if (!pressed.has(code)) return false;
  pressed.delete(code);
  return true;
}

function consumeAny(codes) {
  return codes.some((code) => consume(code));
}

function bindButton(element, down, up = () => {}) {
  element.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    element.setPointerCapture(event.pointerId);
    down(event);
  });
  element.addEventListener("pointerup", (event) => {
    event.preventDefault();
    up(event);
  });
  element.addEventListener("pointercancel", (event) => {
    event.preventDefault();
    up(event);
  });
}

function updateStick(event) {
  const rect = ui.stick.getBoundingClientRect();
  const cx = rect.left + rect.width * 0.5;
  const cy = rect.top + rect.height * 0.5;
  const max = rect.width * 0.38;
  let dx = event.clientX - cx;
  let dy = event.clientY - cy;
  const length = Math.hypot(dx, dy);
  if (length > max) {
    const scale = max / length;
    dx *= scale;
    dy *= scale;
  }
  touch.moveX = Math.abs(dx) < max * TOUCH_STICK_DEADZONE ? 0 : dx / max;
  touch.moveY = Math.abs(dy) < max * TOUCH_STICK_DEADZONE ? 0 : dy / max;
  if (length > max * TOUCH_STICK_DEADZONE && Math.abs(touch.moveX) > 0.18) {
    player.facing = sign(touch.moveX);
    mouse.active = false;
    mouse.aimIntent = false;
  }
  ui.stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
}

ui.stick.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  touch.stickPointer = event.pointerId;
  ui.stick.setPointerCapture(event.pointerId);
  updateStick(event);
});

ui.stick.addEventListener("pointermove", (event) => {
  if (event.pointerId === touch.stickPointer) updateStick(event);
});

function releaseStick(event) {
  if (event.pointerId !== touch.stickPointer) return;
  touch.stickPointer = null;
  touch.moveX = 0;
  touch.moveY = 0;
  ui.stickKnob.style.transform = "translate(0, 0)";
}

ui.stick.addEventListener("pointerup", releaseStick);
ui.stick.addEventListener("pointercancel", releaseStick);

function updateTouchAttackAim(event) {
  const rect = ui.attackBtn.getBoundingClientRect();
  const cx = rect.left + rect.width * 0.5;
  const cy = rect.top + rect.height * 0.5;
  const dx = event.clientX - cx;
  const dy = event.clientY - cy;
  const length = Math.hypot(dx, dy);
  const deadzone = rect.width * 0.16;
  if (length > deadzone) {
    touch.aimX = dx / length;
    touch.aimY = dy / length;
    touch.hasAim = true;
  } else {
    touch.hasAim = false;
  }
  mouse.active = false;
  mouse.aimIntent = false;
}

ui.attackBtn.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  touch.attackPointer = event.pointerId;
  touch.attackHeld = true;
  ui.attackBtn.setPointerCapture(event.pointerId);
  updateTouchAttackAim(event);
  queueAttack();
});
ui.attackBtn.addEventListener("pointermove", (event) => {
  if (event.pointerId === touch.attackPointer) updateTouchAttackAim(event);
});
function releaseAttackAim(event) {
  if (event.pointerId !== touch.attackPointer) return;
  event.preventDefault();
  touch.attackPointer = null;
  touch.attackHeld = false;
  touch.hasAim = false;
}
ui.attackBtn.addEventListener("pointerup", releaseAttackAim);
ui.attackBtn.addEventListener("pointercancel", releaseAttackAim);
bindButton(ui.jumpBtn, () => jump());
bindButton(ui.dodgeBtn, () => dodge());
bindButton(ui.interactBtn, () => interact());
bindButton(ui.abilityOrb, () => useClassAbility());
for (const button of ui.extraAbilityButtons) {
  bindButton(button, () => useLearnedAbilityByKey(button.dataset.key));
}
bindButton(ui.journalBtn, () => {
  if (state.flags.journalFound && state.mode === "play" && !cinematicLocksControls()) openJournal();
});
bindButton(ui.cameraBtn, () => recenterCamera());

function usingTouchAim() {
  return isCoarsePointer() && touch.hasAim;
}

function resetTouchAim() {
  touch.moveX = 0;
  touch.moveY = 0;
  touch.aimX = player.facing;
  touch.aimY = 0;
  touch.hasAim = isCoarsePointer();
  ui.stickKnob.style.transform = "translate(0, 0)";
}

function recenterCamera() {
  if (state.mode !== "play" || !state.room) return;
  const bounds = cameraBounds(state.room, state.camera.zoom);
  state.camera.leadX = 0;
  state.camera.recenterTimer = 0.85;
  state.camera.x = clamp(player.x, bounds.minX, bounds.maxX);
  state.camera.y = H * 0.5;
  state.camera.shake = 0;
  toast("Camera centered.", 700);
}

function updateMouseFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const cssScale = Math.min(rect.width / W, rect.height / H);
  const cssOffsetX = (rect.width - W * cssScale) * 0.5;
  const cssOffsetY = (rect.height - H * cssScale) * 0.5;
  mouse.screenX = clamp((event.clientX - rect.left - cssOffsetX) / cssScale, 0, W);
  mouse.screenY = clamp((event.clientY - rect.top - cssOffsetY) / cssScale, 0, H);
  mouse.inside = true;
  mouse.active = true;
  mouse.aimIntent = true;
  const worldX = state.camera.x + (mouse.screenX - W * 0.5) / state.camera.zoom;
  const worldY = state.camera.y + (mouse.screenY - H * 0.5) / state.camera.zoom;
  mouse.offsetX = worldX - player.x;
  mouse.offsetY = worldY - (player.y - 10);
  clampMouseOffset();
  updateMouseWorldFromOffset();
}

function updateMouseWorldFromOffset() {
  mouse.worldX = player.x + mouse.offsetX;
  mouse.worldY = player.y - 10 + mouse.offsetY;
}

function aimAngleForWeapon(weapon, rawAngle = player.aimAngle) {
  return rawAngle;
}

function aimDirectionSide() {
  return Math.abs(player.aimX) > 0.12 ? sign(player.aimX) : player.facing;
}

function clampMouseOffset(facing = player.facing) {
  const distance = Math.hypot(mouse.offsetX, mouse.offsetY);
  const angle = distance > 0.001 ? Math.atan2(mouse.offsetY, mouse.offsetX) : (facing > 0 ? 0 : Math.PI);
  let nextDistance = clamp(distance || AIM_ORBIT_DISTANCE, MIN_AIM_DISTANCE, MAX_AIM_DISTANCE);
  nextDistance = lerp(nextDistance, AIM_ORBIT_DISTANCE, AIM_RADIAL_PULL);
  mouse.offsetX = Math.cos(angle) * nextDistance;
  mouse.offsetY = Math.sin(angle) * nextDistance;
}

function mirrorAimForFacing(newFacing) {
  if (newFacing === player.facing) return;
  const currentDistance = Math.hypot(mouse.offsetX, mouse.offsetY) || AIM_ORBIT_DISTANCE;
  const currentX = Math.abs(mouse.offsetX) > 0.001 ? Math.abs(mouse.offsetX) : currentDistance * 0.22;
  mouse.offsetX = newFacing * currentX;
  clampMouseOffset(newFacing);
  updateMouseWorldFromOffset();
}

function cssPixelToVirtualScale() {
  const rect = canvas.getBoundingClientRect();
  return Math.min(rect.width / W, rect.height / H) || 1;
}

function updateLockedMouse(event) {
  const screenScale = cssPixelToVirtualScale();
  const worldScale = 1 / (screenScale * Math.max(0.1, state.camera.zoom));
  const moveX = (Number(event.movementX) || 0) * worldScale;
  const moveY = (Number(event.movementY) || 0) * worldScale;
  const distance = Math.hypot(mouse.offsetX, mouse.offsetY) || AIM_ORBIT_DISTANCE;
  const angle = Math.atan2(mouse.offsetY, mouse.offsetX);
  const radialX = Math.cos(angle);
  const radialY = Math.sin(angle);
  const tangentX = -radialY;
  const tangentY = radialX;
  const tangentialMove = moveX * tangentX + moveY * tangentY;
  const radialMove = moveX * radialX + moveY * radialY;
  const nextAngle = angle + (tangentialMove / Math.max(MIN_AIM_DISTANCE, distance)) * AIM_ORBIT_TURN_RATE;
  let nextDistance = distance + radialMove * AIM_RADIAL_CONTROL;
  nextDistance = lerp(nextDistance, AIM_ORBIT_DISTANCE, AIM_RADIAL_PULL);
  nextDistance = clamp(nextDistance, MIN_AIM_DISTANCE, MAX_AIM_DISTANCE);
  mouse.offsetX = Math.cos(nextAngle) * nextDistance;
  mouse.offsetY = Math.sin(nextAngle) * nextDistance;
  mouse.active = true;
  mouse.aimIntent = true;
  mouse.inside = true;
  clampMouseOffset();
  updateMouseWorldFromOffset();
}

function shouldUsePointerLock() {
  return !window.matchMedia || window.matchMedia("(pointer:fine)").matches;
}

function canPointerLock() {
  return shouldUsePointerLock() && Boolean(canvas.requestPointerLock);
}

function requestGamePointerLock() {
  if (state.mode !== "play" || !canPointerLock()) return;
  if (document.pointerLockElement === canvas) return;
  try {
    const lockRequest = canvas.requestPointerLock();
    if (lockRequest && typeof lockRequest.catch === "function") lockRequest.catch(() => {});
  } catch {
    mouse.locked = false;
    setPointerLockClass();
  }
}

function exitGamePointerLock() {
  if (document.pointerLockElement === canvas && document.exitPointerLock) {
    try {
      document.exitPointerLock();
    } catch {
      mouse.locked = false;
      setPointerLockClass();
    }
  }
}

function setPointerLockClass() {
  document.body.classList.toggle("pointerLocked", mouse.locked);
}

document.addEventListener("pointerlockchange", () => {
  mouse.locked = document.pointerLockElement === canvas;
  setPointerLockClass();
  if (mouse.locked) {
    mouse.active = true;
    clampMouseOffset();
    updateMouseWorldFromOffset();
  }
});

document.addEventListener("pointerlockerror", () => {
  mouse.locked = false;
  setPointerLockClass();
});

canvas.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement === canvas) {
    updateLockedMouse(event);
  } else if (!canPointerLock() || state.mode !== "play" || !mouse.active) {
    updateMouseFromEvent(event);
  }
});
canvas.addEventListener("mouseenter", (event) => {
  if (document.pointerLockElement !== canvas && (!canPointerLock() || state.mode !== "play" || !mouse.active)) {
    updateMouseFromEvent(event);
  }
});
canvas.addEventListener("mouseleave", () => {
  mouse.inside = false;
});
canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || event.pointerType === "touch") return;
  event.preventDefault();
  if (document.pointerLockElement === canvas) {
    updateLockedMouse(event);
  } else {
    if (!mouse.active || !canPointerLock()) updateMouseFromEvent(event);
    requestGamePointerLock();
  }
  queueAttack();
});
canvas.addEventListener("contextmenu", (event) => event.preventDefault());

function mainMenu() {
  exitGamePointerLock();
  stopGameMusic();
  setGameChromeVisible(false);
  state.mode = "title";
  state.room = null;
  state.roomId = "wakingStones";
  state.cinematic = null;
  state.pendingRunMode = "story";
  setCinematicChromeVisible(false);
  state.camera.zoom = 1.18;
  state.camera.x = W * 0.5;
  state.camera.y = H * 0.5;
  state.camera.leadX = 0;
  setCard(`
    <div class="card titleCard titleMinimal">
      <div class="titleCastleScene" aria-hidden="true">
        <span class="titleMinimalFog"></span>
        <span class="titleMinimalKeep"></span>
        <span class="titleMinimalGate"></span>
        <span class="titleMinimalSigil"></span>
        <span class="titleCastleFloor"></span>
      </div>
      <div class="titleMenu">
        <h1>${GAME_TITLE}</h1>
        <div class="titleRule" aria-hidden="true"></div>
        <div class="buttons">
          <button id="chooseClassBtn">Start</button>
          <button id="sandboxBtn">Sandbox</button>
          <button id="challengeBtn">Challenge</button>
          <button class="alt" id="optionsBtn">Options</button>
        </div>
      </div>
    </div>
  `);
  document.getElementById("chooseClassBtn").onclick = () => {
    initAudio();
    playSfx("interact");
    state.pendingRunMode = "story";
    state.pendingStartPoint = state.pendingStartPoint ?? "beginning";
    showClassSelect();
  };
  document.getElementById("sandboxBtn").onclick = () => {
    initAudio();
    playSfx("interact");
    state.pendingRunMode = "sandbox";
    state.pendingStartPoint = "castle";
    showClassSelect();
  };
  document.getElementById("challengeBtn").onclick = () => {
    initAudio();
    playSfx("interact");
    state.pendingRunMode = "challenge";
    state.pendingStartPoint = "beginning";
    showClassSelect();
  };
  document.getElementById("optionsBtn").onclick = () => {
    initAudio();
    playSfx("interact");
    showOptionsMenu("title");
  };
}

function showClassSelect() {
  exitGamePointerLock();
  stopGameMusic();
  setGameChromeVisible(false);
  state.mode = "menu";
  state.room = null;
  state.roomId = "wakingStones";
  state.cinematic = null;
  setCinematicChromeVisible(false);
  const sandbox = state.pendingRunMode === "sandbox";
  const challenge = state.pendingRunMode === "challenge";
  const startPointId = STORY_START_POINTS.some((point) => point.id === state.pendingStartPoint) ? state.pendingStartPoint : "beginning";
  state.pendingStartPoint = sandbox ? "castle" : challenge ? "beginning" : startPointId;
  const classCards = Object.values(CLASSES).map((klass) => `
    <button class="classOption ${klass.id === state.selectedClassId ? "isSelected" : ""}" data-class="${klass.id}" style="--class-color:${klass.gauge?.color ?? "#d6ad55"}" aria-label="Choose ${klass.name}">
      <strong>${klass.name}</strong>
    </button>
  `).join("");
  const startChoices = !sandbox && !challenge ? `
    <div class="startPointGrid" aria-label="Choose start point">
      ${STORY_START_POINTS.map((point) => `
        <button class="startPointOption ${point.id === state.pendingStartPoint ? "isSelected" : ""}" data-start-point="${point.id}">
          <strong>${point.label}</strong>
          <span>${point.note}</span>
        </button>
      `).join("")}
    </div>
  ` : "";
  setCard(`
    <div class="card classCard classMinimal" data-run-mode="${sandbox ? "sandbox" : challenge ? "challenge" : "story"}">
      <div class="classBackdrop" aria-hidden="true">
        <span class="classWall classWallLeft"></span>
        <span class="classWall classWallRight"></span>
        <span class="classHeaderStone"></span>
      </div>
      <header class="classHeader">
        <span class="classKicker">${sandbox ? "Sandbox" : challenge ? "Challenge" : "New Run"}</span>
        <h1 class="classPickTitle">Choose Class</h1>
      </header>
      <div class="classGrid" id="classPicker">${classCards}</div>
      ${startChoices}
      <div class="buttons">
        <button id="startBtn">${sandbox ? "Enter Sandbox" : challenge ? "Begin Challenge" : "Wake Up"}</button>
        <button class="alt" id="optionsBtn">Options</button>
        <button class="alt" id="titleBtn">Back</button>
      </div>
    </div>
  `);
  const startButton = document.getElementById("startBtn");
  startButton.onclick = () => {
    if (state.mode === "play" || startButton.disabled) return;
    startButton.disabled = true;
    initAudio();
    const runMode = ui.center.querySelector(".classCard")?.dataset.runMode ?? (sandbox ? "sandbox" : challenge ? "challenge" : "story");
    startRun(runMode);
  };
  for (const button of ui.center.querySelectorAll(".classOption[data-class]")) {
    button.onclick = () => {
      initAudio();
      playSfx("interact");
      state.selectedClassId = button.dataset.class;
      showClassSelect();
    };
  }
  for (const button of ui.center.querySelectorAll(".startPointOption[data-start-point]")) {
    button.onclick = () => {
      initAudio();
      playSfx("interact");
      state.pendingStartPoint = button.dataset.startPoint;
      showClassSelect();
    };
  }
  document.getElementById("optionsBtn").onclick = () => {
    initAudio();
    playSfx("interact");
    showOptionsMenu("class");
  };
  document.getElementById("titleBtn").onclick = () => {
    initAudio();
    playSfx("interact");
    mainMenu();
  };
}

function showOptionsMenu(returnTo = state.mode === "menu" ? "class" : "title") {
  exitGamePointerLock();
  setGameChromeVisible(false);
  state.mode = "options";
  state.room = null;
  const shakeLabel = state.options.screenShake === "full" ? "Full" : "Soft";
  const hintsLabel = state.options.openingHints ? "On" : "Off";
  const musicLabel = state.options.musicEnabled ? "On" : "Off";
  const sfxLabel = state.options.sfxEnabled ? "On" : "Off";
  const touchLabel = state.options.touchLayout === "tablet" ? "Tablet" : state.options.touchLayout === "reach" ? "Reach" : "Compact";
  const sandbox = state.pendingRunMode === "sandbox";
  const challenge = state.pendingRunMode === "challenge";
  setCard(`
    <div class="card optionsCard">
      <h2>Options</h2>
      <div class="optionGrid">
        <div class="optionCell">
          <strong>Body Facing</strong>
          <span>Random Guy faces the direction you are moving or last moved.</span>
        </div>
        <div class="optionCell">
          <strong>Free Arm Aim</strong>
          <span>Cursor or attack-stick rotates the arm and weapon in 360 degrees.</span>
        </div>
        <div class="optionCell">
          <strong>Screen Shake</strong>
          <span>${shakeLabel}</span>
        </div>
        <div class="optionCell">
          <strong>Opening Hints</strong>
          <span>${hintsLabel}</span>
        </div>
        <div class="optionCell">
          <strong>Music</strong>
          <span>${musicLabel}</span>
        </div>
        <div class="optionCell">
          <strong>SFX</strong>
          <span>${sfxLabel}</span>
        </div>
        <div class="optionCell">
          <strong>Touch Layout</strong>
          <span>${touchLabel}</span>
        </div>
      </div>
      <div class="buttons">
        <button id="toggleShakeBtn">Shake: ${shakeLabel}</button>
        <button id="toggleHintsBtn">Hints: ${hintsLabel}</button>
        <button id="toggleMusicBtn">Music: ${musicLabel}</button>
        <button id="toggleSfxBtn">SFX: ${sfxLabel}</button>
        <button id="toggleTouchBtn">Touch: ${touchLabel}</button>
        <button id="optionsStartBtn">${returnTo === "class" ? (sandbox ? "Enter Sandbox" : challenge ? "Begin Challenge" : "Wake Up") : "Choose Class"}</button>
        <button class="alt" id="backBtn">Back</button>
      </div>
    </div>
  `);
  document.getElementById("toggleShakeBtn").onclick = () => {
    initAudio();
    playSfx("interact");
    state.options.screenShake = state.options.screenShake === "full" ? "soft" : "full";
    showOptionsMenu(returnTo);
  };
  document.getElementById("toggleHintsBtn").onclick = () => {
    initAudio();
    playSfx("interact");
    state.options.openingHints = !state.options.openingHints;
    showOptionsMenu(returnTo);
  };
  document.getElementById("toggleMusicBtn").onclick = () => {
    initAudio();
    state.options.musicEnabled = !state.options.musicEnabled;
    syncAudioOptions();
    showOptionsMenu(returnTo);
  };
  document.getElementById("toggleSfxBtn").onclick = () => {
    initAudio();
    state.options.sfxEnabled = !state.options.sfxEnabled;
    syncAudioOptions();
    playSfx("interact");
    showOptionsMenu(returnTo);
  };
  document.getElementById("toggleTouchBtn").onclick = () => {
    initAudio();
    playSfx("interact");
    state.options.touchLayout = state.options.touchLayout === "compact" ? "tablet" : state.options.touchLayout === "tablet" ? "reach" : "compact";
    document.body.dataset.touchLayout = state.options.touchLayout;
    showOptionsMenu(returnTo);
  };
  document.getElementById("optionsStartBtn").onclick = () => {
    initAudio();
    const startButton = document.getElementById("optionsStartBtn");
    if (returnTo === "class") {
      if (state.mode === "play" || startButton.disabled) return;
      startButton.disabled = true;
      startRun(sandbox ? "sandbox" : challenge ? "challenge" : "story");
    }
    else {
      state.pendingRunMode = "story";
      showClassSelect();
    }
  };
  document.getElementById("backBtn").onclick = () => {
    initAudio();
    playSfx("interact");
    if (returnTo === "class") showClassSelect();
    else mainMenu();
  };
}

function resumeGame() {
  if (state.mode === "menu") return;
  state.mode = "play";
  setGameChromeVisible(true);
  clearCard();
  playSfx("interact");
  requestGamePointerLock();
  if (state.roomId === "wakingStones" && state.opening.chestGuide && !state.flags.starterChestOpened) {
    state.opening.chestGuide = false;
    toast("The chest waits ahead.", 1500);
  }
}

function applyClassLoadout(klass, options = {}) {
  const sandbox = Boolean(options.sandbox);
  const stats = klass.stats;
  player.classId = klass.id;
  player.w = stats.width ?? 30;
  player.h = stats.height ?? 58;
  player.moveSpeed = stats.moveSpeed ?? 285;
  player.maxSt = stats.maxStamina ?? 100;
  player.maxHp = stats.maxHp ?? 100;
  player.hp = player.maxHp;
  player.st = player.maxSt;
  player.abilityCooldown = 0;
  player.abilityMaxCooldown = klass.ability.cooldown;
  player.abilityFlash = 0;
  player.originGauge = sandbox ? originGaugeMax() : 0;
  player.originGaugePulse = 0;
  player.buffs = {
    attackSpeed: 0,
    clawCombo: 0,
    beastForm: 0
  };
  player.classAction = null;
  player.classDamageReduction = 0;
  player.weaponId = sandbox ? starterWeaponItemId() : "huntingKnife";
  player.activeWeaponSlot = "weapon";
  player.coins = sandbox ? SANDBOX_COINS : STARTING_COINS;
  player.inventory = [];
  player.equipment = {
    head: null,
    body: null,
    hands: null,
    legs: null,
    feet: null,
    trinket: null,
    crest: null,
    modification: null,
    weapon: sandbox ? starterWeaponItemId() : "huntingKnife",
    secondaryWeapon: null
  };
  resetProgression();
  player.dodgeHitIds = new Set();
  player.dodgeFxTimer = 0;
}

function applyStoryStartPoint(startPointId = "beginning") {
  const start = STORY_START_POINTS.find((point) => point.id === startPointId) ?? STORY_START_POINTS[0];
  if (start.id === "beginning") return start;

  Object.assign(state.flags, {
    journalFound: true,
    knifeBroken: true,
    bossDefeated: true,
    bossIntroPlayed: true,
    swordClaimed: true,
    starterWeaponClaimed: true,
    starterChestOpened: true,
    postBossScrapSpawned: true,
    postBossScrapRead: true,
    progressionUnlocked: true
  });
  if (start.id === "castle") {
    state.flags.redWolfDefeated = true;
    state.flags.redWolfIntroPlayed = true;
    state.roomClears.add("swampGate");
    state.roomClears.add("marshCrossing");
    state.roomClears.add("drownedCauseway");
    state.roomClears.add("isletGauntlet");
    state.roomClears.add("redWolfDen");
  }
  unlockProgression();
  const starterGear = {
    head: "starterCap",
    body: "starterTunic",
    hands: "starterGlove",
    legs: "starterPants",
    trinket: "starterCharm"
  };
  for (const [slot, itemId] of Object.entries(starterGear)) {
    if (ITEMS[itemId]) player.equipment[slot] = itemId;
  }
  const starterWeapon = starterWeaponItemId();
  if (ITEMS.huntingKnife && !player.inventory.includes("huntingKnife")) player.inventory.push("huntingKnife");
  player.equipment.weapon = starterWeapon;
  player.weaponId = starterWeapon;
  player.activeWeaponSlot = "weapon";
  player.notes = [
    start.id === "castle"
      ? "I woke at the Castle Gate with the marsh already behind me."
      : "I woke at the Swamp Gate with the first ruin already behind me."
  ];
  applyEquipmentEffects(0);
  player.hp = player.maxHp;
  player.st = player.maxSt;
  return start;
}

function startRun(runMode = state.pendingRunMode ?? "story") {
  const visibleRunMode = ui.center?.querySelector(".classCard")?.dataset.runMode;
  if (visibleRunMode === "sandbox" || visibleRunMode === "story" || visibleRunMode === "challenge") runMode = visibleRunMode;
  const klass = selectedClass();
  const sandbox = runMode === "sandbox";
  const challenge = runMode === "challenge";
  state.runMode = sandbox ? "sandbox" : challenge ? "challenge" : "story";
  state.mode = "play";
  setGameChromeVisible(true);
  state.roomClears = new Set();
  state.flags = {
    journalFound: sandbox,
    knifeBroken: sandbox,
    bossDefeated: sandbox,
    bossIntroPlayed: sandbox,
    swordClaimed: sandbox,
    starterWeaponClaimed: sandbox,
    starterChestOpened: sandbox,
    ruinsChestOpened: sandbox,
    castleChestOpened: sandbox,
    postBossScrapSpawned: sandbox,
    postBossScrapRead: sandbox,
    progressionUnlocked: sandbox,
    ironWardenIntroPlayed: false,
    ironWardenDefeated: false,
    ironWardenRewardsClaimed: false,
    redWolfIntroPlayed: false,
    redWolfDefeated: false,
    demoComplete: false
  };
  state.enemies = [];
  state.boss = null;
  state.chests = [];
  state.merchants = [];
  state.dummies = [];
  state.scraps = [];
  state.pickups = [];
  state.projectiles = [];
  state.enemyProjectiles = [];
  state.roars = [];
  state.summons = [];
  state.burns = [];
  state.feints = [];
  state.particles = [];
  state.stains = [];
  state.slashes = [];
  state.hazards = [];
  state.floaters = [];
  state.cinematic = null;
  state.opening = {
    moved: false,
    jumped: false,
    attacked: false,
    chestGuide: false
  };
  state.time = 0;
  state.ambientTimer = 0;
  state.hitSfxCooldown = 0;
  state.dummyHitSfxCooldown = 0;
  state.enemyLungeSfxCooldown = 0;
  state.hitPause = 0;
  state.journalTab = "inventory";
  state.inventorySort = "type";
  state.inventoryPage = 0;
  state.selectedInventoryItemId = null;
  state.skillPreviewKey = null;
  state.journalUnread = false;
  state.toastTimer = 0;
  state.castleCheckpoint = null;
  state.miniChestRooms = new Set();
  applyClassLoadout(klass, { sandbox });
  const storyStart = !sandbox && !challenge ? applyStoryStartPoint(state.pendingStartPoint) : STORY_START_POINTS[0];
  player.vx = 0;
  player.vy = 0;
  player.facing = 1;
  player.animTime = 0;
  player.animState = "idle";
  player.runTime = 0;
  player.stepDust = 0;
  player.land = 0;
  player.hurt = 0;
  player.attack = null;
  player.attackBuffer = 0;
  player.jumpBuffer = 0;
  player.attackCooldown = 0;
  resetWeaponCombo();
  player.dodge = 0;
  player.dodgeHitIds = new Set();
  player.dodgeFxTimer = 0;
  player.invuln = 0;
  player.notes = sandbox ? ["The merchant had everything laid out like a memory I could test."] : challenge ? ["One life. More teeth in every room."] : ["The old knife was already in my hand."];
  player.newItems = new Set();
  if (sandbox) {
    unlockProgression();
    ensureProgressionShape();
    player.progression.level = 2;
    player.progression.skillPoints = Infinity;
    player.progression.basicStatPoints = Infinity;
    player.progression.xp = 0;
    player.progression.xpNext = xpForNextLevel(2, 0);
    state.roomClears.add("splitArch");
    enterRoom("splitArch", "left");
  } else {
    enterRoom(storyStart.roomId, "left");
  }
  mouse.offsetX = player.facing * AIM_ORBIT_DISTANCE;
  mouse.offsetY = -10;
  mouse.active = false;
  mouse.aimIntent = false;
  mouse.inside = true;
  clampMouseOffset();
  updateMouseWorldFromOffset();
  resetTouchAim();
  clearCard();
  if (sandbox) {
    startGameMusic();
    toast(`Sandbox: infinite coins. ${usePromptLabel()} - shop the sandbox merchant.`, 1800);
  } else if (challenge) {
    startOpeningReveal();
    toast("Challenge mode: one life.", 1600);
  } else if (storyStart.id !== "beginning") {
    startGameMusic();
    toast(`${storyStart.label}: area start.`, 1500);
  } else {
    startOpeningReveal();
  }
  updateHud();
  requestGamePointerLock();
}

function toast(text, ms = 1400) {
  state.toastText = text;
  state.toastTimer = ms / 1000;
}

function showPlayerLine(text, ms = 1300, color = "#fff0b5", options = {}) {
  if (options.floater !== false) {
    spawnFloater(text, player.x, player.y - player.h * 0.86, color);
  }
  toast(text, ms);
}

function startOpeningReveal() {
  setCinematicChromeVisible(true);
  state.cinematic = {
    type: "openingReveal",
    time: 0,
    lockControls: true,
    thudPlayed: false
  };
  player.vx = 0;
  player.vy = 0;
}

function startJournalFocus(corpse) {
  setCinematicChromeVisible(true);
  state.cinematic = {
    type: "journalFocus",
    time: 0,
    lockControls: true,
    targetX: corpse.x + 24,
    targetY: corpse.y - 20,
    lineShown: false
  };
  player.vx = 0;
  player.vy = 0;
}

function startStarterChestFocus(chest) {
  setCinematicChromeVisible(true);
  state.cinematic = {
    type: "starterChestFocus",
    time: 0,
    lockControls: true,
    chestId: chest.id,
    targetX: chest.x,
    targetY: chest.y - 44,
    lineShown: false
  };
  player.vx = 0;
  player.vy = 0;
}

function startDoorTransition(exit, entrySide) {
  if (isCastleGateRoom() && isCastleRoom(exit.to)) captureCastleCheckpoint("leaveGate");
  setCinematicChromeVisible(true);
  state.cinematic = {
    type: "doorTransition",
    time: 0,
    lockControls: true,
    exitTo: exit.to,
    entrySide,
    fromRoomId: state.roomId,
    fromX: exit.x,
    fromY: state.room.floorY - 70,
    entered: false
  };
  player.vx = 0;
  player.vy = 0;
}

function startStarterWeaponClaimLine(itemName) {
  setCinematicChromeVisible(true);
  state.cinematic = {
    type: "starterWeaponClaim",
    time: 0,
    lockControls: true,
    itemName,
    lineShown: false,
    burstShown: false
  };
  player.vx = 0;
  player.vy = 0;
}

function startJournalScrapFlashback(scrap) {
  setCinematicChromeVisible(true);
  state.cinematic = {
    type: "journalScrapFlashback",
    time: 0,
    lockControls: true,
    scrap,
    targetX: scrap.x,
    targetY: scrap.y - 36,
    memoryHit: false,
    xpGiven: false
  };
  player.vx = 0;
  player.vy = 0;
}

function startBossIntro(bossId) {
  setCinematicChromeVisible(true);
  startBossMusic();
  state.cinematic = {
    type: "bossIntro",
    time: 0,
    lockControls: true,
    bossId,
    rumbleShown: false,
    warningShown: false,
    spawned: false
  };
  player.vx = 0;
  player.vy = 0;
}

function startBossDefeatCinematic(x, y, label = "HUGE ROOT CRAWLER FELL", subtitle = "the room goes quiet") {
  setCinematicChromeVisible(true);
  state.cinematic = {
    type: "bossDefeat",
    time: 0,
    lockControls: true,
    targetX: x,
    targetY: y,
    label,
    subtitle,
    burstShown: false,
    lineShown: false
  };
  player.vx = 0;
  player.vy = 0;
}

function cinematicLocksControls() {
  return Boolean(state.cinematic?.lockControls);
}

function activeCinematic(type) {
  return state.cinematic?.type === type;
}

function updateCinematic(dt) {
  const cinematic = state.cinematic;
  if (!cinematic) return;
  cinematic.time += dt;

  if (cinematic.type === "openingReveal") {
    if (!cinematic.thudPlayed && cinematic.time >= 0.18) {
      cinematic.thudPlayed = true;
      playSfx("thud");
      state.camera.shake = Math.max(state.camera.shake, 0.18);
    }
    if (cinematic.time >= 2.35) {
      state.cinematic = null;
      setCinematicChromeVisible(false);
      state.camera.shake = Math.max(state.camera.shake, 0.06);
      spawnDust(player.x - 8, player.y + player.h * 0.5, 12);
      toast("The stones are cold.", 1600);
      startGameMusic();
    }
    return;
  }

  if (cinematic.type === "journalFocus") {
    if (!cinematic.lineShown && cinematic.time >= 0.24) {
      cinematic.lineShown = true;
      spawnFloater("I remember this!", player.x, player.y - player.h * 0.78, "#fff0b5");
      toast("I remember this!", 900);
    }
    if (cinematic.time >= 1.18) {
      state.cinematic = null;
      setCinematicChromeVisible(false);
      state.opening.chestGuide = true;
      openJournal();
    }
    return;
  }

  if (cinematic.type === "starterChestFocus") {
    if (!cinematic.lineShown && cinematic.time >= 0.24) {
      cinematic.lineShown = true;
      spawnFloater("Is this mine?", player.x, player.y - player.h * 0.78, "#fff0b5");
      toast("Is this mine?", 900);
    }
    if (cinematic.time >= 1.18) {
      const chest = state.chests.find((item) => item.id === cinematic.chestId);
      state.cinematic = null;
      setCinematicChromeVisible(false);
      if (chest) finishChestOpen(chest);
    }
    return;
  }

  if (cinematic.type === "journalScrapFlashback") {
    if (!cinematic.memoryHit && cinematic.time >= 0.32) {
      cinematic.memoryHit = true;
      playSfx("thud");
      state.camera.shake = Math.max(state.camera.shake, 0.24);
      spawnMossDust(player.x, state.room.floorY - 4, 12);
    }
    if (!cinematic.xpGiven && cinematic.time >= 1.02) {
      cinematic.xpGiven = true;
      cinematic.scrap.dead = true;
      state.scraps = state.scraps.filter((scrap) => !scrap.dead);
      state.flags.postBossScrapRead = true;
      unlockProgression();
      gainXp(BOSS_SCRAP_XP);
      toast(`The torn page settles. ${journalPromptLabel()} - memory point.`, 1900);
    }
    if (cinematic.time >= 1.85) {
      state.cinematic = null;
      setCinematicChromeVisible(false);
    }
    return;
  }

  if (cinematic.type === "ferryBoat") {
    const duration = cinematic.duration ?? 2.65;
    const t = clamp(cinematic.time / duration, 0, 1);
    const eased = smoothStep(t);
    const bob = Math.sin(cinematic.time * 9) * 2.2;
    cinematic.boatX = lerp(cinematic.startX, cinematic.endX, eased);
    player.x = cinematic.boatX;
    player.y = cinematic.waterY - 14 + bob - player.h * 0.5;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    player.facing = sign(cinematic.endX - cinematic.startX) || player.facing;
    if (!cinematic.lineShown && cinematic.time >= 0.38) {
      cinematic.lineShown = true;
      showPlayerLine(cinematic.boughtTicket ? "That water is deeper than it looked." : "Back across.", 1100, "#d8ecb2", { floater: false });
    }
    if (cinematic.time >= (cinematic.splashAt ?? 0) + 0.18) {
      cinematic.splashAt = cinematic.time;
      spawnMossDust(cinematic.boatX + rand(-46, 46), cinematic.waterY + rand(-6, 4), 1);
    }
    if (t >= 1) {
      state.flags[cinematic.ticketKey] = true;
      state.flags[cinematic.boatSideKey] = Boolean(cinematic.targetBoatRight);
      player.x = clamp(cinematic.endX, 80, state.room.width - 80);
      player.y = state.room.floorY - player.h * 0.5;
      player.onGround = true;
      state.cinematic = null;
      setCinematicChromeVisible(false);
      spawnMossDust(player.x, state.room.floorY - 4, 12);
      toast("The ferry bumps against the dock.", 1200);
    }
    return;
  }

  if (cinematic.type === "bossIntro") {
    const bossX = state.room.width * 0.68;
    if (!cinematic.rumbleShown && cinematic.time >= 0.34) {
      cinematic.rumbleShown = true;
      playSfx("thud");
      state.camera.shake = Math.max(state.camera.shake, 0.16);
      spawnMossDust(bossX, state.room.floorY - 2, 10);
      spawnStoneChips(bossX, state.room.floorY - 6, -1, 6);
      spawnStoneChips(bossX, state.room.floorY - 6, 1, 6);
    }
    if (!cinematic.warningShown && cinematic.time >= 0.88) {
      cinematic.warningShown = true;
      playSfx("thud");
      state.camera.shake = Math.max(state.camera.shake, 0.28);
      spawnBossIntroSmoke(bossX, state.room.floorY, 0.55);
    }
    if (!cinematic.spawned && cinematic.time >= 1.42) {
      cinematic.spawned = true;
      spawnBossIntroSmoke(bossX, state.room.floorY, 1.25);
      spawnBoss(cinematic.bossId);
      markBossIntroPlayed(cinematic.bossId);
      if (cinematic.bossId === "hugeRootCrawler" && state.flags.knifeBroken && state.boss) {
        state.boss.hp = Math.min(state.boss.hp, state.boss.maxHp * BOSSES.hugeRootCrawler.knifeBreakAt);
        state.boss.stun = 1.0;
      }
      state.camera.shake = Math.max(state.camera.shake, 0.56);
    }
    if (cinematic.time >= 2.45) {
      state.cinematic = null;
      setCinematicChromeVisible(false);
    }
    return;
  }

  if (cinematic.type === "bossDefeat") {
    if (!cinematic.burstShown && cinematic.time >= 0.1) {
      cinematic.burstShown = true;
      state.camera.shake = Math.max(state.camera.shake, 0.72);
    }
    if (!cinematic.lineShown && cinematic.time >= 1.12) {
      cinematic.lineShown = true;
      showPlayerLine("What's this?", 1400, "#fff0b5");
      toast("Read the torn journal scrap.", 1500);
    }
    if (cinematic.time >= 1.78) {
      state.cinematic = null;
      setCinematicChromeVisible(false);
    }
    return;
  }

  if (cinematic.type === "doorTransition") {
    const close = 0.46;
    const hold = 0.18;
    const open = 0.62;
    if (!cinematic.entered && cinematic.time >= close) {
      cinematic.entered = true;
      markRoomRespawnOnLeave(cinematic.fromRoomId);
      enterRoom(cinematic.exitTo, cinematic.entrySide, { deferRoomCinematics: true });
    }
    if (cinematic.time >= close + hold + open) {
      state.cinematic = null;
      setCinematicChromeVisible(false);
      finishDeferredRoomCinematics();
    }
    return;
  }

  if (cinematic.type === "starterWeaponClaim") {
    if (!cinematic.burstShown && cinematic.time >= 0.1) {
      cinematic.burstShown = true;
      spawnItemPop(player.x + player.facing * 26, player.y - player.h * 0.54, "#d6ad55");
      state.camera.shake = Math.max(state.camera.shake, 0.08);
    }
    if (!cinematic.lineShown && cinematic.time >= 0.22) {
      cinematic.lineShown = true;
      showPlayerLine("Oh, I know this is mine! Let's do this!", 1500, "#fff0b5", { floater: false });
    }
    if (cinematic.time >= 1.65) {
      state.cinematic = null;
      setCinematicChromeVisible(false);
    }
  }
}

function addNote(note) {
  if (!note || player.notes.includes(note)) return;
  player.notes.push(note);
  state.journalUnread = true;
}

function itemLoreNote(item, context = "found") {
  if (!item) return null;
  if (item.id === "rustySword") return "I found a rusty sword on the ground today.";
  if (item.id === "huntingKnife") return "The old knife was already in my hand.";
  if (item.id === "corpseJournal") return "The corpse journal knows this place.";
  if (context === "boss") return `${item.name} waited where the huge root fell.`;
  return null;
}

function addItemLore(item, context = "found") {
  const note = itemLoreNote(item, context);
  if (note) addNote(note);
}

function journalScrapText() {
  return `you are a ${currentClass().name}. REMEMBER!`;
}

function unlockProgression() {
  if (player.progression.unlocked) return;
  player.progression.unlocked = true;
  state.flags.progressionUnlocked = true;
}

function gainXp(amount) {
  if (!player.progression.unlocked) return;
  ensureProgressionShape();
  player.progression.xp += amount;
  let levels = 0;
  while (player.progression.xp >= player.progression.xpNext) {
    player.progression.xp -= player.progression.xpNext;
    player.progression.level += 1;
    player.progression.skillPoints += 1;
    player.progression.basicStatPoints += BASIC_STAT_POINTS_PER_LEVEL;
    player.progression.xpNext = xpForNextLevel(player.progression.level, player.progression.evolutionTier);
    levels += 1;
  }
  if (levels > 0) {
    applyEquipmentEffects(0);
    showLevelUpFeedback(levels);
  }
}

function showLevelUpFeedback(levels) {
  playSfx("levelUp");
  const color = "#ffd84d";
  state.camera.shake = Math.max(state.camera.shake, 0.12);
  ui.xpPanel?.classList.add("pulse");
  setTimeout(() => ui.xpPanel?.classList.remove("pulse"), 900);
  spawnLevelUpBurst(player.x, player.y - player.h * 0.46, color);
  spawnFloater("LEVEL UP", player.x, player.y - player.h * 0.98, "#fff0b5");
  spawnFloater(`+${levels} MEMORY POINT${levels === 1 ? "" : "S"}`, player.x, player.y - player.h * 1.16, color);
  spawnFloater(`+${levels * BASIC_STAT_POINTS_PER_LEVEL} BASIC STAT POINTS`, player.x, player.y - player.h * 0.76, "#caa7ff");
}

function applySkillNodeEffects(node) {
  const progression = player.progression;
  progression.hpBonus += node.hp ?? 0;
  progression.damageBonus += node.damage ?? 0;
  progression.moveBonus += node.move ?? 0;
  progression.staminaBonus += node.stamina ?? 0;
  progression.abilityPowerBonus += node.abilityPower ?? 0;
  progression.abilityCooldownBonus += node.abilityCooldown ?? 0;
  progression.originGaugeGainBonus += node.gaugeGain ?? 0;
  progression.originGaugePassiveBonus += node.gaugePassive ?? 0;
  progression.originCostReduction += node.gaugeCostReduction ?? 0;
  progression.attackSpeedBonus += node.attackSpeed ?? 0;
  progression.weaponBurnChance += node.weaponBurnChance ?? 0;
  if (node.aura) progression.aura = node.aura;
  if (node.abilityId) unlockLearnedAbility(node.abilityId);
  progression.lastNodeTitle = node.title;
}

function spendSkillPoint(branchId) {
  const progression = player.progression;
  if (!progression.unlocked || progression.skillPoints <= 0 || branchId !== LINEAR_SKILL_BRANCH_ID) return false;
  const rank = linearSkillProgress();
  const entry = linearSkillNodes()[rank];
  if (!entry) return false;
  const node = entry.node;
  if (progression.skillPoints !== Infinity) progression.skillPoints -= 1;
  setLinearSkillProgress(rank + 1);
  progression.rootUnlocked = rank + 1 > 0;
  applySkillNodeEffects(node);
  spawnFloater(`LV ${rank + 1} Memory`, player.x, player.y - player.h * 0.88, entry.color);
  spawnClassAbilityAccent(player.classId, player.x, player.y - player.h * 0.42, -Math.PI * 0.5, 18);
  if (node.final) {
    spawnFloater("Final Upgrade", player.x, player.y - player.h * 1.08, entry.color);
    spawnItemPop(player.x, player.y - player.h * 0.74, entry.color);
  }
  if (rank + 1 >= LINEAR_SKILL_NODE_COUNT) {
    progression.evolutionTier += 1;
    progression.hpBonus += 8 + progression.evolutionTier * 2;
    progression.damageBonus += 1;
    progression.xpNext = xpForNextLevel(progression.level, progression.evolutionTier);
    spawnFloater("Memory Line Complete", player.x, player.y - player.h * 1.18, entry.color);
  }
  applyEquipmentEffects(0);
  playSfx("pickup");
  return true;
}

function hasItem(itemId) {
  return player.inventory.includes(itemId);
}

function equippedSlotFor(itemId) {
  for (const [slot, equippedId] of Object.entries(player.equipment)) {
    if (equippedId === itemId) return slot;
  }
  return null;
}

function ownsItem(itemId) {
  return hasItem(itemId) || Boolean(equippedSlotFor(itemId));
}

function removeInventoryItem(itemId) {
  const index = player.inventory.indexOf(itemId);
  if (index >= 0) player.inventory.splice(index, 1);
}

function addItem(itemId, options = {}) {
  if (!ITEMS[itemId]) return;
  if (!ownsItem(itemId)) {
    player.inventory.push(itemId);
    if (options.markNew) player.newItems.add(itemId);
  }
}

function itemEquipSlot(item) {
  if (!item) return null;
  if (item.type === "weapon") return "weapon";
  if (item.type === "gear") return item.slot;
  return null;
}

function itemWeaponFamily(item) {
  return itemWeapon(item)?.family ?? null;
}

function itemCanUseSecondary(item) {
  return item?.type === "weapon" && RANGED_SECONDARY_FAMILIES.has(itemWeaponFamily(item));
}

function defaultEquipSlot(item) {
  if (item?.type === "weapon") {
    if (itemCanUseSecondary(item) && player.equipment.weapon && !player.equipment.secondaryWeapon) {
      return "secondaryWeapon";
    }
    return "weapon";
  }
  return itemEquipSlot(item);
}

function itemFitsSlot(item, slot) {
  if (slot === "secondaryWeapon") return itemCanUseSecondary(item);
  return itemEquipSlot(item) === slot;
}

function activeWeaponItemId() {
  const activeSlot = player.activeWeaponSlot === "secondaryWeapon" ? "secondaryWeapon" : "weapon";
  return player.equipment[activeSlot] || player.equipment.weapon;
}

function syncActiveWeapon({ resetCombo = false } = {}) {
  if (player.activeWeaponSlot === "secondaryWeapon" && !player.equipment.secondaryWeapon) {
    player.activeWeaponSlot = "weapon";
  }
  const itemId = activeWeaponItemId();
  const item = itemId ? ITEMS[itemId] : null;
  player.weaponId = item?.weaponId ?? "huntingKnife";
  if (resetCombo) resetWeaponCombo();
}

function weaponSlotLabel(slot) {
  return slot === "secondaryWeapon" ? "secondary" : "primary";
}

function switchWeaponSlot(slot) {
  if (slot !== "weapon" && slot !== "secondaryWeapon") return false;
  const itemId = player.equipment[slot];
  if (!itemId) {
    toast(slot === "secondaryWeapon" ? "No secondary ranged weapon equipped." : "No primary weapon equipped.", 850);
    return false;
  }
  if (slot === "secondaryWeapon" && !itemCanUseSecondary(ITEMS[itemId])) {
    toast("Secondary only accepts ranged weapons.", 1100);
    player.equipment.secondaryWeapon = null;
    addItem(itemId);
    syncActiveWeapon({ resetCombo: true });
    return false;
  }
  if (player.activeWeaponSlot === slot) return true;
  player.activeWeaponSlot = slot;
  syncActiveWeapon({ resetCombo: true });
  player.attack = null;
  player.attackCooldown = 0;
  const item = ITEMS[itemId];
  spawnFloater(`${slot === "secondaryWeapon" ? "2" : "1"} ${item?.name ?? "Weapon"}`, player.x, player.y - player.h * 0.92, "#fff0b5");
  toast(`${slot === "secondaryWeapon" ? "Secondary" : "Primary"}: ${item?.name ?? "Weapon"}`, 800);
  return true;
}

function equipItem(itemId, slotOverride = null) {
  const item = ITEMS[itemId];
  if (!item) return;
  const slot = slotOverride ?? defaultEquipSlot(item);
  if (!slot || !Object.hasOwn(player.equipment, slot)) return;
  if (!itemFitsSlot(item, slot)) {
    if (slot === "secondaryWeapon") toast("Secondary only accepts ranged weapons.", 1100);
    return;
  }
  const previousSlot = equippedSlotFor(itemId);
  if (previousSlot === slot) return;
  const previousItem = player.equipment[slot];
  if (previousItem) {
    player.equipment[slot] = null;
    addItem(previousItem);
  }
  if (previousSlot) player.equipment[previousSlot] = null;
  removeInventoryItem(itemId);
  player.newItems.delete(itemId);
  player.equipment[slot] = itemId;
  if ((slot === "weapon" || slot === "secondaryWeapon") && item.type === "weapon") {
    if (player.activeWeaponSlot === slot || slot === "weapon") {
      player.activeWeaponSlot = slot;
      syncActiveWeapon({ resetCombo: true });
    }
    toast(`${item.name} equipped as ${weaponSlotLabel(slot)}.`, 850);
  }
  applyEquipmentEffects(0);
  if (isCastleGateRoom()) captureCastleCheckpoint("equip");
}

function unequipSlot(slot) {
  if (slot === "weapon") {
    toast("Keep a weapon equipped.", 900);
    return false;
  }
  const itemId = player.equipment[slot];
  if (!itemId) return false;
  player.equipment[slot] = null;
  addItem(itemId);
  if (slot === "secondaryWeapon" || slot === player.activeWeaponSlot) {
    syncActiveWeapon({ resetCombo: true });
  }
  applyEquipmentEffects(0);
  if (isCastleGateRoom()) captureCastleCheckpoint("unequip");
  return true;
}

function replaceInventoryItem(oldId, newId) {
  const equippedSlot = equippedSlotFor(oldId);
  if (equippedSlot) {
    player.equipment[equippedSlot] = newId;
    if (equippedSlot === "weapon" || equippedSlot === "secondaryWeapon") {
      syncActiveWeapon({ resetCombo: true });
    }
    applyEquipmentEffects(0);
    return;
  }
  const index = player.inventory.indexOf(oldId);
  if (index >= 0) player.inventory.splice(index, 1, newId);
  else addItem(newId);
}

const INVENTORY_SORTS = ["type", "name", "rarity"];
const INVENTORY_PAGE_SIZE = 14;

function inventorySortValue(item, sortId) {
  if (!item) return "";
  if (sortId === "name") return item.name ?? "";
  if (sortId === "rarity") return `${item.rarity ?? ""}-${item.name ?? ""}`;
  return `${item.type ?? ""}-${itemEquipSlot(item) ?? ""}-${item.category ?? ""}-${item.name ?? ""}`;
}

function sortedInventoryItemIds() {
  const sortId = state.inventorySort ?? "type";
  return player.inventory
    .slice()
    .sort((a, b) => inventorySortValue(ITEMS[a], sortId).localeCompare(inventorySortValue(ITEMS[b], sortId)));
}

function inventoryStatRows() {
  const progression = ensureProgressionShape();
  const effects = equippedEffects();
  const weapon = currentWeapon();
  const speedDelta = Math.round(player.moveSpeed - (currentClass().stats.moveSpeed ?? 285));
  const damageBonus = progressionDamageBonus();
  const abilityPower = progression.abilityPowerBonus || 0;
  const burnChance = Math.round((progression.weaponBurnChance || 0) * 100);
  const basicHpRegen = basicHpRegenBonus();
  const totalHpRegen = (effects.hpRegen || 0) + basicHpRegen;
  return [
    ["Health", `${Math.ceil(player.hp)} / ${player.maxHp}`],
    ["Weapon DMG", `${weapon.lightDamage + damageBonus}`],
    ["Move", `${Math.round(player.moveSpeed)}${speedDelta ? ` (${speedDelta > 0 ? "+" : ""}${speedDelta})` : ""}`],
    ["Stamina", `${Math.round(player.maxSt)}`],
    ["Stam Rec", `+${38 + basicStaminaRegenBonus()}/s`],
    ["HP Regen", `${totalHpRegen ? `+${formatStatValue(totalHpRegen)} HP/s` : "base"}`],
    ["Basic Pts", progression.basicStatPoints === Infinity ? "INF" : String(progression.basicStatPoints)],
    ["Ability", `+${abilityPower}`],
    ["Burn", `${burnChance}%`],
    ["Armor", `+${effects.maxHp || 0} HP`],
    ["Coins", isSandboxRun() ? "INF" : String(player.coins)]
  ];
}

function inventoryStatsHtml() {
  return inventoryStatRows().map(([label, value]) => `
    <div class="inventoryStatRow">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `).join("");
}

function formatStatValue(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function basicStatsHtml() {
  const progression = ensureProgressionShape();
  const pointText = progression.basicStatPoints === Infinity ? "INF" : progression.basicStatPoints;
  const rows = BASIC_STAT_ORDER.map((key) => {
    const def = BASIC_STAT_DEFS[key];
    const spent = basicStatSpent(key);
    const bonus = basicStatBonus(key);
    const capped = key === "hpRegen" && bonus >= MAX_BASIC_HP_REGEN;
    const canSpend = canSpendBasicStat(key);
    return `
      <button class="basicStatRow" data-basic-stat="${key}" ${canSpend ? "" : "disabled"}>
        <span>
          <strong>${def.label}</strong>
          <small>${def.desc}</small>
        </span>
        <em>${spent} | ${key === "hpRegen" || key === "staminaRegen" ? `+${formatStatValue(bonus)}/s` : `+${formatStatValue(bonus)}`}${capped ? " CAP" : ""}</em>
        <b>${def.short}</b>
      </button>
    `;
  }).join("");
  return `
    <div class="basicStatsPanel">
      <div class="basicStatsHeader">
        <strong>Basic Stats</strong>
        <span>${pointText} point${pointText === 1 ? "" : "s"}</span>
      </div>
      <div class="basicStatRows">${rows}</div>
    </div>
  `;
}

function inventoryCompareHtml(item) {
  if (!item) {
    return `
      <div class="inventoryDetailPanel empty">
        <strong>Select Item</strong>
        <span>Tap a pack slot to inspect it. Tap again or press Equip to use gear.</span>
      </div>
    `;
  }
  const slotId = itemEquipSlot(item);
  const equipped = slotId ? ITEMS[player.equipment[slotId]] : null;
  const itemEffects = item.effects ?? {};
  const equippedEffectsMap = equipped?.effects ?? {};
  const effectKeys = Array.from(new Set([...Object.keys(itemEffects), ...Object.keys(equippedEffectsMap)]));
  const effectSummary = itemEffectText(item);
  const rows = effectKeys.map((key) => {
    const next = itemEffects[key] ?? 0;
    const current = equippedEffectsMap[key] ?? 0;
    const delta = next - current;
    return `<span>${escapeHtml(key)} ${delta > 0 ? "+" : ""}${delta}</span>`;
  }).join("") || `<span>${escapeHtml(effectSummary || item.desc || "No stat change.")}</span>`;
  const typeLabel = item.type === "weapon"
    ? "Weapon"
    : slotId
      ? (GEAR_SLOTS.find((slot) => slot.id === slotId)?.label ?? itemCategory(item))
      : itemCategory(item);
  return `
    <div class="inventoryDetailPanel">
      <div class="inventoryDetailIcon">${itemIconHtml(item)}</div>
      <div class="inventoryDetailText">
        <div class="inventoryDetailTitle">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(typeLabel)}</span>
        </div>
        <p>${escapeHtml(item.desc || effectSummary || "No notes written yet.")}</p>
        <div class="compareRows">${rows}</div>
      </div>
      ${(item.type === "weapon" || item.type === "gear") ? `<button id="equipSelectedBtn" data-item="${item.id}">Equip</button>` : ""}
    </div>
  `;
}

function renderInventoryJournalPage() {
  const slotOrder = ["weapon", "secondaryWeapon", "body", "head", "hands", "legs", "feet", "trinket", "crest", "modification"];
  const slots = slotOrder.map((slotId) => GEAR_SLOTS.find((slot) => slot.id === slotId)).filter(Boolean).map((slot) => {
    const itemId = player.equipment[slot.id];
    const item = itemId ? ITEMS[itemId] : null;
    const activeWeaponClass = slot.id === player.activeWeaponSlot ? " activeWeaponSlot" : "";
    const emptyHtml = slot.id === "secondaryWeapon"
      ? "<strong>Empty</strong><span class=\"itemFamily\">Ranged only</span>"
      : "<strong>Empty</strong>";
    return `
      <div class="equipmentSlot${activeWeaponClass}" data-slot="${slot.id}" data-item="${itemId ?? ""}" draggable="${item ? "true" : "false"}">
        <span>${slot.label}</span>
        ${item ? itemCardHtml(item) : emptyHtml}
      </div>
    `;
  }).join("");

  const sortedItems = sortedInventoryItemIds();
  const maxPage = Math.max(0, Math.ceil(sortedItems.length / INVENTORY_PAGE_SIZE) - 1);
  state.inventoryPage = clamp(state.inventoryPage ?? 0, 0, maxPage);
  const pageItems = sortedItems.slice(state.inventoryPage * INVENTORY_PAGE_SIZE, (state.inventoryPage + 1) * INVENTORY_PAGE_SIZE);
  if (state.selectedInventoryItemId && !sortedItems.includes(state.selectedInventoryItemId)) state.selectedInventoryItemId = null;
  const selectedItem = state.selectedInventoryItemId ? ITEMS[state.selectedInventoryItemId] : null;
  const inv = Array.from({ length: INVENTORY_PAGE_SIZE }, (_, index) => {
    const itemId = pageItems[index];
    const item = itemId ? ITEMS[itemId] : null;
    const equippable = item?.type === "weapon" || item?.type === "gear";
    const newClass = itemId && player.newItems.has(itemId) ? " newItem" : "";
    const selectedClass = itemId && state.selectedInventoryItemId === itemId ? " selectedItem" : "";
    return `
      <button class="invSlot${newClass}${selectedClass}" data-item="${itemId ?? ""}" draggable="${equippable ? "true" : "false"}" ${item ? "" : "disabled"}>
        ${item ? itemCardHtml(item) : ""}
      </button>
    `;
  }).join("");

  return `
    <div class="paperPage inventoryPage">
      <div class="inventoryBoard">
        <section class="characterPanel">
          <h3>Character</h3>
          <div class="characterPreviewFrame">
            <canvas id="journalPreview" width="128" height="156"></canvas>
          </div>
          <section class="equippedPanel">
            <h3>Equipped</h3>
            <div class="equipGrid">${slots}</div>
          </section>
        </section>
        <section class="packPanel">
          <div class="inventoryHeader">
            <h3>Inventory</h3>
            <span>${sortedItems.length} carried</span>
          </div>
          <div id="inventoryGrid">${inv}</div>
          ${inventoryCompareHtml(selectedItem)}
          <div class="inventoryPager">
            <button data-page-step="-1" ${state.inventoryPage <= 0 ? "disabled" : ""}>&lsaquo;</button>
            <span>${state.inventoryPage + 1} / ${maxPage + 1}</span>
            <button data-page-step="1" ${state.inventoryPage >= maxPage ? "disabled" : ""}>&rsaquo;</button>
          </div>
        </section>
      </div>
    </div>
  `;
}

function renderStatsJournalPage() {
  const progression = ensureProgressionShape();
  const pointText = progression.basicStatPoints === Infinity ? "INF" : progression.basicStatPoints;
  return `
    <div class="paperPage statsUpgradePage">
      <header class="statsUpgradeHeader">
        <div>
          <h2>Stats</h2>
          <span>LV ${progression.level} ${currentClass().name}</span>
        </div>
        <strong>${pointText} Basic Point${pointText === 1 ? "" : "s"}</strong>
      </header>
      <div class="statsUpgradeBoard">
        <section class="statsSnapshotPanel">
          <h3>Current Stats</h3>
          <div class="inventoryStats">${inventoryStatsHtml()}</div>
        </section>
        <section class="basicStatsUpgradePanel">
          ${basicStatsHtml()}
        </section>
      </div>
    </div>
  `;
}

function renderLoreJournalPage() {
  const notes = player.notes.map((note) => `<li>${note}</li>`).join("") || "<li>The pages are still quiet.</li>";
  return `
    <div class="paperPage journalLorePage">
      <h2>Journal</h2>
      <ul class="noteList">${notes}</ul>
    </div>
  `;
}

function renderSkillBranchCard(branchId) {
  const progression = player.progression;
  const branch = getSkillBranch(branchId);
  if (!branch) return "";
  const rootLocked = !progression.rootUnlocked;
  const rank = branchRank(branchId);
  const nextNode = branch.nodes[rank];
  const canSpend = progression.skillPoints > 0 && !rootLocked && Boolean(nextNode);
  const nodes = branch.nodes.map((node, index) => {
    const done = index < rank;
    const next = index === rank && !rootLocked;
    const stateClass = done ? "done" : next ? "next" : "locked";
    return `
      <div class="skillNodeWrap ${stateClass}">
        <button class="skillNode ${stateClass} ${node.final ? "final" : ""}" data-branch="${branch.id}" ${canSpend && next ? "" : "disabled"}>
          <span class="nodeKind">${skillNodeKindText(node)}</span>
          <strong>${node.title}</strong>
        </button>
        <p>${skillNodeDescText(node)}</p>
      </div>
    `;
  }).join("");
  const lockText = rootLocked ? "Unlock the memory node first." : nextNode ? `${skillNodeKindText(nextNode)}: ${nextNode.title}` : "Path complete.";
  return `
    <div class="skillBranch ${rootLocked ? "locked" : ""}" style="--branch:${branch.color}">
      <h3>${branch.name}</h3>
      <p>${branch.desc}</p>
      <div class="skillRail">${nodes}</div>
      <div class="skillNext">${lockText}</div>
    </div>
  `;
}

const SKILL_NODE_TYPE_META = {
  Memory: { color: "#d6ad55", label: "MEM" },
  Buff: { color: "#d64045", label: "BUF" },
  Ability: { color: "#3e72d8", label: "ABL" },
  Passive: { color: "#68a34e", label: "PAS" },
  Aura: { color: "#8e5bd8", label: "AUR" }
};

const SKILL_RADIAL_LAYOUTS = [
  [
    { x: 38, y: 35 },
    { x: 27, y: 28 },
    { x: 22, y: 45 },
    { x: 30, y: 61 },
    { x: 41, y: 72 }
  ],
  [
    { x: 62, y: 35 },
    { x: 73, y: 28 },
    { x: 78, y: 45 },
    { x: 70, y: 61 },
    { x: 59, y: 72 }
  ],
  [
    { x: 50, y: 64 },
    { x: 40, y: 73 },
    { x: 50, y: 79 },
    { x: 60, y: 73 },
    { x: 50, y: 68 }
  ]
];

const SKILL_SINGLE_LAYOUT = [
  { x: 50, y: 63 },
  { x: 40, y: 72 },
  { x: 50, y: 78 },
  { x: 60, y: 72 },
  { x: 50, y: 66 }
];

function skillNodeMeta(node) {
  return SKILL_NODE_TYPE_META[node?.kind] ?? SKILL_NODE_TYPE_META.Passive;
}

function skillNodeIconText(node) {
  if (node?.icon) return node.icon.slice(0, 2).toUpperCase();
  return skillNodeMeta(node).label;
}

const LINEAR_SKILL_BRANCH_ID = "line";
const LINEAR_SKILL_NODE_COUNT = 15;

function linearSkillNodes() {
  const directLine = CLASS_SKILL_LINES[player.classId];
  if (directLine?.length) {
    return directLine.slice(0, LINEAR_SKILL_NODE_COUNT).map((entry, index) => ({
      branchId: entry.branchId ?? entry.branchName?.toLowerCase?.() ?? "memory",
      branchName: entry.branchName ?? currentClass().name,
      branchDesc: entry.branchDesc ?? "",
      color: entry.color ?? "#d6ad55",
      node: entry.node,
      originalIndex: index,
      level: index + 1
    }));
  }
  const tree = baseSkillTree(player.classId);
  const branches = Object.values(tree.paths ?? {});
  const maxLength = Math.max(0, ...branches.map((branch) => branch.nodes?.length ?? 0));
  const entries = [];
  for (let tier = 0; tier < maxLength; tier += 1) {
    for (const branch of branches) {
      const node = branch.nodes?.[tier];
      if (!node || entries.length >= LINEAR_SKILL_NODE_COUNT) continue;
      entries.push({
        branchId: branch.id,
        branchName: branch.name,
        branchDesc: branch.desc,
        color: branch.color,
        node,
        originalIndex: tier,
        level: entries.length + 1
      });
    }
  }
  return entries.slice(0, LINEAR_SKILL_NODE_COUNT);
}

function linearSkillProgress() {
  const progression = player.progression;
  const lineRank = progression?.branchRanks?.[LINEAR_SKILL_BRANCH_ID];
  if (Number.isFinite(lineRank)) return clamp(Math.floor(lineRank), 0, LINEAR_SKILL_NODE_COUNT);
  const legacyRank = Object.entries(progression?.branchRanks ?? {})
    .filter(([branchId]) => branchId !== LINEAR_SKILL_BRANCH_ID)
    .reduce((sum, [, value]) => sum + (Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0), 0);
  return clamp(legacyRank, 0, LINEAR_SKILL_NODE_COUNT);
}

function setLinearSkillProgress(rank) {
  if (!player.progression.branchRanks) player.progression.branchRanks = {};
  player.progression.branchRanks = {
    [LINEAR_SKILL_BRANCH_ID]: clamp(Math.floor(rank), 0, LINEAR_SKILL_NODE_COUNT)
  };
}

function skillNodeKey(branchId, index) {
  return `${branchId}:${index}`;
}

function skillLockedReason(branchId, index, progression, branch) {
  if (!progression.unlocked) return "Read the torn journal scrap first.";
  const rank = linearSkillProgress();
  if (index < rank) return "Already remembered.";
  if (index === rank) return progression.skillPoints > 0 ? "Spend 1 Memory Point." : "Need 1 Memory Point.";
  return `Reach LV ${index} first.`;
}

function skillTooltipText(node, branchId, index, progression, branch) {
  const key = node?.abilityId ? learnedAbilityKey(node.abilityId) ?? nextLearnedAbilityKey() : "";
  const slot = key ? ` Active slot: ${key}.` : "";
  const final = node?.final ? " Final Upgrade." : "";
  return `LV ${index + 1} | ${node.title} | ${node.kind}${final} | ${skillNodeDescText(node)} Cost: 1 Memory Point. ${skillLockedReason(branchId, index, progression, branch)}${slot}`;
}

function visibleSkillEntries() {
  const progression = player.progression;
  const rank = linearSkillProgress();
  return linearSkillNodes().map((entry, index) => ({
    ...entry,
    branchId: LINEAR_SKILL_BRANCH_ID,
    index,
    stateClass: index < rank ? "done" : index === rank && progression.skillPoints > 0 ? "next" : index === rank + 1 ? "preview" : "locked",
    canSpend: index === rank && progression.skillPoints > 0
  }));
}

function skillEffectSummary(node) {
  const rows = [];
  if (node.hp) rows.push(`+${node.hp} HP`);
  if (node.damage) rows.push(`+${node.damage} DMG`);
  if (node.move) rows.push(`+${node.move} SPD`);
  if (node.stamina) rows.push(`+${node.stamina} STA`);
  if (node.abilityPower) rows.push(`+${node.abilityPower} ability`);
  if (node.abilityCooldown) rows.push(`-${node.abilityCooldown.toFixed(1)}s cooldown`);
  if (node.gaugeGain) rows.push(`+${Math.round(node.gaugeGain * 100)}% gauge gain`);
  if (node.gaugePassive) rows.push(`+${node.gaugePassive.toFixed(1)} gauge drip`);
  if (node.attackSpeed) rows.push(`+${Math.round(node.attackSpeed * 100)}% attack speed`);
  if (node.weaponBurnChance) rows.push(`${Math.round(node.weaponBurnChance * 100)}% burn`);
  if (node.aura) rows.push(`Aura: ${node.aura}`);
  if (node.abilityId) rows.push(`Unlocks ${LEARNED_ABILITIES[node.abilityId]?.name ?? node.abilityId} (${learnedAbilityKey(node.abilityId) ?? nextLearnedAbilityKey()})`);
  if (node.final) rows.push("Final upgrade node");
  return rows.length ? rows.join(" | ") : "Memory upgrade";
}

function renderSkillLineNode(entry) {
  const node = entry.node;
  const meta = skillNodeMeta(node);
  const selected = state.skillPreviewKey === skillNodeKey(entry.branchId, entry.index);
  const style = `--node:${meta.color};--branch:${entry.color ?? meta.color}`;
  const abilitySlot = node.abilityId ? learnedAbilityKey(node.abilityId) ?? nextLearnedAbilityKey() : "";
  const nodeDesc = node.abilityId ? `${node.desc} Slot ${abilitySlot}.` : node.desc;
  return `
    <button class="skillLineNode ${entry.stateClass} ${selected ? "selected" : ""} ${node.final ? "final" : ""}" style="${style}" data-branch="${LINEAR_SKILL_BRANCH_ID}" data-index="${entry.index}" data-key="${skillNodeKey(entry.branchId, entry.index)}" data-can-spend="${entry.canSpend ? "true" : "false"}" data-kind="${node.kind.toLowerCase()}" title="${skillTooltipText(node, entry.branchId, entry.index, player.progression, entry)}">
      <span class="skillLevel">LV ${entry.level}</span>
      <span class="skillIcon">${skillNodeIconText(node)}</span>
      <strong>${node.title}</strong>
      <em>${node.kind} · ${entry.branchName}</em>
      <small>${node.final ? "Final Upgrade: " : ""}${nodeDesc}</small>
      <span class="skillNodeEffects">${skillEffectSummary(node)}</span>
      <span class="skillNodeCost">${entry.stateClass === "done" ? "Remembered" : entry.canSpend ? "Spend 1 Memory Point" : `Locked after LV ${entry.index}`}</span>
    </button>
  `;
}

function groupedBonusHtml() {
  const progression = player.progression;
  const activeRows = (progression.learnedAbilities ?? [])
    .map((abilityId) => {
      const ability = LEARNED_ABILITIES[abilityId];
      return ability ? `${learnedAbilityKey(abilityId)}: ${ability.name}` : null;
    })
    .filter(Boolean);
  const rows = [
    ["Stats", [`+${progression.hpBonus} HP`, `+${progression.damageBonus} DMG`, `+${progression.moveBonus} SPD`, `+${progression.staminaBonus} STA`]],
    ["Signature", [`${currentClass().ability.name}`, "cooldown-only R", "no class meter"]],
    ["Buffs", [`+${Math.round((progression.attackSpeedBonus || 0) * 100)}% attack rhythm`, `${Math.round((progression.weaponBurnChance || 0) * 100)}% burn`, `${progression.abilityCooldownBonus > 0 ? `-${progression.abilityCooldownBonus.toFixed(1)}s cooldown` : "no cooldown bonus"}`]],
    ["Actives", activeRows.length ? activeRows : ["none yet"]],
    ["Mutations", [progression.aura ? progression.aura : "no aura"]],
    ["Final Upgrades", [progression.masteredBranch ? `${progression.masteredBranch} path` : "none yet"]]
  ];
  return rows.map(([title, values]) => `
    <section class="skillBonusGroup">
      <h3>${title}</h3>
      ${values.map((value) => `<span>${value}</span>`).join("")}
    </section>
  `).join("");
}

function renderSkillTreePage() {
  const progression = player.progression;
  const entries = visibleSkillEntries();
  const progress = linearSkillProgress();
  return `
    <div class="paperPage skillTreePage skillTreeLinearPage" data-origin="${player.classId}">
      <header class="skillTreeHeader">
        <h2>${currentClass().name} Memory Line</h2>
        <div class="skillSummary">
          <span>LV ${progression.level}</span>
          <span>${skillPointText()}</span>
          <span>${progress} / ${LINEAR_SKILL_NODE_COUNT}</span>
        </div>
        <div class="skillLegend">
          ${Object.entries(SKILL_NODE_TYPE_META).map(([type, meta]) => `<span style="--legend:${meta.color}">${type}</span>`).join("")}
        </div>
        <p class="skillRule">Each level grants 1 Memory Point here and 3 Basic Stat Points in the Stats tab. Abilities bind to F, T, then G.</p>
      </header>
      <div class="skillLinearShell">
        <div class="skillLinearTrack" style="--line-progress:${progress / LINEAR_SKILL_NODE_COUNT}">
          ${entries.map(renderSkillLineNode).join("")}
        </div>
      </div>
    </div>
  `;
}

function openJournal(tabName = state.journalTab) {
  exitGamePointerLock();
  setGameChromeVisible(true);
  state.mode = "journal";
  playSfx("interact");
  const activeTab = tabName === "journal"
    ? "journal"
    : tabName === "stats"
      ? "stats"
      : player.progression.unlocked && tabName === "tree"
        ? "tree"
        : "inventory";
  if (activeTab === "journal") state.journalUnread = false;
  state.journalTab = activeTab;
  const progression = ensureProgressionShape();
  const hasBasicPoints = progression.basicStatPoints === Infinity || progression.basicStatPoints > 0;
  const tabs = `
    <div class="journalTabs">
      <button id="journalInventoryTab" class="${activeTab === "inventory" ? "active" : ""}">Inventory</button>
      <button id="journalStatsTab" class="${activeTab === "stats" ? "active" : ""} ${hasBasicPoints ? "hasMemoryPoint" : ""}">Stats</button>
      ${player.progression.unlocked ? `<button id="journalTreeTab" class="${activeTab === "tree" ? "active" : ""} ${player.progression.skillPoints > 0 ? "hasMemoryPoint" : ""}">Skill Tree</button>` : ""}
      <button id="journalNotesTab" class="${activeTab === "journal" ? "active" : ""} ${state.journalUnread ? "hasUnread" : ""}">Journal</button>
    </div>
  `;
  const activePage = activeTab === "tree"
    ? renderSkillTreePage()
    : activeTab === "stats"
      ? renderStatsJournalPage()
      : activeTab === "journal"
        ? renderLoreJournalPage()
        : renderInventoryJournalPage();

  setCard(`
    <div class="card journalCard">
      ${tabs}
      <div id="journalBook">
        ${activePage}
      </div>
      <div class="buttons">
        <button class="alt" id="titleFromJournalBtn">Title</button>
        <button id="closeJournalBtn">Close</button>
      </div>
    </div>
  `);
  document.getElementById("closeJournalBtn").onclick = resumeGame;
  document.getElementById("titleFromJournalBtn").onclick = mainMenu;
  document.getElementById("journalInventoryTab").onclick = () => openJournal("inventory");
  document.getElementById("journalStatsTab").onclick = () => openJournal("stats");
  document.getElementById("journalTreeTab")?.addEventListener("click", () => openJournal("tree"));
  document.getElementById("journalNotesTab").onclick = () => openJournal("journal");
  if (activeTab === "inventory") {
    drawJournalPreview();
    setupJournalDrag();
    for (const button of ui.center.querySelectorAll("[data-page-step]")) {
      button.onclick = () => {
        state.inventoryPage = Math.max(0, (state.inventoryPage ?? 0) + Number(button.dataset.pageStep || 0));
        openJournal("inventory");
      };
    }
  }
  if (activeTab === "stats") {
    for (const button of ui.center.querySelectorAll("[data-basic-stat]")) {
      button.onclick = () => {
        if (spendBasicStat(button.dataset.basicStat)) openJournal("stats");
      };
    }
  }
  for (const button of ui.center.querySelectorAll(".skillLineNode[data-branch], .skillMapNode[data-branch]")) {
    button.onclick = () => {
      const key = button.dataset.key;
      const canSpend = button.dataset.canSpend === "true";
      if (isCoarsePointer() && state.skillPreviewKey !== key) {
        state.skillPreviewKey = key;
        openJournal("tree");
        return;
      }
      if (!canSpend) {
        state.skillPreviewKey = key;
        spawnFloater("locked", player.x, player.y - player.h * 0.86, "#b9a98c");
        openJournal("tree");
        return;
      }
      if (spendSkillPoint(button.dataset.branch)) {
        state.skillPreviewKey = null;
        openJournal("tree");
      }
    };
  }
  for (const button of ui.center.querySelectorAll(".invSlot[data-item]")) {
    button.onclick = () => {
      const itemId = button.dataset.item;
      if (!itemId) return;
      if (state.selectedInventoryItemId === itemId && (ITEMS[itemId]?.type === "weapon" || ITEMS[itemId]?.type === "gear")) {
        equipItem(itemId);
      } else {
        state.selectedInventoryItemId = itemId;
      }
      openJournal("inventory");
    };
  }
  document.getElementById("equipSelectedBtn")?.addEventListener("click", (event) => {
    const itemId = event.currentTarget.dataset.item;
    if (itemId) equipItem(itemId);
    openJournal("inventory");
  });
  for (const slotEl of ui.center.querySelectorAll(".equipmentSlot[data-slot]")) {
    slotEl.onclick = () => {
      if (!slotEl.dataset.item) return;
      if (unequipSlot(slotEl.dataset.slot)) openJournal("inventory");
    };
  }
}

function dragPayload(event) {
  try {
    return JSON.parse(event.dataTransfer.getData("application/json") || event.dataTransfer.getData("text/plain"));
  } catch {
    return null;
  }
}

function setupJournalDrag() {
  for (const itemEl of ui.center.querySelectorAll(".invSlot[data-item]")) {
    if (!itemEl.dataset.item) continue;
    itemEl.addEventListener("dragstart", (event) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("application/json", JSON.stringify({ from: "inventory", itemId: itemEl.dataset.item }));
    });
  }

  for (const slotEl of ui.center.querySelectorAll(".equipmentSlot[data-slot]")) {
    slotEl.addEventListener("dragstart", (event) => {
      if (!slotEl.dataset.item) {
        event.preventDefault();
        return;
      }
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("application/json", JSON.stringify({
        from: "slot",
        slot: slotEl.dataset.slot,
        itemId: slotEl.dataset.item
      }));
    });
    slotEl.addEventListener("click", () => {
      if (slotEl.dataset.item && unequipSlot(slotEl.dataset.slot)) openJournal("inventory");
    });
    slotEl.addEventListener("dragover", (event) => {
      event.preventDefault();
      slotEl.classList.add("dragOver");
    });
    slotEl.addEventListener("dragleave", () => slotEl.classList.remove("dragOver"));
    slotEl.addEventListener("drop", (event) => {
      event.preventDefault();
      slotEl.classList.remove("dragOver");
      const payload = dragPayload(event);
      const item = payload ? ITEMS[payload.itemId] : null;
      if (!item || !itemFitsSlot(item, slotEl.dataset.slot)) return;
      equipItem(payload.itemId, slotEl.dataset.slot);
      openJournal();
    });
  }

  const inventoryGrid = document.getElementById("inventoryGrid");
  if (!inventoryGrid) return;
  inventoryGrid.addEventListener("dragover", (event) => {
    event.preventDefault();
    inventoryGrid.classList.add("dragOver");
  });
  inventoryGrid.addEventListener("dragleave", () => inventoryGrid.classList.remove("dragOver"));
  inventoryGrid.addEventListener("drop", (event) => {
    event.preventDefault();
    inventoryGrid.classList.remove("dragOver");
    const payload = dragPayload(event);
    if (payload?.from === "slot" && unequipSlot(payload.slot)) openJournal();
  });
}

function drawPreviewClassAccent(pctx, x, footY, visual) {
  return;
}

function drawPreviewWeapon(pctx, x, footY, weaponId) {
  const weapon = WEAPONS[ITEMS[weaponId]?.weaponId] ?? WEAPONS[weaponId] ?? WEAPONS.huntingKnife;
  pctx.save();
  pctx.translate(x + 22, footY - 47);
  pctx.rotate(-0.35);
  if (weapon.family === "punching") {
    pctx.fillStyle = "#2f2118";
    pctx.fillRect(-5, -6, 22, 12);
    pctx.fillStyle = "#8a603a";
    pctx.fillRect(-2, -4, 18, 8);
    pctx.fillStyle = "#d6ad55";
    pctx.fillRect(1, -2, 10, 3);
  } else if (weapon.family === "bow" || weapon.family === "crossbow") {
    if (weapon.family === "crossbow") {
      pctx.fillStyle = "#3a2a20";
      pctx.fillRect(-8, -6, 34, 12);
      pctx.fillStyle = "#6b4a31";
      pctx.fillRect(8, -14, 8, 28);
      pctx.fillStyle = weapon.color;
      pctx.fillRect(18, -2, 22, 4);
      pctx.restore();
      return;
    }
    pctx.strokeStyle = "#7d5a33";
    pctx.lineWidth = 4;
    pctx.beginPath();
    pctx.arc(5, 0, 21, -1.18, 1.18);
    pctx.stroke();
    pctx.strokeStyle = "#d8ecb2";
    pctx.lineWidth = 1;
    pctx.beginPath();
    pctx.moveTo(12, -18);
    pctx.lineTo(-9, 0);
    pctx.lineTo(12, 18);
    pctx.stroke();
  } else if (weapon.family === "scepter" || weapon.family === "wand") {
    pctx.fillStyle = "#3a2a20";
    pctx.fillRect(-10, -3, weapon.family === "wand" ? 34 : 44, 6);
    pctx.fillStyle = weapon.color;
    pctx.fillRect(weapon.family === "wand" ? 17 : 25, -8, 12, 16);
    pctx.fillStyle = "#caa7ff";
    pctx.fillRect(weapon.family === "wand" ? 21 : 29, -4, 5, 8);
  } else if (weapon.family === "spear") {
    pctx.fillStyle = "#5a3b28";
    pctx.fillRect(-12, -3, 54, 6);
    pctx.fillStyle = weapon.color;
    pctx.fillRect(35, -6, 13, 12);
  } else if (weapon.family === "axe") {
    pctx.fillStyle = "#5a3b28";
    pctx.fillRect(-9, -4, 34, 8);
    pctx.fillStyle = "#2f2118";
    pctx.fillRect(22, -15, 16, 28);
    pctx.fillStyle = weapon.color;
    pctx.fillRect(25, -13, 15, 12);
    pctx.fillRect(27, 1, 13, 10);
  } else if (weapon.family === "dual") {
    pctx.fillStyle = "#5a3b28";
    pctx.fillRect(-8, -4, 12, 8);
    pctx.fillRect(-6, 7, 10, 7);
    pctx.fillStyle = weapon.color;
    pctx.fillRect(3, -3, 28, 5);
    pctx.fillRect(3, 8, 24, 4);
  } else if (weapon.id === "stoneHammer" || weapon.id === "guardMace" || weapon.id === "wardenGreatmace") {
    pctx.fillStyle = "#5a3b28";
    pctx.fillRect(-10, -4, 36, 8);
    pctx.fillStyle = "#2f2118";
    pctx.fillRect(21, -15, 22, 30);
    pctx.fillStyle = weapon.color;
    pctx.fillRect(24, -12, weapon.id === "guardMace" ? 14 : 18, weapon.id === "guardMace" ? 24 : 28);
    pctx.fillStyle = "#d6ad55";
    pctx.fillRect(30, -16, 4, 6);
    pctx.fillRect(30, 10, 4, 6);
  } else {
    pctx.fillStyle = "#5a3b28";
    pctx.fillRect(-8, -4, 12, 8);
    pctx.fillStyle = weapon.color;
    pctx.fillRect(3, -3, weapon.id === "brokenKnife" ? 16 : weapon.family === "great" ? 48 : weapon.family === "sword" ? 38 : 28, weapon.family === "great" ? 8 : 6);
  }
  pctx.restore();
}

function roomSpawnsForRun(room) {
  const base = room.spawns ?? [];
  if (!isChallengeRun() || room.bossId || base.length === 0) return base;
  const extraCount = Math.max(1, Math.ceil(base.length * (CHALLENGE_ENEMY_MULTIPLIER - 1)));
  const extras = [];
  for (let i = 0; i < extraCount; i += 1) {
    const source = base[i % base.length];
    const offset = (i % 2 === 0 ? 78 : -78) + i * 18;
    extras.push({
      ...source,
      x: clamp(source.x + offset, 90, (room.width ?? 1800) - 90),
      patrolMin: source.patrolMin != null ? clamp(source.patrolMin + offset, 50, (room.width ?? 1800) - 120) : undefined,
      patrolMax: source.patrolMax != null ? clamp(source.patrolMax + offset, 120, (room.width ?? 1800) - 50) : undefined
    });
  }
  return [...base, ...extras];
}

function drawJournalPreview() {
  const preview = document.getElementById("journalPreview");
  if (!preview) return;
  const pctx = preview.getContext("2d");
  pctx.imageSmoothingEnabled = false;
  pctx.clearRect(0, 0, preview.width, preview.height);
  pctx.fillStyle = "#201711";
  pctx.fillRect(0, 0, preview.width, preview.height);
  const x = Math.round(preview.width * 0.5);
  const footY = Math.min(preview.height - 20, Math.round(preview.height * 0.82));
  pctx.fillStyle = "rgba(214,192,154,.12)";
  pctx.fillRect(x - 36, footY + 4, 72, 5);
  const cap = itemDesign("head");
  const body = itemDesign("body");
  const glove = itemDesign("hands");
  const legs = itemDesign("legs");
  const feet = itemDesign("feet");
  const charm = itemDesign("trinket");
  const visual = classRenderProfile();
  pctx.save();
  pctx.translate(x, footY);
  pctx.scale(visual.scaleX, visual.scaleY);
  pctx.translate(-x, -footY);
  pctx.fillStyle = PLAYER_COLORS.outline;
  pctx.fillRect(x - 15, footY - 61, 30, 31);
  pctx.fillRect(x - 12, footY - 82, 24, 23);
  pctx.fillRect(x - 13, footY - 27, 10, 28);
  pctx.fillRect(x + 3, footY - 27, 10, 28);
  pctx.fillStyle = legs ? legs.primary : PLAYER_COLORS.pants;
  pctx.fillRect(x - 10, footY - 30, 8, 28);
  pctx.fillRect(x + 4, footY - 30, 8, 28);
  if (legs) {
    pctx.fillStyle = legs.secondary;
    pctx.fillRect(x - 8, footY - 28, 2, 20);
    pctx.fillRect(x + 6, footY - 28, 2, 20);
  }
  pctx.fillStyle = feet ? feet.primary : PLAYER_COLORS.shoe;
  pctx.fillRect(x - 13, footY - 4, 14, 5);
  pctx.fillRect(x + 1, footY - 4, 14, 5);
  if (feet) {
    pctx.fillStyle = feet.secondary;
    pctx.fillRect(x - 10, footY - 6, 8, 2);
    pctx.fillRect(x + 4, footY - 6, 8, 2);
  }
  pctx.fillStyle = body ? body.accent : PLAYER_COLORS.shirtShadow;
  if (player.equipment.body === "wingedChestplate" && body) {
    pctx.fillRect(x - 18, footY - 55, 7, 17);
    pctx.fillRect(x + 12, footY - 55, 7, 17);
    pctx.fillStyle = body.secondary;
    pctx.fillRect(x - 22, footY - 52, 12, 4);
    pctx.fillRect(x + 11, footY - 52, 12, 4);
    pctx.fillStyle = body.accent;
  }
  pctx.fillRect(x - 14, footY - 57, 28, 27);
  pctx.fillRect(x - 17, footY - 54, 8, 18);
  pctx.fillRect(x + 10, footY - 54, 8, 18);
  pctx.fillStyle = body ? body.primary : PLAYER_COLORS.shirt;
  pctx.fillRect(x - 12, footY - 61, 25, 28);
  pctx.fillRect(x - 15, footY - 53, 7, 16);
  pctx.fillRect(x + 9, footY - 53, 7, 16);
  if (body) {
    pctx.fillStyle = body.secondary;
    pctx.fillRect(x - 5, footY - 56, 10, 2);
    pctx.fillRect(x - 10, footY - 37, 20, 3);
  } else {
    pctx.fillStyle = PLAYER_COLORS.shirtLight;
    pctx.fillRect(x - 8, footY - 58, 7, 5);
    pctx.fillStyle = PLAYER_COLORS.shirtShadow;
    pctx.fillRect(x - 6, footY - 59, 13, 5);
  }
  drawPreviewClassAccent(pctx, x, footY, visual);
  if (charm) {
    pctx.fillStyle = charm.accent;
    pctx.fillRect(x + 7, footY - 53, 8, 8);
    pctx.fillStyle = charm.secondary;
    pctx.fillRect(x + 9, footY - 55, 4, 4);
    pctx.fillStyle = charm.primary;
    pctx.fillRect(x + 9, footY - 51, 4, 4);
  }
  pctx.fillStyle = PLAYER_COLORS.skin;
  pctx.fillRect(x - 10, footY - 80, 20, 21);
  pctx.fillStyle = PLAYER_COLORS.skinShadow;
  pctx.fillRect(x + 7, footY - 77, 3, 15);
  pctx.fillStyle = PLAYER_COLORS.hair;
  pctx.fillRect(x - 12, footY - 85, 24, 8);
  pctx.fillRect(x - 13, footY - 80, 9, 12);
  pctx.fillRect(x - 7, footY - 88, 18, 6);
  pctx.fillRect(x + 6, footY - 83, 9, 5);
  pctx.fillStyle = PLAYER_COLORS.hairLight;
  pctx.fillRect(x - 4, footY - 87, 12, 2);
  pctx.fillRect(x + 7, footY - 82, 6, 2);
  if (cap) {
    pctx.fillStyle = cap.accent;
    pctx.fillRect(x - 14, footY - 86, 28, 6);
    pctx.fillRect(x - 13, footY - 81, 7, 8);
    pctx.fillRect(x + 7, footY - 81, 6, 8);
    pctx.fillStyle = cap.primary;
    pctx.fillRect(x - 11, footY - 90, 22, 9);
    pctx.fillRect(x - 9, footY - 93, 17, 5);
    pctx.fillStyle = cap.secondary;
    pctx.fillRect(x - 7, footY - 92, 11, 3);
    pctx.fillRect(x - 6, footY - 88, 15, 2);
    pctx.fillStyle = cap.accent;
    pctx.fillRect(x + 9, footY - 85, 12, 4);
  }
  pctx.fillStyle = "#111111";
  pctx.fillRect(x - 6, footY - 70, 2, 4);
  pctx.fillRect(x + 5, footY - 70, 2, 4);
  pctx.fillStyle = body ? body.accent : PLAYER_COLORS.shirtShadow;
  pctx.fillRect(x - 20, footY - 54, 7, 22);
  pctx.fillStyle = body ? body.primary : PLAYER_COLORS.shirt;
  pctx.fillRect(x + 14, footY - 54, 7, 22);
  pctx.fillStyle = glove ? glove.accent : PLAYER_COLORS.skinShadow;
  pctx.fillRect(x - 20, footY - 34, 7, 7);
  pctx.fillStyle = glove ? glove.primary : PLAYER_COLORS.skin;
  pctx.fillRect(x + 14, footY - 34, 7, 7);
  if (glove) {
    pctx.fillStyle = glove.secondary;
    pctx.fillRect(x - 19, footY - 33, 5, 2);
    pctx.fillRect(x + 15, footY - 33, 5, 2);
  }
  drawPreviewWeapon(pctx, x, footY, activeWeaponItemId());
  pctx.restore();
}

function enterRoom(roomId, entrySide = "left", options = {}) {
  const room = getRoom(roomId);
  if (!room) return;
  const deferRoomCinematics = Boolean(options.deferRoomCinematics);
  state.room = room;
  state.roomId = room.id;
  state.enemies = [];
  state.boss = null;
  state.chests = [];
  state.merchants = [];
  state.dummies = [];
  state.scraps = [];
  state.pickups = [];
  state.projectiles = [];
  state.enemyProjectiles = [];
  state.roars = [];
  state.summons = [];
  state.burns = [];
  state.feints = [];
  state.particles = [];
  state.stains = [];
  state.slashes = [];
  state.hazards = [];
  state.floaters = [];
  state.ambientTimer = 0;
  player.x = entrySide === "right" ? room.width - 150 : room.startX;
  player.y = room.floorY - player.h * 0.5;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  state.camera.zoom = 1.18;
  const bounds = cameraBounds(room, state.camera.zoom);
  state.camera.leadX = 0;
  state.camera.x = clamp(player.x, bounds.minX, bounds.maxX);
  state.camera.y = H * 0.5;
  state.camera.shake = 0;

  if (!state.roomClears.has(room.id)) {
    for (const spawn of roomSpawnsForRun(room)) {
      spawnEnemy(spawn.enemyId, spawn.x, room.floorY, spawn);
    }
  }
  if (!deferRoomCinematics) startRoomBossIfNeeded(room);
  if (room.id === "rootCrawlerPit" && (state.flags.bossDefeated || state.flags.knifeBroken) && !state.flags.starterWeaponClaimed) {
    spawnStarterWeaponReward(player.x + 110, { y: room.floorY - 24, vx: 0, vy: 0, fromDrop: false });
  }
  if (room.id === "rootCrawlerPit" && state.flags.bossDefeated && !state.flags.postBossScrapRead) {
    spawnJournalScrap(room.width * 0.62, room.floorY - 24);
  }
  if (room.id === "wakingStones") {
    if (state.flags.journalFound) addOpeningChest(room);
  }
  if (room.id === "splitArch") {
    addRuinMerchant(room);
    spawnTrainingDummy(980, room.floorY);
    captureCastleCheckpoint("enterGate");
  }
  if (room.id === "swampGate") {
    spawnTrainingDummy(1040, room.floorY);
  }
  if (room.id === "rootNest") {
    addRuinsChest(room);
  }
  if (room.id === "kingsHallApproach") {
    addCastleChest(room);
  }
  if (!deferRoomCinematics && room.demoComplete && !state.flags.demoComplete) {
    state.flags.demoComplete = true;
    setTimeout(() => {
      if (state.roomId === room.id && state.mode === "play") showDemoComplete();
    }, 300);
  }
  if (state.mode === "play" && (activeMusicTrack || isSandboxRun() || room.biome === "Castle") && (!room.bossId || bossIsDefeated(room.bossId))) {
    startGameMusic();
  }
}

function finishDeferredRoomCinematics() {
  const room = state.room;
  if (!room || state.mode !== "play") return;
  if (startRoomBossIfNeeded(room)) return;
  if (room.demoComplete && !state.flags.demoComplete) {
    state.flags.demoComplete = true;
    setTimeout(() => {
      if (state.roomId === room.id && state.mode === "play") showDemoComplete();
    }, 180);
  }
}

function addRuinMerchant(room) {
  if (state.merchants.some((merchant) => merchant.id === "ruinMerchant")) return;
  const sandbox = isSandboxRun();
  const baseStock = state.flags.ironWardenDefeated ? [...MERCHANT_STOCK, ...WARDEN_UNLOCK_STOCK] : MERCHANT_STOCK;
  state.merchants.push({
    id: "ruinMerchant",
    label: sandbox ? "Sandbox Merchant" : "Castle Gate Merchant",
    promptName: sandbox ? "sandbox merchant" : "castle gate merchant",
    x: 620,
    y: room.floorY,
    stock: sandbox ? SANDBOX_STOCK : baseStock,
    pulse: 0
  });
}

function addOpeningChest(room) {
  const chest = {
    id: "starterChest",
    label: "Starter Chest",
    promptName: "starter chest",
    x: 1460,
    y: room.floorY,
    loot: ["starterCap", "starterTunic", "starterGlove", "starterPants", "starterCharm"],
    opened: state.flags.starterChestOpened,
    flagKey: "starterChestOpened",
    colors: {
      glow: "#d6ad55",
      wood: "#8a603a",
      trim: "#d6ad55",
      lid: "#6b4a31"
    },
    pulse: 0
  };
  state.chests.push(chest);
  if (chest.opened) spillChestLoot(chest, false);
}

function addRuinsChest(room) {
  const chest = {
    id: "ruinsChest",
    label: "Ruins Chest",
    promptName: "ruins chest",
    x: 1840,
    y: room.floorY,
    loot: [RUINS_CHEST_LOOT],
    opened: state.flags.ruinsChestOpened,
    flagKey: "ruinsChestOpened",
    colors: {
      glow: "#a5a18d",
      wood: "#555d4d",
      trim: "#8fa15f",
      lid: "#686f61"
    },
    pulse: 0
  };
  state.chests.push(chest);
  if (chest.opened) spillChestLoot(chest, false);
}

function addCastleChest(room) {
  const chest = {
    id: "castleChest",
    label: "Watchman's Chest",
    promptName: "watchman's chest",
    x: 2220,
    y: room.floorY,
    loot: ["watchmansHelm"],
    opened: state.flags.castleChestOpened,
    flagKey: "castleChestOpened",
    colors: {
      glow: "#d6ad55",
      wood: "#4b4f49",
      trim: "#a58a59",
      lid: "#343a39"
    },
    pulse: 0
  };
  state.chests.push(chest);
  if (chest.opened) spillChestLoot(chest, false);
}

function miniChestLootForRoom(room) {
  if (room.biome === "Castle") return pick(["dentedGuardHelm", "guardBow", "gargoyleClaw", "spikedPauldron", "sunkenSaber"], "dentedGuardHelm");
  if (room.biome === "Swamp") return pick(["sunkenSaber", "sunkenPike", "sunkenFang", "sunkenGuardMask", "sunkenGuardMail"], "sunkenSaber");
  return pick(["ruinDagger", "ruinAxe", "diggersAmulet", "dirt"], "ruinDagger");
}

function maybeSpawnMiniChestForRoom() {
  const room = state.room;
  if (!room || room.bossId || room.spawns.length === 0 || isChallengeRun()) return;
  if (state.miniChestRooms.has(room.id) || state.chests.some((chest) => chest.id === `mini-${room.id}`)) return;
  if (Math.random() > 0.18) return;
  const x = clamp(player.x + player.facing * 150, 170, room.width - 170);
  const chest = {
    id: `mini-${room.id}`,
    label: "Small Chest",
    promptName: "small chest",
    x,
    y: room.floorY,
    loot: [miniChestLootForRoom(room)],
    opened: false,
    flagKey: null,
    colors: {
      glow: "#c9e0a5",
      wood: "#4e5c43",
      trim: "#95a979",
      lid: "#344136"
    },
    pulse: 0
  };
  state.chests.push(chest);
  state.miniChestRooms.add(room.id);
  spawnItemPop(x, room.floorY - 34, "#c9e0a5");
  toast("A small chest surfaced.", 1300);
}

function spawnTrainingDummy(x, floorY) {
  state.dummies.push({
    id: `${state.roomId}-dummy`,
    x,
    y: floorY - 42,
    w: 40,
    h: 84,
    hurt: 0,
    hits: []
  });
}

function showDemoComplete() {
  exitGamePointerLock();
  setGameChromeVisible(true);
  state.mode = "complete";
  playSfx("pickup");
  setCard(`
    <div class="card">
      <h2>The Iron Warden Fell</h2>
      <p>The Castle Gate checkpoint holds behind you. The Royal Keep is broken open, but what waits past it is not built yet.</p>
      <p>Castle content is complete for this pass: checkpoint, smarter guards, gargoyles, brutes, rare drops, Royal Crest, and the Warden reward.</p>
      <div class="buttons">
        <button id="continueBtn">Stand Here Awhile</button>
        <button class="alt" id="restartBtn">Wake Again</button>
      </div>
    </div>
  `);
  document.getElementById("continueBtn").onclick = resumeGame;
  document.getElementById("restartBtn").onclick = mainMenu;
}

function startRoomBossIfNeeded(room = state.room) {
  if (!room?.bossId || bossIsDefeated(room.bossId) || state.boss) return false;
  if (!bossIntroPlayed(room.bossId)) {
    startBossIntro(room.bossId);
  } else {
    spawnBoss(room.bossId);
    if (room.bossId === "hugeRootCrawler" && state.flags.knifeBroken && state.boss) {
      state.boss.hp = Math.min(state.boss.hp, state.boss.maxHp * BOSSES.hugeRootCrawler.knifeBreakAt);
      state.boss.stun = 1.0;
    }
  }
  return true;
}

function spawnEnemy(enemyId, x, floorY, options = {}) {
  const def = ENEMIES[enemyId];
  const patrolMin = options.patrolMin ?? Math.max(40, x - 170);
  const patrolMax = options.patrolMax ?? Math.min(state.room.width - 40, x + 170);
  const flying = def.movement === "flying";
  const burrow = def.movement === "burrow";
  const groundY = options.groundY ?? floorY;
  const spawnY = options.y ?? (flying ? floorY - (def.hoverHeight ?? 150) : groundY - def.height * 0.5);
  state.enemies.push({
    id: `${enemyId}-${state.time}-${Math.random()}`,
    def,
    ai: options.ai ?? def.ai ?? "hunter",
    x,
    y: spawnY,
    vx: 0,
    vy: 0,
    hp: def.maxHp,
    maxHp: def.maxHp,
    patrolMin,
    patrolMax,
    groundY,
    patrolDir: options.dir ?? (Math.random() < 0.5 ? -1 : 1),
    baseY: spawnY,
    phaseOffset: rand(0, TAU),
    lungeTime: 0,
    lungeDuration: 0,
    leapStartX: x,
    leapTargetX: x,
    leapLift: 0,
    swoopStartX: x,
    swoopStartY: spawnY,
    swoopControlX: x,
    swoopControlY: spawnY,
    swoopEndX: x,
    swoopEndY: spawnY,
    burrowState: burrow ? "hidden" : null,
    popTime: 0,
    burrowTargetX: x,
    eruptionHit: false,
    chaseTimer: 0,
    lastSeenX: x,
    lastSeenY: floorY,
    contactCooldown: 0,
    seesPlayer: false,
    attackWind: 0,
    attackRecover: rand(0.2, 0.8),
    hurt: 0,
    dead: false
  });
}

function spawnBoss(bossId) {
  const def = BOSSES[bossId];
  startBossMusic();
  state.boss = {
    def,
    x: state.room.width * 0.68,
    y: state.room.floorY - def.height * 0.5,
    vx: 0,
    hp: def.maxHp,
    maxHp: def.maxHp,
    phase: 0,
    attack: null,
    attackCooldown: 1.2,
    spawnCooldown: 6.8,
    facing: -1,
    gaitOffset: rand(0, TAU),
    leapLift: 0,
    squash: 0,
    stun: 0,
    hurt: 0,
    dead: false
  };
  playSfx("boss");
}

function scrapExists(id) {
  return state.scraps.some((scrap) => !scrap.dead && scrap.id === id);
}

function spawnJournalScrap(x, y) {
  if (state.flags.postBossScrapRead || scrapExists("postBossScrap")) return;
  state.flags.postBossScrapSpawned = true;
  state.scraps.push({
    id: "postBossScrap",
    x: clamp(x, 120, state.room.width - 120),
    y,
    dead: false,
    pulse: rand(0, TAU)
  });
}

function currentWeapon() {
  syncActiveWeapon();
  return WEAPONS[player.weaponId] ?? WEAPONS.huntingKnife;
}

function clawComboActive() {
  return (player.buffs?.clawCombo ?? 0) > 0 || beastFormActive();
}

function beastFormActive() {
  return (player.buffs?.beastForm ?? 0) > 0;
}

function jump() {
  if (state.mode !== "play" || cinematicLocksControls()) return false;
  if (player.onGround || player.coyote > 0) {
    player.vy = -730;
    player.onGround = false;
    player.coyote = 0;
    player.jumpBuffer = 0;
    playSfx("jump");
    spawnDust(player.x, player.y + player.h * 0.5, 8);
    spawnMossDust(player.x, player.y + player.h * 0.5, 5);
    return true;
  }
  player.jumpBuffer = 0.12;
  return false;
}

function dodge() {
  if (state.mode !== "play" || cinematicLocksControls() || player.dodge > 0) return;
  if (beastFormActive()) {
    if (player.st < 10) return;
    const beastDir = Math.abs(player.moveX) > 0.1 ? sign(player.moveX) : player.facing;
    player.st = Math.max(0, player.st - 10);
    player.dodge = 0.16;
    player.dodgeHitIds = new Set();
    player.dodgeFxTimer = 0;
    player.invuln = 0.22;
    player.facing = beastDir;
    player.vx = beastDir * 960;
    if (player.onGround) player.vy = Math.min(player.vy, -55);
    playSfx("dodge");
    spawnDashTrail(player.x - beastDir * 10, player.y + player.h * 0.02, beastDir, 9);
    spawnPunchBurst(player.x + beastDir * 36, player.y - 8, beastDir > 0 ? 0 : Math.PI, "#ffb07a", 10);
    return;
  }
  if (player.st < 18) return;
  const dodgeDir = Math.abs(player.moveX) > 0.1 ? sign(player.moveX) : player.facing;
  player.st -= 18;
  player.dodge = 0.2;
  player.dodgeHitIds = new Set();
  player.dodgeFxTimer = 0;
  resetWeaponCombo();
  player.attackBuffer = 0;
  player.invuln = 0.24;
  player.facing = dodgeDir;
  player.vx = dodgeDir * 590;
  if (player.onGround) player.vy = Math.min(player.vy, -90);
  playSfx("dodge");
  spawnDashTrail(player.x - dodgeDir * 10, player.y + player.h * 0.06, dodgeDir, 4);
  spawnDust(player.x - dodgeDir * 10, player.y + player.h * 0.5, 20);
  spawnStoneChips(player.x - dodgeDir * 18, player.y + player.h * 0.5, -dodgeDir, 4);
  if (bugChargeEquipped()) {
    spawnBugChargeBurst(player.x + dodgeDir * 22, player.y + player.h * 0.08, dodgeDir, 10);
    spawnFloater("Bug Charge", player.x, player.y - player.h * 0.74, "#d6ad55");
  }
}

function queueAttack() {
  if (cinematicLocksControls()) return;
  state.opening.attacked = true;
  player.attackBuffer = 0.32;
  beginAttack();
}

function weaponAttackStaminaCost(weapon, comboStep) {
  const base = (weapon.staminaCost ?? 10) * (comboStep.staminaScale ?? 1);
  const familyMultiplier = weapon.mode === "projectile"
    ? ({ bow: 1.16, crossbow: 1.2, wand: 1.14, scepter: 1.22 }[weapon.family] ?? 1.16)
    : ({ axe: 1.06, great: 1.1, spear: 1.04 }[weapon.family] ?? 1);
  return Math.ceil(base * familyMultiplier);
}

function attackFacingFromAim() {
  return aimDirectionSide();
}

function beginAttack() {
  if (state.mode !== "play" || cinematicLocksControls() || player.attack || player.attackCooldown > 0 || player.dodge > 0) return false;
  if (clawComboActive()) return beginBeastAttack();
  const weapon = currentWeapon();
  const comboStep = previewNextWeaponComboStep(weapon);
  const profile = weaponAttackProfile(weapon, comboStep);
  const cost = weaponAttackStaminaCost(weapon, comboStep);
  if (player.st < cost) return false;
  commitWeaponComboStep(weapon, comboStep.index);
  player.st -= cost;
  player.attackBuffer = 0;
  const aimFacing = attackFacingFromAim();
  const baseAngle = aimAngleForWeapon(weapon, player.aimAngle);
  const angle = baseAngle + (comboStep.angleOffset ?? 0) * aimFacing;
  player.attack = {
    t: 0,
    age: 0,
    duration: profile.wind + profile.active + profile.recover,
    phase: "wind",
    weaponId: player.weaponId,
    profile,
    comboStep,
    comboIndex: comboStep.index,
    facing: aimFacing,
    angle,
    dx: Math.cos(angle),
    dy: Math.sin(angle),
    hit: new Set(),
    fired: false
  };
  player.attackCooldown = profile.lightCooldown;
  state.camera.shake = Math.max(state.camera.shake, weaponAttackShake(weapon, comboStep) * 0.62);
  const sparkCount = {
    dagger: 6,
    sword: 8,
    axe: 10,
    great: 12,
    spear: 7,
    dual: 9,
    punching: 6,
    bow: 4,
    crossbow: 5,
    wand: 7,
    scepter: 11
  }[weapon.family] ?? 7;
  spawnSlashSparks(player.x + Math.cos(angle) * 20, player.y - 12 + Math.sin(angle) * 8, angle, weapon.color, weapon.mode === "projectile" ? Math.max(4, Math.floor(sparkCount * 0.6)) : sparkCount);
  if (comboStep.index === 2) spawnFloater(comboStep.name, player.x, player.y - player.h * 0.92, weapon.color);
  return true;
}

function beginBeastAttack() {
  const weapon = beastFormActive()
    ? BEAST_FORM_WEAPON
    : CLAW_COMBO_WEAPON;
  const comboStep = previewNextWeaponComboStep(weapon);
  const profile = weaponAttackProfile(weapon, comboStep);
  commitWeaponComboStep(weapon, comboStep.index);
  player.attackBuffer = 0;
  const aimFacing = attackFacingFromAim();
  const baseAngle = aimAngleForWeapon(weapon, player.aimAngle);
  const angle = baseAngle + (comboStep.angleOffset ?? 0) * aimFacing;
  const beast = beastFormActive();
  player.attack = {
    t: 0,
    age: 0,
    duration: profile.wind + profile.active + profile.recover,
    phase: "wind",
    beast,
    weaponId: weapon.id,
    weaponVisual: weapon,
    profile,
    comboStep: {
      ...comboStep,
      trailStyle: beast
        ? (comboStep.index === 2 ? "beastRend" : "beastMaul")
        : (comboStep.index === 2 ? "clawCross" : "clawSwipe"),
      hitStyle: beast
        ? (comboStep.index === 2 ? "beastRend" : "beastMaul")
        : (comboStep.index === 2 ? "clawFinish" : "clawSwipe")
    },
    comboIndex: comboStep.index,
    facing: aimFacing,
    angle,
    dx: Math.cos(angle),
    dy: Math.sin(angle),
    hit: new Set(),
    fired: false
  };
  player.attackCooldown = profile.lightCooldown;
  spawnPunchBurst(player.x + Math.cos(angle) * (beast ? 54 : 36), player.y - 12 + Math.sin(angle) * 10, angle, weapon.color, comboStep.index === 2 ? (beast ? 28 : 18) : (beast ? 18 : 10));
  if (beast) {
    spawnStoneChips(player.x + aimFacing * 34, state.room.floorY - 5, aimFacing, comboStep.index === 2 ? 10 : 5);
    spawnClassAbilityAccent("frenzied", player.x + Math.cos(angle) * 42, player.y - 18 + Math.sin(angle) * 12, angle, comboStep.index === 2 ? 18 : 10);
  }
  if (comboStep.index === 2) {
    state.camera.shake = Math.max(state.camera.shake, beast ? 0.24 : 0.14);
    spawnFloater(beast ? "BEAST REND" : "Claw Finish", player.x, player.y - player.h * 0.92, weapon.color);
  }
  return true;
}

function interact() {
  if (state.mode !== "play" || cinematicLocksControls()) return;
  const action = findPromptAction();
  if (!action) return;
  if (!action.canUse) {
    toast(action.text, 900);
    return;
  }
  if (action.type === "corpse") {
    collectJournal();
  } else if (action.type === "scrap") {
    collectJournalScrap(action.scrap);
  } else if (action.type === "chest") {
    openChest(action.chest);
  } else if (action.type === "pickup") {
    collectPickup(action.pickup);
  } else if (action.type === "merchant") {
    openMerchant(action.merchant);
  } else if (action.type === "ferry") {
    useFerry(action);
  } else if (action.type === "exit") {
    useExit(action.exit);
  }
}

function useFerry(action) {
  if (!action.hasTicket && !isSandboxRun()) {
    player.coins = Math.max(0, player.coins - action.ferry.cost);
  }
  state.flags[action.ticketKey] = true;
  startFerryRide(action, !action.hasTicket);
}

function startFerryRide(action, boughtTicket = false) {
  const ferry = action.ferry;
  const side = action.side ?? ferrySideForPlayer(ferry);
  const startSide = side;
  const endSide = side === "right" ? "left" : "right";
  const startX = ferryBoatDockX(ferry, startSide);
  const endX = ferryBoatDockX(ferry, endSide);
  const waterY = ferry.waterY ?? state.room.floorY - 40;
  setCinematicChromeVisible(true);
  state.cinematic = {
    type: "ferryBoat",
    time: 0,
    duration: 2.65,
    lockControls: true,
    ferry,
    boatX: startX,
    startX,
    endX,
    waterY,
    ticketKey: action.ticketKey,
    boatSideKey: ferryBoatSideKey(state.room),
    targetBoatRight: endSide === "right",
    boughtTicket,
    lineShown: false,
    splashAt: 0
  };
  player.vx = 0;
  player.vy = 0;
  player.x = startX;
  player.y = waterY - 14 - player.h * 0.5;
  player.facing = sign(endX - startX) || player.facing;
  spawnMossDust(startX, waterY - 5, 10);
  toast(boughtTicket ? "The ferryman sells you passage." : "The ferry shoves off.", 1300);
  playSfx("interact");
}

function openChest(chest) {
  if (chest.opened) return;
  if (chest.id === "starterChest") {
    startStarterChestFocus(chest);
    return;
  }
  finishChestOpen(chest);
}

function finishChestOpen(chest) {
  if (chest.opened) return;
  chest.opened = true;
  if (chest.flagKey) state.flags[chest.flagKey] = true;
  playSfx("chest");
  spillChestLoot(chest, true);
  if (chest.id === "ruinsChest") {
    const item = ITEMS[chest.loot[0]];
    toast(`${item?.name ?? "Armor"} spilled out.`, 1500);
  } else if (chest.id.startsWith("mini-")) {
    toast("Small chest opened.", 1200);
  } else {
    toast("Starter gear spilled out.", 1500);
  }
  spawnItemPop(chest.x, chest.y - 48, chest.colors?.trim ?? "#d6ad55");
  spawnChestSparkle(chest.x, chest.y - 40);
  spawnMossDust(chest.x, chest.y, 7);
}

function pickupExists(itemId) {
  return state.pickups.some((pickup) => !pickup.dead && pickup.itemId === itemId);
}

function spawnPickup(itemId, x, restY, options = {}) {
  if (!ITEMS[itemId] || ownsItem(itemId) || pickupExists(itemId)) return;
  state.pickups.push({
    itemId,
    x,
    y: options.y ?? restY,
    restY,
    vx: options.vx ?? 0,
    vy: options.vy ?? 0,
    landed: !options.y,
    dead: false,
    pulse: rand(0, TAU),
    fromDrop: Boolean(options.fromDrop),
    fromChest: Boolean(options.fromChest)
  });
}

function spillChestLoot(chest, animated = true) {
  const restY = state.room.floorY - 24;
  const count = chest.loot.length;
  for (let index = 0; index < count; index += 1) {
    const itemId = chest.loot[index];
    const spread = (index - (count - 1) * 0.5) * 44 + rand(-14, 14);
    const side = spread < 0 ? -1 : 1;
    if (animated) {
      spawnPickup(itemId, chest.x + spread * 0.24, restY, {
        y: chest.y - 62 - rand(0, 18),
        vx: side * rand(105, 165) + rand(-25, 25),
        vy: rand(-360, -260),
        fromChest: true
      });
    } else {
      spawnPickup(itemId, chest.x + spread, restY, { fromChest: true });
    }
  }
}

function collectJournal() {
  state.flags.journalFound = true;
  playSfx("pickup");
  addItem("corpseJournal", { markNew: true });
  addNote("The corpse journal was warm when I touched it.");
  spawnItemPop(state.room.corpse.x, state.room.corpse.y - 30, "#d6ad55");
  if (state.roomId === "wakingStones" && !state.chests.some((chest) => chest.id === "starterChest")) {
    addOpeningChest(state.room);
  }
  startJournalFocus(state.room.corpse);
}

function collectJournalScrap(scrap) {
  if (scrap.dead || state.flags.postBossScrapRead) return;
  playSfx("pickup");
  spawnItemPop(scrap.x, scrap.y - 24, "#fff0b5");
  if (state.roomId === "rootCrawlerPit" && state.flags.bossDefeated && !state.flags.starterWeaponClaimed) {
    spawnStarterWeaponReward(scrap.x + 140, {
      y: state.room.floorY - 82,
      vx: 115,
      vy: -300
    });
  }
  addNote(journalScrapText());
  startJournalScrapFlashback(scrap);
}

function collectPickup(pickup) {
  playSfx("pickup");
  if (pickup.itemId === starterWeaponItemId()) {
    state.flags.swordClaimed = true;
    state.flags.starterWeaponClaimed = true;
    const item = ITEMS[pickup.itemId];
    addItem(pickup.itemId, { markNew: true });
    equipItem(pickup.itemId);
    addItemLore(item, "found");
    toast(`${item.name} equipped. R remembered.`, 900);
    startStarterWeaponClaimLine(item.name);
  } else {
    const item = ITEMS[pickup.itemId];
    const context = pickup.fromDrop ? "drop" : pickup.fromChest ? "chest" : "found";
    addItem(pickup.itemId, { markNew: true });
    let autoEquipped = false;
    if (pickup.itemId === "bugChargeMod" && !player.equipment.modification) {
      equipItem(pickup.itemId, "modification");
      autoEquipped = true;
    }
    addItemLore(item, context);
    toast(autoEquipped ? "Bug Charge equipped." : `${item?.name ?? "Item"} added to pack.`, 1400);
  }
  pickup.dead = true;
  spawnItemPop(pickup.x, pickup.y - 24, "#d6ad55");
}

function merchantPrice(itemId, merchant = null) {
  const stock = merchant?.stock ?? MERCHANT_STOCK;
  return stock.find((entry) => entry.itemId === itemId)?.price ?? 9999;
}

function canSellItem(itemId) {
  const item = ITEMS[itemId];
  return Boolean(item && item.rarity !== "story");
}

function itemSellValue(itemId) {
  const item = ITEMS[itemId];
  if (!canSellItem(itemId)) return 0;
  const buyPrice = merchantPrice(itemId);
  if (buyPrice < 9999) return Math.max(1, Math.round(buyPrice * 0.45));
  const weapon = item.weaponId ? WEAPONS[item.weaponId] : null;
  if (weapon) {
    return Math.max(8, Math.round((weapon.lightDamage ?? 10) * 1.35 + (weapon.reach ?? 40) * 0.04));
  }
  const effects = item.effects ?? {};
  const effectValue =
    (effects.hpRegen ?? 0) * 8 +
    (effects.maxHp ?? 0) * 0.8 +
    Math.abs(effects.moveSpeed ?? 0) * 0.55 +
    (effects.dashDamage ?? 0) * 1.2;
  return Math.max(1, Math.round((SELL_RARITY_VALUE[item.rarity] ?? 12) + effectValue));
}

function merchantStockGroup(item) {
  if (!item) return "Other";
  if (item.type === "weapon") return "Weapons";
  if (item.slot === "head" || item.slot === "body" || item.slot === "hands" || item.slot === "legs" || item.slot === "feet") return "Armor";
  return "Gear";
}

function merchantItemMeta(item) {
  const weapon = itemWeapon(item);
  if (weapon) return weaponFamilyLabel(weapon);
  if (item.slot) return GEAR_SLOTS.find((slot) => slot.id === item.slot)?.label ?? itemCategory(item);
  return itemCategory(item);
}

function renderMerchantStock(merchant) {
  const groups = ["Armor", "Weapons", "Gear"].map((title) => ({
    title,
    entries: merchant.stock.filter((entry) => merchantStockGroup(ITEMS[entry.itemId]) === title)
  })).filter((group) => group.entries.length);
  return groups.map((group) => `
    <section class="shopStockGroup">
      <h4>${group.title}</h4>
      <div class="shopGrid buyGrid">
        ${group.entries.map((entry) => renderMerchantItem(entry, merchant)).join("")}
      </div>
    </section>
  `).join("");
}

function renderMerchantItem(entry, merchant) {
  const item = ITEMS[entry.itemId];
  if (!item) return "";
  const owned = ownsItem(item.id);
  const sandbox = isSandboxRun();
  const affordable = sandbox || player.coins >= entry.price;
  const disabled = owned || !affordable;
  const buttonText = owned ? "Owned" : sandbox ? "Take" : affordable ? `Buy ${entry.price}` : `${entry.price} coins`;
  return `
    <div class="shopItem ${owned ? "owned" : ""}">
      <div class="shopItemMain">
        ${itemIconHtml(item)}
        <div class="shopItemText">
          <strong>${escapeHtml(item.name)}</strong>
          <span class="itemCategory">${escapeHtml(itemCategory(item))}</span>
          <span class="itemFamily">${escapeHtml(merchantItemMeta(item))}</span>
        </div>
      </div>
      ${itemEffectText(item) ? `<span class="itemEffect">${escapeHtml(itemEffectText(item))}</span>` : ""}
      <button data-buy="${item.id}" data-merchant="${merchant.id}" ${disabled ? "disabled" : ""}>${buttonText}</button>
    </div>
  `;
}

function renderSellItem(itemId) {
  const item = ITEMS[itemId];
  if (!item) return "";
  const value = itemSellValue(itemId);
  return `
    <div class="shopItem sellItem">
      <div class="shopItemMain">
        ${itemIconHtml(item)}
        <div class="shopItemText">
          <strong>${escapeHtml(item.name)}</strong>
          <span class="itemCategory">${escapeHtml(itemCategory(item))}</span>
          <span class="itemFamily">${escapeHtml(merchantItemMeta(item))}</span>
        </div>
      </div>
      ${itemEffectText(item) ? `<span class="itemEffect">${escapeHtml(itemEffectText(item))}</span>` : ""}
      <button data-sell="${item.id}">Sell ${value}</button>
    </div>
  `;
}

function openMerchant(merchant) {
  exitGamePointerLock();
  setGameChromeVisible(true);
  state.mode = "shop";
  playSfx("interact");
  const sellableItems = player.inventory.filter(canSellItem);
  const buyCount = merchant.stock.filter((entry) => ITEMS[entry.itemId]).length;
  setCard(`
    <div class="card shopCard">
      <div class="shopHeader">
        <div class="shopTitleBlock">
          <h2>${escapeHtml(merchant.label)}</h2>
          <span>${buyCount} buy slots / ${sellableItems.length} sellable</span>
        </div>
        <div class="merchantCoins">
          <span>${isSandboxRun() ? "Sandbox Coins" : "Coins"}</span>
          <strong>${isSandboxRun() ? "INF" : player.coins}</strong>
        </div>
      </div>
      <div class="merchantBoard">
        <section class="merchantPanel">
          <div class="merchantPanelHeader">
            <h3>Buy</h3>
            <span>${buyCount} stocked</span>
          </div>
          <div class="shopStockList">${renderMerchantStock(merchant)}</div>
        </section>
        <section class="merchantPanel sellPanel">
          <div class="merchantPanelHeader">
            <h3>Sell</h3>
            <span>${sellableItems.length} pack items</span>
          </div>
          <div class="shopGrid sellGrid">
            ${sellableItems.length ? sellableItems.map((itemId) => renderSellItem(itemId)).join("") : `<p class="shopEmpty">No sellable pack items.</p>`}
          </div>
        </section>
      </div>
      <div class="buttons">
        <button id="closeShopBtn">Close</button>
      </div>
    </div>
  `);
  document.getElementById("closeShopBtn").onclick = resumeGame;
  for (const button of ui.center.querySelectorAll("[data-buy]")) {
    button.onclick = () => buyMerchantItem(button.dataset.buy, merchant);
  }
  for (const button of ui.center.querySelectorAll("[data-sell]")) {
    button.onclick = () => sellMerchantItem(button.dataset.sell, merchant);
  }
}

function buyMerchantItem(itemId, merchant) {
  const item = ITEMS[itemId];
  const price = merchantPrice(itemId, merchant);
  const sandbox = isSandboxRun();
  if (!item || ownsItem(itemId)) {
    toast("Already yours.", 900);
    openMerchant(merchant);
    return;
  }
  if (player.coins < price) {
    toast("Not enough coins.", 900);
    openMerchant(merchant);
    return;
  }
  if (!sandbox) player.coins -= price;
  addItem(itemId, { markNew: true });
  playSfx("pickup");
  spawnItemPop(player.x, player.y - player.h * 0.76, item.design?.secondary ?? "#d6ad55");
  spawnFloater(sandbox ? "sandbox stock" : `-${price} coins`, player.x, player.y - player.h * 0.98, "#d6ad55");
  toast(`${item.name} added to pack.`, 1200);
  if (isCastleGateRoom()) captureCastleCheckpoint("buy");
  openMerchant(merchant);
}

function sellMerchantItem(itemId, merchant) {
  const item = ITEMS[itemId];
  if (!item || !hasItem(itemId) || !canSellItem(itemId)) {
    toast("That stays with you.", 900);
    openMerchant(merchant);
    return;
  }
  const value = itemSellValue(itemId);
  removeInventoryItem(itemId);
  player.newItems.delete(itemId);
  addCoins(value, player.x, player.y - player.h * 0.85);
  playSfx("pickup");
  spawnItemPop(player.x, player.y - player.h * 0.72, "#d6ad55");
  toast(`${item.name} sold.`, 1100);
  if (isCastleGateRoom()) captureCastleCheckpoint("sell");
  openMerchant(merchant);
}

function useExit(exit) {
  if (!exitIsOpen(exit)) {
    playSfx("hit");
    toast(exitBlockReason(exit), 1300);
    return;
  }
  playSfx("interact");
  const entrySide = exit.x < state.room.width * 0.5 ? "right" : "left";
  startDoorTransition(exit, entrySide);
}

function markRoomRespawnOnLeave(roomId) {
  const room = getRoom(roomId);
  if (!room || room.bossId || room.spawns.length === 0) return;
  state.roomClears.delete(roomId);
}

function exitBlockReason(exit) {
  if (exit.to === "swampGate" && state.flags.bossDefeated && !state.flags.postBossScrapRead) return "The journal scrap is still on the floor.";
  if (exit.requires === "journalFound") return "The corpse journal waits behind you.";
  if (exit.requires === "roomClear") return "The room is not done bleeding.";
  if (exit.requires === "bossDefeated") return "The huge crawler still holds the marsh gate.";
  if (exit.requires === "redWolfDefeated") return "The Red Wolf still owns the road.";
  return "Sealed.";
}

function exitIsOpen(exit) {
  if (exit.to === "swampGate" && state.flags.bossDefeated && !state.flags.postBossScrapRead) return false;
  if (!exit.requires) return true;
  if (exit.requires === "journalFound") return state.flags.journalFound;
  if (exit.requires === "roomClear") return state.roomClears.has(state.room.id);
  if (exit.requires === "bossDefeated") return state.flags.bossDefeated;
  if (exit.requires.endsWith?.("Defeated")) return Boolean(state.flags[exit.requires]);
  return false;
}

function usePromptLabel() {
  return isCoarsePointer() ? "USE" : "E";
}

function journalPromptLabel() {
  return isCoarsePointer() ? "BOOK" : "TAB";
}

function findPromptAction() {
  if (!state.room) return null;
  const useLabel = usePromptLabel();
  if (state.room.corpse && !state.flags.journalFound) {
    const corpse = state.room.corpse;
    const d = Math.hypot(player.x - corpse.x, player.y - corpse.y);
    if (d < INTERACT_HINT_RADIUS) {
      const canUse = d < INTERACT_USE_RADIUS;
      return {
        type: "corpse",
        canUse,
        x: corpse.x,
        y: corpse.y - 34,
        text: canUse ? `${useLabel} - take corpse journal` : "move closer - corpse journal"
      };
    }
  }
  for (const scrap of state.scraps) {
    if (scrap.dead) continue;
    const d = Math.hypot(player.x - scrap.x, player.y - scrap.y);
    if (d < INTERACT_HINT_RADIUS) {
      const canUse = d < INTERACT_USE_RADIUS;
      return {
        type: "scrap",
        scrap,
        canUse,
        x: scrap.x,
        y: scrap.y - 38,
        text: canUse ? `${useLabel} - read journal scrap` : "move closer - journal scrap"
      };
    }
  }
  for (const pickup of state.pickups) {
    if (pickup.dead) continue;
    const d = Math.hypot(player.x - pickup.x, player.y - pickup.y);
    if (d < INTERACT_HINT_RADIUS) {
      const canUse = d < INTERACT_USE_RADIUS;
      return {
        type: "pickup",
        pickup,
        canUse,
        x: pickup.x,
        y: pickup.y - 42,
        text: canUse ? `${useLabel} - take ${ITEMS[pickup.itemId].name}` : "move closer - " + ITEMS[pickup.itemId].name
      };
    }
  }
  for (const merchant of state.merchants) {
    const d = Math.hypot(player.x - merchant.x, player.y - (merchant.y - 48));
    if (d < INTERACT_HINT_RADIUS) {
      const canUse = d < INTERACT_USE_RADIUS;
      return {
        type: "merchant",
        merchant,
        canUse,
        x: merchant.x,
        y: merchant.y - 82,
        text: canUse ? `${useLabel} - shop ${merchant.promptName}` : `move closer - ${merchant.promptName}`
      };
    }
  }
  for (const chest of state.chests) {
    if (chest.opened) continue;
    if (chest.id === "starterChest" && !state.flags.journalFound) continue;
    const d = Math.hypot(player.x - chest.x, player.y - (chest.y - 38));
    if (d < INTERACT_HINT_RADIUS) {
      const canUse = d < INTERACT_USE_RADIUS;
      return {
        type: "chest",
        chest,
        canUse,
        x: chest.x,
        y: chest.y - 64,
        text: canUse ? `${useLabel} - open ${chest.promptName}` : `move closer - ${chest.promptName}`
      };
    }
  }
  if (state.room.ferry) {
    const ferry = state.room.ferry;
    const dockY = state.room.floorY - 42;
    const docks = [
      { side: "left", x: ferryDockX(ferry, "left") },
      { side: "right", x: ferryDockX(ferry, "right") }
    ];
    const dock = docks
      .map((candidate) => ({ ...candidate, d: Math.hypot(player.x - candidate.x, player.y - dockY) }))
      .sort((a, b) => a.d - b.d)[0];
    if (dock && dock.d < INTERACT_HINT_RADIUS) {
      const ticketKey = ferryTicketKey(state.room);
      const hasTicket = Boolean(state.flags[ticketKey]);
      const canAfford = isSandboxRun() || player.coins >= ferry.cost || hasTicket;
      const canUse = dock.d < INTERACT_USE_RADIUS && player.onGround && canAfford;
      const text = hasTicket
        ? (canUse ? `${useLabel} - ride ferry` : "move closer - ferry")
        : canAfford
          ? (canUse ? `${useLabel} - buy ticket ${ferry.cost}` : `move closer - ticket ${ferry.cost} coins`)
          : `ticket needs ${ferry.cost} coins`;
      return {
        type: "ferry",
        ferry,
        ticketKey,
        hasTicket,
        side: dock.side,
        canUse,
        x: dock.x,
        y: state.room.floorY - 86,
        text
      };
    }
  }
  for (const exit of state.room.exits) {
    const d = Math.abs(player.x - exit.x);
    if (d < EXIT_HINT_RADIUS) {
      const open = exitIsOpen(exit);
      const canUse = d < EXIT_USE_RADIUS && player.onGround;
      const text = open
        ? (canUse ? `${useLabel} - ${exit.label}` : `move closer - ${exit.label}`)
        : `${exit.label} sealed - ${exitBlockReason(exit)}`;
      return { type: "exit", exit, open, canUse, x: exit.x, y: state.room.floorY - 146, text };
    }
  }
  return null;
}

function attackMovementMultiplier(weapon = currentWeapon(), attack = player.attack) {
  if (!attack) return 1;
  const familyMultiplier = {
    dagger: 0.82,
    sword: 0.72,
    axe: 0.62,
    great: 0.52,
    spear: 0.68,
    dual: 0.76,
    punching: 0.78,
    bow: 0.58,
    crossbow: 0.5,
    wand: 0.62,
    scepter: 0.54
  }[weapon.family] ?? 0.68;
  const phaseBonus = attack.phase === "recover" ? 0.14 : attack.phase === "wind" ? 0.06 : 0;
  return clamp(familyMultiplier + phaseBonus, 0.42, 0.86);
}

function updateInput(dt) {
  const keyboardX =
    (keys.KeyD ? 1 : 0) -
    (keys.KeyA ? 1 : 0);
  const moveX = clamp(keyboardX + touch.moveX, -1, 1);
  player.moveX = moveX;
  if (Math.abs(moveX) > 0.1) state.opening.moved = true;
  if (moveX) {
    const nextFacing = sign(moveX);
    player.facing = nextFacing;
    if (!((mouse.active && mouse.aimIntent) || usingTouchAim())) {
      mouse.offsetX = player.facing * AIM_ORBIT_DISTANCE;
      mouse.offsetY = 0;
      clampMouseOffset();
    }
  }
  updateAim();

  if (consume("Space")) {
    state.opening.jumped = true;
    jump();
  }
  if (consume("KeyQ")) dodge();
  if (consume("KeyE")) interact();
  if (consume("Digit1") || consume("Numpad1")) switchWeaponSlot("weapon");
  if (consume("Digit2") || consume("Numpad2")) switchWeaponSlot("secondaryWeapon");
  if (consume("KeyR")) useClassAbility();
  if (consume("KeyF")) useLearnedAbilityByKey("F");
  if (consume("KeyT")) useLearnedAbilityByKey("T");
  if (consume("KeyG")) useLearnedAbilityByKey("G");

  if (touch.attackHeld && player.attackCooldown <= 0) queueAttack();
  if (player.attackBuffer > 0) {
    player.attackBuffer = Math.max(0, player.attackBuffer - dt);
    beginAttack();
  }

  const effects = equippedEffects();
  const swimming = playerInWater();
  const accel = swimming ? 0.12 : player.onGround ? 0.22 : effects.airControl ? 0.17 : 0.11;
  const attackSlow = player.attack && player.dodge <= 0
    ? attackMovementMultiplier(player.attack.weaponVisual ?? WEAPONS[player.attack.weaponId] ?? currentWeapon(), player.attack)
    : 1;
  const maxSpeed = player.dodge > 0 ? 620 : (swimming ? player.moveSpeed * 0.56 : player.moveSpeed) * attackSlow;
  if (player.dodge <= 0) {
    player.vx = lerp(player.vx, moveX * maxSpeed, accel);
  }
  if (!moveX && player.dodge <= 0 && player.onGround) {
    player.vx *= Math.pow(0.18, dt);
  }
}

function waterAtX(x, room = state.room) {
  return room?.water?.find((water) => x >= water.x && x <= water.x + water.w) ?? null;
}

function playerInWater() {
  const water = waterAtX(player.x);
  if (!water) return false;
  const bottom = player.y + player.h * 0.5;
  return bottom >= water.surfaceY;
}

function ferryTicketKey(room = state.room) {
  return `ferryTicket_${room?.id ?? state.roomId}`;
}

function ferryBoatSideKey(room = state.room) {
  return `ferryBoatRight_${room?.id ?? state.roomId}`;
}

function ferryBlockX(ferry) {
  return ferry.blockX ?? ferry.x + 145;
}

function ferryDockX(ferry, side) {
  if (side === "right") return ferry.dockRightX ?? ferry.boatEndX ?? ferry.x + 760;
  return ferry.dockLeftX ?? ferry.boatStartX ?? ferry.x;
}

function ferryBoatDockX(ferry, side) {
  if (side === "right") return ferry.boatEndX ?? ferryDockX(ferry, "right") - 28;
  return ferry.boatStartX ?? ferryDockX(ferry, "left") + 24;
}

function ferrySideForPlayer(ferry) {
  return player.x > ferryBlockX(ferry) ? "right" : "left";
}

function applyFerryBarrier(prevX) {
  const room = state.room;
  const ferry = room?.ferry;
  if (!ferry) return;
  const blockX = ferryBlockX(ferry);
  const halfW = player.w * 0.48;
  const leftLimit = blockX - halfW;
  const rightLimit = blockX + halfW;
  let blocked = false;
  if (prevX <= leftLimit && player.x > leftLimit) {
    player.x = leftLimit;
    player.vx = Math.min(0, player.vx);
    blocked = true;
  } else if (prevX >= rightLimit && player.x < rightLimit) {
    player.x = rightLimit;
    player.vx = Math.max(0, player.vx);
    blocked = true;
  }
  if (!blocked) return;
  if ((state.ferryBlockToastAt ?? -99) + 1.2 < state.time) {
    state.ferryBlockToastAt = state.time;
    const hasTicket = Boolean(state.flags[ferryTicketKey(room)]);
    toast(hasTicket ? "Board the ferry to cross the channel." : "The ferryman sells passage across.", 1200);
  }
  spawnMossDust(blockX, ferry.waterY ?? room.floorY - 42, 2);
}

function updateAim() {
  if (usingTouchAim()) {
    setAimVector(touch.aimX, touch.aimY);
    return;
  }
  if (mouse.active && mouse.aimIntent) {
    updateMouseWorldFromOffset();
    const dx = mouse.worldX - player.x;
    const dy = mouse.worldY - (player.y - 10);
    setAimVector(dx, dy);
    return;
  }
  setAimVector(player.facing, 0);
}

function updateOriginGauge(dt) {
  player.originGaugePulse = 0;
}

function updatePlayer(dt) {
  player.animTime += dt;
  player.hurt = Math.max(0, player.hurt - dt);
  player.land = Math.max(0, player.land - dt);
  if (player.onGround && Math.abs(player.vx) > 35 && player.dodge <= 0) {
    player.runTime += dt * clamp(Math.abs(player.vx) / 135, 0.6, 2.4);
  }
  player.stepDust = Math.max(0, player.stepDust - dt);
  player.attackCooldown = Math.max(0, player.attackCooldown - dt);
  player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
  player.abilityCooldown = Math.max(0, player.abilityCooldown - dt);
  player.abilityFlash = Math.max(0, player.abilityFlash - dt);
  updateOriginGauge(dt);
  for (const abilityId of Object.keys(player.extraAbilityCooldowns)) {
    player.extraAbilityCooldowns[abilityId] = Math.max(0, player.extraAbilityCooldowns[abilityId] - dt);
  }
  if (!player.attack && player.combo.timer > 0) {
    player.combo.timer = Math.max(0, player.combo.timer - dt);
    if (player.combo.timer <= 0) resetWeaponCombo();
  }
  player.buffs.attackSpeed = Math.max(0, player.buffs.attackSpeed - dt);
  player.buffs.clawCombo = Math.max(0, (player.buffs.clawCombo ?? 0) - dt);
  player.buffs.beastForm = Math.max(0, (player.buffs.beastForm ?? 0) - dt);
  player.classDamageReduction = Math.max(0, (player.classDamageReduction ?? 0) - dt);
  player.invuln = Math.max(0, player.invuln - dt);
  player.dodge = Math.max(0, player.dodge - dt);
  player.coyote = player.onGround ? 0.08 : Math.max(0, player.coyote - dt);
  const staminaRegen = (player.attack || player.dodge > 0 ? 16 : 38) + basicStaminaRegenBonus();
  player.st = clamp(player.st + staminaRegen * dt, 0, player.maxSt);
  applyEquipmentEffects(dt);

  updateAttack(dt);

  const wasOnGround = player.onGround;
  const water = waterAtX(player.x);
  const waterBottom = water ? water.surfaceY + water.depth : 0;
  const bottomBeforePhysics = player.y + player.h * 0.5;
  const swimming = Boolean(water && bottomBeforePhysics >= water.surfaceY);
  if (swimming) {
    const swimUp = keys.Space || touch.moveY < -0.35;
    const sinkLimit = bottomBeforePhysics > waterBottom - 10 ? -120 : 280;
    player.vy = clamp(player.vy + WORLD.gravity * 0.22 * dt - (swimUp ? 760 * dt : 0), -430, sinkLimit);
    player.vx *= Math.pow(0.84, dt * 60);
    if (Math.random() < 0.08) spawnMossDust(player.x + rand(-16, 16), water.surfaceY + rand(-3, 4), 1);
  } else {
    player.vy = clamp(player.vy + WORLD.gravity * dt, -1200, WORLD.maxFallSpeed);
  }
  const prevX = player.x;
  const prevBottom = player.y + player.h * 0.5;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.onGround = false;

  const room = state.room;
  player.x = clamp(player.x, 35, room.width - 35);
  applyFerryBarrier(prevX);

  const bottom = player.y + player.h * 0.5;
  if (bottom >= room.floorY) {
    player.y = room.floorY - player.h * 0.5;
    player.vy = 0;
    player.onGround = true;
  }

  for (const platform of room.platforms) {
    const withinX = player.x + player.w * 0.45 > platform.x && player.x - player.w * 0.45 < platform.x + platform.w;
    const crossed = prevBottom <= platform.y + 5 && bottom >= platform.y;
    if (withinX && crossed && player.vy >= 0) {
      player.y = platform.y - player.h * 0.5;
      player.vy = 0;
      player.onGround = true;
    }
  }

  const xBeforeClassAction = player.x;
  updateClassAction(dt);
  applyFerryBarrier(xBeforeClassAction);

  if (player.jumpBuffer > 0 && player.onGround) jump();

  if (player.onGround && Math.abs(player.vx) > 95 && player.dodge <= 0 && player.stepDust <= 0) {
    player.stepDust = 0.16;
    spawnDust(player.x - player.facing * 12, player.y + player.h * 0.5, 3);
  }
  if (!wasOnGround && player.onGround) {
    player.land = 0.12;
    playSfx("land");
    spawnDust(player.x, player.y + player.h * 0.5, 7);
    spawnMossDust(player.x, player.y + player.h * 0.5, 4);
    const effects = equippedEffects();
    if (effects.landingChip && player.vy >= 0) {
      const hitSet = new Set();
      const hits = hitPlayerOwnedTargets({
        hitSet,
        amount: effects.landingChip,
        direction: player.facing,
        options: {
          allowKnifeBreak: false,
          impactX: player.x,
          impactY: player.y + player.h * 0.42,
          angle: -Math.PI * 0.5,
          style: "landingChip",
          hitStyle: "stone"
        },
        intersects: (target) => Math.abs(target.x - player.x) < target.radius + 95 && Math.abs(target.y - player.y) < target.radius + 80
      });
      if (hits > 0) {
        spawnFloater("stone-wing", player.x, player.y - player.h * 0.78, "#a5a99b");
        spawnStoneChips(player.x, player.y + player.h * 0.5, player.facing, 10);
      }
    }
  }
  updatePlayerAnimation();
}

function updateClassAction(dt) {
  const action = player.classAction;
  if (!action) return;
  action.timer += dt;
  if (action.type === "ruinPounce") {
    player.classDamageReduction = Math.max(player.classDamageReduction ?? 0, 0.08);
    const drift = clamp((action.targetX - player.x) * 3.55, -860, 860);
    if (!action.landed && !player.onGround) {
      player.vx = lerp(player.vx, drift, 0.18);
      if (Math.random() < 0.62) spawnDashTrail(player.x - action.dir * 24, player.y + player.h * 0.02, action.dir, 2);
      if (Math.random() < 0.28) spawnClassAbilityAccent("frenzied", player.x - action.dir * 18, player.y - 18, action.dir > 0 ? Math.PI : 0, 2);
    }
    if (!action.landed && player.onGround && action.timer > 0.14) {
      action.landed = true;
      const startX = player.x;
      const endX = clamp(player.x + action.dir * (285 + progressionAbilityPowerBonus() * 4), 40, state.room.width - 40);
      hitPlayerOwnedTargets({
        hitSet: action.hit,
        amount: classAbilityDamage(34),
        direction: action.dir,
        options: { allowKnifeBreak: false, impactX: player.x, impactY: state.room.floorY - 22, angle: action.dir > 0 ? 0 : Math.PI, style: "ruinPounce", hitStyle: "groundCrack" },
        intersects: (target) => distanceToSegment(target.x, target.y, startX, state.room.floorY - 16, endX, state.room.floorY - 42) <= target.radius + 38
      });
      state.slashes.push({
        family: "great",
        trailStyle: "groundDrag",
        x: startX,
        y: state.room.floorY - 18,
        angle: action.dir > 0 ? 0 : Math.PI,
        reach: Math.abs(endX - startX),
        arc: 0.18,
        startAngle: action.dir > 0 ? -0.08 : Math.PI - 0.08,
        endAngle: action.dir > 0 ? 0.08 : Math.PI + 0.08,
        thickness: 34,
        life: 0.42,
        max: 0.42,
        color: "#ffb07a"
      });
      spawnStoneChips(player.x, state.room.floorY - 5, action.dir, 26);
      spawnDust(player.x, state.room.floorY - 2, 30);
      spawnPunchBurst(player.x, state.room.floorY - 42, -Math.PI * 0.5, "#c94c38", 34);
      spawnClassAbilityAccent("frenzied", player.x, state.room.floorY - 54, -Math.PI * 0.5, 24);
      state.camera.shake = Math.max(state.camera.shake, 0.42);
    }
    if (action.landed && action.timer > 0.56) player.classAction = null;
    if (action.timer > 1.45) player.classAction = null;
  }
}

function updateDashDamage(dt) {
  if (player.dodge <= 0 || state.mode !== "play") return;
  player.dodgeFxTimer = Math.max(0, (player.dodgeFxTimer ?? 0) - dt);
  if (player.dodgeFxTimer <= 0) {
    player.dodgeFxTimer = 0.035;
    if (bugChargeEquipped()) {
      spawnBugChargeTrail(player.x - player.facing * 20, player.y + player.h * 0.08, player.facing);
    } else {
      spawnDashTrail(player.x - player.facing * 20, player.y + player.h * 0.08, player.facing, 2);
    }
  }
  if (!bugChargeEquipped()) return;
  const centerX = player.x + player.facing * 18;
  const centerY = player.y + player.h * 0.02;
  const hitCount = hitPlayerOwnedTargets({
    hitSet: player.dodgeHitIds,
    amount: bugChargeDamage(),
    direction: player.facing,
    intersects: (target) => {
      const dx = Math.abs(target.x - centerX);
      const dy = Math.abs(target.y - centerY);
      return dx < target.radius + player.w * 0.65 + 24 && dy < target.radius + player.h * 0.35;
    },
    options: {
      style: "bugCharge",
      angle: player.facing > 0 ? 0 : Math.PI,
      impactX: centerX + player.facing * 18,
      impactY: centerY
    }
  });
  if (hitCount > 0) {
    state.camera.shake = Math.max(state.camera.shake, 0.1);
    spawnBugChargeBurst(centerX + player.facing * 22, centerY, player.facing, 12 + hitCount * 3);
  }
}

function updatePlayerAnimation() {
  if (player.hurt > 0) player.animState = "hurt";
  else if (player.attack) player.animState = "attack";
  else if (player.dodge > 0) player.animState = "roll";
  else if (!player.onGround && player.vy < -80) player.animState = "jump";
  else if (!player.onGround && player.vy > 80) player.animState = "fall";
  else if (player.land > 0) player.animState = "land";
  else if (Math.abs(player.vx) > 35) player.animState = "run";
  else player.animState = "idle";
}

function updateAttack(dt) {
  if (!player.attack) return;
  const attack = player.attack;
  const weapon = attack.weaponVisual ?? (attack.beast ? BEAST_FORM_WEAPON : (WEAPONS[attack.weaponId] ?? currentWeapon()));
  const profile = attack.profile ?? weaponAttackProfile(weapon);
  const comboStep = attack.comboStep ?? DEFAULT_COMBO_STEPS[0];
  attack.t += dt;
  attack.age += dt;
  if (attack.phase === "wind" && attack.t >= profile.wind) {
    attack.phase = "active";
    attack.t = 0;
    playWeaponSfx(weapon);
    if (weapon.mode === "projectile") {
      fireWeaponProjectile(weapon, attack, profile);
      attack.fired = true;
    } else {
      const reach = profile.reach;
      if (weapon.family === "punching") {
        spawnPunchBurst(
          player.x + attack.dx * (reach + 18),
          player.y - 12 + attack.dy * 18,
          attack.angle,
          weapon.color,
          comboStep.index === 2 ? 16 : 10
        );
        state.slashes.push({
          kind: comboStep.kind,
          family: weapon.family,
          comboIndex: comboStep.index,
          trailStyle: comboStep.trailStyle,
          finisher: comboStep.finisher,
          x: player.x,
          y: player.y - 10,
          angle: attack.angle,
          dx: attack.dx,
          dy: attack.dy,
          reach,
          arc: profile.visualArc ?? profile.arc,
          startAngle: attack.angle - 0.22 * attack.facing,
          endAngle: attack.angle + (comboStep.index === 2 ? -0.88 : 0.18) * attack.facing,
          thickness: weaponSwingThickness(weapon, comboStep),
          life: profile.active + 0.14,
          max: profile.active + 0.14,
          color: weapon.color
        });
      } else {
        const arc = profile.visualArc ?? profile.arc;
        state.slashes.push({
          kind: comboStep.kind,
          family: weapon.family,
          comboIndex: comboStep.index,
          trailStyle: comboStep.trailStyle,
          finisher: comboStep.finisher,
          x: player.x,
          y: player.y - 10,
          angle: attack.angle,
          dx: attack.dx,
          dy: attack.dy,
          reach,
          arc,
          startAngle: attack.angle + arc * (comboStep.sweepStart ?? -1) * attack.facing,
          endAngle: attack.angle + arc * (comboStep.sweepEnd ?? 1) * attack.facing,
          thickness: weaponSwingThickness(weapon, comboStep),
          life: profile.active + 0.16,
          max: profile.active + 0.16,
          color: weapon.color
        });
      }
    }
    state.camera.shake = Math.max(state.camera.shake, weaponAttackShake(weapon, comboStep));
    if (weapon.mode !== "projectile") hitEnemies(attack, profile);
  } else if (attack.phase === "active") {
    if (weapon.mode !== "projectile") hitEnemies(attack, profile);
    if (attack.t >= profile.active) {
      attack.phase = "recover";
      attack.t = 0;
    }
  } else if (attack.phase === "recover" && attack.t >= profile.recover) {
    player.attack = null;
    player.combo.timer = COMBO_RESET_TIME;
  }
}

function playerOwnedHitTargets() {
  const targets = [];
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    if (enemy.def.movement === "burrow" && enemy.burrowState !== "exposed") continue;
    targets.push({
      kind: "enemy",
      hitId: enemy.id,
      entity: enemy,
      x: enemy.x,
      y: enemy.y,
      radius: Math.max(enemy.def.width, enemy.def.height) * 0.5 + 14
    });
  }
  const boss = state.boss;
  if (boss && !boss.dead) {
    targets.push({
      kind: "boss",
      hitId: "boss",
      entity: boss,
      x: boss.x,
      y: boss.y,
      radius: boss.def.height * 0.58
    });
  }
  for (const dummy of state.dummies) {
    targets.push({
      kind: "dummy",
      hitId: dummy.id,
      entity: dummy,
      x: dummy.x,
      y: dummy.y,
      radius: Math.max(dummy.w, dummy.h) * 0.42 + 12
    });
  }
  return targets;
}

function applyPlayerOwnedHit(target, amount, direction, options = {}) {
  const adjustedAmount = playerDamageAmount(amount, options);
  if (target.kind === "enemy") hurtEnemy(target.entity, adjustedAmount, direction, options);
  else if (target.kind === "boss") hurtBoss(adjustedAmount, direction, options);
  else if (target.kind === "dummy") hurtTrainingDummy(target.entity, adjustedAmount, direction, options);
  if (options.forceBurn) applyBurnStatus(target, direction, options);
  else tryWeaponBurn(target, direction, options);
}

function applyBurnStatus(target, direction, options = {}) {
  const x = options.impactX ?? target.x;
  const y = options.impactY ?? target.y;
  const burnDamage = options.burnDamage ?? 1 + player.progression.evolutionTier;
  const duration = options.burnDuration ?? 2.35;
  const tickRate = options.burnTickRate ?? 0.46;
  const existing = state.burns.find((burn) => burn.kind === target.kind && burn.hitId === target.hitId);
  spawnSlashSparks(x, y, rand(-0.35, 0.35) + (direction < 0 ? Math.PI : 0), "#ffb72f", options.sparkCount ?? 8);
  spawnFloater(existing ? "burning" : "burn", x, y - 24, "#ffb72f");
  if (existing) {
    existing.duration = Math.max(existing.duration, duration);
    existing.life = Math.max(existing.life, existing.duration);
    existing.tick = Math.min(existing.tick, 0.08);
    existing.damage = Math.max(existing.damage, burnDamage);
    existing.direction = direction;
    existing.lastX = x;
    existing.lastY = y;
    return;
  }
  state.burns.push({
    kind: target.kind,
    hitId: target.hitId,
    entity: target.entity,
    direction,
    duration,
    life: duration,
    tick: 0.08,
    tickRate,
    damage: burnDamage,
    fx: 0.05,
    lastX: x,
    lastY: y
  });
}

function tryWeaponBurn(target, direction, options = {}) {
  const chance = progressionWeaponBurnChance();
  if (chance <= 0 || Math.random() > chance) return;
  if (["magic", "wand", "scepter", "bugCharge", "piercing", "cinderPulse"].includes(options.style)) return;
  applyBurnStatus(target, direction, options);
}

function hitPlayerOwnedTargets({ hitSet, amount, direction, intersects, options = {} }) {
  let hitCount = 0;
  for (const target of playerOwnedHitTargets()) {
    if (hitSet?.has(target.hitId)) continue;
    if (!intersects(target)) continue;
    hitSet?.add(target.hitId);
    applyPlayerOwnedHit(target, amount, direction, options);
    options.onHit?.(target);
    hitCount += 1;
  }
  return hitCount;
}

function hitEnemies(attack, weapon) {
  const reach = weapon.reach;
  const damage = weapon.lightDamage;
  const comboStep = attack.comboStep ?? DEFAULT_COMBO_STEPS[0];
  const metrics = playerRenderMetrics();
  const sweepSide = attack.facing ?? aimDirectionSide();
  const shoulderX = metrics.x + player.facing * 10 + metrics.lean;
  const shoulderY = metrics.torsoY + 10 - metrics.armSwing * 0.18;
  const gripLength = 27;
  const activeT = clamp(attack.t / weapon.active, 0, 1);
  const arc = weapon.arc;
  const sweepStart = attack.angle + arc * (comboStep.sweepStart ?? -1) * sweepSide;
  const sweepFullEnd = attack.angle + arc * (comboStep.sweepEnd ?? 1) * sweepSide;
  const sweepEnd = lerp(sweepStart, sweepFullEnd, activeT);
  const sampleCount = 6;
  const currentAngle = comboStep.kind === "jab" ? attack.angle : sweepEnd;
  const fluidDirection = sign(Math.cos(currentAngle) || sweepSide || player.facing);
  const thickness = weaponSwingThickness(weapon, comboStep);
  const targetInSwing = (cx, cy, radius) => {
    if (comboStep.kind === "jab") {
      const gripX = shoulderX + Math.cos(attack.angle) * gripLength;
      const gripY = shoulderY + Math.sin(attack.angle) * gripLength;
      const extension = reach * (0.48 + smoothStep(activeT) * 0.52);
      const x2 = gripX + Math.cos(attack.angle) * extension;
      const y2 = gripY + Math.sin(attack.angle) * extension;
      return distanceToSegment(cx, cy, gripX, gripY, x2, y2) < radius + thickness;
    }
    for (let i = 0; i < sampleCount; i += 1) {
      const t = sampleCount === 1 ? 1 : i / (sampleCount - 1);
      const angle = lerp(sweepStart, sweepEnd, t);
      const gripX = shoulderX + Math.cos(angle) * gripLength;
      const gripY = shoulderY + Math.sin(angle) * gripLength;
      const x2 = gripX + Math.cos(angle) * reach;
      const y2 = gripY + Math.sin(angle) * reach;
      if (distanceToSegment(cx, cy, gripX, gripY, x2, y2) < radius + Math.max(0, thickness - 10)) return true;
    }
    return false;
  };
  const hitCount = hitPlayerOwnedTargets({
    hitSet: attack.hit,
    amount: damage,
    direction: fluidDirection,
    options: {
      source: "weapon",
      style: weapon.id,
      hitStyle: comboStep.hitStyle ?? weapon.family,
      angle: currentAngle,
      impactX: player.x + Math.cos(currentAngle) * reach * 0.72,
      impactY: player.y - 12 + Math.sin(currentAngle) * reach * 0.42
    },
    intersects: (target) => targetInSwing(target.x, target.y, target.radius)
  });
  if (hitCount > 0 && player.classId === "frenzied") {
    player.abilityCooldown = Math.max(0, player.abilityCooldown - 0.22);
  }
}

function spawnProjectile({
  kind = "magic",
  x,
  y,
  angle,
  speed,
  damage,
  radius,
  color,
  life,
  hitsLeft = 1,
  sparkle = "#fff0b5",
  leech = false,
  mark = null,
  family = null,
  comboIndex = 0,
  hitStyle = null,
  visualPattern = null
}) {
  state.projectiles.push({
    id: `${kind}-${state.time}-${Math.random()}`,
    kind,
    family,
    comboIndex,
    hitStyle,
    visualPattern,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle,
    damage,
    radius,
    color,
    sparkle,
    life,
    max: life,
    trailClock: 0,
    hitsLeft,
    leech,
    mark,
    hit: new Set(),
    dead: false
  });
}

function spawnEnemyProjectile({
  kind = "arrow",
  x,
  y,
  angle,
  speed,
  damage,
  radius = 7,
  color = "#d8d0a4",
  sparkle = "#fff0b5",
  life = 1.4,
  spin = 0
}) {
  state.enemyProjectiles.push({
    id: `${kind}-${state.time}-${Math.random()}`,
    kind,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle,
    spin,
    damage,
    radius,
    color,
    sparkle,
    life,
    max: life,
    trailClock: 0,
    dead: false
  });
}

function fireWeaponProjectile(weapon, attack, profile) {
  const pose = getWeaponPose(weapon);
  const comboStep = attack.comboStep ?? DEFAULT_COMBO_STEPS[0];
  const kind = profile.projectileKind ?? weapon.projectileKind ?? "magic";
  let count = comboStep.projectileCount ?? 1;
  let spread = comboStep.projectileSpread ?? 0;
  if (comboStep.projectilePattern === "fork" && comboStep.index === 1) {
    count = Math.max(count, 3);
    spread = Math.max(spread, 0.18);
  } else if (comboStep.projectilePattern === "bloom" && comboStep.index === 2) {
    count = Math.max(count, 3);
    spread = Math.max(spread, 0.2);
  }
  for (let i = 0; i < count; i += 1) {
    const offset = count === 1 ? 0 : (i - (count - 1) * 0.5) * spread;
    const lane = count === 1 ? 0 : i - (count - 1) * 0.5;
    const angle = attack.angle + offset;
    const sideX = Math.cos(angle + Math.PI * 0.5);
    const sideY = Math.sin(angle + Math.PI * 0.5);
    const laneGap = weapon.family === "crossbow" ? 8 : weapon.family === "scepter" ? 12 : weapon.family === "wand" ? 6 : 4;
    const speedPulse = comboStep.projectilePattern === "heavyBolt" ? 0.88 : comboStep.projectilePattern === "wideFan" ? 0.96 + Math.abs(lane) * 0.04 : 1;
    spawnProjectile({
      kind,
      family: weapon.family,
      comboIndex: comboStep.index,
      hitStyle: comboStep.hitStyle,
      visualPattern: comboStep.projectilePattern,
      x: pose.x + Math.cos(angle) * 12 + sideX * lane * laneGap,
      y: pose.y + Math.sin(angle) * 12 + sideY * lane * laneGap,
      angle,
      speed: (profile.projectileSpeed ?? weapon.projectileSpeed ?? 560) * speedPulse,
      damage: profile.lightDamage,
      radius: (profile.projectileRadius ?? weapon.projectileRadius ?? 10) * (comboStep.projectilePattern === "bloom" ? 1.08 : 1),
      color: weapon.color,
      life: profile.reach / (profile.projectileSpeed ?? weapon.projectileSpeed ?? 560),
      hitsLeft: profile.projectilePierce ?? weapon.projectilePierce ?? 1,
      sparkle: projectileSparkleColor(kind)
    });
  }
  spawnSlashSparks(pose.x, pose.y, attack.angle, weapon.color, isPhysicalProjectileKind(kind) ? 5 + count : 8 + count);
  if (isMagicProjectileKind(kind)) spawnMagicBloom(pose.x, pose.y, weapon.color, comboStep.index === 2 ? (weapon.family === "scepter" ? 24 : 18) : 11);
  if (comboStep.finisher === "boltKick") spawnDust(player.x - (attack.facing ?? player.facing) * 12, player.y + player.h * 0.5, 5);
  spawnClassAbilityAccent(player.classId, pose.x, pose.y, attack.angle, isMagicProjectileKind(kind) ? 5 + count : 3 + count);
}

function spawnProjectileTrail(projectile) {
  const magic = isMagicProjectileKind(projectile.kind);
  const heavyMagic = projectile.kind === "scepter";
  const backX = projectile.x - Math.cos(projectile.angle) * rand(8, magic ? 30 : 22);
  const backY = projectile.y - Math.sin(projectile.angle) * rand(8, magic ? 30 : 22);
  pushParticle({
    kind: "spark",
    x: backX + rand(-3, 3),
    y: backY + rand(-3, 3),
    vx: -projectile.vx * (magic ? 0.055 : 0.035) + rand(-20, 20),
    vy: -projectile.vy * (magic ? 0.055 : 0.035) + rand(-20, 20),
    gravity: magic ? 80 : 120,
    life: rand(0.12, magic ? 0.28 : 0.2),
    max: magic ? 0.28 : 0.2,
    size: heavyMagic ? rand(5, 9) : magic ? rand(3, 7) : rand(2, 4),
    color: magic ? (Math.random() < 0.5 ? projectile.sparkle : projectile.color) : (Math.random() < 0.5 ? "#fff0b5" : projectile.color)
  });
}

function applyBloodMark(target, duration = 6) {
  target.entity.bloodMarkUntil = Math.max(target.entity.bloodMarkUntil ?? 0, state.time + duration);
  spawnFloater("blood mark", target.x, target.y - target.radius * 0.8, "#d9b7ff");
  spawnSlashSparks(target.x, target.y - 8, -Math.PI * 0.5, "#8e5bd8", 8);
}

function spawnLeechTrail(fromX, fromY, amount = 1, color = "#d9b7ff") {
  const toX = player.x;
  const toY = player.y - player.h * 0.48;
  const count = isCoarsePointer() ? 8 : Math.min(26, 10 + Math.ceil(amount * 1.7));
  for (let i = 0; i < count; i += 1) {
    const t = count <= 1 ? 0 : i / (count - 1);
    const x = lerp(fromX, toX, t) + rand(-12, 12);
    const y = lerp(fromY, toY, t) + rand(-10, 10);
    const angle = Math.atan2(toY - y, toX - x);
    const speed = rand(80, 210);
    pushParticle({
      kind: "leech",
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - rand(4, 32),
      gravity: 40,
      life: rand(0.22, 0.48),
      max: 0.48,
      size: rand(3, 8),
      alpha: 0.94,
      color: Math.random() < 0.42 ? "#8e1f38" : color
    });
  }
  spawnMagicBloom(toX, toY, color, isCoarsePointer() ? 6 : 12);
}

function healPlayerFrom(amount, fromX = player.x, fromY = player.y - player.h * 0.5, color = "#d9b7ff", label = "HP") {
  const healed = Math.min(player.maxHp - player.hp, Math.max(0, Math.round(amount)));
  spawnLeechTrail(fromX, fromY, Math.max(1, amount), color);
  if (healed <= 0) return 0;
  player.hp = clamp(player.hp + healed, 0, player.maxHp);
  spawnFloater(`+${healed} ${label}`, player.x, player.y - player.h * 0.92, color);
  return healed;
}

function targetBloodMarked(target) {
  return (target.entity?.bloodMarkUntil ?? 0) > state.time;
}

function clearBloodMark(target) {
  if (target.entity) target.entity.bloodMarkUntil = 0;
}

function updateProjectiles(dt) {
  for (const projectile of state.projectiles) {
    if (projectile.dead) continue;
    projectile.life -= dt;
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.trailClock -= dt;
    if (projectile.trailClock <= 0) {
      projectile.trailClock = isMagicProjectileKind(projectile.kind) ? 0.026 : 0.038;
      spawnProjectileTrail(projectile);
    }
    if (projectile.life <= 0 || projectile.x < 0 || projectile.x > state.room.width || projectile.y > state.room.floorY + 30) {
      projectile.dead = true;
      continue;
    }
    const direction = sign(projectile.vx || player.facing);
    const hits = hitPlayerOwnedTargets({
      hitSet: projectile.hit,
      amount: projectile.damage,
      direction,
      options: {
        allowKnifeBreak: false,
        impactX: projectile.x,
        impactY: projectile.y,
        angle: projectile.angle + Math.PI * 0.5,
        style: projectile.kind,
        hitStyle: projectile.hitStyle ?? projectile.kind,
        source: projectile.family && isPhysicalProjectileKind(projectile.kind) ? "weapon" : null,
        onHit: projectile.mark === "blood" ? (target) => applyBloodMark(target) : null
      },
      intersects: (target) => Math.hypot(projectile.x - target.x, projectile.y - target.y) <= projectile.radius + target.radius
    });
    if (hits > 0) {
      projectile.hitsLeft -= hits;
      if (projectile.leech) {
        healPlayerFrom(hits * (3 + Math.floor(progressionAbilityPowerBonus() * 0.15)), projectile.x, projectile.y, "#d9b7ff", "HP");
      }
      spawnSlashSparks(projectile.x, projectile.y, projectile.angle + Math.PI, projectile.sparkle, isMagicProjectileKind(projectile.kind) ? 9 : 5);
      if (projectile.hitsLeft <= 0) projectile.dead = true;
    }
  }
  state.projectiles = state.projectiles.filter((projectile) => !projectile.dead);
}

function updateEnemyProjectiles(dt) {
  for (const projectile of state.enemyProjectiles) {
    if (projectile.dead) continue;
    projectile.life -= dt;
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.angle += (projectile.spin ?? 0) * dt;
    projectile.trailClock -= dt;
    if (projectile.trailClock <= 0) {
      projectile.trailClock = projectile.kind === "wardenAxe" || projectile.kind === "stoneSpit" ? 0.03 : 0.045;
      state.particles.push({
        kind: "enemyProjectileTrail",
        x: projectile.x,
        y: projectile.y,
        vx: -projectile.vx * 0.035 + rand(-10, 10),
        vy: -projectile.vy * 0.035 + rand(-10, 10),
        gravity: 80,
        life: 0.16,
        max: 0.16,
        size: projectile.kind === "wardenAxe" ? 4 : projectile.kind === "stoneSpit" ? 3 : 2,
        color: projectile.sparkle,
        alpha: 0.7
      });
    }
    if (projectile.life <= 0 || projectile.x < 0 || projectile.x > state.room.width || projectile.y > state.room.floorY + 45) {
      projectile.dead = true;
      continue;
    }
    if (Math.hypot(projectile.x - player.x, projectile.y - (player.y - player.h * 0.12)) <= projectile.radius + player.w * 0.55) {
      projectile.dead = true;
      hurtPlayer(projectile.damage, projectile.x);
      spawnSlashSparks(projectile.x, projectile.y, projectile.angle + Math.PI, projectile.sparkle, projectile.kind === "wardenAxe" || projectile.kind === "stoneSpit" ? 9 : 5);
    }
  }
  state.enemyProjectiles = state.enemyProjectiles.filter((projectile) => !projectile.dead);
}

function abilityReady(ability) {
  return state.mode === "play" && abilityUnlocked() && player.abilityCooldown <= 0;
}

function useClassAbility() {
  if (state.mode !== "play" || cinematicLocksControls()) return;
  const klass = currentClass();
  const ability = klass.ability;
  if (!abilityUnlocked()) {
    toast(`${ability.name} wakes after the starter weapon.`, 1100);
    return;
  }
  if (!abilityReady(ability)) {
    toast(`${ability.name} is cooling down.`, 800);
    return;
  }
  const cooldown = abilityCooldownSeconds(ability);
  player.abilityCooldown = cooldown;
  player.abilityMaxCooldown = cooldown;
  player.abilityFlash = 0.42;
  playAbilitySfx(ability.id);
  spawnAbilityCastBurst(klass.id, abilityOrbLabel(ability));
  if (ability.id === "thornSpear") triggerThornSpear();
  else if (ability.id === "ruinPounce") triggerRuinPounce();
  else if (ability.id === "ambushCut") triggerAmbushCut();
}

function originHitMultiplier(full) {
  return full ? 1.28 : 0.72;
}

function classOriginDamage(amount, full = originAbilityIsFull()) {
  return Math.max(1, Math.round(classAbilityDamage(amount) * originHitMultiplier(full)));
}

function orderedTargetsAlongSegment(x1, y1, x2, y2, radius) {
  const length = Math.hypot(x2 - x1, y2 - y1) || 1;
  return playerOwnedHitTargets()
    .map((target) => {
      const projected = ((target.x - x1) * (x2 - x1) + (target.y - y1) * (y2 - y1)) / (length * length);
      const t = clamp(projected, 0, 1);
      const hit = distanceToSegment(target.x, target.y, x1, y1, x2, y2) <= target.radius + radius;
      return { target, t, hit };
    })
    .filter((entry) => entry.hit)
    .sort((a, b) => a.t - b.t)
    .map((entry) => entry.target);
}

function applyRootMemory(target, angle, full) {
  const pull = full ? 120 : 55;
  if (target.kind === "enemy") {
    target.entity.rooted = Math.max(target.entity.rooted ?? 0, full ? 1.2 : 0.72);
    target.entity.chaseTimer = Math.max(target.entity.chaseTimer ?? 0, 1.2);
    target.entity.vx -= Math.cos(angle) * pull;
    target.entity.vy -= Math.sin(angle) * pull * 0.45;
  } else if (target.kind === "boss") {
    target.entity.stun = Math.max(target.entity.stun ?? 0, full ? 0.34 : 0.16);
    target.entity.vx -= Math.cos(angle) * pull * 0.42;
  }
}

function triggerThornGrab(full) {
  const angle = player.aimAngle;
  const startX = player.x + player.aimX * 24;
  const startY = player.y - 17 + player.aimY * 12;
  const range = full ? 292 : 210;
  const endX = startX + Math.cos(angle) * range;
  const endY = startY + Math.sin(angle) * range;
  const targets = orderedTargetsAlongSegment(startX, startY, endX, endY, full ? 22 : 16);
  const hitSet = new Set();
  const maxHits = full ? 2 : 1;
  let hits = 0;
  for (const target of targets) {
    if (hits >= maxHits || hitSet.has(target.hitId)) continue;
    hitSet.add(target.hitId);
    applyPlayerOwnedHit(target, classOriginDamage(full ? 28 : 16, full), sign(Math.cos(angle) || player.facing), {
      allowKnifeBreak: false,
      impactX: target.x,
      impactY: target.y,
      angle,
      style: "thornGrab"
    });
    applyRootMemory(target, angle, full);
    hits += 1;
  }
  spawnSlashSparks(startX, startY, angle, "#ffd879", full ? 18 : 11);
  spawnClassAbilityAccent("rootbound", startX, startY, angle, isCoarsePointer() ? 10 : 16);
  for (let i = 0; i < (full ? 16 : 10); i += 1) {
    const t = i / Math.max(1, (full ? 15 : 9));
    const x = lerp(startX, endX, t);
    const y = lerp(startY, endY, t);
    pushParticle({
      kind: "thornLine",
      x: x + rand(-4, 4),
      y: y + rand(-4, 4),
      vx: rand(-12, 12),
      vy: rand(-18, 10),
      gravity: 40,
      life: rand(0.18, 0.34),
      max: 0.34,
      size: full ? rand(3, 6) : rand(2, 4),
      color: Math.random() < 0.55 ? "#9ba95f" : "#ffd879",
      alpha: 0.9
    });
  }
  state.camera.shake = Math.max(state.camera.shake, full ? 0.14 : 0.07);
  toast(hits ? (full ? "Thorn pulls." : "Thorn roots.") : "Thorn misses.", 850);
}

function triggerGroundSlamJump(full) {
  const angle = player.aimAngle;
  const dir = sign(Math.cos(angle) || player.facing);
  const centerX = player.x + Math.cos(angle) * (full ? 104 : 72);
  const centerY = state.room.floorY - 30 + Math.sin(angle) * 20;
  const radius = full ? 138 : 88;
  player.vx = Math.cos(angle) * (full ? 620 : 460);
  player.vy = Math.min(player.vy, -Math.abs(Math.sin(angle)) * 220 - (full ? 270 : 190));
  player.dodge = Math.max(player.dodge, full ? 0.18 : 0.12);
  player.invuln = Math.max(player.invuln, full ? 0.24 : 0.14);
  const hitSet = new Set();
  const hitCount = hitPlayerOwnedTargets({
    hitSet,
    amount: classOriginDamage(full ? 30 : 17, full),
    direction: dir,
    options: { allowKnifeBreak: false, impactX: centerX, impactY: centerY, angle: -Math.PI * 0.5, style: "groundSlamJump" },
    intersects: (target) => Math.hypot(target.x - centerX, target.y - centerY) <= target.radius + radius
  });
  spawnDust(centerX, state.room.floorY - 2, full ? 22 : 14);
  spawnStoneChips(centerX, state.room.floorY - 7, dir, full ? 14 : 8);
  spawnPunchBurst(centerX, centerY, angle, "#c94c38", full ? 22 : 13);
  spawnClassAbilityAccent("frenzied", centerX, centerY, -Math.PI * 0.5, isCoarsePointer() ? 11 : 18);
  state.roars.push({
    x: centerX,
    y: centerY,
    facing: dir,
    life: full ? 0.42 : 0.3,
    max: full ? 0.42 : 0.3,
    radius
  });
  state.camera.shake = Math.max(state.camera.shake, full ? 0.34 : 0.2);
  toast(hitCount ? (full ? "Frenzy lands." : "Slam lands.") : "Slam.", 850);
}

function triggerUnstableBlast(full) {
  const angle = player.aimAngle;
  const startX = player.x + player.aimX * 28;
  const startY = player.y - 16 + player.aimY * 14;
  const count = full ? 3 : 1;
  for (let i = 0; i < count; i += 1) {
    const offset = count === 1 ? 0 : (i - 1) * 0.11;
    spawnProjectile({
      kind: "hollow",
      x: startX + Math.cos(angle + offset) * 7,
      y: startY + Math.sin(angle + offset) * 5,
      angle: angle + offset,
      speed: full ? 650 : 560,
      damage: classOriginDamage(full ? 18 : 15, full),
      radius: full ? 18 : 13,
      color: "#8e5bd8",
      sparkle: "#d9b7ff",
      life: full ? 0.95 : 0.78,
      hitsLeft: full ? 2 : 1,
      leech: full
    });
  }
  spawnMagicBloom(startX, startY, "#8e5bd8", full ? 23 : 14);
  spawnClassAbilityAccent("hollow", startX, startY, angle, isCoarsePointer() ? 10 : 16);
  state.camera.shake = Math.max(state.camera.shake, full ? 0.14 : 0.08);
  toast(full ? "Blood answers." : "Unstable Blast.", 850);
}

function aimedFloorX(distance = 260) {
  return clamp(player.x + player.aimX * distance, 55, state.room.width - 55);
}

function closestAbilityTarget(range = 420, maxPerp = 190, filter = null) {
  const aimed = closestTargetToAim(range, maxPerp, filter);
  if (aimed) return aimed;
  let best = null;
  for (const target of playerOwnedHitTargets()) {
    if (filter && !filter(target)) continue;
    const dx = target.x - player.x;
    const dy = target.y - (player.y - 12);
    const distance = Math.hypot(dx, dy);
    if (distance > range + target.radius) continue;
    const forwardBonus = Math.max(0, (dx * player.aimX + dy * player.aimY) / Math.max(1, distance));
    const targetPenalty = target.kind === "dummy" ? 65 : target.kind === "boss" ? -35 : 0;
    const score = distance - forwardBonus * 85 + targetPenalty;
    if (!best || score < best.score) best = { target, score };
  }
  return best?.target ?? null;
}

function autoAimFloorX(distance = 280, range = 440, maxPerp = 210) {
  const target = closestAbilityTarget(range, maxPerp);
  return {
    target,
    x: target ? clamp(target.x, 55, state.room.width - 55) : aimedFloorX(distance)
  };
}

function closestTargetToAim(range = 320, maxPerp = 130, filter = null) {
  const startX = player.x;
  const startY = player.y - 12;
  const endX = startX + player.aimX * range;
  const endY = startY + player.aimY * range;
  let best = null;
  for (const target of playerOwnedHitTargets()) {
    if (filter && !filter(target)) continue;
    const dx = target.x - startX;
    const dy = target.y - startY;
    const forward = dx * player.aimX + dy * player.aimY;
    if (forward < -20 || forward > range) continue;
    const perp = distanceToSegment(target.x, target.y, startX, startY, endX, endY);
    if (perp > target.radius + maxPerp) continue;
    const score = forward + perp * 1.65;
    if (!best || score < best.score) best = { target, score };
  }
  return best?.target ?? null;
}

function spawnPlayerHazard(hazard) {
  state.hazards.push({
    owner: "player",
    hit: new Set(),
    tick: 0,
    age: 0,
    ...hazard
  });
}

function triggerThornSpear() {
  const target = closestTargetToAim(420, 100);
  const x = target ? target.x : aimedFloorX(330);
  const width = 32 + progressionAbilityPowerBonus() * 1.5;
  const height = 310;
  spawnPlayerHazard({
    type: "thornSpear",
    x,
    y: state.room.floorY,
    w: width,
    h: height,
    life: 0.42,
    max: 0.42,
    damage: classAbilityDamage(34),
    rootDuration: 1.05,
    hitOnce: true,
    color: "#9ba95f",
    glow: "#ffd879"
  });
  spawnClassAbilityAccent("rootbound", x, state.room.floorY - 34, -Math.PI * 0.5, isCoarsePointer() ? 12 : 20);
  spawnDust(x, state.room.floorY - 2, 10);
  state.camera.shake = Math.max(state.camera.shake, 0.18);
  toast(target ? "Thorn Spear roots." : "Thorn Spear erupts.", 850);
}

function triggerRuinPounce() {
  const aimDir = Math.abs(player.aimX) > 0.12 ? sign(player.aimX) : player.facing;
  const targetX = clamp(player.x + aimDir * 520, 55, state.room.width - 55);
  const dir = sign(targetX - player.x || aimDir || player.facing);
  player.classAction = {
    type: "ruinPounce",
    targetX,
    dir,
    timer: 0,
    landed: false,
    hit: new Set()
  };
  player.classDamageReduction = Math.max(player.classDamageReduction ?? 0, 0.72);
  player.facing = dir;
  player.vx = dir * 720;
  player.vy = -900;
  player.onGround = false;
  player.land = 0;
  spawnClassAbilityAccent("frenzied", player.x, player.y - 18, dir > 0 ? Math.PI : 0, 24);
  spawnDust(player.x, state.room.floorY - 2, 14);
  toast("Long Ruin Pounce.", 750);
}

function triggerAmbushCut() {
  const target = closestTargetToAim(420, 150);
  const startX = player.x;
  const startY = player.y - 12;
  let endX = clamp(player.x + player.facing * 112, 40, state.room.width - 40);
  let endY = startY;
  let damage = classAbilityDamage(22);
  let hitRadius = 30;
  const direction = target ? sign(target.x - player.x || player.facing) : player.facing;
  if (target) {
    endX = clamp(target.x - direction * (target.radius + 26), 40, state.room.width - 40);
    endY = clamp(target.y, state.room.floorY - 220, state.room.floorY - player.h * 0.5);
    damage = classAbilityDamage(38);
    hitRadius = 68;
  }
  player.x = endX;
  player.y = Math.min(player.y, endY);
  player.vx = direction * 160;
  player.facing = direction;
  player.invuln = Math.max(player.invuln, 0.18);
  const hitSet = new Set();
  const hits = hitPlayerOwnedTargets({
    hitSet,
    amount: damage,
    direction,
    options: {
      allowKnifeBreak: false,
      impactX: target?.x ?? endX,
      impactY: target?.y ?? endY,
      angle: direction > 0 ? 0 : Math.PI,
      style: "ambushCut",
      hitStyle: "hollowBackstab",
      onHit: (hitTarget) => {
        healPlayerFrom(target ? 5 : 2, hitTarget.x, hitTarget.y - hitTarget.radius * 0.35, "#d9b7ff", "HP");
        applyBloodMark(hitTarget, 4);
      }
    },
    intersects: (hitTarget) => {
      if (target && hitTarget.hitId === target.hitId) return true;
      return distanceToSegment(hitTarget.x, hitTarget.y, startX, startY, endX, endY) <= hitTarget.radius + hitRadius;
    }
  });
  state.slashes.push({
    family: "dagger",
    trailStyle: "hollowCut",
    x: (startX + endX) * 0.5,
    y: (startY + endY) * 0.5,
    angle: Math.atan2(endY - startY, endX - startX),
    reach: Math.max(90, Math.hypot(endX - startX, endY - startY)),
    arc: 0.4,
    startAngle: Math.atan2(endY - startY, endX - startX) - 0.12,
    endAngle: Math.atan2(endY - startY, endX - startX) + 0.12,
    thickness: 18,
    life: 0.22,
    max: 0.22,
    color: "#d9b7ff"
  });
  spawnClassAbilityAccent("hollow", startX, startY, direction > 0 ? 0 : Math.PI, 12);
  spawnClassAbilityAccent("hollow", endX, endY, direction > 0 ? 0 : Math.PI, 18);
  state.camera.shake = Math.max(state.camera.shake, hits ? 0.16 : 0.08);
  toast(target ? "Ambush Cut." : "Cut dash.", 750);
}

function learnedAbilityCooldownSeconds(ability) {
  return abilityCooldownSeconds(ability);
}

function learnedAbilityReady(ability) {
  return (
    state.mode === "play" &&
    player.progression.unlocked &&
    player.progression.learnedAbilities?.includes(ability.id) &&
    ability.classId === player.classId &&
    (player.extraAbilityCooldowns[ability.id] ?? 0) <= 0
  );
}

function useLearnedAbilityByKey(key) {
  if (state.mode !== "play" || cinematicLocksControls()) return;
  const ability = learnedAbilityByKey(key);
  if (!ability) {
    toast(`No ability on ${key} yet.`, 900);
    return;
  }
  if (ability.classId !== player.classId) {
    toast(`${ability.name} belongs to another class.`, 1000);
    return;
  }
  const cooldown = player.extraAbilityCooldowns[ability.id] ?? 0;
  if (!learnedAbilityReady(ability)) {
    toast(cooldown > 0 ? `${ability.name} is cooling down.` : `${ability.name} is not ready.`, 800);
    return;
  }
  player.extraAbilityCooldowns[ability.id] = learnedAbilityCooldownSeconds(ability);
  player.abilityFlash = 0.32;
  playAbilitySfx(ability.id);
  spawnAbilityCastBurst(ability.classId, `${key} ${ability.label}`);
  if (ability.id === "briarPatch") triggerBriarPatch();
  else if (ability.id === "oldTreeRise") triggerOldTreeRise();
  else if (ability.id === "wolfSpirit") triggerWolfSpirit();
  else if (ability.id === "clawCombo") triggerClawCombo();
  else if (ability.id === "beastUppercut") triggerBeastUppercut();
  else if (ability.id === "beastForm") triggerBeastForm();
  else if (ability.id === "bloodNeedle") triggerBloodNeedle();
  else if (ability.id === "markCut") triggerMarkCut();
  else if (ability.id === "blackMaw") triggerBlackMaw();
}

function triggerBriarPatch() {
  const { target, x } = autoAimFloorX(260, 460, 230);
  spawnPlayerHazard({
    type: "briarPatch",
    x,
    y: state.room.floorY,
    radius: 104 + progressionAbilityPowerBonus() * 2,
    life: 4.1,
    max: 4.1,
    tick: 0.12,
    tickRate: 0.42,
    damage: classAbilityDamage(6),
    rootDuration: 0.18,
    color: "#86a653",
    glow: "#ffd879"
  });
  spawnClassAbilityAccent("rootbound", x, state.room.floorY - 20, -Math.PI * 0.5, 16);
  toast(target ? "Briar Patch locks on." : "Briar Patch.", 750);
}

function triggerOldTreeRise() {
  const { target, x } = autoAimFloorX(310, 520, 260);
  const treeHeight = 360 + progressionAbilityPowerBonus() * 5;
  const treeRadius = 186 + progressionAbilityPowerBonus() * 3;
  spawnPlayerHazard({
    type: "oldTreeRise",
    x,
    y: state.room.floorY,
    radius: treeRadius,
    treeHeight,
    trunkWidth: 74,
    canopyRadius: 152,
    life: 1.65,
    max: 1.65,
    delay: 0.58,
    damage: classAbilityDamage(58),
    rootDuration: 0.82,
    heal: 14 + Math.floor(progressionAbilityPowerBonus() * 0.45),
    hitOnce: true,
    color: "#9ba95f",
    glow: "#fff0b5"
  });
  spawnDust(x, state.room.floorY - 2, 13);
  spawnClassAbilityAccent("rootbound", x, state.room.floorY - 44, -Math.PI * 0.5, 18);
  spawnFloater(target ? "great tree locks on" : "great tree", x, state.room.floorY - 106, "#fff0b5");
}

function triggerWolfSpirit() {
  const angle = player.aimAngle;
  state.summons.push({
    kind: "allyWolf",
    x: player.x + Math.cos(angle) * 42,
    y: state.room.floorY - 34,
    angle,
    age: 0,
    life: 8,
    max: 8,
    speed: 0,
    hp: 55,
    biteCooldown: 0.22,
    color: "#86a653",
    glow: "#ffd879",
    scale: 1.08
  });
  spawnClassAbilityAccent("rootbound", player.x, player.y - 20, angle, 18);
  spawnFloater("wolf spirit", player.x, player.y - player.h, "#ffd879");
}

function triggerClawCombo() {
  player.buffs.clawCombo = Math.max(player.buffs.clawCombo ?? 0, 6.5);
  resetWeaponCombo();
  spawnPunchBurst(player.x + player.facing * 34, player.y - 12, player.facing > 0 ? 0 : Math.PI, "#ffd879", 18);
  spawnSlashSparks(player.x + player.facing * 42, player.y - 20, player.facing > 0 ? 0 : Math.PI, "#ffd879", 14);
  spawnFloater("FAST CLAWS", player.x, player.y - player.h, "#ffd879");
}

function triggerBeastUppercut() {
  const dir = player.facing;
  const centerX = player.x + dir * 48;
  const centerY = player.y - 24;
  const hitSet = new Set();
  const hits = hitPlayerOwnedTargets({
    hitSet,
    amount: classAbilityDamage(36),
    direction: dir,
    options: {
      allowKnifeBreak: false,
      impactX: centerX,
      impactY: centerY,
      angle: -Math.PI * 0.5,
      style: "beastUppercut",
      hitStyle: "uppercut",
      onHit: (target) => {
        if (target.kind === "enemy") target.entity.vy = Math.min(target.entity.vy ?? 0, -470);
        if (target.kind === "boss") target.entity.stun = Math.max(target.entity.stun ?? 0, 0.24);
      }
    },
    intersects: (target) => {
      const forward = (target.x - player.x) * dir;
      return forward > -8 && forward < 96 + target.radius && Math.abs(target.y - centerY) < target.radius + 82;
    }
  });
  state.slashes.push({
    family: "punching",
    comboIndex: 2,
    trailStyle: "beastUppercut",
    x: player.x + dir * 10,
    y: player.y - 2,
    angle: -Math.PI * 0.5,
    dx: dir,
    dy: -1,
    reach: 142,
    arc: 0.5,
    startAngle: -Math.PI * 0.64,
    endAngle: -Math.PI * 0.36,
    thickness: 28,
    life: 0.32,
    max: 0.32,
    color: "#ff5f4a"
  });
  state.roars.push({
    x: centerX - dir * 20,
    y: centerY + 12,
    facing: dir,
    life: 0.28,
    max: 0.28,
    radius: 108
  });
  spawnPunchBurst(centerX, centerY, -Math.PI * 0.5, "#ffb07a", hits ? 24 : 16);
  spawnClassAbilityAccent("frenzied", centerX, centerY + 10, -Math.PI * 0.5, hits ? 30 : 22);
  spawnStoneChips(centerX, state.room.floorY - 4, dir, hits ? 18 : 12);
  spawnDust(centerX - dir * 18, state.room.floorY - 2, hits ? 16 : 10);
  spawnFloater(hits ? "UPPERCUT" : "uppercut", centerX, centerY - 70, "#ffb07a");
  state.camera.shake = Math.max(state.camera.shake, hits ? 0.28 : 0.16);
}

function triggerBeastForm() {
  player.buffs.beastForm = Math.max(player.buffs.beastForm ?? 0, 6);
  player.buffs.clawCombo = 0;
  player.classDamageReduction = Math.max(player.classDamageReduction ?? 0, 1.2);
  resetWeaponCombo();
  spawnClassAbilityAccent("frenzied", player.x, player.y - 22, -Math.PI * 0.5, 42);
  spawnPunchBurst(player.x, player.y - 26, -Math.PI * 0.5, "#ff5f4a", 34);
  spawnStoneChips(player.x, state.room.floorY - 5, player.facing, 16);
  spawnFloater("BEAST FORM", player.x, player.y - player.h * 1.08, "#ffb07a");
  state.camera.shake = Math.max(state.camera.shake, 0.22);
}

function triggerBloodNeedle() {
  const angle = player.aimAngle;
  const startX = player.x + player.aimX * 30;
  const startY = player.y - 16 + player.aimY * 12;
  spawnProjectile({
    kind: "hollow",
    x: startX,
    y: startY,
    angle,
    speed: 760,
    damage: classAbilityDamage(18),
    radius: 10,
    color: "#8e5bd8",
    sparkle: "#d9b7ff",
    life: 0.86,
    hitsLeft: 1,
    mark: "blood"
  });
  spawnMagicBloom(startX, startY, "#8e5bd8", 12);
}

function triggerMarkCut() {
  const marked = closestTargetToAim(520, 210, targetBloodMarked);
  const angle = player.aimAngle;
  const dir = marked ? sign(marked.x - player.x || player.facing) : sign(Math.cos(angle) || player.facing);
  const startX = player.x;
  const startY = player.y - 10;
  const endX = marked ? clamp(marked.x - dir * 26, 40, state.room.width - 40) : clamp(player.x + Math.cos(angle) * 220, 40, state.room.width - 40);
  const endY = marked ? Math.min(player.y, marked.y) : startY + Math.sin(angle) * 45;
  player.x = endX;
  player.vx = dir * 240;
  player.facing = dir;
  player.invuln = Math.max(player.invuln, 0.22);
  const hitSet = new Set();
  const hits = hitPlayerOwnedTargets({
    hitSet,
    amount: classAbilityDamage(marked ? 44 : 18),
    direction: dir,
    options: {
      allowKnifeBreak: false,
      impactX: marked?.x ?? endX,
      impactY: marked?.y ?? endY,
      angle: dir > 0 ? 0 : Math.PI,
      style: "markCut",
      hitStyle: "markPop",
      onHit: (target) => {
        if (targetBloodMarked(target)) {
          clearBloodMark(target);
          spawnMagicBloom(target.x, target.y - 8, "#d9b7ff", 22);
          healPlayerFrom(4 + Math.floor(progressionAbilityPowerBonus() * 0.12), target.x, target.y - 8, "#d9b7ff", "HP");
          applyPlayerOwnedHit(target, classAbilityDamage(20), dir, { allowKnifeBreak: false, impactX: target.x, impactY: target.y, style: "markPop" });
        }
      }
    },
    intersects: (target) => marked ? target.hitId === marked.hitId : distanceToSegment(target.x, target.y, startX, startY, endX, endY) <= target.radius + 32
  });
  state.slashes.push({
    family: "dagger",
    trailStyle: "hollowCut",
    x: (startX + endX) * 0.5,
    y: (startY + endY) * 0.5,
    angle: Math.atan2(endY - startY, endX - startX),
    reach: Math.max(120, Math.hypot(endX - startX, endY - startY)),
    arc: 0.2,
    startAngle: Math.atan2(endY - startY, endX - startX) - 0.08,
    endAngle: Math.atan2(endY - startY, endX - startX) + 0.08,
    thickness: 16,
    life: 0.2,
    max: 0.2,
    color: "#d9b7ff"
  });
  state.camera.shake = Math.max(state.camera.shake, hits ? 0.14 : 0.07);
}

function triggerBlackMaw() {
  const target = closestAbilityTarget(560, 260);
  const x = target ? clamp(target.x, 65, state.room.width - 65) : aimedFloorX(320);
  const y = target
    ? clamp(target.y - target.radius * 0.12, state.room.floorY - 245, state.room.floorY - 76)
    : state.room.floorY - 104 + player.aimY * 34;
  spawnPlayerHazard({
    type: "blackMaw",
    x,
    y,
    radius: 150 + progressionAbilityPowerBonus() * 3,
    life: 4.2,
    max: 4.2,
    tick: 0.2,
    tickRate: 0.48,
    damage: classAbilityDamage(8),
    finalDamage: classAbilityDamage(34),
    color: "#352542",
    glow: "#d9b7ff"
  });
  spawnMagicBloom(x, y, "#352542", 26);
  spawnLeechTrail(x, y, 3, "#8e5bd8");
  spawnFloater(target ? "maw locks on" : "black maw", x, y - 70, "#d9b7ff");
}

function spawnRootMemorySummon(kind, x, y, angle, options = {}) {
  const life = options.life ?? 0.48;
  state.summons.push({
    kind,
    x,
    y,
    angle,
    age: 0,
    life,
    max: life,
    speed: options.speed ?? 0,
    color: options.color ?? "#9ba95f",
    glow: options.glow ?? "#ffd879",
    scale: options.scale ?? 1
  });
}

function triggerThornSplit() {
  const base = player.aimAngle;
  spawnRootMemorySummon("thorn", player.x + Math.cos(base) * 54, player.y - 20 + Math.sin(base) * 18, base, { life: 0.42, speed: 110, color: "#9ba95f", glow: "#fff0b5" });
  for (let i = -1; i <= 1; i += 1) {
    const angle = base + i * 0.16;
    spawnProjectile({
      kind: "magic",
      x: player.x + Math.cos(angle) * 28,
      y: player.y - 16 + Math.sin(angle) * 12,
      angle,
      speed: 650,
      damage: classAbilityDamage(12),
      radius: 10,
      color: "#9ba95f",
      sparkle: "#ffd879",
      life: 0.72,
      hitsLeft: 1
    });
  }
  spawnClassAbilityAccent("rootbound", player.x + player.aimX * 28, player.y - 16, base, 14);
}

function triggerWolfOath() {
  const angle = player.aimAngle;
  const centerX = player.x + Math.cos(angle) * 72;
  const centerY = player.y - 18 + Math.sin(angle) * 28;
  const hitSet = new Set();
  spawnRootMemorySummon("wolf", player.x + Math.cos(angle) * 34, player.y - 18 + Math.sin(angle) * 10, angle, { life: 0.52, speed: 215, color: "#86a653", glow: "#fff0b5", scale: 1.05 });
  hitPlayerOwnedTargets({
    hitSet,
    amount: classAbilityDamage(18),
    direction: sign(Math.cos(angle) || player.facing),
    options: { allowKnifeBreak: false, impactX: centerX, impactY: centerY, angle, style: "wolfOath" },
    intersects: (target) => distanceToSegment(target.x, target.y, player.x, player.y - 12, centerX, centerY) <= target.radius + 42
  });
  spawnPunchBurst(centerX, centerY, angle, "#9ba95f", 16);
  spawnFloater("wolf oath", centerX, centerY - 38, "#ffd879");
}

function triggerStagCall() {
  const angle = player.aimAngle;
  const endX = player.x + Math.cos(angle) * 190;
  const endY = player.y - 8 + Math.sin(angle) * 50;
  const hitSet = new Set();
  spawnRootMemorySummon("stag", player.x + Math.cos(angle) * 46, player.y - 20 + Math.sin(angle) * 12, angle, { life: 0.62, speed: 280, color: "#9ba95f", glow: "#d6ad55", scale: 1.2 });
  hitPlayerOwnedTargets({
    hitSet,
    amount: classAbilityDamage(22),
    direction: sign(Math.cos(angle) || player.facing),
    options: { allowKnifeBreak: false, impactX: endX, impactY: endY, angle, style: "stagCall" },
    intersects: (target) => distanceToSegment(target.x, target.y, player.x, player.y - 12, endX, endY) <= target.radius + 34
  });
  spawnStoneChips(endX, state.room.floorY - 8, sign(Math.cos(angle) || player.facing), 9);
  spawnClassAbilityAccent("rootbound", endX, endY, angle, 16);
}

function triggerBeastSwipe() {
  const angle = player.aimAngle;
  const centerX = player.x + Math.cos(angle) * 62;
  const centerY = player.y - 14 + Math.sin(angle) * 22;
  const hitSet = new Set();
  const hits = hitPlayerOwnedTargets({
    hitSet,
    amount: classAbilityDamage(18),
    direction: sign(Math.cos(angle) || player.facing),
    options: { allowKnifeBreak: false, impactX: centerX, impactY: centerY, angle, style: "beastSwipe" },
    intersects: (target) => Math.hypot(target.x - centerX, target.y - centerY) <= target.radius + 78
  });
  spawnPunchBurst(centerX, centerY, angle, "#c94c38", hits ? 18 : 12);
}

function triggerMammothRush() {
  const angle = player.aimAngle;
  const dir = sign(Math.cos(angle) || player.facing);
  const startX = player.x;
  const endX = clamp(player.x + dir * 155, 45, state.room.width - 45);
  player.vx = dir * 720;
  player.dodge = Math.max(player.dodge, 0.18);
  player.invuln = Math.max(player.invuln, 0.22);
  const hitSet = new Set();
  hitPlayerOwnedTargets({
    hitSet,
    amount: classAbilityDamage(24),
    direction: dir,
    options: { allowKnifeBreak: false, impactX: endX, impactY: player.y - 10, angle, style: "mammothRush" },
    intersects: (target) => distanceToSegment(target.x, target.y, startX, player.y - 6, endX, player.y - 6) <= target.radius + 46
  });
  spawnStoneChips(startX + dir * 78, state.room.floorY - 5, dir, 13);
  spawnClassAbilityAccent("frenzied", startX + dir * 72, player.y - 12, angle, 16);
}

function triggerRageHide() {
  player.invuln = Math.max(player.invuln, 0.46);
  player.buffs.attackSpeed = Math.max(player.buffs.attackSpeed, 1.8);
  player.progression.rageHideTimer = 4.5;
  spawnClassAbilityAccent("frenzied", player.x, player.y - 18, -Math.PI * 0.5, 20);
  spawnFloater("rage hide", player.x, player.y - player.h * 0.9, "#ffb07a");
}

function triggerBloodTether() {
  const angle = player.aimAngle;
  const startX = player.x + player.aimX * 22;
  const startY = player.y - 17;
  const endX = startX + Math.cos(angle) * 260;
  const endY = startY + Math.sin(angle) * 90;
  const hitSet = new Set();
  const hits = hitPlayerOwnedTargets({
    hitSet,
    amount: classAbilityDamage(17),
    direction: sign(Math.cos(angle) || player.facing),
    options: { allowKnifeBreak: false, impactX: endX, impactY: endY, angle, style: "bloodTether" },
    intersects: (target) => distanceToSegment(target.x, target.y, startX, startY, endX, endY) <= target.radius + 20
  });
  if (hits > 0) {
    healPlayerFrom(hits * 5, endX, endY, "#d9b7ff", "HP");
  }
  spawnSlashSparks(startX, startY, angle, "#d9b7ff", 15);
  spawnClassAbilityAccent("hollow", startX, startY, angle, 16);
}

function triggerGraveImp() {
  const angle = player.aimAngle;
  const centerX = player.x + Math.cos(angle) * 84;
  const centerY = player.y - 14 + Math.sin(angle) * 28;
  const hitSet = new Set();
  hitPlayerOwnedTargets({
    hitSet,
    amount: classAbilityDamage(14),
    direction: sign(Math.cos(angle) || player.facing),
    options: { allowKnifeBreak: false, impactX: centerX, impactY: centerY, angle, style: "graveImp", forceBurn: true, burnDamage: 2, burnDuration: 1.6 },
    intersects: (target) => Math.hypot(target.x - centerX, target.y - centerY) <= target.radius + 82
  });
  spawnMagicBloom(centerX, centerY, "#5b4d75", 18);
  spawnFloater("grave imp", centerX, centerY - 42, "#d9b7ff");
}

function triggerHollowBlink() {
  const angle = player.aimAngle;
  const startX = player.x;
  const startY = player.y - 8;
  const endX = clamp(player.x + Math.cos(angle) * 132, 35, state.room.width - 35);
  const endY = startY + Math.sin(angle) * 22;
  const hitSet = new Set();
  player.x = endX;
  player.invuln = Math.max(player.invuln, 0.32);
  player.vx = Math.cos(angle) * 180;
  hitPlayerOwnedTargets({
    hitSet,
    amount: classAbilityDamage(15),
    direction: sign(Math.cos(angle) || player.facing),
    options: { allowKnifeBreak: false, impactX: endX, impactY: endY, angle, style: "hollowBlink" },
    intersects: (target) => distanceToSegment(target.x, target.y, startX, startY, endX, endY) <= target.radius + 26
  });
  spawnClassAbilityAccent("hollow", startX, startY, angle + Math.PI, 10);
  spawnClassAbilityAccent("hollow", endX, endY, angle, 14);
}

function triggerSecondShout() {
  const hitSet = new Set();
  const radius = 112 + progressionAbilityPowerBonus() * 2;
  const centerX = player.x + player.facing * 48;
  const centerY = player.y - 18;
  const hitCount = hitPlayerOwnedTargets({
    hitSet,
    amount: classAbilityDamage(10),
    direction: player.facing,
    options: { allowKnifeBreak: false, impactX: centerX, impactY: centerY, style: "secondShout" },
    intersects: (target) => {
      const dx = target.x - player.x;
      const dy = target.y - centerY;
      return dx * player.facing > -10 && Math.hypot(dx, dy) <= radius + target.radius;
    }
  });
  player.buffs.attackSpeed = Math.max(player.buffs.attackSpeed, 1.1);
  state.roars.push({
    x: player.x + player.facing * 18,
    y: player.y - 20,
    facing: player.facing,
    life: 0.36,
    max: 0.36,
    radius
  });
  state.camera.shake = Math.max(state.camera.shake, 0.11);
  spawnDust(player.x + player.facing * 18, state.room.floorY - 2, isCoarsePointer() ? 7 : 12);
  spawnClassAbilityAccent("brawler", centerX, centerY, player.facing > 0 ? 0 : Math.PI, isCoarsePointer() ? 9 : 14);
  toast(hitCount ? "Second Shout lands." : "Second Shout.", 800);
}

function triggerShoulderCheck() {
  const direction = player.facing;
  const startX = player.x;
  const centerY = player.y - 8;
  player.invuln = Math.max(player.invuln, 0.2);
  player.vx = direction * 690;
  player.dodge = Math.max(player.dodge, 0.13);
  player.dodgeHitIds = new Set();
  const hitSet = new Set();
  const hitCount = hitPlayerOwnedTargets({
    hitSet,
    amount: classAbilityDamage(18),
    direction,
    options: { allowKnifeBreak: false, impactX: startX + direction * 88, impactY: centerY, angle: direction > 0 ? 0 : Math.PI, style: "shoulderCheck" },
    intersects: (target) => {
      const forward = (target.x - startX) * direction;
      const dy = Math.abs(target.y - centerY);
      return forward > -8 && forward < 154 + target.radius && dy < target.radius + 42;
    }
  });
  state.camera.shake = Math.max(state.camera.shake, 0.13);
  spawnStoneChips(startX + direction * 58, state.room.floorY - 4, direction, isCoarsePointer() ? 7 : 12);
  spawnClassAbilityAccent("brawler", startX + direction * 74, centerY, direction > 0 ? 0 : Math.PI, isCoarsePointer() ? 8 : 13);
  spawnFloater(hitCount ? "check" : "rush", startX + direction * 72, player.y - player.h * 0.58, "#ffd84d");
}

function triggerMarkedShot() {
  const angle = player.aimAngle;
  const startX = player.x + player.aimX * 32;
  const startY = player.y - 14 + player.aimY * 16;
  spawnProjectile({
    kind: "piercing",
    x: startX,
    y: startY,
    angle,
    speed: 980,
    damage: classAbilityDamage(34),
    radius: 13,
    color: "#fff0b5",
    sparkle: "#d8ecb2",
    life: 0.86,
    hitsLeft: 5
  });
  state.camera.shake = Math.max(state.camera.shake, 0.07);
  spawnPiercingLaunchFlash(startX, startY, angle);
  spawnFloater("marked", startX + player.aimX * 44, startY - 18, "#fff0b5");
}

function triggerBlinkFeint() {
  const angle = player.aimAngle;
  const startX = player.x;
  const startY = player.y - 8;
  const step = 118;
  const endX = clamp(player.x + Math.cos(angle) * step, 35, state.room.width - 35);
  const endY = startY + Math.sin(angle) * 20;
  const hitSet = new Set();
  player.x = endX;
  player.invuln = Math.max(player.invuln, 0.3);
  player.vx = Math.cos(angle) * 180;
  const hitCount = hitPlayerOwnedTargets({
    hitSet,
    amount: classAbilityDamage(14),
    direction: sign(Math.cos(angle) || player.facing),
    options: { allowKnifeBreak: false, impactX: endX, impactY: endY, angle, style: "blinkFeint" },
    intersects: (target) => distanceToSegment(target.x, target.y, startX, startY, endX, endY) <= target.radius + 24
  });
  state.camera.shake = Math.max(state.camera.shake, 0.08);
  spawnClassAbilityAccent("elf", startX, startY, angle + Math.PI, isCoarsePointer() ? 6 : 10);
  spawnClassAbilityAccent("elf", endX, endY, angle, isCoarsePointer() ? 9 : 15);
  spawnSlashSparks((startX + endX) * 0.5, (startY + endY) * 0.5, angle, "#d8ecb2", isCoarsePointer() ? 7 : 12);
  spawnFloater(hitCount ? "feint cut" : "feint", endX, player.y - player.h * 0.7, "#d8ecb2");
}

function triggerCinderPulse() {
  const hitSet = new Set();
  const radius = 126 + progressionAbilityPowerBonus();
  const centerX = player.x;
  const centerY = player.y - 18;
  const hitCount = hitPlayerOwnedTargets({
    hitSet,
    amount: classAbilityDamage(12),
    direction: player.facing,
    options: {
      allowKnifeBreak: false,
      impactX: centerX,
      impactY: centerY,
      angle: -Math.PI * 0.5,
      style: "cinderPulse",
      forceBurn: true,
      burnDamage: 2 + player.progression.evolutionTier,
      burnDuration: 2.7,
      burnTickRate: 0.42,
      sparkCount: isCoarsePointer() ? 7 : 12
    },
    intersects: (target) => Math.hypot(target.x - centerX, target.y - centerY) <= radius + target.radius
  });
  state.camera.shake = Math.max(state.camera.shake, 0.1);
  spawnMagicBloom(centerX, centerY, "#ffb72f", isCoarsePointer() ? 15 : 24);
  spawnClassAbilityAccent("apprentice", centerX, centerY, -Math.PI * 0.5, isCoarsePointer() ? 10 : 16);
  spawnDust(centerX, state.room.floorY - 2, isCoarsePointer() ? 8 : 14);
  toast(hitCount ? "Cinder catches." : "Cinder Pulse.", 900);
}

function hurtEnemy(enemy, amount, direction, options = {}) {
  let finalAmount = amount;
  if (enemy.def.id === "castleKnight") {
    const hitFront = direction === -enemy.patrolDir;
    if (hitFront && enemy.attackWind <= 0 && (enemy.castleStrike ?? 0) <= 0) {
      finalAmount = Math.max(1, Math.ceil(finalAmount * 0.3));
      spawnFloater("blocked", enemy.x, enemy.y - 48, "#d6ad55");
      spawnSlashSparks(enemy.x - enemy.patrolDir * 18, enemy.y - 20, enemy.patrolDir > 0 ? 0 : Math.PI, "#d6ad55", 9);
    }
  }
  enemy.hp -= finalAmount;
  enemy.hurt = 0.12;
  enemy.vx += direction * 140;
  const fluid = FLUIDS[enemy.def.fluid];
  playLimitedSfx("hit");
  state.hitPause = Math.max(state.hitPause, 0.035);
  state.camera.shake = Math.max(state.camera.shake, 0.085);
  const sparkAngle = options.angle ?? player.aimAngle + Math.PI * 0.5;
  const impactX = options.impactX ?? enemy.x - direction * 6;
  const impactY = options.impactY ?? enemy.y - 6;
  spawnFluid(impactX, impactY, fluid, 14, direction);
  spawnHitBurst(impactX, impactY, sparkAngle, fluid.secondary, options.hitStyle ?? options.style ?? player.weaponId, finalAmount >= 20 ? 16 : 10);
  spawnStoneChips(impactX, impactY, direction, finalAmount >= 20 ? 5 : 3);
  spawnFloater(Math.round(finalAmount), enemy.x, enemy.y - 36, fluid.secondary);
  if (options.source === "weapon") {
    const weapon = currentWeapon();
    const heavyFamily = weapon.family === "great" || weapon.family === "axe";
    if (heavyFamily || finalAmount >= 32) {
      enemy.attackRecover = Math.max(enemy.attackRecover ?? 0, heavyFamily ? 0.34 : 0.18);
      enemy.vx += direction * (heavyFamily ? 120 : 70);
      spawnStoneChips(impactX, impactY, direction, heavyFamily ? 6 : 3);
      if (heavyFamily && Math.random() < 0.35) spawnFloater("stagger", enemy.x, enemy.y - 56, "#d6ad55");
    }
  }
  if (enemy.hp <= 0) killEnemy(enemy, direction);
}

function killEnemy(enemy, direction) {
  if (enemy.dead) return;
  enemy.dead = true;
  const fluid = FLUIDS[enemy.def.fluid];
  playSfx("kill");
  if (enemy.def.id === "gargoyle") {
    spawnStoneChips(enemy.x, enemy.y, direction, isCoarsePointer() ? 14 : 24);
    spawnMossDust(enemy.x, enemy.y + enemy.def.height * 0.38, isCoarsePointer() ? 8 : 13);
    spawnFloater("crumbled", enemy.x, enemy.y - 44, fluid.secondary);
  } else {
    spawnFluid(enemy.x, enemy.y, fluid, 28, direction);
    spawnEnemyDeathBurst(enemy.x, enemy.y - enemy.def.height * 0.18, fluid, direction);
    spawnMossDust(enemy.x, enemyGroundY(enemy), 8);
    addStain(enemy.x, enemyGroundY(enemy) + 2, fluid, 36);
    spawnFloater("gone", enemy.x, enemy.y - 44, fluid.secondary);
  }
  if (!isChallengeRun()) {
    const coinRange = ENEMY_COIN_VALUE[enemy.def.id] ?? [3, 6];
    addCoins(Math.round(rand(coinRange[0], coinRange[1])), enemy.x, enemy.y - 78);
    if (player.progression.unlocked) {
      const xp = ENEMY_XP[enemy.def.id] ?? 6;
      gainXp(xp);
      spawnFloater(`+${xp} xp`, enemy.x, enemy.y - 62, "#fff0b5");
    }
  } else {
    spawnFloater("challenge", enemy.x, enemy.y - 62, "#d6ad55");
  }
  gainOriginGauge((originGaugeData().killGain ?? 12) * (1 + (player.progression?.originGaugeGainBonus || 0)), enemy.x, enemy.y - 52);
  if (!isChallengeRun()) rollMobDrop(enemy, direction);
}

function rollMobDrop(enemy, direction = 1) {
  const table = MOB_DROP_TABLE[enemy.def.id];
  const drops = Array.isArray(table) ? table : table ? [table] : [];
  for (const drop of drops) {
    if (!drop || Math.random() > drop.chance || ownsItem(drop.itemId) || pickupExists(drop.itemId)) continue;
    const airborne = enemy.def.movement === "flying";
    const restY = state.room.floorY - 24;
    spawnPickup(drop.itemId, clamp(enemy.x, 90, state.room.width - 90), restY, {
      y: airborne ? enemy.y : Math.min(enemy.y, enemyGroundY(enemy) - 48),
      vx: direction * rand(70, 145) + rand(-35, 35),
      vy: airborne ? rand(-210, -120) : rand(-330, -230),
      fromDrop: true
    });
    const item = ITEMS[drop.itemId];
    spawnItemPop(enemy.x, enemy.y - 18, item?.design?.secondary ?? "#d6ad55");
    spawnFloater(item?.name ?? "drop", enemy.x, enemy.y - 62, item?.design?.secondary ?? "#d6ad55");
  }
}

function hurtBoss(amount, direction, options = {}) {
  const boss = state.boss;
  if (!boss || boss.dead) return;
  boss.hp = Math.max(0, boss.hp - amount);
  boss.hurt = 0.14;
  boss.vx += direction * 90;
  const fluid = FLUIDS[boss.def.fluid];
  playLimitedSfx("hit");
  state.hitPause = Math.max(state.hitPause, 0.05);
  state.camera.shake = Math.max(state.camera.shake, 0.13);
  const impactX = options.impactX ?? player.x + direction * 70;
  const impactY = options.impactY ?? boss.y;
  const sparkAngle = options.angle ?? player.aimAngle + Math.PI * 0.5;
  spawnFluid(impactX, impactY, fluid, 18, direction);
  spawnHitBurst(impactX, impactY - 12, sparkAngle, fluid.secondary, options.hitStyle ?? options.style ?? player.weaponId, amount >= 20 ? 20 : 14);
  spawnStoneChips(impactX, impactY - 8, direction, amount >= 20 ? 7 : 4);
  spawnFloater(Math.round(amount), boss.x, boss.y - boss.def.height * 0.7, fluid.secondary);
  if (options.source === "weapon") {
    const weapon = currentWeapon();
    if (weapon.family === "great" || weapon.family === "axe") {
      boss.stun = Math.max(boss.stun ?? 0, weapon.family === "great" ? 0.08 : 0.05);
      state.camera.shake = Math.max(state.camera.shake, 0.18);
    }
  }

  if (!state.flags.knifeBroken && player.weaponId === "huntingKnife" && options.allowKnifeBreak !== false && boss.hp / boss.maxHp <= boss.def.knifeBreakAt) {
    triggerKnifeBreak();
  }
  if (boss.hp <= 0) killBoss();
}

function hurtTrainingDummy(dummy, amount, direction, options = {}) {
  dummy.hurt = 0.14;
  dummy.hits.push({ t: state.time, amount });
  if (dummy.hits.length > 48) dummy.hits.splice(0, dummy.hits.length - 48);
  state.hitPause = Math.max(state.hitPause, 0.025);
  state.camera.shake = Math.max(state.camera.shake, 0.055);
  const sparkAngle = options.angle ?? player.aimAngle + Math.PI * 0.5;
  if (state.dummyHitSfxCooldown <= 0) {
    playLimitedSfx("hit", "dummyHitSfxCooldown", 0.055);
  }
  spawnHitBurst(options.impactX ?? dummy.x - direction * 8, options.impactY ?? dummy.y - 10, sparkAngle, "#d6ad55", options.hitStyle ?? options.style ?? player.weaponId, amount >= 20 ? 16 : 12);
  spawnSlashSparks(options.impactX ?? dummy.x - direction * 8, options.impactY ?? dummy.y - 10, sparkAngle, "#8a603a", 3);
  spawnFloater(Math.round(amount), dummy.x, dummy.y - 54, "#fff0b5");
}

function triggerKnifeBreak() {
  state.flags.knifeBroken = true;
  replaceInventoryItem("huntingKnife", "brokenKnife");
  equipItem("brokenKnife");
  state.boss.stun = 2.6;
  state.boss.attack = null;
  state.boss.attackCooldown = 2.8;
  state.camera.shake = 0.55;
  playSfx("knifeBreak");
  spawnFluid(player.x + player.facing * 32, player.y - 8, FLUIDS.oldBlood, 20, player.facing);
  spawnKnifeShardBurst(player.x + player.facing * 36, player.y - 12, player.facing);
  spawnStarterWeaponReward(player.x + player.facing * 90, {
    y: state.room.floorY - 80,
    vx: player.facing * 120,
    vy: -330
  });
  addNote("My knife broke against the huge root.");
  toast(`The knife snaps. ${starterWeaponName()} drops.`, 1800);
}

function killBoss() {
  const boss = state.boss;
  if (!boss || boss.dead) return;
  boss.dead = true;
  const bossId = boss.def.id;
  markBossDefeated(bossId);
  state.roomClears.add(state.room.id);
  const fluid = FLUIDS[boss.def.fluid];
  const compactFx = isCoarsePointer();
  playSfx("kill");
  playSfx("bossVictory");
  state.hitPause = Math.max(state.hitPause, 0.14);
  state.camera.shake = Math.max(state.camera.shake, 0.75);
  for (let i = 0; i < (compactFx ? 5 : 7); i += 1) {
    spawnFluid(boss.x + rand(-80, 80), boss.y + rand(-40, 40), fluid, compactFx ? 18 : 22, rand(-1, 1));
  }
  for (let i = 0; i < (compactFx ? 3 : 5); i += 1) spawnMossDust(boss.x + rand(-95, 95), state.room.floorY, compactFx ? 5 : 7);
  spawnBossDefeatBurst(boss.x, boss.y, fluid);
  if (!isChallengeRun()) addCoins(bossId === "ironWarden" ? 220 : bossId === "redWolf" ? 110 : 55, boss.x, boss.y - 96);
  addStain(boss.x, state.room.floorY + 2, fluid, 100);
  if (bossId === "ironWarden") {
    state.flags.ironWardenDefeated = true;
    if (!state.flags.ironWardenRewardsClaimed && !isChallengeRun()) {
      state.flags.ironWardenRewardsClaimed = true;
      spawnPickup("wardenGreatmace", clamp(boss.x - 56, 120, state.room.width - 120), state.room.floorY - 24, {
        y: state.room.floorY - 90,
        vx: -120,
        vy: -330
      });
      spawnPickup("royalCrest", clamp(boss.x + 56, 120, state.room.width - 120), state.room.floorY - 24, {
        y: state.room.floorY - 92,
        vx: 120,
        vy: -340
      });
    }
    addNote("The Iron Warden broke. The Royal Crest still burns in the dust.");
    toast("The Warden falls. Castle Gate stock changes.", 2400);
    startBossDefeatCinematic(boss.x, boss.y, "THE IRON WARDEN FELL", "the keep oath breaks");
    state.flags.demoComplete = true;
    setTimeout(() => {
      if (state.roomId === "ironWardenArena" && state.mode === "play") showDemoComplete();
    }, 1700);
  } else if (bossId === "redWolf") {
    state.flags.redWolfDefeated = true;
    addNote("The Red Wolf scattered into marsh light. The castle road opened.");
    toast("The Red Wolf falls. Castle Gate is ahead.", 2400);
    startBossDefeatCinematic(boss.x, boss.y, "THE RED WOLF BROKE", "a memory clears the marsh");
  } else {
    addNote("The huge root collapsed and left a torn page behind.");
    spawnStarterWeaponReward(boss.x + 72, {
      y: state.room.floorY - 92,
      vx: 135,
      vy: -340
    });
    spawnJournalScrap(boss.x - 70, state.room.floorY - 24);
    toast("A torn journal scrap lands near the roots.", 2200);
    startBossDefeatCinematic(boss.x, boss.y);
  }
  startGameMusic();
  state.boss = null;
}

function hurtPlayer(amount, sourceX = player.x) {
  if (player.invuln > 0 || state.mode !== "play") return;
  const effects = equippedEffects();
  const hitFromFront = sign(sourceX - player.x || player.facing) === player.facing;
  let finalAmount = (player.classDamageReduction ?? 0) > 0 ? Math.max(1, Math.ceil(amount * 0.55)) : amount;
  if (effects.shieldHabit && hitFromFront && (player.shieldHabitCooldown ?? 0) <= 0) {
    finalAmount = Math.max(1, Math.ceil(finalAmount * 0.58));
    player.shieldHabitCooldown = 2.6;
    spawnFloater("guard", player.x, player.y - player.h * 0.82, "#d6ad55");
    spawnSlashSparks(player.x + player.facing * 18, player.y - 12, player.facing > 0 ? 0 : Math.PI, "#d6ad55", 8);
  }
  player.hp = Math.max(0, player.hp - finalAmount);
  player.invuln = 0.58;
  player.hurt = 0.22;
  const direction = sign(player.x - sourceX || player.facing);
  player.vx += direction * 230;
  player.vy = Math.min(player.vy, -220);
  playSfx("hit");
  spawnFluid(player.x, player.y, FLUIDS.playerBlood, 18, direction);
  state.camera.shake = Math.max(state.camera.shake, 0.22);
  if (player.hp > 0 && effects.spikeRetort && (player.spikeRetortCooldown ?? 0) <= 0) {
    player.spikeRetortCooldown = 1.8;
    const hitSet = new Set();
    const damage = effects.spikeRetort;
    const hits = hitPlayerOwnedTargets({
      hitSet,
      amount: damage,
      direction,
      options: {
        allowKnifeBreak: false,
        impactX: player.x + direction * 22,
        impactY: player.y - 8,
        angle: direction > 0 ? 0 : Math.PI,
        style: "spikeRetort",
        hitStyle: "spikeRetort"
      },
      intersects: (target) => Math.abs(target.x - player.x) < target.radius + 90 && Math.abs(target.y - player.y) < target.radius + 75
    });
    if (hits > 0) {
      spawnFloater("retort", player.x, player.y - player.h * 0.92, "#c1b27d");
      spawnStoneChips(player.x + direction * 22, player.y - 8, direction, 9);
    }
  }
  if (player.hp <= 0) {
    if (shouldUseCastleCheckpointOnDeath() && restoreCastleCheckpointAfterDeath()) return;
    exitGamePointerLock();
    stopGameMusic();
    playSfx("kill");
    state.mode = "dead";
    setCard(`
      <div class="card">
        <h2>The Journal Shuts</h2>
        <p>${isChallengeRun() ? "Challenge mode is over." : "Wake again from the title."}</p>
        <div class="buttons">
          <button id="retryBtn">Title</button>
        </div>
      </div>
    `);
    document.getElementById("retryBtn").onclick = mainMenu;
  }
}

function beginWalkerLeap(enemy) {
  const def = enemy.def;
  const dir = sign(enemy.lastSeenX - enemy.x || enemy.patrolDir);
  enemy.patrolDir = dir;
  enemy.lungeDuration = def.leapDuration ?? 0.33;
  enemy.lungeTime = enemy.lungeDuration;
  enemy.leapStartX = enemy.x;
  enemy.leapTargetX = clamp(enemy.x + dir * (def.leapDistance ?? 96), enemy.patrolMin, enemy.patrolMax);
  enemy.vx = dir * ((def.leapDistance ?? 96) / Math.max(0.08, enemy.lungeDuration));
  enemy.contactCooldown = 0;
  enemy.leapLift = 0;
  state.camera.shake = Math.max(state.camera.shake, 0.045);
  playLimitedSfx("attack", "enemyLungeSfxCooldown", 0.22);
  spawnMossDust(enemy.x + dir * 12, state.room.floorY - 2, isCoarsePointer() ? 3 : 6);
}

function updateWalkerEnemy(enemy, dt, distance, verticalDistance) {
  const def = enemy.def;
  if (enemy.lungeTime > 0) {
    enemy.lungeTime = Math.max(0, enemy.lungeTime - dt);
    const t = 1 - enemy.lungeTime / Math.max(0.001, enemy.lungeDuration || def.leapDuration || 0.33);
    enemy.leapLift = Math.sin(clamp(t, 0, 1) * Math.PI) * 24;
    enemy.x = lerp(enemy.leapStartX ?? enemy.x, enemy.leapTargetX ?? enemy.x, clamp(t, 0, 1));
    enemy.vx = 0;
    if (enemy.lungeTime <= 0) {
      enemy.leapLift = 0;
      enemy.attackRecover = def.attackRecover;
      enemy.vx = enemy.patrolDir * 20;
      spawnDust(enemy.x, state.room.floorY - 2, isCoarsePointer() ? 4 : 7);
    }
    return;
  }

  if (enemy.attackWind > 0) {
    enemy.attackWind -= dt;
    enemy.vx = lerp(enemy.vx, 0, 0.26);
    if (enemy.attackWind <= 0) beginWalkerLeap(enemy);
    return;
  }

  if (enemy.ai !== "patrolOnly" && enemy.chaseTimer > 0 && distance < def.attackRange && verticalDistance < 60 && enemy.attackRecover <= 0) {
    enemy.attackWind = def.attackWind;
    return;
  }

  if (enemy.chaseTimer > 0) {
    const targetDirection = sign(enemy.lastSeenX - enemy.x || enemy.patrolDir);
    enemy.patrolDir = targetDirection;
    const burstSpeed = def.speed * (enemy.seesPlayer ? 1.08 : 0.92);
    if (Math.abs(enemy.lastSeenX - enemy.x) > 26) {
      enemy.vx = lerp(enemy.vx, targetDirection * burstSpeed, 0.085);
    } else {
      enemy.vx = lerp(enemy.vx, 0, 0.1);
    }
    return;
  }

  if (enemy.x <= enemy.patrolMin + 8) enemy.patrolDir = 1;
  if (enemy.x >= enemy.patrolMax - 8) enemy.patrolDir = -1;
  const patrolSpeed = def.patrolSpeed ?? def.speed * 0.46;
  enemy.vx = lerp(enemy.vx, enemy.patrolDir * patrolSpeed, 0.045);
}

function updateFlyingEnemy(enemy, dt, distance, verticalDistance) {
  const def = enemy.def;
  if (enemy.lungeTime > 0) {
    enemy.lungeTime = Math.max(0, enemy.lungeTime - dt);
    const t = 1 - enemy.lungeTime / Math.max(0.001, enemy.lungeDuration || def.lungeDuration || 0.58);
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const c = t * t;
    enemy.x = a * enemy.swoopStartX + b * enemy.swoopControlX + c * enemy.swoopEndX;
    enemy.y = a * enemy.swoopStartY + b * enemy.swoopControlY + c * enemy.swoopEndY;
    enemy.vx = 0;
    enemy.vy = 0;
    if (enemy.lungeTime <= 0) {
      enemy.vx = enemy.patrolDir * (def.patrolSpeed ?? 42) * 0.55;
      enemy.vy = -34;
      enemy.attackRecover = def.attackRecover;
      enemy.baseY = clamp(enemy.y, state.room.floorY - 300, state.room.floorY - 90);
    }
    return;
  }

  if (enemy.attackWind > 0) {
    enemy.attackWind -= dt;
    const away = -sign(player.x - enemy.x || enemy.patrolDir);
    enemy.vx = lerp(enemy.vx, away * 42, 0.14);
    enemy.vy = lerp(enemy.vy, -28, 0.1);
    if (enemy.attackWind <= 0) {
      const targetX = enemy.lastSeenX;
      const targetY = enemy.lastSeenY - player.h * 0.24;
      const dir = sign(targetX - enemy.x || enemy.patrolDir);
      enemy.patrolDir = dir;
      enemy.swoopStartX = enemy.x;
      enemy.swoopStartY = enemy.y;
      enemy.swoopControlX = clamp(targetX, 55, state.room.width - 55);
      enemy.swoopControlY = clamp(targetY + 30, state.room.floorY - 150, state.room.floorY - 42);
      enemy.swoopEndX = clamp(targetX + dir * 118, 55, state.room.width - 55);
      enemy.swoopEndY = clamp(enemy.baseY - 18, state.room.floorY - 325, state.room.floorY - 92);
      enemy.lungeDuration = def.lungeDuration ?? 0.58;
      enemy.lungeTime = enemy.lungeDuration;
      enemy.vx = 0;
      enemy.vy = 0;
      enemy.contactCooldown = 0;
      state.camera.shake = Math.max(state.camera.shake, 0.055);
      playLimitedSfx("attack", "enemyLungeSfxCooldown", 0.28);
      spawnSlashSparks(enemy.x - dir * 12, enemy.y, dir > 0 ? Math.PI : 0, "#8fa15f", isCoarsePointer() ? 4 : 7);
    }
    return;
  }

  if (enemy.ai !== "patrolOnly" && enemy.chaseTimer > 0 && distance < def.attackRange && verticalDistance < (def.visionHeight ?? 180) && enemy.attackRecover <= 0) {
    enemy.attackWind = def.attackWind;
    enemy.vx = lerp(enemy.vx, 0, 0.24);
    enemy.vy = lerp(enemy.vy, 0, 0.24);
    return;
  }

  if (enemy.chaseTimer > 0) {
    const targetDirection = sign(enemy.lastSeenX - enemy.x || enemy.patrolDir);
    enemy.patrolDir = targetDirection;
    enemy.vx = lerp(enemy.vx, targetDirection * def.speed, 0.06);
    const targetY = clamp(enemy.lastSeenY - player.h * 0.55, state.room.floorY - 310, state.room.floorY - 70);
    enemy.vy = lerp(enemy.vy, clamp(targetY - enemy.y, -105, 105), 0.045);
    return;
  }

  if (enemy.x <= enemy.patrolMin + 8) enemy.patrolDir = 1;
  if (enemy.x >= enemy.patrolMax - 8) enemy.patrolDir = -1;
  const patrolSpeed = def.patrolSpeed ?? def.speed * 0.42;
  const hoverY = enemy.baseY + Math.sin(state.time * 2.6 + enemy.phaseOffset) * (def.hoverBob ?? 10);
  enemy.vx = lerp(enemy.vx, enemy.patrolDir * patrolSpeed, 0.035);
  enemy.vy = lerp(enemy.vy, clamp(hoverY - enemy.y, -42, 42), 0.05);
}

function updateBurrowEnemy(enemy, dt, distance) {
  const def = enemy.def;
  enemy.vx = 0;
  enemy.vy = 0;
  enemy.y = state.room.floorY - def.height * 0.5;

  if (enemy.burrowState === "exposed") {
    enemy.popTime = Math.max(0, enemy.popTime - dt);
    if (enemy.popTime <= 0) {
      enemy.burrowState = "hidden";
      enemy.attackRecover = def.attackRecover;
      enemy.contactCooldown = 0.45;
      spawnMossDust(enemy.x, state.room.floorY - 2, isCoarsePointer() ? 4 : 7);
    }
    return;
  }

  if (enemy.attackWind > 0) {
    enemy.attackWind -= dt;
    enemy.x = lerp(enemy.x, enemy.burrowTargetX, 0.08);
    if (enemy.attackWind <= 0) {
      enemy.x = clamp(enemy.burrowTargetX, 60, state.room.width - 60);
      enemy.burrowState = "exposed";
      enemy.popTime = def.popDuration ?? 3;
      enemy.eruptionHit = false;
      enemy.contactCooldown = 0;
      playLimitedSfx("hit", "enemyLungeSfxCooldown", 0.22);
      spawnMossDust(enemy.x, state.room.floorY - 2, isCoarsePointer() ? 8 : 13);
      spawnStoneChips(enemy.x, state.room.floorY - 7, sign(player.x - enemy.x || 1), isCoarsePointer() ? 5 : 9);
      state.camera.shake = Math.max(state.camera.shake, 0.11);
    }
    return;
  }

  if (enemy.ai !== "patrolOnly" && enemy.chaseTimer > 0 && distance < def.attackRange && enemy.attackRecover <= 0) {
    enemy.burrowTargetX = clamp(enemy.lastSeenX, enemy.patrolMin, enemy.patrolMax);
    enemy.attackWind = def.attackWind;
    return;
  }

  if (enemy.x <= enemy.patrolMin + 8) enemy.patrolDir = 1;
  if (enemy.x >= enemy.patrolMax - 8) enemy.patrolDir = -1;
  const targetX = enemy.chaseTimer > 0 ? clamp(enemy.lastSeenX, enemy.patrolMin, enemy.patrolMax) : enemy.x + enemy.patrolDir * (def.patrolSpeed ?? 36) * dt;
  enemy.x = clamp(lerp(enemy.x, targetX, enemy.chaseTimer > 0 ? 0.035 : 1), enemy.patrolMin, enemy.patrolMax);
}

function enemyGroundY(enemy) {
  return enemy.groundY ?? state.room.floorY;
}

function isCastleEnemy(enemy) {
  return ["castleKnight", "castleArcher", "gargoyle", "spikedBrute"].includes(enemy.def.id);
}

function isSwampEnemy(enemy) {
  return ["hugeLobster", "alligator", "seaJelly", "drownedKnight"].includes(enemy.def.id);
}

function alertCastleAllies(source) {
  if (!isCastleEnemy(source)) return;
  for (const ally of state.enemies) {
    if (ally === source || ally.dead || !isCastleEnemy(ally)) continue;
    if (Math.abs(ally.x - source.x) > 470) continue;
    ally.chaseTimer = Math.max(ally.chaseTimer, ally.def.chaseMemory ?? 2.4);
    ally.lastSeenX = source.lastSeenX;
    ally.lastSeenY = source.lastSeenY;
  }
}

function updateHugeLobster(enemy, dt, distance, verticalDistance) {
  const def = enemy.def;
  if (enemy.attackWind > 0) {
    enemy.attackWind = Math.max(0, enemy.attackWind - dt);
    enemy.vx = lerp(enemy.vx, 0, 0.18);
    if (enemy.attackWind <= 0) {
      const dx = enemy.lastSeenX - enemy.x;
      const dy = enemy.lastSeenY - enemy.y;
      const angle = Math.atan2(dy, dx || enemy.patrolDir);
      enemy.patrolDir = sign(dx || enemy.patrolDir);
      spawnEnemyProjectile({
        kind: "waterSpray",
        x: enemy.x + enemy.patrolDir * 34,
        y: enemy.y - 12,
        angle,
        speed: def.projectileSpeed ?? 500,
        damage: def.damage,
        radius: def.projectileRadius ?? 10,
        color: "#7fc5b5",
        sparkle: "#c9f6de",
        life: 1.15
      });
      enemy.attackRecover = def.attackRecover;
      playLimitedSfx("attack", "enemyLungeSfxCooldown", 0.24);
    }
    return;
  }
  if (enemy.chaseTimer > 0 && distance < def.attackRange && verticalDistance < def.visionHeight && enemy.attackRecover <= 0) {
    enemy.attackWind = def.attackWind;
    enemy.patrolDir = sign(player.x - enemy.x || enemy.patrolDir);
    return;
  }
  updateWalkerEnemy(enemy, dt, distance, verticalDistance);
}

function updateDrownedKnight(enemy, dt, distance, verticalDistance) {
  const def = enemy.def;
  if (enemy.castleStrike > 0) {
    enemy.castleStrike = Math.max(0, enemy.castleStrike - dt);
    enemy.vx = lerp(enemy.vx, enemy.patrolDir * 38, 0.2);
    if (!enemy.castleHit && distance < def.attackRange + 34 && verticalDistance < 76) {
      enemy.castleHit = true;
      hurtPlayer(def.damage, enemy.x);
    }
    if (enemy.castleStrike <= 0) enemy.attackRecover = def.attackRecover;
    return;
  }
  if (enemy.attackWind > 0) {
    enemy.attackWind = Math.max(0, enemy.attackWind - dt);
    enemy.vx = lerp(enemy.vx, 0, 0.24);
    if (enemy.attackWind <= 0) {
      enemy.castleStrike = 0.22;
      enemy.castleHit = false;
    }
    return;
  }
  if (enemy.chaseTimer > 0 && distance < def.attackRange && verticalDistance < 72 && enemy.attackRecover <= 0) {
    enemy.patrolDir = sign(player.x - enemy.x || enemy.patrolDir);
    enemy.attackWind = def.attackWind;
    return;
  }
  updateWalkerEnemy(enemy, dt, distance, verticalDistance);
}

function updateAlligator(enemy, dt, distance, verticalDistance) {
  updateWalkerEnemy(enemy, dt, distance, verticalDistance);
  const water = waterAtX(enemy.x);
  if (water && enemy.attackWind <= 0 && enemy.lungeTime <= 0) {
    enemy.y = lerp(enemy.y, water.surfaceY - enemy.def.height * 0.18, 0.08);
  }
}

function updateSeaJelly(enemy, dt, distance, verticalDistance) {
  updateFlyingEnemy(enemy, dt, distance, verticalDistance);
  enemy.vy += Math.sin(state.time * 5.8 + enemy.phaseOffset) * 5 * dt;
}

function updateSwampEnemy(enemy, dt, distance, verticalDistance) {
  if (enemy.def.id === "hugeLobster") updateHugeLobster(enemy, dt, distance, verticalDistance);
  else if (enemy.def.id === "drownedKnight") updateDrownedKnight(enemy, dt, distance, verticalDistance);
  else if (enemy.def.id === "alligator") updateAlligator(enemy, dt, distance, verticalDistance);
  else if (enemy.def.id === "seaJelly") updateSeaJelly(enemy, dt, distance, verticalDistance);
  else updateWalkerEnemy(enemy, dt, distance, verticalDistance);
}

function beginCastleKnightSlash(enemy) {
  enemy.attackWind = enemy.def.attackWind;
  enemy.castleAttack = "slash";
  enemy.castleStrike = 0;
  enemy.castleHit = false;
}

function updateCastleKnight(enemy, dt, distance, verticalDistance) {
  const def = enemy.def;
  if (enemy.castleStrike > 0) {
    enemy.castleStrike = Math.max(0, enemy.castleStrike - dt);
    enemy.vx = lerp(enemy.vx, enemy.patrolDir * 42, 0.18);
    if (!enemy.castleHit && distance < def.attackRange + 28 && verticalDistance < 72) {
      enemy.castleHit = true;
      hurtPlayer(def.damage, enemy.x);
    }
    if (enemy.castleStrike <= 0) {
      enemy.attackRecover = def.attackRecover;
      enemy.castleAttack = null;
    }
    return;
  }
  if (enemy.attackWind > 0) {
    enemy.attackWind = Math.max(0, enemy.attackWind - dt);
    enemy.vx = lerp(enemy.vx, 0, 0.24);
    if (enemy.attackWind <= 0) enemy.castleStrike = 0.2;
    return;
  }
  if (enemy.chaseTimer > 0 && distance < def.attackRange && verticalDistance < 72 && enemy.attackRecover <= 0) {
    enemy.patrolDir = sign(player.x - enemy.x || enemy.patrolDir);
    beginCastleKnightSlash(enemy);
    return;
  }
  if (enemy.chaseTimer > 0) {
    const archer = state.enemies.find((ally) => !ally.dead && ally.def.id === "castleArcher" && Math.abs(ally.x - enemy.x) < 620);
    const targetX = archer ? player.x + sign(archer.x - player.x || enemy.patrolDir) * 95 : enemy.lastSeenX;
    const dir = sign(targetX - enemy.x || enemy.patrolDir);
    enemy.patrolDir = dir;
    enemy.vx = Math.abs(enemy.x - targetX) > 28 ? lerp(enemy.vx, dir * def.speed, 0.07) : lerp(enemy.vx, 0, 0.14);
    return;
  }
  if (enemy.x <= enemy.patrolMin + 8) enemy.patrolDir = 1;
  if (enemy.x >= enemy.patrolMax - 8) enemy.patrolDir = -1;
  enemy.vx = lerp(enemy.vx, enemy.patrolDir * (def.patrolSpeed ?? 40), 0.045);
}

function updateCastleArcher(enemy, dt, distance, verticalDistance) {
  const def = enemy.def;
  if (enemy.attackWind > 0) {
    enemy.attackWind = Math.max(0, enemy.attackWind - dt);
    enemy.vx = lerp(enemy.vx, 0, 0.18);
    if (enemy.attackWind <= 0) {
      const dx = enemy.lastSeenX - enemy.x;
      const dy = enemy.lastSeenY - enemy.y;
      const angle = Math.atan2(dy, dx || enemy.patrolDir);
      enemy.patrolDir = sign(dx || enemy.patrolDir);
      spawnEnemyProjectile({
        kind: "arrow",
        x: enemy.x + enemy.patrolDir * 24,
        y: enemy.y - 15,
        angle,
        speed: def.projectileSpeed ?? 520,
        damage: def.damage,
        radius: def.projectileRadius ?? 7,
        color: "#d8d0a4",
        sparkle: "#fff0b5",
        life: 1.6
      });
      enemy.attackRecover = def.attackRecover;
      playLimitedSfx("attack", "enemyLungeSfxCooldown", 0.2);
      spawnSlashSparks(enemy.x + enemy.patrolDir * 24, enemy.y - 15, angle, "#d8d0a4", 5);
    }
    return;
  }
  if (enemy.chaseTimer > 0 && distance < def.attackRange && verticalDistance < def.visionHeight && enemy.attackRecover <= 0) {
    enemy.attackWind = def.attackWind;
    enemy.patrolDir = sign(player.x - enemy.x || enemy.patrolDir);
    return;
  }
  if (enemy.chaseTimer > 0) {
    const tooClose = distance < (def.preferredRangeMin ?? 220);
    const tooFar = distance > (def.preferredRangeMax ?? 460);
    if (tooClose) {
      enemy.patrolDir = -sign(player.x - enemy.x || enemy.patrolDir);
      enemy.vx = lerp(enemy.vx, enemy.patrolDir * def.speed, 0.08);
    } else if (tooFar) {
      enemy.patrolDir = sign(player.x - enemy.x || enemy.patrolDir);
      enemy.vx = lerp(enemy.vx, enemy.patrolDir * def.speed * 0.55, 0.05);
    } else {
      enemy.patrolDir = sign(player.x - enemy.x || enemy.patrolDir);
      enemy.vx = lerp(enemy.vx, 0, 0.12);
    }
    return;
  }
  if (enemy.x <= enemy.patrolMin + 8) enemy.patrolDir = 1;
  if (enemy.x >= enemy.patrolMax - 8) enemy.patrolDir = -1;
  enemy.vx = lerp(enemy.vx, enemy.patrolDir * (def.patrolSpeed ?? 34), 0.04);
}

function updateSpikedBrute(enemy, dt, distance, verticalDistance) {
  const def = enemy.def;
  enemy.chargeTime = Math.max(0, enemy.chargeTime ?? 0);
  if (enemy.chargeTime > 0) {
    enemy.chargeTime = Math.max(0, enemy.chargeTime - dt);
    enemy.vx = (enemy.chargeDir || enemy.patrolDir || 1) * (def.chargeSpeed ?? 460);
    if (!enemy.castleHit && distance < def.width * 0.58 + player.w * 0.45 && verticalDistance < 76) {
      enemy.castleHit = true;
      hurtPlayer(def.damage, enemy.x);
    }
    if (enemy.x <= enemy.patrolMin + 10 || enemy.x >= enemy.patrolMax - 10 || enemy.chargeTime <= 0) {
      enemy.chargeTime = 0;
      enemy.vx *= 0.35;
      enemy.attackRecover = enemy.castleHit ? def.attackRecover : def.attackRecover + 0.72;
      enemy.castleAttack = null;
      if (!enemy.castleHit) spawnFloater("stagger", enemy.x, enemy.y - 66, "#d6ad55");
      spawnMossDust(enemy.x, enemyGroundY(enemy) - 2, isCoarsePointer() ? 5 : 9);
    }
    return;
  }
  if (enemy.attackWind > 0) {
    enemy.attackWind = Math.max(0, enemy.attackWind - dt);
    enemy.vx = lerp(enemy.vx, 0, 0.25);
    if (enemy.attackWind <= 0) {
      enemy.chargeDir = enemy.patrolDir || sign(player.x - enemy.x || 1);
      enemy.chargeTime = def.chargeDuration ?? 0.62;
      enemy.castleHit = false;
      state.camera.shake = Math.max(state.camera.shake, 0.12);
      playLimitedSfx("attack", "enemyLungeSfxCooldown", 0.22);
    }
    return;
  }
  if (enemy.chaseTimer > 0 && distance < def.attackRange && verticalDistance < 82 && enemy.attackRecover <= 0) {
    enemy.patrolDir = sign(player.x - enemy.x || enemy.patrolDir);
    enemy.attackWind = def.attackWind;
    enemy.castleAttack = "charge";
    return;
  }
  if (enemy.chaseTimer > 0) {
    enemy.patrolDir = sign(player.x - enemy.x || enemy.patrolDir);
    enemy.vx = lerp(enemy.vx, enemy.patrolDir * def.speed, 0.045);
    return;
  }
  if (enemy.x <= enemy.patrolMin + 8) enemy.patrolDir = 1;
  if (enemy.x >= enemy.patrolMax - 8) enemy.patrolDir = -1;
  enemy.vx = lerp(enemy.vx, enemy.patrolDir * (def.patrolSpeed ?? 28), 0.035);
}

function updateGargoyle(enemy, dt, distance, verticalDistance) {
  const def = enemy.def;
  enemy.spitCooldown = Math.max(0, (enemy.spitCooldown ?? rand(0.55, 1.25)) - dt);
  if ((enemy.spitWind ?? 0) > 0) {
    enemy.spitWind = Math.max(0, enemy.spitWind - dt);
    enemy.vx = lerp(enemy.vx, 0, 0.18);
    enemy.vy = lerp(enemy.vy, -10, 0.12);
    if (enemy.spitWind <= 0) {
      const sx = enemy.x + (enemy.patrolDir || 1) * 30;
      const sy = enemy.y - 10;
      const angle = Math.atan2((enemy.lastSeenY - 8) - sy, enemy.lastSeenX - sx);
      spawnEnemyProjectile({
        kind: "stoneSpit",
        x: sx,
        y: sy,
        angle,
        speed: def.projectileSpeed ?? 540,
        damage: def.projectileDamage ?? Math.max(8, Math.ceil(def.damage * 0.75)),
        radius: 10,
        color: "#ff5a66",
        sparkle: "#ffb0a8",
        life: 1.15
      });
      enemy.attackRecover = Math.max(enemy.attackRecover, 0.42);
      enemy.spitCooldown = def.projectileRecover ?? 1.2;
      playLimitedSfx("attack", "enemyLungeSfxCooldown", 0.18);
      spawnSlashSparks(sx, sy, angle, "#ff5a66", isCoarsePointer() ? 5 : 9);
    }
    return;
  }
  const canSpit = enemy.chaseTimer > 0
    && enemy.spitCooldown <= 0
    && enemy.attackRecover <= 0
    && enemy.lungeTime <= 0
    && enemy.attackWind <= 0
    && distance > 210
    && distance < (def.projectileRange ?? 520)
    && verticalDistance < (def.visionHeight ?? 250);
  if (canSpit) {
    enemy.spitWind = def.projectileWind ?? 0.34;
    enemy.patrolDir = sign(player.x - enemy.x || enemy.patrolDir);
    enemy.vx = lerp(enemy.vx, 0, 0.24);
    enemy.vy = lerp(enemy.vy, 0, 0.24);
    return;
  }
  updateFlyingEnemy(enemy, dt, distance, verticalDistance);
}

function updateCastleEnemy(enemy, dt, distance, verticalDistance) {
  if (enemy.def.id === "castleKnight") updateCastleKnight(enemy, dt, distance, verticalDistance);
  else if (enemy.def.id === "castleArcher") updateCastleArcher(enemy, dt, distance, verticalDistance);
  else if (enemy.def.id === "spikedBrute") updateSpikedBrute(enemy, dt, distance, verticalDistance);
  else if (enemy.def.id === "gargoyle") updateGargoyle(enemy, dt, distance, verticalDistance);
  else updateFlyingEnemy(enemy, dt, distance, verticalDistance);
}

function updateEnemies(dt) {
  let living = 0;
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    living += 1;
    enemy.hurt = Math.max(0, enemy.hurt - dt);
    enemy.attackRecover = Math.max(0, enemy.attackRecover - dt);
    enemy.contactCooldown = Math.max(0, enemy.contactCooldown - dt);
    enemy.rooted = Math.max(0, (enemy.rooted ?? 0) - dt);
    const dx = player.x - enemy.x;
    const direction = sign(dx);
    const distance = Math.abs(dx);
    const verticalDistance = Math.abs(player.y - enemy.y);
    const facingPlayer = direction === enemy.patrolDir || distance < 70;
    const canSeePlayer =
      enemy.ai !== "patrolOnly" &&
      facingPlayer &&
      distance <= (enemy.def.visionRange ?? 360) &&
      verticalDistance <= (enemy.def.visionHeight ?? 110);

    enemy.seesPlayer = canSeePlayer;
    if (canSeePlayer) {
      enemy.chaseTimer = enemy.def.chaseMemory ?? 2.2;
      enemy.lastSeenX = player.x;
      enemy.lastSeenY = player.y;
      alertCastleAllies(enemy);
    } else {
      enemy.chaseTimer = Math.max(0, enemy.chaseTimer - dt);
    }

    const flying = enemy.def.movement === "flying";
    const burrow = enemy.def.movement === "burrow";
    if (enemy.rooted > 0) {
      enemy.vx = lerp(enemy.vx, 0, 0.22);
      enemy.vy = lerp(enemy.vy ?? 0, 0, 0.2);
      if (Math.random() < 0.22) spawnSlashSparks(enemy.x, enemy.y - 8, -Math.PI * 0.5, "#9ba95f", 1);
    } else if (isCastleEnemy(enemy)) {
      updateCastleEnemy(enemy, dt, distance, verticalDistance);
    } else if (isSwampEnemy(enemy)) {
      updateSwampEnemy(enemy, dt, distance, verticalDistance);
    } else if (flying) {
      updateFlyingEnemy(enemy, dt, distance, verticalDistance);
    } else if (burrow) {
      updateBurrowEnemy(enemy, dt, distance);
    } else {
      updateWalkerEnemy(enemy, dt, distance, verticalDistance);
    }

    enemy.x += enemy.vx * dt;
    if (flying) enemy.y += enemy.vy * dt;
    enemy.x = clamp(enemy.x, 40, state.room.width - 40);
    if (enemy.x <= 42 || enemy.x >= state.room.width - 42) enemy.patrolDir *= -1;
    if (flying) {
      enemy.y = clamp(enemy.y, state.room.floorY - 330, state.room.floorY - 56);
    } else if (burrow) {
      enemy.y = (enemy.groundY ?? state.room.floorY) - enemy.def.height * 0.5;
    } else {
      enemy.y = (enemy.groundY ?? state.room.floorY) - enemy.def.height * 0.5;
    }

    const hitY = flying ? enemy.def.height * 0.7 + player.h * 0.5 : 36;
    const canContact = !burrow || enemy.burrowState === "exposed";
    if (canContact && enemy.contactCooldown <= 0 && Math.abs(player.x - enemy.x) < enemy.def.width * 0.44 + player.w * 0.42 && Math.abs(player.y - enemy.y) < hitY) {
      enemy.contactCooldown = 0.55;
      const erupting = burrow && !enemy.eruptionHit;
      if (erupting) enemy.eruptionHit = true;
      hurtPlayer(enemy.lungeTime > 0 || erupting ? enemy.def.damage : enemy.def.contactDamage, enemy.x);
    }
  }
  if (living === 0 && state.room.spawns.length > 0) {
    const wasClear = state.roomClears.has(state.room.id);
    state.roomClears.add(state.room.id);
    if (!wasClear) maybeSpawnMiniChestForRoom();
  }
}

function updateBoss(dt) {
  const boss = state.boss;
  if (!boss || boss.dead) return;
  if (boss.def.id === "ironWarden") {
    updateIronWardenBoss(dt);
    return;
  }
  if (boss.def.id === "redWolf") {
    updateRedWolfBoss(dt);
    return;
  }
  boss.hurt = Math.max(0, boss.hurt - dt);
  boss.stun = Math.max(0, boss.stun - dt);
  boss.squash = Math.max(0, (boss.squash ?? 0) - dt * 2.8);
  boss.facing = sign(player.x - boss.x || boss.facing || -1);
  if (boss.hp / boss.maxHp < boss.def.phaseBreak) boss.phase = 1;
  if (boss.stun > 0) return;

  if (boss.phase > 0) boss.spawnCooldown = Math.max(0, boss.spawnCooldown - dt);

  if (!boss.attack) {
    boss.attackCooldown -= dt;
    const crawlSpeed = 54 + boss.phase * 18;
    boss.vx = lerp(boss.vx, sign(player.x - boss.x || boss.facing) * crawlSpeed, 0.045);
    boss.x += boss.vx * dt;
    if (boss.attackCooldown <= 0) beginBossAttack();
  } else {
    updateBossAttack(dt);
  }

  boss.x = clamp(boss.x, 150, state.room.width - 150);
  boss.y = state.room.floorY - boss.def.height * 0.5;
  if (Math.abs(player.x - boss.x) < boss.def.width * 0.42 && Math.abs(player.y - boss.y) < boss.def.height * 0.48) {
    hurtPlayer(boss.def.contactDamage, boss.x);
  }
}

function updateRedWolfBoss(dt) {
  const boss = state.boss;
  boss.hurt = Math.max(0, boss.hurt - dt);
  boss.stun = Math.max(0, boss.stun - dt);
  boss.squash = Math.max(0, (boss.squash ?? 0) - dt * 3.2);
  boss.facing = sign(player.x - boss.x || boss.facing || -1);
  if (boss.hp / boss.maxHp < boss.def.phaseBreak) boss.phase = 1;
  if (boss.stun > 0) return;
  if (!boss.attack) {
    boss.attackCooldown -= dt;
    const speed = boss.phase ? 128 : 104;
    boss.vx = lerp(boss.vx, boss.facing * speed, 0.06);
    boss.x += boss.vx * dt;
    if (boss.attackCooldown <= 0) beginRedWolfAttack();
  } else {
    updateRedWolfAttack(dt);
  }
  boss.x = clamp(boss.x, 120, state.room.width - 120);
  boss.y = state.room.floorY - boss.def.height * 0.5;
  if (Math.abs(player.x - boss.x) < boss.def.width * 0.38 && Math.abs(player.y - boss.y) < boss.def.height * 0.48) {
    hurtPlayer(boss.def.contactDamage, boss.x);
  }
}

function beginRedWolfAttack() {
  const boss = state.boss;
  const distance = Math.abs(player.x - boss.x);
  const type = boss.phase && Math.random() < 0.34 ? "howl" : distance > 145 ? "pounce" : "bite";
  const dir = sign(player.x - boss.x || boss.facing || 1);
  boss.facing = dir;
  boss.attack = {
    type,
    t: 0,
    dir,
    startX: boss.x,
    targetX: clamp(player.x - dir * 18, 110, state.room.width - 110),
    hit: false,
    fired: false
  };
}

function updateRedWolfAttack(dt) {
  const boss = state.boss;
  const attack = boss.attack;
  attack.t += dt;
  if (attack.type === "pounce") {
    if (attack.t < 0.34) {
      boss.vx = lerp(boss.vx, 0, 0.24);
      boss.squash = Math.max(boss.squash ?? 0, 0.42);
    } else if (attack.t < 0.78) {
      const t = smoothStep((attack.t - 0.34) / 0.44);
      boss.x = lerp(attack.startX, attack.targetX, t);
      boss.leapLift = Math.sin(t * Math.PI) * 62;
      if (!attack.hit && Math.abs(player.x - boss.x) < boss.def.width * 0.44 && Math.abs(player.y - (boss.y - boss.leapLift)) < 82) {
        attack.hit = true;
        hurtPlayer(boss.def.damage + boss.phase * 4, boss.x);
      }
    } else if (attack.t < 1.12) {
      boss.leapLift = 0;
      boss.vx = lerp(boss.vx, 0, 0.16);
      if (attack.t < 0.84) {
        spawnDust(boss.x, state.room.floorY - 2, 8);
        state.camera.shake = Math.max(state.camera.shake, 0.2);
      }
    } else {
      boss.attack = null;
      boss.attackCooldown = boss.phase ? 0.62 : 0.82;
    }
  } else if (attack.type === "bite") {
    if (attack.t < 0.26) {
      boss.vx = lerp(boss.vx, 0, 0.2);
    } else if (attack.t < 0.46) {
      boss.vx = attack.dir * 260;
      boss.x += boss.vx * dt;
      if (!attack.hit && Math.abs(player.x - boss.x) < boss.def.width * 0.42 && Math.abs(player.y - boss.y) < 74) {
        attack.hit = true;
        hurtPlayer(boss.def.damage, boss.x);
      }
    } else if (attack.t > 0.72) {
      boss.attack = null;
      boss.attackCooldown = boss.phase ? 0.58 : 0.78;
    }
  } else {
    boss.vx = lerp(boss.vx, 0, 0.18);
    if (!attack.fired && attack.t > 0.44) {
      attack.fired = true;
      for (const offset of [-0.18, 0, 0.18]) {
        const angle = Math.atan2(player.y - boss.y, player.x - boss.x) + offset;
        spawnEnemyProjectile({
          kind: "redHowl",
          x: boss.x + attack.dir * 62,
          y: boss.y - 24,
          angle,
          speed: 520,
          damage: boss.def.damage - 5,
          radius: 12,
          color: "#c2433d",
          sparkle: "#ffb0a8",
          life: 1.2
        });
      }
      spawnFluid(boss.x + attack.dir * 48, boss.y - 20, FLUIDS.oldBlood, 12, attack.dir);
    }
    if (attack.t > 1.04) {
      boss.attack = null;
      boss.attackCooldown = 0.72;
    }
  }
}

function beginBossAttack() {
  const boss = state.boss;
  const distance = Math.abs(player.x - boss.x);
  let type = "charge";
  const roll = Math.random();
  if (boss.phase > 0 && boss.spawnCooldown <= 0 && roll < 0.24) type = "summon";
  else if (distance > 230 && roll < 0.58) type = "leapBite";
  else if (distance < 165 && roll < 0.48) type = "slam";
  else if (boss.phase > 0 && roll > 0.62) type = "thorns";
  else if (roll > 0.76) type = "leapBite";
  if (type === "charge") {
    boss.attack = {
      type,
      t: 0,
      dir: sign(player.x - boss.x),
      hit: false
    };
  } else if (type === "leapBite") {
    const dir = sign(player.x - boss.x || boss.facing || 1);
    const targetX = clamp(player.x - dir * 28, 150, state.room.width - 150);
    boss.attack = {
      type,
      t: 0,
      dir,
      startX: boss.x,
      targetX,
      hit: false,
      landed: false
    };
  } else if (type === "slam") {
    boss.attack = {
      type,
      t: 0,
      dir: sign(player.x - boss.x || boss.facing || 1),
      fired: false
    };
  } else if (type === "summon") {
    boss.attack = {
      type,
      t: 0,
      fired: false
    };
  } else {
    const spots = [];
    const baseX = player.x;
    for (let i = -1; i <= 1; i += 1) {
      spots.push(clamp(baseX + i * 98 + rand(-28, 28), 120, state.room.width - 120));
    }
    if (boss.phase > 0) spots.push(clamp(boss.x + sign(player.x - boss.x || 1) * 155, 120, state.room.width - 120));
    boss.attack = { type, t: 0, spots, fired: false };
  }
  boss.facing = boss.attack.dir ?? sign(player.x - boss.x || boss.facing || -1);
}

function updateBossAttack(dt) {
  const boss = state.boss;
  const attack = boss.attack;
  attack.t += dt;
  if (attack.type === "charge") {
    if (attack.t < 0.62) {
      boss.vx = lerp(boss.vx, 0, 0.2);
      boss.squash = Math.max(boss.squash ?? 0, 0.3);
    } else if (attack.t < 1.08) {
      boss.vx = attack.dir * (530 + boss.phase * 95);
      boss.x += boss.vx * dt;
      if (!attack.hit && Math.abs(player.x - boss.x) < boss.def.width * 0.48 && Math.abs(player.y - boss.y) < 70) {
        attack.hit = true;
        hurtPlayer(boss.def.damage + boss.phase * 4, boss.x);
      }
      if (Math.random() < 0.26) spawnMossDust(boss.x - attack.dir * 76, state.room.floorY - 2, 2);
    } else if (attack.t < 1.55) {
      boss.vx *= 0.86;
    } else {
      boss.attack = null;
      boss.attackCooldown = 0.9 - boss.phase * 0.12;
      boss.squash = 0.36;
    }
  } else if (attack.type === "leapBite") {
    if (attack.t < 0.42) {
      boss.vx = lerp(boss.vx, 0, 0.24);
      boss.leapLift = 0;
      boss.squash = Math.max(boss.squash ?? 0, 0.4);
    } else if (attack.t < 1.02) {
      const t = smoothStep((attack.t - 0.42) / 0.6);
      boss.x = lerp(attack.startX, attack.targetX, t);
      boss.leapLift = Math.sin(t * Math.PI) * (68 + boss.phase * 14);
      if (!attack.hit && Math.abs(player.x - boss.x) < boss.def.width * 0.42 && Math.abs(player.y - (boss.y - boss.leapLift)) < 92) {
        attack.hit = true;
        hurtPlayer(boss.def.damage + 5 + boss.phase * 4, boss.x);
      }
      if (Math.random() < 0.18) spawnSlashSparks(boss.x - attack.dir * 45, state.room.floorY - boss.leapLift * 0.18, attack.dir > 0 ? 0 : Math.PI, "#8fa15f", 2);
    } else {
      if (!attack.landed) {
        attack.landed = true;
        boss.leapLift = 0;
        boss.squash = 0.65;
        state.camera.shake = Math.max(state.camera.shake, 0.34);
        playLimitedSfx("hit", "bossSlamSfxCooldown", 0.2);
        spawnMossDust(boss.x, state.room.floorY - 2, isCoarsePointer() ? 9 : 16);
        spawnStoneChips(boss.x, state.room.floorY - 7, attack.dir, isCoarsePointer() ? 7 : 12);
        spawnBossShockwave(boss.x + attack.dir * 72, 118 + boss.phase * 28, 15 + boss.phase * 4);
      }
      boss.vx *= 0.82;
      if (attack.t > 1.38) {
        boss.attack = null;
        boss.attackCooldown = 0.95 - boss.phase * 0.12;
      }
    }
  } else if (attack.type === "slam") {
    if (attack.t < 0.58) {
      boss.vx = lerp(boss.vx, 0, 0.26);
      boss.squash = Math.max(boss.squash ?? 0, 0.25 + attack.t * 0.35);
    } else {
      if (!attack.fired) {
        attack.fired = true;
        boss.squash = 0.72;
        state.camera.shake = Math.max(state.camera.shake, 0.38);
        playLimitedSfx("hit", "bossSlamSfxCooldown", 0.22);
        spawnMossDust(boss.x, state.room.floorY - 2, isCoarsePointer() ? 10 : 18);
        spawnStoneChips(boss.x, state.room.floorY - 7, attack.dir, isCoarsePointer() ? 8 : 14);
        spawnBossShockwave(boss.x - 92, 96 + boss.phase * 18, 12 + boss.phase * 3);
        spawnBossShockwave(boss.x + 92, 96 + boss.phase * 18, 12 + boss.phase * 3);
      }
      if (attack.t > 1.06) {
        boss.attack = null;
        boss.attackCooldown = 0.95 - boss.phase * 0.1;
      }
    }
  } else if (attack.type === "thorns") {
    boss.vx = lerp(boss.vx, 0, 0.18);
    if (!attack.fired && attack.t > 0.72) {
      attack.fired = true;
      for (const x of attack.spots) {
        state.hazards.push({
          type: "bossThorn",
          x,
          y: state.room.floorY,
          w: 42,
          h: 112,
          life: 0.48,
          max: 0.48,
          damage: 14 + boss.phase * 3,
          hit: false
        });
        spawnMossDust(x, state.room.floorY - 2, isCoarsePointer() ? 4 : 8);
      }
    }
    if (attack.t > 1.25) {
      boss.attack = null;
      boss.attackCooldown = 1.05;
    }
  } else if (attack.type === "summon") {
    boss.vx = lerp(boss.vx, 0, 0.18);
    boss.squash = Math.max(boss.squash ?? 0, attack.t < 0.68 ? 0.32 : 0);
    if (!attack.fired && attack.t > 0.68) {
      attack.fired = true;
      boss.spawnCooldown = 7.2;
      const leftX = clamp(boss.x - 250, 120, state.room.width - 120);
      const rightX = clamp(boss.x + 250, 120, state.room.width - 120);
      spawnEnemy("rootCrawler", leftX, state.room.floorY);
      spawnEnemy("rootCrawler", rightX, state.room.floorY);
      spawnMossDust(leftX, state.room.floorY - 2, isCoarsePointer() ? 7 : 12);
      spawnMossDust(rightX, state.room.floorY - 2, isCoarsePointer() ? 7 : 12);
      spawnStoneChips(leftX, state.room.floorY - 7, -1, isCoarsePointer() ? 5 : 8);
      spawnStoneChips(rightX, state.room.floorY - 7, 1, isCoarsePointer() ? 5 : 8);
      toast("Small crawlers break loose.", 1100);
    }
    if (attack.t > 1.2) {
      boss.attack = null;
      boss.attackCooldown = 1.05;
    }
  }
}

function updateIronWardenBoss(dt) {
  const boss = state.boss;
  boss.hurt = Math.max(0, boss.hurt - dt);
  boss.stun = Math.max(0, boss.stun - dt);
  boss.squash = Math.max(0, (boss.squash ?? 0) - dt * 2.2);
  boss.facing = sign(player.x - boss.x || boss.facing || -1);
  if (boss.hp / boss.maxHp < boss.def.phaseBreak) boss.phase = 1;
  if (boss.stun > 0) return;
  boss.spawnCooldown = Math.max(0, boss.spawnCooldown - dt);
  if (!boss.attack) {
    boss.attackCooldown -= dt;
    boss.vx = lerp(boss.vx, boss.facing * (34 + boss.phase * 8), 0.035);
    boss.x += boss.vx * dt;
    if (boss.attackCooldown <= 0) beginIronWardenAttack();
  } else {
    updateIronWardenAttack(dt);
  }
  boss.x = clamp(boss.x, 170, state.room.width - 170);
  boss.y = state.room.floorY - boss.def.height * 0.5;
  if (Math.abs(player.x - boss.x) < boss.def.width * 0.36 && Math.abs(player.y - boss.y) < boss.def.height * 0.42) {
    hurtPlayer(boss.def.contactDamage, boss.x);
  }
}

function beginIronWardenAttack() {
  const boss = state.boss;
  const distance = Math.abs(player.x - boss.x);
  const roll = Math.random();
  let type = "maceSwing";
  if (boss.phase > 0 && boss.spawnCooldown <= 0 && roll < 0.28) type = "summonAxes";
  else if (distance > 230 && roll < 0.62) type = "shieldBash";
  else if (roll > 0.66) type = "groundPound";
  boss.attack = {
    type,
    t: 0,
    dir: sign(player.x - boss.x || boss.facing || 1),
    hit: false,
    fired: false
  };
  if (type === "summonAxes") {
    boss.attack.axes = Array.from({ length: 6 }, (_, index) => ({
      angle: index * TAU / 6,
      fired: false
    }));
  }
  boss.facing = boss.attack.dir;
}

function updateIronWardenAttack(dt) {
  const boss = state.boss;
  const attack = boss.attack;
  attack.t += dt;
  if (attack.type === "maceSwing") {
    if (attack.t < 0.58) {
      boss.vx = lerp(boss.vx, 0, 0.22);
      boss.squash = Math.max(boss.squash ?? 0, 0.24);
    } else if (attack.t < 0.86) {
      boss.vx = attack.dir * 90;
      boss.x += boss.vx * dt;
      if (!attack.hit && Math.abs(player.x - boss.x) < 168 && Math.abs(player.y - boss.y) < 122) {
        attack.hit = true;
        hurtPlayer(boss.def.damage + boss.phase * 3, boss.x);
      }
      if (Math.random() < 0.24) spawnSlashSparks(boss.x + attack.dir * 70, boss.y - 34, attack.dir > 0 ? 0 : Math.PI, "#a58a59", 3);
    } else if (attack.t > 1.28) {
      boss.attack = null;
      boss.attackCooldown = 0.85 - boss.phase * 0.08;
    }
  } else if (attack.type === "shieldBash") {
    if (attack.t < 0.52) {
      boss.vx = lerp(boss.vx, 0, 0.24);
      boss.squash = Math.max(boss.squash ?? 0, 0.34);
    } else if (attack.t < 0.95) {
      boss.vx = attack.dir * (410 + boss.phase * 60);
      boss.x += boss.vx * dt;
      if (!attack.hit && Math.abs(player.x - boss.x) < 150 && Math.abs(player.y - boss.y) < 120) {
        attack.hit = true;
        hurtPlayer(boss.def.damage + 6 + boss.phase * 3, boss.x);
      }
      if (Math.random() < 0.34) spawnStoneChips(boss.x - attack.dir * 70, state.room.floorY - 6, -attack.dir, 2);
    } else if (attack.t > 1.32) {
      boss.attack = null;
      boss.attackCooldown = 1.0 - boss.phase * 0.08;
      boss.squash = 0.36;
    }
  } else if (attack.type === "groundPound") {
    boss.vx = lerp(boss.vx, 0, 0.18);
    if (!attack.fired && attack.t > 0.78) {
      attack.fired = true;
      boss.squash = 0.72;
      state.camera.shake = Math.max(state.camera.shake, 0.48);
      playLimitedSfx("hit", "bossSlamSfxCooldown", 0.22);
      spawnStoneChips(boss.x, state.room.floorY - 7, attack.dir, isCoarsePointer() ? 13 : 22);
      spawnMossDust(boss.x, state.room.floorY - 2, isCoarsePointer() ? 8 : 14);
      spawnBossShockwave(boss.x - 125, 118 + boss.phase * 18, boss.def.damage + 4);
      spawnBossShockwave(boss.x + 125, 118 + boss.phase * 18, boss.def.damage + 4);
      for (const x of [boss.x - 210, boss.x + 210]) {
        state.hazards.push({
          type: "wardenSpike",
          x: clamp(x, 100, state.room.width - 100),
          y: state.room.floorY,
          w: 48,
          h: 98,
          life: 0.5,
          max: 0.5,
          damage: boss.def.damage + 2,
          hit: false
        });
      }
    }
    if (attack.t > 1.36) {
      boss.attack = null;
      boss.attackCooldown = 1.08 - boss.phase * 0.08;
    }
  } else if (attack.type === "summonAxes") {
    boss.vx = lerp(boss.vx, 0, 0.18);
    boss.squash = Math.max(boss.squash ?? 0, attack.t < 0.82 ? 0.28 : 0);
    if (!attack.fired && attack.t > 0.88) {
      attack.fired = true;
      boss.spawnCooldown = 7.5;
      for (const axe of attack.axes ?? []) {
        const ox = Math.cos(axe.angle) * 92;
        const oy = Math.sin(axe.angle) * 44 - 62;
        const sx = boss.x + ox;
        const sy = boss.y + oy;
        const angle = Math.atan2((player.y - 10) - sy, player.x - sx);
        spawnEnemyProjectile({
          kind: "wardenAxe",
          x: sx,
          y: sy,
          angle,
          speed: 470,
          damage: boss.def.damage + 2,
          radius: 17,
          color: "#a58a59",
          sparkle: "#d6ad55",
          life: 1.45,
          spin: 9
        });
      }
      toast("The Warden's axes launch.", 1050);
    }
    if (attack.t > 1.34) {
      boss.attack = null;
      boss.attackCooldown = 1.0;
    }
  }
}

function spawnBossShockwave(x, radius, damage) {
  state.hazards.push({
    type: "bossShockwave",
    x: clamp(x, 90, state.room.width - 90),
    y: state.room.floorY,
    w: radius,
    h: 44,
    life: 0.36,
    max: 0.36,
    damage,
    hit: false
  });
}

function updateHazards(dt) {
  for (const hazard of state.hazards) {
    if (hazard.owner === "player") {
      updatePlayerHazard(hazard, dt);
      continue;
    }
    hazard.life -= dt;
    if (!hazard.hit && hazard.life > 0 && Math.abs(player.x - hazard.x) < hazard.w && player.y + player.h * 0.5 > hazard.y - hazard.h) {
      hazard.hit = true;
      hurtPlayer(hazard.damage, hazard.x);
    }
  }
  state.hazards = state.hazards.filter((hazard) => hazard.life > 0);
}

function applyHazardRoot(target, duration = 0.25) {
  if (target.kind === "enemy") target.entity.rooted = Math.max(target.entity.rooted ?? 0, duration);
  else if (target.kind === "boss") target.entity.stun = Math.max(target.entity.stun ?? 0, Math.min(0.18, duration * 0.3));
}

function explodeBlackMaw(hazard) {
  if (hazard.exploded) return;
  hazard.exploded = true;
  const hitSet = new Set();
  const hits = hitPlayerOwnedTargets({
    hitSet,
    amount: hazard.finalDamage ?? classAbilityDamage(30),
    direction: player.facing,
    options: { allowKnifeBreak: false, impactX: hazard.x, impactY: hazard.y, angle: -Math.PI * 0.5, style: "blackMawExplosion", hitStyle: "voidExplode" },
    intersects: (target) => Math.hypot(target.x - hazard.x, target.y - hazard.y) <= target.radius + hazard.radius * 0.92
  });
  if (hits > 0) healPlayerFrom(Math.min(12, hits * 3), hazard.x, hazard.y, hazard.glow ?? "#d9b7ff", "HP");
  else spawnLeechTrail(hazard.x, hazard.y, 3, hazard.glow ?? "#d9b7ff");
  spawnMagicBloom(hazard.x, hazard.y, hazard.glow ?? "#d9b7ff", 38);
  spawnSlashSparks(hazard.x, hazard.y, -Math.PI * 0.5, hazard.glow ?? "#d9b7ff", 24);
  state.camera.shake = Math.max(state.camera.shake, 0.28);
}

function updatePlayerHazard(hazard, dt) {
  hazard.age = (hazard.age ?? 0) + dt;
  hazard.life -= dt;
  if (hazard.type === "thornSpear") {
    if (!hazard.didHit) {
      hazard.didHit = true;
      const hitSet = new Set();
      hitPlayerOwnedTargets({
        hitSet,
        amount: hazard.damage,
        direction: player.facing,
        options: {
          allowKnifeBreak: false,
          impactX: hazard.x,
          impactY: hazard.y - hazard.h * 0.55,
          angle: -Math.PI * 0.5,
          style: "thornSpear",
          hitStyle: "thornSpear",
          onHit: (target) => applyHazardRoot(target, hazard.rootDuration)
        },
        intersects: (target) => Math.abs(target.x - hazard.x) <= target.radius + hazard.w && target.y >= hazard.y - hazard.h - target.radius && target.y <= hazard.y + 18
      });
    }
    return;
  }
  if (hazard.type === "briarPatch") {
    hazard.tick -= dt;
    if (hazard.tick <= 0) {
      hazard.tick = hazard.tickRate;
      const hitSet = new Set();
      hitPlayerOwnedTargets({
        hitSet,
        amount: hazard.damage,
        direction: player.facing,
        options: {
          allowKnifeBreak: false,
          impactX: hazard.x,
          impactY: hazard.y - 24,
          angle: -Math.PI * 0.5,
          style: "briarPatch",
          hitStyle: "thornDot",
          onHit: (target) => applyHazardRoot(target, hazard.rootDuration)
        },
        intersects: (target) => Math.abs(target.x - hazard.x) <= hazard.radius + target.radius && target.y >= hazard.y - 92
      });
      spawnSlashSparks(hazard.x + rand(-hazard.radius * 0.7, hazard.radius * 0.7), hazard.y - rand(18, 58), -Math.PI * 0.5, hazard.glow, 2);
    }
    return;
  }
  if (hazard.type === "oldTreeRise") {
    if (!hazard.didHit && hazard.age >= hazard.delay) {
      hazard.didHit = true;
      const hitSet = new Set();
      const hits = hitPlayerOwnedTargets({
        hitSet,
        amount: hazard.damage,
        direction: player.facing,
        options: {
          allowKnifeBreak: false,
          impactX: hazard.x,
          impactY: hazard.y - 92,
          angle: -Math.PI * 0.5,
          style: "oldTreeRise",
          hitStyle: "treeEruption",
          onHit: (target) => applyHazardRoot(target, hazard.rootDuration)
        },
        intersects: (target) => {
          const trunkReach = Math.abs(target.x - hazard.x) <= hazard.radius + target.radius * 0.7 && target.y >= hazard.y - hazard.treeHeight - target.radius;
          const canopyReach = Math.hypot(target.x - hazard.x, target.y - (hazard.y - hazard.treeHeight + 80)) <= target.radius + (hazard.canopyRadius ?? hazard.radius * 0.72);
          return trunkReach || canopyReach;
        }
      });
      healPlayerFrom((hazard.heal ?? 12) + hits * 4, hazard.x, hazard.y - (hazard.treeHeight ?? 280) * 0.68, "#d8ecb2", "HP");
      spawnStoneChips(hazard.x, hazard.y - 5, player.facing, 34);
      spawnDust(hazard.x, hazard.y - 2, 36);
      spawnClassAbilityAccent("rootbound", hazard.x, hazard.y - (hazard.treeHeight ?? 280) * 0.7, -Math.PI * 0.5, 42);
      spawnMagicBloom(hazard.x, hazard.y - (hazard.treeHeight ?? 280) * 0.56, "#d8ecb2", isCoarsePointer() ? 18 : 34);
      state.camera.shake = Math.max(state.camera.shake, 0.36);
    }
    return;
  }
  if (hazard.type === "blackMaw") {
    for (const target of playerOwnedHitTargets()) {
      const dx = hazard.x - target.x;
      const dy = hazard.y - target.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > hazard.radius + target.radius) continue;
      const pull = (1 - clamp(dist / hazard.radius, 0, 1)) * 250 * dt;
      if (target.kind === "enemy") {
        target.entity.x += dx / dist * pull;
        target.entity.y += dy / dist * pull * 0.3;
      } else if (target.kind === "boss") {
        target.entity.x += dx / dist * pull * 0.22;
      } else if (target.kind === "dummy") {
        target.entity.x += dx / dist * pull * 0.1;
      }
    }
    hazard.tick -= dt;
    if (hazard.tick <= 0) {
      hazard.tick = hazard.tickRate;
      const hitSet = new Set();
      const hits = hitPlayerOwnedTargets({
        hitSet,
        amount: hazard.damage,
        direction: player.facing,
        options: { allowKnifeBreak: false, impactX: hazard.x, impactY: hazard.y, angle: -Math.PI * 0.5, style: "blackMaw", hitStyle: "voidTick" },
        intersects: (target) => Math.hypot(target.x - hazard.x, target.y - hazard.y) <= target.radius + hazard.radius
      });
      if (hits > 0) spawnLeechTrail(hazard.x + rand(-hazard.radius * 0.25, hazard.radius * 0.25), hazard.y + rand(-hazard.radius * 0.18, hazard.radius * 0.18), 2 + hits, hazard.glow);
      spawnSlashSparks(hazard.x + rand(-24, 24), hazard.y + rand(-24, 24), rand(-Math.PI, Math.PI), hazard.glow, 4);
    }
    if (hazard.life <= 0) explodeBlackMaw(hazard);
  }
}

function auraColors(aura) {
  return {
    duelist: ["#fff0b5", "#d6ad55"],
    combatist: ["#d75c35", "#9d3941"],
    ranger: ["#d8ecb2", "#6e8b4a"],
    imperial: ["#f2d27a", "#fff0b5"],
    archmage: ["#caa7ff", "#9b76f0"],
    underworlder: ["#9d3941", "#431115"],
    "briar skin": ["#d8ecb2", "#6e8b4a"],
    "pack memory": ["#fff0b5", "#9baa5f"],
    "ruin hide": ["#ffb07a", "#9d3941"],
    "beast form": ["#ffb07a", "#c94c38"],
    "red empty": ["#d9b7ff", "#8e5bd8"],
    "bone echo": ["#d8ecb2", "#9d9077"],
    "bad reflection": ["#d9b7ff", "#352542"]
  }[aura] ?? null;
}

function drawPlayerAura(x, footY) {
  const colors = beastFormActive() ? ["#ffb07a", "#c94c38"] : auraColors(player.progression?.aura);
  if (!colors) return;
  const pulse = 0.45 + Math.sin(state.time * 7.5) * 0.14;
  const height = player.h * 0.82;
  const top = footY - height - 6;
  ctx.save();
  ctx.globalAlpha = 0.18 + pulse * 0.2;
  ctx.fillStyle = colors[1];
  ctx.fillRect(x - 24, top + 10, 3, height - 8);
  ctx.fillRect(x + 22, top + 18, 3, height - 20);
  ctx.fillRect(x - 16, top - 2, 32, 3);
  ctx.globalAlpha = 0.28 + pulse * 0.26;
  ctx.fillStyle = colors[0];
  for (let i = 0; i < 4; i += 1) {
    const angle = state.time * (1.5 + i * 0.22) + i * 1.7;
    const px = x + Math.cos(angle) * (18 + i * 3);
    const py = top + 18 + Math.sin(angle * 1.2) * 22 + i * 9;
    ctx.fillRect(Math.floor(px), Math.floor(py), 4, 4);
  }
  ctx.restore();
}

function updateFx(dt) {
  state.hitSfxCooldown = Math.max(0, state.hitSfxCooldown - dt);
  state.dummyHitSfxCooldown = Math.max(0, state.dummyHitSfxCooldown - dt);
  state.enemyLungeSfxCooldown = Math.max(0, state.enemyLungeSfxCooldown - dt);
  updateAmbientMotes(dt);
  updateBurns(dt);

  for (const roar of state.roars) roar.life -= dt;
  state.roars = state.roars.filter((roar) => roar.life > 0);

  for (const summon of state.summons) {
    summon.life -= dt;
    summon.age += dt;
    if (summon.kind === "allyWolf") {
      updateAllyWolf(summon, dt);
    } else {
      summon.x += Math.cos(summon.angle) * summon.speed * dt;
      summon.y += Math.sin(summon.angle) * summon.speed * dt;
    }
  }
  state.summons = state.summons.filter((summon) => summon.life > 0);

  for (const slash of state.slashes) slash.life -= dt;
  state.slashes = state.slashes.filter((slash) => slash.life > 0);

  for (const p of state.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += (p.gravity ?? 0) * dt;
    p.vx *= p.drag ?? 0.985;
    if (p.y > state.room.floorY + 3 && p.kind === "fluid") {
      p.life = 0;
      addStain(p.x, state.room.floorY + 2, p.fluid, rand(5, 13));
    }
  }
  state.particles = state.particles.filter((p) => p.life > 0);

  for (const floater of state.floaters) {
    floater.life -= dt;
    floater.y -= 22 * dt;
  }
  state.floaters = state.floaters.filter((floater) => floater.life > 0);
}

function updateAllyWolf(summon, dt) {
  summon.biteCooldown = Math.max(0, (summon.biteCooldown ?? 0) - dt);
  const targets = playerOwnedHitTargets();
  let best = null;
  for (const target of targets) {
    const d = Math.hypot(target.x - summon.x, target.y - summon.y);
    if (!best || d < best.d) best = { target, d };
  }
  if (!best) {
    const homeX = player.x - player.facing * 54;
    summon.angle = Math.atan2(state.room.floorY - 34 - summon.y, homeX - summon.x);
    summon.x = lerp(summon.x, homeX, 0.05);
    summon.y = lerp(summon.y, state.room.floorY - 34, 0.06);
    return;
  }
  const target = best.target;
  summon.angle = Math.atan2(target.y - summon.y, target.x - summon.x);
  const speed = 265;
  summon.x += Math.cos(summon.angle) * speed * dt;
  summon.y += Math.sin(summon.angle) * speed * dt * 0.42;
  summon.y = clamp(summon.y, state.room.floorY - 150, state.room.floorY - 24);
  if (best.d < target.radius + 40 && summon.biteCooldown <= 0) {
    summon.biteCooldown = 0.55;
    applyPlayerOwnedHit(target, classAbilityDamage(14), sign(target.x - summon.x || player.facing), {
      allowKnifeBreak: false,
      impactX: target.x,
      impactY: target.y,
      angle: summon.angle,
      style: "wolfSpirit",
      hitStyle: "wolfBite"
    });
    spawnPunchBurst(target.x, target.y - 8, summon.angle, summon.glow, 10);
  }
}

function burnTargetAlive(burn) {
  if (burn.kind === "enemy") return burn.entity && !burn.entity.dead;
  if (burn.kind === "boss") return state.boss === burn.entity && burn.entity && !burn.entity.dead;
  if (burn.kind === "dummy") return state.dummies.includes(burn.entity);
  return false;
}

function burnTargetPosition(burn) {
  const entity = burn.entity;
  if (!entity) return { x: burn.lastX ?? player.x, y: burn.lastY ?? player.y };
  if (burn.kind === "enemy") return { x: entity.x, y: entity.y - 8 };
  if (burn.kind === "boss") return { x: entity.x, y: entity.y - entity.def.height * 0.22 };
  if (burn.kind === "dummy") return { x: entity.x, y: entity.y - 14 };
  return { x: burn.lastX ?? player.x, y: burn.lastY ?? player.y };
}

function applyBurnDamage(burn) {
  if (!burnTargetAlive(burn)) {
    burn.life = 0;
    return;
  }
  const amount = burn.damage;
  const pos = burnTargetPosition(burn);
  spawnSlashSparks(pos.x, pos.y, rand(-0.7, 0.7) + (burn.direction < 0 ? Math.PI : 0), "#ffb72f", isCoarsePointer() ? 3 : 5);
  spawnFloater(Math.round(amount), pos.x, pos.y - 22, "#ffb72f");
  if (burn.kind === "enemy") {
    burn.entity.hp -= amount;
    burn.entity.hurt = Math.max(burn.entity.hurt ?? 0, 0.08);
    if (burn.entity.hp <= 0) killEnemy(burn.entity, burn.direction);
  } else if (burn.kind === "boss") {
    burn.entity.hp = Math.max(0, burn.entity.hp - amount);
    burn.entity.hurt = Math.max(burn.entity.hurt ?? 0, 0.08);
    if (burn.entity.hp <= 0) killBoss();
  } else if (burn.kind === "dummy") {
    burn.entity.hurt = Math.max(burn.entity.hurt ?? 0, 0.08);
    burn.entity.hits.push({ t: state.time, amount });
  }
}

function updateBurns(dt) {
  for (const burn of state.burns) {
    if (!burnTargetAlive(burn)) {
      burn.life = 0;
      continue;
    }
    burn.life -= dt;
    burn.tick -= dt;
    burn.fx -= dt;
    const pos = burnTargetPosition(burn);
    burn.lastX = pos.x;
    burn.lastY = pos.y;
    if (burn.fx <= 0) {
      burn.fx = rand(0.16, 0.27);
      pushParticle({
        kind: "burn",
        x: pos.x + rand(-10, 10),
        y: pos.y + rand(-9, 9),
        vx: rand(-9, 9),
        vy: rand(-34, -18),
        size: rand(3, 6),
        color: Math.random() < 0.38 ? "#fff0b5" : "#ffb72f",
        life: rand(0.22, 0.42),
        max: 0.42,
        gravity: -20,
        drag: 0.95
      });
    }
    while (burn.tick <= 0 && burn.life > 0 && burnTargetAlive(burn)) {
      applyBurnDamage(burn);
      burn.tick += burn.tickRate;
    }
  }
  state.burns = state.burns.filter((burn) => burn.life > 0);
}

function updateDummies(dt) {
  for (const dummy of state.dummies) {
    dummy.hurt = Math.max(0, dummy.hurt - dt);
    dummy.hits = dummy.hits.filter((hit) => state.time - hit.t <= 5);
  }
}

function applyEquipmentEffects(dt = 0) {
  const effects = equippedEffects();
  const progression = ensureProgressionShape();
  player.shieldHabitCooldown = Math.max(0, (player.shieldHabitCooldown ?? 0) - dt);
  player.spikeRetortCooldown = Math.max(0, (player.spikeRetortCooldown ?? 0) - dt);
  const nextMaxHp = (currentClass().stats.maxHp ?? 100) + (effects.maxHp || 0) + (progression.hpBonus || 0) + basicStatBonus("maxHp");
  if (player.maxHp !== nextMaxHp) player.maxHp = nextMaxHp;
  player.maxSt = (currentClass().stats.maxStamina ?? 100) + (progression.staminaBonus || 0) + basicStatBonus("stamina");
  player.moveSpeed = (currentClass().stats.moveSpeed ?? 285) + (effects.moveSpeed || 0) + (progression.moveBonus || 0);
  player.hp = clamp(player.hp + ((effects.hpRegen || 0) + basicHpRegenBonus()) * dt, 0, player.maxHp);
  player.st = clamp(player.st, 0, player.maxSt);
}

function spawnFluid(x, y, fluid, count, direction = 1) {
  const total = Math.max(1, Math.round(count * 2));
  const dir = direction < 0 ? -1 : 1;
  for (let i = 0; i < total; i += 1) {
    const directional = i < total * 0.36;
    const speed = directional ? rand(260, 520) : rand(70, 300);
    const angle = directional ? (dir > 0 ? 0 : Math.PI) + rand(-0.28, 0.28) : rand(-1.25, 0.45) + (dir < 0 ? Math.PI : 0);
    const size = rand(2, 5);
    pushParticle({
      kind: "fluid",
      fluid,
      x: x + rand(-8, 8),
      y: y + rand(-12, 10),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - rand(40, 150),
      gravity: rand(520, 780),
      life: directional ? rand(0.22, 0.48) : rand(0.28, 0.74),
      max: directional ? 0.48 : 0.74,
      size,
      w: directional ? rand(6, 15) : size,
      h: directional ? rand(2, 4) : size,
      color: Math.random() < 0.55 ? fluid.primary : fluid.secondary
    });
  }
}

function spawnEnemyDeathBurst(x, y, fluid, direction = 1) {
  const compact = isCoarsePointer();
  const count = compact ? 8 : 13;
  const dir = direction < 0 ? -1 : 1;
  for (let i = 0; i < count; i += 1) {
    const angle = rand(-Math.PI, Math.PI);
    const speed = rand(120, 390);
    const size = rand(3, 7);
    pushParticle({
      kind: "fluid",
      fluid,
      x: x + rand(-7, 7),
      y: y + rand(-10, 8),
      vx: Math.cos(angle) * speed + dir * rand(35, 120),
      vy: Math.sin(angle) * speed - rand(95, 205),
      gravity: rand(580, 820),
      life: rand(0.24, 0.58),
      max: 0.58,
      size,
      w: rand(4, 9),
      h: rand(3, 7),
      color: pick([fluid.primary, fluid.secondary, fluid.dark], fluid.primary),
      alpha: 0.96
    });
  }
  pushParticle({
    kind: "fluid",
    fluid,
    x: x - 12,
    y: y - 6,
    vx: dir * rand(30, 70),
    vy: -rand(45, 90),
    gravity: 520,
    life: 0.18,
    max: 0.18,
    size: 1,
    w: 28,
    h: 12,
    color: fluid.dark,
    alpha: 0.62
  });
}

function spawnSlashSparks(x, y, angle, color, count) {
  for (let i = 0; i < count; i += 1) {
    const spread = angle + rand(-0.75, 0.75);
    const speed = rand(70, 250);
    pushParticle({
      kind: "spark",
      x: x + rand(-5, 5),
      y: y + rand(-5, 5),
      vx: Math.cos(spread) * speed,
      vy: Math.sin(spread) * speed - rand(10, 70),
      gravity: 360,
      life: rand(0.12, 0.28),
      max: 0.28,
      size: rand(2, 5),
      color: Math.random() < 0.35 ? "#fff1bb" : color
    });
  }
}

function spawnPunchBurst(x, y, angle, color = "#d6ad55", count = 12) {
  for (let i = 0; i < count; i += 1) {
    const spread = angle + rand(-0.42, 0.42);
    const speed = rand(120, 360);
    pushParticle({
      kind: "spark",
      x: x + rand(-4, 4),
      y: y + rand(-8, 8),
      vx: Math.cos(spread) * speed,
      vy: Math.sin(spread) * speed - rand(0, 45),
      gravity: 430,
      life: rand(0.1, 0.22),
      max: 0.22,
      size: rand(3, 7),
      color: Math.random() < 0.5 ? "#fff0b5" : color
    });
  }
  spawnDust(x - Math.cos(angle) * 12, y + 36, 4);
}

function spawnBugChargeBurst(x, y, direction = 1, count = 12) {
  const angle = direction >= 0 ? 0 : Math.PI;
  for (let i = 0; i < count; i += 1) {
    const spread = angle + rand(-0.45, 0.45);
    const speed = rand(140, 360);
    pushParticle({
      kind: "bugCharge",
      x: x + rand(-7, 7),
      y: y + rand(-12, 10),
      vx: Math.cos(spread) * speed + direction * rand(45, 120),
      vy: Math.sin(spread) * speed - rand(12, 76),
      gravity: 420,
      life: rand(0.18, 0.36),
      max: 0.36,
      size: rand(3, 7),
      color: pick(["#d6ad55", "#6e8b4a", "#384b2e", "#fff0b5"], "#d6ad55"),
      drag: 0.9,
      alpha: 0.94
    });
  }
}

function spawnDashTrail(x, y, direction = 1, count = 4) {
  for (let i = 0; i < count; i += 1) {
    pushParticle({
      kind: "dashTrail",
      x: x - direction * rand(0, 38),
      y: y + rand(-18, 12),
      vx: -direction * rand(55, 145),
      vy: rand(-26, 18),
      gravity: 170,
      life: rand(0.12, 0.24),
      max: 0.24,
      size: rand(3, 8),
      w: rand(8, 22),
      h: rand(2, 5),
      color: pick(["#6f3fc9", "#5230a0", "#26233d", "#9b7af0"], "#6f3fc9"),
      drag: 0.88,
      alpha: 0.68
    });
  }
}

function spawnBugChargeTrail(x, y, direction = 1) {
  for (let i = 0; i < 5; i += 1) {
    pushParticle({
      kind: "bugChargeTrail",
      x: x - direction * rand(0, 34),
      y: y + rand(-14, 12),
      vx: -direction * rand(40, 120),
      vy: rand(-36, 22),
      gravity: 260,
      life: rand(0.16, 0.3),
      max: 0.3,
      size: rand(4, 9),
      color: pick(["#1a2217", "#384b2e", "#6e8b4a", "#d6ad55"], "#384b2e"),
      drag: 0.86,
      alpha: 0.82
    });
  }
}

function spawnMagicBloom(x, y, color = "#9b76f0", count = 12) {
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * TAU;
    const speed = rand(45, 150);
    pushParticle({
      kind: "spark",
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      gravity: 70,
      life: rand(0.16, 0.32),
      max: 0.32,
      size: rand(3, 8),
      color: Math.random() < 0.45 ? "#caa7ff" : color
    });
  }
}

function spawnHitBurst(x, y, angle, color, style = "slash", count = 10) {
  if (style === "brawlerWraps" || style?.startsWith("punch") || style?.startsWith("claw") || style?.startsWith("beast") || style === "uppercut") {
    spawnPunchBurst(x, y, angle, color, style?.startsWith("beast") ? count + 11 : count + 5);
    if (style === "punchUpper" || style === "uppercut" || style === "beastUppercut") spawnDust(x - Math.cos(angle) * 18, y + 34, 5);
    if (style?.startsWith("beast")) spawnStoneChips(x, y + 28, Math.cos(angle) >= 0 ? 1 : -1, 5);
  } else if (style === "bugCharge") {
    spawnBugChargeBurst(x, y, Math.cos(angle) >= 0 ? 1 : -1, count + 4);
  } else if (style === "magic" || style?.startsWith("wand") || style?.startsWith("scepter")) {
    spawnMagicBloom(x, y, color, count);
    if (style === "scepterBloom") spawnMagicBloom(x, y, "#fff0b5", Math.ceil(count * 0.75));
  } else if (style?.startsWith("axe")) {
    spawnSlashSparks(x, y, angle, color, count + 3);
    spawnStoneChips(x, y, Math.cos(angle) >= 0 ? 1 : -1, 4);
  } else if (style?.startsWith("great")) {
    spawnSlashSparks(x, y, angle, color, count + 5);
    spawnDust(x, y + 42, 5);
    spawnStoneChips(x, y, Math.cos(angle) >= 0 ? 1 : -1, 5);
  } else if (style?.startsWith("spear")) {
    spawnSlashSparks(x, y, angle, "#fff0b5", Math.ceil(count * 0.65));
    spawnSlashSparks(x, y, angle, color, Math.ceil(count * 0.45));
  } else if (style?.startsWith("dual")) {
    spawnSlashSparks(x, y, angle - 0.55, color, Math.ceil(count * 0.55));
    spawnSlashSparks(x, y, angle + 0.55, "#fff0b5", Math.ceil(count * 0.55));
  } else if (style?.startsWith("arrow") || style?.startsWith("bolt")) {
    spawnSlashSparks(x, y, angle + Math.PI, color, Math.ceil(count * 0.75));
    if (style === "boltHeavy") spawnStoneChips(x, y, Math.cos(angle) >= 0 ? 1 : -1, 3);
  } else if (style?.startsWith("dagger")) {
    spawnSlashSparks(x, y, angle, "#fff0b5", Math.ceil(count * 0.45));
    spawnSlashSparks(x, y, angle, color, Math.ceil(count * 0.45));
  } else {
    spawnSlashSparks(x, y, angle, color, count);
  }
}

function spawnChestSparkle(x, y) {
  for (let i = 0; i < 18; i += 1) {
    const angle = -Math.PI * 0.5 + rand(-1.2, 1.2);
    const speed = rand(80, 260);
    pushParticle({
      kind: "spark",
      x: x + rand(-18, 18),
      y: y + rand(-8, 8),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      gravity: 420,
      life: rand(0.24, 0.58),
      max: 0.58,
      size: rand(3, 6),
      color: Math.random() < 0.5 ? "#fff0b5" : "#d6ad55"
    });
  }
}

function addStain(x, y, fluid, radius) {
  const pieces = Math.max(3, Math.floor(radius / 8));
  for (let i = 0; i < pieces; i += 1) {
    state.stains.push({
      x: x + rand(-radius, radius),
      y: y + rand(-5, 5),
      w: rand(5, radius * 0.4),
      h: rand(2, 7),
      color: fluid.stain
    });
  }
  if (state.stains.length > 260) state.stains.splice(0, state.stains.length - 260);
}

function spawnDust(x, y, count) {
  for (let i = 0; i < count; i += 1) {
    pushParticle({
      kind: "dust",
      x: x + rand(-12, 12),
      y,
      vx: rand(-80, 80),
      vy: rand(-140, -30),
      gravity: 480,
      life: rand(0.24, 0.48),
      max: 0.48,
      size: rand(2, 6),
      color: "rgba(159, 150, 118, 0.56)"
    });
  }
}

function spawnBossIntroSmoke(x, floorY, intensity = 1) {
  const compactFx = isCoarsePointer();
  const count = Math.round((compactFx ? 34 : 54) * intensity);
  for (let i = 0; i < count; i += 1) {
    const angle = rand(-Math.PI * 0.92, -Math.PI * 0.08);
    const speed = rand(90, 330 + 110 * intensity);
    const life = rand(0.48, 1.05);
    pushParticle({
      kind: "bossSmoke",
      x: x + rand(-72, 72) * intensity,
      y: floorY - rand(8, 44 + 20 * intensity),
      vx: Math.cos(angle) * speed + rand(-50, 50),
      vy: Math.sin(angle) * speed - rand(40, 120),
      gravity: rand(160, 310),
      life,
      max: life,
      size: rand(5, compactFx ? 12 : 17 + 5 * intensity),
      alpha: rand(0.5, 0.9),
      color: Math.random() < 0.5 ? "rgba(92,93,85,.78)" : "rgba(47,56,39,.72)"
    });
  }
  for (let i = 0; i < Math.round((compactFx ? 2 : 4) * intensity); i += 1) {
    spawnMossDust(x + rand(-105, 105) * intensity, floorY - 2, compactFx ? 6 : 10);
  }
  spawnStoneChips(x, floorY - 6, 1, Math.round((compactFx ? 8 : 14) * intensity));
  spawnStoneChips(x, floorY - 6, -1, Math.round((compactFx ? 8 : 14) * intensity));
}

function spawnBossDefeatBurst(x, y, fluid) {
  const compactFx = isCoarsePointer();
  const bloodBursts = compactFx ? 7 : 11;
  const sparkCount = compactFx ? 34 : 58;
  for (let i = 0; i < bloodBursts; i += 1) {
    spawnFluid(x + rand(-95, 95), y + rand(-48, 42), fluid, compactFx ? 20 : 26, rand(-1, 1));
  }
  for (let i = 0; i < sparkCount; i += 1) {
    const angle = rand(-Math.PI * 0.95, -Math.PI * 0.05);
    const speed = rand(90, compactFx ? 330 : 430);
    const life = rand(0.34, 0.86);
    pushParticle({
      kind: "bossVictory",
      x: x + rand(-90, 90),
      y: y + rand(-64, 32),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - rand(20, 120),
      gravity: rand(220, 420),
      life,
      max: life,
      size: rand(4, compactFx ? 9 : 13),
      alpha: rand(0.74, 1),
      color: Math.random() < 0.45 ? "#fff0b5" : "#d6ad55"
    });
  }
  for (let i = 0; i < (compactFx ? 5 : 8); i += 1) {
    spawnMossDust(x + rand(-120, 120), state.room.floorY, compactFx ? 8 : 12);
  }
  spawnStoneChips(x - 48, state.room.floorY - 6, -1, compactFx ? 12 : 18);
  spawnStoneChips(x + 48, state.room.floorY - 6, 1, compactFx ? 12 : 18);
  spawnItemPop(x, y - 78, "#fff0b5");
}

function spawnRecipeBurst(x, y, recipe, count = null, options = {}) {
  const total = count ?? rangeCount(recipe.burstCount, 6);
  const spread = ((options.scatterDegrees ?? recipe.scatterDegrees ?? 90) * Math.PI) / 180;
  const baseAngle = options.angle ?? -Math.PI * 0.5;
  const layer = options.layer ?? recipe.layer ?? "foreground";
  for (let i = 0; i < total; i += 1) {
    const angle = baseAngle + rand(-spread * 0.5, spread * 0.5);
    const speed = rangeValue(recipe.speed, 80);
    const life = rangeValue(recipe.lifetime, 0.45);
    pushParticle({
      kind: recipe.id,
      layer,
      x: x + rand(-8, 8),
      y: y + rand(-5, 5),
      vx: Math.cos(angle) * speed + (options.vx ?? 0),
      vy: Math.sin(angle) * speed + (options.vy ?? 0),
      gravity: recipe.gravity ?? 0,
      life,
      max: life,
      size: rangeValue(recipe.size, 3),
      alpha: rangeValue(recipe.alpha, 1),
      color: pick(recipe.colors, "#d6ad55")
    });
  }
}

function spawnMossDust(x, y, count = null) {
  spawnRecipeBurst(x, y, MOSS_DUST, count, { angle: -Math.PI * 0.5 });
}

function spawnStoneChips(x, y, direction = 1, count = null) {
  const angle = direction >= 0 ? -0.72 : Math.PI + 0.72;
  spawnRecipeBurst(x, y, STONE_CHIPS, count, { angle, scatterDegrees: 78 });
}

function spawnClassAbilityAccent(classId, x, y, angle = 0, count = 6) {
  const colors = CLASS_ABILITY_ACCENT_COLORS[classId] ?? CLASS_ABILITY_ACCENT_COLORS.rootbound;
  for (let i = 0; i < count; i += 1) {
    const spread = angle + rand(-0.62, 0.62);
    const speed = rand(80, 240);
    const life = rand(0.12, 0.28);
    pushParticle({
      kind: "classAccent",
      x: x + rand(-4, 4),
      y: y + rand(-5, 5),
      vx: Math.cos(spread) * speed,
      vy: Math.sin(spread) * speed - rand(0, 35),
      gravity: 190,
      life,
      max: life,
      size: rand(3, 7),
      alpha: 0.98,
      color: Math.random() < 0.35 ? colors.glow : colors.primary
    });
  }
}

function spawnAbilityCastBurst(classId, label = "R") {
  const colors = CLASS_ABILITY_ACCENT_COLORS[classId] ?? CLASS_ABILITY_ACCENT_COLORS.rootbound;
  const baseY = player.y - 18;
  const count = isCoarsePointer() ? 12 : 18;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * TAU;
    const speed = rand(50, 136);
    const life = rand(0.18, 0.34);
    pushParticle({
      kind: "abilityCast",
      x: player.x + Math.cos(angle) * 8,
      y: baseY + Math.sin(angle) * 5,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 0.72,
      gravity: 35,
      life,
      max: life,
      size: rand(3, 7),
      alpha: 0.9,
      color: i % 3 === 0 ? colors.glow : colors.primary
    });
  }
  spawnFloater(label, player.x, player.y - player.h * 0.8, colors.glow);
}

function spawnPiercingLaunchFlash(x, y, angle) {
  spawnClassAbilityAccent("elf", x, y, angle + Math.PI, isCoarsePointer() ? 8 : 13);
  for (let i = 0; i < (isCoarsePointer() ? 5 : 8); i += 1) {
    const spread = angle + rand(-0.08, 0.08);
    const life = rand(0.11, 0.18);
    pushParticle({
      kind: "pierceFlash",
      x: x - Math.cos(angle) * rand(6, 20),
      y: y - Math.sin(angle) * rand(6, 20),
      vx: -Math.cos(spread) * rand(90, 180),
      vy: -Math.sin(spread) * rand(90, 180),
      gravity: 30,
      life,
      max: life,
      size: rand(3, 6),
      alpha: 0.95,
      color: Math.random() < 0.45 ? "#fff0b5" : "#d8ecb2"
    });
  }
}

function spawnArcaneCastRing(x, y) {
  spawnMagicBloom(x, y, "#caa7ff", isCoarsePointer() ? 10 : 16);
  for (let i = 0; i < (isCoarsePointer() ? 8 : 14); i += 1) {
    const angle = (i / (isCoarsePointer() ? 8 : 14)) * TAU;
    const life = rand(0.18, 0.34);
    pushParticle({
      kind: "arcaneRing",
      x: x + Math.cos(angle) * 18,
      y: y + Math.sin(angle) * 12,
      vx: Math.cos(angle) * rand(28, 90),
      vy: Math.sin(angle) * rand(28, 90),
      gravity: 12,
      life,
      max: life,
      size: rand(3, 8),
      alpha: 0.86,
      color: Math.random() < 0.5 ? "#efe1ff" : "#9b76f0"
    });
  }
}

function spawnKnifeShardBurst(x, y, direction = 1) {
  const sections = [
    { config: KNIFE_BREAK_BURST.shards, kind: "knifeShard", angle: direction >= 0 ? -0.5 : Math.PI + 0.5 },
    { config: KNIFE_BREAK_BURST.sparks, kind: "knifeSpark", angle: direction >= 0 ? -0.2 : Math.PI + 0.2 },
    { config: KNIFE_BREAK_BURST.dust, kind: "knifeDust", angle: -Math.PI * 0.5 }
  ];
  for (const section of sections) {
    for (let i = 0; i < section.config.count; i += 1) {
      const spread = section.angle + rand(-0.9, 0.9);
      const speed = rangeValue(section.config.speed, 100);
      const life = rangeValue(section.config.lifetime, 0.5);
      pushParticle({
        kind: section.kind,
        x: x + rand(-8, 8),
        y: y + rand(-8, 8),
        vx: Math.cos(spread) * speed,
        vy: Math.sin(spread) * speed - rand(10, 80),
        gravity: section.config.gravity ?? 260,
        life,
        max: life,
        size: rangeValue(section.config.size, 3),
        color: pick(section.config.colors, "#fff0b5"),
        alpha: section.kind === "knifeSpark" ? 0.96 : 1
      });
    }
  }
}

function spawnAmbientMote() {
  if (!state.room) return;
  const draw = worldDrawBounds(state.room);
  const viewW = W / Math.max(0.1, state.camera.zoom);
  const viewH = H / Math.max(0.1, state.camera.zoom);
  const left = state.camera.x - viewW * 0.5;
  const top = state.camera.y - viewH * 0.5;
  const life = rangeValue(AMBIENT_MOTES.lifetime, 4.8);
  pushParticle({
    kind: "ambientMote",
    layer: "background",
    x: clamp(left + rand(viewW * 0.05, viewW * 0.95), draw.left + 24, draw.right - 24),
    y: clamp(top + rand(viewH * 0.1, viewH * 0.58), 30, state.room.floorY - 24),
    vx: rangeValue(AMBIENT_MOTES.drift.x, 0),
    vy: rangeValue(AMBIENT_MOTES.drift.y, -8),
    gravity: 0,
    life,
    max: life,
    size: rangeValue(AMBIENT_MOTES.size, 1.4),
    alpha: rangeValue(AMBIENT_MOTES.alpha, 0.18),
    color: pick(AMBIENT_MOTES.colors, "#d4c78e")
  });
}

function updateAmbientMotes(dt) {
  let active = 0;
  for (const particle of state.particles) {
    if (particle.kind === "ambientMote") active += 1;
  }
  if (active >= AMBIENT_MOTES.maxParticles) return;
  state.ambientTimer -= dt;
  const interval = 1 / Math.max(1, AMBIENT_MOTES.spawnRate);
  let spawned = 0;
  while (state.ambientTimer <= 0 && active + spawned < AMBIENT_MOTES.maxParticles && spawned < 3) {
    spawnAmbientMote();
    spawned += 1;
    state.ambientTimer += rand(interval * 0.72, interval * 1.35);
  }
}

function spawnItemPop(x, y, color) {
  for (let i = 0; i < 28; i += 1) {
    const angle = (i / 28) * TAU;
    pushParticle({
      kind: "glow",
      x,
      y,
      vx: Math.cos(angle) * rand(80, 220),
      vy: Math.sin(angle) * rand(80, 220),
      gravity: 80,
      life: rand(0.35, 0.7),
      max: 0.7,
      size: rand(3, 6),
      color
    });
  }
}

function spawnLevelUpBurst(x, y, color = "#fff0b5") {
  spawnItemPop(x, y, color);
  const compactFx = isCoarsePointer();
  const count = compactFx ? 28 : 48;
  const palette = ["#fff6a8", "#ffd84d", "#ffb72f"];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * TAU;
    const speed = rand(100, compactFx ? 260 : 350);
    pushParticle({
      kind: "levelUp",
      x: x + rand(-8, 8),
      y: y + rand(-10, 10),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - rand(20, 110),
      gravity: 180,
      life: rand(0.42, 0.9),
      max: 0.9,
      size: rand(4, compactFx ? 9 : 12),
      color: pick(palette, color),
      alpha: 0.94,
      layer: "foreground"
    });
  }
}

function spawnFloater(text, x, y, color) {
  state.floaters.push({ text, x, y, color, life: 0.7, max: 0.7 });
}

function addCoins(amount, x = player.x, y = player.y - player.h * 0.7) {
  if (!amount) return;
  player.coins = Math.max(0, player.coins + amount);
  spawnFloater(`${amount > 0 ? "+" : ""}${amount} coins`, x, y, amount > 0 ? "#d6ad55" : "#b9a98c");
  if (amount > 0) {
    spawnSlashSparks(x, y + 18, -Math.PI * 0.5, "#d6ad55", isCoarsePointer() ? 4 : 7);
  }
}

function promptClassFor(action) {
  if (!action) return "";
  if (action.type === "corpse") return "promptCorpse";
  if (action.type === "scrap") return "promptCorpse";
  if (action.type === "pickup") return "promptPickup";
  if (action.type === "chest") return "promptPickup";
  if (action.type === "merchant") return "promptPickup";
  if (action.type === "exit" && !action.open) return "promptBlocked";
  if (action.type === "exit") return "promptExit";
  return "";
}

function journalReminderText() {
  if (!state.flags.journalFound || cinematicLocksControls()) return "";
  const journalLabel = journalPromptLabel();
  const progression = ensureProgressionShape();
  if (isSandboxRun() && progression.unlocked) return `${journalLabel} - sandbox memory/basic points: INF`;
  if (progression.unlocked && progression.basicStatPoints > 0) return `${journalLabel} - basic stat point`;
  if (progression.unlocked && progression.skillPoints > 0) {
    return `${journalLabel} - memory point`;
  }
  if (state.journalUnread) return `${journalLabel} - check your diary`;
  if (progression.unlocked && linearSkillProgress() < LINEAR_SKILL_NODE_COUNT && progression.level <= 2) {
    return `${journalLabel} - memory line`;
  }
  return "";
}

function updateRoomState(dt) {
  const action = findPromptAction();
  state.promptAction = action;
  const reminder = journalReminderText();
  if (action) {
    ui.prompt.textContent = action.text;
    ui.prompt.className = `journalPanel visible ${promptClassFor(action)}`;
  } else if (state.toastTimer > 0) {
    ui.prompt.textContent = state.toastText;
    ui.prompt.className = "journalPanel visible";
  } else if (reminder) {
    ui.prompt.textContent = reminder;
    ui.prompt.className = "journalPanel visible promptCorpse";
  } else {
    ui.prompt.className = "journalPanel";
  }

  if (state.toastTimer > 0) state.toastTimer -= dt;
  updatePickups(dt);
  state.pickups = state.pickups.filter((pickup) => !pickup.dead);
  state.scraps = state.scraps.filter((scrap) => !scrap.dead);
}

function updatePickups(dt) {
  for (const pickup of state.pickups) {
    if (pickup.dead) continue;
    pickup.restY ??= state.room.floorY - 24;
    pickup.vx ??= 0;
    pickup.vy ??= 0;
    if (!pickup.vx && !pickup.vy && pickup.y >= pickup.restY) continue;
    pickup.x = clamp(pickup.x + pickup.vx * dt, 48, state.room.width - 48);
    pickup.y += pickup.vy * dt;
    pickup.vy += WORLD.gravity * 0.72 * dt;
    pickup.vx *= Math.pow(0.18, dt);
    if (pickup.y >= pickup.restY) {
      pickup.y = pickup.restY;
      if (Math.abs(pickup.vy) > 95) {
        pickup.vy *= -0.22;
        pickup.vx *= 0.68;
        spawnSlashSparks(pickup.x, pickup.y - 6, -Math.PI * 0.5, "#d6ad55", 4);
      } else {
        pickup.vy = 0;
        pickup.vx = 0;
        if (!pickup.landed) {
          pickup.landed = true;
          spawnSlashSparks(pickup.x, pickup.y - 8, -Math.PI * 0.5, "#d6ad55", 6);
        }
      }
    }
  }
}

function updateCamera(dt) {
  const cinematic = state.cinematic;
  state.camera.recenterTimer = Math.max(0, (state.camera.recenterTimer ?? 0) - dt);
  const recentering = state.camera.recenterTimer > 0;
  const fighting =
    state.enemies.some((enemy) => !enemy.dead && (enemy.seesPlayer || enemy.chaseTimer > 0 || Math.abs(enemy.x - player.x) < 260)) ||
    !!state.boss;
  const wakingClose = state.roomId === "wakingStones" && state.time < 2.2 && !state.opening.moved;
  let targetZoom = fighting ? 0.92 : wakingClose ? 1.34 : 1.18;
  const zoomEase = 1 - Math.pow(0.12, dt);
  const leadEase = 1 - Math.pow(0.02, dt);
  const cameraEase = 1 - Math.pow(0.005, dt);
  let focusX = null;
  let focusY = H * 0.5;
  if (cinematic?.type === "openingReveal") {
    targetZoom = 1.36;
    focusX = player.x + 48;
  } else if (cinematic?.type === "journalFocus") {
    targetZoom = 1.54;
    focusX = cinematic.targetX;
    focusY = clamp(cinematic.targetY + 40, H * 0.42, H * 0.58);
  } else if (cinematic?.type === "starterChestFocus") {
    targetZoom = 1.54;
    focusX = cinematic.targetX;
    focusY = clamp(cinematic.targetY + 40, H * 0.42, H * 0.58);
  } else if (cinematic?.type === "journalScrapFlashback") {
    targetZoom = cinematic.time < 0.9 ? 1.42 : 1.1;
    focusX = cinematic.time < 0.55 ? cinematic.targetX : player.x;
    focusY = clamp(cinematic.targetY + 44, H * 0.42, H * 0.58);
  } else if (cinematic?.type === "bossIntro") {
    targetZoom = cinematic.spawned ? 1.18 : cinematic.warningShown ? 1.42 : 1.28;
    focusX = state.room.width * (cinematic.spawned ? 0.68 : 0.64);
    focusY = cinematic.warningShown ? H * 0.54 : H * 0.5;
  } else if (cinematic?.type === "bossDefeat") {
    targetZoom = cinematic.time < 1.15 ? 1.36 : 1.18;
    focusX = cinematic.time < 1.15 ? cinematic.targetX : player.x;
    focusY = clamp(cinematic.targetY + 18, H * 0.42, H * 0.58);
  } else if (cinematic?.type === "doorTransition") {
    targetZoom = cinematic.entered ? 1.18 : 1.12;
    focusX = cinematic.entered ? player.x : cinematic.fromX;
    focusY = H * 0.5;
  } else if (cinematic?.type === "ferryBoat") {
    targetZoom = 1.28;
    focusX = cinematic.boatX ?? player.x;
    focusY = clamp((cinematic.waterY ?? state.room.floorY - 40) - 16, H * 0.42, H * 0.58);
  } else if (cinematic?.type === "starterWeaponClaim") {
    targetZoom = 1.38;
    focusX = player.x + player.facing * 38;
    focusY = clamp(player.y - 10, H * 0.42, H * 0.58);
  }
  state.camera.zoom = lerp(state.camera.zoom, targetZoom, zoomEase);
  const { minX: minCameraX, maxX: maxCameraX } = cameraBounds(state.room, state.camera.zoom);
  let desiredLead = recentering ? 0 : focusX === null && wakingClose ? 80 : focusX === null && Math.abs(player.vx) > 55 ? sign(player.vx) * 54 : 0;
  const leftPinned = player.x < minCameraX + 130;
  const rightPinned = player.x > maxCameraX - 130;
  if ((leftPinned && desiredLead < 0) || (rightPinned && desiredLead > 0)) desiredLead = 0;
  state.camera.leadX = lerp(state.camera.leadX || 0, desiredLead, leadEase);
  const targetX = clamp(focusX ?? player.x + state.camera.leadX, minCameraX, maxCameraX);
  state.camera.x = clamp(lerp(state.camera.x, targetX, cameraEase), minCameraX, maxCameraX);
  state.camera.y = lerp(state.camera.y, focusY, cameraEase);
  state.camera.shake = Math.max(0, state.camera.shake - dt);
}

function setAimVector(x, y) {
  const length = Math.hypot(x, y) || 1;
  player.aimX = x / length;
  player.aimY = y / length;
  player.aimAngle = Math.atan2(player.aimY, player.aimX);
}

function update(dt) {
  if (state.mode !== "play") return;
  state.time += dt;
  if (state.cinematic) {
    updateCinematic(dt);
    updateFx(dt);
    updateCamera(dt);
    updateHud();
    return;
  }
  if (state.hitPause > 0) {
    state.hitPause = Math.max(0, state.hitPause - dt);
    updateDummies(dt * 0.35);
    updateFx(dt * 0.35);
    updateRoomState(dt);
    updateCamera(dt * 0.35);
    updateHud();
    return;
  }
  if (startRoomBossIfNeeded(state.room)) {
    updateHud();
    return;
  }
  updateInput(dt);
  updatePlayer(dt);
  updateDashDamage(dt);
  updateProjectiles(dt);
  updateEnemyProjectiles(dt);
  updateEnemies(dt);
  updateBoss(dt);
  updateDummies(dt);
  updateHazards(dt);
  updateFx(dt);
  updateRoomState(dt);
  updateCamera(dt);
  updateHud();
}

function updateHud() {
  document.body.dataset.mode = state.mode;
  document.body.dataset.runMode = state.runMode;
  document.body.dataset.pendingRunMode = state.pendingRunMode;
  document.body.dataset.roomId = state.roomId;
  document.body.dataset.starterWeaponClaimed = String(Boolean(state.flags.starterWeaponClaimed));
  applyEquipmentEffects(0);
  const klass = currentClass();
  const ability = klass.ability;
  const unlocked = abilityUnlocked();
  const stage = originAbilityStage();
  const ready = unlocked && player.abilityCooldown <= 0;
  const charge = ready ? 100 : clamp(100 - (player.abilityCooldown / Math.max(player.abilityMaxCooldown || ability.cooldown, 0.001)) * 100, 0, 100);
  ui.hpText.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;
  ui.hpFill.style.width = formatPercent(player.hp, player.maxHp);
  ui.stFill.style.width = formatPercent(player.st, player.maxSt);
  const activeWeapon = currentWeapon();
  ui.weaponText.textContent = `${player.activeWeaponSlot === "secondaryWeapon" ? "2" : "1"} ${activeWeapon.name}`;
  ui.journalText.textContent = state.flags.journalFound ? "found" : "not found";
  if (ui.coinText) ui.coinText.textContent = isSandboxRun() ? "INF" : String(player.coins);
  ui.roomText.textContent = state.room ? state.room.name : "Waking Stones";
  ui.xpPanel?.classList.toggle("visible", player.progression.unlocked);
  if (player.progression.unlocked && ui.levelText && ui.xpText && ui.xpFill) {
    ui.levelText.textContent = `LV ${player.progression.level}`;
    ui.xpText.textContent = `${Math.floor(player.progression.xp)} / ${player.progression.xpNext}`;
    ui.xpFill.style.width = formatPercent(player.progression.xp, player.progression.xpNext);
  }
  ui.abilityText.textContent = unlocked ? abilityOrbLabel(ability) : "Lock";
  ui.abilityKey.textContent = unlocked ? (ready ? ability.hint : Math.ceil(player.abilityCooldown)) : "BOSS";
  ui.abilityFill.style.height = `${unlocked ? charge : 0}%`;
  ui.abilityOrb.classList.toggle("ready", ready);
  ui.abilityOrb.classList.toggle("locked", !unlocked);
  ui.abilityOrb.dataset.class = klass.id;
  ui.abilityOrb.dataset.ability = ability.id;
  ui.abilityOrb.dataset.stage = stage;
  ui.abilityOrb.setAttribute("aria-label", unlocked ? `${ability.name} origin ability` : `${ability.name} locked until the starter weapon`);
  ui.abilityOrb.style.transform = player.abilityFlash > 0 ? `scale(${1 + player.abilityFlash * 0.28})` : "";
  ui.extraAbilityPanel?.classList.toggle("visible", player.progression.unlocked);
  for (const button of ui.extraAbilityButtons) {
    const key = button.dataset.key;
    const learned = learnedAbilityByKey(key);
    const cooldown = learned ? player.extraAbilityCooldowns[learned.id] ?? 0 : 0;
    const readyExtra = Boolean(learned && cooldown <= 0);
    const maxCooldown = learned ? learnedAbilityCooldownSeconds(learned) : 1;
    const cooldownFill = learned ? (readyExtra ? 100 : clamp(100 - (cooldown / Math.max(maxCooldown, 0.001)) * 100, 0, 100)) : 0;
    button.classList.toggle("locked", !learned);
    button.classList.toggle("ready", readyExtra);
    button.dataset.class = learned?.classId ?? player.classId;
    button.dataset.ability = learned?.id ?? "empty";
    button.style.setProperty("--cooldown-fill", `${cooldownFill}%`);
    button.querySelector(".extraAbilityKey").textContent = key;
    button.querySelector(".extraAbilityName").textContent = learned ? learned.label : "empty";
    button.querySelector(".extraAbilityCd").textContent = learned ? (cooldown > 0 ? Math.ceil(cooldown) : "ready") : "--";
    button.setAttribute("aria-label", learned ? `${key} ${learned.name}` : `${key} empty learned ability slot`);
  }
}

function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = activeCinematic("openingReveal") ? "#010101" : state.room ? "#92b8ca" : "#050605";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  viewport.scale = Math.min(canvas.width / W, canvas.height / H);
  viewport.offsetX = Math.floor((canvas.width - W * viewport.scale) * 0.5);
  viewport.offsetY = Math.floor((canvas.height - H * viewport.scale) * 0.5);
  ctx.setTransform(viewport.scale, 0, 0, viewport.scale, viewport.offsetX, viewport.offsetY);
  if (!state.room) {
    drawEmpty();
    return;
  }
  drawWorld();
}

function drawWorld() {
  ctx.save();
  const shakeScale = state.options.screenShake === "soft" ? 0.45 : 1;
  const shakeX = state.camera.shake > 0 ? rand(-8, 8) * state.camera.shake * shakeScale : 0;
  const shakeY = state.camera.shake > 0 ? rand(-5, 5) * state.camera.shake * shakeScale : 0;
  ctx.translate(W * 0.5 + shakeX, H * 0.5 + shakeY);
  ctx.scale(state.camera.zoom, state.camera.zoom);
  ctx.translate(-state.camera.x, -state.camera.y);

  drawBackground();
  drawParticles("background");
  drawStains();
  drawFloorRim();
  drawWater();
  drawPlatforms();
  drawReadableBiomeBorders();
  drawParticles("midground");
  drawExits();
  drawCorpse();
  drawJournalScraps();
  drawChests();
  drawMerchants();
  drawFerry();
  drawPickups();
  drawInteractionMarkers();
  drawHazards();
  drawTrainingDummies();
  drawBoss();
  drawEnemies();
  drawPlayer();
  drawOpeningGuide();
  drawRoars();
  drawSummons();
  drawSlashes();
  drawProjectiles();
  drawEnemyProjectiles();
  drawParticles("foreground");
  drawFloaters();
  ctx.restore();
  drawOpeningOverlay();
}

function screenCoverBounds() {
  const scale = viewport.scale || 1;
  const left = -viewport.offsetX / scale;
  const top = -viewport.offsetY / scale;
  const width = canvas.width / scale;
  const height = canvas.height / scale;
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height
  };
}

function screenCoverRadius(center, bounds = screenCoverBounds()) {
  return Math.max(
    Math.hypot(center.x - bounds.left, center.y - bounds.top),
    Math.hypot(center.x - bounds.right, center.y - bounds.top),
    Math.hypot(center.x - bounds.left, center.y - bounds.bottom),
    Math.hypot(center.x - bounds.right, center.y - bounds.bottom)
  ) + 8;
}

function drawBlackIris(center, radius, alpha = 1) {
  const bounds = screenCoverBounds();
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#010101";
  if (radius <= 0.5) {
    ctx.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);
  } else {
    ctx.beginPath();
    ctx.rect(bounds.left, bounds.top, bounds.width, bounds.height);
    ctx.arc(center.x, center.y, radius, 0, TAU, true);
    try {
      ctx.fill("evenodd");
    } catch {
      const top = Math.max(bounds.top, center.y - radius);
      const bottom = Math.min(bounds.bottom, center.y + radius);
      ctx.fillRect(bounds.left, bounds.top, bounds.width, Math.max(0, top - bounds.top));
      ctx.fillRect(bounds.left, bottom, bounds.width, Math.max(0, bounds.bottom - bottom));
      ctx.fillRect(bounds.left, top, Math.max(0, center.x - radius - bounds.left), Math.max(0, bottom - top));
      ctx.fillRect(center.x + radius, top, Math.max(0, bounds.right - center.x - radius), Math.max(0, bottom - top));
    }
  }
  ctx.restore();
}

function drawFullScreenFlash(alpha, color = "#fff0b5") {
  if (alpha <= 0) return;
  const bounds = screenCoverBounds();
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);
  ctx.restore();
}

function drawOpeningOverlay() {
  const cinematic = state.cinematic;
  if (cinematic?.type === "openingReveal") {
    const hold = 0.42;
    const reveal = 1.74;
    const t = clamp((cinematic.time - hold) / reveal, 0, 1);
    const center = worldToScreen(player.x, player.y + player.h * 0.16);
    const radius = smoothStep(t) * screenCoverRadius(center);
    drawBlackIris(center, radius);
    if (cinematic.time >= 0.78 && cinematic.time <= 2.24) {
      const alpha = clamp(Math.min((cinematic.time - 0.78) / 0.38, (2.24 - cinematic.time) / 0.42), 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      drawPixelText("I woke up on the ruin floor", center.x, center.y - 72, "#fff0b5", "#17110d", 7);
      ctx.restore();
    }
    if (cinematic.time > 0.08 && cinematic.time < 0.48) {
      const pulse = 1 - Math.abs(cinematic.time - 0.22) / 0.26;
      drawFullScreenFlash(clamp(pulse, 0, 1) * 0.2);
    }
    return;
  }
  if (cinematic?.type === "doorTransition") {
    const close = 0.46;
    const hold = 0.18;
    const open = 0.62;
    const center = cinematic.entered
      ? worldToScreen(player.x, player.y - player.h * 0.18)
      : worldToScreen(cinematic.fromX, cinematic.fromY);
    const maxRadius = screenCoverRadius(center);
    let radius = 0;
    if (!cinematic.entered || cinematic.time < close) {
      radius = maxRadius * (1 - smoothStep(clamp(cinematic.time / close, 0, 1)));
    } else if (cinematic.time < close + hold) {
      radius = 0;
    } else {
      radius = maxRadius * smoothStep(clamp((cinematic.time - close - hold) / open, 0, 1));
    }
    drawBlackIris(center, radius);
    return;
  }
  if (cinematic?.type === "journalScrapFlashback") {
    const bounds = screenCoverBounds();
    const fadeIn = smoothStep(clamp(cinematic.time / 0.34, 0, 1));
    const fadeOut = 1 - smoothStep(clamp((cinematic.time - 1.34) / 0.45, 0, 1));
    const alpha = clamp(Math.min(fadeIn, fadeOut), 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = "#010101";
    ctx.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);
    ctx.globalAlpha = alpha * (0.12 + Math.sin(cinematic.time * 36) * 0.04);
    ctx.fillStyle = "#fff0b5";
    ctx.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);
    if (cinematic.time > 0.62 && cinematic.time < 1.34) {
      ctx.globalAlpha = alpha * 0.86;
      drawPixelText(journalScrapText(), W * 0.5, H * 0.5, "#fff0b5", "#17110d", 8);
    }
    ctx.restore();
    return;
  }
  if (cinematic?.type === "starterWeaponClaim" && cinematic.time >= 0.18 && cinematic.time <= 1.58) {
    const alpha = clamp(1 - Math.abs(cinematic.time - 0.82) / 0.76, 0, 1);
    const screen = worldToScreen(player.x, player.y - player.h * 0.96);
    ctx.save();
    ctx.globalAlpha = alpha;
    drawPixelText("Oh, I know this is mine! Let's do this!", screen.x, screen.y, "#fff0b5", "#17110d", 7);
    ctx.globalAlpha = alpha * 0.55;
    drawPixelText(cinematic.itemName, screen.x, screen.y + 24, "#d6ad55", "#17110d", 7);
    ctx.restore();
    return;
  }
  if (cinematic?.type === "journalFocus" && cinematic.time >= 0.18 && cinematic.time <= 1.04) {
    const alpha = clamp(1 - Math.abs(cinematic.time - 0.56) / 0.52, 0, 1);
    const screen = worldToScreen(player.x, player.y - player.h * 0.92);
    ctx.save();
    ctx.globalAlpha = alpha;
    drawPixelText("I remember this!", screen.x, screen.y, "#fff0b5", "#17110d", 8);
    ctx.restore();
    return;
  }
  if (cinematic?.type === "starterChestFocus" && cinematic.time >= 0.18 && cinematic.time <= 1.04) {
    const alpha = clamp(1 - Math.abs(cinematic.time - 0.56) / 0.52, 0, 1);
    const screen = worldToScreen(player.x, player.y - player.h * 0.92);
    ctx.save();
    ctx.globalAlpha = alpha;
    drawPixelText("Is this mine?", screen.x, screen.y, "#fff0b5", "#17110d", 8);
    ctx.restore();
    return;
  }
  if (cinematic?.type === "bossIntro") {
    const bossX = state.room.width * 0.68;
    const screen = worldToScreen(bossX, state.room.floorY - 112);
    const introWarning = cinematic.bossId === "ironWarden" ? "THE KEEP ANSWERS" : cinematic.bossId === "redWolf" ? "THE MARSH REMEMBERS" : "THE STONE MOVES";
    const introName = cinematic.bossId === "ironWarden" ? "THE IRON WARDEN" : cinematic.bossId === "redWolf" ? "THE RED WOLF" : "HUGE ROOT CRAWLER";
    const warningAlpha = cinematic.spawned
      ? clamp(1 - (cinematic.time - 1.42) / 0.42, 0, 1)
      : clamp(1 - Math.abs(cinematic.time - 0.92) / 0.62, 0, 1);
    const nameAlpha = cinematic.spawned ? clamp(1 - Math.abs(cinematic.time - 1.82) / 0.62, 0, 1) : 0;
    if (warningAlpha <= 0 && nameAlpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = warningAlpha * 0.72;
    drawPixelText(introWarning, screen.x, screen.y, "#d6ad55", "#17110d", 8);
    ctx.globalAlpha = nameAlpha;
    drawPixelText(introName, screen.x, screen.y + 30, "#fff0b5", "#17110d", 9);
    ctx.restore();
    return;
  }
  if (cinematic?.type === "bossDefeat") {
    const flash = clamp(1 - cinematic.time / 0.38, 0, 1);
    drawFullScreenFlash(flash * 0.32, "#fff0b5");
    const bannerAlpha = clamp(1 - Math.abs(cinematic.time - 0.72) / 0.72, 0, 1);
    const screen = worldToScreen(cinematic.targetX, cinematic.targetY - 74);
    ctx.save();
    ctx.globalAlpha = bannerAlpha;
    drawPixelText(cinematic.label ?? "HUGE ROOT CRAWLER FELL", screen.x, screen.y, "#fff0b5", "#17110d", 9);
    drawPixelText(cinematic.subtitle ?? "the room goes quiet", screen.x, screen.y + 28, "#d6ad55", "#17110d", 7);
    ctx.restore();
    return;
  }
  if (state.mode !== "play" || state.roomId !== "wakingStones" || state.time > 0.85) return;
  const alpha = clamp(1 - state.time / 0.85, 0, 1);
  ctx.save();
  ctx.globalAlpha = alpha * 0.32;
  ctx.fillStyle = "#050605";
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = alpha * 0.18;
  ctx.fillStyle = "#d6ad55";
  ctx.fillRect(W * 0.5 - 90, H * 0.5 - 36, 180, 6);
  ctx.restore();
}

function worldToScreen(x, y) {
  return {
    x: W * 0.5 + (x - state.camera.x) * state.camera.zoom,
    y: H * 0.5 + (y - state.camera.y) * state.camera.zoom
  };
}

function drawEmpty() {
  ctx.fillStyle = "#080b07";
  ctx.fillRect(0, 0, W, H);
}

function imageReady(image) {
  return image?.loaded && image.complete && image.naturalWidth > 0;
}

function drawTiledGround(room) {
  const tile = artAssets.ground;
  if (!imageReady(tile)) return false;
  const underTile = imageReady(artAssets.underfloor) ? artAssets.underfloor : tile;
  const draw = worldDrawBounds(room);
  ctx.fillStyle = "#5d684e";
  ctx.fillRect(draw.left, room.floorY, draw.width, draw.bottom - room.floorY);
  const tileW = 128;
  const tileH = 64;
  const topY = room.floorY - 13;
  for (let row = 0; row < 3; row += 1) {
    const y = topY + row * tileH;
    const rowTile = row === 0 ? tile : underTile;
    for (let x = draw.left - tileW; x < draw.right + tileW; x += tileW) {
      ctx.drawImage(rowTile, 0, 0, tileW, tileH, x, y, tileW, tileH);
    }
  }
  return true;
}

function drawBackground() {
  const room = state.room;
  if (room?.biome === "Castle") {
    drawCastleBackground(room);
    return;
  }
  if (room?.biome === "Swamp") {
    drawSwampBackground(room);
    return;
  }
  const draw = worldDrawBounds(room);
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#9bcad8");
  grad.addColorStop(0.42, "#c4d6c1");
  grad.addColorStop(0.72, "#ded59b");
  grad.addColorStop(1, "#78945b");
  ctx.fillStyle = grad;
  ctx.fillRect(draw.left, draw.top, draw.width, draw.height);

  const sunX = state.camera.x - W * 0.34;
  ctx.fillStyle = "rgba(255,240,181,.16)";
  ctx.fillRect(sunX - 78, 10, 156, 156);
  ctx.fillStyle = "rgba(255,240,181,.25)";
  ctx.fillRect(sunX - 58, 30, 116, 116);
  ctx.fillStyle = "#fff0b5";
  ctx.fillRect(sunX - 38, 50, 76, 76);

  drawBlockCloud(draw.left + 180, 92, 0.9);
  drawBlockCloud(draw.left + 620, 128, 0.55);
  drawBlockCloud(draw.left + 1020, 82, 1.08);
  drawBlockCloud(draw.left + 1500, 170, 0.62);

  drawDistantMountains(draw, room, "#78975f", 0.34, 300, 0);
  drawDistantMountains(draw, room, "#5f8760", 0.28, 360, 180);

  for (let x = draw.left - 180; x < draw.right + 260; x += 620) {
    drawDistantRuinSilhouette(x, room.floorY, 0.72, "rgba(87,106,74,.22)");
  }
  for (let x = draw.left + 220; x < draw.right + 320; x += 760) {
    drawDistantArchLine(x, room.floorY, 0.64, "rgba(62,82,64,.24)");
  }

  ctx.fillStyle = "rgba(142,161,95,.5)";
  ctx.fillRect(draw.left, room.floorY - 104, draw.width, 104);
  ctx.fillStyle = "rgba(80,107,68,.28)";
  for (let x = draw.left - 70; x < draw.right; x += 135) {
    ctx.fillRect(x, room.floorY - 82 + Math.floor(((x + room.id.length * 19) % 26)), 94, 8);
    ctx.fillRect(x + 36, room.floorY - 54 + Math.floor(((x + 7) % 20)), 70, 6);
  }

  const pillarSet = [
    { x: draw.left + 70, scale: 0.86, h: 1.15 },
    { x: draw.left + 245, scale: 0.58, h: 0.72 },
    { x: draw.left + 420, scale: 1.04, h: 1 },
    { x: draw.left + 625, scale: 0.72, h: 0.9 },
    { x: draw.left + 820, scale: 1.18, h: 1.18 },
    { x: draw.left + 1035, scale: 0.66, h: 0.78 },
    { x: draw.left + 1250, scale: 0.95, h: 0.92 },
    { x: draw.left + 1455, scale: 0.62, h: 0.86 },
    { x: draw.left + 1600, scale: 1.08, h: 1.05 },
    { x: draw.left + 1810, scale: 0.78, h: 0.74 }
  ];
  for (const pillar of pillarSet) {
    if (pillar.x > draw.right + 140) continue;
    drawSunlitPillar(pillar.x, room.floorY, pillar.scale, pillar.h);
  }

  const archSet = [
    draw.left + 300,
    draw.left + 760,
    draw.left + 1120,
    draw.left + 1520
  ];
  for (const x of archSet) {
    if (x < draw.right + 160) drawBrokenArch(x, room.floorY);
  }

  for (let x = draw.left + 90; x < draw.right + 120; x += 430) {
    drawRuinStoneScatter(x, room.floorY, 0.82);
  }

  if (!drawTiledGround(room)) {
    ctx.fillStyle = "#5d684e";
    ctx.fillRect(draw.left, room.floorY, draw.width, draw.bottom - room.floorY);
    for (let y = room.floorY; y < draw.bottom; y += 28) {
      for (let x = draw.left; x < draw.right; x += 50) {
        const offset = (y / 28) % 2 ? 24 : 0;
        const tileX = x + offset;
        const shade = ((x + y + room.id.length * 11) / 28) % 3 < 1;
        ctx.fillStyle = shade ? "#7b806f" : "#626b59";
        ctx.fillRect(tileX, y, 48, 26);
        ctx.fillStyle = "rgba(34,42,32,.25)";
        ctx.fillRect(tileX, y, 48, 2);
        ctx.fillRect(tileX, y, 2, 26);
      }
    }

    ctx.fillStyle = "#3f5631";
    ctx.fillRect(draw.left, room.floorY - 8, draw.width, 8);
    ctx.fillStyle = "#86a64a";
    ctx.fillRect(draw.left, room.floorY - 11, draw.width, 5);
    ctx.fillStyle = "#171d14";
    ctx.fillRect(draw.left, room.floorY, draw.width, 5);

    ctx.fillStyle = "#5f8f36";
    for (let x = draw.left; x < draw.right; x += 36) {
      const h = 4 + ((x * 17) % 13);
      ctx.fillRect(x, room.floorY - 8 - h, 28, h);
    }
  }

  ctx.fillStyle = "rgba(255,245,185,.18)";
  for (let x = draw.left + 160; x < draw.right; x += 520) {
    ctx.fillRect(x, room.floorY - 148, 4, 4);
    ctx.fillRect(x + 36, room.floorY - 96, 3, 3);
  }
}

function drawSwampBackground(room) {
  const draw = worldDrawBounds(room);
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#556c67");
  grad.addColorStop(0.35, "#83937e");
  grad.addColorStop(0.68, "#586b55");
  grad.addColorStop(1, "#1b2925");
  ctx.fillStyle = grad;
  ctx.fillRect(draw.left, draw.top, draw.width, draw.height);

  ctx.fillStyle = "rgba(210,220,186,.1)";
  for (let x = draw.left + 90; x < draw.right; x += 390) {
    ctx.fillRect(x, 102 + Math.sin(x * 0.02) * 18, 210, 14);
    ctx.fillRect(x + 58, 120 + Math.sin(x * 0.013) * 12, 160, 10);
  }

  for (let x = Math.floor(draw.left / 360) * 360 - 160; x < draw.right + 260; x += 360) {
    const base = room.floorY - 8;
    const towerH = 118 + Math.abs(Math.floor(x * 0.07) % 70);
    ctx.fillStyle = "rgba(36,52,48,.24)";
    ctx.fillRect(x + 36, base - towerH, 96, towerH);
    ctx.fillRect(x + 18, base - towerH - 20, 132, 20);
    ctx.fillStyle = "rgba(18,31,29,.22)";
    ctx.fillRect(x + 68, base - towerH + 42, 18, 52);
    ctx.fillRect(x + 108, base - towerH + 74, 14, 62);
  }

  for (let x = Math.floor(draw.left / 270) * 270 - 120; x < draw.right + 220; x += 270) {
    const height = 175 + Math.abs(Math.floor(x / 37) % 86);
    const trunk = x + 68;
    ctx.fillStyle = "rgba(28,43,38,.48)";
    ctx.fillRect(trunk, room.floorY - height, 24, height);
    ctx.fillRect(trunk - 16, room.floorY - height + 26, 82, 13);
    ctx.fillStyle = "rgba(14,25,23,.55)";
    ctx.fillRect(trunk + 10, room.floorY - height - 28, 8, 58);
    ctx.fillRect(trunk - 30, room.floorY - height + 58, 8, 108);
    ctx.fillRect(trunk + 64, room.floorY - height + 70, 8, 122);
    ctx.fillStyle = "rgba(79,92,55,.32)";
    ctx.fillRect(trunk - 8, room.floorY - height + 12, 52, 8);
    ctx.fillRect(trunk + 18, room.floorY - height + 102, 46, 7);
  }

  ctx.fillStyle = "rgba(68,90,73,.56)";
  for (let x = Math.floor(draw.left / 430) * 430 - 180; x < draw.right + 260; x += 430) {
    ctx.fillRect(x, room.floorY - 92, 270, 18);
    ctx.fillRect(x + 36, room.floorY - 74, 48, 74);
    ctx.fillRect(x + 178, room.floorY - 74, 42, 74);
    ctx.fillStyle = "rgba(35,49,43,.48)";
    ctx.fillRect(x + 24, room.floorY - 101, 244, 6);
    ctx.fillStyle = "rgba(68,90,73,.56)";
  }

  ctx.fillStyle = "#23362f";
  ctx.fillRect(draw.left, room.floorY - 4, draw.width, draw.bottom - room.floorY + 4);
  ctx.fillStyle = "#3d5039";
  for (let x = Math.floor(draw.left / 96) * 96; x < draw.right; x += 96) {
    const mudH = 18 + Math.abs(Math.floor((x + room.id.length * 17) % 14));
    ctx.fillRect(x, room.floorY - mudH, 78, mudH);
    ctx.fillStyle = "#2a3d34";
    ctx.fillRect(x + 8, room.floorY + 16, 74, 12);
    ctx.fillRect(x + 28, room.floorY + 44, 96, 10);
    ctx.fillStyle = "#3d5039";
  }

  ctx.fillStyle = "#6f7f43";
  for (let x = Math.floor(draw.left / 44) * 44; x < draw.right; x += 44) {
    const h = 5 + Math.abs(Math.floor((x * 13) % 13));
    ctx.fillRect(x, room.floorY - 11 - h, 24, h);
    if (x % 132 === 0) ctx.fillRect(x + 20, room.floorY - 22, 6, 14);
  }
}

function drawWater() {
  const room = state.room;
  if (!room?.water?.length) return;
  for (const water of room.water) {
    const surface = water.surfaceY;
    const depth = water.depth ?? 48;
    const wave = Math.sin(state.time * 2.4 + water.x * 0.01) * 3;
    const darkSwamp = room.biome === "Swamp";
    ctx.fillStyle = darkSwamp ? "rgba(24,62,55,.72)" : "rgba(70,111,101,.58)";
    ctx.fillRect(water.x, surface + Math.round(wave), water.w, depth);
    ctx.fillStyle = darkSwamp ? "rgba(132,184,151,.62)" : "rgba(166,215,190,.58)";
    for (let x = water.x + 14; x < water.x + water.w; x += 48) {
      ctx.fillRect(x, surface + Math.sin(state.time * 3 + x * 0.04) * 3, 24, 3);
    }
    ctx.fillStyle = darkSwamp ? "rgba(7,24,21,.58)" : "rgba(18,45,39,.44)";
    ctx.fillRect(water.x, surface + depth - 10, water.w, 10);
    if (darkSwamp) {
      ctx.fillStyle = "rgba(172,196,124,.18)";
      for (let x = water.x + 34; x < water.x + water.w; x += 92) {
        ctx.fillRect(x, surface + 8 + Math.sin(state.time * 1.8 + x) * 3, 36, 5);
      }
    }
  }
}

function drawCastleBackground(room) {
  const draw = worldDrawBounds(room);
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#8fa39a");
  grad.addColorStop(0.46, "#b8c0a4");
  grad.addColorStop(0.78, "#aeb99a");
  grad.addColorStop(1, "#6f7b68");
  ctx.fillStyle = grad;
  ctx.fillRect(draw.left, draw.top, draw.width, draw.height);

  drawBlockCloud(draw.left + 150, 86, 0.9);
  drawBlockCloud(draw.left + 780, 126, 0.62);
  drawBlockCloud(draw.left + 1420, 92, 1.05);

  ctx.save();
  ctx.globalAlpha = 0.22;
  for (let x = draw.left - 260; x < draw.right + 460; x += 620) {
    drawCastleTower(x + 210, room.floorY, 0.62, "#61736d");
    drawCastleWallBand(x, room.floorY - 220, 620, "#5d6d67");
  }
  ctx.globalAlpha = 0.36;
  for (let x = draw.left - 120; x < draw.right + 320; x += 840) {
    drawCastleTower(x + 430, room.floorY, 0.9, "#52625c");
    drawCastleGatehouse(x + 90, room.floorY, 0.82, "#4e5a50");
  }
  ctx.restore();

  ctx.fillStyle = "rgba(64,73,65,.55)";
  ctx.fillRect(draw.left, room.floorY - 118, draw.width, 118);
  drawCastleWallBand(draw.left, room.floorY - 118, draw.width, "#414d45");

  for (let x = draw.left + 120; x < draw.right + 260; x += 520) {
    drawCastleGatehouse(x, room.floorY, 0.9, "#465349");
  }
  for (let x = draw.left + 380; x < draw.right + 280; x += 760) {
    drawPurpleBanner(x, room.floorY - 270, 86);
  }

  ctx.fillStyle = "#2a312d";
  ctx.fillRect(draw.left, room.floorY, draw.width, draw.bottom - room.floorY);
  ctx.fillStyle = "#17110d";
  ctx.fillRect(draw.left, room.floorY, draw.width, 5);
  ctx.fillStyle = "#c5b98a";
  ctx.fillRect(draw.left, room.floorY - 5, draw.width, 4);
  for (let y = room.floorY + 10; y < draw.bottom; y += 28) {
    for (let x = draw.left - 20; x < draw.right + 40; x += 58) {
      const offset = (Math.floor(y / 28) % 2) * 28;
      ctx.fillStyle = ((x + y) % 4 < 2) ? "#3c4640" : "#333d38";
      ctx.fillRect(x + offset, y, 55, 24);
      ctx.fillStyle = "rgba(14,17,15,.34)";
      ctx.fillRect(x + offset, y, 55, 2);
      ctx.fillRect(x + offset, y, 2, 24);
    }
  }
}

function drawCastleWallBand(x, y, width, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, 82);
  ctx.fillStyle = "rgba(20,24,21,.35)";
  for (let bx = x; bx < x + width; bx += 48) {
    ctx.fillRect(bx + 6, y + 14, 36, 4);
    ctx.fillRect(bx + 24, y + 42, 38, 4);
  }
  ctx.fillStyle = "#344039";
  for (let bx = x; bx < x + width; bx += 48) {
    ctx.fillRect(bx, y - 26, 28, 26);
  }
}

function drawCastleTower(x, floorY, scale, color) {
  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(floorY));
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.fillRect(-55, -360, 110, 360);
  ctx.fillStyle = "#39443e";
  for (let i = -2; i <= 2; i += 1) ctx.fillRect(i * 28 - 12, -392, 24, 32);
  ctx.fillStyle = "rgba(18,22,19,.4)";
  ctx.fillRect(-16, -250, 32, 66);
  ctx.fillStyle = "#4b326b";
  ctx.fillRect(-10, -178, 20, 120);
  ctx.fillStyle = "#d6ad55";
  ctx.fillRect(-3, -132, 6, 48);
  ctx.fillRect(-16, -112, 32, 5);
  ctx.restore();
}

function drawCastleGatehouse(x, floorY, scale, color) {
  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(floorY));
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.fillRect(-78, -250, 58, 250);
  ctx.fillRect(20, -250, 58, 250);
  ctx.fillRect(-78, -232, 156, 74);
  ctx.fillStyle = "#303a35";
  for (let i = 0; i < 4; i += 1) {
    ctx.fillRect(-80 + i * 42, -284, 28, 34);
  }
  ctx.fillStyle = "rgba(10,12,11,.68)";
  ctx.fillRect(-44, -144, 88, 144);
  ctx.fillStyle = "#b8b8a6";
  for (let i = -3; i <= 3; i += 1) ctx.fillRect(i * 12 - 2, -142, 5, 132);
  ctx.fillRect(-43, -100, 86, 6);
  ctx.fillStyle = "#4b326b";
  ctx.fillRect(-65, -184, 24, 118);
  ctx.fillRect(42, -184, 24, 118);
  ctx.fillStyle = "#d6ad55";
  ctx.fillRect(-55, -140, 5, 42);
  ctx.fillRect(52, -140, 5, 42);
  ctx.restore();
}

function drawPurpleBanner(x, y, height) {
  ctx.fillStyle = "#2a241f";
  ctx.fillRect(x - 2, y - 32, 4, height + 46);
  ctx.fillStyle = "#4b326b";
  ctx.fillRect(x + 2, y, 78, 24);
  ctx.fillRect(x + 2, y + 20, 60, 18);
  ctx.fillStyle = "rgba(255,240,181,.45)";
  ctx.fillRect(x + 8, y + 5, 44, 4);
}

function drawBlockCloud(x, y, scale = 1) {
  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(y));
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(242,233,196,.72)";
  ctx.fillRect(0, 22, 150, 18);
  ctx.fillRect(34, 8, 78, 20);
  ctx.fillRect(58, -8, 36, 20);
  ctx.fillRect(112, 28, 64, 12);
  ctx.fillStyle = "rgba(220,215,194,.55)";
  ctx.fillRect(18, 34, 96, 8);
  ctx.fillRect(76, 18, 48, 8);
  ctx.restore();
}

function drawDistantMountains(draw, room, color, alpha, basePeak, offset) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let x = draw.left - 260 + offset; x < draw.right + 420; x += 370) {
    const peak = basePeak + Math.floor(((x + room.name.length * 23) % 60));
    ctx.beginPath();
    ctx.moveTo(x, room.floorY);
    ctx.lineTo(x + 170, peak);
    ctx.lineTo(x + 390, room.floorY);
    ctx.fill();
  }
  ctx.restore();
}

function drawDistantRuinSilhouette(x, groundY, scale, color) {
  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(groundY));
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.fillRect(0, -126, 306, 24);
  ctx.fillRect(22, -154, 42, 154);
  ctx.fillRect(106, -186, 48, 186);
  ctx.fillRect(202, -142, 40, 142);
  ctx.fillRect(258, -110, 36, 110);
  ctx.fillStyle = "rgba(255,241,181,.11)";
  ctx.fillRect(32, -146, 9, 128);
  ctx.fillRect(119, -176, 10, 158);
  ctx.fillRect(212, -134, 8, 116);
  ctx.fillStyle = "rgba(31,42,34,.16)";
  ctx.fillRect(66, -120, 44, 120);
  ctx.fillRect(156, -120, 44, 120);
  ctx.fillRect(242, -96, 30, 96);
  ctx.restore();
}

function drawDistantArchLine(x, groundY, scale, color) {
  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(groundY));
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  for (let i = 0; i < 3; i += 1) {
    const archX = i * 118;
    const archH = 132 - i * 12;
    ctx.fillRect(archX, -archH, 28, archH);
    ctx.fillRect(archX + 86, -archH + 12, 28, archH - 12);
    ctx.fillRect(archX + 18, -archH - 16, 86, 24);
    ctx.fillStyle = "rgba(32,43,36,.18)";
    ctx.fillRect(archX + 36, -archH + 44, 42, archH - 44);
    ctx.fillStyle = color;
  }
  ctx.fillStyle = "rgba(255,242,190,.1)";
  ctx.fillRect(10, -125, 6, 102);
  ctx.fillRect(130, -116, 6, 92);
  ctx.fillRect(248, -106, 6, 84);
  ctx.restore();
}

function drawRuinStoneScatter(x, groundY, scale = 1) {
  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(groundY));
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(75,86,69,.62)";
  ctx.fillRect(0, -18, 44, 18);
  ctx.fillRect(58, -12, 32, 12);
  ctx.fillRect(116, -26, 58, 26);
  ctx.fillStyle = "rgba(174,168,139,.28)";
  ctx.fillRect(6, -16, 22, 5);
  ctx.fillRect(124, -23, 28, 6);
  ctx.fillStyle = "rgba(35,45,36,.3)";
  ctx.fillRect(36, -12, 8, 12);
  ctx.fillRect(82, -8, 8, 8);
  ctx.fillRect(164, -18, 10, 18);
  ctx.restore();
}

function drawSunlitPillar(x, groundY, scale, heightScale = 1) {
  const w = 52 * scale;
  const h = 250 * scale * heightScale;
  ctx.fillStyle = "#626a5a";
  ctx.fillRect(x - 5 * scale, groundY - h + 8 * scale, w + 10 * scale, h - 8 * scale);
  ctx.fillStyle = "#7d8371";
  ctx.fillRect(x, groundY - h, w, h);
  ctx.fillStyle = "#aaa58e";
  ctx.fillRect(x + 7 * scale, groundY - h + 12, 12 * scale, h - 18);
  ctx.fillStyle = "#485348";
  ctx.fillRect(x + w - 10 * scale, groundY - h + 18, 10 * scale, h - 18);
  ctx.fillStyle = "rgba(44,55,47,.32)";
  for (let y = groundY - h + 38 * scale; y < groundY - 26 * scale; y += 44 * scale) {
    ctx.fillRect(x + 9 * scale, y, w - 18 * scale, 4 * scale);
  }
  ctx.fillStyle = "#535f50";
  ctx.fillRect(x - 13 * scale, groundY - h - 24 * scale, w + 26 * scale, 26 * scale);
  ctx.fillRect(x - 19 * scale, groundY - 13 * scale, w + 38 * scale, 20 * scale);
  ctx.fillStyle = "#848872";
  ctx.fillRect(x - 8 * scale, groundY - h - 18 * scale, w * 0.32, 8 * scale);
  ctx.fillRect(x + w * 0.56, groundY - h - 18 * scale, w * 0.32, 8 * scale);
  ctx.fillStyle = "rgba(35,45,38,.28)";
  ctx.fillRect(x + 18 * scale, groundY - h + 8 * scale, 5 * scale, h - 28 * scale);
  ctx.fillRect(x + 32 * scale, groundY - h + 22 * scale, 4 * scale, h - 44 * scale);
  ctx.fillStyle = "#6f923a";
  ctx.fillRect(x - 10 * scale, groundY - h - 29 * scale, w + 20 * scale, 8 * scale);
  ctx.fillStyle = "#4f6f35";
  ctx.fillRect(x + 5 * scale, groundY - h + 78 * scale, 34 * scale, 7 * scale);
  ctx.fillRect(x - 12 * scale, groundY - 18 * scale, w + 24 * scale, 7 * scale);
}

function drawBrokenArch(x, groundY) {
  ctx.fillStyle = "#586253";
  ctx.fillRect(x, groundY - 170, 42, 170);
  ctx.fillRect(x + 138, groundY - 142, 40, 142);
  ctx.fillRect(x + 22, groundY - 184, 122, 34);
  ctx.fillRect(x + 64, groundY - 210, 28, 28);
  ctx.fillRect(x + 96, groundY - 202, 36, 18);
  ctx.fillStyle = "#313b35";
  ctx.fillRect(x + 54, groundY - 124, 72, 124);
  ctx.fillStyle = "#87907b";
  ctx.fillRect(x + 8, groundY - 158, 9, 130);
  ctx.fillRect(x + 151, groundY - 132, 8, 104);
  ctx.fillRect(x + 33, groundY - 178, 46, 7);
  ctx.fillRect(x + 101, groundY - 178, 28, 6);
  ctx.fillStyle = "#6f923a";
  ctx.fillRect(x - 6, groundY - 190, 152, 8);
  ctx.fillRect(x - 8, groundY - 15, 196, 8);
  ctx.fillStyle = "rgba(31,42,31,.44)";
  ctx.fillRect(x + 30, groundY - 177, 38, 5);
  ctx.fillRect(x + 96, groundY - 152, 28, 4);
  ctx.fillRect(x + 14, groundY - 102, 15, 5);
  ctx.fillRect(x + 146, groundY - 78, 18, 5);
}

function drawArch(x, y, w, h) {
  ctx.fillRect(x, y + h * 0.28, w, h * 0.72);
  ctx.beginPath();
  ctx.arc(x + w * 0.5, y + h * 0.32, w * 0.5, Math.PI, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(14, 19, 13, 0.8)";
  for (let yy = y + h * 0.32; yy < y + h; yy += 30) {
    for (let xx = x; xx < x + w; xx += 42) {
      ctx.fillRect(xx + ((yy / 30) % 2) * 18, yy, 2, 22);
    }
  }
  ctx.fillStyle = "#10150d";
  ctx.fillRect(x + 34, y + h * 0.32, w - 68, h * 0.68);
  ctx.beginPath();
  ctx.arc(x + w * 0.5, y + h * 0.34, w * 0.31, Math.PI, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(87, 103, 72, 0.16)";
}

function drawDeadTree(x, groundY, scale) {
  ctx.fillRect(x, groundY - 150 * scale, 18 * scale, 150 * scale);
  ctx.fillRect(x - 42 * scale, groundY - 118 * scale, 74 * scale, 12 * scale);
  ctx.fillRect(x + 10 * scale, groundY - 96 * scale, 70 * scale, 10 * scale);
  ctx.fillRect(x - 24 * scale, groundY - 170 * scale, 12 * scale, 70 * scale);
  ctx.fillRect(x + 24 * scale, groundY - 190 * scale, 10 * scale, 82 * scale);
  ctx.fillStyle = "rgba(96,122,66,.36)";
  ctx.fillRect(x - 8 * scale, groundY - 28 * scale, 42 * scale, 7 * scale);
  ctx.fillStyle = "rgba(29, 36, 26, 0.82)";
}

function drawPlatforms() {
  for (const platform of state.room.platforms) {
    if (state.room.biome === "Castle" || platform.castle) {
      ctx.fillStyle = "#2f3934";
      ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
      ctx.fillStyle = "#c5b98a";
      ctx.fillRect(platform.x, platform.y - 4, platform.w, 4);
      ctx.fillStyle = "#59645c";
      ctx.fillRect(platform.x, platform.y + platform.h, platform.w, 12);
      ctx.fillStyle = "rgba(14,17,15,.42)";
      for (let x = platform.x + 8; x < platform.x + platform.w; x += 44) {
        ctx.fillRect(x, platform.y + 3, 32, 4);
        ctx.fillRect(x + 15, platform.y + 13, 35, 3);
      }
      ctx.fillStyle = "#4b326b";
      ctx.fillRect(platform.x + platform.w * 0.5 - 11, platform.y + platform.h + 12, 22, 84);
      ctx.fillStyle = "#d6ad55";
      ctx.fillRect(platform.x + platform.w * 0.5 - 2, platform.y + platform.h + 38, 4, 28);
      continue;
    }
    ctx.fillStyle = "#354039";
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
    ctx.fillStyle = "#d0c58c";
    ctx.fillRect(platform.x, platform.y - 3, platform.w, 3);
    ctx.fillStyle = "#6e8b4a";
    ctx.fillRect(platform.x, platform.y - 10, platform.w, 6);
    ctx.fillStyle = "rgba(12,15,11,.3)";
    for (let x = platform.x; x < platform.x + platform.w; x += 38) {
      ctx.fillRect(x, platform.y + 2, 28, 3);
      ctx.fillRect(x + 9, platform.y + 10, 34, 2);
    }
    ctx.fillStyle = "rgba(0,0,0,.28)";
    ctx.fillRect(platform.x, platform.y + platform.h, platform.w, 8);
  }
}

function drawReadableBiomeBorders() {
  const room = state.room;
  if (!room) return;
  const draw = worldDrawBounds(room);
  const palette = room.biome === "Castle"
    ? { dark: "#151917", mid: "#3f4943", light: "#c5b98a", accent: "#4b326b" }
    : room.biome === "Swamp"
      ? { dark: "#08120f", mid: "#25382f", light: "#b9b074", accent: "#6f7f43" }
      : { dark: "#17110d", mid: "#3f5631", light: "#d0c58c", accent: "#86a64a" };

  ctx.save();
  ctx.fillStyle = palette.dark;
  ctx.fillRect(draw.left, room.floorY + 2, draw.width, 8);
  ctx.fillStyle = palette.light;
  ctx.fillRect(draw.left, room.floorY - 18, draw.width, 3);
  ctx.fillStyle = "rgba(0,0,0,.28)";
  ctx.fillRect(draw.left, room.floorY - 2, draw.width, 3);

  const edgeWidth = room.biome === "Castle" ? 44 : 34;
  for (const edgeX of [0, room.width]) {
    if (edgeX < draw.left - edgeWidth || edgeX > draw.right + edgeWidth) continue;
    const x = edgeX === 0 ? 0 : room.width - edgeWidth;
    ctx.fillStyle = palette.dark;
    ctx.fillRect(x, room.floorY - 190, edgeWidth, 190);
    ctx.fillStyle = palette.mid;
    ctx.fillRect(x + 6, room.floorY - 184, edgeWidth - 12, 184);
    ctx.fillStyle = palette.light;
    ctx.fillRect(x, room.floorY - 194, edgeWidth, 5);
    for (let y = room.floorY - 168; y < room.floorY - 18; y += 38) {
      ctx.fillStyle = "rgba(255,255,255,.09)";
      ctx.fillRect(x + 9, y, edgeWidth - 20, 4);
      ctx.fillStyle = "rgba(0,0,0,.18)";
      ctx.fillRect(x + 8, y + 15, edgeWidth - 16, 3);
    }
  }

  for (const water of room.water ?? []) {
    const surface = water.surfaceY;
    ctx.fillStyle = palette.light;
    ctx.fillRect(water.x, surface - 4, water.w, 3);
    ctx.fillStyle = palette.dark;
    ctx.fillRect(water.x - 6, surface - 22, 6, 44);
    ctx.fillRect(water.x + water.w, surface - 22, 6, 44);
    ctx.fillStyle = palette.mid;
    ctx.fillRect(water.x - 3, surface - 18, 3, 36);
    ctx.fillRect(water.x + water.w, surface - 18, 3, 36);
  }

  if (room.bossId) {
    const left = Math.max(draw.left, 42);
    const right = Math.min(draw.right, room.width - 42);
    ctx.fillStyle = "rgba(21,17,13,.36)";
    ctx.fillRect(left, room.floorY - 220, 16, 220);
    ctx.fillRect(right - 16, room.floorY - 220, 16, 220);
    ctx.fillStyle = palette.accent;
    ctx.fillRect(left + 4, room.floorY - 174, 8, 82);
    ctx.fillRect(right - 12, room.floorY - 174, 8, 82);
  }
  ctx.restore();
}

function drawStains() {
  for (const stain of state.stains) {
    ctx.fillStyle = stain.color;
    ctx.fillRect(Math.floor(stain.x), Math.floor(stain.y), Math.floor(stain.w), Math.floor(stain.h));
  }
}

function drawFloorRim() {
  const draw = worldDrawBounds(state.room);
  if (state.room?.biome === "Swamp") {
    ctx.fillStyle = "#0c1512";
    ctx.fillRect(draw.left, state.room.floorY, draw.width, 6);
    ctx.fillStyle = "#25382f";
    ctx.fillRect(draw.left, state.room.floorY - 7, draw.width, 7);
    ctx.fillStyle = "#6f7f43";
    ctx.fillRect(draw.left, state.room.floorY - 12, draw.width, 4);
    ctx.fillStyle = "#b9b074";
    for (let x = Math.floor(draw.left / 52) * 52; x < draw.right; x += 52) {
      ctx.fillRect(x, state.room.floorY - 15 - Math.abs(Math.floor(x % 3)), 25, 3);
    }
    return;
  }
  if (state.room?.biome === "Castle") {
    ctx.fillStyle = "#151917";
    ctx.fillRect(draw.left, state.room.floorY, draw.width, 6);
    ctx.fillStyle = "#515b53";
    ctx.fillRect(draw.left, state.room.floorY - 10, draw.width, 10);
    ctx.fillStyle = "#b8ad83";
    ctx.fillRect(draw.left, state.room.floorY - 14, draw.width, 4);
    return;
  }
  if (imageReady(artAssets.ground)) return;
  ctx.fillStyle = "#17110d";
  ctx.fillRect(draw.left, state.room.floorY, draw.width, 5);
  ctx.fillStyle = "#d0c58c";
  ctx.fillRect(draw.left, state.room.floorY - 4, draw.width, 3);
  ctx.fillStyle = "#6e8b4a";
  ctx.fillRect(draw.left, state.room.floorY - 9, draw.width, 5);
}

function drawExits() {
  for (const exit of state.room.exits) {
    const open = exitIsOpen(exit);
    const x = exit.x;
    const castleDoor = state.room.biome === "Castle" || isCastleRoom(exit.to);
    if (castleDoor) {
      ctx.fillStyle = open ? "rgba(74,86,78,.58)" : "rgba(34,40,37,.74)";
      ctx.fillRect(x - 50, state.room.floorY - 128, 100, 128);
      ctx.fillStyle = open ? "#59645c" : "#3d4540";
      ctx.fillRect(x - 58, state.room.floorY - 132, 16, 132);
      ctx.fillRect(x + 42, state.room.floorY - 132, 16, 132);
      ctx.fillRect(x - 58, state.room.floorY - 144, 116, 18);
      ctx.fillStyle = "#c5b98a";
      ctx.fillRect(x - 64, state.room.floorY - 148, 128, 5);
      ctx.fillStyle = "rgba(9,11,10,.68)";
      ctx.fillRect(x - 32, state.room.floorY - 96, 64, 96);
      ctx.fillStyle = "#4b326b";
      ctx.fillRect(x - 22, state.room.floorY - 112, 44, 92);
      ctx.fillStyle = "#d6ad55";
      ctx.fillRect(x - 3, state.room.floorY - 76, 6, 32);
      ctx.fillRect(x - 14, state.room.floorY - 62, 28, 5);
      if (!open) {
        ctx.fillStyle = "#b8b8a6";
        for (let i = -3; i <= 3; i += 1) ctx.fillRect(x + i * 10 - 2, state.room.floorY - 102, 4, 84);
      }
    } else {
      ctx.fillStyle = open ? "rgba(120,143,76,.32)" : "rgba(50,42,32,.62)";
      ctx.fillRect(x - 42, state.room.floorY - 124, 84, 124);
      ctx.fillStyle = open ? "#89a65b" : "#4b493f";
      ctx.fillRect(x - 50, state.room.floorY - 126, 12, 126);
      ctx.fillRect(x + 38, state.room.floorY - 126, 12, 126);
      ctx.fillRect(x - 50, state.room.floorY - 132, 100, 14);
    }
    if (!open) {
      ctx.fillStyle = "rgba(0,0,0,.45)";
      ctx.fillRect(x - 34, state.room.floorY - 94, 68, 76);
    }
  }
}

function drawCorpse() {
  const corpse = state.room.corpse;
  if (!corpse || state.flags.journalFound) return;
  const pulse = 0.55 + Math.sin(state.time * 5) * 0.18;
  ctx.save();
  ctx.globalAlpha = 0.24 + pulse * 0.25;
  ctx.fillStyle = "#d6ad55";
  ctx.fillRect(corpse.x + 7, corpse.y - 22, 40, 48);
  ctx.restore();
  ctx.fillStyle = "#33352e";
  ctx.fillRect(corpse.x - 30, corpse.y + 16, 66, 12);
  ctx.fillRect(corpse.x - 12, corpse.y - 4, 32, 22);
  ctx.fillStyle = "#161813";
  ctx.fillRect(corpse.x - 28, corpse.y - 12, 20, 20);
  ctx.fillStyle = "#d6ad55";
  ctx.globalAlpha = pulse;
  ctx.fillRect(corpse.x + 16, corpse.y - 13, 23, 30);
  ctx.fillStyle = "#17110d";
  ctx.fillRect(corpse.x + 19, corpse.y - 9, 17, 2);
  ctx.fillRect(corpse.x + 19, corpse.y - 2, 17, 2);
  ctx.fillRect(corpse.x + 19, corpse.y + 5, 17, 2);
  ctx.globalAlpha = 1;
}

function drawJournalScraps() {
  for (const scrap of state.scraps) {
    if (scrap.dead) continue;
    scrap.pulse += 0.04;
    const pulse = 0.55 + Math.sin(scrap.pulse * 5) * 0.2;
    const x = Math.floor(scrap.x);
    const y = Math.floor(scrap.y);
    ctx.save();
    ctx.globalAlpha = 0.22 + pulse * 0.22;
    ctx.fillStyle = "#fff0b5";
    ctx.fillRect(x - 23, y - 31, 46, 34);
    ctx.restore();
    ctx.fillStyle = "rgba(43,34,24,.3)";
    ctx.fillRect(x - 23, y + 4, 48, 6);
    ctx.save();
    ctx.translate(x, y - 12);
    ctx.rotate(-0.16);
    ctx.fillStyle = "#17110d";
    ctx.fillRect(-18, -18, 36, 28);
    ctx.fillStyle = "#d8c489";
    ctx.fillRect(-15, -16, 30, 24);
    ctx.fillStyle = "#8a603a";
    ctx.fillRect(-10, -11, 20, 2);
    ctx.fillRect(-12, -4, 24, 2);
    ctx.fillRect(-9, 3, 15, 2);
    ctx.fillStyle = "#6b1d25";
    ctx.fillRect(8, -15, 5, 5);
    ctx.restore();
  }
}

function drawChests() {
  for (const chest of state.chests) {
    chest.pulse += 0.05;
    const x = Math.floor(chest.x);
    const y = Math.floor(chest.y);
    const glow = 54 + Math.sin(chest.pulse * 5) * 8;
    const colors = chest.colors ?? {
      glow: "#d6ad55",
      wood: "#8a603a",
      trim: "#d6ad55",
      lid: "#6b4a31"
    };
    if (!chest.opened) {
      ctx.save();
      ctx.globalAlpha = 0.18 + Math.sin(chest.pulse * 4) * 0.06;
      ctx.fillStyle = colors.glow;
      ctx.fillRect(x - glow * 0.5, y - 84, glow, 58);
      ctx.restore();
      ctx.fillStyle = "#fff0b5";
      ctx.fillRect(x - 28, y - 76 + Math.sin(chest.pulse * 7) * 2, 4, 4);
      ctx.fillRect(x + 22, y - 60 + Math.cos(chest.pulse * 6) * 2, 3, 3);
    }

    ctx.fillStyle = "rgba(43,34,24,.34)";
    ctx.fillRect(x - 42, y + 3, 86, 8);
    ctx.fillStyle = "#17110d";
    ctx.fillRect(x - 39, y - 38, 78, 36);
    ctx.fillStyle = "#5a3b28";
    ctx.fillRect(x - 35, y - 34, 70, 30);
    ctx.fillStyle = colors.wood;
    ctx.fillRect(x - 30, y - 30, 60, 22);
    ctx.fillStyle = colors.trim;
    ctx.fillRect(x - 5, y - 25, 10, 12);
    ctx.fillStyle = "#2f2118";
    ctx.fillRect(x - 36, y - 19, 72, 4);

    if (chest.opened) {
      ctx.fillStyle = "#17110d";
      ctx.fillRect(x - 38, y - 58, 76, 16);
      ctx.fillStyle = colors.lid;
      ctx.fillRect(x - 34, y - 56, 68, 11);
      ctx.fillStyle = colors.trim;
      ctx.fillRect(x - 4, y - 53, 8, 6);
    } else {
      ctx.fillStyle = "#17110d";
      ctx.fillRect(x - 41, y - 48, 82, 17);
      ctx.fillStyle = colors.lid;
      ctx.fillRect(x - 36, y - 45, 72, 12);
      ctx.fillStyle = colors.trim;
      ctx.fillRect(x - 5, y - 43, 10, 7);
    }
  }
}

function drawMerchants() {
  for (const merchant of state.merchants) {
    merchant.pulse += 0.045;
    const x = Math.floor(merchant.x);
    const y = Math.floor(merchant.y);
    const bob = Math.round(Math.sin(merchant.pulse * 4) * 2);
    ctx.fillStyle = "rgba(43,34,24,.34)";
    ctx.fillRect(x - 34, y + 3, 68, 8);
    ctx.fillStyle = "rgba(214,173,85,.16)";
    ctx.fillRect(x - 44, y - 104 + bob, 88, 78);
    ctx.fillStyle = "#17110d";
    ctx.fillRect(x - 19, y - 72 + bob, 38, 58);
    ctx.fillRect(x - 15, y - 92 + bob, 30, 24);
    ctx.fillStyle = "#6d5f3d";
    ctx.fillRect(x - 16, y - 70 + bob, 32, 49);
    ctx.fillStyle = "#9a7650";
    ctx.fillRect(x - 19, y - 54 + bob, 38, 7);
    ctx.fillStyle = "#c99a67";
    ctx.fillRect(x - 11, y - 88 + bob, 22, 20);
    ctx.fillStyle = "#2a211b";
    ctx.fillRect(x - 13, y - 94 + bob, 26, 9);
    ctx.fillStyle = "#111111";
    ctx.fillRect(x - 5, y - 79 + bob, 2, 2);
    ctx.fillRect(x + 4, y - 79 + bob, 2, 2);
    ctx.fillStyle = "#d6ad55";
    ctx.fillRect(x - 42, y - 47 + bob, 15, 18);
    ctx.fillRect(x + 27, y - 47 + bob, 15, 18);
    ctx.fillStyle = "#17110d";
    ctx.fillRect(x - 48, y - 31 + bob, 96, 20);
    ctx.fillStyle = "#8a603a";
    ctx.fillRect(x - 44, y - 28 + bob, 88, 14);
    ctx.fillStyle = "#d6ad55";
    ctx.fillRect(x - 36, y - 24 + bob, 8, 8);
    ctx.fillRect(x + 28, y - 24 + bob, 8, 8);
    drawPixelText("SHOP", x, y - 120 + bob, "#fff0b5", "#17110d", 8);
  }
}

function drawFerry() {
  const ferry = state.room?.ferry;
  if (!ferry) return;
  const floorY = Math.floor(state.room.floorY);
  const waterY = Math.floor(ferry.waterY ?? state.room.floorY - 42);
  const leftDockX = Math.floor(ferryDockX(ferry, "left"));
  const rightDockX = Math.floor(ferryDockX(ferry, "right"));
  const blockX = Math.floor(ferryBlockX(ferry));
  const cinematic = state.cinematic?.type === "ferryBoat" ? state.cinematic : null;
  const boatRight = Boolean(state.flags[ferryBoatSideKey(state.room)]);
  const boatX = Math.floor(cinematic?.boatX ?? ferryBoatDockX(ferry, boatRight ? "right" : "left"));
  const boatY = Math.floor(waterY + 8 + Math.sin(state.time * 2.4) * 2);
  const ticketBought = Boolean(state.flags[ferryTicketKey(state.room)]);
  ctx.save();
  ctx.fillStyle = "rgba(14,17,13,.46)";
  ctx.fillRect(blockX - 18, waterY - 70, 38, floorY - waterY + 76);
  ctx.fillStyle = "#17110d";
  for (let i = -2; i <= 2; i += 1) {
    const px = blockX + i * 13;
    const top = waterY - 58 + Math.abs(i) * 6;
    ctx.fillRect(px - 4, top, 8, floorY - top + 8);
    ctx.fillRect(px - 7, top - 8, 14, 8);
    ctx.fillStyle = i % 2 ? "#3e3c2d" : "#56513b";
    ctx.fillRect(px - 3, top + 5, 6, floorY - top - 2);
    ctx.fillStyle = "#17110d";
  }
  ctx.strokeStyle = ticketBought ? "rgba(216,196,137,.36)" : "rgba(216,196,137,.75)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(blockX - 54, waterY - 46);
  ctx.lineTo(blockX + 54, waterY - 34);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#17110d";
  ctx.beginPath();
  ctx.moveTo(blockX - 54, waterY - 44);
  ctx.lineTo(blockX + 54, waterY - 32);
  ctx.stroke();

  for (const dockX of [leftDockX, rightDockX]) {
    ctx.fillStyle = "rgba(23,17,13,.3)";
    ctx.fillRect(dockX - 86, floorY + 5, 172, 9);
    ctx.fillStyle = "#17110d";
    ctx.fillRect(dockX - 78, floorY - 20, 156, 16);
    ctx.fillStyle = "#4a3a2d";
    ctx.fillRect(dockX - 72, floorY - 25, 34, 31);
    ctx.fillRect(dockX + 38, floorY - 25, 34, 31);
    ctx.fillStyle = "#6f5c42";
    ctx.fillRect(dockX - 82, floorY - 24, 164, 8);
    ctx.fillRect(dockX - 70, floorY - 12, 126, 7);
    ctx.fillStyle = "#2f241b";
    ctx.fillRect(dockX + (dockX === leftDockX ? 45 : -58), floorY - 42, 9, 42);
  }

  ctx.fillStyle = "rgba(23,17,13,.34)";
  ctx.fillRect(boatX - 84, boatY + 18, 168, 9);
  ctx.fillStyle = "#17110d";
  ctx.fillRect(boatX - 82, boatY - 12, 164, 24);
  ctx.fillStyle = "#49392c";
  ctx.fillRect(boatX - 70, boatY - 18, 140, 29);
  ctx.fillStyle = "#6f5c42";
  ctx.fillRect(boatX - 60, boatY - 24, 120, 10);
  ctx.fillStyle = "#2f241b";
  ctx.fillRect(boatX - 58, boatY - 32, 26, 14);
  ctx.fillRect(boatX + 32, boatY - 32, 26, 14);
  ctx.fillStyle = "#8a704f";
  ctx.fillRect(boatX - 75, boatY - 9, 150, 5);
  ctx.fillStyle = "#c9e0a5";
  ctx.fillRect(boatX - 2, boatY - 62, 6, 48);
  ctx.fillStyle = "#4e5c43";
  ctx.fillRect(boatX + 4, boatY - 57, 40, 15);
  ctx.fillStyle = "#d6ad55";
  ctx.fillRect(boatX + 11, boatY - 52, 11, 4);

  const bob = Math.round(Math.sin(state.time * 4.6) * 2);
  ctx.fillStyle = "rgba(214,173,85,.15)";
  ctx.fillRect(leftDockX - 42, floorY - 126 + bob, 84, 86);
  ctx.fillStyle = "#17110d";
  ctx.fillRect(leftDockX - 17, floorY - 87 + bob, 34, 62);
  ctx.fillRect(leftDockX - 15, floorY - 106 + bob, 30, 22);
  ctx.fillStyle = "#283129";
  ctx.fillRect(leftDockX - 14, floorY - 84 + bob, 28, 54);
  ctx.fillStyle = "#6d5f3d";
  ctx.fillRect(leftDockX - 12, floorY - 74 + bob, 24, 35);
  ctx.fillStyle = "#0f0c0b";
  ctx.fillRect(leftDockX - 11, floorY - 100 + bob, 22, 7);
  ctx.fillStyle = "#d8c489";
  ctx.fillRect(leftDockX - 6, floorY - 94 + bob, 12, 4);
  ctx.fillStyle = "#6f5c42";
  ctx.fillRect(leftDockX + 25, floorY - 123 + bob, 5, 105);
  ctx.fillStyle = "#17110d";
  ctx.fillRect(leftDockX - 44, floorY - 35 + bob, 88, 20);
  ctx.fillStyle = "#8a603a";
  ctx.fillRect(leftDockX - 40, floorY - 32 + bob, 80, 14);
  ctx.fillStyle = ticketBought ? "#d8ecb2" : "#d6ad55";
  ctx.fillRect(leftDockX - 10, floorY - 29 + bob, 20, 8);
  drawPixelText(ticketBought ? "RIDE" : `${ferry.cost}G`, leftDockX, floorY - 139 + bob, "#fff0b5", "#17110d", 8);
  ctx.restore();
}

function drawPickups() {
  for (const pickup of state.pickups) {
    const item = ITEMS[pickup.itemId];
    pickup.pulse += 0.05;
    const glow = 42 + Math.sin(pickup.pulse * 4) * 8;
    ctx.fillStyle = "rgba(214,173,85,.2)";
    ctx.fillRect(pickup.x - glow * 0.5, pickup.y - glow * 0.7, glow, glow);
    ctx.fillStyle = "#d6ad55";
    if (pickup.itemId === "rustySword") {
      ctx.save();
      ctx.translate(pickup.x, pickup.y);
      ctx.rotate(-0.78);
      ctx.fillRect(-4, -42, 8, 66);
      ctx.fillStyle = "#6b4a31";
      ctx.fillRect(-14, 18, 28, 7);
      ctx.restore();
    } else if (pickup.itemId === "trainingBow") {
      ctx.save();
      ctx.translate(pickup.x, pickup.y - 10);
      ctx.strokeStyle = "#7d5a33";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, 20, -1.25, 1.25);
      ctx.stroke();
      ctx.strokeStyle = "#d8ecb2";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(8, -18);
      ctx.lineTo(-10, 0);
      ctx.lineTo(8, 18);
      ctx.stroke();
      ctx.restore();
    } else if (pickup.itemId === "apprenticeStaff") {
      ctx.save();
      ctx.translate(pickup.x, pickup.y);
      ctx.rotate(-0.82);
      ctx.fillStyle = "#3a2a20";
      ctx.fillRect(-4, -37, 8, 66);
      ctx.fillStyle = "#d6ad55";
      ctx.fillRect(-6, -31, 12, 8);
      ctx.fillStyle = "#9b76f0";
      ctx.fillRect(-8, -44, 16, 16);
      ctx.restore();
    } else if (pickup.itemId === "brawlerWraps") {
      ctx.fillStyle = "#2f2118";
      ctx.fillRect(pickup.x - 19, pickup.y - 25, 38, 24);
      ctx.fillStyle = "#8a603a";
      ctx.fillRect(pickup.x - 15, pickup.y - 22, 14, 18);
      ctx.fillRect(pickup.x + 1, pickup.y - 22, 14, 18);
      ctx.fillStyle = "#d6ad55";
      ctx.fillRect(pickup.x - 13, pickup.y - 18, 10, 4);
      ctx.fillRect(pickup.x + 3, pickup.y - 18, 10, 4);
    } else if (item?.type === "gear") {
      drawGearPickup(pickup, item);
    } else {
      ctx.fillRect(pickup.x - 10, pickup.y - 18, 20, 26);
    }
  }
}

function drawGearPickup(pickup, item) {
  const design = item.design ?? { primary: "#d6ad55", secondary: "#efe2c4", accent: "#17110d" };
  const x = Math.floor(pickup.x);
  const y = Math.floor(pickup.y);
  ctx.fillStyle = design.accent;
  if (item.slot === "head") {
    ctx.fillRect(x - 15, y - 16, 30, 16);
    ctx.fillStyle = design.primary;
    ctx.fillRect(x - 12, y - 20, 24, 13);
    ctx.fillStyle = design.secondary;
    ctx.fillRect(x - 8, y - 21, 14, 4);
    ctx.fillStyle = design.accent;
    ctx.fillRect(x + 8, y - 12, 14, 5);
    return;
  }
  if (item.slot === "body") {
    ctx.fillRect(x - 16, y - 22, 32, 27);
    ctx.fillStyle = design.primary;
    ctx.fillRect(x - 12, y - 20, 24, 24);
    ctx.fillStyle = design.secondary;
    ctx.fillRect(x - 7, y - 18, 14, 4);
    ctx.fillRect(x - 13, y - 7, 26, 4);
    ctx.fillStyle = design.accent;
    ctx.fillRect(x - 18, y - 15, 7, 12);
    ctx.fillRect(x + 11, y - 15, 7, 12);
    return;
  }
  if (item.slot === "hands") {
    ctx.fillRect(x - 20, y - 20, 40, 22);
    ctx.fillStyle = design.primary;
    ctx.fillRect(x - 16, y - 18, 14, 17);
    ctx.fillRect(x + 2, y - 18, 14, 17);
    ctx.fillStyle = design.secondary;
    ctx.fillRect(x - 14, y - 15, 10, 4);
    ctx.fillRect(x + 4, y - 15, 10, 4);
    return;
  }
  if (item.slot === "legs") {
    ctx.fillRect(x - 15, y - 22, 30, 28);
    ctx.fillStyle = design.primary;
    ctx.fillRect(x - 12, y - 20, 10, 25);
    ctx.fillRect(x + 2, y - 20, 10, 25);
    ctx.fillStyle = design.secondary;
    ctx.fillRect(x - 10, y - 18, 3, 18);
    ctx.fillRect(x + 4, y - 18, 3, 18);
    ctx.fillStyle = design.accent;
    ctx.fillRect(x - 13, y + 2, 12, 5);
    ctx.fillRect(x + 1, y + 2, 12, 5);
    return;
  }
  if (item.slot === "feet") {
    ctx.fillRect(x - 19, y - 15, 38, 18);
    ctx.fillStyle = design.primary;
    ctx.fillRect(x - 17, y - 12, 15, 12);
    ctx.fillRect(x + 2, y - 12, 15, 12);
    ctx.fillStyle = design.secondary;
    ctx.fillRect(x - 15, y - 9, 11, 3);
    ctx.fillRect(x + 4, y - 9, 11, 3);
    ctx.fillStyle = design.accent;
    ctx.fillRect(x - 20, y - 2, 18, 5);
    ctx.fillRect(x + 2, y - 2, 18, 5);
    return;
  }
  if (item.slot === "trinket") {
    ctx.fillRect(x - 12, y - 19, 24, 24);
    ctx.fillStyle = design.primary;
    ctx.fillRect(x - 7, y - 16, 14, 14);
    ctx.fillStyle = design.secondary;
    ctx.fillRect(x - 3, y - 20, 6, 5);
    ctx.fillRect(x - 3, y - 11, 6, 6);
    ctx.fillStyle = design.accent;
    ctx.fillRect(x - 1, y - 17, 2, 15);
    return;
  }
  if (item.slot === "modification") {
    ctx.fillRect(x - 16, y - 20, 32, 27);
    ctx.fillStyle = design.primary;
    ctx.fillRect(x - 12, y - 16, 24, 19);
    ctx.fillStyle = design.secondary;
    ctx.fillRect(x - 3, y - 24, 6, 44);
    ctx.fillRect(x - 18, y - 6, 36, 6);
    ctx.fillStyle = design.accent;
    ctx.fillRect(x - 7, y - 11, 3, 3);
    ctx.fillRect(x + 4, y - 11, 3, 3);
    return;
  }
  ctx.fillRect(x - 14, y - 19, 28, 22);
  ctx.fillStyle = design.primary;
  ctx.fillRect(x - 10, y - 17, 20, 18);
  ctx.fillStyle = design.secondary;
  ctx.fillRect(x - 7, y - 15, 14, 4);
  ctx.fillStyle = design.accent;
  ctx.fillRect(x - 14, y - 2, 28, 5);
}

function drawPixelText(text, x, y, color = "#f8e7b4", outline = "#17110d", size = 10) {
  ctx.font = `${size}px ${PIXEL_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = outline;
  ctx.fillText(text, x - 2, y);
  ctx.fillText(text, x + 2, y);
  ctx.fillText(text, x, y - 2);
  ctx.fillText(text, x, y + 2);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function dummyDps(dummy) {
  if (!dummy.hits.length) return 0;
  const firstHitTime = dummy.hits[0].t;
  const total = dummy.hits.reduce((sum, hit) => sum + hit.amount, 0);
  const elapsed = clamp(state.time - firstHitTime, 0.25, 5);
  return total / elapsed;
}

function drawTrainingDummies() {
  for (const dummy of state.dummies) {
    const x = Math.floor(dummy.x);
    const baseY = Math.floor(dummy.y + dummy.h * 0.5);
    const topY = baseY - dummy.h;
    const hurtJolt = dummy.hurt > 0 ? (Math.floor(state.time * 50) % 2 ? -3 : 3) : 0;
    const dps = dummyDps(dummy);

    ctx.save();
    ctx.translate(hurtJolt, 0);
    ctx.fillStyle = "rgba(43,34,24,.3)";
    ctx.fillRect(x - 31, baseY + 3, 62, 7);
    ctx.fillStyle = "#17110d";
    ctx.fillRect(x - 6, topY + 26, 12, 58);
    ctx.fillStyle = "#6b4a31";
    ctx.fillRect(x - 3, topY + 29, 6, 54);
    ctx.fillStyle = "#17110d";
    ctx.fillRect(x - 30, topY + 38, 60, 10);
    ctx.fillStyle = "#8a603a";
    ctx.fillRect(x - 27, topY + 40, 54, 6);
    ctx.fillStyle = "#17110d";
    ctx.fillRect(x - 23, topY + 6, 46, 48);
    ctx.fillStyle = dummy.hurt > 0 ? "#d6ad55" : "#9b7b45";
    ctx.fillRect(x - 19, topY + 10, 38, 40);
    ctx.fillStyle = "#6b4a31";
    ctx.fillRect(x - 16, topY + 14, 32, 5);
    ctx.fillRect(x - 16, topY + 28, 32, 5);
    ctx.fillRect(x - 16, topY + 42, 32, 5);
    ctx.fillStyle = "#2f2118";
    ctx.fillRect(x - 7, topY + 22, 14, 2);
    ctx.fillRect(x - 2, topY + 17, 4, 32);
    ctx.restore();

    drawPixelText("TRAINING DUMMY", x, topY - 35, "#d8ecb2", "#17110d", 7);
    drawPixelText(`DPS ${dps.toFixed(1)}`, x, topY - 20, dps > 0 ? "#fff0b5" : "#b9a98c", "#17110d", 8);
  }
}

function drawKeycap(x, y, active, blocked = false, key = "E") {
  const pulse = active ? Math.sin(state.time * 8) * 2 : 0;
  const w = active ? 31 + pulse : 25;
  const h = active ? 24 + pulse : 20;
  ctx.fillStyle = blocked ? "#3b3328" : active ? "#d6ad55" : "#524b3b";
  ctx.fillRect(Math.floor(x - w * 0.5), Math.floor(y - h * 0.5), Math.floor(w), Math.floor(h));
  ctx.fillStyle = "#17110d";
  ctx.fillRect(Math.floor(x - w * 0.5), Math.floor(y - h * 0.5), Math.floor(w), 3);
  ctx.fillRect(Math.floor(x - w * 0.5), Math.floor(y + h * 0.5 - 3), Math.floor(w), 3);
  ctx.fillRect(Math.floor(x - w * 0.5), Math.floor(y - h * 0.5), 3, Math.floor(h));
  ctx.fillRect(Math.floor(x + w * 0.5 - 3), Math.floor(y - h * 0.5), 3, Math.floor(h));
  drawPixelText(key, x, y + 1, blocked ? "#9d9077" : "#fff0b5", "#17110d", 10);
}

function drawInteractionMarker(x, y, label, options = {}) {
  const active = Boolean(options.active);
  const blocked = Boolean(options.blocked);
  const color = blocked ? "#b9a98c" : active ? "#fff0b5" : "#d8ecb2";
  const bob = Math.round(Math.sin(state.time * 5 + x * 0.01) * (active ? 4 : 2));
  const markerY = y + bob;
  ctx.save();
  ctx.globalAlpha = blocked ? 0.82 : 1;
  drawKeycap(x, markerY - 25, active, blocked);
  ctx.fillStyle = blocked ? "#6b5541" : "#d6ad55";
  ctx.fillRect(x - 2, markerY - 7, 4, 8);
  ctx.fillRect(x - 6, markerY + 1, 12, 4);
  drawPixelText(label, x, markerY - 55, color, "#17110d", active ? 10 : 8);
  ctx.restore();
}

function drawInteractionMarkers() {
  const action = state.promptAction;
  if (state.room.corpse && !state.flags.journalFound) {
    const corpse = state.room.corpse;
    drawInteractionMarker(corpse.x + 24, corpse.y - 14, "Corpse Journal", {
      active: action?.type === "corpse" && action.canUse
    });
  }
  for (const scrap of state.scraps) {
    if (scrap.dead) continue;
    drawInteractionMarker(scrap.x, scrap.y - 42, "Journal Scrap", {
      active: action?.type === "scrap" && action.scrap === scrap && action.canUse
    });
  }
  for (const pickup of state.pickups) {
    if (pickup.dead) continue;
    drawInteractionMarker(pickup.x, pickup.y - 44, ITEMS[pickup.itemId].name, {
      active: action?.type === "pickup" && action.pickup === pickup && action.canUse
    });
  }
  for (const chest of state.chests) {
    if (chest.opened) continue;
    drawInteractionMarker(chest.x, chest.y - 62, chest.label ?? "Chest", {
      active: action?.type === "chest" && action.chest === chest && action.canUse
    });
  }
  for (const merchant of state.merchants) {
    drawInteractionMarker(merchant.x, merchant.y - 92, merchant.label ?? "Merchant", {
      active: action?.type === "merchant" && action.merchant === merchant && action.canUse
    });
  }
  if (state.room.ferry) {
    const ferry = state.room.ferry;
    const hasTicket = Boolean(state.flags[ferryTicketKey(state.room)]);
    drawInteractionMarker(ferryDockX(ferry, "left"), state.room.floorY - 90, hasTicket ? "Ferry" : ferry.label ?? "Ferryman", {
      active: action?.type === "ferry" && action.side === "left" && action.canUse,
      blocked: action?.type === "ferry" && action.side === "left" && !action.canUse
    });
    if (hasTicket || player.x > ferryBlockX(ferry)) {
      drawInteractionMarker(ferryDockX(ferry, "right"), state.room.floorY - 90, "Ferry", {
        active: action?.type === "ferry" && action.side === "right" && action.canUse,
        blocked: action?.type === "ferry" && action.side === "right" && !action.canUse
      });
    }
  }
  for (const exit of state.room.exits) {
    const open = exitIsOpen(exit);
    drawInteractionMarker(exit.x, state.room.floorY - 130, exit.label, {
      active: action?.type === "exit" && action.exit === exit && action.canUse && open,
      blocked: !open
    });
  }
}

function drawOpeningGuide() {
  if (state.mode !== "play" || state.roomId !== "wakingStones" || cinematicLocksControls() || state.time > 24) return;
  if (state.flags.journalFound && !state.flags.starterChestOpened) {
    const chest = state.chests.find((item) => item.id === "starterChest" && !item.opened);
    if (!chest) return;
    const t = (Math.sin(state.time * 5) + 1) * 0.5;
    const x = lerp(player.x + 56, chest.x - 40, t);
    const y = lerp(player.y - 62, chest.y - 78, t);
    ctx.fillStyle = "rgba(214,173,85,.58)";
    ctx.fillRect(Math.floor(x), Math.floor(y), 6, 6);
    if (Math.abs(player.x - chest.x) > 150) {
      drawPixelText("CHEST", Math.floor(player.x + 72), Math.floor(player.y - 92), "#fff0b5", "#17110d", 8);
    }
    return;
  }
  if (state.flags.journalFound) return;
  if (!state.opening.moved) {
    const y = player.y - 104 + Math.sin(state.time * 4) * 2;
    drawKeycap(player.x - 28, y, true, false, "A");
    drawKeycap(player.x + 28, y, true, false, "D");
    drawPixelText("MOVE", player.x, y - 29, "#fff0b5", "#17110d", 8);
  } else if (Math.abs(player.x - state.room.corpse.x) > 165 && state.time < 18) {
    const corpse = state.room.corpse;
    const t = (Math.sin(state.time * 5) + 1) * 0.5;
    const x = lerp(player.x + 48, corpse.x - 42, t);
    const y = lerp(player.y - 62, corpse.y - 48, t);
    ctx.fillStyle = "rgba(214,173,85,.55)";
    ctx.fillRect(Math.floor(x), Math.floor(y), 5, 5);
  }
}

function drawHazards() {
  for (const hazard of state.hazards) {
    if (hazard.owner === "player") {
      drawPlayerHazard(hazard);
      continue;
    }
    if (hazard.type === "bossShockwave") {
      const t = clamp(hazard.life / hazard.max, 0, 1);
      const spread = hazard.w * (1.08 - t * 0.22);
      ctx.fillStyle = `rgba(214,173,85,${0.1 + t * 0.18})`;
      ctx.fillRect(hazard.x - spread, hazard.y - 16, spread * 2, 14);
      ctx.fillStyle = "#41542e";
      ctx.fillRect(hazard.x - spread, hazard.y - 9, spread * 2, 6);
      ctx.fillStyle = "#8b8d73";
      for (let i = -4; i <= 4; i += 1) {
        const px = hazard.x + i * spread * 0.22;
        const h = 11 + (4 - Math.abs(i)) * 3;
        ctx.fillRect(px - 4, hazard.y - h - 8, 8, h);
      }
      ctx.fillStyle = "#d6ad55";
      ctx.fillRect(hazard.x - 5, hazard.y - 28, 10, 6);
      continue;
    }
    if (hazard.type === "wardenSpike") {
      const t = clamp(hazard.life / hazard.max, 0, 1);
      ctx.fillStyle = `rgba(165,138,89,${0.16 + t * 0.2})`;
      ctx.fillRect(hazard.x - hazard.w, hazard.y - 10, hazard.w * 2, 9);
      ctx.fillStyle = "#3d4039";
      for (let i = -1; i <= 1; i += 1) {
        const h = hazard.h * (0.65 + (2 - Math.abs(i)) * 0.15);
        ctx.beginPath();
        ctx.moveTo(hazard.x + i * 20 - 7, hazard.y);
        ctx.lineTo(hazard.x + i * 20 + 1, hazard.y - h);
        ctx.lineTo(hazard.x + i * 20 + 12, hazard.y);
        ctx.fill();
      }
      ctx.fillStyle = "#a58a59";
      ctx.fillRect(hazard.x - 3, hazard.y - hazard.h - 8, 6, 12);
      continue;
    }
    if (hazard.type === "bruteCoreBlast") {
      const t = clamp(hazard.life / hazard.max, 0, 1);
      const grow = 1.08 - t * 0.28;
      ctx.fillStyle = `rgba(255,90,102,${0.12 + t * 0.24})`;
      ctx.fillRect(hazard.x - hazard.w * grow, hazard.y - hazard.h, hazard.w * 2 * grow, hazard.h);
      ctx.fillStyle = "#ff5a66";
      ctx.fillRect(hazard.x - 8, hazard.y - hazard.h - 8, 16, 16);
      ctx.fillStyle = "rgba(255,240,181,.78)";
      ctx.fillRect(hazard.x - hazard.w * 0.7, hazard.y - hazard.h * 0.56, hazard.w * 1.4, 6);
      continue;
    }
    const t = hazard.life / hazard.max;
    ctx.fillStyle = `rgba(95,111,49,${0.18 + t * 0.2})`;
    ctx.fillRect(hazard.x - hazard.w, hazard.y - hazard.h, hazard.w * 2, hazard.h);
    ctx.fillStyle = "#758947";
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(hazard.x + i * 18, hazard.y);
      ctx.lineTo(hazard.x + i * 18 + 10, hazard.y - hazard.h);
      ctx.lineTo(hazard.x + i * 18 + 22, hazard.y);
      ctx.fill();
    }
  }
  const attack = state.boss?.attack;
  if (attack?.type === "thorns" && !attack.fired) {
    ctx.fillStyle = `rgba(142,166,90,${0.18 + Math.sin(state.time * 12) * 0.08})`;
    for (const x of attack.spots) ctx.fillRect(x - 28, state.room.floorY - 8, 56, 8);
  } else if (attack?.type === "slam" && !attack.fired) {
    const pulse = 0.24 + Math.sin(state.time * 18) * 0.08;
    ctx.fillStyle = `rgba(214,173,85,${pulse})`;
    ctx.fillRect(state.boss.x - 190, state.room.floorY - 10, 380, 8);
    ctx.fillStyle = "#fff0b5";
    ctx.fillRect(state.boss.x - 4, state.room.floorY - 42, 8, 24);
  } else if (attack?.type === "leapBite" && attack.t < 0.42) {
    const pulse = 0.22 + Math.sin(state.time * 18) * 0.08;
    ctx.fillStyle = `rgba(214,173,85,${pulse})`;
    ctx.fillRect(attack.targetX - 72, state.room.floorY - 10, 144, 8);
    ctx.strokeStyle = `rgba(255,240,181,${pulse + 0.18})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(attack.targetX - 70, state.room.floorY - 72, 140, 64);
  } else if (attack?.type === "summon" && !attack.fired) {
    const pulse = 0.2 + Math.sin(state.time * 16) * 0.08;
    ctx.fillStyle = `rgba(142,166,90,${pulse})`;
    ctx.fillRect(state.boss.x - 282, state.room.floorY - 8, 64, 7);
    ctx.fillRect(state.boss.x + 218, state.room.floorY - 8, 64, 7);
  } else if (state.boss?.def.id === "ironWarden" && attack?.type === "groundPound" && !attack.fired) {
    const pulse = 0.22 + Math.sin(state.time * 18) * 0.08;
    ctx.fillStyle = `rgba(214,173,85,${pulse})`;
    ctx.fillRect(state.boss.x - 260, state.room.floorY - 10, 520, 8);
    ctx.fillStyle = "#fff0b5";
    ctx.fillRect(state.boss.x - 5, state.room.floorY - 54, 10, 30);
  } else if (state.boss?.def.id === "ironWarden" && attack?.type === "shieldBash" && attack.t < 0.52) {
    const pulse = 0.2 + Math.sin(state.time * 20) * 0.08;
    ctx.fillStyle = `rgba(214,173,85,${pulse})`;
    ctx.fillRect(attack.dir > 0 ? state.boss.x + 20 : state.boss.x - 230, state.room.floorY - 104, 210, 96);
  }
}

function drawPlayerHazard(hazard) {
  const t = clamp(hazard.life / hazard.max, 0, 1);
  const ageT = clamp((hazard.age ?? 0) / hazard.max, 0, 1);
  ctx.save();
  if (hazard.type === "thornSpear") {
    const rise = smoothStep(1 - t);
    const h = hazard.h * rise;
    ctx.globalAlpha = 0.72 + t * 0.24;
    ctx.fillStyle = hazard.color;
    ctx.fillRect(hazard.x - hazard.w * 0.5, hazard.y - h, hazard.w, h);
    ctx.fillStyle = hazard.glow;
    ctx.fillRect(hazard.x - 3, hazard.y - h - 20, 6, 24);
    ctx.fillRect(hazard.x - hazard.w * 0.7, hazard.y - h + 36, hazard.w * 1.4, 5);
  } else if (hazard.type === "briarPatch") {
    ctx.globalAlpha = 0.62 + Math.sin(state.time * 14) * 0.08;
    ctx.fillStyle = hazard.color;
    ctx.fillRect(hazard.x - hazard.radius, hazard.y - 10, hazard.radius * 2, 10);
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = hazard.glow;
    for (let i = -3; i <= 3; i += 1) {
      const x = hazard.x + i * hazard.radius * 0.26 + Math.sin(state.time * 5 + i) * 5;
      ctx.fillRect(x - 3, hazard.y - 18 - Math.abs(i) * 3, 6, 18 + Math.abs(i) * 3);
    }
  } else if (hazard.type === "oldTreeRise") {
    const ready = (hazard.age ?? 0) >= hazard.delay;
    const treeHeight = hazard.treeHeight ?? 330;
    const trunkWidth = hazard.trunkWidth ?? 70;
    const canopyRadius = hazard.canopyRadius ?? 140;
    const grow = ready ? smoothStep(clamp(((hazard.age ?? 0) - hazard.delay) / 0.34, 0, 1)) : 0;
    const fade = clamp(t * 1.25, 0, 1);
    ctx.globalAlpha = ready ? 0.98 * fade : 0.56 + Math.sin(state.time * 16) * 0.12;
    ctx.fillStyle = ready ? "#6f8b45" : hazard.glow;
    const radius = ready ? hazard.radius * (0.9 + (1 - t) * 0.12) : hazard.radius * 0.62;
    ctx.fillRect(hazard.x - radius, hazard.y - 12, radius * 2, 13);
    ctx.fillStyle = "#fff0b5";
    ctx.fillRect(hazard.x - 28, hazard.y - 24, 56, 6);
    if (ready) {
      const trunkHeight = Math.max(0, treeHeight * grow);
      const top = hazard.y - trunkHeight;
      const trunkLeft = hazard.x - trunkWidth * 0.5;
      ctx.fillStyle = "#24331f";
      ctx.fillRect(trunkLeft - 8, top + 20, trunkWidth + 16, Math.max(0, trunkHeight - 16));
      ctx.fillStyle = "#4f6f35";
      ctx.fillRect(trunkLeft, top, trunkWidth, trunkHeight);
      ctx.fillStyle = "#86a653";
      ctx.fillRect(trunkLeft + 8, top + 18, 12, Math.max(0, trunkHeight - 34));
      ctx.fillRect(trunkLeft + trunkWidth - 22, top + 48, 10, Math.max(0, trunkHeight - 74));
      ctx.fillStyle = "#304229";
      ctx.fillRect(hazard.x - trunkWidth * 0.12, top + 38, 9, Math.max(0, trunkHeight - 52));
      ctx.fillStyle = "#5f8d62";
      ctx.fillRect(hazard.x - canopyRadius * 0.62, top + 58, canopyRadius * 0.52, 24);
      ctx.fillRect(hazard.x + canopyRadius * 0.12, top + 78, canopyRadius * 0.58, 22);
      ctx.fillRect(hazard.x - canopyRadius * 0.36, top + 122, canopyRadius * 0.72, 18);
      ctx.fillStyle = "#d8ecb2";
      ctx.fillRect(hazard.x - canopyRadius * 0.5, top + 44, 16, 8);
      ctx.fillRect(hazard.x + canopyRadius * 0.4, top + 66, 18, 8);
      ctx.fillStyle = hazard.glow;
      ctx.fillRect(hazard.x - trunkWidth * 0.72, top + 12, trunkWidth * 1.44, 10);
      ctx.fillRect(hazard.x - canopyRadius * 0.18, top - 18, canopyRadius * 0.36, 12);
      ctx.globalAlpha = 0.8 * fade;
      ctx.fillStyle = "#d8ecb2";
      for (let i = -3; i <= 3; i += 1) {
        ctx.fillRect(hazard.x + i * 32 - 5, top + 22 + Math.abs(i) * 18, 10, 28);
      }
    }
  } else if (hazard.type === "blackMaw") {
    const pulse = 0.75 + Math.sin(state.time * 9) * 0.12;
    ctx.globalAlpha = 0.78 + t * 0.18;
    ctx.translate(hazard.x, hazard.y);
    ctx.fillStyle = hazard.color;
    ctx.fillRect(-hazard.radius * 0.5 * pulse, -hazard.radius * 0.34 * pulse, hazard.radius * pulse, hazard.radius * 0.68 * pulse);
    ctx.fillStyle = "#0d0713";
    ctx.fillRect(-hazard.radius * 0.32 * pulse, -hazard.radius * 0.22 * pulse, hazard.radius * 0.64 * pulse, hazard.radius * 0.44 * pulse);
    ctx.fillStyle = hazard.glow;
    for (let i = 0; i < 8; i += 1) {
      const a = state.time * 1.8 + i * TAU / 8;
      const r = hazard.radius * (0.36 + 0.2 * Math.sin(ageT * TAU + i));
      ctx.fillRect(Math.cos(a) * r, Math.sin(a) * r * 0.62, 7, 7);
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function playerPoseMetrics(pose = player.animState) {
  const x = Math.floor(player.x);
  const footY = Math.floor(player.y + player.h * 0.5);
  const run = pose === "run";
  const jump = pose === "jump";
  const fall = pose === "fall";
  const land = pose === "land";
  const hurt = pose === "hurt";
  const attack = pose === "attack";
  const roll = pose === "roll";
  const attackMoving = attack && player.onGround && Math.abs(player.vx) > 35 && player.dodge <= 0;
  const runLegs = run || attackMoving;
  const runPhase = player.runTime * TAU;
  const stride = runLegs ? Math.sin(runPhase) : 0;
  const counter = runLegs ? Math.cos(runPhase) : 0;
  const idleBreath = pose === "idle" ? Math.sin(player.animTime * 3.2) : 0;
  const rollArc = roll ? Math.sin((1 - clamp(player.dodge / 0.22, 0, 1)) * Math.PI) : 0;
  const bob = roll
    ? Math.round(rollArc * 2) - 2
    : runLegs ? Math.round(Math.abs(counter) * -3) : jump ? -5 : fall ? -2 : land ? 3 : Math.round(idleBreath);
  let attackLean = 0;
  if (attack && player.attack) {
    const family = (player.attack.weaponVisual ?? WEAPONS[player.attack.weaponId] ?? currentWeapon()).family;
    if (player.attack.phase === "wind") attackLean = -player.facing * (family === "great" || family === "axe" ? 6 : 4);
    else if (player.attack.phase === "active") attackLean = player.facing * (family === "great" || family === "axe" ? 10 : family === "dagger" || family === "punching" ? 8 : 6);
    else attackLean = player.facing * 2;
  }
  const lean = roll ? player.facing * (12 - Math.round(rollArc * 3)) : hurt ? -player.facing * 7 : attack ? attackLean : run ? player.facing * 3 : 0;
  const torsoY = footY - (roll ? 50 : 48) + bob;
  const hipY = roll ? torsoY + 27 : footY - 48 + bob;
  const headY = roll ? torsoY - 18 : footY - 70 + bob + (land ? 3 : 0);
  const armSwing = roll ? -player.facing * (10 - Math.round(rollArc * 2)) : run ? Math.round(stride * 8) : 0;
  const legA = roll ? player.facing * 15 : runLegs ? Math.round(stride * 9) : jump ? -7 : fall ? 4 : 0;
  const legB = roll ? -player.facing * 11 : runLegs ? Math.round(-stride * 9) : jump ? 7 : fall ? -3 : 0;
  const knee = roll ? 3 : jump ? -7 : fall ? 4 : land ? 2 : 0;
  return { x, footY, torsoY, hipY, headY, lean, armSwing, legA, legB, knee, rollArc };
}

function drawPlayer() {
  const x = Math.floor(player.x);
  const footY = Math.floor(player.y + player.h * 0.5);
  const pose = player.animState;
  if (!cinematicLocksControls()) drawAimLine();
  drawPlayerAura(x, footY);
  ctx.fillStyle = "rgba(63,55,39,.24)";
  ctx.fillRect(x - 19, state.room.floorY + 4, 42, 6);
  if (player.invuln > 0 && Math.floor(state.time * 24) % 2 === 0) ctx.globalAlpha = 0.58;
  const visual = classRenderProfile();
  ctx.save();
  ctx.translate(x, footY);
  ctx.scale(visual.scaleX, visual.scaleY);
  ctx.translate(-x, -footY);

  if ((activeCinematic("openingReveal") || (state.roomId === "wakingStones" && state.time < 0.95 && !state.opening.moved)) && !player.attack) {
    drawWakingPlayer(x, footY);
    ctx.restore();
    ctx.globalAlpha = 1;
    return;
  }

  if (pose === "roll") {
    if (!bugChargeEquipped() && drawPlayerSpriteAsset(x, footY, pose)) {
      ctx.restore();
      ctx.globalAlpha = 1;
      return;
    }
    drawRollingPlayer(x, footY);
    ctx.restore();
    ctx.globalAlpha = 1;
    return;
  }

  if (drawPlayerSpriteAsset(x, footY, pose)) {
    ctx.restore();
    ctx.globalAlpha = 1;
    return;
  }

  const metrics = playerPoseMetrics(pose);
  const { lean, torsoY, hipY, headY, armSwing, legA, legB, knee } = metrics;
  const side = player.facing;
  const hipLean = Math.round(lean * 0.55);
  const leftRootX = x - 11 + hipLean;
  const rightRootX = x + 3 + hipLean;
  const leftLegX = x - 10 + legA;
  const rightLegX = x + 4 + legB;
  const thighY = hipY + 17;
  const shinY = hipY + 28;

  ctx.fillStyle = PLAYER_COLORS.outline;
  ctx.fillRect(x - 13 + lean, torsoY - 2, 26, 36);
  ctx.fillRect(x - 12 + lean, headY - 2, 24, 23);
  ctx.fillRect(x - 16 + lean, hipY + 13, 32, 11);
  ctx.fillRect(leftRootX - 2, thighY, 12, 16);
  ctx.fillRect(rightRootX - 2, thighY, 12, 16);
  ctx.fillRect(leftLegX - 3, shinY, 11, 18 + knee);
  ctx.fillRect(rightLegX - 3, shinY, 11, 18 - knee);

  ctx.fillStyle = PLAYER_COLORS.pants;
  ctx.fillRect(x - 13 + lean, hipY + 13, 26, 9);
  ctx.fillRect(leftRootX, thighY + 1, 8, 13);
  ctx.fillRect(rightRootX, thighY + 1, 8, 13);
  ctx.fillRect(leftLegX, shinY, 8, 16 + knee);
  ctx.fillRect(rightLegX, shinY, 8, 16 - knee);
  ctx.fillStyle = PLAYER_COLORS.pantsLight;
  ctx.fillRect(leftRootX + 2, thighY + 2, 2, 10);
  ctx.fillRect(rightRootX + 2, thighY + 2, 2, 10);
  ctx.fillRect(leftLegX + 2, shinY + 1, 2, 12);
  ctx.fillRect(rightLegX + 2, shinY + 1, 2, 12);
  ctx.fillStyle = PLAYER_COLORS.shoe;
  ctx.fillRect(x - 13 + legA + player.facing * 2, footY - 4 + knee, 14, 5);
  ctx.fillRect(x + 1 + legB + player.facing * 2, footY - 4 - knee, 14, 5);
  drawEquippedFootgear(x, footY, legA, legB, knee);
  drawEquippedLeggear(x, footY, legA, legB, knee, lean);

  ctx.fillStyle = PLAYER_COLORS.skinShadow;
  ctx.fillRect(x - 5 + lean, headY + 19, 10, 6);
  ctx.fillStyle = PLAYER_COLORS.shirtShadow;
  ctx.fillRect(x - 12 + lean, torsoY + 3, 24, 32);
  ctx.fillRect(x - 15 + lean, torsoY + 9, 7, 18);
  ctx.fillRect(x + 9 + lean, torsoY + 9, 7, 18);
  ctx.fillStyle = PLAYER_COLORS.shirt;
  ctx.fillRect(x - 10 + lean, torsoY, 21, 34);
  ctx.fillRect(x - 13 + lean, torsoY + 10, 6, 17);
  ctx.fillRect(x + 8 + lean, torsoY + 10, 6, 17);
  ctx.fillStyle = PLAYER_COLORS.shirtShadow;
  ctx.fillRect(x - 8 + lean, torsoY + 29, 18, 4);
  drawClassClothingAccent(x, torsoY, lean, visual);
  drawEquippedBodygear(x, torsoY, lean);
  drawEquippedTrinket(x, torsoY, lean);

  ctx.fillStyle = PLAYER_COLORS.skin;
  ctx.fillRect(x - 10 + lean, headY, 20, 21);
  ctx.fillStyle = PLAYER_COLORS.skinShadow;
  ctx.fillRect((side > 0 ? x + 7 : x - 10) + lean, headY + 3, 3, 15);
  ctx.fillStyle = PLAYER_COLORS.hair;
  ctx.fillRect(x - 12 + lean, headY - 5, 24, 8);
  ctx.fillRect((side > 0 ? x - 13 : x + 4) + lean, headY, 9, 12);
  ctx.fillRect(x - 7 + lean, headY - 8, 18, 6);
  ctx.fillRect((side > 0 ? x + 6 : x - 15) + lean, headY - 3, 9, 5);
  ctx.fillStyle = PLAYER_COLORS.hairLight;
  ctx.fillRect((side > 0 ? x - 4 : x - 8) + lean, headY - 7, 12, 2);
  ctx.fillRect((side > 0 ? x + 7 : x - 13) + lean, headY - 2, 6, 2);
  drawEquippedHeadgear(x + lean, headY);
  ctx.fillStyle = "#111111";
  ctx.fillRect((side > 0 ? x - 6 : x + 4) + lean, headY + 10, 2, 4);
  ctx.fillRect((side > 0 ? x + 5 : x - 7) + lean, headY + 10, 2, 4);

  drawPlayerBackArm(x, torsoY, lean, armSwing);
  drawHeldWeapon();
  drawPlayerFrontArm(x, torsoY, lean, armSwing);
  ctx.restore();
  ctx.globalAlpha = 1;
}

function playerSpriteFrame(pose) {
  if (pose === "attack" && player.onGround && Math.abs(player.vx) > 35 && player.dodge <= 0) {
    return Math.floor(player.runTime * 8) % 2 === 0 ? 1 : 2;
  }
  if (pose === "attack") return 3;
  if (pose === "jump" || pose === "fall") return 4;
  if (pose === "roll") return 5;
  if (pose === "run") return Math.floor(player.runTime * 8) % 2 === 0 ? 1 : 2;
  return 0;
}

function spriteGearPose(x, footY, pose) {
  const metrics = playerPoseMetrics(pose);
  const run = pose === "run";
  const jump = pose === "jump";
  const fall = pose === "fall";
  const land = pose === "land";
  const runStep = run ? (playerSpriteFrame("run") === 1 ? 1 : -1) : 0;
  const idleBreath = pose === "idle" ? Math.sin(player.animTime * 3.2) : 0;
  const bob = run ? -2 : land ? 2 : Math.round(idleBreath * 0.7);
  const legA = run ? runStep * 5 : jump ? -4 : fall ? 2 : metrics.legA;
  const legB = run ? -runStep * 5 : jump ? 5 : fall ? -2 : metrics.legB;
  const knee = jump ? -6 : fall ? 3 : metrics.knee;
  return {
    x,
    footY,
    torsoY: metrics.torsoY + 3,
    headY: Math.min(footY - (jump ? 58 : 53) + bob, footY - (jump ? 58 : 53)),
    lean: Math.round(metrics.lean * 0.72),
    legA,
    legB,
    knee
  };
}

function drawSpriteAttachedGear(x, footY, pose) {
  const gear = spriteGearPose(x, footY, pose);
  drawEquippedLeggear(gear.x, gear.footY, gear.legA, gear.legB, gear.knee, gear.lean);
  drawEquippedFootgear(gear.x, gear.footY, gear.legA, gear.legB, gear.knee);
  drawEquippedBodygear(gear.x, gear.torsoY, gear.lean);
  drawEquippedTrinket(gear.x, gear.torsoY, gear.lean);
  drawEquippedHeadgear(gear.x + gear.lean, gear.headY);
}

function drawPlayerSpriteAsset(x, footY, pose) {
  if (!USE_PLAYER_SPRITE_ASSET) return false;
  const sheet = artAssets.player;
  if (!imageReady(sheet)) return false;
  const frameW = 32;
  const frameH = 48;
  const gap = 4;
  const frame = playerSpriteFrame(pose);
  const drawH = 58;
  const drawW = Math.round(frameW * (drawH / frameH));
  const drawX = Math.round(x - drawW * 0.5);
  const drawY = Math.round(footY - drawH);
  ctx.save();
  if (player.facing < 0) {
    ctx.translate(x, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(sheet, frame * (frameW + gap), 0, frameW, frameH, -Math.round(drawW * 0.5), drawY, drawW, drawH);
  } else {
    ctx.drawImage(sheet, frame * (frameW + gap), 0, frameW, frameH, drawX, drawY, drawW, drawH);
  }
  ctx.restore();

  if (pose === "roll") {
    drawRollingGear(x, footY, clamp(player.dodge / 0.22, 0, 1), false);
    return true;
  }
  drawSpriteAttachedGear(x, footY, pose);
  drawHeldWeapon();
  return true;
}

function drawClassClothingAccent(x, torsoY, lean, visual) {
  return;
}

function drawEquippedLeggear(x, footY, legA = 0, legB = 0, knee = 0, lean = 0) {
  const legs = itemDesign("legs");
  if (!legs) return;
  const kneeA = clamp(knee, -5, 4);
  const kneeB = clamp(-knee, -5, 4);
  const hipLean = Math.round(lean * 0.55);
  const leftRootX = x - 11 + hipLean;
  const rightRootX = x + 3 + hipLean;
  const thighY = footY - 31;
  ctx.fillStyle = legs.accent;
  ctx.fillRect(leftRootX, thighY, 8, 12);
  ctx.fillRect(rightRootX, thighY, 8, 12);
  ctx.fillRect(x - 10 + legA, footY - 21, 8, 10 + kneeA);
  ctx.fillRect(x + 4 + legB, footY - 21, 8, 10 + kneeB);
  ctx.fillRect(x - 11 + legA, footY - 13 + kneeA, 10, 6);
  ctx.fillRect(x + 3 + legB, footY - 13 + kneeB, 10, 6);
  ctx.fillStyle = legs.primary;
  ctx.fillRect(leftRootX + 2, thighY + 1, 4, 9);
  ctx.fillRect(rightRootX + 2, thighY + 1, 4, 9);
  ctx.fillRect(x - 8 + legA, footY - 20, 4, 7 + kneeA);
  ctx.fillRect(x + 6 + legB, footY - 20, 4, 7 + kneeB);
  ctx.fillRect(x - 9 + legA, footY - 12 + kneeA, 6, 4);
  ctx.fillRect(x + 5 + legB, footY - 12 + kneeB, 6, 4);
  ctx.fillStyle = legs.secondary;
  ctx.fillRect(leftRootX + 3, thighY + 2, 2, 6);
  ctx.fillRect(rightRootX + 3, thighY + 2, 2, 6);
  ctx.fillRect(x - 7 + legA, footY - 19, 2, 5);
  ctx.fillRect(x + 7 + legB, footY - 19, 2, 5);
}

function drawEquippedFootgear(x, footY, legA = 0, legB = 0, knee = 0) {
  const feet = itemDesign("feet");
  if (!feet) return;
  const kneeA = clamp(knee, -4, 4);
  const kneeB = clamp(-knee, -4, 4);
  ctx.fillStyle = feet.accent;
  ctx.fillRect(x - 13 + legA + player.facing * 2, footY - 7 + kneeA, 13, 6);
  ctx.fillRect(x + 2 + legB + player.facing * 2, footY - 7 + kneeB, 13, 6);
  ctx.fillStyle = feet.primary;
  ctx.fillRect(x - 11 + legA + player.facing * 2, footY - 6 + kneeA, 9, 4);
  ctx.fillRect(x + 4 + legB + player.facing * 2, footY - 6 + kneeB, 9, 4);
  ctx.fillStyle = feet.secondary;
  ctx.fillRect(x - 8 + legA + player.facing * 2, footY - 7 + kneeA, 5, 2);
  ctx.fillRect(x + 6 + legB + player.facing * 2, footY - 7 + kneeB, 5, 2);
}

function drawEquippedBodygear(x, torsoY, lean = 0) {
  const body = itemDesign("body");
  if (!body) return;
  if (player.equipment.body === "wingedChestplate") {
    ctx.fillStyle = body.accent;
    ctx.fillRect(x - 14 + lean, torsoY + 8, 4, 11);
    ctx.fillRect(x + 11 + lean, torsoY + 8, 4, 11);
    ctx.fillStyle = body.secondary;
    ctx.fillRect(x - 18 + lean, torsoY + 11, 8, 3);
    ctx.fillRect(x + 12 + lean, torsoY + 11, 8, 3);
    ctx.fillRect(x - 16 + lean, torsoY + 17, 5, 3);
    ctx.fillRect(x + 14 + lean, torsoY + 17, 5, 3);
  }
  ctx.fillStyle = body.accent;
  ctx.fillRect(x - 13 + lean, torsoY + 5, 7, 7);
  ctx.fillRect(x + 7 + lean, torsoY + 5, 7, 7);
  ctx.fillRect(x - 10 + lean, torsoY + 2, 22, 6);
  ctx.fillRect(x - 8 + lean, torsoY + 9, 6, 18);
  ctx.fillRect(x + 3 + lean, torsoY + 9, 6, 18);
  ctx.fillRect(x - 7 + lean, torsoY + 28, 16, 4);
  ctx.fillStyle = body.primary;
  ctx.fillRect(x - 8 + lean, torsoY + 4, 17, 6);
  ctx.fillRect(x - 6 + lean, torsoY + 10, 12, 17);
  ctx.fillRect(x - 4 + lean, torsoY + 27, 9, 4);
  ctx.fillStyle = body.secondary;
  ctx.fillRect(x - 4 + lean, torsoY + 5, 8, 2);
  ctx.fillRect(x - 3 + lean, torsoY + 14, 6, 2);
  ctx.fillRect(x - 4 + lean, torsoY + 27, 8, 2);
  ctx.fillStyle = body.accent;
  ctx.fillRect(x - 10 + lean, torsoY + 17, 4, 3);
  ctx.fillRect(x + 6 + lean, torsoY + 17, 4, 3);
}

function drawEquippedTrinket(x, torsoY, lean = 0) {
  const charm = itemDesign("trinket");
  if (!charm) return;
  const charmX = x + lean + player.facing * 8;
  ctx.fillStyle = charm.accent;
  ctx.fillRect(charmX - 4, torsoY + 8, 8, 9);
  ctx.fillStyle = charm.secondary;
  ctx.fillRect(charmX - 2, torsoY + 6, 4, 4);
  ctx.fillStyle = charm.primary;
  ctx.fillRect(charmX - 2, torsoY + 11, 4, 4);
}

function drawArmSegment(x, y, angle, sleeveColor, handColor, accentColor, length = 22) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = PLAYER_COLORS.outline;
  ctx.fillRect(-2, -5, length + 12, 10);
  ctx.fillStyle = sleeveColor;
  ctx.fillRect(0, -4, length, 8);
  ctx.fillStyle = handColor;
  ctx.fillRect(length - 1, -5, 10, 10);
  if (accentColor) {
    ctx.fillStyle = accentColor;
    ctx.fillRect(length + 1, -3, 7, 3);
  }
  ctx.restore();
}

function drawArmToHand(x1, y1, x2, y2, sleeveColor, handColor, accentColor) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const length = clamp(Math.hypot(x2 - x1, y2 - y1) - 7, 12, 30);
  drawArmSegment(x1, y1, angle, sleeveColor, handColor, accentColor, length);
}

function equippedSleeveColor(front = true) {
  const body = itemDesign("body");
  if (!body) return front ? PLAYER_COLORS.shirt : PLAYER_COLORS.shirtShadow;
  return front ? body.primary : body.accent;
}

function drawPlayerBackArm(x, torsoY, lean, armSwing) {
  const glove = itemDesign("hands");
  const backShoulderX = x - player.facing * 10 + lean;
  const shoulderY = torsoY + 10;
  const backHand = glove ? glove.accent : PLAYER_COLORS.skinShadow;
  const gloveAccent = glove ? glove.secondary : null;

  const backAngle = player.facing > 0
    ? 1.95 + armSwing * 0.015
    : Math.PI - 1.95 - armSwing * 0.015;
  drawArmSegment(backShoulderX, shoulderY + armSwing * 0.24, backAngle, equippedSleeveColor(false), backHand, gloveAccent, 18);
}

function drawPlayerFrontArm(x, torsoY, lean, armSwing) {
  const glove = itemDesign("hands");
  const frontShoulderX = x + player.facing * 10 + lean;
  const shoulderY = torsoY + 10;
  const frontHand = glove ? glove.primary : PLAYER_COLORS.skin;
  const gloveAccent = glove ? glove.secondary : null;

  if (player.attack?.beast) {
    const attackFacing = player.attack.facing ?? player.facing;
    const reachAngle = player.attack.angle + (player.attack.comboStep?.index === 1 ? -0.22 * attackFacing : 0.12 * attackFacing);
    drawArmSegment(frontShoulderX, shoulderY - armSwing * 0.18, reachAngle, equippedSleeveColor(true), frontHand, gloveAccent, 27);
    return;
  }

  const weaponPose = getWeaponPose(currentWeapon());
  drawArmToHand(frontShoulderX, shoulderY - armSwing * 0.18, weaponPose.x, weaponPose.y, equippedSleeveColor(true), frontHand, gloveAccent);
}

function drawPlayerArms(x, torsoY, lean, armSwing) {
  drawPlayerBackArm(x, torsoY, lean, armSwing);
  drawPlayerFrontArm(x, torsoY, lean, armSwing);
}

function drawEquippedHeadgear(x, headY) {
  const cap = itemDesign("head");
  if (!cap) return;
  const side = player.facing;
  ctx.fillStyle = cap.accent;
  ctx.fillRect(x - 14, headY - 6, 28, 6);
  ctx.fillRect(x - 13, headY - 1, 7, 8);
  ctx.fillRect(x + 7, headY - 1, 6, 8);
  ctx.fillStyle = cap.primary;
  ctx.fillRect(x - 11, headY - 10, 22, 9);
  ctx.fillRect(x - 9, headY - 13, 17, 5);
  ctx.fillStyle = cap.secondary;
  ctx.fillRect(x - 7, headY - 12, 11, 3);
  ctx.fillRect(x - 6, headY - 8, 15, 2);
  ctx.fillStyle = cap.accent;
  ctx.fillRect(side > 0 ? x + 9 : x - 21, headY - 5, 12, 4);
}

function drawWakingPlayer(x, footY) {
  const breathe = Math.round(Math.sin(state.time * 2.2) * 1);
  const side = player.facing;
  ctx.save();
  if (side < 0) {
    ctx.translate(x, 0);
    ctx.scale(-1, 1);
    x = 0;
  }
  ctx.fillStyle = PLAYER_COLORS.outline;
  ctx.fillRect(x - 37, footY - 18 + breathe, 74, 18);
  ctx.fillRect(x - 40, footY - 30 + breathe, 34, 24);
  ctx.fillRect(x - 9, footY - 37 + breathe, 24, 23);
  ctx.fillStyle = PLAYER_COLORS.pants;
  ctx.fillRect(x + 3, footY - 17 + breathe, 33, 12);
  ctx.fillRect(x + 22, footY - 24 + breathe, 12, 19);
  ctx.fillStyle = PLAYER_COLORS.shoe;
  ctx.fillRect(x + 30, footY - 8 + breathe, 18, 6);
  ctx.fillRect(x + 12, footY - 6 + breathe, 18, 5);
  ctx.fillStyle = PLAYER_COLORS.shirtShadow;
  ctx.fillRect(x - 19, footY - 24 + breathe, 38, 18);
  ctx.fillStyle = PLAYER_COLORS.shirt;
  ctx.fillRect(x - 22, footY - 27 + breathe, 37, 19);
  ctx.fillRect(x - 32, footY - 20 + breathe, 15, 9);
  ctx.fillRect(x + 12, footY - 20 + breathe, 15, 9);
  ctx.fillStyle = PLAYER_COLORS.skin;
  ctx.fillRect(x - 37, footY - 28 + breathe, 20, 19);
  ctx.fillRect(x - 39, footY - 13 + breathe, 8, 7);
  ctx.fillRect(x + 25, footY - 16 + breathe, 8, 7);
  ctx.fillStyle = PLAYER_COLORS.hair;
  ctx.fillRect(x - 41, footY - 32 + breathe, 25, 8);
  ctx.fillRect(x - 43, footY - 26 + breathe, 9, 10);
  ctx.fillRect(x - 33, footY - 35 + breathe, 15, 5);
  ctx.fillStyle = PLAYER_COLORS.hairLight;
  ctx.fillRect(x - 34, footY - 34 + breathe, 11, 2);
  ctx.fillStyle = "#111111";
  ctx.fillRect(x - 33, footY - 20 + breathe, 2, 3);
  ctx.fillRect(x - 24, footY - 20 + breathe, 2, 3);
  ctx.fillStyle = "rgba(23,17,13,.24)";
  ctx.fillRect(x - 44, footY + 1, 92, 6);
  ctx.restore();
}

function drawDashLimb(x1, y1, x2, y2, width, fillColor, lightColor = null) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const length = Math.hypot(x2 - x1, y2 - y1);
  ctx.save();
  ctx.translate(x1, y1);
  ctx.rotate(angle);
  ctx.fillStyle = PLAYER_COLORS.outline;
  ctx.fillRect(0, -Math.ceil(width * 0.5) - 1, length + 3, width + 2);
  ctx.fillStyle = fillColor;
  ctx.fillRect(1, -Math.floor(width * 0.5), length, width);
  if (lightColor) {
    ctx.fillStyle = lightColor;
    ctx.fillRect(4, -Math.floor(width * 0.5), Math.max(5, length - 8), 2);
  }
  ctx.restore();
}

function drawRollingPlayer(x, footY) {
  const rollT = clamp(player.dodge / 0.22, 0, 1);
  const surge = Math.sin((1 - rollT) * Math.PI);
  const dir = player.facing;
  if (bugChargeEquipped()) {
    drawBugChargeRollSprite(x, footY, rollT);
    return;
  }
  const body = itemDesign("body");
  const head = itemDesign("head");
  const charm = itemDesign("trinket");
  const spin = (1 - rollT) * TAU * 1.15 * dir;
  const coreX = x + dir * Math.round(surge * 5);
  const coreY = footY - 28 + Math.round((1 - surge) * 3);
  ctx.fillStyle = "rgba(0,0,0,.28)";
  ctx.fillRect(x - 30, footY - 1, 60, 6);
  ctx.fillStyle = "rgba(91,76,55,.38)";
  ctx.fillRect(x - dir * 54, footY - 18, 24, 4);
  ctx.fillRect(x - dir * 44, footY - 34, 18, 3);
  ctx.save();
  ctx.translate(coreX, coreY);
  ctx.rotate(spin);
  ctx.fillStyle = PLAYER_COLORS.outline;
  ctx.fillRect(-23, -19, 46, 38);
  ctx.fillRect(-18, -24, 36, 10);
  ctx.fillRect(-17, 14, 34, 9);
  ctx.fillStyle = PLAYER_COLORS.shirtShadow;
  ctx.fillRect(-19, -13, 38, 27);
  ctx.fillStyle = PLAYER_COLORS.shirt;
  ctx.fillRect(-15, -16, 30, 28);
  ctx.fillStyle = PLAYER_COLORS.pants;
  ctx.fillRect(-16, 8, 32, 10);
  ctx.fillRect(-25, 2, 11, 7);
  ctx.fillRect(14, -4, 11, 7);
  ctx.fillStyle = PLAYER_COLORS.shoe;
  ctx.fillRect(-30, 3, 12, 6);
  ctx.fillRect(18, -5, 13, 6);
  ctx.fillStyle = PLAYER_COLORS.skin;
  ctx.fillRect(-10, -25, 20, 17);
  ctx.fillStyle = PLAYER_COLORS.hair;
  ctx.fillRect(-12, -29, 24, 8);
  ctx.fillRect(-14, -23, 8, 9);
  if (body) {
    ctx.fillStyle = body.accent;
    ctx.fillRect(-17, -11, 34, 6);
    ctx.fillRect(-13, 6, 26, 5);
    ctx.fillStyle = body.primary;
    ctx.fillRect(-12, -8, 24, 15);
    ctx.fillStyle = body.secondary;
    ctx.fillRect(-7, -6, 14, 3);
  }
  if (head) {
    ctx.fillStyle = head.accent;
    ctx.fillRect(-12, -29, 24, 5);
    ctx.fillStyle = head.primary;
    ctx.fillRect(-9, -32, 18, 6);
  }
  if (charm) {
    ctx.fillStyle = charm.accent;
    ctx.fillRect(10, 2, 7, 7);
    ctx.fillStyle = charm.primary;
    ctx.fillRect(12, 4, 3, 3);
  }
  ctx.fillStyle = "#111111";
  ctx.fillRect(dir > 0 ? 3 : -5, -18, 2, 3);
  ctx.restore();
}

function rollGearPose(x, footY, rollT, charged = false, pulseOverride = null) {
  const arc = Math.sin((1 - rollT) * Math.PI);
  const pulse = pulseOverride ?? Math.round(arc * (charged ? 4 : 3));
  const dir = player.facing;
  if (!charged) {
    const lean = dir * (13 - Math.round(arc * 3));
    const torsoY = footY - 52 + Math.round(arc * 2);
    return {
      dash: true,
      dir,
      pulse,
      coreX: x + lean,
      coreY: torsoY + 2,
      hipX: x + lean - dir * 2,
      hipY: torsoY + 31,
      shoulderX: x + lean + dir * 5,
      shoulderY: torsoY + 10,
      rearBootX: x - dir * 30,
      leadBootX: x + dir * 35,
      rearBootY: footY - 9,
      leadBootY: footY - 12,
      headX: x + lean + dir * 14,
      headY: torsoY - 18
    };
  }
  return {
    dir,
    pulse,
    coreX: x + dir * (charged ? 4 : 2),
    coreY: footY - (charged ? 31 : 29) + pulse,
    rearLegX: x - dir * (charged ? 14 : 12),
    leadLegX: x + dir * (charged ? 18 : 16),
    legY: footY - (charged ? 24 : 23) + pulse,
    rearBootX: x - dir * 13,
    leadBootX: x + dir * 18,
    bootY: footY - 9 + pulse,
    headX: x + dir * (charged ? 14 : 13),
    headY: footY - (charged ? 46 : 45) + pulse
  };
}

function drawFacingBoot(centerX, y, width, height, design, dir) {
  ctx.fillStyle = design.accent;
  ctx.fillRect(centerX - width * 0.5, y, width, height);
  ctx.fillRect(dir > 0 ? centerX + width * 0.5 - 2 : centerX - width * 0.5 - 5, y + 2, 7, height - 2);
  ctx.fillStyle = design.primary;
  ctx.fillRect(centerX - width * 0.5 + 2, y + 1, width - 4, Math.max(3, height - 2));
  ctx.fillStyle = design.secondary;
  ctx.fillRect(centerX - width * 0.5 + 4, y, Math.max(6, width - 10), 2);
}

function drawRollingGear(x, footY, rollT, charged = false, pulseOverride = null) {
  const body = itemDesign("body");
  const head = itemDesign("head");
  const legs = itemDesign("legs");
  const feet = itemDesign("feet");
  const charm = itemDesign("trinket");
  const pose = rollGearPose(x, footY, rollT, charged, pulseOverride);
  if (pose.dash) {
    if (legs) {
      drawDashLimb(pose.hipX - pose.dir * 7, pose.hipY, pose.rearBootX, pose.rearBootY + 3, 10, legs.accent, legs.secondary);
      drawDashLimb(pose.hipX + pose.dir * 5, pose.hipY + 2, pose.leadBootX, pose.leadBootY + 3, 10, legs.primary, legs.secondary);
    }
    if (feet) {
      drawFacingBoot(pose.rearBootX, pose.rearBootY, 13, 6, feet, pose.dir);
      drawFacingBoot(pose.leadBootX, pose.leadBootY, 16, 7, feet, pose.dir);
    }
    if (body) {
      if (player.equipment.body === "wingedChestplate") {
        ctx.fillStyle = body.secondary;
        ctx.fillRect(pose.coreX - pose.dir * 20 - 5, pose.coreY + 9, 11, 4);
        ctx.fillRect(pose.coreX - pose.dir * 25 - 4, pose.coreY + 15, 8, 3);
      }
      ctx.fillStyle = body.accent;
      ctx.fillRect(pose.coreX - 14, pose.coreY + 5, 28, 5);
      ctx.fillRect(pose.coreX - 12, pose.coreY + 10, 7, 15);
      ctx.fillRect(pose.coreX + 5, pose.coreY + 10, 7, 15);
      ctx.fillRect(pose.coreX - 9, pose.coreY + 25, 18, 4);
      ctx.fillStyle = body.primary;
      ctx.fillRect(pose.coreX - 10, pose.coreY + 7, 20, 4);
      ctx.fillRect(pose.coreX - 7, pose.coreY + 12, 14, 12);
      ctx.fillStyle = body.secondary;
      ctx.fillRect(pose.coreX - 5, pose.coreY + 8, 10, 2);
    }
    if (charm) {
      const charmX = pose.coreX + pose.dir * 12;
      ctx.fillStyle = charm.accent;
      ctx.fillRect(charmX - 4, pose.coreY + 13, 8, 8);
      ctx.fillStyle = charm.secondary;
      ctx.fillRect(charmX - 2, pose.coreY + 11, 4, 4);
      ctx.fillStyle = charm.primary;
      ctx.fillRect(charmX - 2, pose.coreY + 16, 4, 4);
    }
    if (head) {
      ctx.fillStyle = head.accent;
      ctx.fillRect(pose.headX - 11, pose.headY, 22, 5);
      ctx.fillStyle = head.primary;
      ctx.fillRect(pose.headX - 9, pose.headY - 4, 18, 6);
      ctx.fillStyle = head.secondary;
      ctx.fillRect((pose.dir > 0 ? pose.headX - 5 : pose.headX - 7), pose.headY - 5, 10, 2);
    }
    return;
  }
  if (legs) {
    ctx.fillStyle = legs.accent;
    ctx.fillRect(pose.rearLegX - 7, pose.legY, 14, 6);
    ctx.fillRect(pose.leadLegX - 8, pose.legY + 8, 16, 6);
    ctx.fillStyle = legs.primary;
    ctx.fillRect(pose.rearLegX - 5, pose.legY + 1, 10, 4);
    ctx.fillRect(pose.leadLegX - 6, pose.legY + 9, 12, 4);
    ctx.fillStyle = legs.secondary;
    ctx.fillRect(pose.rearLegX - 3, pose.legY, 6, 2);
    ctx.fillRect(pose.leadLegX - 4, pose.legY + 8, 8, 2);
  }
  if (feet) {
    drawFacingBoot(pose.rearBootX, pose.bootY + 1, 12, 5, feet, pose.dir);
    drawFacingBoot(pose.leadBootX, pose.bootY, 15, 6, feet, pose.dir);
  }
  if (body) {
    if (player.equipment.body === "wingedChestplate") {
      ctx.fillStyle = body.secondary;
      ctx.fillRect(pose.coreX - pose.dir * 22 - 5, pose.coreY + 3, 11, 4);
      ctx.fillRect(pose.coreX - pose.dir * 27 - 4, pose.coreY + 9, 8, 3);
    }
    ctx.fillStyle = body.accent;
    ctx.fillRect(pose.coreX - 11, pose.coreY + 1, 22, 4);
    ctx.fillRect(pose.coreX - 9, pose.coreY + 5, 6, charged ? 11 : 13);
    ctx.fillRect(pose.coreX + 4, pose.coreY + 5, 6, charged ? 11 : 13);
    ctx.fillRect(pose.coreX - 7, pose.coreY + (charged ? 17 : 19), 15, 3);
    ctx.fillStyle = body.primary;
    ctx.fillRect(pose.coreX - 8, pose.coreY + 2, 16, 3);
    ctx.fillRect(pose.coreX - 6, pose.coreY + 6, 12, charged ? 9 : 11);
    ctx.fillStyle = body.secondary;
    ctx.fillRect(pose.coreX - 4, pose.coreY + 3, 8, 2);
    ctx.fillRect(pose.coreX - 3, pose.coreY + 11, 6, 2);
  }
  if (charm) {
    const charmX = pose.coreX + pose.dir * 10;
    ctx.fillStyle = charm.accent;
    ctx.fillRect(charmX - 4, pose.coreY + 10, 8, 8);
    ctx.fillStyle = charm.secondary;
    ctx.fillRect(charmX - 2, pose.coreY + 8, 4, 4);
  }
  if (head) {
    ctx.fillStyle = head.accent;
    ctx.fillRect(pose.headX - 10, pose.headY, 20, 5);
    ctx.fillStyle = head.primary;
    ctx.fillRect(pose.headX - 8, pose.headY - 4, 16, 6);
    ctx.fillStyle = head.secondary;
    ctx.fillRect(pose.headX - 6, pose.headY - 5, 9, 2);
  }
}

function drawBugChargeRollSprite(x, footY, rollT) {
  const pulse = Math.round(Math.sin((1 - rollT) * Math.PI) * 4);
  ctx.fillStyle = "rgba(0,0,0,.28)";
  ctx.fillRect(x - 32, footY - 2, 64, 6);
  ctx.fillStyle = "#11170f";
  ctx.fillRect(x - 28, footY - 36 + pulse, 56, 29);
  ctx.fillStyle = "#26351f";
  ctx.fillRect(x - 24, footY - 39 + pulse, 48, 22);
  ctx.fillStyle = "#384b2e";
  ctx.fillRect(x - 20, footY - 42 + pulse, 40, 17);
  ctx.fillStyle = "#6e8b4a";
  ctx.fillRect(x - 14, footY - 39 + pulse, 10, 12);
  ctx.fillRect(x + 4, footY - 39 + pulse, 10, 12);
  ctx.fillStyle = "#d6ad55";
  ctx.fillRect(x + player.facing * 24 - 3, footY - 35 + pulse, 10, 5);
  ctx.fillRect(x + player.facing * 31 - 3, footY - 30 + pulse, 9, 4);
  drawRollingGear(x, footY, rollT, true, pulse);
  ctx.fillStyle = "#fff0b5";
  ctx.fillRect(x + player.facing * 17, footY - 34 + pulse, 2, 2);
  ctx.fillRect(x + player.facing * 21, footY - 31 + pulse, 2, 2);
  ctx.fillStyle = "rgba(214,173,85,.38)";
  ctx.fillRect(x - player.facing * 55, footY - 33 + pulse, 36, 6);
  ctx.fillStyle = "rgba(56,75,46,.55)";
  ctx.fillRect(x - player.facing * 39, footY - 23 + pulse, 24, 5);
}

function drawAimLine() {
  if (state.mode !== "play") return;
  const touchAim = usingTouchAim();
  if (mouse.active && !touchAim) updateMouseWorldFromOffset();
  const x1 = player.x + player.aimX * 18;
  const y1 = player.y - 10 + player.aimY * 8;
  const x2 = player.x + player.aimX * 94;
  const y2 = player.y - 10 + player.aimY * 94;
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = "#d6c09a";
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 7]);
  ctx.beginPath();
  ctx.moveTo(Math.floor(x1), Math.floor(y1));
  ctx.lineTo(Math.floor(x2), Math.floor(y2));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#d6ad55";
  ctx.fillRect(Math.floor(x2) - 2, Math.floor(y2) - 2, 4, 4);
  ctx.restore();
}

function smoothStep(t) {
  const v = clamp(t, 0, 1);
  return v * v * (3 - 2 * v);
}

function playerRenderMetrics() {
  const metrics = playerPoseMetrics();
  return {
    x: metrics.x,
    torsoY: metrics.torsoY,
    lean: metrics.lean,
    armSwing: metrics.armSwing
  };
}

function getWeaponPose(weapon) {
  const metrics = playerRenderMetrics();
  const shoulderX = metrics.x + player.facing * 10 + metrics.lean;
  const shoulderY = metrics.torsoY + 10 - metrics.armSwing * 0.18;
  const gripLength = {
    dagger: 22,
    sword: 27,
    axe: 30,
    great: 34,
    spear: 31,
    dual: 24,
    punching: 17,
    bow: 23,
    crossbow: 24,
    wand: 22,
    scepter: 28
  }[weapon.family] ?? 27;
  if (!player.attack) {
    const idleDrop = Math.sin(player.animTime * 2.8) * 0.04;
    const angle = player.aimAngle + idleDrop * player.facing;
    return {
      x: shoulderX + Math.cos(angle) * gripLength,
      y: shoulderY + Math.sin(angle) * gripLength,
      angle
    };
  }

  const attack = player.attack;
  const profile = attack.profile ?? weapon;
  const comboStep = attack.comboStep ?? DEFAULT_COMBO_STEPS[0];
  const comboIndex = comboStep.index ?? 0;
  if (weapon.family === "punching") {
    const hook = (comboIndex === 2 ? -0.58 : comboIndex === 1 ? 0.16 : -0.1) * player.facing + Math.sin(attack.age * 34) * 0.05 * player.facing;
    let extension = 0;
    if (attack.phase === "wind") {
      extension = -12 * (1 - smoothStep(attack.t / Math.max(profile.wind, 0.001)));
    } else if (attack.phase === "active") {
      extension = (comboIndex === 2 ? 34 : 26) * smoothStep(1 - attack.t / Math.max(profile.active, 0.001));
    } else {
      extension = 8 * (1 - smoothStep(attack.t / Math.max(profile.recover, 0.001)));
    }
    const angle = attack.angle + hook;
    return {
      x: shoulderX + Math.cos(angle) * (gripLength + extension),
      y: shoulderY + Math.sin(angle) * (gripLength + extension),
      angle
    };
  }
  if (weapon.mode === "projectile") {
    let drawBack = 0;
    let recoil = 0;
    if (attack.phase === "wind") {
      drawBack = smoothStep(attack.t / Math.max(profile.wind, 0.001));
    } else if (attack.phase === "active") {
      recoil = 16 * (1 - smoothStep(attack.t / Math.max(profile.active, 0.001)));
    } else {
      recoil = 6 * (1 - smoothStep(attack.t / Math.max(profile.recover, 0.001)));
    }
    const lift = weapon.family === "scepter" ? -10 : weapon.family === "wand" ? -6 : weapon.family === "crossbow" ? 1 : -3;
    const angle = attack.angle + ({
      bow: -0.02,
      crossbow: 0,
      wand: comboIndex === 1 ? 0.12 : -0.04,
      scepter: comboIndex === 2 ? -0.16 : -0.08
    }[weapon.family] ?? 0) * player.facing;
    const pull = weapon.family === "bow" ? 22 * drawBack : weapon.family === "crossbow" ? 6 * drawBack : weapon.family === "scepter" ? 13 * drawBack : 9 * drawBack;
    return {
      x: shoulderX + Math.cos(angle) * (gripLength + recoil - pull * 0.45),
      y: shoulderY + lift + Math.sin(angle) * (gripLength + recoil),
      angle
    };
  }
  if (comboStep.kind === "jab") {
    let extension = 0;
    const thrust = weapon.family === "spear" ? 58 : weapon.family === "great" ? 34 : weapon.family === "dagger" ? 48 : weapon.family === "sword" ? 38 : 30;
    const jabLift = weapon.family === "spear" && comboIndex === 1 ? -8 : weapon.family === "dagger" ? -2 : weapon.family === "great" ? 4 : 0;
    if (attack.phase === "wind") {
      extension = -10 * (1 - smoothStep(attack.t / Math.max(profile.wind, 0.001)));
    } else if (attack.phase === "active") {
      extension = thrust * smoothStep(attack.t / Math.max(profile.active, 0.001));
    } else {
      extension = 14 * (1 - smoothStep(attack.t / Math.max(profile.recover, 0.001)));
    }
    return {
      x: shoulderX + Math.cos(attack.angle) * (gripLength + extension),
      y: shoulderY + jabLift + Math.sin(attack.angle) * (gripLength + extension),
      angle: attack.angle
    };
  }
  let swingAngle = attack.angle;
  const swingArc = profile.arc ?? weapon.arc;
  const sweepStart = attack.angle + swingArc * (comboStep.sweepStart ?? -1) * attack.facing;
  const sweepEnd = attack.angle + swingArc * (comboStep.sweepEnd ?? 1) * attack.facing;
  const slashGrip = gripLength + (weapon.family === "great" ? 12 : weapon.family === "axe" ? 8 : weapon.family === "dual" ? 3 : comboIndex === 2 ? 4 : 0);
  const windBack = {
    dagger: 0.16,
    sword: 0.28,
    axe: 0.58,
    great: 0.74,
    dual: 0.2,
    spear: 0.12
  }[weapon.family] ?? 0.28;
  if (attack.phase === "wind") {
    const t = smoothStep(attack.t / Math.max(profile.wind, 0.001));
    swingAngle = sweepStart - windBack * attack.facing * (1 - t);
  } else if (attack.phase === "active") {
    const t = smoothStep(attack.t / Math.max(profile.active, 0.001));
    swingAngle = lerp(sweepStart, sweepEnd, t);
  } else {
    const t = smoothStep(attack.t / Math.max(profile.recover, 0.001));
    swingAngle = sweepEnd + 0.18 * attack.facing * (1 - t);
  }
  return {
    x: shoulderX + Math.cos(swingAngle) * slashGrip,
    y: shoulderY + Math.sin(swingAngle) * slashGrip,
    angle: swingAngle
  };
}

function weaponWindProgress(weaponId) {
  if (!player.attack || player.attack.weaponId !== weaponId) return 0;
  const weapon = WEAPONS[player.attack.weaponId] ?? currentWeapon();
  const profile = player.attack.profile ?? weapon;
  if (player.attack.phase === "wind") return smoothStep(player.attack.t / Math.max(profile.wind, 0.001));
  if (player.attack.phase === "active") return 1 - smoothStep(player.attack.t / Math.max(profile.active, 0.001));
  return Math.max(0, 0.35 * (1 - smoothStep(player.attack.t / Math.max(profile.recover, 0.001))));
}

function drawHeldWeapon() {
  const weapon = currentWeapon();
  if (player.animState === "roll" || clawComboActive()) return;
  const pose = getWeaponPose(weapon);
  const x = Math.floor(pose.x);
  const y = Math.floor(pose.y);
  const activeCombo = player.attack?.weaponId === weapon.id ? player.attack.comboStep : null;
  const finisherGlow = activeCombo?.index === 2 ? weaponWindProgress(weapon.id) : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(pose.angle);
  if (weapon.family === "punching") {
    const jab = player.attack?.weaponId === weapon.id ? weaponWindProgress(weapon.id) : 0;
    ctx.fillStyle = "#2f2118";
    ctx.fillRect(-12, -7, 22, 14);
    ctx.fillStyle = "#8a603a";
    ctx.fillRect(-8, -5, 18, 10);
    ctx.fillStyle = "#d6ad55";
    ctx.fillRect(-5, -3, 11, 4);
    if (jab > 0.18) {
      ctx.globalAlpha = 0.38 * jab;
      ctx.fillStyle = "#fff0b5";
      ctx.fillRect(10, -6, 18 + jab * 8, 12);
      ctx.globalAlpha = 1;
    }
  } else if ((weapon.family === "sword" || weapon.family === "great") && !["stoneHammer", "guardMace", "wardenGreatmace"].includes(player.weaponId)) {
    const great = weapon.family === "great";
    if (player.weaponId === "rustySword") {
      ctx.fillStyle = "#2f2118";
      ctx.fillRect(-17, -3, 15, 6);
      ctx.fillStyle = "#5a3b28";
      ctx.fillRect(-5, -8, 11, 16);
      ctx.fillStyle = "#704f36";
      ctx.fillRect(5, -4, 14, 8);
      ctx.fillStyle = "#8d6f4e";
      ctx.fillRect(14, -3, 37, 6);
      ctx.fillStyle = "#6c563d";
      ctx.fillRect(31, 3, 11, 3);
      ctx.fillStyle = "#2f2118";
      ctx.fillRect(45, -3, 4, 2);
      ctx.fillRect(51, 1, 4, 2);
      ctx.fillStyle = "#4a3326";
      ctx.fillRect(21, -4, 5, 2);
      ctx.fillRect(37, 0, 6, 2);
      ctx.fillStyle = "#d8c2a0";
      ctx.fillRect(17, -2, 13, 1);
      ctx.fillStyle = "#9d3941";
      ctx.fillRect(29, -5, 3, 2);
      ctx.fillRect(46, 3, 3, 2);
    } else {
      ctx.fillStyle = "#3a2a20";
      ctx.fillRect(great ? -22 : -17, -3, great ? 20 : 16, 6);
      ctx.fillStyle = "#6b4a31";
      ctx.fillRect(-4, great ? -10 : -8, great ? 16 : 13, great ? 20 : 16);
      ctx.fillStyle = weapon.color;
      ctx.fillRect(8, great ? -5 : -4, great ? 76 : 62, great ? 10 : 8);
      ctx.fillStyle = "#d8c2a0";
      ctx.fillRect(18, -3, great ? 38 : 28, 2);
    }
    if (finisherGlow > 0.12) {
      ctx.globalAlpha = 0.24 + finisherGlow * 0.22;
      ctx.fillStyle = great ? "rgba(255,240,188,.74)" : "rgba(255,255,236,.78)";
      ctx.fillRect(great ? 28 : 22, great ? -12 : -8, great ? 62 : 42, great ? 24 : 16);
      ctx.globalAlpha = 1;
    }
  } else if (weapon.family === "axe") {
    const chop = weaponWindProgress(weapon.id);
    ctx.fillStyle = "#5a3b28";
    ctx.fillRect(-17, -4, 43, 8);
    ctx.fillStyle = "#2f2118";
    ctx.fillRect(22, -19, 22, 36);
    ctx.fillStyle = weapon.color;
    ctx.fillRect(26, -17, 20, 15);
    ctx.fillRect(29, 2, 17, 13);
    ctx.fillStyle = "#d8c2a0";
    ctx.fillRect(35, -13, 7, 24);
    if (chop > 0.12) {
      ctx.globalAlpha = 0.32 * chop;
      ctx.fillStyle = "#fff0b5";
      ctx.fillRect(39, -23, 19, 46);
      if (finisherGlow > 0.1) {
        ctx.fillRect(48, -30, 10, 60);
        ctx.fillRect(31, -24, 24, 5);
        ctx.fillRect(31, 19, 24, 5);
      }
      ctx.globalAlpha = 1;
    }
  } else if (weapon.family === "spear") {
    ctx.fillStyle = "#5a3b28";
    ctx.fillRect(-22, -3, 84, 6);
    ctx.fillStyle = weapon.color;
    ctx.fillRect(52, -7, 18, 14);
    ctx.fillStyle = "#ebe7d2";
    ctx.fillRect(58, -4, 12, 8);
    if (finisherGlow > 0.1) {
      ctx.globalAlpha = 0.36 * finisherGlow;
      ctx.fillStyle = "#fff0b5";
      ctx.fillRect(24, -8, 54, 16);
      ctx.fillRect(74, -3, 18, 6);
      ctx.globalAlpha = 1;
    }
  } else if (player.weaponId === "stoneHammer" || player.weaponId === "guardMace" || player.weaponId === "wardenGreatmace") {
    const thump = weaponWindProgress(player.weaponId);
    const mace = player.weaponId === "guardMace";
    const warden = player.weaponId === "wardenGreatmace";
    ctx.fillStyle = "#5a3b28";
    ctx.fillRect(-18, -4, warden ? 66 : 54, 8);
    ctx.fillStyle = "#2f2118";
    ctx.fillRect(32, warden ? -22 : -18, warden ? 36 : mace ? 25 : 28, warden ? 44 : 36);
    ctx.fillStyle = weapon.color;
    ctx.fillRect(36, warden ? -17 : -14, warden ? 28 : mace ? 17 : 20, warden ? 34 : 28);
    if (mace || warden) {
      ctx.fillStyle = "#d6ad55";
      ctx.fillRect(43, warden ? -25 : -20, 6, 8);
      ctx.fillRect(43, warden ? 17 : 12, 6, 8);
      ctx.fillRect(29, -3, 8, 6);
      ctx.fillRect(warden ? 63 : 55, -3, 8, 6);
    }
    if (thump > 0.1) {
      ctx.globalAlpha = 0.28 * thump;
      ctx.fillStyle = warden ? "#caa7ff" : "#fff0b5";
      ctx.fillRect(52, warden ? -28 : -22, warden ? 26 : 18, warden ? 56 : 44);
      ctx.globalAlpha = 1;
    }
  } else if (weapon.family === "bow" || weapon.family === "crossbow") {
    const pull = weaponWindProgress(player.weaponId) * 15;
    if (weapon.family === "crossbow") {
      ctx.fillStyle = "#3a2a20";
      ctx.fillRect(-12, -7, 44, 14);
      ctx.fillStyle = "#6b4a31";
      ctx.fillRect(10, -17, 9, 34);
      ctx.fillStyle = weapon.color;
      ctx.fillRect(22, -2, 28 + pull, 4);
      ctx.fillRect(3, -2, 12, 4);
      if (activeCombo?.projectilePattern === "stackedBolts" || activeCombo?.projectilePattern === "heavyBolt") {
        ctx.fillStyle = "#fff0b5";
        ctx.fillRect(18, -10, 24 + pull * 0.6, 3);
        if (activeCombo.projectilePattern === "stackedBolts") ctx.fillRect(18, 7, 24 + pull * 0.6, 3);
      }
      return ctx.restore();
    }
    ctx.strokeStyle = "#7d5a33";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(8, 0, 26, -1.15, 1.15);
    ctx.stroke();
    ctx.strokeStyle = "#d8ecb2";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, -23);
    ctx.lineTo(-7 - pull, 0);
    ctx.lineTo(18, 23);
    ctx.stroke();
    if (pull > 1) {
      ctx.fillStyle = "#fff0b5";
      ctx.fillRect(-22 - pull, -2, 38 + pull, 4);
      if (activeCombo?.projectilePattern === "wideFan") {
        ctx.fillRect(-18 - pull, -10, 32 + pull, 3);
        ctx.fillRect(-18 - pull, 7, 32 + pull, 3);
      }
      ctx.fillStyle = "#2f2118";
      ctx.fillRect(13, -4, 10, 8);
    }
    ctx.fillStyle = "#2f2118";
    ctx.fillRect(-13, -4, 16, 8);
  } else if (weapon.family === "scepter" || weapon.family === "wand") {
    const charge = weaponWindProgress(player.weaponId);
    if (weapon.family === "wand") {
      ctx.fillStyle = "#3a2a20";
      ctx.fillRect(-14, -3, 42, 6);
      ctx.fillStyle = weapon.color;
      ctx.fillRect(24, -8, 13, 16);
      ctx.fillStyle = "#fff0b5";
      ctx.fillRect(28, -4, 5, 8);
      if (charge > 0.05) {
        ctx.globalAlpha = 0.4 + charge * 0.35;
        ctx.fillStyle = "#d6adff";
        ctx.fillRect(34, -10 - charge * 4, 12 + charge * 12, 4);
        ctx.fillRect(34, 6 + charge * 4, 12 + charge * 12, 4);
        if (activeCombo?.projectilePattern === "fork" || activeCombo?.projectilePattern === "bright") {
          ctx.fillRect(42, -2, 14 + charge * 10, 4);
        }
        ctx.globalAlpha = 1;
      }
      return ctx.restore();
    }
    ctx.fillStyle = "#3a2a20";
    ctx.fillRect(-18, -3, 62, 6);
    ctx.fillStyle = "#d6ad55";
    ctx.fillRect(23, -6, 8, 12);
    ctx.fillStyle = "#9b76f0";
    ctx.fillRect(32, -9, 13, 18);
    ctx.fillStyle = "#caa7ff";
    ctx.fillRect(36, -5, 6, 10);
    if (charge > 0.05) {
      ctx.globalAlpha = 0.35 + charge * 0.35;
      ctx.fillStyle = "#caa7ff";
      ctx.fillRect(28 - charge * 6, -13 - charge * 4, 21 + charge * 12, 4);
      ctx.fillRect(28 - charge * 6, 9 + charge * 4, 21 + charge * 12, 4);
      ctx.fillRect(45 + charge * 3, -5, 6 + charge * 10, 10);
      if (activeCombo?.projectilePattern === "bloom") {
        ctx.fillStyle = "#fff0b5";
        ctx.fillRect(24, -19, 7, 7);
        ctx.fillRect(24, 12, 7, 7);
        ctx.fillRect(49, -3, 10, 6);
      }
      ctx.globalAlpha = 1;
    }
  } else if (weapon.family === "dual") {
    const flash = weaponWindProgress(weapon.id);
    ctx.fillStyle = "#3a2a20";
    ctx.fillRect(-13, -5, 15, 10);
    ctx.fillRect(-8, 8, 12, 8);
    ctx.fillStyle = weapon.color;
    ctx.fillRect(1, -4, 35, 6);
    ctx.fillRect(4, 8, 29, 5);
    ctx.fillStyle = "#ebe7d2";
    ctx.fillRect(25, -2, 8, 3);
    ctx.fillRect(22, 9, 8, 3);
    if (flash > 0.18) {
      ctx.globalAlpha = 0.28 * flash;
      ctx.fillStyle = "#fff0b5";
      ctx.fillRect(30, -10, 22, 8);
      ctx.fillRect(28, 9, 20, 7);
      ctx.globalAlpha = 1;
    }
  } else if (player.weaponId === "brokenKnife") {
    ctx.fillStyle = "#5a3b28";
    ctx.fillRect(-13, -5, 15, 10);
    ctx.fillStyle = weapon.color;
    ctx.fillRect(2, -3, 20, 6);
    ctx.fillStyle = "#dcd8c7";
    ctx.fillRect(14, -2, 6, 4);
  } else {
    ctx.fillStyle = "#5a3b28";
    ctx.fillRect(-13, -5, 15, 10);
    ctx.fillStyle = weapon.color;
    ctx.fillRect(2, -3, 34, 6);
    ctx.fillStyle = "#ebe7d2";
    ctx.fillRect(24, -2, 10, 4);
  }
  ctx.restore();
}

function drawSummons() {
  for (const summon of state.summons) {
    const alpha = clamp(summon.life / summon.max, 0, 1);
    const t = 1 - alpha;
    ctx.save();
    ctx.globalAlpha = alpha * 0.9;
    ctx.translate(Math.floor(summon.x), Math.floor(summon.y));
    ctx.rotate(summon.angle);
    ctx.scale(summon.scale, summon.scale);
    if (summon.kind === "wolf" || summon.kind === "allyWolf") {
      ctx.fillStyle = `rgba(255,240,181,${0.22 * alpha})`;
      ctx.fillRect(-34, -17, 70, 34);
      ctx.fillStyle = summon.color;
      ctx.fillRect(-22, -10, summon.kind === "allyWolf" ? 42 : 36, 20);
      ctx.fillRect(7, -17, 24, 18);
      ctx.fillStyle = "#2f2118";
      ctx.fillRect(24, -13, 10, 7);
      ctx.fillRect(24, 6, 10, 5);
      ctx.fillStyle = summon.glow;
      ctx.fillRect(26, -6, 5, 5);
      ctx.fillRect(-8 + t * 22, -20, 25, 4);
      ctx.fillRect(-2 + t * 26, 16, 24, 4);
      if (summon.kind === "allyWolf") {
        ctx.fillStyle = "#17110d";
        ctx.fillRect(-14, 8, 5, 12);
        ctx.fillRect(5, 8, 5, 12);
        ctx.fillRect(-16, -18, 4, 8);
        ctx.fillRect(-8, -18, 4, 8);
      }
    } else if (summon.kind === "stag") {
      ctx.fillStyle = `rgba(214,173,85,${0.24 * alpha})`;
      ctx.fillRect(-42, -25, 90, 50);
      ctx.fillStyle = summon.color;
      ctx.fillRect(-28, -12, 45, 24);
      ctx.fillRect(12, -18, 20, 20);
      ctx.fillStyle = summon.glow;
      ctx.fillRect(29, -26, 6, 20);
      ctx.fillRect(35, -29, 18, 5);
      ctx.fillRect(29, 8, 6, 20);
      ctx.fillRect(35, 24, 18, 5);
      ctx.fillRect(-34, -17, 18, 4);
      ctx.fillRect(-34, 13, 18, 4);
    } else {
      ctx.fillStyle = `rgba(155,169,95,${0.24 * alpha})`;
      ctx.fillRect(-28, -24, 58, 48);
      ctx.fillStyle = summon.color;
      ctx.fillRect(-14, -5, 50, 10);
      ctx.fillRect(11, -18, 7, 36);
      ctx.fillStyle = summon.glow;
      ctx.fillRect(26, -9, 18, 5);
      ctx.fillRect(26, 4, 18, 5);
      ctx.fillRect(-20, -22 + t * 6, 6, 44);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

function drawRoars() {
  for (const roar of state.roars) {
    const t = 1 - roar.life / roar.max;
    const alpha = clamp(0.68 + (roar.life / roar.max) * 0.32, 0.68, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(roar.x, roar.y);
    ctx.scale(roar.facing, 1);
    ctx.fillStyle = "#d6ad55";
    const reach = roar.radius * t;
    ctx.fillStyle = "#ffdd82";
    ctx.fillRect(18, -18, Math.max(16, reach * 0.34), 36);
    ctx.fillStyle = "#7b4b32";
    ctx.fillRect(22 + reach * 0.66, -40, 7, 82);
    ctx.fillRect(36 + reach * 0.78, -24, 5, 48);
    ctx.fillStyle = "#d6ad55";
    for (let i = 0; i < 7; i += 1) {
      const y = -48 + i * 16;
      const length = Math.max(8, reach * (0.96 - Math.abs(i - 3) * 0.07));
      ctx.fillRect(24 + reach * 0.18, y, length, i === 3 ? 8 : 5);
    }
    ctx.fillStyle = "#fff0b5";
    ctx.fillRect(30 + reach * 0.55, -8, Math.max(10, reach * 0.28), 8);
    ctx.globalAlpha = alpha * 0.72;
    ctx.fillStyle = "#7b4b32";
    ctx.fillRect(18 + reach * 0.1, -58, Math.max(14, reach * 0.72), 4);
    ctx.fillRect(18 + reach * 0.1, 54, Math.max(14, reach * 0.72), 4);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

function drawProjectiles() {
  for (const projectile of state.projectiles) {
    const alpha = clamp(0.7 + (projectile.life / projectile.max) * 0.3, 0.7, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(Math.floor(projectile.x), Math.floor(projectile.y));
    ctx.rotate(projectile.angle);
    if (isPhysicalProjectileKind(projectile.kind)) {
      const bolt = projectile.kind === "bolt";
      const heavyBolt = projectile.visualPattern === "heavyBolt";
      ctx.globalAlpha = alpha * (projectile.kind === "piercing" ? 0.78 : 0.68);
      ctx.fillStyle = projectile.kind === "piercing" ? "#fff0b5" : projectile.color;
      ctx.fillRect(bolt ? -28 : -38, bolt ? -2 : -1, heavyBolt ? 48 : bolt ? 36 : 42, heavyBolt ? 7 : bolt ? 4 : 2);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#2f2118";
      ctx.fillRect(bolt ? -14 : -18, bolt ? -4 : -2, heavyBolt ? 36 : bolt ? 28 : 28, heavyBolt ? 10 : bolt ? 8 : 4);
      ctx.fillStyle = projectile.color;
      ctx.fillRect(8, bolt ? -5 : -3, projectile.kind === "piercing" ? 22 : heavyBolt ? 24 : bolt ? 18 : 14, heavyBolt ? 12 : bolt ? 10 : 6);
      if (bolt) {
        ctx.fillStyle = "#fff0b5";
        ctx.fillRect(19, -3, 8, 6);
        if (projectile.visualPattern === "stackedBolts") {
          ctx.fillRect(-8, -9, 25, 3);
          ctx.fillRect(-8, 6, 25, 3);
        }
      }
      if (projectile.kind === "piercing") {
        ctx.fillStyle = "#fff0b5";
        ctx.fillRect(18, -5, 10, 10);
        ctx.globalAlpha = alpha * 0.68;
        ctx.fillRect(-50, -6, 42, 12);
        ctx.globalAlpha = alpha;
      }
      ctx.fillStyle = projectile.sparkle;
      ctx.fillRect(-22, -5, 6, 3);
      ctx.fillRect(-22, 2, 6, 3);
    } else {
      const scepter = projectile.kind === "scepter";
      const wand = projectile.kind === "wand";
      const bloom = projectile.visualPattern === "bloom";
      ctx.globalAlpha = alpha * (scepter ? 0.78 : 0.7);
      ctx.fillStyle = scepter ? "#fff0b5" : "#caa7ff";
      ctx.fillRect(scepter ? -50 : -42, scepter ? -7 : -4, bloom ? 54 : scepter ? 40 : 32, bloom ? 22 : scepter ? 14 : 8);
      if (!wand) ctx.fillRect(-27, scepter ? -12 : -8, scepter ? 26 : 20, scepter ? 24 : 16);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = scepter ? "rgba(255,240,181,.86)" : "rgba(202,167,255,.84)";
      ctx.fillRect(scepter ? -18 : -14, scepter ? -12 : -8, bloom ? 44 : scepter ? 36 : 28, bloom ? 30 : scepter ? 24 : 16);
      ctx.fillStyle = projectile.color;
      ctx.fillRect(scepter ? -10 : -7, scepter ? -10 : -7, scepter ? 20 : 14, scepter ? 20 : 14);
      ctx.fillStyle = projectile.sparkle;
      ctx.fillRect(wand ? -2 : -3, wand ? -2 : -3, wand ? 4 : 6, wand ? 4 : 6);
      if (projectile.visualPattern === "fork" || projectile.visualPattern === "bright") {
        ctx.fillRect(-21, -12, 12, 4);
        ctx.fillRect(-21, 8, 12, 4);
      }
      if (bloom) {
        ctx.fillStyle = "#fff0b5";
        ctx.fillRect(13, -4, 8, 8);
        ctx.fillRect(-2, -18, 6, 6);
        ctx.fillRect(-2, 12, 6, 6);
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

function drawEnemyProjectiles() {
  for (const projectile of state.enemyProjectiles) {
    const alpha = clamp(0.68 + (projectile.life / projectile.max) * 0.32, 0.68, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(Math.floor(projectile.x), Math.floor(projectile.y));
    ctx.rotate(projectile.angle);
    if (projectile.kind === "wardenAxe") {
      ctx.rotate(state.time * 7);
      ctx.fillStyle = "#1b120c";
      ctx.fillRect(-13, -3, 26, 6);
      ctx.fillRect(-3, -13, 6, 26);
      ctx.fillStyle = "#a58a59";
      ctx.fillRect(-16, -8, 10, 16);
      ctx.fillRect(6, -8, 10, 16);
      ctx.fillStyle = "#4b326b";
      ctx.fillRect(-3, -3, 6, 6);
    } else if (projectile.kind === "stoneSpit") {
      ctx.fillStyle = "#1b120c";
      ctx.fillRect(-11, -9, 20, 18);
      ctx.fillStyle = "#5a605d";
      ctx.fillRect(-8, -7, 16, 14);
      ctx.fillStyle = projectile.color;
      ctx.fillRect(5, -4, 10, 8);
      ctx.fillStyle = projectile.sparkle;
      ctx.fillRect(12, -2, 5, 4);
    } else {
      ctx.fillStyle = "#1b120c";
      ctx.fillRect(-22, -2, 34, 4);
      ctx.fillStyle = projectile.color;
      ctx.fillRect(-28, -1, 42, 2);
      ctx.fillStyle = projectile.sparkle;
      ctx.fillRect(10, -4, 12, 8);
      ctx.fillStyle = "#4b326b";
      ctx.fillRect(-18, -4, 6, 8);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

function drawSlashes() {
  for (const slash of state.slashes) {
    const familyAlphaScale = slash.family === "sword" ? 0.58 : 1;
    const alpha = clamp(0.62 + (slash.life / slash.max) * 0.38, 0.62, 1) * familyAlphaScale;
    const progress = clamp(1 - slash.life / slash.max, 0, 1);
    const start = slash.startAngle ?? slash.angle - slash.arc;
    const end = slash.endAngle ?? slash.angle + slash.arc;
    const visibleEnd = lerp(start, end, clamp(progress * 1.45, 0, 1));
    const trailStyle = slash.trailStyle ?? slash.family;
    ctx.save();
    ctx.translate(slash.x + slash.dx * 10, slash.y + slash.dy * 6);
    const segments = slash.family === "great" ? 16 : slash.family === "dagger" ? 7 : slash.family === "axe" ? 10 : 12;
    const thickness = slash.thickness ?? 9;
    if (slash.family === "punching") {
      ctx.rotate(slash.angle);
      const pop = smoothStep(progress);
      ctx.globalAlpha = alpha * 0.92;
      ctx.fillStyle = slash.color;
      ctx.fillRect(Math.floor(26 + pop * slash.reach * 0.38), -thickness, Math.floor(22 + pop * 18), thickness * 2);
      ctx.fillStyle = "rgba(255,240,188,.92)";
      ctx.fillRect(Math.floor(46 + pop * slash.reach * 0.42), -Math.max(4, thickness - 5), Math.floor(18 + pop * 14), Math.max(4, thickness - 5) * 2);
      if (slash.comboIndex === 2) {
        ctx.rotate(-0.72 * slash.dx);
        ctx.globalAlpha = alpha * 0.82;
        ctx.fillStyle = "rgba(255,240,188,.94)";
        ctx.fillRect(30, -28, Math.floor(slash.reach * 0.68), 9);
        ctx.fillRect(55, -42, Math.floor(slash.reach * 0.4), 6);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      continue;
    }
    if (slash.kind === "jab") {
      ctx.rotate(slash.angle);
      const length = slash.reach * (slash.family === "spear" ? 0.6 : slash.family === "dagger" ? 0.3 : 0.35) + slash.reach * smoothStep(progress) * (slash.family === "spear" ? 0.84 : slash.family === "dagger" ? 0.52 : 0.72);
      const bands = [
        { alpha: 1, y: -thickness * 0.5, h: thickness, grow: 8, color: slash.color },
        { alpha: 0.82, y: -Math.max(4, thickness - 3) * 0.5, h: Math.max(4, thickness - 3), grow: 24, color: "rgba(255,240,188,.92)" },
        { alpha: 0.56, y: -Math.max(2, thickness - 6) * 0.5, h: Math.max(2, thickness - 6), grow: 38, color: "rgba(255,255,236,.82)" }
      ];
      for (const band of bands) {
        ctx.globalAlpha = alpha * band.alpha;
        ctx.fillStyle = band.color;
        ctx.fillRect(20, Math.floor(band.y), Math.floor(length + band.grow), Math.ceil(band.h));
      }
      if (slash.family === "spear") {
        ctx.globalAlpha = alpha * 0.92;
        ctx.fillStyle = "#fff0b5";
        ctx.fillRect(Math.floor(length + 42), -3, 22, 6);
        ctx.globalAlpha = alpha * 0.72;
        ctx.fillStyle = "rgba(255,240,188,.92)";
        ctx.fillRect(38, -1, Math.floor(length + 20), 2);
        if (slash.comboIndex === 2) {
          ctx.fillRect(Math.floor(length + 22), -12, 10, 24);
          ctx.fillRect(Math.floor(length + 52), -8, 8, 16);
        }
      } else if (slash.family === "dagger") {
        ctx.globalAlpha = alpha * 0.86;
        ctx.fillStyle = "#fff0b5";
        ctx.fillRect(Math.floor(length + 16), -9, 10, 4);
        ctx.fillRect(Math.floor(length + 22), 5, 8, 3);
        if (slash.comboIndex === 2) ctx.fillRect(Math.floor(length + 32), -3, 24, 6);
      } else if (slash.family === "great") {
        ctx.globalAlpha = alpha * 0.78;
        ctx.fillStyle = "rgba(255,240,188,.92)";
        ctx.fillRect(30, -thickness, Math.floor(length + 38), thickness * 2);
        if (slash.comboIndex === 2) {
          ctx.fillStyle = "rgba(123,75,50,.78)";
          ctx.fillRect(48, thickness + 8, Math.floor(length * 0.72), 7);
        }
      } else if (slash.family === "sword") {
        ctx.globalAlpha = alpha * 0.82;
        ctx.fillStyle = "#fff0b5";
        ctx.fillRect(Math.floor(length + 20), -6, 18, 12);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      continue;
    }
    const bands = [
      { alpha: 1, grow: 5, color: slash.color, thickness },
      { alpha: 0.84, grow: 14, color: "rgba(255,240,188,.92)", thickness: Math.max(4, thickness - 3) },
      { alpha: 0.58, grow: 24, color: "rgba(255,255,236,.84)", thickness: Math.max(2, thickness - 6) }
    ];
    for (const band of bands) {
      ctx.globalAlpha = alpha * band.alpha;
      for (let i = 0; i < segments; i += 1) {
        const t = segments === 1 ? 1 : i / (segments - 1);
        const angle = lerp(start, visibleEnd, t);
        const taper = slash.family === "axe" ? 1.05 - t * 0.12 : slash.family === "great" ? 1 - t * 0.18 : 1 - t * 0.38;
        ctx.save();
        ctx.rotate(angle);
        ctx.fillStyle = band.color;
        ctx.fillRect(
          Math.floor(20 + t * (slash.family === "great" ? 14 : 9)),
          Math.floor(-band.thickness * 0.5),
          Math.floor((slash.reach + band.grow) * ((slash.family === "great" ? 0.96 : slash.family === "dagger" ? 0.56 : 0.78) - t * 0.16)),
          Math.ceil(band.thickness * taper)
        );
        if (slash.family === "axe" && i % 2 === 0) {
          ctx.fillRect(Math.floor(slash.reach * 0.72), Math.floor(-band.thickness * 0.82), 12, Math.ceil(band.thickness * 1.55));
        }
        if (slash.family === "dagger" && i === segments - 1) {
          ctx.fillRect(Math.floor(slash.reach * 0.48), Math.floor(-band.thickness * 1.2), 12, Math.ceil(band.thickness * 0.55));
        }
        ctx.restore();
      }
    }
    if (slash.family === "great" && (trailStyle === "groundDrag" || slash.comboIndex === 2)) {
      ctx.globalAlpha = alpha * 0.78;
      ctx.rotate(slash.angle);
      ctx.fillStyle = "rgba(123,75,50,.88)";
      ctx.fillRect(18, 26, Math.floor(slash.reach * 0.9), 8);
      ctx.fillStyle = "rgba(255,240,188,.82)";
      ctx.fillRect(46, 18, Math.floor(slash.reach * 0.52), 5);
    }
    if (slash.family === "axe" && slash.comboIndex === 2) {
      ctx.globalAlpha = alpha * 0.82;
      ctx.rotate(slash.angle);
      ctx.fillStyle = "rgba(255,240,188,.94)";
      ctx.fillRect(Math.floor(slash.reach * 0.7), -34, 12, 68);
    }
    if (slash.family === "dual" && slash.comboIndex === 2) {
      ctx.globalAlpha = alpha * 0.84;
      ctx.rotate(slash.angle);
      ctx.fillStyle = "rgba(255,240,188,.94)";
      ctx.fillRect(18, -24, Math.floor(slash.reach * 0.82), 7);
      ctx.fillRect(18, 17, Math.floor(slash.reach * 0.82), 7);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    const x = Math.floor(enemy.x);
    const y = Math.floor(enemy.y);
    const fluid = FLUIDS[enemy.def.fluid];
    if (enemy.def.id === "castleKnight" || enemy.def.id === "castleArcher") {
      drawCastleSoldier(enemy, x, y, fluid);
      continue;
    }
    if (enemy.def.id === "spikedBrute") {
      drawSpikedBrute(enemy, x, y, fluid);
      continue;
    }
    if (enemy.def.id === "gargoyle") {
      drawGargoyleEnemy(enemy, x, y, fluid);
      continue;
    }
    if (isSwampEnemy(enemy)) {
      drawSwampEnemy(enemy, x, y, fluid);
      continue;
    }
    if (enemy.def.movement === "flying") {
      drawFlyingEnemy(enemy, x, y, fluid);
      continue;
    }
    if (enemy.def.movement === "burrow") {
      drawBurrowEnemy(enemy, x, y, fluid);
      continue;
    }
    drawWalkerEnemy(enemy, x, y, fluid);
  }
}

function drawEnemyHealth(enemy, x, y, width, fluid) {
  ctx.fillStyle = "rgba(0,0,0,.48)";
  ctx.fillRect(x - width * 0.5, y, width, 4);
  ctx.fillStyle = fluid.secondary;
  ctx.fillRect(x - width * 0.5, y, width * Math.max(0, enemy.hp / enemy.maxHp), 4);
}

function drawEnemyAlert(enemy, x, y) {
  if (!(enemy.seesPlayer || enemy.chaseTimer > 0)) return;
  ctx.fillStyle = enemy.seesPlayer ? "#d6ad55" : "rgba(214,173,85,.55)";
  ctx.fillRect(x - 3, y, 6, 14);
  ctx.fillRect(x - 3, y + 18, 6, 5);
}

function drawSwampEnemy(enemy, x, y, fluid) {
  const footY = enemy.def.movement === "flying" ? y + enemy.def.height * 0.45 : enemyGroundY(enemy);
  const facing = enemy.patrolDir || 1;
  const hurt = enemy.hurt > 0;
  const pulse = Math.sin(state.time * 6 + enemy.phaseOffset);
  const frame = Math.floor((state.time * (enemy.chaseTimer > 0 ? 8 : 5) + enemy.phaseOffset) % 4);
  const step = [-3, 2, 3, -2][frame];
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.26)";
  ctx.fillRect(x - enemy.def.width * 0.48, footY + 3, enemy.def.width * 0.96, 6);
  ctx.translate(x, footY);
  ctx.scale(facing, 1);
  if (enemy.attackWind > 0) {
    ctx.globalAlpha = 0.36 + Math.sin(state.time * 22) * 0.16;
    ctx.strokeStyle = enemy.def.id === "seaJelly" ? "#a4d7be" : "#d6ad55";
    ctx.lineWidth = 2;
    ctx.strokeRect(-enemy.def.width * 0.55, -enemy.def.height - 24, enemy.def.width * 1.1, enemy.def.height + 24);
    ctx.globalAlpha = 1;
  }
  if (enemy.def.id === "hugeLobster") {
    const shell = hurt ? fluid.secondary : "#8c332f";
    const shellDark = "#3b1615";
    const clawOpen = enemy.attackWind > 0 || Math.floor(state.time * 5 + enemy.phaseOffset) % 2 === 0;
    ctx.fillStyle = "#17110d";
    ctx.fillRect(-45, -46, 84, 38);
    ctx.fillRect(20, -54, 38, 25);
    ctx.fillRect(-68, -37, 34, 23);
    ctx.fillRect(-32, -54, 44, 12);
    ctx.fillStyle = shell;
    ctx.fillRect(-40, -42, 76, 30);
    ctx.fillRect(24, -50, 30, 20);
    ctx.fillRect(-64, -34, 28, 18);
    ctx.fillRect(-29, -52, 38, 9);
    ctx.fillStyle = shellDark;
    ctx.fillRect(-34, -36, 62, 4);
    ctx.fillRect(-28, -28, 54, 4);
    ctx.fillRect(31, -44, 18, 3);
    ctx.fillStyle = "#d4b36b";
    for (let i = -30; i <= 26; i += 14) ctx.fillRect(i, -45, 8, 6);
    ctx.fillRect(29, -53, 8, 4);
    ctx.fillRect(-58, -37, 7, 4);
    ctx.fillStyle = "#111";
    ctx.fillRect(39, -45, 3, 3);
    ctx.fillRect(48, -44, 3, 3);
    ctx.fillStyle = "#2b1815";
    for (let i = -35; i <= 30; i += 13) ctx.fillRect(i + step * 0.35, -13, 7, 14 + Math.round(pulse * 2));
    ctx.fillStyle = "#4b241f";
    ctx.fillRect(-79, -27, 17, 8);
    ctx.fillRect(-79, -39, 17, 8);
    if (clawOpen) ctx.fillRect(-85, -45, 11, 6);
    ctx.fillStyle = "#f1d798";
    ctx.fillRect(-84, -33, 12, 4);
    if (enemy.attackWind > 0) {
      ctx.fillStyle = "#c9f6de";
      ctx.fillRect(49, -42, 34, 7);
      ctx.fillStyle = "#7fc5b5";
      ctx.fillRect(75, -39, 22, 4);
    }
  } else if (enemy.def.id === "alligator") {
    const hide = hurt ? fluid.secondary : "#3f6849";
    const low = enemy.lungeTime > 0 || Boolean(waterAtX(enemy.x));
    ctx.fillStyle = "#11170f";
    ctx.fillRect(-58, -30, 108, low ? 20 : 27);
    ctx.fillRect(30, -43, 50, low ? 19 : 24);
    ctx.fillRect(-72, -21, 26, 13);
    ctx.fillStyle = hide;
    ctx.fillRect(-54, -27, 101, low ? 15 : 21);
    ctx.fillRect(33, -39, 43, low ? 14 : 19);
    ctx.fillRect(-70, -19, 25, 10);
    ctx.fillStyle = "#7f9a62";
    for (let i = -43; i <= 34; i += 14) ctx.fillRect(i, -34 + (i % 3), 9, 7);
    ctx.fillStyle = "#fff0b5";
    ctx.fillRect(66, -28, 6, 3);
    ctx.fillRect(56, -23, 6, 3);
    ctx.fillRect(73, -23, 5, 3);
    ctx.fillStyle = "#c2433d";
    ctx.fillRect(52, -34, 4, 3);
    ctx.fillRect(64, -34, 4, 3);
    ctx.fillStyle = "#1e2a1f";
    ctx.fillRect(-48 + step, -8, 18, 8);
    ctx.fillRect(12 - step, -8, 18, 8);
    ctx.fillStyle = "rgba(132,184,151,.55)";
    if (low) {
      ctx.fillRect(-65, -5, 128, 4);
      ctx.fillRect(-44, -1, 42, 3);
    }
  } else if (enemy.def.id === "seaJelly") {
    ctx.translate(0, -enemy.def.height * 0.55);
    const bell = hurt ? fluid.secondary : "#7fc8b2";
    ctx.globalAlpha = 0.86;
    ctx.fillStyle = "#0c2925";
    ctx.fillRect(-27, -20, 54, 28);
    ctx.fillRect(-21, -26, 42, 12);
    ctx.fillStyle = bell;
    ctx.fillRect(-24, -23, 48, 25);
    ctx.fillRect(-17, -29, 34, 10);
    ctx.fillStyle = "#c9f6de";
    ctx.fillRect(-14, -18, 28, 4);
    ctx.fillRect(-5, -27, 10, 3);
    ctx.fillStyle = "#6b4ea0";
    ctx.fillRect(-8, -10, 16, 8);
    ctx.fillStyle = "#1e3f37";
    for (let i = -21; i <= 21; i += 10) {
      ctx.fillRect(i, 1, 5, 31 + Math.round(pulse * 5 + (i % 2) * 2));
      ctx.fillStyle = "#a4d7be";
      ctx.fillRect(i + 1, 14, 2, 10 + Math.round(pulse * 2));
      ctx.fillStyle = "#1e3f37";
    }
    ctx.globalAlpha = 1;
  } else {
    const armor = hurt ? fluid.secondary : "#9aa09a";
    const cloth = "#314d6b";
    ctx.fillStyle = "#17110d";
    ctx.fillRect(-16, -61, 32, 22);
    ctx.fillRect(-19, -41, 38, 36);
    ctx.fillRect(-21, -12, 13, 26 + step);
    ctx.fillRect(8, -12, 13, 26 - step);
    ctx.fillStyle = armor;
    ctx.fillRect(-13, -58, 26, 17);
    ctx.fillRect(-16, -38, 32, 30);
    ctx.fillStyle = cloth;
    ctx.fillRect(-12, -24, 24, 23);
    ctx.fillStyle = "#6f8478";
    ctx.fillRect(-14, -35, 10, 20);
    ctx.fillRect(5, -35, 10, 20);
    ctx.fillStyle = "#c9f6de";
    ctx.fillRect(-8, -57, 16, 3);
    ctx.fillStyle = "#111";
    ctx.fillRect(-9, -51, 18, 5);
    ctx.fillStyle = "#4d382a";
    ctx.fillRect(16, -50, 7, 66);
    ctx.fillStyle = "#a4d7be";
    ctx.fillRect(18, -56, 30, 5);
    ctx.fillRect(39, -60, 5, 13);
    ctx.fillRect(9, -61, 5, 16);
    ctx.fillStyle = "#2f241b";
    ctx.fillRect(-18 + step * 0.5, -5, 10, 20);
    ctx.fillRect(8 - step * 0.5, -5, 10, 20);
    if (enemy.attackWind > 0 || enemy.castleStrike > 0) {
      ctx.fillStyle = "rgba(164,215,190,.9)";
      ctx.fillRect(22, -43, 42, 4);
      ctx.fillRect(54, -49, 6, 16);
    }
  }
  ctx.restore();
  drawEnemyAlert(enemy, x, y - enemy.def.height - 28);
  drawEnemyHealth(enemy, x, y - enemy.def.height * 0.8 - 28, Math.max(42, enemy.def.width * 0.78), fluid);
}

function drawCastleSoldier(enemy, x, y, fluid) {
  const footY = enemyGroundY(enemy);
  const drawY = footY - 20;
  const archer = enemy.def.id === "castleArcher";
  const facing = enemy.patrolDir || 1;
  const frame = Math.floor((state.time * (enemy.chaseTimer > 0 ? 8 : 5) + enemy.phaseOffset) % 4);
  const stride = [-2, 2, 1, -2][frame];
  const windup = enemy.attackWind > 0;
  const strike = (enemy.castleStrike ?? 0) > 0;
  const armor = enemy.hurt > 0 ? "#ffb0a8" : "#e8e3d4";
  const armorShade = enemy.hurt > 0 ? fluid.secondary : "#b8b5aa";
  const dark = "#17110d";
  const purple = "#4b326b";
  const gold = "#d6ad55";
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.28)";
  ctx.fillRect(x - 26, footY + 3, 52, 6);
  ctx.translate(x, drawY);
  ctx.scale(facing, 1);
  if (windup) {
    ctx.globalAlpha = 0.45 + Math.sin(state.time * 24) * 0.14;
    ctx.strokeStyle = gold;
    ctx.lineWidth = 2;
    ctx.strokeRect(-30, -62, 60, 66);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = dark;
  ctx.fillRect(-19 - Math.max(0, -stride), -33, 13, 44);
  ctx.fillRect(-13, -54, 26, 18);
  ctx.fillRect(-17, -37, 34, 31);
  ctx.fillStyle = armorShade;
  ctx.fillRect(-11, -52, 22, 16);
  ctx.fillRect(-14, -34, 28, 28);
  ctx.fillStyle = armor;
  ctx.fillRect(-9, -50, 18, 12);
  ctx.fillRect(-11, -32, 22, 22);
  ctx.fillStyle = purple;
  ctx.fillRect(-10, -19, 20, 19);
  ctx.fillStyle = "#301d45";
  ctx.fillRect(-18, -34, 8, 36);
  ctx.fillRect(-24, -10 + stride, 11, 13);
  ctx.fillStyle = "#fff8dc";
  ctx.fillRect(-10, -49, 20, 4);
  ctx.fillStyle = "#111";
  ctx.fillRect(-8, -45, 16, 5);
  ctx.fillStyle = gold;
  ctx.fillRect(-3, -58, 6, 6);
  ctx.fillRect(-2, -62, 4, 6);
  ctx.fillRect(-4, -31, 8, 4);
  ctx.fillStyle = armorShade;
  ctx.fillRect(-16, -5, 9, 22 + stride);
  ctx.fillRect(7, -5, 9, 22 - stride);
  ctx.fillStyle = armor;
  ctx.fillRect(-14, -4, 7, 18 + stride);
  ctx.fillRect(9, -4, 7, 18 - stride);
  ctx.fillStyle = dark;
  ctx.fillRect(-18, 15 + stride, 13, 5);
  ctx.fillRect(5, 15 - stride, 13, 5);
  if (archer) {
    ctx.fillStyle = "#2b1b3f";
    ctx.fillRect(-23, -55, 9, 38);
    ctx.fillStyle = gold;
    ctx.fillRect(-19, -51, 3, 20);
    ctx.strokeStyle = "#6a5237";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(17, -25, 18, -1.2, 1.2);
    ctx.stroke();
    ctx.strokeStyle = "#d8d0a4";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(17, -43);
    ctx.lineTo(17, -7);
    ctx.stroke();
    if (windup) {
      ctx.fillStyle = "#caa7ff";
      ctx.fillRect(18, -27, 34, 3);
      ctx.fillStyle = "#fff0b5";
      ctx.fillRect(43, -31, 8, 8);
      ctx.fillStyle = "rgba(111,63,200,.55)";
      ctx.fillRect(51, -26, 16, 2);
    }
  } else {
    ctx.fillStyle = purple;
    ctx.fillRect(-31, -37, 20, 33);
    ctx.fillStyle = gold;
    ctx.fillRect(-23, -31, 5, 20);
    ctx.fillRect(-28, -23, 14, 4);
    ctx.fillRect(-30, -37, 18, 3);
    ctx.fillStyle = "#fff0b5";
    ctx.fillRect(-27, -34, 13, 2);
    ctx.fillStyle = "#c7c3ae";
    const swordLift = windup ? -18 : strike ? 8 : 0;
    ctx.fillRect(15, -34 + swordLift, 5, 49);
    ctx.fillStyle = "#eef0e8";
    ctx.fillRect(18, -34 + swordLift, 3, 45);
    ctx.fillStyle = dark;
    ctx.fillRect(12, 8 + swordLift, 12, 4);
    if (strike) {
      ctx.fillStyle = "rgba(255,240,181,.7)";
      ctx.fillRect(24, -30, 38, 6);
      ctx.fillRect(43, -22, 22, 4);
    }
  }
  ctx.restore();
  drawEnemyAlert(enemy, x, drawY - 76);
  drawEnemyHealth(enemy, x, drawY - 68, archer ? 38 : 46, fluid);
}

function drawSpikedBrute(enemy, x, y, fluid) {
  const footY = enemyGroundY(enemy);
  const drawY = footY - 24;
  const facing = enemy.patrolDir || 1;
  const charging = (enemy.chargeTime ?? 0) > 0;
  const windup = enemy.attackWind > 0;
  const armor = enemy.hurt > 0 ? fluid.secondary : "#3e4442";
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.36)";
  ctx.fillRect(x - 52, footY + 3, 104, 9);
  if (charging) {
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "#ff5a66";
    ctx.fillRect(x - facing * 96, drawY - 38, 90, 10);
    ctx.fillStyle = "#fff0b5";
    ctx.fillRect(x - facing * 55, drawY - 35, 28, 4);
    ctx.globalAlpha = 1;
  }
  ctx.translate(x, drawY);
  ctx.scale(facing, 1);
  if (windup) {
    ctx.globalAlpha = 0.5 + Math.sin(state.time * 22) * 0.16;
    ctx.strokeStyle = "#ff5a66";
    ctx.lineWidth = 3;
    ctx.strokeRect(-46, -66, 92, 72);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = "#17110d";
  ctx.fillRect(-36, -52, 72, 52);
  ctx.fillRect(-24, -72, 48, 27);
  ctx.fillRect(-54, -50, 22, 42);
  ctx.fillRect(32, -50, 22, 42);
  ctx.fillStyle = armor;
  ctx.fillRect(-32, -48, 64, 46);
  ctx.fillRect(-21, -68, 42, 23);
  ctx.fillStyle = "#273229";
  ctx.fillRect(-50, -46, 18, 35);
  ctx.fillRect(32, -46, 18, 35);
  ctx.fillStyle = "#6f746d";
  ctx.fillRect(-39, -45, 16, 32);
  ctx.fillRect(23, -45, 16, 32);
  ctx.fillStyle = "#a5a99b";
  for (const sx of [-45, -30, -12, 10, 28, 43]) ctx.fillRect(sx, sx === -45 || sx === 43 ? -56 : -73, 7, sx === -45 || sx === 43 ? 10 : 12);
  ctx.fillStyle = "#4b326b";
  ctx.fillRect(-18, -28, 36, 26);
  ctx.fillStyle = "#2d2f2a";
  ctx.fillRect(-13, -28, 26, 20);
  ctx.fillStyle = "#8f876f";
  ctx.fillRect(-9, -24, 18, 4);
  ctx.fillRect(-9, -17, 18, 4);
  ctx.fillStyle = "#b53a45";
  ctx.fillRect(6, -59, 5, 4);
  if (charging || windup) ctx.fillRect(13, -59, 5, 4);
  ctx.fillStyle = "#2a0d12";
  ctx.fillRect(-10, -59, 5, 4);
  if (charging || windup) ctx.fillRect(-17, -59, 5, 4);
  ctx.fillStyle = "#fff0b5";
  ctx.fillRect(-22, -54, 5, 15);
  ctx.fillRect(17, -54, 5, 15);
  ctx.fillStyle = "#17110d";
  ctx.fillRect(-63, -30, 22, 22);
  ctx.fillRect(41, -30, 22, 22);
  ctx.fillStyle = armor;
  ctx.fillRect(-60, -27, 17, 17);
  ctx.fillRect(43, -27, 17, 17);
  ctx.fillStyle = "#9a9c90";
  ctx.fillRect(-58, -37, 6, 9);
  ctx.fillRect(52, -37, 6, 9);
  ctx.fillStyle = "#17110d";
  ctx.fillRect(-31, -2, 13, 23);
  ctx.fillRect(18, -2, 13, 23);
  ctx.fillRect(-33, 18, 17, 6);
  ctx.fillRect(16, 18, 17, 6);
  ctx.restore();
  drawEnemyAlert(enemy, x, drawY - 86);
  drawEnemyHealth(enemy, x, drawY - 78, 62, fluid);
}

function drawGargoyleEnemy(enemy, x, y, fluid) {
  const frame = Math.floor((state.time * 9 + enemy.phaseOffset) % 3);
  const wing = [-14, -4, 7][frame];
  const facing = enemy.patrolDir || 1;
  const lunging = enemy.lungeTime > 0;
  const spitting = (enemy.spitWind ?? 0) > 0;
  const stone = enemy.hurt > 0 ? fluid.secondary : "#5a605d";
  const dark = "#17110d";
  const wingMembrane = enemy.hurt > 0 ? "#b53a45" : "#6b3b86";
  const shadowW = clamp(74 - (state.room.floorY - y) * 0.09, 28, 58);
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.24)";
  ctx.fillRect(x - shadowW * 0.5, state.room.floorY + 3, shadowW, 6);
  if (lunging) {
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "#d6ad55";
    ctx.fillRect(x - facing * 62, y - 10, 58, 8);
    ctx.globalAlpha = 1;
  }
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  if (enemy.attackWind > 0 || spitting) {
    ctx.globalAlpha = 0.45 + Math.sin(state.time * 22) * 0.16;
    ctx.strokeStyle = spitting ? "#ff5a66" : "#d6ad55";
    ctx.lineWidth = 2;
    ctx.strokeRect(-42, -45, 84, 68);
    if (spitting) {
      ctx.fillStyle = "#ff5a66";
      ctx.fillRect(24, -22, 13, 10);
      ctx.fillStyle = "#fff0b5";
      ctx.fillRect(34, -19, 5, 4);
    }
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = dark;
  ctx.fillRect(-18, -32, 36, 50);
  ctx.fillRect(-25, -12, 50, 28);
  ctx.fillRect(16, -39, 18, 12);
  ctx.fillRect(-34, -38, 18, 12);
  ctx.fillStyle = stone;
  ctx.fillRect(-15, -29, 30, 43);
  ctx.fillRect(-22, -9, 44, 22);
  ctx.fillRect(18, -36, 13, 9);
  ctx.fillRect(-31, -35, 13, 9);
  ctx.fillStyle = "#3c4340";
  ctx.fillRect(-76, -26 + wing, 54, 11);
  ctx.fillRect(-66, -14 + wing, 42, 10);
  ctx.fillRect(-54, -3 + wing, 26, 8);
  ctx.fillRect(22, -26 + wing, 54, 11);
  ctx.fillRect(24, -14 + wing, 42, 10);
  ctx.fillRect(28, -3 + wing, 26, 8);
  ctx.fillStyle = wingMembrane;
  ctx.fillRect(-67, -20 + wing, 38, 7);
  ctx.fillRect(-57, -8 + wing, 28, 6);
  ctx.fillRect(29, -20 + wing, 38, 7);
  ctx.fillRect(31, -8 + wing, 28, 6);
  ctx.fillStyle = "#a5a99b";
  ctx.fillRect(-70, -24 + wing, 38, 3);
  ctx.fillRect(33, -24 + wing, 38, 3);
  ctx.fillRect(-4, -43, 8, 10);
  ctx.fillRect(-15, -38, 7, 8);
  ctx.fillRect(8, -38, 7, 8);
  ctx.fillStyle = "#ff5a66";
  ctx.fillRect(-5, -18, 4, 4);
  ctx.fillRect(4, -18, 4, 4);
  ctx.fillStyle = "#e7e1c4";
  ctx.fillRect(16, -8, 6, 4);
  ctx.fillRect(-22, -8, 6, 4);
  ctx.fillStyle = "#2b302d";
  for (const sx of [-10, 0, 10]) ctx.fillRect(sx - 3, -29, 6, 4);
  ctx.fillStyle = dark;
  ctx.fillRect(-13, 12, 6, 17);
  ctx.fillRect(7, 12, 6, 17);
  ctx.fillRect(-4, 16, 8, 15);
  ctx.restore();
  drawEnemyAlert(enemy, x, y - 58);
  drawEnemyHealth(enemy, x, y - 48, 52, fluid);
}

function drawWalkerEnemy(enemy, x, y, fluid) {
  const facing = enemy.patrolDir || 1;
  const frame = Math.floor((state.time * (enemy.chaseTimer > 0 ? 12 : 7) + enemy.phaseOffset) % 4);
  const windup = enemy.attackWind > 0;
  const lunging = enemy.lungeTime > 0;
  const lift = Math.round(enemy.leapLift ?? 0);
  const drawY = y - lift;
  const legPose = [
    [-4, 5, 0, 7],
    [2, 8, -3, 4],
    [4, 5, 0, 7],
    [-2, 4, 3, 8]
  ][frame];
  const bodyColor = enemy.hurt > 0 ? fluid.secondary : "#2d3828";
  const mossColor = enemy.hurt > 0 ? fluid.primary : "#6f8b45";
  const dark = "#10150f";
  const stone = "#65705e";
  const lightStone = "#89927a";

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.3)";
  ctx.fillRect(x - 34, state.room.floorY + 3, 68, 6);
  if (lunging) {
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "#d6ad55";
    ctx.fillRect(x - facing * 56 - 8, drawY - 18, 44, 6);
    ctx.fillRect(x - facing * 42 - 8, drawY - 6, 28, 4);
    ctx.globalAlpha = 1;
  }

  ctx.translate(x, drawY);
  ctx.scale(facing, 1);
  if (windup) {
    const pulse = 0.56 + Math.sin(state.time * 26) * 0.18;
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = "#ffd879";
    ctx.lineWidth = 2;
    ctx.strokeRect(-36, -31, 72, 47);
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = dark;
  ctx.fillRect(-32, -12, 64, 25);
  ctx.fillRect(-24, -24, 48, 16);
  ctx.fillStyle = bodyColor;
  ctx.fillRect(-29, -10, 58, 21);
  ctx.fillRect(-21, -23, 42, 14);
  ctx.fillStyle = stone;
  ctx.fillRect(-24, -20, 13, 8);
  ctx.fillRect(-8, -22, 16, 9);
  ctx.fillRect(11, -18, 12, 7);
  ctx.fillRect(-27, -8, 14, 8);
  ctx.fillRect(9, -7, 17, 8);
  ctx.fillStyle = lightStone;
  ctx.fillRect(-22, -19, 7, 2);
  ctx.fillRect(-4, -21, 8, 2);
  ctx.fillRect(13, -17, 6, 2);
  ctx.fillStyle = "#3e4a3c";
  ctx.fillRect(-30, -2, 20, 5);
  ctx.fillRect(8, -1, 24, 5);
  ctx.fillStyle = mossColor;
  ctx.fillRect(-25, -28, 50, 7);
  ctx.fillRect(-31, -15, 10, 5);
  ctx.fillRect(18, -14, 12, 5);
  ctx.fillRect(-18, -31, 6, 4);
  ctx.fillRect(7, -30, 5, 4);
  ctx.fillRect(-4, -34, 8, 5);
  ctx.fillStyle = "#4d371f";
  ctx.fillRect(-36, -10, 10, 4);
  ctx.fillRect(27, -11, 12, 4);
  ctx.fillRect(-13, -30, 5, 17);
  ctx.fillRect(14, -29, 5, 15);
  ctx.fillStyle = dark;
  ctx.fillRect(-22, -7, 44, 10);
  ctx.fillStyle = "#f0dfaf";
  for (let i = 0; i < enemy.def.eyeCount; i += 1) {
    ctx.fillRect(-15 + i * 9, -4 + (i % 2), 2, 2);
  }

  ctx.fillStyle = dark;
  const legXs = [-24, -9, 8, 23];
  for (let i = 0; i < legXs.length; i += 1) {
    const offset = legPose[i % legPose.length];
    ctx.fillRect(legXs[i] - 3 + offset, 8, 6, 16 + (i % 2 ? 3 : 0));
    ctx.fillRect(legXs[i] - 7 + offset, 22 + (i % 2 ? 2 : 0), 13, 5);
  }
  ctx.fillStyle = mossColor;
  ctx.fillRect(-29, 12, 5, 8);
  ctx.fillRect(18, 13, 5, 7);
  if (windup) {
    ctx.fillStyle = "#f0dfaf";
    ctx.fillRect(20, -10, 16, 4);
    ctx.fillRect(30, -6, 10, 4);
  }
  ctx.restore();

  drawEnemyAlert(enemy, x, drawY - 48);
  drawEnemyHealth(enemy, x, drawY - 36, 48, fluid);
}

function drawFlyingEnemy(enemy, x, y, fluid) {
  const frame = Math.floor((state.time * 10 + enemy.phaseOffset) % 3);
  const lunging = enemy.lungeTime > 0;
  const windup = enemy.attackWind > 0;
  const facing = enemy.patrolDir || 1;
  const heightAboveFloor = Math.max(20, state.room.floorY - y);
  const shadowW = clamp(56 - heightAboveFloor * 0.08, 26, 48);
  const wingLift = [-9, 0, 7][frame];
  const bodyColor = enemy.hurt > 0 ? fluid.secondary : "#273326";
  const mossColor = enemy.hurt > 0 ? fluid.primary : "#6e8b4a";
  const wingColor = enemy.hurt > 0 ? fluid.primary : "#66705b";

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.23)";
  ctx.fillRect(Math.floor(x - shadowW * 0.5), state.room.floorY + 3, Math.floor(shadowW), 5);

  if (lunging) {
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = "#d6ad55";
    ctx.fillRect(x - facing * 42 - 8, y - 5, 42, 7);
    ctx.fillRect(x - facing * 30 - 8, y + 8, 28, 4);
    ctx.globalAlpha = 1;
  }

  ctx.translate(x, y);
  ctx.scale(facing, 1);

  if (windup) {
    const pulse = 0.45 + Math.sin(state.time * 22) * 0.18;
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = "#d6ad55";
    ctx.lineWidth = 2;
    ctx.strokeRect(-33, -31, 66, 54);
    ctx.fillStyle = "#fff0b5";
    ctx.fillRect(-3, -42, 6, 15);
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = "#10150f";
  ctx.fillRect(-13, -22, 26, 43);
  ctx.fillRect(-21, -10, 42, 23);
  ctx.fillStyle = wingColor;
  ctx.fillRect(-52, -18 - wingLift, 33, 8);
  ctx.fillRect(-47, -9 - wingLift, 25, 8);
  ctx.fillRect(19, -18 - wingLift, 33, 8);
  ctx.fillRect(22, -9 - wingLift, 25, 8);
  ctx.fillStyle = "#a3a88e";
  ctx.fillRect(-49, -17 - wingLift, 23, 2);
  ctx.fillRect(25, -17 - wingLift, 23, 2);
  ctx.fillStyle = bodyColor;
  ctx.fillRect(-17, -18, 34, 34);
  ctx.fillStyle = mossColor;
  ctx.fillRect(-14, -25, 28, 8);
  ctx.fillRect(-21, -8, 8, 7);
  ctx.fillRect(13, -8, 8, 7);
  ctx.fillStyle = "#4d371f";
  for (const tx of [-14, -6, 4, 12]) {
    ctx.fillRect(tx, 12 + Math.round(Math.sin(state.time * 4 + tx) * 3), 4, 18);
  }
  ctx.fillStyle = "#77806d";
  ctx.fillRect(-11, -20, 8, 4);
  ctx.fillRect(3, -20, 8, 4);
  ctx.fillRect(-16, -4, 6, 5);
  ctx.fillRect(10, -4, 6, 5);
  ctx.fillStyle = "#050605";
  ctx.fillRect(-9, -10, 18, 18);
  ctx.fillStyle = "#d6c09a";
  ctx.fillRect(-3, -4, 6, 6);
  ctx.fillStyle = "rgba(214,173,85,.45)";
  ctx.fillRect(-6, -1, 12, 2);
  ctx.fillStyle = "#11170f";
  ctx.fillRect(-10, 14, 5, 12);
  ctx.fillRect(5, 14, 5, 12);
  ctx.fillRect(-2, 17, 4, 9);

  if (enemy.seesPlayer || enemy.chaseTimer > 0) {
    ctx.fillStyle = enemy.seesPlayer ? "#d6ad55" : "rgba(214,173,85,.55)";
    ctx.fillRect(-2, -36, 5, 12);
    ctx.fillRect(-2, -20, 5, 4);
  }
  ctx.restore();

  drawEnemyHealth(enemy, x, y - 39, 42, fluid);
}

function drawBurrowEnemy(enemy, x, y, fluid) {
  const floorY = state.room.floorY;
  const exposed = enemy.burrowState === "exposed";
  const warning = enemy.attackWind > 0;
  const pulse = 0.5 + Math.sin(state.time * 22) * 0.24;
  const frame = Math.floor((state.time * 7 + enemy.phaseOffset) % 2);

  ctx.fillStyle = "rgba(0,0,0,.28)";
  ctx.fillRect(x - 30, floorY + 3, 60, 6);

  if (!exposed) {
    const crackW = warning ? 88 : 46;
    ctx.fillStyle = warning ? `rgba(214,173,85,${0.35 + pulse * 0.28})` : "rgba(61,83,50,.44)";
    ctx.fillRect(x - crackW * 0.5, floorY - 10, crackW, 7);
    ctx.fillStyle = warning ? "#d6ad55" : "#385732";
    ctx.fillRect(x - 28 - frame * 2, floorY - 17, 11, 5);
    ctx.fillRect(x - 5, floorY - 14 - frame, 15, 4);
    ctx.fillRect(x + 18 + frame * 2, floorY - 19, 12, 5);
    ctx.fillStyle = "#8b8d73";
    ctx.fillRect(x - 34, floorY - 7, 5, 7);
    ctx.fillRect(x + 28, floorY - 8, 6, 8);
    ctx.fillStyle = "#4d371f";
    ctx.fillRect(x - 18, floorY - 13, 5, 9);
    ctx.fillRect(x + 10, floorY - 15, 4, 11);
    if (warning) {
      ctx.strokeStyle = `rgba(255,240,181,${0.45 + pulse * 0.25})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 48, floorY - 43, 96, 38);
      ctx.fillStyle = "#fff0b5";
      ctx.fillRect(x - 3, floorY - 54, 6, 14);
      ctx.fillRect(x - 3, floorY - 35, 6, 5);
    }
    return;
  }

  const t = clamp(enemy.popTime / (enemy.def.popDuration ?? 3), 0, 1);
  const bob = Math.round(Math.sin(state.time * 9 + enemy.phaseOffset) * 2) + (frame ? 1 : -1);
  const bodyColor = enemy.hurt > 0 ? fluid.secondary : "#293525";
  const mossColor = enemy.hurt > 0 ? fluid.primary : "#6f8b45";
  ctx.fillStyle = "#10150f";
  ctx.fillRect(x - 23, floorY - 51 + bob, 46, 52);
  ctx.fillStyle = bodyColor;
  ctx.fillRect(x - 19, floorY - 48 + bob, 38, 49);
  ctx.fillStyle = "#677060";
  ctx.fillRect(x - 15, floorY - 67 + bob, 30, 25);
  ctx.fillRect(x - 17, floorY - 37 + bob, 34, 30);
  ctx.fillRect(x - 20, floorY - 50 + bob, 40, 12);
  ctx.fillStyle = "#4d371f";
  ctx.fillRect(x - 26, floorY - 44 + bob, 7, 36);
  ctx.fillRect(x + 19, floorY - 42 + bob, 7, 34);
  ctx.fillStyle = "#8e9279";
  ctx.fillRect(x - 9, floorY - 63 + bob, 10, 3);
  ctx.fillRect(x + 4, floorY - 56 + bob, 8, 3);
  ctx.fillStyle = mossColor;
  ctx.fillRect(x - 17, floorY - 72 + bob, 34, 8);
  ctx.fillRect(x - 23, floorY - 33 + bob, 8, 21);
  ctx.fillRect(x + 15, floorY - 33 + bob, 8, 21);
  ctx.fillStyle = "#11170f";
  ctx.fillRect(x - 11, floorY - 15 + bob, 7, 14);
  ctx.fillRect(x + 4, floorY - 15 + bob, 7, 14);
  ctx.fillRect(x - 4, floorY - 8 + bob, 8, 9);
  ctx.fillStyle = "#d6c09a";
  ctx.fillRect(x - 7, floorY - 56 + bob, 2, 2);
  ctx.fillRect(x, floorY - 56 + bob, 2, 2);
  ctx.fillRect(x + 7, floorY - 56 + bob, 2, 2);
  if (warning) {
    ctx.fillStyle = "#f0dfaf";
    ctx.fillRect(x - 18, floorY - 49 + bob, 36, 4);
    ctx.fillRect(x + 13, floorY - 44 + bob, 14, 4);
  }
  ctx.fillStyle = "rgba(214,173,85,.55)";
  ctx.fillRect(x - 25, floorY - 71, 50 * t, 4);
  drawEnemyHealth(enemy, x, floorY - 80, 46, fluid);
}

function drawIronWardenBoss() {
  const boss = state.boss;
  const x = Math.floor(boss.x);
  const floorY = state.room.floorY;
  const y = Math.floor(floorY - 32);
  const fluid = FLUIDS[boss.def.fluid];
  const facing = boss.facing || sign(player.x - boss.x || -1);
  const attack = boss.attack;
  const windup = attack && (
    (attack.type === "maceSwing" && attack.t < 0.58) ||
    (attack.type === "shieldBash" && attack.t < 0.52) ||
    (attack.type === "groundPound" && attack.t < 0.78) ||
    (attack.type === "summonAxes" && !attack.fired)
  );
  const bob = Math.round(Math.sin(state.time * 5 + (boss.gaitOffset ?? 0)) * (Math.abs(boss.vx) > 10 ? 2 : 1));
  const armor = boss.hurt > 0 ? fluid.secondary : "#343a39";
  const trim = "#a58a59";
  const purple = "#4b326b";
  const dark = "#17110d";
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.38)";
  ctx.fillRect(x - 96, floorY + 3, 192, 10);
  if (windup) {
    ctx.globalAlpha = 0.42 + Math.sin(state.time * 22) * 0.14;
    ctx.strokeStyle = attack.type === "summonAxes" ? "#caa7ff" : "#d6ad55";
    ctx.lineWidth = 4;
    ctx.strokeRect(x - 105, floorY - 188, 210, 182);
    ctx.globalAlpha = 1;
  }
  if (attack?.type === "summonAxes" && !attack.fired) {
    for (const axe of attack.axes ?? []) {
      const a = axe.angle + state.time * 4;
      const ax = x + Math.cos(a) * 92;
      const ay = y - 48 + Math.sin(a) * 44;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(a * 1.7);
      ctx.fillStyle = dark;
      ctx.fillRect(-12, -3, 24, 6);
      ctx.fillRect(-3, -12, 6, 24);
      ctx.fillStyle = trim;
      ctx.fillRect(-15, -7, 9, 14);
      ctx.fillRect(6, -7, 9, 14);
      ctx.restore();
    }
  }
  ctx.translate(x, y + bob);
  ctx.scale(facing, 1);
  const bashLean = attack?.type === "shieldBash" && attack.t >= 0.52 && attack.t < 0.95 ? 12 : 0;
  ctx.translate(bashLean, 0);
  ctx.fillStyle = dark;
  ctx.fillRect(-42, -120, 84, 92);
  ctx.fillRect(-31, -154, 62, 40);
  ctx.fillRect(-50, -36, 30, 46);
  ctx.fillRect(20, -36, 30, 46);
  ctx.fillStyle = armor;
  ctx.fillRect(-38, -116, 76, 86);
  ctx.fillRect(-27, -150, 54, 34);
  ctx.fillRect(-47, -32, 24, 42);
  ctx.fillRect(23, -32, 24, 42);
  ctx.fillStyle = "#252b2a";
  ctx.fillRect(-50, -112, 18, 48);
  ctx.fillRect(32, -112, 18, 48);
  ctx.fillRect(-42, -61, 84, 12);
  ctx.fillStyle = trim;
  ctx.fillRect(-32, -112, 64, 9);
  ctx.fillRect(-24, -91, 48, 8);
  ctx.fillRect(-20, -69, 40, 8);
  ctx.fillRect(-47, -118, 22, 7);
  ctx.fillRect(25, -118, 22, 7);
  ctx.fillStyle = purple;
  ctx.fillRect(-20, -84, 40, 52);
  ctx.fillStyle = dark;
  ctx.fillRect(-20, -140, 40, 18);
  ctx.fillStyle = "#d6ad55";
  ctx.fillRect(-8, -169, 16, 16);
  ctx.fillRect(-18, -158, 36, 7);
  ctx.fillStyle = "#caa7ff";
  ctx.fillRect(-5, -132, 4, 13);
  ctx.fillRect(3, -132, 4, 13);
  ctx.fillStyle = "rgba(202,167,255,.45)";
  if (boss.phaseTwo) {
    ctx.fillRect(-9, -134, 4, 17);
    ctx.fillRect(9, -134, 4, 17);
  }
  ctx.fillStyle = "#2b2119";
  ctx.fillRect(-10, 5, 16, 22);
  ctx.fillRect(18, 5, 16, 22);
  ctx.fillRect(-14, 24, 24, 8);
  ctx.fillRect(16, 24, 24, 8);

  const swing = attack?.type === "maceSwing" && attack.t >= 0.58 && attack.t < 0.86;
  const maceX = swing ? 68 : 58;
  const maceY = swing ? -74 : -46;
  ctx.fillStyle = "#5a3d26";
  ctx.fillRect(maceX - 4, maceY, 8, 74);
  ctx.fillStyle = dark;
  ctx.fillRect(maceX - 25, maceY - 28, 50, 35);
  ctx.fillStyle = "#3d4039";
  ctx.fillRect(maceX - 21, maceY - 24, 42, 27);
  ctx.fillStyle = trim;
  for (const sx of [-18, -2, 14]) ctx.fillRect(maceX + sx, maceY - 31, 7, 9);
  if (swing) {
    ctx.fillStyle = "rgba(255,240,181,.65)";
    ctx.fillRect(maceX - 74, maceY - 24, 74, 7);
    ctx.fillRect(maceX - 54, maceY - 11, 54, 5);
  }

  const shieldPush = attack?.type === "shieldBash" && attack.t >= 0.52 && attack.t < 0.95 ? -12 : 0;
  ctx.fillStyle = dark;
  ctx.fillRect(-72 + shieldPush, -104, 38, 74);
  ctx.fillStyle = purple;
  ctx.fillRect(-68 + shieldPush, -100, 30, 66);
  ctx.fillStyle = trim;
  ctx.fillRect(-56 + shieldPush, -86, 6, 36);
  ctx.fillRect(-65 + shieldPush, -70, 24, 5);
  ctx.restore();
  ctx.fillStyle = "rgba(0,0,0,.56)";
  ctx.fillRect(x - 118, floorY - 205, 236, 9);
  ctx.fillStyle = fluid.secondary;
  ctx.fillRect(x - 118, floorY - 205, 236 * Math.max(0, boss.hp / boss.maxHp), 9);
}

function drawRedWolfBoss() {
  const boss = state.boss;
  const x = Math.floor(boss.x);
  const floorY = state.room.floorY;
  const y = Math.floor(floorY - (boss.leapLift ?? 0));
  const facing = boss.facing || sign(player.x - boss.x || -1);
  const fluid = FLUIDS[boss.def.fluid];
  const attack = boss.attack;
  const run = Math.abs(boss.vx) > 30 || attack?.type === "pounce";
  const frame = Math.floor((state.time * (run ? 9 : 4) + (boss.gaitOffset ?? 0)) % 4);
  const stride = [-9, 6, 9, -6][frame];
  const hide = boss.hurt > 0 ? fluid.secondary : "#84242b";
  const dark = "#201014";
  const glow = "#ff8b7d";
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.34)";
  ctx.fillRect(x - 94, floorY + 3, 188, 9);
  if (attack && attack.t < 0.44) {
    ctx.globalAlpha = 0.38 + Math.sin(state.time * 24) * 0.16;
    ctx.strokeStyle = glow;
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 96, y - 126, 192, 112);
    ctx.globalAlpha = 1;
  }
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  ctx.fillStyle = dark;
  ctx.fillRect(-72, -72, 134, 48);
  ctx.fillRect(28, -94, 54, 44);
  ctx.fillRect(64, -80, 30, 20);
  ctx.fillStyle = hide;
  ctx.fillRect(-68, -68, 128, 42);
  ctx.fillRect(31, -90, 48, 37);
  ctx.fillStyle = "#b93a42";
  ctx.fillRect(-42, -76, 72, 14);
  ctx.fillRect(52, -92, 18, 6);
  ctx.fillStyle = "#431115";
  ctx.fillRect(-75, -66, 16, 36);
  ctx.fillRect(-48, -83, 18, 16);
  ctx.fillRect(21, -73, 18, 12);
  ctx.fillRect(76, -77, 20, 9);
  ctx.fillStyle = dark;
  ctx.fillRect(45, -81, 24, 7);
  ctx.fillStyle = glow;
  ctx.fillRect(55, -79, 5, 4);
  ctx.fillRect(68, -79, 5, 4);
  ctx.fillStyle = "#ff5a66";
  if (boss.phaseTwo) {
    ctx.fillRect(-8, -72, 16, 5);
    ctx.fillRect(36, -86, 10, 4);
  }
  ctx.fillStyle = "#efe2c4";
  ctx.fillRect(80, -67, 10, 4);
  ctx.fillRect(82, -60, 8, 4);
  ctx.fillStyle = dark;
  ctx.fillRect(-58 + stride, -32, 12, 34);
  ctx.fillRect(-25 - stride, -32, 12, 34);
  ctx.fillRect(24 + stride, -32, 12, 34);
  ctx.fillRect(52 - stride, -32, 12, 34);
  ctx.fillRect(-65 + stride, -3, 25, 7);
  ctx.fillRect(-31 - stride, -3, 25, 7);
  ctx.fillRect(17 + stride, -3, 25, 7);
  ctx.fillRect(45 - stride, -3, 25, 7);
  ctx.fillStyle = "#431115";
  for (let i = 0; i < 5; i += 1) ctx.fillRect(-58 + i * 18, -82 - (i % 2) * 4, 12, 16);
  ctx.fillStyle = "rgba(255,139,125,.32)";
  for (let i = 0; i < 4; i += 1) {
    ctx.fillRect(-72 - i * 12, -60 + i * 4 + Math.round(Math.sin(state.time * 7 + i) * 2), 18, 5);
  }
  if (attack?.type === "howl" && attack.t < 0.82) {
    ctx.globalAlpha = 0.48 + Math.sin(state.time * 30) * 0.12;
    ctx.strokeStyle = glow;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(86, -72, 24 + attack.t * 46, -0.45, 0.45);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  ctx.fillStyle = "rgba(0,0,0,.56)";
  ctx.fillRect(x - 96, floorY - 136, 192, 8);
  ctx.fillStyle = fluid.secondary;
  ctx.fillRect(x - 96, floorY - 136, 192 * Math.max(0, boss.hp / boss.maxHp), 8);
}

function drawBoss() {
  const boss = state.boss;
  if (!boss || boss.dead) return;
  if (boss.def.id === "ironWarden") {
    drawIronWardenBoss();
    return;
  }
  if (boss.def.id === "redWolf") {
    drawRedWolfBoss();
    return;
  }
  const x = Math.floor(boss.x);
  const floorY = state.room.floorY;
  const drawY = Math.floor(floorY - (boss.leapLift ?? 0));
  const fluid = FLUIDS[boss.def.fluid];
  const facing = boss.facing || sign(player.x - boss.x || -1);
  const moving = Math.abs(boss.vx) > 18 && !boss.attack;
  const frame = Math.floor((state.time * (moving ? 7.5 : 3.5) + (boss.gaitOffset ?? 0)) % 4);
  const bodyColor = boss.hurt > 0 ? fluid.secondary : "#2b3828";
  const mossColor = boss.hurt > 0 ? fluid.primary : "#6f8b45";
  const stone = boss.hurt > 0 ? "#8d9276" : "#687160";
  const lightStone = "#909882";
  const dark = "#10150f";
  const attack = boss.attack;
  const windup = attack && (
    (attack.type === "charge" && attack.t < 0.62) ||
    (attack.type === "leapBite" && attack.t < 0.42) ||
    (attack.type === "slam" && attack.t < 0.58) ||
    (attack.type === "summon" && attack.t < 0.68) ||
    (attack.type === "thorns" && !attack.fired)
  );
  const leapT = attack?.type === "leapBite" && attack.t >= 0.42 && attack.t < 1.02 ? clamp((attack.t - 0.42) / 0.6, 0, 1) : 0;
  const squash = clamp(boss.squash ?? 0, 0, 1);
  const sx = 1 + squash * 0.08;
  const sy = 1 - squash * 0.1;
  const legPose = [
    [-8, 5, 4, 11, -4, 7, 6, 12],
    [5, 10, -6, 4, 7, 11, -5, 5],
    [8, 5, -4, 11, 4, 7, -6, 12],
    [-5, 10, 6, 4, -7, 11, 5, 5]
  ][frame];

  ctx.save();
  const shadowW = 220 - Math.min(70, (boss.leapLift ?? 0) * 0.75);
  ctx.fillStyle = "rgba(0,0,0,.34)";
  ctx.fillRect(Math.floor(x - shadowW * 0.5), floorY + 2, Math.floor(shadowW), 10);

  if (attack?.type === "charge" && attack.t < 0.62) {
    const pulse = 0.48 + Math.sin(state.time * 22) * 0.18;
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = "#ffd879";
    ctx.lineWidth = 4;
    ctx.strokeRect(x - 118, drawY - 122, 236, 112);
    ctx.fillStyle = "#fff0b5";
    ctx.fillRect(x + facing * 94 - 4, drawY - 104, 8, 30);
    ctx.globalAlpha = 1;
  }

  ctx.translate(x, drawY);
  ctx.scale(facing * sx, sy);
  if (leapT > 0) ctx.rotate((0.08 - Math.abs(leapT - 0.5) * 0.16) * -facing);

  if (windup) {
    const pulse = 0.42 + Math.sin(state.time * 26) * 0.16;
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = attack?.type === "summon" ? "#8fa15f" : "#d6ad55";
    ctx.lineWidth = 3;
    ctx.strokeRect(-112, -126, 224, 111);
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = dark;
  ctx.fillRect(-101, -66, 202, 49);
  ctx.fillRect(-76, -102, 152, 40);
  ctx.fillRect(-52, -121, 104, 25);

  ctx.fillStyle = bodyColor;
  ctx.fillRect(-96, -62, 192, 42);
  ctx.fillRect(-72, -96, 144, 34);
  ctx.fillRect(-46, -114, 92, 22);
  ctx.fillStyle = "#1b261c";
  ctx.fillRect(-103, -43, 28, 18);
  ctx.fillRect(76, -42, 28, 17);
  ctx.fillRect(-52, -75, 104, 15);

  ctx.fillStyle = stone;
  ctx.fillRect(-83, -91, 35, 16);
  ctx.fillRect(-42, -99, 38, 19);
  ctx.fillRect(4, -96, 38, 17);
  ctx.fillRect(49, -86, 31, 15);
  ctx.fillRect(-91, -57, 30, 18);
  ctx.fillRect(-37, -59, 45, 20);
  ctx.fillRect(27, -55, 52, 18);

  ctx.fillStyle = lightStone;
  ctx.fillRect(-78, -88, 16, 3);
  ctx.fillRect(-34, -96, 21, 3);
  ctx.fillRect(12, -93, 18, 3);
  ctx.fillRect(53, -83, 16, 3);
  ctx.fillRect(-84, -53, 17, 3);
  ctx.fillRect(38, -51, 24, 3);

  ctx.fillStyle = mossColor;
  ctx.fillRect(-85, -124, 170, 13);
  ctx.fillRect(-95, -103, 34, 12);
  ctx.fillRect(61, -102, 37, 12);
  ctx.fillRect(-59, -132, 11, 8);
  ctx.fillRect(-22, -134, 10, 8);
  ctx.fillRect(17, -132, 10, 8);
  ctx.fillRect(50, -130, 12, 8);
  ctx.fillRect(-105, -63, 22, 11);
  ctx.fillRect(83, -63, 22, 11);
  ctx.fillStyle = "#4d371f";
  for (const tx of [-92, -61, -24, 18, 55, 88]) {
    ctx.fillRect(tx, -117 + Math.floor(Math.sin(state.time * 3 + tx) * 2), 7, 43);
  }
  ctx.fillStyle = "#7f9c4d";
  for (const tx of [-70, -37, 2, 33, 70]) ctx.fillRect(tx, -136 + (tx % 2), 12, 6);

  ctx.fillStyle = dark;
  ctx.fillRect(-66, -72, 132, 28);
  ctx.fillRect(-77, -59, 154, 11);
  ctx.fillStyle = "#f0dfaf";
  for (let i = 0; i < 10; i += 1) {
    ctx.fillRect(-54 + i * 12, -67 + (i % 2) * 7, 4, 4);
  }
  if (windup) {
    ctx.fillStyle = "#ffd879";
    ctx.fillRect(-70, -76, 140, 4);
    ctx.fillRect(-94, -55, 188, 4);
  }

  ctx.fillStyle = dark;
  const legXs = [-82, -56, -31, -8, 18, 42, 67, 89];
  for (let i = 0; i < legXs.length; i += 1) {
    const offset = legPose[i % legPose.length];
    const knee = i % 2 ? 6 : 0;
    ctx.fillRect(legXs[i] - 5 + offset, -34, 10, 28 + knee);
    ctx.fillRect(legXs[i] - 11 + offset, -8 + Math.floor(knee * 0.34), 22, 7);
  }

  if (attack?.type === "slam" && attack.t < 0.58) {
    ctx.fillStyle = "#d6ad55";
    ctx.fillRect(-94, -30, 188, 6);
    ctx.fillRect(-7, -144, 14, 20);
  } else if (attack?.type === "summon" && attack.t < 0.68) {
    ctx.fillStyle = "#8fa15f";
    ctx.fillRect(-102, -35, 32, 7);
    ctx.fillRect(70, -35, 32, 7);
    ctx.fillRect(-18, -140, 36, 6);
  }

  ctx.restore();

  ctx.fillStyle = "rgba(0,0,0,.56)";
  ctx.fillRect(x - 96, drawY - 146, 192, 8);
  ctx.fillStyle = fluid.secondary;
  ctx.fillRect(x - 96, drawY - 146, 192 * Math.max(0, boss.hp / boss.maxHp), 8);
}

function drawParticles(layer = "foreground") {
  for (const p of state.particles) {
    if ((p.layer ?? "foreground") !== layer) continue;
    const alpha = clamp(p.life / p.max, 0, 1);
    ctx.globalAlpha = alpha * (p.alpha ?? 1);
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.floor(p.x), Math.floor(p.y), Math.ceil(p.w ?? p.size), Math.ceil(p.h ?? p.size));
  }
  ctx.globalAlpha = 1;
}

function drawFloaters() {
  ctx.font = `12px ${PIXEL_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const floater of state.floaters) {
    ctx.globalAlpha = clamp(floater.life / floater.max, 0, 1);
    ctx.fillStyle = "#17110d";
    ctx.fillText(floater.text, floater.x - 2, floater.y);
    ctx.fillText(floater.text, floater.x + 2, floater.y);
    ctx.fillText(floater.text, floater.x, floater.y - 2);
    ctx.fillText(floater.text, floater.x, floater.y + 2);
    ctx.fillStyle = floater.color;
    ctx.fillText(floater.text, floater.x, floater.y);
  }
  ctx.globalAlpha = 1;
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

if (new URLSearchParams(location.search).get("autostart") === "1") {
  startRun();
} else {
  mainMenu();
}
updateHud();
requestAnimationFrame(loop);
