import type { StravaStats, StravaActivity } from '@/lib/strava';

const METERS_TO_MILES = 0.000621371;
const WEEK = 7 * 24 * 3600 * 1000;

const miles = (meters: number) => (meters * METERS_TO_MILES).toFixed(1);
const duration = (seconds: number) => `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;

/** Weekly running miles as a six-row text chart, oldest week first. */
function bars(weeks: number[]) {
  const max = Math.max(...weeks, 1);
  const height = 6;
  const out: string[] = [];
  for (let r = height; r >= 1; r--) {
    out.push(weeks.map((w) => {
      const level = (w / max) * height;
      return level >= r ? '##' : level >= r - 0.5 ? '..' : '  ';
    }).join(' '));
  }
  return out.join('\n');
}

interface StravaStatsProps {
  stats: StravaStats;
  /** Activities from about the last 12 weeks. */
  activities: StravaActivity[];
  now: number;
}

export default function StravaStats({ stats, activities, now }: StravaStatsProps) {
  const runs = activities
    .filter((a) => a.type === 'Run')
    .sort((a, b) => Date.parse(b.start_date) - Date.parse(a.start_date));
  const weeks = Array<number>(12).fill(0);
  for (const run of runs) {
    const week = 11 - Math.floor((now - Date.parse(run.start_date)) / WEEK);
    if (week >= 0 && week < 12) weeks[week] += run.distance * METERS_TO_MILES;
  }
  const ytd = stats.ytd_run_totals;
  const latest = runs[0];

  return (
    <>
      <div className="row">
        <span className="dim">{new Date(now).getFullYear()} so far</span>
        <span className="big">{miles(ytd.distance)} mi</span>
        <span>
          {ytd.count} runs, {duration(ytd.moving_time)}, {Math.round(ytd.elevation_gain).toLocaleString('en-US')} m climbed
        </span>
      </div>
      <div className="row">
        <span className="dim">last 12 weeks</span>
        <pre className="bars" aria-label={`Weekly miles, oldest first: ${weeks.map((w) => w.toFixed(1)).join(', ')}`}>
          {bars(weeks)}
        </pre>
      </div>
      {latest && (
        <div className="row">
          <span className="dim">latest</span>
          <span>
            {latest.name.toLowerCase()}, {miles(latest.distance)} mi in {duration(latest.moving_time)}
          </span>
        </div>
      )}
    </>
  );
}
