'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { FISH, type FishingPhase, type Vec2 } from '@/lib/island/world';
import type { IslandScene, IslandSnapshot } from './IslandScene';

type Status = 'loading' | 'ready' | 'fallback';

const KEY_AXIS: Record<string, Vec2> = {
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
};

const ACTION_LABEL: Record<FishingPhase, string> = {
  idle: 'Go fishing',
  'walking-to-pond': 'Heading to the dock…',
  casting: 'Casting…',
  waiting: 'Waiting for a nibble…',
  bite: 'Reel it in!',
  caught: 'Cast again',
};

const STATUS_TEXT: Record<FishingPhase, string> = {
  idle: 'The penguin is wandering the island.',
  'walking-to-pond': 'Waddling over to the dock.',
  casting: 'Casting the line.',
  waiting: 'Waiting quietly by the pond. No rush.',
  bite: 'Something is nibbling! Reel in whenever you like.',
  caught: '',
};

const NUDGES: { label: string; glyph: string; direction: Vec2; area: string }[] = [
  { label: 'Walk up', glyph: '↑', direction: [0, -1], area: 'up' },
  { label: 'Walk left', glyph: '←', direction: [-1, 0], area: 'left' },
  { label: 'Walk right', glyph: '→', direction: [1, 0], area: 'right' },
  { label: 'Walk down', glyph: '↓', direction: [0, 1], area: 'down' },
];

