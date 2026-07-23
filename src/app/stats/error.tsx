'use client';

import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export default function StatsError({
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
    <div className="shell page-section">
      <section className="run-unavailable" aria-labelledby="stats-error-title">
        <div>
          <p className="eyebrow">Run log error</p>
          <h1 id="stats-error-title" className="section-heading">The page missed a step.</h1>
          <p>
            The rest of the site is available. Retry the request, or come back
            after the current sync window.
          </p>
          <button className="button button-primary" type="button" onClick={reset}>
            <RefreshCw size={16} aria-hidden="true" />
            Retry
          </button>
        </div>
      </section>
    </div>
  );
}
