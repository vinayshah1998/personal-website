'use client';

import { Glass } from '@samasante/liquid-glass';
import { useMemo, useState } from 'react';
import type { StravaActivity } from '@/lib/strava';

const METERS_TO_MILES = 0.000621371;

type MetricKey = 'distance' | 'time' | 'climb';

const metrics = {
  distance: {
    label: 'Distance',
    unit: 'mi',
    value: (activity: StravaActivity) => activity.distance * METERS_TO_MILES,
    format: (value: number) => value.toFixed(1),
  },
  time: {
    label: 'Time',
    unit: 'min',
    value: (activity: StravaActivity) => activity.moving_time / 60,
    format: (value: number) => Math.round(value).toLocaleString(),
  },
  climb: {
    label: 'Climb',
    unit: 'm',
    value: (activity: StravaActivity) => activity.total_elevation_gain,
    format: (value: number) => Math.round(value).toLocaleString(),
  },
} satisfies Record<
  MetricKey,
  {
    label: string;
    unit: string;
    value: (activity: StravaActivity) => number;
    format: (value: number) => string;
  }
>;

const metricKeys = Object.keys(metrics) as MetricKey[];

function formatDate(activity: StravaActivity, long = false) {
  const date = activity.start_date_local ?? activity.start_date;
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);

  return new Intl.DateTimeFormat('en-US', {
    month: long ? 'long' : 'short',
    day: 'numeric',
    ...(long ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export default function RunTrendChart({
  activities,
}: {
  activities: StravaActivity[];
}) {
  const orderedActivities = useMemo(
    () => [...activities].reverse(),
    [activities],
  );
  const [metricKey, setMetricKey] = useState<MetricKey>('distance');
  const [activeIndex, setActiveIndex] = useState(
    Math.max(0, orderedActivities.length - 1),
  );
  const metric = metrics[metricKey];
  const values = orderedActivities.map(metric.value);
  const maxValue = Math.max(1, ...values);
  const points = values.map((value, index) => ({
    x: ((index + 0.5) / values.length) * 100,
    y: 94 - (value / maxValue) * 84,
  }));
  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const activeActivity = orderedActivities[activeIndex];
  const activePoint = points[activeIndex];
  const activeValue = values[activeIndex];

  if (!activeActivity || !activePoint) {
    return null;
  }

  return (
    <figure className="run-graph" aria-labelledby="run-graph-title">
      <figcaption className="run-graph-head">
        <div>
          <strong id="run-graph-title">Recent runs</strong>
          <span>{orderedActivities.length} runs, oldest to newest</span>
        </div>
        <Glass
          className="run-graph-glass"
          radius={6}
          optics={{
            strength: 0.025,
            depth: 0.5,
            curvature: 0.22,
            bend: 0.28,
            bendWidth: 0.12,
            dispersion: 0.08,
            frost: 5,
            saturate: 1.04,
            sheen: 0.16,
            sheenWidth: 2,
            glow: 0.05,
            brightness: 0.02,
          }}
        >
          <div className="run-graph-controls" aria-label="Graph metric">
            {metricKeys.map((key) => (
              <button
                type="button"
                key={key}
                aria-pressed={metricKey === key}
                onClick={() => setMetricKey(key)}
              >
                {metrics[key].label}
              </button>
            ))}
          </div>
        </Glass>
      </figcaption>

      <div className="run-graph-readout">
        <p>
          <strong>
            {metric.format(activeValue)}
            <span>{metric.unit}</span>
          </strong>
        </p>
        <p>
          <strong>{activeActivity.name}</strong>
          <span>{formatDate(activeActivity, true)}</span>
        </p>
      </div>

      <div className="run-graph-canvas">
        <span className="run-graph-y-label run-graph-y-max">
          {metric.format(maxValue)} {metric.unit}
        </span>
        <span className="run-graph-y-label run-graph-y-zero">0</span>

        <div className="run-graph-plot">
          <svg
            className="run-graph-svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path className="run-graph-baseline" d="M 0 94 L 100 94" />
            <path className="run-graph-line" d={linePath} />
            <path
              className="run-graph-crosshair"
              d={`M ${activePoint.x} ${activePoint.y} L ${activePoint.x} 94`}
            />
          </svg>

          {points.map((point, index) => {
            const activity = orderedActivities[index];
            const pointValue = values[index];
            const isActive = activeIndex === index;

            return (
              <button
                type="button"
                className="run-graph-hit"
                data-active={isActive}
                key={activity.id}
                style={{
                  left: `${(index / points.length) * 100}%`,
                  width: `${100 / points.length}%`,
                }}
                aria-label={`${formatDate(activity, true)}: ${metrics.distance.format(
                  metrics.distance.value(activity),
                )} miles, ${metrics.time.format(metrics.time.value(activity))} minutes, ${
                  metrics.climb.format(metrics.climb.value(activity))
                } meters climbed`}
                aria-pressed={isActive}
                title={`${formatDate(activity)} · ${metric.format(pointValue)} ${metric.unit}`}
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                onClick={() => setActiveIndex(index)}
              >
                <span
                  className="run-graph-dot"
                  style={{ top: `${point.y}%` }}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>

        <div className="run-graph-dates" aria-hidden="true">
          <span>{formatDate(orderedActivities[0])}</span>
          <span>
            {formatDate(
              orderedActivities[Math.floor((orderedActivities.length - 1) / 2)],
            )}
          </span>
          <span>
            {formatDate(orderedActivities[orderedActivities.length - 1])}
          </span>
        </div>
      </div>
    </figure>
  );
}
