/**
 * Checks that the orrery's screen maths agrees with the shader.
 *
 * Labels are positioned with `projectBody`; clicks are resolved with
 * `rayThroughUv` + `pickPlanetAlongRay`. If either drifts from planet.wgsl the
 * labels wander off the planets they name and clicks select the wrong world —
 * and none of that shows up in a static screenshot.
 *
 * The trick used here is the `highlight` uniform: rendering one planet
 * highlighted and diffing against a baseline isolates exactly that planet's
 * pixels, whatever else is on screen. The centroid of those pixels is where the
 * shader actually drew it, so it can be compared against where the projection
 * says the label belongs.
 */
import { effect, init, target } from 'vgpu/node';
import { resolveShader } from '@vgpu/wgsl/runtime';
import { orbitPosition, planets } from '../src/lib/solar-system.ts';
import {
  FOCAL,
  fitDistance,
  norm3,
  orbitCamera,
  orreryBodies,
  pickPlanetAlongRay,
  projectBody,
  rayThroughUv,
  sub3,
  toParams,
  type SceneState,
} from '../src/lib/planet-uniforms.ts';

const width = 900;
const height = 560;
const ELAPSED = 40;
/**
 * How far the projected centre may sit from the drawn centroid.
 *
 * Half a planet radius, floored at 4px. That is the actual product
 * requirement — a label has to sit on the planet it names — and it leaves room
 * for the centroid method's one weakness: the highlight is a fresnel rim, and
 * where part of that rim is compressed by tonemapping (a planet against the
 * sun's glare, say) the detected region skews toward the rest of the disc.
 * A genuine projection error would miss by many radii, not a fraction of one.
 */
const tolerance = (radius: number) => Math.max(4, radius * 0.5);

const resolved = await resolveShader({ entry: 'src/shaders/planet.wgsl', validate: 'require' });
const gpu = await init();
const colorTarget = target(gpu, { size: [width, height] });
const scene = effect(gpu, resolved.wgsl);

let failures = 0;
let checks = 0;

async function render(params: ReturnType<typeof toParams>) {
  scene.set({ params });
  scene.draw(colorTarget);
  return await colorTarget.read();
}

for (const [label, yaw, pitch, distScale] of [
  ['tilt', -0.55, 0.44, 1],
  ['top', -0.55, 0.95, 1],
  ['low', 1.2, 0.14, 1],
  ['close', -0.55, 0.44, 0.45],
] as const) {
  const camera = orbitCamera([0, 0, 0], yaw, pitch, fitDistance(width, height, pitch) * distScale);
  const look = planets[0].look;
  const state: SceneState = {
    resolution: [width, height],
    center: [0, 0],
    camera,
    sunPos: [0, 0, 0],
    sunDir: look.sunDir,
    colorSun: look.colorSun,
    time: ELAPSED,
    focal: FOCAL,
    warp: 0,
    fade: 1,
    starDensity: 0,
    nebula: 0,
    octaves: 5,
    cloudOctaves: 4,
    vignette: 0,
    orreryMix: 1,
    orbitLines: 0,
    seed: 12.4,
  };

  const baseline = await render(toParams(orreryBodies(ELAPSED), state));

  for (const planet of planets) {
    const position = orbitPosition(planet.orbit, ELAPSED);
    const projected = projectBody(position, planet.orbit.size, camera, [width, height], width, height);

    // Would a click at the planet's centre reach it, or is something in the way?
    const toPlanet = norm3(sub3(position, camera.position));
    const reachable = pickPlanetAlongRay(camera.position, toPlanet, ELAPSED) === planet.id;

    // The centroid of a clipped disc is not its centre, so only whole discs
    // inside the frame are meaningful here.
    const whole =
      projected.x - projected.radius > 1 &&
      projected.x + projected.radius < width - 1 &&
      projected.y - projected.radius > 1 &&
      projected.y + projected.radius < height - 1;

    if (!projected.visible || !reachable || !whole) {
      console.log(
        `  skip ${label}/${planet.id.padEnd(8)} (${
          !projected.visible ? 'behind camera' : !reachable ? 'occluded' : 'clipped by frame'
        })`
      );
      continue;
    }

    // Isolate this planet's pixels by highlighting only it.
    const highlighted = await render(toParams(orreryBodies(ELAPSED, planet.id), state));
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    for (let i = 0; i < baseline.length; i += 4) {
      const delta =
        Math.abs(baseline[i] - highlighted[i]) +
        Math.abs(baseline[i + 1] - highlighted[i + 1]) +
        Math.abs(baseline[i + 2] - highlighted[i + 2]);
      if (delta > 6) {
        const pixel = i / 4;
        sumX += pixel % width;
        sumY += Math.floor(pixel / width);
        count++;
      }
    }

    checks++;
    if (count < 8) {
      failures++;
      console.log(`  FAIL ${label}/${planet.id.padEnd(8)} highlight changed only ${count} px`);
      continue;
    }

    const drawnX = sumX / count;
    const drawnY = sumY / count;
    const drift = Math.hypot(drawnX - projected.x, drawnY - projected.y);

    // The projected pixel should also pick this planet, not a neighbour.
    const { origin, dir } = rayThroughUv(
      projected.x / width,
      projected.y / height,
      camera,
      [width, height]
    );
    const picked = pickPlanetAlongRay(origin, dir, ELAPSED);

    const ok = drift <= tolerance(projected.radius) && picked === planet.id;
    if (!ok) failures++;
    console.log(
      `  ${ok ? 'ok  ' : 'FAIL'} ${label}/${planet.id.padEnd(8)} ` +
        `drift=${drift.toFixed(2)}px r=${projected.radius.toFixed(1)}px px=${count} picked=${picked}`
    );
  }
}

gpu.dispose();
console.log(
  failures === 0
    ? `\nAll ${checks} orrery projection/pick checks passed.`
    : `\n${failures} of ${checks} FAILED`
);
process.exit(failures === 0 ? 0 : 1);
