import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clock, KEYFRAMES, palette, PALETTE_JS, rgb } from '../../src/lib/ink.ts';

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
  it('formats the local hour on a 12-hour clock', () => {
    assert.equal(clock(0), '12:00 am');
    assert.equal(clock(9 + 5 / 60), '9:05 am');
    assert.equal(clock(12.5), '12:30 pm');
    assert.equal(clock(23 + 59 / 60), '11:59 pm');
  });
});
