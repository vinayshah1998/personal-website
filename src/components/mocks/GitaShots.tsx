'use client';

import { useEffect, useRef } from 'react';
import { BAYER, localHour, palette } from '@/lib/ink';

/**
 * Real Gita Swipe screens (the app's verse feed, captured from its web build), redrawn in the site's palette with
 * ordered dithering. Each PNG stores how far a pixel is from the app's paper in red and its copper accent in green.
 */
const SHOTS = [
  ['2.47', '/projects/gita-247.png'],
  ['2.20', '/projects/gita-220.png'],
  ['6.5', '/projects/gita-65.png'],
];

function Shot({ src, verse }: { src: string; verse: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const img = new Image();
    img.onload = () => {
      const r = cv.getBoundingClientRect();
      const d = Math.min(devicePixelRatio || 1, 2);
      const w = Math.round(r.width * d),
        h = Math.round(r.height * d);
      cv.width = w;
      cv.height = h;
      const ctx = cv.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      const px = ctx.getImageData(0, 0, w, h);
      const P = palette(localHour());
      const ink = getComputedStyle(document.documentElement).getPropertyValue('--fg').trim();
      const [ir, ig, ib] = [1, 3, 5].map((i) => parseInt(ink.slice(i, i + 2), 16));
      const light = P.fg !== '#f1efe9';
      const [ar, ag, ab] = (light ? P.c1 : P.ac).map((v) => v | 0);
      const a = px.data;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const on = a[i] / 255 > BAYER[(y & 3) * 4 + (x & 3)];
          const warm = a[i + 1] > 128;
          a[i] = warm ? ar : ir;
          a[i + 1] = warm ? ag : ig;
          a[i + 2] = warm ? ab : ib;
          a[i + 3] = on ? 255 : 0;
        }
      ctx.putImageData(px, 0, 0);
      cv.dataset.drawn = '1';
    };
    img.src = src;
  }, [src]);
  return <canvas ref={ref} role="img" aria-label={`Gita Swipe showing verse ${verse}`} />;
}

export default function GitaShots() {
  return (
    <div className="mock gita">
      <div className="phone">
        <div className="feed">
          {SHOTS.map(([verse, src]) => (
            <Shot key={src} src={src} verse={verse} />
          ))}
        </div>
      </div>
      <span className="dim">real screens from the app, dithered. swipe for the next verse.</span>
    </div>
  );
}
