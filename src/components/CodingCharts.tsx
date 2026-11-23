'use client';

import { useRef } from 'react';
import { weekdayOf, type CodingSeries } from '@/lib/github';
import { MONTHS } from '@/lib/running';
import { bars, BAYER, clamp, ease, px, tip, useDither } from './useDither';

const DOW = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const fmtN = (n: number) => n.toLocaleString('en-US');
const dayLabel = (date: string, count: number) =>
  `${DOW[weekdayOf(date)]} ${MONTHS[Number(date.slice(5, 7)) - 1]} ${Number(date.slice(8, 10))}, ${count} contribution${count === 1 ? '' : 's'}`;

/** The coding tab: contributions in the last year, a dithered daily heatmap, weekday averages, and streaks. */
export default function CodingCharts({ series }: { series: CodingSeries }) {
  const bigRef = useRef<HTMLSpanElement>(null);
  const heatRef = useRef<HTMLDivElement>(null);
  const weekRef = useRef<HTMLDivElement>(null);
  const { total, grid, weekday, current, longest } = series;
  const weeks = Math.ceil(grid.length / 7);
  const today = grid.length - 1;

  useDither(
    [heatRef, weekRef],
    ([HM, WD]) => {
      let day = today, wd = today % 7, slot = 1, colW = 1, rowH = 1;
      const top = 22;
      return {
        draw(p, ink) {
          // One 4×4 Bayer block per day, filled to GitHub's 0 to 4 level; empty days are a single dim dot.
          colW = HM.w / weeks;
          const s = clamp(Math.floor((colW - 1) / 4), 1, 3), blk = s * 4;
          rowH = Math.min(blk + 2, (HM.h - top) / 7);
          const reveal = ease(clamp(p / 0.9)) * weeks;
          for (let i = 0; i < grid.length; i++) {
            const w = Math.floor(i / 7);
            if (w > reveal) break;
            const L = grid[i].level, x0 = Math.round(w * colW), y0 = Math.round(top + (i % 7) * rowH), col = i === day ? ink.ca : ink.c1;
            if (L === 0) {
              px(HM, x0 + blk / 2 - s / 2, y0 + blk / 2 - s / 2, s, ink.dim, true);
              continue;
            }
            for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) if (BAYER[sy * 4 + sx] < L / 4) px(HM, x0 + sx * s, y0 + sy * s, Math.max(1, s - 0.4), col);
          }
          tip(HM, dayLabel(grid[day].date, grid[day].count), clamp(Math.floor(day / 7) * colW + blk / 2, 90, HM.w - 90), 0, p > 0.9);
          slot = bars(WD, weekday, wd, p, ink, (i) => `${DOW[i]}  ${weekday[i].toFixed(1)} a day`);
        },
        scrub(i, x, y) {
          if (i === 0) {
            const w = clamp(Math.floor(x / colW), 0, weeks - 1), d = clamp(Math.floor((y - top) / rowH), 0, 6);
            day = Math.min(today, w * 7 + d);
          } else wd = clamp(Math.floor(x / slot), 0, 6);
        },
        leave(i) {
          if (i === 0) day = today;
          else wd = today % 7;
        },
        count(e) {
          bigRef.current!.textContent = `${fmtN(Math.round(total * e))} contributions`;
        },
      };
    },
    [total, grid, weekday],
  );

  const first = grid[0].date;
  return (
    <>
      <div className="row">
        <span className="dim">last 12 months</span>
        <span ref={bigRef} className="big" data-noscr>
          {fmtN(total)} contributions
        </span>
      </div>
      <div className="row">
        <div
          ref={heatRef}
          className="chart heat"
          role="img"
          aria-label={`Contributions each day from ${first} to ${grid[today].date}, ${fmtN(total)} in the last year`}
        >
          <canvas className="glow" aria-hidden="true" />
          <canvas aria-hidden="true" />
          <div className="tip" data-noscr aria-hidden="true" />
        </div>
        <div className="ax">
          <span>
            {MONTHS[Number(first.slice(5, 7)) - 1]} {first.slice(0, 4)}
          </span>
          <span>today</span>
        </div>
      </div>
      <div className="row">
        <div className="lbl">
          <span className="dim">by weekday, average</span>
        </div>
        <div
          ref={weekRef}
          className="chart weekday"
          role="img"
          aria-label={`Average contributions a day, monday first: ${weekday.map((v) => v.toFixed(1)).join(', ')}`}
        >
          <canvas className="glow" aria-hidden="true" />
          <canvas aria-hidden="true" />
          <div className="tip" data-noscr aria-hidden="true" />
        </div>
        <div className="ax">
          <span>mon</span>
          <span>sun</span>
        </div>
      </div>
      <div className="row">
        <span className="dim">streaks</span>
        <span>
          current {current} day{current === 1 ? '' : 's'}, longest {longest} day{longest === 1 ? '' : 's'}
        </span>
      </div>
    </>
  );
}
