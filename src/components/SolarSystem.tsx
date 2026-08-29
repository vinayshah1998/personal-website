'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { planetForPath, planets } from '@/lib/solar-system';
import type { Projection, SolarSystemHandle } from '@/lib/planet-renderer';
import { useSolarSystem } from './SolarSystemContext';

/**
 * Fixed, full-viewport WebGPU backdrop, plus the orrery's own controls.
 *
 * In section view the canvas is inert scenery behind the page. In orrery view
 * it comes forward, takes pointer input (drag to rotate, shift-drag to pan,
 * wheel to zoom) and carries a clickable label per planet.
 *
 * Falls back to a static CSS starfield wherever WebGPU is unavailable.
 */
export default function SolarSystem() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<SolarSystemHandle | null>(null);
  const labelRefs = useRef(new Map<string, HTMLButtonElement>());
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const planet = planetForPath(pathname ?? '/');

  const { mode, enterOrrery, exitOrrery, overlayVisible, toggleOverlay, setAvailable } =
    useSolarSystem();

  const orrery = mode === 'orrery';

  // Read from refs inside the renderer callbacks so a route or mode change
  // never re-runs the effect that owns the device.
  const planetRef = useRef(planet);
  planetRef.current = planet;
  const exitRef = useRef(exitOrrery);
  exitRef.current = exitOrrery;
  // Held in a ref so nothing about navigation can retrigger the effect below:
  // re-running it would tear down and rebuild the WebGPU device.
  const routerRef = useRef(router);
  routerRef.current = router;
  const setAvailableRef = useRef(setAvailable);
  setAvailableRef.current = setAvailable;

  /** Positions the labels imperatively — this runs every frame. */
  const onProject = useCallback((projections: Projection[]) => {
    for (const p of projections) {
      const el = labelRefs.current.get(p.id);
      if (!el) continue;
      const show = p.visible && p.radius > 0.5;
      el.style.opacity = show ? '1' : '0';
      el.style.pointerEvents = show ? 'auto' : 'none';
      if (show) {
        el.style.transform = `translate(-50%, -50%) translate(${p.x}px, ${
          p.y + p.radius + 18
        }px)`;
      }
    }
  }, []);

  const onSelect = useCallback((id: string) => {
    const target = planets.find((p) => p.id === id);
    if (!target) return;
    exitRef.current();
    routerRef.current.push(target.path);
  }, []);

  const onHover = useCallback((id: string | null) => {
    for (const [planetId, el] of labelRefs.current) {
      el.dataset.hovered = String(planetId === id);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    const motion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    import('@/lib/planet-renderer')
      .then(({ createSolarSystem }) => {
        if (cancelled) return;
        handleRef.current = createSolarSystem(canvas, planetRef.current.look, {
          motion,
          onReady: () => !cancelled && setReady(true),
          onError: (error) => {
            // Worth surfacing: it is the only signal that a visitor is seeing
            // the static fallback rather than the scene.
            console.warn('[solar-system] falling back to static starfield:', error);
            if (cancelled) return;
            setFailed(true);
            setAvailableRef.current(false);
            exitRef.current();
          },
          onProject,
          onHover,
          onSelect,
        });
      })
      .catch((error) => {
        console.warn('[solar-system] renderer failed to load:', error);
        if (cancelled) return;
        setFailed(true);
        setAvailableRef.current(false);
      });

    return () => {
      cancelled = true;
      handleRef.current?.dispose();
      handleRef.current = null;
    };
    // Deliberately empty: the device is created once and lives for the page.
    // Everything variable is reached through a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Route change -> warp to the matching planet.
  useEffect(() => {
    handleRef.current?.travelTo(planet.look);
  }, [planet]);

  // View change -> warp between the section framing and the orrery camera.
  useEffect(() => {
    handleRef.current?.setMode(mode);
  }, [mode]);

  // Escape leaves the orrery.
  useEffect(() => {
    if (!orrery) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') exitRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [orrery]);

  return (
    <>
      <div
        className={`fixed inset-0 bg-[#04060d] ${orrery ? 'z-0' : '-z-10'}`}
        aria-hidden={!orrery}
      >
        {failed ? (
          <div className="starfield-fallback absolute inset-0" />
        ) : (
          <canvas
            ref={canvasRef}
            className={`block h-full w-full touch-none transition-opacity duration-700 ${
              orrery ? 'cursor-grab' : 'pointer-events-none'
            }`}
            style={{ opacity: ready ? 1 : 0 }}
          />
        )}
        {/* Keeps body copy legible over the brightest parts of the scene. */}
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-b from-[#04060d]/75 via-[#04060d]/15 to-[#04060d]/65 transition-opacity duration-500 ${
            orrery ? 'opacity-0' : 'opacity-100'
          }`}
        />
      </div>

      {/* Planet labels: real buttons, so the orrery is keyboard-navigable. */}
      <div
        className={`pointer-events-none fixed inset-0 z-10 ${orrery ? '' : 'hidden'}`}
        aria-hidden={!orrery}
      >
        {planets.map((p) => (
          <button
            key={p.id}
            ref={(el) => {
              if (el) labelRefs.current.set(p.id, el);
              else labelRefs.current.delete(p.id);
            }}
            type="button"
            onClick={() => onSelect(p.id)}
            style={{ opacity: 0 }}
            className="group absolute left-0 top-0 whitespace-nowrap rounded-full border border-white/15 bg-[#04060d]/70 px-3 py-1 text-[0.7rem] uppercase tracking-[0.18em] text-white/70 backdrop-blur transition-colors hover:border-white/40 hover:text-white focus-visible:border-white/60 focus-visible:text-white focus-visible:outline-none data-[hovered=true]:border-white/45 data-[hovered=true]:text-white"
          >
            {p.name}
            <span className="ml-2 text-white/35 group-hover:text-white/60">
              {p.path === '/' ? 'Home' : p.path.replace('/', '')}
            </span>
          </button>
        ))}
      </div>

      {!failed && <OrreryControls />}
    </>
  );

  function OrreryControls() {
    if (!orrery) {
      return (
        <button
          type="button"
          onClick={enterOrrery}
          className="panel fixed bottom-5 right-5 z-20 flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/75 transition-colors hover:text-white"
        >
          <SystemGlyph />
          Solar system
        </button>
      );
    }

    return (
      <div className="fixed inset-x-0 bottom-0 z-20 flex flex-col items-center gap-3 p-5">
        <p className="text-center text-[0.7rem] uppercase tracking-[0.18em] text-white/35">
          Drag to rotate · shift-drag to pan · scroll to zoom · pick a planet to visit
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={toggleOverlay}
            aria-pressed={overlayVisible}
            className="panel px-4 py-2 text-sm text-white/75 transition-colors hover:text-white"
          >
            {overlayVisible ? 'Hide page' : 'Show page'}
          </button>
          <button
            type="button"
            onClick={exitOrrery}
            className="panel px-4 py-2 text-sm text-white/75 transition-colors hover:text-white"
          >
            Back to {planet.name}
          </button>
        </div>
      </div>
    );
  }
}

function SystemGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none">
      <ellipse cx="8" cy="8" rx="7" ry="3.2" stroke="currentColor" strokeOpacity="0.5" />
      <circle cx="8" cy="8" r="2" fill="currentColor" />
      <circle cx="15" cy="8" r="1.2" fill="currentColor" />
    </svg>
  );
}
