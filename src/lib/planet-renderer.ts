/**
 * Owns the WebGPU lifecycle for the solar-system background.
 *
 * Kept out of the React component on purpose: the interesting part is the
 * transition state machine, and it is easier to read (and to reason about for
 * teardown) as a plain function.
 */
import planetShader from '@/shaders/planet.wgsl';
import { lerpLook, type PlanetLook, type Vec2 } from './solar-system';
import { toParams } from './planet-uniforms';

export interface SolarSystemHandle {
  /** Begins a warp to `next`. Called on every route change. */
  travelTo(next: PlanetLook): void;
  dispose(): void;
}

export interface SolarSystemOptions {
  /** False under `prefers-reduced-motion`: draw static frames, no animation. */
  motion: boolean;
  onReady?: () => void;
  onError?: (error: unknown) => void;
}

const TRANSITION_SECONDS = 1.25;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface Quality {
  dpr: [number, number];
  octaves: number;
  cloudOctaves: number;
}

/**
 * Coarse pointer or a small viewport means a phone: fewer fBM octaves and a
 * lower device-pixel-ratio ceiling, which is where nearly all the cost is.
 */
function pickQuality(): Quality {
  if (typeof window === 'undefined') {
    return { dpr: [1, 2], octaves: 5, cloudOctaves: 4 };
  }
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const small = window.innerWidth < 900;
  if (coarse || small) {
    return { dpr: [1, 1.5], octaves: 4, cloudOctaves: 3 };
  }
  return { dpr: [1, 2], octaves: 5, cloudOctaves: 4 };
}

interface Framing {
  center: Vec2;
  zoomScale: number;
}

/**
 * Places the planet clear of the text: off to one side on a wide screen, and
 * low on a phone so the hero copy sits on empty sky above it. The zoom pulls
 * the camera back far enough that the planet reads as a backdrop, not a wall.
 */
function framingFor(width: number, height: number): Framing {
  const aspect = width / Math.max(height, 1);
  if (aspect >= 1.25) return { center: [0.62, 0.02], zoomScale: 1.5 };
  if (aspect >= 0.85) return { center: [0.28, 0.18], zoomScale: 1.35 };
  return { center: [0, -0.8], zoomScale: 1.2 };
}

