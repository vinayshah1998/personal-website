'use client';

import { useEffect, useRef } from 'react';
import { localHour, mix, palette, rgb, type RGB } from '@/lib/ink';
import { MONTHS, type RunningSeries } from '@/lib/running';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
// Charts are drawn on a 3px grid of 2.4px squares, independent of the pixel ratio.
const PX = 3;
const SQ = 2.4;
const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
// The gradient fill: denser at the top of a shape, thinning toward the baseline.
const on = (gx: number, gy: number, frac: number) => BAYER[(gy & 3) * 4 + (gx & 3)] < 0.95 - 0.8 * frac;

interface Chart {
  el: HTMLDivElement;
  /** Main canvas first, then the blurred bloom copy. */
  cs: CanvasRenderingContext2D[];
  tip: HTMLDivElement;
  w: number;
  h: number;
}

interface Props {
  series: RunningSeries;
  /** Year-to-date miles for the headline. */
  total: number;
  summary: string;
}

/** The stats page's headline and dithered charts, ported from the stats prototype (Gradient fill, bloom on). */
export default function StatsCharts({ series, total, summary }: Props) {
  const bigRef = useRef<HTMLSpanElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const { year, weeks, weekStarts, thisYear, lastYear } = series;

  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const big = bigRef.current!;
    const mk = (el: HTMLDivElement): Chart => ({
      el,
      cs: [...el.querySelectorAll('canvas')].reverse().map((c) => c.getContext('2d')!),
      tip: el.querySelector<HTMLDivElement>('.tip')!,
      w: 0,
      h: 0,
    });
    const CB = mk(barsRef.current!);
    const CA = mk(areaRef.current!);
    const S = { p: reduce ? 1 : 0, t0: performance.now() / 1000, bar: 11, mon: thisYear.length - 1, dirty: true };
    let c1 = '', ca = '', fgDimStr = '', raf = 0;

    function build() {
      const P = palette(localHour());
      const bg = P.bg;
      const fg: RGB = hex(P.fg);
      c1 = rgb(P.c1);
      ca = rgb(P.ac);
      fgDimStr = rgb(mix(fg, bg, 0.5));
      for (const tip of [CB.tip, CA.tip]) {
        tip.style.background = rgb(bg);
        tip.style.boxShadow = `0 0 0 1px ${rgb(mix(fg, bg, 0.75))}`;
      }
      S.dirty = true;
    }
    function size(C: Chart) {
      const r = C.el.getBoundingClientRect();
      C.w = r.width;
      C.h = r.height;
      const d = Math.min(devicePixelRatio || 1, 2);
      for (const c of C.cs) {
        c.canvas.width = Math.round(C.w * d);
        c.canvas.height = Math.round(C.h * d);
        c.setTransform(d, 0, 0, d, 0, 0);
      }
    }
    function sq(C: Chart, gx: number, gy: number, col: string, mainOnly = false) {
      for (let k = 0; k < (mainOnly ? 1 : C.cs.length); k++) {
        C.cs[k].fillStyle = col;
        C.cs[k].fillRect(gx * PX, gy * PX, SQ, SQ);
      }
    }

    const barGeom = () => {
      const n = weeks.length, gap = Math.max(4, CB.w * 0.014);
      return { n, gap, bw: (CB.w - gap * (n - 1)) / n, top: 24, y1: CB.h - 2 };
    };
    function drawBars() {
      const C = CB;
      for (const c of C.cs) c.clearRect(0, 0, C.w, C.h);
      const g = barGeom(), max = Math.max(...weeks) || 1, plotH = g.y1 - g.top;
      let selTop = g.y1;
      for (let i = 0; i < g.n; i++) {
        const e = ease(clamp((S.p - i * 0.035) / 0.6)), bh = (weeks[i] / max) * plotH * e;
        const x0 = i * (g.bw + g.gap), x1 = x0 + g.bw, y0 = g.y1 - bh;
        const col = i === S.bar ? ca : c1;
        const gx0 = Math.ceil(x0 / PX), gx1 = Math.floor(x1 / PX) - 1, gyB = Math.floor(g.y1 / PX) - 1, gy0 = Math.min(gyB, Math.round(y0 / PX));
        if (i === S.bar) selTop = y0;
        if (weeks[i] === 0) {
          for (let gx = gx0; gx <= gx1; gx++) sq(C, gx, gyB, fgDimStr, true);
          continue;
        }
        for (let gy = gy0; gy <= gyB; gy++) {
          const frac = (gy - gy0) / Math.max(1, gyB - gy0);
          for (let gx = gx0; gx <= gx1; gx++) if (gy === gy0 || on(gx, gy, frac)) sq(C, gx, gy, col);
        }
      }
      const x = S.bar * (g.bw + g.gap) + g.bw / 2;
      C.tip.textContent = `${weekStarts[S.bar]}  ${weeks[S.bar].toFixed(1)} mi`;
      C.tip.style.left = `${clamp(x, 48, C.w - 48)}px`;
      C.tip.style.top = `${Math.max(0, selTop - 22)}px`;
      C.tip.style.opacity = S.p > 0.6 ? '1' : '0';
    }

    function drawArea() {
      const C = CA;
      for (const c of C.cs) c.clearRect(0, 0, C.w, C.h);
      const top = 24, y1 = C.h - 2, plotH = y1 - top;
      const max = Math.max(lastYear[11], thisYear[thisYear.length - 1]) * 1.05 || 1;
      const yOf = (v: number) => y1 - (v / max) * plotH, X = (i: number) => (i / 11) * C.w;
      const at = (a: number[], f: number) => {
        if (f > a.length - 1 + 1e-6) return null;
        const i = Math.floor(f), t = f - i;
        return i >= a.length - 1 ? a[a.length - 1] : a[i] + (a[i + 1] - a[i]) * t;
      };
      const reveal = ease(clamp(S.p / 0.9)) * 11, gyB = Math.floor(y1 / PX) - 1, gxMax = Math.floor(C.w / PX);
      let pThis: number | null = null, pLast: number | null = null;
      for (let gx = 0; gx < gxMax; gx++) {
        const f = ((gx * PX + PX / 2) / C.w) * 11;
        if (f > reveal) break;
        const vThis = at(thisYear, f), vLast = at(lastYear, f);
        // Last year: a dashed line, three columns on and three off.
        if (vLast != null) {
          const gy = Math.round(yOf(vLast) / PX), a = pLast ?? gy;
          if ((Math.floor(gx / 3) & 1) === 0) for (let y = Math.min(a, gy); y <= Math.max(a, gy); y++) sq(C, gx, y, fgDimStr, true);
          pLast = gy;
        }
        // This year: the dithered area, then a solid accent line on top.
        if (vThis != null) {
          const gt = Math.round(yOf(vThis) / PX);
          for (let gy = gt + 1; gy <= gyB; gy++) if (on(gx, gy, (gy - gt) / Math.max(1, gyB - gt))) sq(C, gx, gy, c1);
          const a = pThis ?? gt;
          for (let y = Math.min(a, gt); y <= Math.max(a, gt); y++) sq(C, gx, y, ca);
          pThis = gt;
        }
      }
      const m = S.mon, cx = Math.round(X(m) / PX);
      if (S.p > 0.9) for (let gy = Math.floor(top / PX); gy < gyB; gy += 2) sq(C, Math.min(cx, gxMax - 1), gy, fgDimStr, true);
      const has = m < thisYear.length, ty = yOf(has ? thisYear[m] : lastYear[m]);
      C.tip.textContent = `${MONTHS[m]}  ${has ? `${thisYear[m].toFixed(0)} mi` : 'not yet'}, ${year - 1}: ${lastYear[m].toFixed(0)}`;
      C.tip.style.left = `${clamp(X(m), 80, C.w - 80)}px`;
      C.tip.style.top = `${Math.max(0, ty - 24)}px`;
      C.tip.style.opacity = S.p > 0.9 ? '1' : '0';
    }

    function frame(ms: number) {
      raf = 0;
      if (S.p < 1) {
        S.p = clamp((ms / 1000 - S.t0) / 1.1);
        S.dirty = true;
        big.textContent = `${(total * ease(clamp(S.p / 0.9))).toFixed(1)} mi`;
        request();
      }
      if (S.dirty) {
        drawBars();
        drawArea();
        S.dirty = false;
      }
    }
    const request = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const redraw = () => {
      S.dirty = true;
      request();
    };

    // Hover and taps move the tooltip; a mouse leaving puts it back on the latest week or month, a lifted finger leaves it.
    const scrub = (C: Chart) => (e: PointerEvent) => {
      const x = e.clientX - C.el.getBoundingClientRect().left;
      if (C === CB) {
        const g = barGeom();
        S.bar = clamp(Math.floor(x / (g.bw + g.gap)), 0, g.n - 1);
      } else S.mon = clamp(Math.round((x / C.w) * 11), 0, 11);
      redraw();
    };
    const leave = (C: Chart) => (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      if (C === CB) S.bar = 11;
      else S.mon = thisYear.length - 1;
      redraw();
    };
    const off: (() => void)[] = [];
    for (const C of [CB, CA]) {
      const s = scrub(C), l = leave(C);
      C.el.addEventListener('pointermove', s);
      C.el.addEventListener('pointerdown', s);
      C.el.addEventListener('pointerleave', l);
      off.push(() => {
        C.el.removeEventListener('pointermove', s);
        C.el.removeEventListener('pointerdown', s);
        C.el.removeEventListener('pointerleave', l);
      });
    }
    const ro = new ResizeObserver(() => {
      size(CB);
      size(CA);
      redraw();
    });
    ro.observe(CB.el);
    ro.observe(CA.el);
    const tick = setInterval(() => {
      build();
      request();
    }, 30_000);
    build();
    size(CB);
    size(CA);
    if (!reduce) big.textContent = '0.0 mi';
    request();
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(tick);
      ro.disconnect();
      off.forEach((f) => f());
    };
  }, [year, weeks, weekStarts, thisYear, lastYear, total]);

  const fmt = (v: number[]) => v.map((m) => m.toFixed(1)).join(', ');
  return (
    <>
      <div className="row">
        <span className="dim">{year} so far</span>
        <span ref={bigRef} className="big" data-noscr>
          {total.toFixed(1)} mi
        </span>
        <span>{summary}</span>
      </div>
      <div className="row">
        <div className="lbl">
          <span className="dim">last 12 weeks</span>
        </div>
        <div ref={barsRef} className="chart" role="img" aria-label={`Weekly miles, oldest first: ${fmt(weeks)}`}>
          <canvas className="glow" aria-hidden="true" />
          <canvas aria-hidden="true" />
          <div className="tip" data-noscr aria-hidden="true" />
        </div>
        <div className="ax">
          <span>week of {weekStarts[0]}</span>
          <span>this week</span>
        </div>
      </div>
      <div className="row">
        <div className="lbl">
          <span className="dim">year to date</span>
          <span className="dim">
            &mdash; {year}&nbsp;&nbsp;- - {year - 1}
          </span>
        </div>
        <div
          ref={areaRef}
          className="chart area"
          role="img"
          aria-label={`Cumulative miles by month in ${year}: ${fmt(thisYear)}. In ${year - 1}: ${fmt(lastYear)}`}
        >
          <canvas className="glow" aria-hidden="true" />
          <canvas aria-hidden="true" />
          <div className="tip" data-noscr aria-hidden="true" />
        </div>
        <div className="ax">
          <span>jan</span>
          <span>dec</span>
        </div>
      </div>
    </>
  );
}
