'use client';

import { createContext, useEffect, type RefObject } from 'react';
import { localHour, mix, palette, rgb, type RGB } from '@/lib/ink';

// The stats prototype's dithered charts: a 3px grid of 2.4px squares, Gradient fill, and a blurred bloom canvas.
export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const PX = 3;

/**
 * Each chart's last hovered or tapped point, by chart name. It stays selected after the pointer leaves, and
 * StatsTabs keeps one map for the page visit, so switching tabs and back keeps it too.
 */
export const Picks = createContext(new Map<string, number>());
const SQ = 2.4;
export const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
/** The gradient fill: denser at the top of a shape, thinning toward the baseline. */
export const grad = (gx: number, gy: number, frac: number) => BAYER[(gy & 3) * 4 + (gx & 3)] < 0.95 - 0.8 * frac;

export interface Chart {
  el: HTMLDivElement;
  /** Main canvas first, then the bloom copy. */
  cs: CanvasRenderingContext2D[];
  tip: HTMLDivElement;
  w: number;
  h: number;
}

/** Colors from the time-of-day palette: the ink, the accent, and dimmed text. */
export interface Ink {
  c1: string;
  ca: string;
  dim: string;
}

export function px(C: Chart, x: number, y: number, s: number, col: string, mainOnly = false) {
  for (let k = 0; k < (mainOnly ? 1 : C.cs.length); k++) {
    C.cs[k].fillStyle = col;
    C.cs[k].fillRect(x, y, s, s);
  }
}
export const sq = (C: Chart, gx: number, gy: number, col: string, mainOnly = false) => px(C, gx * PX, gy * PX, SQ, col, mainOnly);

export function tip(C: Chart, text: string, left: number, top: number, shown: boolean) {
  C.tip.textContent = text;
  C.tip.style.left = `${left}px`;
  C.tip.style.top = `${top}px`;
  C.tip.style.opacity = shown ? '1' : '0';
}

/** Dithered bars, growing in left to right with entrance progress p, the selected one in the accent. Returns each bar's slot width. */
export function bars(C: Chart, vals: number[], sel: number, p: number, ink: Ink, label: (i: number) => string) {
  const n = vals.length, gap = Math.max(4, C.w * 0.014), bw = (C.w - gap * (n - 1)) / n;
  const top = 24, y1 = C.h - 2, max = Math.max(...vals) || 1, plotH = y1 - top;
  let selTop = y1;
  for (let i = 0; i < n; i++) {
    const e = ease(clamp((p - i * 0.035) / 0.6)), bh = (vals[i] / max) * plotH * e;
    const x0 = i * (bw + gap), x1 = x0 + bw, y0 = y1 - bh, col = i === sel ? ink.ca : ink.c1;
    const gx0 = Math.ceil(x0 / PX), gx1 = Math.floor(x1 / PX) - 1, gyB = Math.floor(y1 / PX) - 1, gy0 = Math.min(gyB, Math.round(y0 / PX));
    if (i === sel) selTop = y0;
    if (vals[i] === 0) {
      for (let gx = gx0; gx <= gx1; gx++) sq(C, gx, gyB, ink.dim, true);
      continue;
    }
    for (let gy = gy0; gy <= gyB; gy++) {
      const frac = (gy - gy0) / Math.max(1, gyB - gy0);
      for (let gx = gx0; gx <= gx1; gx++) if (gy === gy0 || grad(gx, gy, frac)) sq(C, gx, gy, col);
    }
  }
  tip(C, label(sel), clamp(sel * (bw + gap) + bw / 2, 60, C.w - 60), Math.max(0, selTop - 22), p > 0.6);
  return bw + gap;
}

export interface Scene {
  /** Draw every chart at entrance progress p (0 to 1). */
  draw(p: number, ink: Ink): void;
  /** A pointer at (x, y) over chart i. */
  scrub(i: number, x: number, y: number): void;
  /** The headline count-up, eased 0 to 1. */
  count?(e: number): void;
}

/**
 * Runs a set of dithered charts: sizing, the time-of-day colors, the entrance animation, and hover and tap
 * scrubbing. Under reduced motion everything appears at once. Draws only when something changed.
 */
export function useDither(refs: RefObject<HTMLDivElement | null>[], setup: (charts: Chart[]) => Scene, deps: unknown[]) {
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const charts: Chart[] = refs.map((r) => {
      const el = r.current!;
      return {
        el,
        cs: [...el.querySelectorAll('canvas')].reverse().map((c) => c.getContext('2d')!),
        tip: el.querySelector<HTMLDivElement>('.tip')!,
        w: 0,
        h: 0,
      };
    });
    const scene = setup(charts);
    const t0 = performance.now() / 1000;
    let p = reduce ? 1 : 0, raf = 0, dirty = true;
    let ink: Ink = { c1: '', ca: '', dim: '' };

    function colors() {
      const P = palette(localHour());
      const fg: RGB = hex(P.fg);
      ink = { c1: rgb(P.c1), ca: rgb(P.ac), dim: rgb(mix(fg, P.bg, 0.5)) };
      for (const C of charts) {
        C.tip.style.background = rgb(P.bg);
        C.tip.style.boxShadow = `0 0 0 1px ${rgb(mix(fg, P.bg, 0.75))}`;
      }
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
    function frame(ms: number) {
      raf = 0;
      if (p < 1) {
        p = clamp((ms / 1000 - t0) / 1.1);
        dirty = true;
        scene.count?.(ease(clamp(p / 0.9)));
        request();
      }
      if (dirty) {
        for (const C of charts) for (const c of C.cs) c.clearRect(0, 0, C.w, C.h);
        scene.draw(p, ink);
        dirty = false;
      }
    }
    const request = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const redraw = () => {
      dirty = true;
      request();
    };

    // Hover and taps move the selection and its tooltip, which stay where they are after the pointer leaves.
    const off = charts.map((C, i) => {
      const move = (e: PointerEvent) => {
        const r = C.el.getBoundingClientRect();
        scene.scrub(i, e.clientX - r.left, e.clientY - r.top);
        redraw();
      };
      C.el.addEventListener('pointermove', move);
      C.el.addEventListener('pointerdown', move);
      return () => {
        C.el.removeEventListener('pointermove', move);
        C.el.removeEventListener('pointerdown', move);
      };
    });
    const ro = new ResizeObserver(() => {
      charts.forEach(size);
      redraw();
    });
    charts.forEach((C) => ro.observe(C.el));
    const tick = setInterval(() => {
      colors();
      redraw();
    }, 30_000);
    colors();
    charts.forEach(size);
    if (!reduce) scene.count?.(0);
    request();
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(tick);
      ro.disconnect();
      off.forEach((f) => f());
    };
    // The caller's deps decide when the charts restart; refs and setup are read fresh each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
