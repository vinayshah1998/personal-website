export type RGB = number[];
export interface Palette {
  bg: RGB;
  c1: RGB;
  c2: RGB;
  ac: RGB;
  fg: string;
}

/** Time-of-day keyframes: hour, ground, ink 1, ink 2, accent. */
export const KEYFRAMES: [number, string, string, string, string][] = [
  [0, '#06070d', '#2a3a8c', '#7356e0', '#b8c4ff'],
  [5, '#0d0b19', '#3d3184', '#b0569a', '#ffc2a8'],
  [7, '#f5ede7', '#ff8f7a', '#9b7fd4', '#ff4f86'],
  [10, '#f3f1ea', '#2a6df0', '#12a68f', '#ff7a1a'],
  [16, '#f4efe4', '#2f7fd8', '#d99a12', '#ff3d6e'],
  [18.5, '#f6e7d4', '#ff6a14', '#d92d6b', '#6b3cff'],
  [20, '#151022', '#ff5a5f', '#6a3cff', '#ffb36b'],
  [22, '#08090f', '#2a3a8c', '#7a4fe0', '#9fe8ff'],
  [24, '#06070d', '#2a3a8c', '#7356e0', '#b8c4ff'],
];

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const luminance = (c: RGB) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;

/** The visitor's time-of-day palette: ground, two inks, and an accent, eased between keyframe hours. */
export function palette(hour: number): Palette {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (KEYFRAMES[i + 1][0] <= h) i++;
  const a = KEYFRAMES[i];
  const b = KEYFRAMES[i + 1];
  let t = (h - a[0]) / (b[0] - a[0]);
  t = t * t * (3 - 2 * t);
  const [bg, c1, c2, ac] = [1, 2, 3, 4].map((k) => mix(hex(a[k] as string), hex(b[k] as string), t));
  return { bg, c1, c2, ac, fg: luminance(bg) > 0.5 ? '#17161b' : '#f1efe9' };
}

/**
 * The ground half of palette() as plain JavaScript, for the root layout to inline so the first paint already has
 * the visitor's colors. Called as (PALETTE_JS)(hour, KEYFRAMES); returns [ground rgb(), text color].
 */
export const PALETTE_JS = `function(h,K){h=((h%24)+24)%24;var i=0;while(K[i+1][0]<=h)i++;var a=K[i],b=K[i+1],t=(h-a[0])/(b[0]-a[0]);t=t*t*(3-2*t);
var c=[1,3,5].map(function(j){var x=parseInt(a[1].slice(j,j+2),16);return x+(parseInt(b[1].slice(j,j+2),16)-x)*t});
return['rgb('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+')',(0.2126*c[0]+0.7152*c[1]+0.0722*c[2])/255>0.5?'#17161b':'#f1efe9']}`;

export const mix = (a: RGB, b: RGB, t: number) => a.map((v, i) => v + (b[i] - v) * t);
export const rgb = (c: RGB) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;

/** The 4×4 Bayer matrix, 0 to 15, and as thresholds that nudge each cell's ink before it rounds to a level. */
export const BAYER16 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const BAYER = BAYER16.map((v) => (v + 0.5) / 16);
/** The 12 levels, lightest to darkest. */
export const RAMP = ' .,:;-=+*#%@';
export const LV = RAMP.length - 1;

/** The ramp level for ink amount v in cell (x, y), dithered by the Bayer matrix. */
export function level(x: number, y: number, v: number): number {
  const i = (v * LV + BAYER[(y & 3) * 4 + (x & 3)]) | 0;
  return i < 0 ? 0 : i > LV ? LV : i;
}

/** One frame of spread and fade: each cell averages itself (weight 4) with its four neighbors, then loses 0.4%. */
export function diffuse(D: Float32Array, out: Float32Array, cols: number, rows: number) {
  for (let y = 1; y < rows - 1; y++)
    for (let x = 1; x < cols - 1; x++) {
      const i = y * cols + x;
      out[i] = (D[i] * 4 + D[i - 1] + D[i + 1] + D[i - cols] + D[i + cols]) * 0.125 * 0.996;
    }
}

/** Ink colors: 33 blends from ink 1 to ink 2, each with 9 steps toward the accent. Index with inkColor(). */
export function inkTable(P: Palette): string[] {
  const tab: string[] = [];
  for (let i = 0; i <= 32; i++) {
    const b = mix(P.c1, P.c2, i / 32);
    for (let j = 0; j <= 8; j++) tab.push(rgb(mix(b, P.ac, (j / 8) * 0.9)));
  }
  return tab;
}

/** The table entry for a cell's ink-blend t and accent amount m, both 0 to 1. */
export const inkColor = (tab: string[], t: number, m: number) =>
  tab[((Math.min(1, Math.max(0, t)) * 32 + 0.5) | 0) * 9 + ((Math.min(1, Math.max(0, m)) * 8 + 0.5) | 0)];

/** Local clock, as in "4:07 pm". Reads the Date's own fields: the fractional hour loses minutes to rounding. */
export function clock(d = new Date()): string {
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

/** Calls fn at the start of every local minute. Returns a function that stops it. */
export function everyMinute(fn: () => void): () => void {
  let timer: ReturnType<typeof setTimeout>;
  const arm = () => {
    const d = new Date();
    timer = setTimeout(() => {
      fn();
      arm();
    }, 60_000 - d.getSeconds() * 1000 - d.getMilliseconds());
  };
  arm();
  return () => clearTimeout(timer);
}

export const localHour = (d = new Date()) => d.getHours() + d.getMinutes() / 60;
