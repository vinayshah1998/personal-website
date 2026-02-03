export default function StatsLoading() {
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

      <div className="animate-pulse space-y-8">
        {/* Stats cards skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-200 dark:bg-gray-700 h-40 rounded-lg" />
          ))}
        </div>

        {/* Recent activities skeleton */}
        <div className="bg-gray-200 dark:bg-gray-700 h-64 rounded-lg" />
      </div>
    </div>
  );
}
