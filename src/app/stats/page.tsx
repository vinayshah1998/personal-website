import StravaStats from '@/components/StravaStats';
import { stravaAPI } from '@/lib/strava';

export const metadata = { title: 'Stats - Vinay Shah' };

// Revalidate the page every 10 minutes (600 seconds)
export const revalidate = 600;

async function getStravaData() {
  const now = Date.now();
  try {
    // From a day before last New Year's (UTC), so runs that are early on Jan 1 in the athlete's zone still count.
    const after = Date.UTC(new Date(now).getUTCFullYear() - 1, 0, 1) / 1000 - 86_400;
    const [stats, activities] = await Promise.all([stravaAPI.getAthleteStats(), stravaAPI.getActivitiesSince(after)]);
    return { stats, activities, now };
  } catch (error) {
    console.error('Failed to fetch Strava data:', error);
    return null;
  }
}

export default async function StatsPage() {
  const data = await getStravaData();

  return (
    <div className="bd stats">
      {data ? (
        <StravaStats stats={data.stats} activities={data.activities} now={data.now} />
      ) : (
        <div className="row">
          <span className="dim">strava</span>
          <span>couldn&apos;t reach strava just now. try again in a few minutes.</span>
        </div>
      )}
    </div>
  );
}
