/**
 * Renders the scene headlessly and writes PNGs, so the look can be judged from
 * pixels instead of guessed at. `next build` never validates or runs WGSL, so
 * this (with `npm run shader:check`) is the real feedback loop.
 *
 *   npx tsx tools/preview.mts                       # every planet + the orrery
 *   npx tsx tools/preview.mts --only saturn --width 1200 --height 800
 *   npx tsx tools/preview.mts --only orrery
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { effect, init, target } from 'vgpu/node';
import { resolveShader } from '@vgpu/wgsl/runtime';
import { lerpLook, planets, type PlanetLook } from '../src/lib/solar-system.ts';
import {
  FOCAL,
  fitDistance,
  framingFor,
  orbitCamera,
  orreryBodies,
  toBody,
  toParams,
  type SceneState,
} from '../src/lib/planet-uniforms.ts';

const flag = (name: string, fallback: number) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
};
const only = (() => {
  const i = process.argv.indexOf('--only');
  return i >= 0 ? process.argv[i + 1] : null;
})();

const width = flag('width', 640);
const height = flag('height', 400);
const outDir = 'tools/preview-out';
const ELAPSED = 40;

const resolved = await resolveShader({
  entry: 'src/shaders/planet.wgsl',
  validate: 'require',
});

const gpu = await init();
const colorTarget = target(gpu, { size: [width, height] });
const scene = effect(gpu, resolved.wgsl);
mkdirSync(outDir, { recursive: true });

async function shot(name: string, params: ReturnType<typeof toParams>) {
  scene.set({ params });
  scene.draw(colorTarget);
  const pixels = await colorTarget.read();
  const png = new PNG({ width, height });
  png.data.set(pixels);
  writeFileSync(`${outDir}/${name}.png`, PNG.sync.write(png));
  console.log(`wrote ${outDir}/${name}.png`);
}

const baseScene = (look: PlanetLook): SceneState => ({
  resolution: [width, height],
  center: [0, 0],
  camera: orbitCamera([0, 0, 0], 0, 0, 1),
  sunPos: [0, 0, 0],
  sunDir: look.sunDir,
  colorSun: look.colorSun,
  time: ELAPSED,
  focal: FOCAL,
  warp: 0,
  fade: 1,
  starDensity: look.starDensity,
  nebula: look.nebula,
  octaves: 5,
  cloudOctaves: 4,
  vignette: 0.4,
  orreryMix: 0,
  orbitLines: 0,
  seed: look.seed,
});

/** One planet, framed exactly as a page renders it. */
function sectionParams(look: PlanetLook, warp = 0) {
  const framing = framingFor(width, height);
  const s = baseScene(look);
  s.center = framing.center;
  s.camera = {
    position: [0, 0, 5.45 * look.zoom * framing.zoomScale],
    right: [1, 0, 0],
    up: [0, 1, 0],
    forward: [0, 0, -1],
  };
  s.sunPos = [look.sunDir[0] * 1000, look.sunDir[1] * 1000, look.sunDir[2] * 1000];
  s.warp = warp;
  s.fade = 1 - 0.28 * warp;
  return toParams([toBody(look, { position: [0, 0, 0], radius: 1, spin: 0.7, moonPhase: 2.3 })], s);
}

function orreryParams(yaw: number, pitch: number, distanceScale = 1, hovered: string | null = null) {
  const look = planets[0].look;
  const s = baseScene(look);
  s.camera = orbitCamera([0, 0, 0], yaw, pitch, fitDistance(width, height, pitch) * distanceScale);
  s.nebula = 0.22;
  s.vignette = 0.25;
  s.orreryMix = 1;
  s.orbitLines = 1;
  return toParams(orreryBodies(ELAPSED, hovered), s);
}

const wantSections = !only || planets.some((p) => p.id === only);
const wantOrrery = !only || only === 'orrery';

if (wantSections) {
  for (const planet of planets) {
    if (only && planet.id !== only) continue;
    await shot(planet.id, sectionParams(planet.look));
  }
}

if (!only) {
  // Mid-warp: Earth on its way to Jupiter.
  await shot('warp', sectionParams(lerpLook(planets[0].look, planets[2].look, 0.5), 1));
}

if (wantOrrery) {
  await shot('orrery-top', orreryParams(-0.55, 0.95));
  await shot('orrery-tilt', orreryParams(-0.55, 0.44, 1, 'saturn'));
  await shot('orrery-low', orreryParams(1.2, 0.14));
  await shot('orrery-close', orreryParams(-0.55, 0.44, 0.45));
}

gpu.dispose();
