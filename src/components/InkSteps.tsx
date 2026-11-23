'use client';

import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { BAYER16, clock, diffuse, everyMinute, inkColor, inkTable, level, localHour, LV, palette, RAMP, rgb } from '@/lib/ink';

const STEPS = ['ink', 'spread', 'dither', 'letters', 'color'];
const NOTES = [
  'each cell holds one number: how much ink is there. drawn as gray squares, with spreading off.',
  'every frame each cell averages with its neighbors and loses a little, so ink spreads and fades.',
  'the ink is nudged by the 4×4 thresholds below, then rounded down to one of 12 levels.',
  'each level becomes a character, from a space to @.',
  'two inks and an accent, from the palette for the time below.',
];

/**
 * The homepage's ink, one step of the pipeline at a time, on a small stage you can paint on. As `mini`, it's a small
 * homepage instead: the finished ink with the name, clock, and links over it, and the cursor drifting on its own.
 */
export default function InkSteps({ mini = false }: { mini?: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const api = useRef<{ redraw(): void; clear(): void; mask(): void }>(null);
  const [step, setStep] = useState(4);
  const [hour, setHour] = useState<number | null>(null);
  const [liveHour, setLiveHour] = useState(12);
  const [time, setTime] = useState('');
  const view = useRef({ step: 4, hour: 12 });

  useEffect(() => {
    const stage = stageRef.current!;
    const cv = canvasRef.current!;
    const ctx = cv.getContext('2d')!;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const font = getComputedStyle(document.body).fontFamily;
    const S = { tx: 0, ty: 0, mx: 0, my: 0, hover: false, busyUntil: 0 };
    let W = 0,
      H = 0,
      cw = 1,
      ch = 1,
      cols = 0,
      rows = 0,
      ar = 1,
      raf = 0,
      frameN = 0,
      visible = false;
    let D = new Float32Array(0),
      D2 = D,
      C = D,
      M = new Uint8Array(0);
    let tab: string[] = [],
      tabHour = -1;
    const now = () => performance.now() / 1000;

    function paint(px: number, py: number, amt: number) {
      const ht = Math.sin(performance.now() / 4000) * 0.5 + 0.5;
      for (let y = Math.max(1, (py | 0) - 4); y < Math.min(rows - 1, (py | 0) + 5); y++)
        for (let x = Math.max(1, (px | 0) - 7); x < Math.min(cols - 1, (px | 0) + 8); x++) {
          const dx = x - px,
            dy = (y - py) * ar,
            g = Math.exp(-(dx * dx + dy * dy) / 10),
            i = y * cols + x;
          D[i] = Math.min(1.4, D[i] + amt * g);
          C[i] += (ht - C[i]) * g * 0.3;
        }
    }
    function resize() {
      const r = cv.getBoundingClientRect();
      W = r.width;
      H = r.height;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const fs = innerWidth < 480 ? 11 : 12;
      ctx.font = `${fs}px ${font}`;
      ctx.textBaseline = 'top';
      cw = Math.max(1, Math.round(ctx.measureText('M').width));
      ch = Math.round(fs * 1.25);
      ar = ch / cw;
      cols = Math.ceil(W / cw);
      rows = Math.ceil(H / ch);
      D = new Float32Array(cols * rows);
      D2 = new Float32Array(cols * rows);
      C = new Float32Array(cols * rows);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) C[y * cols + x] = x / cols;
      mask();
      // A stroke to start from, so every step has something to show before anyone paints.
      for (let k = 0; k < 40; k++) paint(cols * (0.15 + (0.7 * k) / 40), rows * (0.5 + 0.25 * Math.sin(k / 6)), 0.5);
      S.mx = S.tx = cols * 0.3;
      S.my = S.ty = rows / 2;
      draw();
    }
    // Like the homepage, ink under the mini homepage's text thins to 12%.
    function mask() {
      M = new Uint8Array(cols * rows);
      const sr = cv.getBoundingClientRect();
      stage.querySelectorAll('.m').forEach((el) => {
        const r = el.getBoundingClientRect();
        const x0 = Math.max(0, Math.floor((r.left - sr.left) / cw) - 1);
        const x1 = Math.min(cols - 1, Math.ceil((r.right - sr.left) / cw));
        const y0 = Math.max(0, Math.floor((r.top - sr.top) / ch));
        const y1 = Math.min(rows - 1, Math.ceil((r.bottom - sr.top) / ch) - 1);
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) M[y * cols + x] = 1;
      });
    }
    function draw() {
      const { step, hour } = view.current;
      const fg = getComputedStyle(document.documentElement).getPropertyValue('--fg').trim() || '#888';
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      if (step === 4) {
        const P = palette(hour);
        if (hour !== tabHour) [tab, tabHour] = [inkTable(P), hour];
        ctx.fillStyle = rgb(P.bg);
        ctx.fillRect(0, 0, W, H);
      }
      ctx.fillStyle = fg;
      let last = fg;
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x,
            d = D[i],
            v = Math.min(1, d * 0.9 + 0.03);
          if (step <= 1) {
            if (v < 0.02) continue;
            ctx.globalAlpha = v;
            ctx.fillRect(x * cw + 1, y * ch + 1, cw - 2, ch - 2);
            continue;
          }
          const l = level(x, y, M[i] ? v * 0.12 : v);
          if (l <= 0) continue;
          if (step === 2) {
            ctx.globalAlpha = l / LV;
            ctx.fillRect(x * cw + 1, y * ch + 1, cw - 2, ch - 2);
            continue;
          }
          const c = step === 4 ? inkColor(tab, C[i], d - 0.6) : fg;
          if (c !== last) ctx.fillStyle = last = c;
          ctx.fillText(RAMP[l], x * cw, y * ch);
        }
      ctx.globalAlpha = 1;
    }
    function frame() {
      raf = 0;
      if (!visible || document.hidden || !cols) return;
      const t = now();
      // Reduced motion: the ink only moves while someone paints, then settles and stops.
      if (reduce && !S.hover && t > S.busyUntil) return draw();
      raf = requestAnimationFrame(frame);
      // Idle: nobody painting. Draw every other frame (30fps), like the homepage.
      if (!S.hover && t > S.busyUntil && ++frameN & 1) return;
      // The mini homepage drifts when nobody is painting, like the real one.
      const drift = mini && !S.hover && !reduce;
      if (drift) {
        S.tx = cols * (0.5 + 0.33 * Math.sin(t * 0.31));
        S.ty = rows * (0.5 + 0.3 * Math.sin(t * 0.47 + 1.3));
      }
      const px = S.mx,
        py = S.my;
      S.mx += (S.tx - S.mx) * 0.25;
      S.my += (S.ty - S.my) * 0.25;
      const sp = Math.hypot(S.mx - px, (S.my - py) * ar);
      if ((S.hover || drift) && sp > 0.02) paint(S.mx, S.my, Math.min(sp * 0.35, 0.6));
      if (view.current.step >= 1) {
        diffuse(D, D2, cols, rows);
        [D, D2] = [D2, D];
      }
      draw();
    }
    const run = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const busy = () => {
      S.busyUntil = now() + 1.5;
      run();
    };

    const point = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      return [(e.clientX - r.left) / cw, (e.clientY - r.top) / ch];
    };
    const onDown = (e: PointerEvent) => {
      stage.setPointerCapture(e.pointerId);
      [S.tx, S.ty] = point(e);
      [S.mx, S.my] = [S.tx, S.ty];
      S.hover = true;
      paint(S.mx, S.my, 0.9);
      busy();
    };
    const onMove = (e: PointerEvent) => {
      [S.tx, S.ty] = point(e);
      if (e.pointerType === 'mouse' || e.buttons) {
        S.hover = true;
        busy();
      }
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') S.hover = false;
      busy();
    };
    const onLeave = () => {
      S.hover = false;
      busy();
    };
    const onVisibility = () => !document.hidden && run();
    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointerleave', onLeave);
    stage.addEventListener('pointercancel', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    // Entries can arrive batched (still offscreen at load, then scrolled in): the last one is current.
    const io = new IntersectionObserver((es) => {
      visible = es[es.length - 1].isIntersecting;
      if (visible) busy();
    });
    io.observe(stage);
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    document.fonts.load(`12px ${font}`).then(resize, () => {});
    api.current = {
      redraw: () => (cols ? busy() : undefined),
      mask: () => (cols ? mask() : undefined),
      clear: () => {
        D.fill(0);
        busy();
      },
    };
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerup', onUp);
      stage.removeEventListener('pointerleave', onLeave);
      stage.removeEventListener('pointercancel', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [mini]);

  // Until someone moves the slider, the color step follows the visitor's clock, like the rest of the site.
  useEffect(() => {
    if (hour !== null) return;
    const live = () => setLiveHour(localHour());
    live();
    const t = setInterval(live, 60_000);
    return () => clearInterval(t);
  }, [hour]);

  const shown = hour ?? liveHour;
  useEffect(() => {
    view.current = { step, hour: shown };
    api.current?.redraw();
  }, [step, shown]);

  const label = clock(new Date(2026, 0, 1, Math.floor(shown), Math.round((shown % 1) * 60) % 60));

  useEffect(() => {
    if (!mini) return;
    const update = () => setTime(clock());
    update();
    return everyMinute(update);
  }, [mini]);
  // The clock's text changes, so its thinned cells do too.
  useEffect(() => api.current?.mask(), [time]);

  if (mini)
    return (
      <div className="mock steps-stage mini" ref={stageRef} data-noscr role="img" aria-label="a small copy of the homepage: drag to paint">
        <canvas ref={canvasRef} />
        <span className="m mini-name">vinay shah</span>
        <span className="m mini-clock dim">{time}</span>
        <span className="m mini-nav dim">about projects blog stats</span>
      </div>
    );

  return (
    <figure className="steps" data-noscr>
      <div className="seg" role="group" aria-label="step">
        {STEPS.map((s, i) => (
          <button key={s} type="button" aria-pressed={step === i} onClick={() => setStep(i)}>
            {i + 1} {s}
          </button>
        ))}
      </div>
      <figcaption className="dim">{NOTES[step]}</figcaption>
      <div className="steps-stage" ref={stageRef} role="img" aria-label="ink demo: drag to paint">
        <canvas ref={canvasRef} />
      </div>
      <div className="steps-foot">
        {step === 2 && (
          <div className="row">
            <span className="dim">4×4 thresholds</span>
            <div className="bayer">
              {BAYER16.map((v, i) => (
                <span key={i} style={{ '--v': v / 15 } as CSSProperties}>
                  {v}
                </span>
              ))}
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="row">
            <span className="dim">12 levels, lightest to darkest</span>
            <span className="ramp">{RAMP}</span>
          </div>
        )}
        {step === 4 && (
          <label className="row hour">
            <span className="dim">time {label}</span>
            <input
              type="range"
              min={0}
              max={23.75}
              step={0.25}
              value={shown}
              aria-label="time of day"
              onChange={(e) => setHour(+e.target.value)}
            />
          </label>
        )}
        <button type="button" className="clear" onClick={() => api.current?.clear()}>
          clear
        </button>
      </div>
    </figure>
  );
}
