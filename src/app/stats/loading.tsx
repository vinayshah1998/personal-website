export default function StatsLoading() {
  return (
    <div className="panel panel-strong max-w-4xl mx-auto my-10 px-6 py-12 md:px-10">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 text-white">
          Running Stats
        </h1>
        <p className="text-lg text-white/60">
          My running journey tracked through Strava. Here's how I've been staying active.
        </p>
      </div>

      <div className="animate-pulse space-y-8">
        {/* Stats cards skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/15 h-40 rounded-lg" />
          ))}
        </div>

        {/* Recent activities skeleton */}
        <div className="bg-white/15 h-64 rounded-lg" />
      </div>
    </div>
  );
}
