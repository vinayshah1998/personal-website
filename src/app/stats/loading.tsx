export default function StatsLoading() {
  return (
    <div
      className="shell stats-loading page-section"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading the latest running data.</span>
      <div className="loading-line loading-line-short" />
      <div className="loading-line loading-line-title" />
      <div className="loading-line loading-line-copy" />
      <div className="loading-grid" aria-hidden="true">
        <div />
        <div />
      </div>
    </div>
  );
}
