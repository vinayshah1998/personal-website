import {
  orbitPosition,
  planets,
  sun,
  type PlanetLook,
  type Vec2,
  type Vec3,
  type Vec4,
} from './solar-system';

/** Camera basis handed to the shader; `right`/`up`/`forward` are orthonormal. */
export interface Camera {
  position: Vec3;
  right: Vec3;
  up: Vec3;
  forward: Vec3;
}

/** Everything about a body that is not part of its artistic look. */
export interface BodyPlacement {
  position: Vec3;
  radius: number;
  /** Accumulated surface rotation, radians. */
  spin: number;
  moonPhase: number;
  /** >0 draws the body as a light source. */
  emissive?: number;
  /** 0 draws no orbit line. */
  orbitRadius?: number;
  /** Rim highlight, for the hovered body in the orrery. */
  highlight?: number;
}

/** Scene-wide state, owned by the renderer. */
export interface SceneState {
  resolution: Vec2;
  center: Vec2;
  camera: Camera;
  sunPos: Vec3;
  sunDir: Vec4;
  colorSun: Vec4;
  time: number;
  focal: number;
  warp: number;
  fade: number;
  starDensity: number;
  nebula: number;
  /** Surface fBM octaves — the main quality/perf dial. */
  octaves: number;
  cloudOctaves: number;
  vignette: number;
  /** 0 = art-directed directional sun, 1 = lit from `sunPos`. */
  orreryMix: number;
  orbitLines: number;
  seed: number;
}

export type Body = ReturnType<typeof toBody>;

/** Flattens a look plus a placement into the WGSL `Body` struct. */
export function toBody(look: PlanetLook, place: BodyPlacement) {
  return {
    colorLow: look.colorLow,
    colorMid: look.colorMid,
    colorHigh: look.colorHigh,
    colorAtmo: look.colorAtmo,
    colorRing: look.colorRing,
    noiseScale: look.noiseScale,
    spot: look.spot,
    position: [...place.position, place.radius] as Vec4,

    tilt: look.tilt,
    seed: look.seed,
    waterLevel: look.waterLevel,
    landLevel: look.landLevel,

    landSpan: look.landSpan,
    gasness: look.gasness,
    bandFreq: look.bandFreq,
    bandWarp: look.bandWarp,

    bandContrast: look.bandContrast,
    iceAmount: look.iceAmount,
    roughness: look.roughness,
    cloudAmount: look.cloudAmount,

    cloudScale: look.cloudScale,
    cloudDrift: look.cloudDrift,
    ringInner: look.ringInner,
    ringOuter: look.ringOuter,

    ringOpacity: look.ringOpacity,
    moonSize: look.moonSize,
    moonDist: look.moonDist,
    moonPhase: place.moonPhase,

    spin: place.spin,
    emissive: place.emissive ?? 0,
    orbitRadius: place.orbitRadius ?? 0,
    highlight: place.highlight ?? 0,
  };
}

/** A zeroed body. The array is fixed-size, so unused slots still need values. */
function emptyBody(): Body {
  const zero4: Vec4 = [0, 0, 0, 0];
  return {
    colorLow: zero4, colorMid: zero4, colorHigh: zero4, colorAtmo: zero4,
    colorRing: zero4, noiseScale: zero4, spot: zero4, position: zero4,
    tilt: 0, seed: 0, waterLevel: 0, landLevel: 0,
    landSpan: 1, gasness: 0, bandFreq: 0, bandWarp: 0,
    bandContrast: 0, iceAmount: 0, roughness: 0, cloudAmount: 0,
    cloudScale: 1, cloudDrift: 0, ringInner: 0, ringOuter: 0,
    ringOpacity: 0, moonSize: 0, moonDist: 0, moonPhase: 0,
    spin: 0, emissive: 0, orbitRadius: 0, highlight: 0,
  };
}

export const MAX_BODIES = 8;

