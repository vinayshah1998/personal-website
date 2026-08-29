'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Stats page error:', error);
  }, [error]);

  return (
    <div className="panel panel-strong max-w-4xl mx-auto my-10 px-6 py-12 md:px-10">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 text-white">
          Running Stats
        </h1>
      </div>

      <div className="bg-red-500/10 border border-red-400/25 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
          Something went wrong
        </h2>
        <p className="text-red-700 dark:text-red-300 mb-4">
          Failed to load Strava data. This might be a temporary issue.
        </p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
