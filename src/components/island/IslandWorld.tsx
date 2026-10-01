'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { CATCH_LINES, greeting, pick } from '@/lib/island/dialogue';
import { FISH, FISH_KINDS, type FishKind, type FishingPhase, type Vec2 } from '@/lib/island/world';
import { IslandAudio } from './IslandAudio';
import type { Interaction, IslandScene, IslandSnapshot } from './IslandScene';

interface Line {
  readonly id: number;
  readonly text: string;
  /** Pause before the bubble pops in, so the island can fade in first. */
  readonly delay: number;
}

const SOUND_KEY = 'island-sound';
const TYPE_MS = 38;
const MUSE_AFTER_MS = 24_000;
const GREETING_DELAY_MS = 700;

function FishIcon({ kind, color }: { kind: FishKind; color?: string }) {
  const fill = color ?? 'currentColor';
  if (kind === 'lilyLeaf') {
    return (
      <svg viewBox="0 0 40 28" aria-hidden="true">
        <path d="M20 14 L29 7 A11 11 0 1 1 22 3.2 Z" fill={fill} />
        {color && <path d="M20 14 L13 8 M20 14 L12 17 M20 14 L21 24" stroke="rgba(30,60,30,0.35)" strokeWidth="1.3" fill="none" />}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 28" aria-hidden="true">
      <path d="M29 14 L38 6.5 L36.5 14 L38 21.5 Z" fill={fill} />
      <path d="M4 14 C8 4.5 24 3.5 31 14 C24 24.5 8 23.5 4 14 Z" fill={fill} />
      {color && (
        <>
          <path d="M18 7.5 C20.5 11 20.5 17 18 20.5" stroke="rgba(43,58,44,0.25)" strokeWidth="1.4" fill="none" />
          <circle cx="10.5" cy="12.3" r="1.9" fill="#2b2a33" />
        </>
      )}
    </svg>
  );
}

function SpeechBubble({
  line,
  reducedMotion,
  onChar,
  onDone,
}: {
  line: Line;
  reducedMotion: boolean;
  onChar: (char: string, index: number) => void;
  onDone: (id: number) => void;
}) {
  const [shown, setShown] = useState(reducedMotion ? line.text.length : 0);
  const onCharRef = useRef(onChar);
  const onDoneRef = useRef(onDone);
  onCharRef.current = onChar;
  onDoneRef.current = onDone;

  useEffect(() => {
    // Under reduced motion the whole line appears at once, with one chirp, and still lingers before hiding.
    const start = performance.now() + (reducedMotion ? 0 : line.delay);
    const length = line.text.length;
    const linger = length * TYPE_MS + 2800 + length * 40;
    let typed = 0;
    let frame = 0;
    const tick = (now: number) => {
      const target = now < start ? 0 : reducedMotion ? length : Math.min(length, Math.floor((now - start) / TYPE_MS) + 1);
      if (target > typed) {
        // One chirp per frame keeps the babble tidy even when frames are slow.
        onCharRef.current(line.text[reducedMotion ? 0 : target - 1], target - 1);
        typed = target;
        setShown(typed);
      }
      if (now - start >= linger) onDoneRef.current(line.id);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [line, reducedMotion]);

  return (
    <div
      className="island-bubble"
      data-testid="island-bubble"
      data-done={shown >= line.text.length}
      style={reducedMotion ? undefined : { animationDelay: `${line.delay}ms` }}
    >
      <span aria-hidden="true">
        {line.text.slice(0, shown)}
        <span className="island-bubble-rest">{line.text.slice(shown)}</span>
      </span>
      <span className="sr-only">{line.text}</span>
    </div>
  );
}

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
  const [snapshot, setSnapshot] = useState<IslandSnapshot>({ phase: 'idle', caught: 0, lastFish: null, counts: {} });
  const [line, setLine] = useState<Line | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const audioRef = useRef<IslandAudio | null>(null);
  const lineIdRef = useRef(0);
  const lastLineRef = useRef('');
  const quietSinceRef = useRef(0);
  const previousPhaseRef = useRef<FishingPhase>('idle');

  const audio = () => (audioRef.current ??= new IslandAudio());

  const say = useCallback((text: string, delay = 0) => {
    lastLineRef.current = text;
    quietSinceRef.current = Date.now();
    setLine({ id: ++lineIdRef.current, text, delay });
  }, []);

  const onLineDone = useCallback((id: number) => {
    quietSinceRef.current = Date.now();
    setLine((current) => (current?.id === id ? null : current));
  }, []);

  const onInteract = useCallback(
    (kind: Interaction) => {
      const sounds = { pat: 'pat', tree: 'rustle', sign: 'sign', fire: 'fire' } as const;
      audioRef.current?.play(sounds[kind]);
      if (kind === 'tree' && Math.random() < 0.6) return;
      say(pick(kind, Math.random(), lastLineRef.current));
    },
    [say],
  );
  const handlersRef = useRef({ onInteract });
  handlersRef.current = { onInteract };

  useEffect(() => {
    let cancelled = false;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(motionQuery.matches);
    const onMotionChange = () => {
      sceneRef.current?.setReducedMotion(motionQuery.matches);
      setReducedMotion(motionQuery.matches);
    };
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
          onReady: () => {
            setStatus('ready');
            // The greeting is part of arriving, so it lands in the same update as the island itself.
            say(greeting(new Date().getHours()), GREETING_DELAY_MS);
          },
          onError: fallBack,
          onInteract: (kind) => handlersRef.current.onInteract(kind),
          onStep: (surface) => audioRef.current?.play(surface === 'wood' ? 'step-wood' : 'step-grass'),
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
    // `say` is stable, so the scene is still created exactly once.
  }, [say]);

  // Sound is opt-in. A remembered "on" resumes on the first gesture, as browsers require.
  useEffect(() => {
    if (window.localStorage.getItem(SOUND_KEY) !== 'on') return;
    const resume = () => {
      void audio().enable();
      setSoundOn(true);
    };
    window.addEventListener('pointerdown', resume, { once: true });
    window.addEventListener('keydown', resume, { once: true });
    return () => {
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
    };
  }, []);

  useEffect(() => () => audioRef.current?.dispose(), []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    window.localStorage.setItem(SOUND_KEY, next ? 'on' : 'off');
    if (next) {
      void audio()
        .enable()
        .then(() => audioRef.current?.play('click'));
    } else audioRef.current?.disable();
  };


  useEffect(() => {
    const previous = previousPhaseRef.current;
    const phase = snapshot.phase;
    if (phase === previous) return;
    previousPhaseRef.current = phase;
    const sounds = audioRef.current;
    switch (phase) {
      case 'walking-to-pond':
        if (Math.random() < 0.5) say(pick('cast', Math.random(), lastLineRef.current));
        break;
      case 'casting':
        sounds?.play('cast');
        break;
      case 'waiting':
        sounds?.play('plop');
        break;
      case 'bite':
        sounds?.play('bite');
        say(pick('bite', Math.random(), lastLineRef.current));
        break;
      case 'caught':
        sounds?.play('catch');
        if (snapshot.lastFish) say(CATCH_LINES[snapshot.lastFish]);
        break;
      case 'idle':
        break;
    }
  }, [snapshot, say]);

  // When nobody has said anything for a while, the penguin thinks out loud.
  useEffect(() => {
    if (status !== 'ready') return;
    const timer = window.setInterval(() => {
      if (document.hidden || line || previousPhaseRef.current !== 'idle') return;
      if (Date.now() - quietSinceRef.current < MUSE_AFTER_MS) return;
      say(pick('muse', Math.random(), lastLineRef.current));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [status, line, say]);

  const onChar = useCallback((char: string, index: number) => audioRef.current?.blip(char, index), []);

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
    } else if (event.code === 'KeyE' && !event.repeat) {
      sceneRef.current?.pat();
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
        aria-label="Tiny island with a penguin. Arrow keys or W A S D walk, Space or F fishes, E pats the penguin."
        aria-describedby="island-help"
        data-testid="island-world"
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={onBlur}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (pointerRef.current = null)}
      >
        <div className="island-speech" aria-live="polite">
          {status === 'ready' && line && (
            <SpeechBubble key={line.id} line={line} reducedMotion={reducedMotion} onChar={onChar} onDone={onLineDone} />
          )}
        </div>
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
        <div className="island-extras">
          <p className="island-basket" data-testid="island-basket">
            Basket: {snapshot.caught} {snapshot.caught === 1 ? 'catch' : 'catches'}
          </p>
          <button type="button" className="island-chip" disabled={status !== 'ready'} onClick={() => sceneRef.current?.pat()}>
            <span aria-hidden="true">♥</span> Pat
          </button>
          <button type="button" className="island-chip" aria-pressed={soundOn} data-testid="island-sound" onClick={toggleSound}>
            <span aria-hidden="true">♪</span> Sound {soundOn ? 'on' : 'off'}
          </button>
        </div>
        <ul className="island-catches" aria-label="Fish in your basket" data-testid="island-catches">
          {FISH_KINDS.map((kind) => {
            const count = snapshot.counts[kind] ?? 0;
            const label = count ? `${FISH[kind].label} × ${count}` : 'Not caught yet';
            return (
              <li key={kind} className="island-catch" data-kind={kind} data-count={count} title={label}>
                {/* Remounting on each new catch replays the little pop. */}
                <span key={count} className={count ? 'island-catch-icon is-caught' : 'island-catch-icon'}>
                  <FishIcon kind={kind} color={count ? FISH[kind].color : undefined} />
                </span>
                {count > 1 && (
                  <span className="island-catch-count" aria-hidden="true">
                    {count}
                  </span>
                )}
                <span className="sr-only">{label}</span>
              </li>
            );
          })}
        </ul>
        <p id="island-help" className="island-help">
          Tap the grass to wander and the pond to fish. Pat the penguin, shake a tree, read the sign, or poke the campfire. Arrow keys and Space work once
          the island has focus.
        </p>
      </div>
    </div>
  );
}
