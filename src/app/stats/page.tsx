import { unstable_cache } from 'next/cache';
import CodingCharts from '@/components/CodingCharts';
import StatsTabs from '@/components/StatsTabs';
import StravaStats from '@/components/StravaStats';
import { codingSeries, fetchContributions, GITHUB, GITHUB_USER } from '@/lib/github';
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

// Synced once a day. When a refresh fails, the cache keeps serving the last good calendar.
const contributions = unstable_cache(() => fetchContributions(), ['github-contributions', GITHUB, GITHUB_USER], { revalidate: 86_400 });

async function getCodingData() {
  try {
    return codingSeries(await contributions());
  } catch (error) {
    console.error('Failed to fetch GitHub contributions:', error);
    return null;
  }
}

const unavailable = (source: string) => (
  <div className="row">
    <span className="dim">{source}</span>
    <span>couldn&apos;t reach {source} just now. try again in a few minutes.</span>
  </div>
);

export default async function StatsPage() {
  const [running, coding] = await Promise.all([getStravaData(), getCodingData()]);

  return (
    <div className="bd stats">
      <StatsTabs
        running={running ? <StravaStats stats={running.stats} activities={running.activities} now={running.now} /> : unavailable('strava')}
        coding={coding ? <CodingCharts series={coding} /> : unavailable('github')}
      />
    </div>
  );
}
