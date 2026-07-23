import type { Metadata } from 'next';
import Link from 'next/link';
import { Activity, ArrowRight, RefreshCw } from 'lucide-react';
import StravaStatsView from '@/components/StravaStats';
import { isStravaConfigured, stravaAPI } from '@/lib/strava';

export const metadata: Metadata = {
  title: 'Running log',
  description:
    'A live running log and a small reminder that useful progress is usually cumulative.',
  alternates: {
    canonical: '/stats',
  },
};

export const revalidate = 600;

type StravaData =
  | {
      status: 'ready';
      stats: Awaited<ReturnType<typeof stravaAPI.getAthleteStats>>;
      activities: Awaited<ReturnType<typeof stravaAPI.getRecentActivities>>;
    }
  | { status: 'unconfigured' }
  | { status: 'unavailable' };

async function getStravaData(): Promise<StravaData> {
  if (!isStravaConfigured()) {
    return { status: 'unconfigured' };
  }

  try {
    const [stats, recentActivities] = await Promise.all([
      stravaAPI.getAthleteStats(),
      stravaAPI.getRecentActivities(50),
    ]);
    const activities = recentActivities
      .filter((activity) => activity.type === 'Run')
      .slice(0, 12);

    return { status: 'ready', stats, activities };
  } catch (error) {
    console.error(
      'Strava sync failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return { status: 'unavailable' };
  }
}

function RunLogUnavailable({ status }: { status: 'unconfigured' | 'unavailable' }) {
  const configured = status === 'unavailable';

  return (
    <section className="run-unavailable" aria-labelledby="run-unavailable-title">
      <div className="run-unavailable-icon">
        <Activity size={28} aria-hidden="true" />
      </div>
      <div>
        <p className="eyebrow">{configured ? 'Sync interrupted' : 'Running log'}</p>
        <h2 id="run-unavailable-title" className="section-heading">
          {configured ? 'The run log is between syncs.' : 'Recent runs are currently unavailable.'}
        </h2>
        <p>
          {configured
            ? 'The page is still available while Strava catches up. A fresh request will be attempted on the next visit.'
            : 'Running is part of how I think about consistency and honest feedback. The activity feed will return when the next data sync is available.'}
        </p>
        <div className="run-unavailable-actions">
          {configured && (
            <a className="button button-secondary" href="/stats">
              <RefreshCw size={16} aria-hidden="true" />
              Try sync again
            </a>
          )}
          <Link className="text-link" href="/about">
            Why running is here
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default async function StatsPage() {
  const data = await getStravaData();

  return (
    <>
      <header className="shell run-hero page-section">
        <div>
          <p className="page-kicker">Running</p>
          <h1 className="page-heading">Running log</h1>
        </div>
        <p className="lede">
          A live record of recent runs, yearly mileage, and the quiet work of
          staying consistent.
        </p>
      </header>

      <section className="shell run-content">
        {data.status === 'ready' ? (
          <StravaStatsView stats={data.stats} activities={data.activities} />
        ) : (
          <RunLogUnavailable status={data.status} />
        )}
      </section>
    </>
  );
}
