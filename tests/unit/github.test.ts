import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { codingSeries, parseCalendar, type ContributionDay } from '../../src/lib/github.ts';

// Cut down from github.com/users/<user>/contributions: cells and their tooltips are in separate places, out of date order.
const HTML = `
<td tabindex="0" data-ix="1" aria-selected="false" style="width: 10px" data-date="2026-11-17" id="contribution-day-component-2-0" data-level="4" role="gridcell" class="ContributionCalendar-day"></td>
<td data-date="2026-11-16" data-level="1" id="contribution-day-component-1-0" class="ContributionCalendar-day"></td>
<td data-date="2026-11-15" id="contribution-day-component-0-0" data-level="0" class="ContributionCalendar-day"></td>
<td class="ContributionCalendar-label">Mon</td>
<tool-tip id="tooltip-a" for="contribution-day-component-0-0" popover="manual" class="sr-only">No contributions on November 15th.</tool-tip>
<tool-tip id="tooltip-b" for="contribution-day-component-1-0" popover="manual" class="sr-only">1 contribution on November 16th.</tool-tip>
<tool-tip id="tooltip-c" for="contribution-day-component-2-0" popover="manual" class="sr-only">1,204 contributions on November 17th.</tool-tip>`;

describe('parseCalendar', () => {
  it('pairs each day cell with its tooltip count, oldest first', () => {
    assert.deepEqual(parseCalendar(HTML), [
      { date: '2026-11-15', count: 0, level: 0 },
      { date: '2026-11-16', count: 1, level: 1 },
      { date: '2026-11-17', count: 1204, level: 4 },
    ]);
  });
});

const days = (start: string, counts: number[]): ContributionDay[] =>
  counts.map((count, i) => ({ date: new Date(Date.parse(`${start}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10), count, level: count ? 1 : 0 }));

describe('codingSeries', () => {
  // 2026-11-14 is a Saturday, so the heatmap starts on Monday 2026-11-16.
  const s = codingSeries(days('2026-11-14', [5, 0, 2, 4, 0, 1, 1, 1, 3, 1, 9, 6]));

  it('totals every day but lays the heatmap out from the first Monday', () => {
    assert.equal(s.total, 33);
    assert.equal(s.grid[0].date, '2026-11-16');
    assert.equal(s.grid.length, 10);
  });

  it('averages each weekday, Monday first', () => {
    // Mondays: Nov 16 (2) and Nov 23 (1); Tuesdays: Nov 17 (4) and Nov 24 (9); Sundays: Nov 22 (3) only.
    assert.equal(s.weekday[0], 1.5);
    assert.equal(s.weekday[1], 6.5);
    assert.equal(s.weekday[6], 3);
  });

  it('counts streaks, and a quiet today does not end the current one', () => {
    assert.equal(s.longest, 7);
    assert.equal(s.current, 7);
    assert.equal(codingSeries(days('2026-11-14', [1, 1, 1, 0])).current, 3);
    assert.equal(codingSeries(days('2026-11-14', [1, 1, 0, 0])).current, 0);
  });
});
