import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clock, everyMinute, KEYFRAMES, palette, PALETTE_JS, rgb } from '../../src/lib/ink.ts';

describe('palette', () => {
  it('hits each keyframe exactly, afternoon included', () => {
    assert.deepEqual(palette(10).bg, [0xf3, 0xf1, 0xea]);
    assert.deepEqual(palette(16).c2, [0xd9, 0x9a, 0x12]);
    assert.deepEqual(palette(20).ac, [0xff, 0xb3, 0x6b]);
  });

  it('eases between keyframes and wraps around midnight', () => {
    // 13:00 is halfway from 10 to 16; smoothstep(0.5) is 0.5.
    assert.deepEqual(palette(13).c1, [(0x2a + 0x2f) / 2, (0x6d + 0x7f) / 2, (0xf0 + 0xd8) / 2]);
    assert.deepEqual(palette(26), palette(2));
    assert.deepEqual(palette(-1), palette(23));
  });

  it('picks dark text on light grounds and light text on dark ones', () => {
    assert.equal(palette(12).fg, '#17161b');
    assert.equal(palette(2).fg, '#f1efe9');
  });

  it('matches the inlined first-paint script at every quarter hour', () => {
    const inlined = new Function(`return (${PALETTE_JS})`)() as (h: number, k: typeof KEYFRAMES) => [string, string];
    for (let h = 0; h <= 24; h += 0.25) {
      const p = palette(h);
      assert.deepEqual(inlined(h, KEYFRAMES), [rgb(p.bg), p.fg], `hour ${h}`);
    }
  });
});

describe('clock', () => {
  // Local-time Dates in January, away from daylight saving changes.
  const at = (h: number, m: number, s = 0, ms = 0) => new Date(2026, 0, 15, h, m, s, ms);

  it('formats the local time on a 12-hour clock', () => {
    assert.equal(clock(at(0, 0)), '12:00 am');
    assert.equal(clock(at(9, 5)), '9:05 am');
    assert.equal(clock(at(12, 30)), '12:30 pm');
  });

  it('keeps the minutes that the fractional hour rounded down', () => {
    // Rebuilt from h + m/60, each of these came out one minute early.
    assert.equal(clock(at(4, 7)), '4:07 am');
    assert.equal(clock(at(16, 7)), '4:07 pm');
    assert.equal(clock(at(1, 3)), '1:03 am');
    assert.equal(clock(at(23, 59, 59, 999)), '11:59 pm');
    assert.equal(clock(new Date(2026, 0, 16, 0, 0)), '12:00 am');
  });

  it('ticks on each minute boundary, not on a fixed interval', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: at(16, 6, 45, 500) });
    const seen: string[] = [];
    const stop = everyMinute(() => seen.push(clock()));
    t.mock.timers.tick(14_499);
    assert.deepEqual(seen, []);
    t.mock.timers.tick(1);
    assert.deepEqual(seen, ['4:07 pm']);
    t.mock.timers.tick(59_999);
    assert.deepEqual(seen, ['4:07 pm']);
    t.mock.timers.tick(1);
    assert.deepEqual(seen, ['4:07 pm', '4:08 pm']);
    stop();
    t.mock.timers.tick(120_000);
    assert.equal(seen.length, 2);
  });
});
