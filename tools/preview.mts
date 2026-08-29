/**
 * Renders the planet shader headlessly and writes PNGs, so the look can be
 * judged from pixels instead of guessed at. Not part of the app build.
 *
 *   npx tsx tools/preview.mts [--width 640] [--height 360] [--warp 0.6]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { effect, init, target } from 'vgpu/node';
import { resolveShader } from '@vgpu/wgsl/runtime';
import { planets, lerpLook } from '../src/lib/solar-system.ts';
import { toParams } from '../src/lib/planet-uniforms.ts';

const arg = (name: string, fallback: number) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
};

const width = arg('width', 640);
const height = arg('height', 360);
const outDir = 'tools/preview-out';

const resolved = await resolveShader({
  entry: 'src/shaders/planet.wgsl',
  validate: 'require',
});

const gpu = await init();
const colorTarget = target(gpu, { size: [width, height] });
const planetEffect = effect(gpu, resolved.wgsl);

mkdirSync(outDir, { recursive: true });

async function shot(name: string, params: ReturnType<typeof toParams>) {
  planetEffect.set({ params });
  planetEffect.draw(colorTarget);
  const pixels = await colorTarget.read();
  const png = new PNG({ width, height });
  png.data.set(pixels);
  writeFileSync(`${outDir}/${name}.png`, PNG.sync.write(png));
  console.log(`wrote ${outDir}/${name}.png`);
}

const frame = {
  resolution: [width, height] as [number, number],
  center: [0, 0] as [number, number],
  time: 8,
  spin: 0.7,
  moonPhase: 2.3,
  warp: 0,
  fade: 1,
  octaves: 5,
  cloudOctaves: 4,
  zoomScale: 1,
  vignette: 0.35,
};

for (const planet of planets) {
  await shot(planet.id, toParams(planet.look, frame));
}

// Mid-transition frame: Earth morphing into Jupiter at full warp.
const warpAmount = arg('warp', 0.85);
await shot(
  'transition',
  toParams(lerpLook(planets[0].look, planets[2].look, 0.5), { ...frame, warp: warpAmount })
);

gpu.dispose();
