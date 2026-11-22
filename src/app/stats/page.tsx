import StravaStats from '@/components/StravaStats';
import { stravaAPI } from '@/lib/strava';

export const metadata = { title: 'Stats - Vinay Shah' };

// Revalidate the page every 10 minutes (600 seconds)
export const revalidate = 600;

async function getStravaData() {
  const now = Date.now();
  try {
    const twelveWeeksAgo = Math.floor(now / 1000) - 12 * 7 * 24 * 3600;
    const [stats, activities] = await Promise.all([
      stravaAPI.getAthleteStats(),
      stravaAPI.getRecentActivities(200, twelveWeeksAgo),
    ]);
    return { stats, activities, now };
  } catch (error) {
    console.error('Failed to fetch Strava data:', error);
    return null;
  }
}

export default async function StatsPage() {
  const data = await getStravaData();

  return (
    <div className="bd">
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
