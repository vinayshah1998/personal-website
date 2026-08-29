/**
 * The solar system that backs the site: one planet per section.
 *
 * Every entry is a set of uniforms for `src/shaders/planet.wgsl`. Because all
 * planets share one shader, navigating between sections interpolates between
 * two `PlanetLook`s rather than swapping scenes — the planet visibly morphs
 * while the camera warps.
 */

/** sRGB hex -> linear RGB. The shader works in linear light and encodes at the end. */
function linear(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return [
    toLinear(((n >> 16) & 255) / 255),
    toLinear(((n >> 8) & 255) / 255),
    toLinear((n & 255) / 255),
  ];
}

const rgba = (hex: string, a = 1): Vec4 => {
  const [r, g, b] = linear(hex);
  return [r, g, b, a];
};

/** Which of the two camera setups the backdrop is showing. */
export type ViewMode = 'section' | 'orrery';

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Vec4 = [number, number, number, number];

/** Where a body sits in the orrery. Distances are compressed for legibility. */
export interface OrbitSpec {
  /** Distance from the sun, in scene units. */
  radius: number;
  /** Starting angle in the ecliptic plane, radians. */
  angle: number;
  /** Radians per second. Inner planets move faster, as they should. */
  speed: number;
  /** Sphere radius in the orrery. */
  size: number;
}

/** The interpolatable half of the shader's `Params` struct. */
export interface PlanetLook {
  colorLow: Vec4;
  colorMid: Vec4;
  colorHigh: Vec4;
  /** rgb = atmosphere tint, w = strength. */
  colorAtmo: Vec4;
  colorRing: Vec4;
  /** rgb = sun tint, w = intensity. */
  colorSun: Vec4;
  sunDir: Vec4;
  /** xyz = per-axis surface noise frequency. */
  noiseScale: Vec4;
  /** x = longitude, y = latitude, z = size, w = strength. */
  spot: Vec4;

  tilt: number;
  seed: number;
  waterLevel: number;
  /** Noise height at which land colour begins. */
  landLevel: number;
  /** Noise height range from mid colour up to the peak colour. */
  landSpan: number;
  gasness: number;
  bandFreq: number;
  bandWarp: number;
  /** 1 = hard belts, ~0.4 = soft haze. */
  bandContrast: number;
  iceAmount: number;
  roughness: number;

  cloudAmount: number;
  cloudScale: number;
  cloudDrift: number;

  ringInner: number;
  ringOuter: number;
  ringOpacity: number;

  moonSize: number;
  moonDist: number;

  starDensity: number;
  nebula: number;
  zoom: number;

  /** Radians per second of surface rotation. */
  spinRate: number;
  /** Radians per second the moon travels around its orbit. */
  moonRate: number;
}

export interface Planet {
  id: string;
  orbit: OrbitSpec;
  /** Route this planet belongs to. */
  path: string;
  /** Display name, shown in the navigator. */
  name: string;
  /** One-line flavour text. */
  tagline: string;
  look: PlanetLook;
}

const SUN: Vec4 = [...linear('#fff3e0'), 1.15] as Vec4;
// Well off to the side, so every planet gets a real terminator instead of
// reading as a flat, fully-lit disc.
const SUN_DIR: Vec4 = (() => {
  const [x, y, z] = [-0.78, 0.30, 0.38];
  const len = Math.hypot(x, y, z);
  return [x / len, y / len, z / len, 0] as Vec4;
})();

/** Shared defaults; each planet overrides only what makes it itself. */
const base: PlanetLook = {
  colorLow: rgba('#0b3d7a'),
  colorMid: rgba('#2f6b34'),
  colorHigh: rgba('#b9a97e'),
  colorAtmo: [...linear('#5aa2ff'), 0.5] as Vec4,
  colorRing: rgba('#d8c39a'),
  colorSun: SUN,
  sunDir: SUN_DIR,
  noiseScale: [2.1, 2.1, 2.1, 0],
  spot: [0, 0, 0, 0],

  tilt: 0.35,
  seed: 0,
  waterLevel: -0.02,
  landLevel: 0.04,
  landSpan: 0.52,
  gasness: 0,
  bandFreq: 12,
  bandWarp: 2,
  bandContrast: 1,
  iceAmount: 0.14,
  roughness: 0.25,

  cloudAmount: 0.5,
  cloudScale: 2.6,
  cloudDrift: 0.012,

  ringInner: 1.4,
  ringOuter: 2.3,
  ringOpacity: 0,

  moonSize: 0,
  moonDist: 2.6,

  starDensity: 0.09,
  nebula: 0.3,
  zoom: 1,

  spinRate: 0.035,
  moonRate: 0.06,
};