/**
 * Builds the full `Params` uniform. The body array is fixed-size in WGSL, so
 * it is always padded out; `bodyCount` bounds the shader's loops.
 */
export function toParams(bodies: Body[], scene: SceneState) {
  const padded = bodies.slice(0, MAX_BODIES);
  while (padded.length < MAX_BODIES) padded.push(emptyBody());

  return {
    resolution: scene.resolution,
    center: scene.center,

    camPos: [...scene.camera.position, 0] as Vec4,
    camRight: [...scene.camera.right, 0] as Vec4,
    camUp: [...scene.camera.up, 0] as Vec4,
    camForward: [...scene.camera.forward, 0] as Vec4,
    colorSun: scene.colorSun,
    sunPos: [...scene.sunPos, 0] as Vec4,
    sunDir: scene.sunDir,

    time: scene.time,
    focal: scene.focal,
    warp: scene.warp,
    fade: scene.fade,

    starDensity: scene.starDensity,
    nebula: scene.nebula,
    octaves: scene.octaves,
    cloudOctaves: scene.cloudOctaves,

    vignette: scene.vignette,
    bodyCount: Math.min(bodies.length, MAX_BODIES),
    orreryMix: scene.orreryMix,
    orbitLines: scene.orbitLines,

    seed: scene.seed,
    pad0: 0,
    pad1: 0,
    pad2: 0,

    bodies: padded,
  };
}

// --- Vector helpers ---------------------------------------------------------

export const add3 = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub3 = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale3 = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot3 = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross3 = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const norm3 = (a: Vec3): Vec3 => {
  const len = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / len, a[1] / len, a[2] / len];
};

/** Lens: see the FOCAL note in planet.wgsl. */
export const FOCAL = 0.28;

/**
 * Orbit camera -> orthonormal basis. Yaw 0, pitch 0 looks down -z from +z,
 * which is exactly the section view's camera.
 */
export function orbitCamera(target: Vec3, yaw: number, pitch: number, distance: number): Camera {
  const dir: Vec3 = [
    Math.cos(pitch) * Math.sin(yaw),
    Math.sin(pitch),
    Math.cos(pitch) * Math.cos(yaw),
  ];
  const position = add3(target, scale3(dir, distance));
  const forward = norm3(scale3(dir, -1));
  const right = norm3(cross3(forward, [0, 1, 0]));
  const up = cross3(right, forward);
  return { position, right, up, forward };
}

/** The sun plus every planet at its orbital position, in body-array order. */
export function orreryBodies(elapsed: number, hoveredId: string | null = null): Body[] {
  const bodies: Body[] = [
    toBody(sun.look, {
      position: [0, 0, 0],
      radius: sun.radius,
      spin: elapsed * 0.02,
      moonPhase: 0,
      emissive: 1.25,
    }),
  ];
  for (const planet of planets) {
    bodies.push(
      toBody(planet.look, {
        position: orbitPosition(planet.orbit, elapsed),
        radius: planet.orbit.size,
        spin: elapsed * planet.look.spinRate * 6 + planet.orbit.angle * 3,
        moonPhase: elapsed * 0.06 + planet.orbit.angle,
        orbitRadius: planet.orbit.radius,
        highlight: hoveredId === planet.id ? 1 : 0,
      })
    );
  }
  return bodies;
}

/** World half-extent the orrery tries to fit on screen. */
export const SYSTEM_EXTENT = 21;

export interface Framing {
  center: Vec2;
  zoomScale: number;
}

/**
 * Places the planet clear of the text in section view: off to one side on a
 * wide screen, and low on a phone so the hero copy sits on empty sky above it.
 */
export function framingFor(width: number, height: number): Framing {
  const aspect = width / Math.max(height, 1);
  if (aspect >= 1.25) return { center: [0.62, 0.02], zoomScale: 1.5 };
  if (aspect >= 0.85) return { center: [0.28, 0.18], zoomScale: 1.35 };
  return { center: [0, -0.8], zoomScale: 1.2 };
}

