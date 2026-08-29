// Renders frames across a planet-to-planet transition. Dev-only.
import { mkdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { effect, init, target } from 'vgpu/node';
import { resolveShader } from '@vgpu/wgsl/runtime';
import { planets, lerpLook } from '../src/lib/solar-system.ts';
import { toParams } from '../src/lib/planet-uniforms.ts';

const from = planets.find((p) => p.id === (process.argv[2] ?? 'earth'))!;
const to = planets.find((p) => p.id === (process.argv[3] ?? 'saturn'))!;
const width = 640;
const height = 400;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const resolved = await resolveShader({ entry: 'src/shaders/planet.wgsl', validate: 'auto' });
const gpu = await init();
const t = target(gpu, { size: [width, height] });
const e = effect(gpu, resolved.wgsl);
mkdirSync('tools/preview-out', { recursive: true });

for (const step of [0, 0.25, 0.5, 0.75, 1]) {
  const warp = step >= 1 ? 0 : Math.sin(Math.PI * step);
  e.set({
    params: toParams(lerpLook(from.look, to.look, easeInOut(step)), {
      resolution: [width, height], center: [0.62, 0.02], time: 8, spin: 0.7,
      moonPhase: 2.3, warp, fade: 1 - 0.28 * warp,
      octaves: 5, cloudOctaves: 4, zoomScale: 1.5, vignette: 0.4,
    }),
  });
  e.draw(t);
  const pixels = await t.read();
  const png = new PNG({ width, height });
  png.data.set(pixels);
  writeFileSync(`tools/preview-out/warp-${String(step).replace('.', '_')}.png`, PNG.sync.write(png));
  console.log('warp', step);
}
gpu.dispose();
