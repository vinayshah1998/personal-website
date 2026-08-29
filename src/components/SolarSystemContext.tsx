'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ViewMode } from '@/lib/solar-system';

interface SolarSystemState {
  mode: ViewMode;
  enterOrrery: () => void;
  exitOrrery: () => void;
  /** In orrery view, whether the site's own chrome is drawn on top. */
  overlayVisible: boolean;
  toggleOverlay: () => void;
  /** False once the renderer has fallen back; the orrery is then unavailable. */
  available: boolean;
  setAvailable: (value: boolean) => void;
}

const SolarSystemContext = createContext<SolarSystemState | null>(null);

export function SolarSystemProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ViewMode>('section');
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [available, setAvailable] = useState(true);

  const enterOrrery = useCallback(() => {
    setOverlayVisible(false);
    setMode('orrery');
  }, []);

  const exitOrrery = useCallback(() => {
    setMode('section');
    setOverlayVisible(false);
  }, []);

  const toggleOverlay = useCallback(() => setOverlayVisible((v) => !v), []);

  const value = useMemo(
    () => ({
      mode,
      enterOrrery,
      exitOrrery,
      overlayVisible,
      toggleOverlay,
      available,
      setAvailable,
    }),
    [mode, enterOrrery, exitOrrery, overlayVisible, toggleOverlay, available]
  );

  return <SolarSystemContext.Provider value={value}>{children}</SolarSystemContext.Provider>;
}

export function useSolarSystem(): SolarSystemState {
  const ctx = useContext(SolarSystemContext);
  if (!ctx) throw new Error('useSolarSystem must be used inside SolarSystemProvider');
  return ctx;
}

/** True when the site's own chrome should be hidden behind the orrery. */
export function useChromeHidden(): boolean {
  const { mode, overlayVisible } = useSolarSystem();
  return mode === 'orrery' && !overlayVisible;
}
