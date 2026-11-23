'use client';

import { useContext, useRef } from 'react';
import { MONTHS, type RunningSeries } from '@/lib/running';
import { bars, clamp, ease, grad, Picks, PX, sq, tip, useDither } from './useDither';

interface Props {
  series: RunningSeries;
  /** Year-to-date miles for the headline. */
  total: number;
  summary: string;
}

/** The running tab's headline and charts: weekly bars, and the year to date against last year. */
export default function StatsCharts({ series, total, summary }: Props) {
  const bigRef = useRef<HTMLSpanElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const { year, weeks, weekStarts, thisYear, lastYear } = series;
  const picks = useContext(Picks);

  useDither(
    [barsRef, areaRef],
    ([CB, CA]) => {
      // Until something is hovered or tapped: this week, and this month.
      let bar = picks.get('weeks') ?? 11, mon = picks.get('ytd') ?? thisYear.length - 1, slot = 1;
      return {
        draw(p, ink) {
          slot = bars(CB, weeks, bar, p, ink, (i) => `${weekStarts[i]}  ${weeks[i].toFixed(1)} mi`);
          const C = CA, top = 24, y1 = C.h - 2, plotH = y1 - top;
          const max = Math.max(lastYear[11], thisYear[thisYear.length - 1]) * 1.05 || 1;
          const yOf = (v: number) => y1 - (v / max) * plotH, X = (i: number) => (i / 11) * C.w;
          const at = (a: number[], f: number) => {
            if (f > a.length - 1 + 1e-6) return null;
            const i = Math.floor(f), t = f - i;
            return i >= a.length - 1 ? a[a.length - 1] : a[i] + (a[i + 1] - a[i]) * t;
          };
          const reveal = ease(clamp(p / 0.9)) * 11, gyB = Math.floor(y1 / PX) - 1, gxMax = Math.floor(C.w / PX);
          let pThis: number | null = null, pLast: number | null = null;
          for (let gx = 0; gx < gxMax; gx++) {
            const f = ((gx * PX + PX / 2) / C.w) * 11;
            if (f > reveal) break;
            const vThis = at(thisYear, f), vLast = at(lastYear, f);
            // Last year: a dashed line, three columns on and three off.
            if (vLast != null) {
              const gy = Math.round(yOf(vLast) / PX), a = pLast ?? gy;
              if ((Math.floor(gx / 3) & 1) === 0) for (let y = Math.min(a, gy); y <= Math.max(a, gy); y++) sq(C, gx, y, ink.dim, true);
              pLast = gy;
            }
            // This year: the dithered area, then a solid accent line on top.
            if (vThis != null) {
              const gt = Math.round(yOf(vThis) / PX);
              for (let gy = gt + 1; gy <= gyB; gy++) if (grad(gx, gy, (gy - gt) / Math.max(1, gyB - gt))) sq(C, gx, gy, ink.c1);
              const a = pThis ?? gt;
              for (let y = Math.min(a, gt); y <= Math.max(a, gt); y++) sq(C, gx, y, ink.ca);
              pThis = gt;
            }
          }
          const cx = Math.round(X(mon) / PX);
          if (p > 0.9) for (let gy = Math.floor(top / PX); gy < gyB; gy += 2) sq(C, Math.min(cx, gxMax - 1), gy, ink.dim, true);
          const has = mon < thisYear.length;
          tip(
            C,
            `${MONTHS[mon]}  ${has ? `${thisYear[mon].toFixed(0)} mi` : 'not yet'}, ${year - 1}: ${lastYear[mon].toFixed(0)}`,
            clamp(X(mon), 80, C.w - 80),
            Math.max(0, yOf(has ? thisYear[mon] : lastYear[mon]) - 24),
            p > 0.9,
          );
        },
        scrub(i, x) {
          if (i === 0) picks.set('weeks', (bar = clamp(Math.floor(x / slot), 0, weeks.length - 1)));
          else picks.set('ytd', (mon = clamp(Math.round((x / CA.w) * 11), 0, 11)));
        },
        count(e) {
          bigRef.current!.textContent = `${(total * e).toFixed(1)} mi`;
        },
      };
    },
    [year, weeks, weekStarts, thisYear, lastYear, total],
  );

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
