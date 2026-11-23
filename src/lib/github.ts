// Coding stats come from the public contribution calendar as a signed-out visitor sees it. It includes Vinay's
// private contributions (kiro-team, behind SAML SSO) as plain daily counts. The GraphQL API's contributionsCollection
// leaves most of those out, so the API isn't used. The calendar needs no token and has no repo names.

// Overridable so end-to-end tests can point the site at a local mock.
export const GITHUB = process.env.GITHUB_BASE_URL ?? 'https://github.com';
export const GITHUB_USER = 'vinayshah1998';

export interface ContributionDay {
  date: string;
  count: number;
  /** GitHub's own 0 to 4 shading level for the day. */
  level: number;
}

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

/** Days from the calendar HTML at github.com/users/<user>/contributions, oldest first. */
export function parseCalendar(html: string): ContributionDay[] {
  // Each day is a <td> with its date and level; its count is in the <tool-tip> that points at the cell's id.
  const counts = new Map<string, number>();
  for (const m of html.matchAll(/<tool-tip\b([^>]*)>([^<]*)<\/tool-tip>/g)) {
    const id = attr(m[1], 'for');
    const n = m[2].trim().match(/^([\d,]+) contributions?\b/);
    if (id) counts.set(id, n ? Number(n[1].replace(/,/g, '')) : 0);
  }
  const days: ContributionDay[] = [];
  for (const [tag] of html.matchAll(/<td\b[^>]*ContributionCalendar-day[^>]*>/g)) {
    const date = attr(tag, 'data-date'), id = attr(tag, 'id');
    if (!date || !id || !counts.has(id)) continue;
    days.push({ date, count: counts.get(id)!, level: Number(attr(tag, 'data-level') ?? 0) });
  }
  return days.sort((a, b) => (a.date < b.date ? -1 : 1));
}

export async function fetchContributions(user = GITHUB_USER): Promise<ContributionDay[]> {
  const res = await fetch(`${GITHUB}/users/${user}/contributions`, { headers: { accept: 'text/html' } });
  if (!res.ok) throw new Error(`GitHub contributions: ${res.status}`);
  const days = parseCalendar(await res.text());
  // Throwing keeps a half-parsed page out of the cache, so the last good data stays.
  if (days.length < 300) throw new Error(`GitHub contributions: parsed only ${days.length} days`);
  return days;
}

export interface CodingSeries {
  /** Every day in the calendar (the last year). */
  total: number;
  /** Days for the heatmap, from the first Monday through today, so day i sits in column i / 7, row i % 7. */
  grid: ContributionDay[];
  /** Average contributions per weekday, Monday first, over the heatmap days. */
  weekday: number[];
  /** Consecutive days with contributions up to today; a quiet today doesn't break it until the day is over. */
  current: number;
  longest: number;
}

const DAY = 86_400_000;
const dayOf = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY);
// 1970-01-01 was a Thursday.
export const weekdayOf = (date: string) => (dayOf(date) + 3) % 7;

export function codingSeries(days: ContributionDay[]): CodingSeries {
  const first = days.findIndex((d) => weekdayOf(d.date) === 0);
  const grid = days.slice(first);
  const sums = Array<number>(7).fill(0), n = Array<number>(7).fill(0);
  grid.forEach((d, i) => {
    sums[i % 7] += d.count;
    n[i % 7]++;
  });
  let longest = 0, run = 0;
  for (const d of days) longest = Math.max(longest, (run = d.count > 0 ? run + 1 : 0));
  let end = days.length - 1;
  if (days[end]?.count === 0) end--;
  let current = 0;
  while (end - current >= 0 && days[end - current].count > 0) current++;
  return {
    total: days.reduce((s, d) => s + d.count, 0),
    grid,
    weekday: sums.map((s, i) => (n[i] ? s / n[i] : 0)),
    current,
    longest,
  };
}
