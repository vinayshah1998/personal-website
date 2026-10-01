export default function StatsLoading() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="mb-8">
        <p className="page-kicker">Miles on Strava</p>
        <h1 className="page-title mb-4">
          Running Stats
        </h1>
        <p className="page-lede">
          My running journey tracked through Strava. Here's how I've been staying active.
        </p>
      </div>

      <div className="animate-pulse space-y-8">
        {/* Stats cards skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-sand h-40 rounded-[18px]" />
          ))}
        </div>

        {/* Recent activities skeleton */}
        <div className="bg-sand h-64 rounded-[18px]" />
      </div>
    </div>
  );
}
