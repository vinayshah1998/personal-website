'use client';

import { usePathname } from 'next/navigation';
import { planetForPath } from '@/lib/solar-system';
import { useChromeHidden } from './SolarSystemContext';

/**
 * Small readout naming the planet the current route corresponds to — the thing
 * that makes the backdrop legible as a solar system rather than decoration.
 */
export default function PlanetHud() {
  const pathname = usePathname();
  const planet = planetForPath(pathname ?? '/');
  const hidden = useChromeHidden();

  return (
    <div
      aria-hidden={hidden}
      className={`pointer-events-none fixed bottom-5 left-5 z-20 hidden select-none transition-opacity duration-500 sm:block ${
        hidden ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div key={planet.id} className="animate-[hud_600ms_ease-out]">
        <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.22em] text-white/40">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/60" />
          Now orbiting
        </div>
        <div className="mt-1 text-sm font-medium text-white/85">{planet.name}</div>
        <div className="text-xs text-white/45">{planet.tagline}</div>
      </div>
      <style>{`
        @keyframes hud {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[hud_600ms_ease-out\\] { animation: none; }
        }
      `}</style>
    </div>
  );
}
