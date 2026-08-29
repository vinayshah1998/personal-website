/**
 * Owns the WebGPU lifecycle for the solar-system backdrop.
 *
 * Two views share one shader and differ only in uniforms:
 *
 *   section — the current route's planet alone at the origin, lit by an
 *             art-directed directional sun, camera parked on +z.
 *   orrery  — the sun and every planet at its orbital position, lit from the
 *             sun, with a free orbit camera the visitor drives.
 *
 * Kept out of the React component on purpose: the interesting parts are the
 * camera and the transition state machine, and they are easier to read (and to
 * reason about for teardown) as a plain function.
 */
import planetShader from '@/shaders/planet.wgsl';
import {
  lerpLook,
  orbitPosition,
  planets,
  type Planet,
  type PlanetLook,
  type ViewMode,
  type Vec2,
  type Vec3,
} from './solar-system';
import {
  FOCAL,
  add3,
  fitDistance,
  sub3,
  framingFor,
  norm3,
  orbitCamera,
  orreryBodies,
  pickPlanetAlongRay,
  projectBody,
  rayThroughUv,
  scale3,
  toBody,
  toParams,
  type Camera,
  type SceneState,
} from './planet-uniforms';

export type { ViewMode };

/** Where a planet landed on screen this frame, in CSS pixels. */
export interface Projection {
  id: string;
  x: number;
  y: number;
  /** Projected radius, CSS pixels. */
  radius: number;
  /** False when the body is behind the camera. */
  visible: boolean;
}

export interface SolarSystemHandle {
  /** Begins a warp to `next`. Called on every route change. */
  travelTo(next: PlanetLook): void;
  setMode(mode: ViewMode): void;
  dispose(): void;
}

export interface SolarSystemOptions {
  /** False under `prefers-reduced-motion`: draw static frames, no animation. */
  motion: boolean;
  onReady?: () => void;
  onError?: (error: unknown) => void;
  /** Called every frame in orrery view so labels can be positioned. */
  onProject?: (projections: Projection[]) => void;
  /** Called when the hovered planet changes (orrery view only). */
  onHover?: (id: string | null) => void;
  /** Called on a click that is not a drag (orrery view only). */
  onSelect?: (id: string) => void;
}

const TRANSITION_SECONDS = 1.25;
const SECTION_CAMERA_DISTANCE = 5.45;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

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

