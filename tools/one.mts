// Renders a single planet large, for close inspection. Dev-only.
import { mkdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { effect, init, target } from 'vgpu/node';
import { resolveShader } from '@vgpu/wgsl/runtime';
import { planets } from '../src/lib/solar-system.ts';
import { toParams } from '../src/lib/planet-uniforms.ts';

const id = process.argv[2];
const width = Number(process.argv[3] ?? 900);
const height = Number(process.argv[4] ?? 600);
const spin = Number(process.argv[5] ?? 0.7);
// Same framing rule the renderer uses, so previews match the real layout.
const aspect = width / height;
const center: [number, number] =
  aspect >= 1.25 ? [0.62, 0.02] : aspect >= 0.85 ? [0.28, 0.18] : [0, -0.8];
const zoomScale = aspect >= 1.25 ? 1.5 : aspect >= 0.85 ? 1.35 : 1.2;

const resolved = await resolveShader({ entry: 'src/shaders/planet.wgsl', validate: 'auto' });
const gpu = await init();
const t = target(gpu, { size: [width, height] });
const e = effect(gpu, resolved.wgsl);
const p = planets.find((x) => x.id === id)!;
e.set({
  params: toParams(p.look, {
    resolution: [width, height], center, time: 8, spin, moonPhase: 2.3,
    warp: 0, fade: 1, octaves: 5, cloudOctaves: 4, zoomScale, vignette: 0.35,
  }),
});
e.draw(t);
const pixels = await t.read();
const png = new PNG({ width, height });
png.data.set(pixels);
mkdirSync('tools/preview-out', { recursive: true });
writeFileSync(`tools/preview-out/big-${id}.png`, PNG.sync.write(png));
console.log('ok');
gpu.dispose();