export default function IslandWorld() {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<IslandScene | null>(null);
  const keysRef = useRef(new Set<string>());
  const pointerRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [snapshot, setSnapshot] = useState<IslandSnapshot>({ phase: 'idle', caught: 0, lastFish: null });

  useEffect(() => {
    let cancelled = false;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotionChange = () => sceneRef.current?.setReducedMotion(motionQuery.matches);
    motionQuery.addEventListener('change', onMotionChange);

    // Keys released while the window is unfocused or hidden never deliver keyup here.
    const releaseKeys = () => {
      keysRef.current.clear();
      sceneRef.current?.setAxis([0, 0]);
    };
    const onVisibility = () => {
      if (document.hidden) releaseKeys();
    };
    window.addEventListener('blur', releaseKeys);
    document.addEventListener('visibilitychange', onVisibility);

    const fallBack = () => {
      releaseKeys();
      sceneRef.current?.dispose();
      sceneRef.current = null;
      setStatus('fallback');
    };

    import('./IslandScene')
      .then(({ IslandScene }) => {
        const host = hostRef.current;
        if (cancelled || !host) return;
        sceneRef.current = new IslandScene(host, {
          reducedMotion: motionQuery.matches,
          onSnapshot: setSnapshot,
          onReady: () => setStatus('ready'),
          onError: fallBack,
        });
      })
      .catch(() => {
        if (!cancelled) fallBack();
      });

    return () => {
      cancelled = true;
      motionQuery.removeEventListener('change', onMotionChange);
      window.removeEventListener('blur', releaseKeys);
      document.removeEventListener('visibilitychange', onVisibility);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  const syncAxis = () => {
    let x = 0;
    let z = 0;
    keysRef.current.forEach((code) => {
      x += KEY_AXIS[code][0];
      z += KEY_AXIS[code][1];
    });
    sceneRef.current?.setAxis([x, z]);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.code in KEY_AXIS) {
      event.preventDefault();
      keysRef.current.add(event.code);
      syncAxis();
    } else if (event.code === 'Space' || event.code === 'KeyF' || event.code === 'Enter') {
      event.preventDefault();
      if (!event.repeat) sceneRef.current?.command({ type: 'action' });
    }
  };

  const onKeyUp = (event: KeyboardEvent<HTMLDivElement>) => {
    if (keysRef.current.delete(event.code)) syncAxis();
  };

  const onBlur = () => {
    keysRef.current.clear();
    syncAxis();
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointerRef.current = { x: event.clientX, y: event.clientY, time: event.timeStamp };
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointerRef.current;
    pointerRef.current = null;
    if (!start) return;
    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (moved < 10 && event.timeStamp - start.time < 600) {
      sceneRef.current?.tapAt(event.clientX, event.clientY);
      if (event.pointerType === 'mouse') hostRef.current?.focus({ preventScroll: true });
    }
  };

  const busy = snapshot.phase === 'walking-to-pond' || snapshot.phase === 'casting' || snapshot.phase === 'waiting';
  const statusText =
    status === 'fallback'
      ? 'The 3D island is not available in this browser right now, so here is a painted postcard of it instead.'
      : status === 'loading'
        ? 'The island is waking up…'
        : snapshot.phase === 'caught' && snapshot.lastFish
          ? `You caught ${FISH[snapshot.lastFish].name}!`
          : STATUS_TEXT[snapshot.phase];

  return (
    <div className="island-stage" data-status={status}>
      <div
        ref={hostRef}
        className="island-world"
        tabIndex={status === 'ready' ? 0 : -1}
        role="application"
        aria-label="Tiny island with a penguin. Arrow keys or W A S D walk, Space or F fishes."
        aria-describedby="island-help"
        data-testid="island-world"
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={onBlur}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (pointerRef.current = null)}
      >
        <div className="island-poster" aria-hidden={status === 'ready'}>
          <svg viewBox="0 0 400 260" role="img" aria-label="Postcard of a tiny forest island with a pond, a dock and a penguin">
            <ellipse cx="200" cy="170" rx="170" ry="62" fill="#b8835a" />
            <ellipse cx="200" cy="150" rx="176" ry="66" fill="#8fbf5a" />
            <ellipse cx="238" cy="142" rx="64" ry="26" fill="#ecd6a4" />
            <ellipse cx="238" cy="142" rx="56" ry="21" fill="#4f9ea0" />
            <rect x="150" y="136" width="42" height="10" rx="2" fill="#c48e5c" />
            <circle cx="90" cy="112" r="26" fill="#5f9e4f" />
            <circle cx="112" cy="96" r="20" fill="#79b25a" />
            <polygon points="320,70 300,125 340,125" fill="#3f7d57" />
            <polygon points="60,120 44,160 76,160" fill="#3f7d57" />
            <ellipse cx="176" cy="128" rx="9" ry="12" fill="#2b3a5c" />
            <ellipse cx="176" cy="131" rx="6" ry="8" fill="#fbf1dc" />
            <rect x="168" y="119" width="16" height="4" rx="2" fill="#f2a93b" />
          </svg>
        </div>
      </div>

      <div className="island-controls" aria-label="Island controls">
        <p className="island-status" role="status" aria-live="polite" data-testid="island-status">
          {statusText}
        </p>
        <div className="island-control-row">
          <button
            type="button"
            className="island-action"
            data-testid="island-action"
            onClick={() => sceneRef.current?.command({ type: 'action' })}
            disabled={status !== 'ready' || busy}
          >
            {ACTION_LABEL[snapshot.phase]}
          </button>
          <div className="island-dpad" role="group" aria-label="Walk the penguin">
            {NUDGES.map((nudge) => (
              <button
                key={nudge.area}
                type="button"
                aria-label={nudge.label}
                style={{ gridArea: nudge.area }}
                disabled={status !== 'ready'}
                onClick={() => sceneRef.current?.nudge(nudge.direction)}
              >
                {nudge.glyph}
              </button>
            ))}
          </div>
        </div>
        <p className="island-basket" data-testid="island-basket">
          Basket: {snapshot.caught} {snapshot.caught === 1 ? 'catch' : 'catches'}
        </p>
        <p id="island-help" className="island-help">
          Click or tap the grass to wander. Tap the pond, press Space or F, or use the button to fish. Focus the island for arrow keys.
        </p>
      </div>
    </div>
  );
}
