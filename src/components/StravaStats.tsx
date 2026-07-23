import type { StravaActivity, StravaStats } from '@/lib/strava';
import RunTrendChart from '@/components/RunTrendChart';

const METERS_TO_MILES = 0.000621371;
const formatDistance = (meters: number) => (meters * METERS_TO_MILES).toFixed(1);

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function PeriodSummary({
  label,
  count,
  distance,
  moving_time,
  elevation_gain,
}: {
  label: string;
  count: number;
  distance: number;
  moving_time: number;
  elevation_gain: number;
}) {
  return (
    <div className="run-period-row">
      <p className="run-period-label">{label}</p>
      <p className="run-period-distance">
        {formatDistance(distance)}
        <span> mi</span>
      </p>
      <p className="run-period-meta">
        {count} runs <span aria-hidden="true">/</span> {formatTime(moving_time)}
        <br />
        {Math.round(elevation_gain).toLocaleString()} m elevation
      </p>
    </div>
  );
}

export default function StravaStatsView({
  stats,
  activities,
}: {
  stats: StravaStats;
  activities: StravaActivity[];
}) {
  const recent = stats.recent_run_totals;
  const focus = recent.count > 0 ? recent : stats.ytd_run_totals;
  const focusLabel = recent.count > 0 ? 'Last four weeks' : 'Year to date';

  return (
    <div className="run-data">
      <section className="run-overview" aria-labelledby="run-overview-title">
        <div className="run-primary">
          <p className="eyebrow">{focusLabel}</p>
          <h2 id="run-overview-title">
            {formatDistance(focus.distance)}
            <span> miles</span>
          </h2>
          <div className="run-primary-meta">
            <span><strong>{focus.count}</strong> runs</span>
            <span><strong>{formatTime(focus.moving_time)}</strong> moving</span>
            <span>
              <strong>{Math.round(focus.elevation_gain).toLocaleString()} m</strong> elevation
            </span>
          </div>
        </div>

        {activities.length > 0 && <RunTrendChart activities={activities} />}
      </section>

      <div className="run-detail-grid">
        <section className="run-history" aria-labelledby="run-history-title">
          <div className="run-section-heading">
            <p className="eyebrow">Across time</p>
            <h2 id="run-history-title" className="section-heading">Totals</h2>
          </div>
          <div className="run-periods">
            <PeriodSummary label="Last 4 weeks" {...recent} />
            <PeriodSummary label="This year" {...stats.ytd_run_totals} />
            <PeriodSummary label="All time" {...stats.all_run_totals} />
          </div>
        </section>

        {activities.length > 0 && (
          <section className="activity-log" aria-labelledby="recent-activities-title">
            <div className="run-section-heading">
              <p className="eyebrow">Most recent</p>
              <h2 id="recent-activities-title" className="section-heading">Activity</h2>
            </div>
            <ol>
              {activities.slice(0, 5).map((activity) => (
                <li key={activity.id}>
                  <time dateTime={activity.start_date}>
                    {formatDate(activity.start_date_local ?? activity.start_date)}
                  </time>
                  <div>
                    <strong>{activity.name}</strong>
                    <span>{Math.round(activity.moving_time / 60)} min</span>
                  </div>
                  <strong>{formatDistance(activity.distance)} mi</strong>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
}