export function createSolarSystem(
  canvas: HTMLCanvasElement,
  initialLook: PlanetLook,
  options: SolarSystemOptions
): SolarSystemHandle {
  let disposed = false;
  let stop: (() => void) | undefined;
  let disposeGpu: (() => void) | undefined;

  // Look transition (section view).
  let fromLook = initialLook;
  let toLook = initialLook;
  let progress = 1;
  let pendingLook: PlanetLook | null = null;

  // View transition. `mode` flips at the midpoint, under cover of the warp.
  let mode: ViewMode = 'section';
  let targetMode: ViewMode = 'section';

  // Accumulated, so a change of spin rate never makes a planet jump.
  let spin = 0.35;
  let moonPhase = 1.2;
  let elapsed = 0;

  // Orrery camera, preserved across visits so re-entering feels continuous.
  let yaw = -0.55;
  let pitch = 0.44;
  let distance = 34;
  let target: Vec3 = [0, 0, 0];
  let cameraInitialised = false;

  let hoveredId: string | null = null;

  const quality = pickQuality();

  /** Set only in the reduced-motion path, where there is no running loop. */
  let renderStatic: (() => void) | undefined;

  const currentLook = () =>
    progress >= 1 ? toLook : lerpLook(fromLook, toLook, easeInOut(progress));

  const beginTransition = () => {
    progress = 0;
  };

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

      // Set by the reduced-motion path so a resize can schedule a repaint.
      let repaintAfterResize: (() => void) | undefined;

      const unsubscribeResize = canvasSurface.onResize(({ width, height }) => {
        resolution = [width, height];
        framing = framingFor(width, height);
        if (!cameraInitialised) distance = fitDistance(width, height, pitch);
        repaintAfterResize?.();
      });

      if (!cameraInitialised) {
        distance = fitDistance(resolution[0], resolution[1], pitch);
      }

      /** Bodies and scene uniforms for the frame about to be drawn. */
      const buildFrame = () => {
        const look = currentLook();
        const warp = progress >= 1 ? 0 : Math.sin(Math.PI * progress);
        const orrery = mode === 'orrery';

        const scene: SceneState = {
          resolution,
          center: orrery ? [0, 0] : framing.center,
          camera: orbitCamera([0, 0, 0], 0, 0, 1),
          sunPos: [0, 0, 0],
          sunDir: look.sunDir,
          colorSun: look.colorSun,
          time: elapsed,
          focal: FOCAL,
          warp,
          fade: 1 - 0.28 * warp,
          starDensity: look.starDensity,
          nebula: orrery ? 0.22 : look.nebula,
          octaves: quality.octaves,
          cloudOctaves: quality.cloudOctaves,
          vignette: orrery ? 0.25 : 0.4,
          orreryMix: orrery ? 1 : 0,
          orbitLines: orrery ? 1 : 0,
          seed: look.seed,
        };

        const bodies = [];
        const projections: Projection[] = [];

        if (orrery) {
          scene.camera = orbitCamera(target, yaw, pitch, distance);
          bodies.push(...orreryBodies(elapsed, hoveredId));
          for (const planet of planets) {
            projections.push(
              project(planet, orbitPosition(planet.orbit, elapsed), scene.camera)
            );
          }
        } else {
          // Section view: the focused planet alone, at the origin.
          scene.camera = {
            position: [0, 0, SECTION_CAMERA_DISTANCE * look.zoom * framing.zoomScale],
            right: [1, 0, 0],
            up: [0, 1, 0],
            forward: [0, 0, -1],
          };
          // Far enough that the point light matches the directional one.
          scene.sunPos = scale3([look.sunDir[0], look.sunDir[1], look.sunDir[2]], 1000);
          bodies.push(
            toBody(look, { position: [0, 0, 0], radius: 1, spin, moonPhase })
          );
        }

        return { look, bodies, scene, projections };
      };

      /**
       * World position -> CSS-pixel position and radius on the canvas.
       *
       * A body hidden behind the sun (or another planet) still projects onto
       * the screen, so visibility is decided by the same pick used for clicks:
       * a label shows only where clicking it would actually reach its planet.
       */
      function project(planet: Planet, position: Vec3, camera: Camera): Projection {
        const projected = projectBody(
          position,
          planet.orbit.size,
          camera,
          resolution,
          canvas.clientWidth || 1,
          canvas.clientHeight || 1
        );
        const occluded =
          projected.visible &&
          pickPlanetAlongRay(camera.position, norm3(sub3(position, camera.position)), elapsed) !==
            planet.id;
        return { id: planet.id, ...projected, visible: projected.visible && !occluded };
      }

      const initialFrame = buildFrame();
      const planetEffect = effect(gpu, planetShader, {
        label: 'solar-system',
        set: { params: toParams(initialFrame.bodies, initialFrame.scene) },
      });

      // Compile before the first visible frame so the reveal is not a hitch.
      // Pre-warming by render signature rather than by passing the surface:
      // `compile(surface)` throws VGPU-SURFACE-NOT-IN-FRAME outside frame(gpu),
      // and the signature warms the identical pipeline.
      await planetEffect.compile({
        colors: [canvasSurface.format],
        sampleCount: canvasSurface.sampleCount,
      });
      if (disposed) {
        gpu.dispose();
        return;
      }

      const time = clock(gpu);

      const draw = () => {
        const { look, bodies, scene, projections } = buildFrame();
        planetEffect.set({ params: toParams(bodies, scene) });
        if (mode === 'orrery') options.onProject?.(projections);
        return look;
      };

      // --- Input (orrery view only) ----------------------------------------

      const pointers = new Map<number, { x: number; y: number }>();
      let dragging = false;
      let dragMoved = 0;
      let pinchDistance = 0;

      /** Nearest planet under the pointer, by exact ray-sphere test. */
      const pickAt = (clientX: number, clientY: number): string | null => {
        const rect = canvas.getBoundingClientRect();
        const { origin, dir } = rayThroughUv(
          (clientX - rect.left) / Math.max(rect.width, 1),
          (clientY - rect.top) / Math.max(rect.height, 1),
          orbitCamera(target, yaw, pitch, distance),
          resolution
        );
        return pickPlanetAlongRay(origin, dir, elapsed);
      };

      const setHovered = (id: string | null) => {
        if (id === hoveredId) return;
        hoveredId = id;
        canvas.style.cursor = id ? 'pointer' : 'grab';
        options.onHover?.(id);
      };

      const onPointerDown = (event: PointerEvent) => {
        if (mode !== 'orrery') return;
        canvas.setPointerCapture(event.pointerId);
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        dragging = pointers.size > 0;
        dragMoved = 0;
        if (pointers.size === 2) {
          const [a, b] = [...pointers.values()];
          pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
        }
      };

      const onPointerMove = (event: PointerEvent) => {
        if (mode !== 'orrery') return;
        const previous = pointers.get(event.pointerId);
        if (!previous) {
          setHovered(pickAt(event.clientX, event.clientY));
          return;
        }

        const dx = event.clientX - previous.x;
        const dy = event.clientY - previous.y;
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        dragMoved += Math.abs(dx) + Math.abs(dy);

        if (pointers.size >= 2) {
          const [a, b] = [...pointers.values()];
          const next = Math.hypot(a.x - b.x, a.y - b.y);
          if (pinchDistance > 0) {
            distance = clamp(distance * (pinchDistance / Math.max(next, 1)), 6, 90);
          }
          pinchDistance = next;
          return;
        }

        const panning = event.shiftKey || event.buttons === 2;
        if (panning) {
          // Pan in the camera plane, scaled so the world tracks the cursor.
          const camera = orbitCamera(target, yaw, pitch, distance);
          const perPixel = (distance * FOCAL * 2) / Math.max(canvas.clientHeight, 1);
          target = add3(
            target,
            add3(scale3(camera.right, -dx * perPixel), scale3(camera.up, dy * perPixel))
          );
          const reach = Math.hypot(target[0], target[1], target[2]);
          if (reach > 30) target = scale3(norm3(target), 30);
        } else {
          yaw -= dx * 0.005;
          pitch = clamp(pitch + dy * 0.005, -1.35, 1.35);
        }
        cameraInitialised = true;
      };

      const endPointer = (event: PointerEvent) => {
        if (mode !== 'orrery') return;
        const wasDragging = dragging && dragMoved > 6;
        pointers.delete(event.pointerId);
        if (canvas.hasPointerCapture(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }
        if (pointers.size === 0) {
          dragging = false;
          pinchDistance = 0;
          if (!wasDragging) {
            const id = pickAt(event.clientX, event.clientY);
            if (id) options.onSelect?.(id);
          }
        }
      };

      const onWheel = (event: WheelEvent) => {
        if (mode !== 'orrery') return;
        event.preventDefault();
        distance = clamp(distance * Math.exp(event.deltaY * 0.0012), 6, 90);
        cameraInitialised = true;
      };

      const onContextMenu = (event: MouseEvent) => {
        if (mode === 'orrery') event.preventDefault();
      };

      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerup', endPointer);
      canvas.addEventListener('pointercancel', endPointer);
      canvas.addEventListener('wheel', onWheel, { passive: false });
      canvas.addEventListener('contextmenu', onContextMenu);

      const removeInput = () => {
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', endPointer);
        canvas.removeEventListener('pointercancel', endPointer);
        canvas.removeEventListener('wheel', onWheel);
        canvas.removeEventListener('contextmenu', onContextMenu);
      };

      if (!options.motion) {
        // Reduced motion: no loop. One static frame now, and another whenever
        // the route, the view or the viewport changes.
        const render = () => {
          progress = 1;
          mode = targetMode;
          draw();
          frame(gpu, (f) => f.pass(canvasSurface, planetEffect));
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
          removeInput();
        };
        renderStatic = render;
        options.onReady?.();
        return;
      }

      const loop = frameLoop(gpu, (f) => {
        const delta = Math.min(time.deltaTime, 0.05);
        elapsed += delta;

        if (progress < 1) {
          progress = Math.min(1, progress + delta / TRANSITION_SECONDS);
          // Flip the view at the midpoint, where the warp is brightest.
          if (progress >= 0.5) mode = targetMode;
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

        f.pass(canvasSurface, planetEffect);
      });

      stop = () => {
        loop.stop();
        unsubscribeResize();
        unsubscribeErrors();
        removeInput();
      };
      options.onReady?.();
    } catch (error) {
      if (!disposed) options.onError?.(error);
    }
  })();

  return {
    travelTo(next: PlanetLook) {
      if (next === toLook) return;
      if (progress < 0.5) {
        // Still flying out: retarget this trip rather than starting a second
        // warp. Selecting a planet in the orrery changes view and look at once.
        fromLook = currentLook();
        toLook = next;
        return;
      }
      if (progress < 1) {
        // Past the midpoint — queue it so the arrival is not cut short.
        pendingLook = next;
        return;
      }
      fromLook = toLook;
      toLook = next;
      beginTransition();
      renderStatic?.();
    },
    setMode(next: ViewMode) {
      if (next === targetMode) return;
      targetMode = next;
      if (next === 'orrery') hoveredId = null;
      beginTransition();
      renderStatic?.();
    },
    dispose() {
      disposed = true;
      stop?.();
      disposeGpu?.();
    },
  };
}