export function createSolarSystem(
  canvas: HTMLCanvasElement,
  initialLook: PlanetLook,
  options: SolarSystemOptions
): SolarSystemHandle {
  let disposed = false;
  let stop: (() => void) | undefined;
  let disposeGpu: (() => void) | undefined;

  // Transition state.
  let fromLook = initialLook;
  let toLook = initialLook;
  let progress = 1;
  let pendingLook: PlanetLook | null = null;

  // Accumulated, so a change of spin rate never makes the planet jump.
  let spin = 0.35;
  let moonPhase = 1.2;

  const quality = pickQuality();

  /** Set only in the reduced-motion path, where there is no running loop. */
  let renderStatic: (() => void) | undefined;

  const currentLook = () =>
    progress >= 1 ? toLook : lerpLook(fromLook, toLook, easeInOut(progress));

  void (async () => {
    try {
      if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
        throw new Error('WebGPU is not available');
      }

      const { clock, effect, frame, frameLoop, init, surface } = await import('vgpu');
      if (disposed) return;

      const gpu = await init();
      if (disposed) {
        gpu.dispose();
        return;
      }
      disposeGpu = () => gpu.dispose();

      // A driver reset, a GPU-process crash, or some mobile backgrounding can
      // take the device away and leave a blank canvas. Hand those cases back to
      // the static fallback rather than showing nothing.
      // Structurally typed: the WebGPU DOM types are not global in this project.
      const deviceLost = gpu.gpu.lost as Promise<{ reason: string; message: string }>;
      void deviceLost.then((info) => {
        if (disposed) return; // our own dispose() also resolves this
        stop?.();
        options.onError?.(new Error(`WebGPU device lost (${info.reason}): ${info.message}`));
      });

      const unsubscribeErrors = gpu.onError((error) => {
        console.warn('[solar-system] gpu error:', error);
      });

      const canvasSurface = surface(gpu, canvas, {
        dpr: quality.dpr,
        alphaMode: 'opaque',
      });

      let resolution: Vec2 = [canvasSurface.size[0], canvasSurface.size[1]];
      let framing = framingFor(resolution[0], resolution[1]);

      const frameState = () => ({
        resolution,
        center: framing.center,
        time: 0,
        spin,
        moonPhase,
        warp: 0,
        fade: 1,
        octaves: quality.octaves,
        cloudOctaves: quality.cloudOctaves,
        zoomScale: framing.zoomScale,
        vignette: 0.4,
      });

      const planet = effect(gpu, planetShader, {
        label: 'planet',
        set: { params: toParams(initialLook, frameState()) },
      });

      // Compile before the first visible frame so the reveal is not a hitch.
      // Pre-warming by render signature rather than by passing the surface:
      // `compile(surface)` throws VGPU-SURFACE-NOT-IN-FRAME outside frame(gpu),
      // and the signature warms the identical pipeline.
      await planet.compile({
        colors: [canvasSurface.format],
        sampleCount: canvasSurface.sampleCount,
      });
      if (disposed) {
        gpu.dispose();
        return;
      }

      // Set by the reduced-motion path so a resize can schedule a repaint.
      let repaintAfterResize: (() => void) | undefined;

      const unsubscribeResize = canvasSurface.onResize(({ width, height }) => {
        resolution = [width, height];
        framing = framingFor(width, height);
        repaintAfterResize?.();
      });

      const time = clock(gpu);

      const draw = () => {
        const look = currentLook();
        // A single hump: the sky streaks hardest halfway through the trip.
        const warp = progress >= 1 ? 0 : Math.sin(Math.PI * progress);
        const params = toParams(look, {
          resolution,
          center: framing.center,
          time: time.time,
          spin,
          moonPhase,
          warp,
          fade: 1 - 0.28 * warp,
          octaves: quality.octaves,
          cloudOctaves: quality.cloudOctaves,
          zoomScale: framing.zoomScale,
          vignette: 0.4,
        });
        planet.set({ params });
        return look;
      };

      if (!options.motion) {
        // Reduced motion: no loop. One static frame now, and another whenever
        // the route or the viewport changes.
        const render = () => {
          progress = 1;
          draw();
          frame(gpu, (f) => f.pass(canvasSurface, planet));
        };

        // A frame cannot be opened from inside a resize callback
        // (VGPU-FRAME-REENTRANT), so the repaint is deferred by one tick.
        let pendingRepaint = 0;
        repaintAfterResize = () => {
          if (pendingRepaint) return;
          pendingRepaint = requestAnimationFrame(() => {
            pendingRepaint = 0;
            if (!disposed) render();
          });
        };

        render();
        stop = () => {
          if (pendingRepaint) cancelAnimationFrame(pendingRepaint);
          unsubscribeResize();
          unsubscribeErrors();
        };
        renderStatic = render;
        options.onReady?.();
        return;
      }

      const loop = frameLoop(gpu, (f) => {
        const delta = Math.min(time.deltaTime, 0.05);

        if (progress < 1) {
          progress = Math.min(1, progress + delta / TRANSITION_SECONDS);
          if (progress >= 1 && pendingLook) {
            // A click that landed mid-flight: start the next leg immediately.
            fromLook = toLook;
            toLook = pendingLook;
            pendingLook = null;
            progress = 0;
          }
        }

        const look = draw();
        spin += look.spinRate * delta;
        moonPhase += look.moonRate * delta;

        f.pass(canvasSurface, planet);
      });

      stop = () => {
        loop.stop();
        unsubscribeResize();
        unsubscribeErrors();
      };
      options.onReady?.();
    } catch (error) {
      if (!disposed) options.onError?.(error);
    }
  })();

  return {
    travelTo(next: PlanetLook) {
      if (next === toLook) return;
      if (progress < 1) {
        // Already travelling — queue the destination rather than snapping.
        pendingLook = next;
        return;
      }
      fromLook = toLook;
      toLook = next;
      progress = 0;
      renderStatic?.();
    },
    dispose() {
      disposed = true;
      stop?.();
      disposeGpu?.();
    },
  };
}
