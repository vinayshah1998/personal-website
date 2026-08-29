'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { planetForPath } from '@/lib/solar-system';
import type { SolarSystemHandle } from '@/lib/planet-renderer';

/**
 * Fixed, full-viewport WebGPU backdrop. The planet shown tracks the current
 * route, so navigating the site flies between planets.
 *
 * Falls back to a static CSS starfield wherever WebGPU is unavailable.
 */
export default function SolarSystem() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<SolarSystemHandle | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const pathname = usePathname();
  const planet = planetForPath(pathname ?? '/');

  // Start once. The planet for the initial route is read from a ref so that
  // route changes never re-run this effect and tear down the device.
  const planetRef = useRef(planet);
  planetRef.current = planet;

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
            if (!cancelled) setFailed(true);
          },
        });
      })
      .catch((error) => {
        console.warn('[solar-system] renderer failed to load:', error);
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, []);

  // Route change -> warp to the matching planet.
  useEffect(() => {
    handleRef.current?.travelTo(planet.look);
  }, [planet]);

  return (
    <div className="fixed inset-0 -z-10 bg-[#04060d]" aria-hidden="true">
      {failed ? (
        <div className="starfield-fallback absolute inset-0" />
      ) : (
        <canvas
          ref={canvasRef}
          className="block h-full w-full transition-opacity duration-700"
          style={{ opacity: ready ? 1 : 0 }}
        />
      )}
      {/* Keeps body copy legible over the brightest parts of the scene. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#04060d]/75 via-[#04060d]/15 to-[#04060d]/65" />
    </div>
  );
}
