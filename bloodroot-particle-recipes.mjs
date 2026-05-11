export const AMBIENT_MOTES = {
  id: "ambientMotes",
  layer: "background",
  spawnRate: 8,
  maxParticles: 42,
  lifetime: [3.4, 6.8],
  size: [0.8, 2.2],
  drift: {
    x: [-7, 9],
    y: [-18, -5]
  },
  alpha: [0.08, 0.34],
  colors: ["#d4c78e", "#9ea974", "#6f7e58"],
  blendMode: "screen"
};

export const MOSS_DUST = {
  id: "mossDust",
  layer: "midground",
  burstCount: [7, 13],
  lifetime: [0.55, 1.2],
  size: [1.1, 3.4],
  speed: [18, 64],
  gravity: 26,
  alpha: [0.18, 0.52],
  colors: ["#7f8f4d", "#a7a464", "#445934"],
  scatterDegrees: 96
};

export const STONE_CHIPS = {
  id: "stoneChips",
  layer: "foreground",
  burstCount: [4, 9],
  lifetime: [0.35, 0.8],
  size: [1.4, 4.8],
  speed: [70, 210],
  gravity: 540,
  rotationSpeed: [-9, 9],
  colors: ["#c3c1ad", "#8d8b7d", "#56564f"],
  bounce: 0.16
};

export const ROAR_SHOCK_BITS = {
  id: "roarShockBits",
  layer: "foreground",
  burstCount: [10, 16],
  lifetime: [0.22, 0.48],
  size: [1.4, 4.2],
  speed: [120, 280],
  gravity: -24,
  alpha: [0.42, 0.78],
  colors: ["#ffdf8a", "#d69b48", "#7b4b32"],
  scatterDegrees: 150,
  pulse: {
    rings: 2,
    radius: [34, 78],
    thickness: [2, 4],
    alpha: [0.14, 0.34],
    colors: ["#ffdd82", "#d6ad55"]
  }
};

export const BOW_LEAF_STREAKS = {
  id: "bowLeafStreaks",
  layer: "foreground",
  burstCount: [5, 9],
  lifetime: [0.28, 0.62],
  size: [1.1, 3.2],
  speed: [140, 340],
  gravity: 18,
  alpha: [0.36, 0.72],
  colors: ["#c4f1a3", "#8fbf74", "#2f5d42"],
  trail: {
    length: [8, 18],
    width: [1, 2],
    fade: 0.72
  },
  scatterDegrees: 32
};

export const STAFF_VIOLET_MOTES = {
  id: "staffVioletMotes",
  layer: "foreground",
  burstCount: [8, 14],
  lifetime: [0.45, 1.05],
  size: [1.2, 4],
  speed: [45, 180],
  gravity: -36,
  alpha: [0.32, 0.86],
  colors: ["#efe1ff", "#caa7ff", "#7d66b0", "#5f4c86"],
  blendMode: "screen",
  orbit: {
    radius: [8, 22],
    speed: [-3.5, 3.5],
    tighten: 0.82
  }
};

export const PUNCH_IMPACT_FLECKS = {
  id: "punchImpactFlecks",
  layer: "foreground",
  burstCount: [6, 11],
  lifetime: [0.18, 0.42],
  size: [1.6, 4.8],
  speed: [160, 380],
  gravity: 240,
  alpha: [0.44, 0.9],
  colors: ["#f3cf82", "#c58a42", "#714531", "#f1f0da"],
  scatterDegrees: 82,
  hitPause: [0.018, 0.035]
};

export const CLASS_ABILITY_ACCENT_COLORS = {
  rootbound: {
    primary: "#9ba95f",
    glow: "#ffd879",
    shadow: "#465334"
  },
  frenzied: {
    primary: "#c94c38",
    glow: "#ffb07a",
    shadow: "#682d26"
  },
  hollow: {
    primary: "#8e5bd8",
    glow: "#d9b7ff",
    shadow: "#352542"
  }
};

export const HIT_BURST_SCALES = {
  graze: {
    countMultiplier: 0.45,
    sizeMultiplier: 0.72,
    speedMultiplier: 0.78,
    screenShake: 0
  },
  light: {
    countMultiplier: 1,
    sizeMultiplier: 1,
    speedMultiplier: 1,
    screenShake: 0.3
  },
  heavy: {
    countMultiplier: 1.55,
    sizeMultiplier: 1.24,
    speedMultiplier: 1.2,
    screenShake: 0.65
  },
  critical: {
    countMultiplier: 2.1,
    sizeMultiplier: 1.44,
    speedMultiplier: 1.38,
    screenShake: 1
  }
};

export const KNIFE_BREAK_BURST = {
  id: "knifeBreakBurst",
  layer: "foreground",
  shards: {
    count: 13,
    lifetime: [0.7, 1.35],
    size: [2, 8],
    speed: [160, 380],
    gravity: 820,
    rotationSpeed: [-14, 14],
    colors: ["#f1f0da", "#bfc1b4", "#6d7068"]
  },
  sparks: {
    count: 18,
    lifetime: [0.16, 0.38],
    size: [0.8, 2.4],
    speed: [220, 520],
    colors: ["#ffe6a1", "#ffbc62", "#d36f36"],
    blendMode: "screen"
  },
  dust: {
    count: 10,
    lifetime: [0.45, 0.95],
    size: [2, 6],
    speed: [45, 150],
    colors: ["#7d7768", "#5f5b51", "#3d3b35"]
  }
};

export const PARTICLE_RECIPES = {
  ambientMotes: AMBIENT_MOTES,
  mossDust: MOSS_DUST,
  stoneChips: STONE_CHIPS,
  roarShockBits: ROAR_SHOCK_BITS,
  bowLeafStreaks: BOW_LEAF_STREAKS,
  staffVioletMotes: STAFF_VIOLET_MOTES,
  punchImpactFlecks: PUNCH_IMPACT_FLECKS,
  classAbilityAccentColors: CLASS_ABILITY_ACCENT_COLORS,
  hitBurstScales: HIT_BURST_SCALES,
  knifeBreakBurst: KNIFE_BREAK_BURST
};
