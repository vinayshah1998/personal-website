import StravaStats from '@/components/StravaStats';

export default function StatsPage() {
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
      
      <StravaStats />
    </div>
  );
}