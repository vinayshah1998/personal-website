import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CATCH_LINES, greeting, LINES, pick } from '../../src/lib/island/dialogue.ts';
import { FISH } from '../../src/lib/island/world.ts';

describe('dialogue', () => {
  it('greets visitors for the time of day', () => {
    assert.match(greeting(8), /morning/);
    assert.match(greeting(14), /visitor/);
    assert.match(greeting(19), /evening/);
    assert.match(greeting(2), /late/);
  });

  it('never repeats the line it just said', () => {
    for (let roll = 0; roll < 1; roll += 0.05) {
      const first = pick('pat', roll);
      assert.ok(LINES.pat.includes(first));
      assert.notEqual(pick('pat', roll, first), first);
    }
    assert.equal(pick('pat', 1), LINES.pat.at(-1));
  });

  it('has something to say about every fish', () => {
    for (const kind of Object.keys(FISH)) assert.ok(CATCH_LINES[kind as keyof typeof CATCH_LINES].length > 0);
  });
});
