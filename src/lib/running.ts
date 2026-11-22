import type { StravaActivity } from './strava';

export const METERS_TO_MILES = 0.000621371;
export const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export interface RunningSeries {
  year: number;
  /** Miles in each of the last 12 Monday-to-Sunday weeks, oldest first; the last is this week. */
  weeks: number[];
  /** Each week's Monday, as in "nov 16". */
  weekStarts: string[];
  /** Cumulative miles at the end of each month: this year through the current month, last year all 12. */
  thisYear: number[];
  lastYear: number[];
}

const DAY = 86_400_000;
// Days since 1970-01-01 for a "YYYY-MM-DD..." date.
const dayOf = (date: string) => Math.floor(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) / DAY);
const label = (day: number) => {
  const d = new Date(day * DAY);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
};

/**
 * Weekly and year-to-date running miles. Runs are placed by their local start date; `today` is the athlete's
 * local date ("YYYY-MM-DD").
 */
export function runningSeries(activities: StravaActivity[], today: string): RunningSeries {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7)) - 1;
  const todayDay = dayOf(today);
  // 1970-01-01 was a Thursday, so a day's Monday is three days back from its position in a Thursday-based week.
  const monday = todayDay - ((todayDay + 3) % 7);
  const firstWeek = monday - 11 * 7;
  const weeks = Array<number>(12).fill(0);
  const months = { [year]: Array<number>(12).fill(0), [year - 1]: Array<number>(12).fill(0) };

  for (const a of activities) {
    if (a.type !== 'Run') continue;
    const mi = a.distance * METERS_TO_MILES;
    const day = dayOf(a.start_date_local);
    if (day > todayDay) continue;
    if (day >= firstWeek) weeks[Math.floor((day - firstWeek) / 7)] += mi;
    const y = Number(a.start_date_local.slice(0, 4));
    if (months[y]) months[y][Number(a.start_date_local.slice(5, 7)) - 1] += mi;
  }
  const cumulative = (m: number[]) => {
    let sum = 0;
    return m.map((v) => (sum += v));
  };
  return {
    year,
    weeks,
    weekStarts: weeks.map((_, i) => label(firstWeek + i * 7)),
    thisYear: cumulative(months[year]).slice(0, month + 1),
    lastYear: cumulative(months[year - 1]),
  };
}

/** The athlete's local date, from the IANA zone Strava gives on activities; UTC when there is none. */
export function localToday(now: number, timezone?: string): string {
  const zone = timezone?.split(') ')[1];
  return new Intl.DateTimeFormat('en-CA', { timeZone: zone || 'UTC' }).format(now);
}
