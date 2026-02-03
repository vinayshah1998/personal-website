import StravaStats from '@/components/StravaStats';
import { stravaAPI } from '@/lib/strava';

// Revalidate the page every 10 minutes (600 seconds)
export const revalidate = 600;

async function getStravaData() {
  try {
    const [stats, activities] = await Promise.all([
      stravaAPI.getAthleteStats(),
      stravaAPI.getRecentActivities(5),
    ]);
    return { stats, activities };
  } catch (error) {
    console.error('Failed to fetch Strava data:', error);
    return null;
  }
}

export default async function StatsPage() {
  const data = await getStravaData();

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          Running Stats
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          My running journey tracked through Strava. Here's how I've been staying active.
        </p>
      </div>

      {data ? (
        <StravaStats stats={data.stats} activities={data.activities} />
      ) : (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">
            Failed to load Strava data. Please try again later.
          </p>
        </div>
      )}
    </div>
  );
}