const look = (over: Partial<PlanetLook>): PlanetLook => ({ ...base, ...over });

export const planets: Planet[] = [
  {
    id: 'earth',
    orbit: { radius: 5.0, angle: 0.55, speed: 0.022, size: 0.55 },
    path: '/',
    name: 'Earth',
    tagline: 'Home — where the bread gets baked.',
    look: look({
      colorLow: rgba('#0a3f82'),
      colorMid: rgba('#2e6b38'),
      colorHigh: rgba('#c2b189'),
      colorAtmo: [...linear('#5aa2ff'), 0.55] as Vec4,
      noiseScale: [2.0, 2.0, 2.0, 0],
      seed: 12.4,
      waterLevel: 0.07,
      landLevel: 0.13,
      landSpan: 0.5,
      iceAmount: 0.18,
      cloudAmount: 0.55,
      cloudScale: 2.7,
      moonSize: 0.16,
      moonDist: 2.9,
    }),
  },
  {
    id: 'mars',
    orbit: { radius: 6.6, angle: 4.10, speed: 0.017, size: 0.42 },
    path: '/about',
    name: 'Mars',
    tagline: 'About — thin air, long horizons.',
    look: look({
      colorLow: rgba('#2a1409'),
      colorMid: rgba('#61301a'),
      colorHigh: rgba('#c08150'),
      colorAtmo: [...linear('#ff9d63'), 0.14] as Vec4,
      noiseScale: [2.9, 2.9, 2.9, 0],
      seed: 40.2,
      waterLevel: -1.0,
      landLevel: -0.22,
      landSpan: 0.52,
      iceAmount: 0.11,
      roughness: 0.9,
      cloudAmount: 0.06,
      cloudScale: 3.4,
      tilt: 0.44,
      moonSize: 0.06,
      moonDist: 2.2,
      moonRate: 0.14,
      nebula: 0.12,
    }),
  },
  {
    id: 'jupiter',
    orbit: { radius: 9.4, angle: 1.70, speed: 0.010, size: 1.10 },
    path: '/projects',
    name: 'Jupiter',
    tagline: 'Projects — the big ones, still spinning.',
    look: look({
      colorLow: rgba('#8a6242'),
      colorMid: rgba('#e8d3ac'),
      colorHigh: rgba('#c0553a'),
      colorAtmo: [...linear('#ffd2a0'), 0.28] as Vec4,
      noiseScale: [1.5, 4.2, 1.5, 0],
      spot: [2.1, -0.28, 0.42, 0.85],
      seed: 71.9,
      gasness: 1,
      waterLevel: -1.0,
      bandFreq: 17,
      bandWarp: 2.6,
      iceAmount: 0,
      cloudAmount: 0,
      tilt: 0.09,
      zoom: 1.08,
      spinRate: 0.075,
      moonSize: 0.05,
      moonDist: 2.7,
      moonRate: 0.11,
    }),
  },
  {
    id: 'neptune',
    orbit: { radius: 15.8, angle: 3.30, speed: 0.005, size: 0.74 },
    path: '/blog',
    name: 'Neptune',
    tagline: 'Writing — slow, cold, and very far out.',
    look: look({
      colorLow: rgba('#12306e'),
      colorMid: rgba('#2a55a8'),
      colorHigh: rgba('#5f8fd8'),
      colorAtmo: [...linear('#6fa8ff'), 0.5] as Vec4,
      noiseScale: [1.3, 3.0, 1.3, 0],
      spot: [0, 0, 0, 0],
      seed: 5.6,
      gasness: 1,
      waterLevel: -1.0,
      bandFreq: 9,
      bandWarp: 1.5,
      bandContrast: 0.42,
      iceAmount: 0,
      cloudAmount: 0,
      tilt: 0.5,
      spinRate: 0.05,
      nebula: 0.22,
    }),
  },
  {
    id: 'saturn',
    orbit: { radius: 12.6, angle: 5.20, speed: 0.0075, size: 0.95 },
    path: '/stats',
    name: 'Saturn',
    tagline: 'Stats — rings, laps, and other loops.',
    look: look({
      colorLow: rgba('#a8834c'),
      colorMid: rgba('#e8d5a8'),
      colorHigh: rgba('#f4e6c4'),
      colorAtmo: [...linear('#ffe6b0'), 0.3] as Vec4,
      colorRing: rgba('#cbb187'),
      noiseScale: [1.4, 3.6, 1.4, 0],
      seed: 88.1,
      gasness: 1,
      waterLevel: -1.0,
      bandFreq: 13,
      bandWarp: 1.7,
      bandContrast: 0.8,
      iceAmount: 0,
      cloudAmount: 0,
      tilt: 0.47,
      ringInner: 1.32,
      ringOuter: 2.35,
      ringOpacity: 1.0,
      zoom: 1.45,
      spinRate: 0.06,
    }),
  },
  {
    id: 'venus',
    orbit: { radius: 3.6, angle: 2.35, speed: 0.030, size: 0.50 },
    path: '/foolish-enterprises',
    name: 'Venus',
    tagline: 'Foolish Enterprises — beautiful, and slightly toxic.',
    look: look({
      colorLow: rgba('#8a6a2e'),
      colorMid: rgba('#d8b76e'),
      colorHigh: rgba('#f6e6bc'),
      colorAtmo: [...linear('#ffd9a0'), 0.55] as Vec4,
      noiseScale: [1.8, 2.6, 1.8, 0],
      seed: 23.7,
      gasness: 0.8,
      waterLevel: -1.0,
      bandFreq: 7,
      bandWarp: 3.2,
      bandContrast: 0.85,
      iceAmount: 0,
      cloudAmount: 0.85,
      cloudScale: 2.2,
      cloudDrift: 0.05,
      tilt: 0.2,
      spinRate: 0.02,
    }),
  },
];

