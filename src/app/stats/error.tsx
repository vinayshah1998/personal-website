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
    <div className="bd">
      <div className="row">
        <span className="dim">strava</span>
        <span>something went wrong loading the stats.</span>
        <button type="button" className="lk" onClick={() => reset()}>
          try again
        </button>
      </div>
    </div>
  );
}
