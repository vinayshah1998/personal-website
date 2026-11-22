import StatsCharts from '@/components/StatsCharts';
import { localToday, METERS_TO_MILES, runningSeries } from '@/lib/running';
import type { StravaStats, StravaActivity } from '@/lib/strava';

const miles = (meters: number) => (meters * METERS_TO_MILES).toFixed(1);
const duration = (seconds: number) => `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;

interface StravaStatsProps {
  stats: StravaStats;
  /** Every activity since the start of last year. */
  activities: StravaActivity[];
  now: number;
}

export default function StravaStats({ stats, activities, now }: StravaStatsProps) {
  const runs = activities
    .filter((a) => a.type === 'Run')
    .sort((a, b) => Date.parse(b.start_date) - Date.parse(a.start_date));
  const latest = runs[0];
  const series = runningSeries(runs, localToday(now, latest?.timezone));
  const ytd = stats.ytd_run_totals;

  return (
    <>
      <StatsCharts
        series={series}
        total={ytd.distance * METERS_TO_MILES}
        summary={`${ytd.count} runs, ${duration(ytd.moving_time)}, ${Math.round(ytd.elevation_gain).toLocaleString('en-US')} m climbed`}
      />
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