/**
 * The sun. It reuses `PlanetLook` so it can sit in the same body array, but
 * `emissive` in the uniform mapping makes the shader treat it as a light
 * source rather than a lit surface.
 */
export const sun = {
  id: 'sun',
  name: 'Sol',
  radius: 1.5,
  look: look({
    colorLow: rgba('#ffb347'),
    colorMid: rgba('#fff0c4'),
    colorHigh: rgba('#fff8e6'),
    colorAtmo: [...linear('#ffcc7a'), 0.0] as Vec4,
    noiseScale: [3.0, 3.0, 3.0, 0],
    seed: 3.3,
    cloudAmount: 0,
    moonSize: 0,
  }),
};

export const defaultPlanet = planets[0];

/** Position of a planet in the ecliptic plane at a given time. */
export function orbitPosition(orbit: OrbitSpec, time: number): Vec3 {
  const a = orbit.angle + orbit.speed * time;
  return [Math.cos(a) * orbit.radius, 0, Math.sin(a) * orbit.radius];
}

/** Longest matching route wins, so `/blog/some-post` still resolves to Neptune. */
export function planetForPath(pathname: string): Planet {
  const path = pathname.replace(/\/+$/, '') || '/';
  let best = defaultPlanet;
  let bestLength = -1;
  for (const planet of planets) {
    const candidate = planet.path;
    const matches =
      candidate === '/' ? path === '/' : path === candidate || path.startsWith(`${candidate}/`);
    if (matches && candidate.length > bestLength) {
      best = planet;
      bestLength = candidate.length;
    }
  }
  return best;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const lerpVec4 = (a: Vec4, b: Vec4, t: number): Vec4 => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
  lerp(a[3], b[3], t),
];

/** Blends two planets. Used every frame while a route transition is in flight. */
export function lerpLook(a: PlanetLook, b: PlanetLook, t: number): PlanetLook {
  const out = {} as PlanetLook;
  for (const key of Object.keys(base) as (keyof PlanetLook)[]) {
    const av = a[key];
    const bv = b[key];
    if (Array.isArray(av) && Array.isArray(bv)) {
      (out[key] as Vec4) = lerpVec4(av as Vec4, bv as Vec4, t);
    } else {
      (out[key] as number) = lerp(av as number, bv as number, t);
    }
  }
  return out;
}