/** Camera distance that fits the whole system for this viewport and pitch. */
export function fitDistance(width: number, height: number, pitch: number): number {
  const minDim = Math.max(Math.min(width, height), 1);
  return Math.max(
    SYSTEM_EXTENT / ((width / minDim) * FOCAL),
    (SYSTEM_EXTENT * Math.abs(Math.sin(pitch)) + 2.5) / ((height / minDim) * FOCAL),
    10
  );
}

// --- Screen <-> world -------------------------------------------------------
//
// These mirror the shader's own mapping. The orrery's labels are positioned
// with `projectBody`, and clicks are resolved with `rayThroughUv` +
// `pickPlanetAlongRay`, so the maths here has to agree with planet.wgsl
// exactly or the labels drift away from the planets they name.

export interface Projected {
  x: number;
  y: number;
  /** Projected radius, in the same units as `cssWidth`. */
  radius: number;
  /** False when the body is behind the camera. */
  visible: boolean;
}

/** World position -> position on the canvas, in CSS pixels. */
export function projectBody(
  position: Vec3,
  radius: number,
  camera: Camera,
  resolution: Vec2,
  cssWidth: number,
  cssHeight: number
): Projected {
  const rel = sub3(position, camera.position);
  const depth = dot3(rel, camera.forward);
  if (depth <= 0.001) return { x: 0, y: 0, radius: 0, visible: false };

  const minDim = Math.max(Math.min(resolution[0], resolution[1]), 1);
  const px = dot3(rel, camera.right) / (depth * FOCAL);
  const py = dot3(rel, camera.up) / (depth * FOCAL);
  const u = ((px * minDim) / resolution[0]) * 0.5 + 0.5;
  const v = 0.5 - ((py * minDim) / resolution[1]) * 0.5;

  // The shader's p-units are normalised by the short edge, so a radius in
  // p-units becomes half the short edge in CSS pixels.
  const shortEdgeCss = Math.min(cssWidth, cssHeight);
  return {
    x: u * cssWidth,
    y: v * cssHeight,
    radius: (radius / (depth * FOCAL)) * 0.5 * shortEdgeCss,
    visible: true,
  };
}

/** Ray through a normalised canvas coordinate (0..1, y down). */
export function rayThroughUv(
  u: number,
  v: number,
  camera: Camera,
  resolution: Vec2
): { origin: Vec3; dir: Vec3 } {
  const minDim = Math.max(Math.min(resolution[0], resolution[1]), 1);
  const px = ((u - 0.5) * 2 * resolution[0]) / minDim;
  const py = -((v - 0.5) * 2 * resolution[1]) / minDim;
  const dir = norm3(
    add3(add3(scale3(camera.right, px * FOCAL), scale3(camera.up, py * FOCAL)), camera.forward)
  );
  return { origin: camera.position, dir };
}

/** How much larger than its sphere a planet is to click. */
const PICK_MARGIN = 1.35;

/**
 * Nearest selectable planet along a ray, or null. The sun occludes but is not
 * itself a destination.
 */
export function pickPlanetAlongRay(origin: Vec3, dir: Vec3, elapsed: number): string | null {
  const candidates: { id: string | null; centre: Vec3; radius: number }[] = [
    { id: null, centre: [0, 0, 0], radius: sun.radius },
    ...planets.map((planet) => ({
      id: planet.id,
      centre: orbitPosition(planet.orbit, elapsed),
      radius: planet.orbit.size * PICK_MARGIN,
    })),
  ];

  let bestT = Infinity;
  let bestId: string | null = null;
  for (const candidate of candidates) {
    const oc = sub3(origin, candidate.centre);
    const b = dot3(oc, dir);
    const c = dot3(oc, oc) - candidate.radius * candidate.radius;
    const h = b * b - c;
    if (h < 0) continue;
    const t = -b - Math.sqrt(h);
    if (t > 0 && t < bestT) {
      bestT = t;
      bestId = candidate.id;
    }
  }
  return bestId;
}
