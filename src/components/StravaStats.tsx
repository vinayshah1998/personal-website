import type { StravaStats, StravaActivity } from '@/lib/strava';

const METERS_TO_MILES = 0.000621371;

const formatDistance = (meters: number) => (meters * METERS_TO_MILES).toFixed(1);

interface StatsCardProps {
  title: string;
  count: number;
  distance: number;
  time: number;
  elevation: number;
}

const StatsCard = ({ title, count, distance, time, elevation }: StatsCardProps) => {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="cozy-card p-6">
      <h3 className="font-display text-xl font-bold mb-4 text-ink">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-bold text-pond">
            {count}
          </p>
          <p className="text-sm text-ink-soft">Activities</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-forest">
            {formatDistance(distance)} mi
          </p>
          <p className="text-sm text-ink-soft">Distance</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-berry">
            {formatTime(time)}
          </p>
          <p className="text-sm text-ink-soft">Time</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-saffron">
            {Math.round(elevation)} m
          </p>
          <p className="text-sm text-ink-soft">Elevation</p>
        </div>
      </div>
    </div>
  );
};

const RecentActivity = ({ activity }: { activity: StravaActivity }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="flex justify-between items-center py-3 border-b border-line last:border-b-0">
      <div>
        <h4 className="font-medium text-ink">
          {activity.name}
        </h4>
        <p className="text-sm text-ink-soft">
          {formatDate(activity.start_date)} • {activity.type}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-ink">
          {formatDistance(activity.distance)} mi
        </p>
        <p className="text-sm text-ink-soft">
          {Math.round(activity.moving_time / 60)} min
        </p>
      </div>
    </div>
  );
};

interface StravaStatsProps {
  stats: StravaStats;
  activities: StravaActivity[];
}

export default function StravaStats({ stats, activities }: StravaStatsProps) {

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Last 4 Weeks"
          count={stats.recent_run_totals.count}
          distance={stats.recent_run_totals.distance}
          time={stats.recent_run_totals.moving_time}
          elevation={stats.recent_run_totals.elevation_gain}
        />
        <StatsCard
          title="This Year"
          count={stats.ytd_run_totals.count}
          distance={stats.ytd_run_totals.distance}
          time={stats.ytd_run_totals.moving_time}
          elevation={stats.ytd_run_totals.elevation_gain}
        />
        <StatsCard
          title="All Time"
          count={stats.all_run_totals.count}
          distance={stats.all_run_totals.distance}
          time={stats.all_run_totals.moving_time}
          elevation={stats.all_run_totals.elevation_gain}
        />
      </div>

      {activities.length > 0 && (
        <div className="cozy-card p-6">
          <h3 className="font-display text-xl font-bold mb-4 text-ink">
            Recent Activities
          </h3>
          <div className="space-y-0">
            {activities.map((activity) => (
              <RecentActivity key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}