import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { localToday, METERS_TO_MILES, runningSeries } from '../../src/lib/running.ts';
import type { StravaActivity } from '../../src/lib/strava.ts';

const MILE = 1 / METERS_TO_MILES;
const run = (local: string, mi: number, type = 'Run'): StravaActivity => ({
  id: 0,
  name: 'run',
  type,
  distance: mi * MILE,
  moving_time: 0,
  elapsed_time: 0,
  total_elevation_gain: 0,
  start_date: local,
  start_date_local: `${local}T07:00:00Z`,
});
const close = (a: number[], b: number[]) => assert.deepEqual(a.map((v) => +v.toFixed(6)), b);

// 2026-11-22 is a Sunday, so this week is Mon Nov 16 to Sun Nov 22 and the first of 12 weeks starts Mon Aug 31.
const TODAY = '2026-11-22';

describe('runningSeries', () => {
  it('buckets runs into Monday-to-Sunday weeks ending this week', () => {
    const s = runningSeries([run('2026-11-16', 3), run('2026-11-22', 4), run('2026-11-15', 5), run('2026-08-31', 6), run('2026-08-30', 7)], TODAY);
    assert.equal(s.weekStarts[0], 'aug 31');
    assert.equal(s.weekStarts[11], 'nov 16');
    close(s.weeks, [6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 7]);
  });

  it('counts only runs, and nothing after today', () => {
    const s = runningSeries([run('2026-11-20', 2, 'Ride'), run('2026-11-23', 9), run('2026-11-21', 1)], TODAY);
    assert.equal(s.weeks[11], 1);
    close(s.thisYear.slice(-1), [1]);
  });

  it('accumulates by month, this year through the current month and last year in full', () => {
    const s = runningSeries([run('2026-01-31', 2), run('2026-03-01', 3), run('2025-02-10', 4), run('2025-12-31', 5), run('2024-12-31', 50)], TODAY);
    assert.equal(s.year, 2026);
    close(s.thisYear, [2, 2, 5, 5, 5, 5, 5, 5, 5, 5, 5]);
    close(s.lastYear, [0, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 9]);
  });

  it('places a run by its local date, not its UTC date', () => {
    // 11pm on Dec 31 in Los Angeles is already Jan 1 in UTC.
    const late = { ...run('2025-12-31', 8), start_date: '2026-01-01T07:00:00Z', start_date_local: '2025-12-31T23:00:00Z' };
    const s = runningSeries([late], '2026-01-05');
    close(s.thisYear, [0]);
    assert.equal(s.lastYear[11], 8);
  });
});

describe('localToday', () => {
  it("uses the zone from Strava's timezone field", () => {
    const now = Date.parse('2026-11-23T05:00:00Z');
    assert.equal(localToday(now, '(GMT-08:00) America/Los_Angeles'), '2026-11-22');
    assert.equal(localToday(now), '2026-11-23');
  });
});
