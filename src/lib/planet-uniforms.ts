import type { PlanetLook, Vec2 } from './solar-system';

/** The per-frame half of the shader's `Params`, owned by the renderer. */
export interface FrameState {
  resolution: Vec2;
  center: Vec2;
  time: number;
  spin: number;
  moonPhase: number;
  warp: number;
  fade: number;
  /** Surface fBM octaves — the main quality/perf dial. */
  octaves: number;
  cloudOctaves: number;
  /** Multiplies the planet's own zoom; larger viewports pull the camera back. */
  zoomScale: number;
  vignette: number;
}

/**
 * Flattens a look plus frame state into the exact field names of the WGSL
 * `Params` struct, so it can be handed straight to `effect.set({ params })`.
 */
export function toParams(look: PlanetLook, frame: FrameState) {
  return {
    resolution: frame.resolution,
    center: frame.center,

    colorLow: look.colorLow,
    colorMid: look.colorMid,
    colorHigh: look.colorHigh,
    colorAtmo: look.colorAtmo,
    colorRing: look.colorRing,
    colorSun: look.colorSun,
    sunDir: look.sunDir,
    noiseScale: look.noiseScale,
    spot: look.spot,

    time: frame.time,
    spin: frame.spin,
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
    moonPhase: frame.moonPhase,

    warp: frame.warp,
    fade: frame.fade,
    starDensity: look.starDensity,
    nebula: look.nebula,
    octaves: frame.octaves,
    cloudOctaves: frame.cloudOctaves,
    zoom: look.zoom * frame.zoomScale,
    vignette: frame.vignette,
  };
}
