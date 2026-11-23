'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { clock, everyMinute, localHour, mix, palette, rgb } from '@/lib/ink';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const RAMP = ' .,:;-=+*#%@';
const LV = RAMP.length - 1;
const GL = '!<>-_\\/[]{}=+*^?#%@';
const PAGES = ['about', 'projects', 'blog', 'stats'];
const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);

interface Engine {
  setPage(home: boolean, first: boolean): void;
  mask(): void;
}

/**
 * The ink: one canvas for the whole site, mounted in the root layout so it carries across client-side navigation.
 * On the homepage it fills the first screen; on every other page it folds into a band at the top (Horizon).
 */
export default function Ink() {
  const pathname = usePathname();
  const home = pathname === '/';
  const section = PAGES.find((p) => pathname.startsWith(`/${p}`)) ?? '';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Engine>(null);
  const first = useRef(true);
  const lastInput = useRef<'keyboard' | 'pointer'>('pointer');
  const [time, setTime] = useState('');

  useEffect(() => {
    const cv = canvasRef.current!;
    const ctx = cv.getContext('2d')!;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const font = getComputedStyle(document.body).fontFamily;
    const S = { home: true, hour: localHour(), tx: 0, ty: 0, mx: 0, my: 0, speed: 0, hover: false, hold: 0, wasHover: false, band: 0, busyUntil: 0, last: 0 };
    let scr: { n: Text; f: string; start: number; dur: number }[] = [];
    let W = 0, H = 0, cw = 1, ch = 1, cols = 0, rows = 0, ar = 1, headerBottom = 46;
    let D = new Float32Array(0), D2 = D, C = D, M = new Uint8Array(0);
    let TAB: string[] = [], bgStr = '', lastFill = '', frameN = 0, raf = 0, visible = true;
    const now = () => performance.now() / 1000;

    function build() {
      const P = palette(S.hour);
      TAB = [];
      for (let i = 0; i <= 32; i++) {
        const b = mix(P.c1, P.c2, i / 32);
        for (let j = 0; j <= 8; j++) TAB.push(rgb(mix(b, P.ac, (j / 8) * 0.9)));
      }
      bgStr = rgb(P.bg);
      const root = document.documentElement.style;
      root.setProperty('--bg', bgStr);
      root.setProperty('--fg', P.fg);
    }
    function put(x: number, y: number, v: number, t: number, m: number) {
      let i = (v * LV + BAYER[(y & 3) * 4 + (x & 3)]) | 0;
      if (i <= 0) return;
      if (i > LV) i = LV;
      const c = TAB[((clamp(t) * 32 + 0.5) | 0) * 9 + ((clamp(m) * 8 + 0.5) | 0)];
      if (c !== lastFill) {
        ctx.fillStyle = c;
        lastFill = c;
      }
      ctx.fillText(RAMP[i], x * cw, y * ch);
    }
    // The band ends 50px below the header (96px at the default size), so it grows with larger text and safe areas.
    const bandTarget = () => (S.home ? H + 60 : headerBottom + 50);
    function resize() {
      const r = cv.getBoundingClientRect();
      W = r.width;
      H = r.height;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const fs = W < 480 ? 11 : 12;
      ctx.font = `${fs}px ${font}`;
      ctx.textBaseline = 'top';
      // Whole-pixel cells keep the pixel font on its grid.
      cw = Math.max(1, Math.round(ctx.measureText('M').width));
      ch = Math.round(fs * 1.25);
      ar = ch / cw;
      cols = Math.ceil(W / cw);
      rows = Math.ceil(H / ch);
      D = new Float32Array(cols * rows);
      D2 = new Float32Array(cols * rows);
      C = new Float32Array(cols * rows);
      M = new Uint8Array(cols * rows);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) C[y * cols + x] = x / cols;
      if (!S.mx) {
        S.mx = S.tx = cols / 2;
        S.my = S.ty = rows / 2;
      }
      buildMask();
      S.band = bandTarget();
      lastFill = '';
    }
    // Ink under the overlaid text thins to 12%, leaving faint dots: cells behind each .m element.
    function buildMask() {
      M.fill(0);
      const sr = cv.getBoundingClientRect();
      const hd = document.querySelector('.hd');
      if (hd) headerBottom = hd.getBoundingClientRect().bottom - sr.top;
      // Measure the text itself, not the 44px link boxes around it, with a one-cell margin left and right.
      const range = document.createRange();
      document.querySelectorAll('.m').forEach((el) => {
        const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let n: Node | null;
        while ((n = w.nextNode())) {
          range.selectNodeContents(n);
          for (const r of range.getClientRects()) {
            const x0 = Math.max(0, Math.floor((r.left - sr.left) / cw) - 1);
            const x1 = Math.min(cols - 1, Math.ceil((r.right - sr.left) / cw));
            const y0 = Math.max(0, Math.floor((r.top - sr.top) / ch));
            const y1 = Math.min(rows - 1, Math.ceil((r.bottom - sr.top) / ch) - 1);
            for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) M[y * cols + x] = 1;
          }
        }
      });
    }

    function startScramble() {
      scr.forEach((s) => (s.n.nodeValue = s.f));
      scr = [];
      if (reduce) return;
      const t = now();
      let k = 0;
      document.querySelectorAll('[data-scr]').forEach((root) => {
        const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let n: Node | null;
        while ((n = w.nextNode())) {
          const f = n.nodeValue ?? '';
          if (!f.trim() || n.parentElement?.closest('[data-noscr]')) continue;
          // Only what's on screen decodes; a long post would otherwise take half a minute to reach its end.
          if (n.parentElement!.getBoundingClientRect().top > innerHeight) break;
          scr.push({ n: n as Text, f, start: t + k * 0.035, dur: Math.min(0.7, 0.25 + f.length * 0.004) });
          n.nodeValue = f.replace(/\S/g, ' ');
          k++;
        }
      });
    }
    function tickScramble(t: number) {
      if (!scr.length) return;
      scr = scr.filter((s) => {
        const p = clamp((t - s.start) / s.dur);
        if (p >= 1) {
          s.n.nodeValue = s.f;
          return false;
        }
        const k = Math.floor(s.f.length * p);
        s.n.nodeValue = s.f.slice(0, k) + s.f.slice(k).replace(/\S/g, (_, i) => (i < 8 ? GL[(Math.random() * GL.length) | 0] : ' '));
        return true;
      });
      // Blanked text collapses, so measure the no-ink zones again once it has decoded.
      if (!scr.length) buildMask();
    }

    function stamp(x: number, y: number) {
      const ht = Math.sin(performance.now() / 4000) * 0.5 + 0.5;
      for (let yy = Math.max(1, (y | 0) - 4); yy < Math.min(rows - 1, (y | 0) + 5); yy++)
        for (let xx = Math.max(1, (x | 0) - 8); xx < Math.min(cols - 1, (x | 0) + 9); xx++) {
          const dx = xx - x, dy = (yy - y) * ar, g = Math.exp(-(dx * dx + dy * dy) / 18), i = yy * cols + xx;
          D[i] = Math.min(1.4, D[i] + 1.1 * g);
          C[i] += (ht - C[i]) * g * 0.5;
        }
    }

    function frame(ms: number) {
      raf = 0;
      tickScramble(now());
      const active = visible && !document.hidden;
      if (active || scr.length) raf = requestAnimationFrame(frame);
      if (!active || !cols) return;
      const t = ms / 1000;
      frameN++;
      // Idle: nobody touching, no page change settling. Draw every other frame (30fps).
      const idle = !S.hover && t > S.busyUntil && Math.abs(S.band - bandTarget()) < 1;
      if (idle && frameN & 1) return;
      // After a pause (hidden tab, scrolled away) the drift path has moved on: jump instead of streaking.
      let jump = t - S.last > 0.25;
      S.last = t;
      if (!S.hover && !(S.hold > t) && !reduce) {
        const nx = cols * (0.5 + 0.33 * Math.sin(t * 0.31));
        const ny = (S.home ? rows : bandTarget() / ch) * (0.5 + 0.3 * Math.sin(t * 0.47 + 1.3));
        if (S.wasHover) jump = true;
        if (jump) {
          S.mx = nx;
          S.my = ny;
        }
        S.tx = nx;
        S.ty = ny;
        S.wasHover = false;
      } else if (S.hover) S.wasHover = true;
      const px = S.mx, py = S.my;
      S.mx += (S.tx - S.mx) * 0.18;
      S.my += (S.ty - S.my) * 0.18;
      S.speed = jump ? 0 : Math.hypot(S.mx - px, (S.my - py) * ar);
      S.band += (bandTarget() - S.band) * (reduce ? 1 : 0.1);
      if (S.speed > 0.02 && S.my * ch < S.band) {
        const amt = Math.min(S.speed * 0.35, 0.6), ht = Math.sin(t * 0.25) * 0.5 + 0.5;
        for (let y = Math.max(1, (S.my | 0) - 4); y < Math.min(rows - 1, (S.my | 0) + 5); y++)
          for (let x = Math.max(1, (S.mx | 0) - 7); x < Math.min(cols - 1, (S.mx | 0) + 8); x++) {
            const dx = x - S.mx, dy = (y - S.my) * ar, g = Math.exp(-(dx * dx + dy * dy) / 10), i = y * cols + x;
            D[i] = Math.min(1.4, D[i] + amt * g);
            C[i] += (ht - C[i]) * g * 0.3;
          }
      }
      for (let y = 1; y < rows - 1; y++)
        for (let x = 1; x < cols - 1; x++) {
          const i = y * cols + x;
          D2[i] = (D[i] * 4 + D[i - 1] + D[i + 1] + D[i - cols] + D[i + cols]) * 0.125 * 0.996;
        }
      const T = D;
      D = D2;
      D2 = T;
      ctx.fillStyle = bgStr;
      ctx.fillRect(0, 0, W, H);
      lastFill = '';
      const bandRows = S.band / ch;
      for (let y = 0; y < rows; y++) {
        const e = clamp((bandRows - y) / 3);
        if (e <= 0) break;
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x, d = D[i];
          let v = (d * 0.9 + 0.05 + 0.04 * Math.sin(x * 0.13 + t * 0.5) * Math.sin(y * 0.3 - t * 0.3)) * e;
          if (M[i]) v *= 0.12;
          put(x, y, v, C[i], clamp(d - 0.6));
        }
      }
    }
    const run = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const point = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      return [(e.clientX - r.left) / cw, (e.clientY - r.top) / ch];
    };
    const onMove = (e: PointerEvent) => {
      [S.tx, S.ty] = point(e);
      S.hover = true;
    };
    // A tap stamps ink where it lands; the cursor jumps there so nothing streaks.
    const onDown = (e: PointerEvent) => {
      if ((e.target as Element).closest?.('a, button')) return;
      const [x, y] = point(e);
      S.tx = S.mx = x;
      S.ty = S.my = y;
      S.hover = true;
      if (y * ch < S.band) stamp(x, y);
    };
    // After lifting, the cursor holds for 2s before drifting again.
    const release = () => {
      S.hover = false;
      S.hold = now() + 2;
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') release();
    };
    const onVisibility = () => !document.hidden && run();
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', release);
    document.documentElement.addEventListener('pointerleave', release);
    document.addEventListener('visibilitychange', onVisibility);
    const io = new IntersectionObserver((es) => {
      visible = es[0].isIntersecting;
      if (visible) run();
    });
    io.observe(cv);
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    const tick = setInterval(() => {
      S.hour = localHour();
      build();
    }, 30_000);
    build();
    resize();
    document.fonts.load(`12px ${font}`).then(resize, () => {});

    engine.current = {
      setPage(isHome, isFirst) {
        S.home = isHome;
        buildMask();
        if (isFirst) S.band = bandTarget();
        S.busyUntil = now() + 1.5;
        startScramble();
        document.documentElement.classList.remove('scr-wait');
        requestAnimationFrame(buildMask);
        run();
      },
      mask: buildMask,
    };
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(tick);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', release);
      document.documentElement.removeEventListener('pointerleave', release);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    const keyboard = () => (lastInput.current = 'keyboard');
    const pointer = () => (lastInput.current = 'pointer');
    window.addEventListener('keydown', keyboard, true);
    window.addEventListener('pointerdown', pointer, true);
    return () => {
      window.removeEventListener('keydown', keyboard, true);
      window.removeEventListener('pointerdown', pointer, true);
    };
  }, []);

  useEffect(() => {
    const isFirst = first.current;
    first.current = false;
    engine.current?.setPage(home, isFirst);
    // Move focus to the new page's link only after keyboard navigation. Safari shows a focus ring for programmatic
    // focus, so after a tap or click it would draw a box around the link.
    if (!isFirst && lastInput.current === 'keyboard') {
      const target = document.querySelector<HTMLElement>('.site [aria-current="page"]') ?? document.querySelector<HTMLElement>('.site a');
      target?.focus({ preventScroll: true });
    }
  }, [pathname, home]);

  // The clock flips on the minute, and right away when the tab comes back or the window regains focus, since
  // timers stall in background tabs and during sleep.
  useEffect(() => {
    const update = () => setTime(clock());
    const onVisibility = () => !document.hidden && update();
    update();
    const stop = everyMinute(update);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', update);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', update);
    };
  }, []);

  // The clock's text changes, so its no-ink zone does too.
  useEffect(() => engine.current?.mask(), [time]);

  const links = PAGES.map((p) => (
    <Link key={p} href={`/${p}`} className={p === section ? 'lk' : 'lk dim'} aria-current={p === section ? 'page' : undefined}>
      {p}
    </Link>
  ));

  return (
    <>
      <canvas ref={canvasRef} className="ink" aria-hidden="true" />
      {home ? (
        <div className="site home" data-scr>
          <h1 className="m home-name">vinay shah</h1>
          <div className="m dim home-clock" data-noscr>
            {time}
          </div>
          <nav className="homenav m" aria-label="Site">
            {links}
          </nav>
        </div>
      ) : (
        <header className="site hd" data-scr>
          <Link href="/" className="lk m">
            vinay shah
          </Link>
          <nav className="m" aria-label="Site">
            {links}
          </nav>
        </header>
      )}
    </>
  );
}
