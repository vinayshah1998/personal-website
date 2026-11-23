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
