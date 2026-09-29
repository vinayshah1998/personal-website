import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createWorld,
  inPond,
  isWalkable,
  LAYOUT,
  step,
  type Input,
  type Vec2,
  type WorldState,
} from '../../src/lib/island/world.ts';

const still: Input = { axis: [0, 0], commands: [] };
const DT = 1 / 60;

function run(state: WorldState, input: Input, seconds: number, onStep?: (s: WorldState) => void): WorldState {
  let current = step(state, input, DT);
  onStep?.(current);
  for (let t = DT; t < seconds; t += DT) {
    current = step(current, { axis: input.axis, commands: [] }, DT);
    onStep?.(current);
  }
  return current;
}

function runUntil(state: WorldState, done: (s: WorldState) => boolean, maxSeconds: number, onStep?: (s: WorldState) => void): WorldState {
  let current = state;
  for (let t = 0; t < maxSeconds; t += DT) {
    if (done(current)) return current;
    current = step(current, still, DT);
    onStep?.(current);
  }
  assert.fail(`condition not reached within ${maxSeconds}s (phase ${current.fishing.kind})`);
}

function at(position: Vec2, seed = 1): WorldState {
  return { ...createWorld(seed), position };
}

const tapPond: Input = { axis: [0, 0], commands: [{ type: 'tap', point: LAYOUT.pond.center }] };
const action: Input = { axis: [0, 0], commands: [{ type: 'action' }] };

describe('movement', () => {
  it('walks east with the keyboard axis at walking speed and faces east', () => {
    const end = run(createWorld(), { axis: [1, 0], commands: [] }, 1);
    assert.equal(Number(end.position[0].toFixed(2)), 0.8);
    assert.equal(Number(end.position[1].toFixed(2)), 2.4);
    assert.equal(Number(end.facing.toFixed(2)), 1.57);
  });

  it('never leaves the island', () => {
    const end = run(createWorld(), { axis: [0, 1], commands: [] }, 10);
    assert.ok(Math.hypot(...end.position) <= LAYOUT.walkRadius);
    assert.ok(end.position[1] > 7.5);
  });

  it('never enters the pond when pushed straight into it', () => {
    const end = run(at([1.8, 2.8]), { axis: [0, -1], commands: [] }, 5, (s) => assert.equal(inPond(s.position), false));
    assert.ok(end.position[1] >= 1.32 && end.position[1] < 1.4, `stopped at ${end.position[1]}`);
  });

  it('stops outside a tree trunk', () => {
    const tree = LAYOUT.trees[0];
    const end = run(at([tree.center[0] + 2, tree.center[1]]), { axis: [-1, 0], commands: [] }, 3);
    const distance = Math.hypot(end.position[0] - tree.center[0], end.position[1] - tree.center[1]);
    assert.ok(distance >= tree.radius + LAYOUT.playerRadius - 1e-9);
    assert.ok(distance < tree.radius + LAYOUT.playerRadius + 0.05);
  });

  it('walks to a tapped ground point', () => {
    const goal: Vec2 = [-3.0, 5.0];
    const start = step(createWorld(), { axis: [0, 0], commands: [{ type: 'tap', point: goal }] }, DT);
    const end = runUntil(start, (s) => s.route.length === 0, 10);
    assert.ok(Math.hypot(end.position[0] - goal[0], end.position[1] - goal[1]) < 0.1);
    assert.equal(end.fishing.kind, 'idle');
  });

  it('routes around the pond instead of through it', () => {
    const start = step(at([6.0, -0.5]), { axis: [0, 0], commands: [{ type: 'tap', point: [-2.8, -0.2] }] }, DT);
    const end = runUntil(start, (s) => s.route.length === 0, 20, (s) => assert.ok(isWalkable(s.position)));
    assert.ok(Math.hypot(end.position[0] + 2.8, end.position[1] + 0.2) < 0.1);
  });

  it('clamps a huge catch-up frame to one small step', () => {
    const end = step(createWorld(), { axis: [1, 0], commands: [] }, 5);
    assert.equal(Number((end.position[0] - LAYOUT.spawn[0]).toFixed(2)), 0.24);
    assert.equal(Number(end.elapsed.toFixed(2)), 0.1);
  });
});

describe('fishing', () => {
  it('walks to the dock, casts, waits, bites without a timer, and catches on action', () => {
    let state = step(createWorld(7), tapPond, DT);
    assert.equal(state.fishing.kind, 'walking-to-pond');

    state = runUntil(state, (s) => s.fishing.kind === 'casting', 15, (s) => assert.ok(isWalkable(s.position)));
    assert.ok(Math.hypot(state.position[0] - LAYOUT.fishingSpot[0], state.position[1] - LAYOUT.fishingSpot[1]) < 0.15);

    const castStart = state.elapsed;
    state = runUntil(state, (s) => s.fishing.kind === 'waiting', 2);
    assert.equal(Number((state.elapsed - castStart).toFixed(1)), 0.6);

    const waitStart = state.elapsed;
    state = runUntil(state, (s) => s.fishing.kind === 'bite', 5);
    const waited = state.elapsed - waitStart;
    assert.ok(waited >= 2 && waited <= 4.05, `waited ${waited}`);

    state = run(state, still, 60);
    assert.equal(state.fishing.kind, 'bite');

    state = step(state, action, DT);
    assert.equal(state.fishing.kind, 'caught');
    assert.equal(state.caught.length, 1);

    state = run(state, still, 30);
    assert.equal(state.fishing.kind, 'caught');
    assert.equal(Number(Math.sin(state.facing).toFixed(2)), 1);
  });

  it('reels in by tapping the pond during a bite and casts again from the dock', () => {
    let state = runUntil(step(createWorld(3), tapPond, DT), (s) => s.fishing.kind === 'bite', 25);
    state = step(state, tapPond, DT);
    assert.equal(state.fishing.kind, 'caught');
    state = step(state, action, DT);
    assert.equal(state.fishing.kind, 'casting');
    assert.equal(state.caught.length, 1);
  });

  it('ignores the action key while casting or waiting', () => {
    let state = runUntil(step(createWorld(5), tapPond, DT), (s) => s.fishing.kind === 'waiting', 20);
    const before = state.fishing;
    state = step(state, action, 0);
    assert.deepEqual(state.fishing, before);
  });

  it('cancels fishing cleanly when the player moves', () => {
    let state = runUntil(step(createWorld(5), tapPond, DT), (s) => s.fishing.kind === 'waiting', 20);
    state = step(state, { axis: [0, 1], commands: [] }, DT);
    assert.equal(state.fishing.kind, 'idle');
    assert.equal(state.route.length, 0);

    state = runUntil(step(state, action, DT), (s) => s.fishing.kind === 'bite', 25);
    state = step(state, { axis: [0, 0], commands: [{ type: 'tap', point: [-3, 4] }] }, DT);
    assert.equal(state.fishing.kind, 'idle');
    assert.equal(state.caught.length, 0);
  });

  it('is deterministic for a seed', () => {
    const play = (seed: number) => {
      let state = runUntil(step(createWorld(seed), tapPond, DT), (s) => s.fishing.kind === 'bite', 25);
      state = step(state, action, DT);
      return state;
    };
    assert.deepEqual(play(11), play(11));
    const bites = new Set([1, 2, 3, 4, 5, 6].map((seed) => play(seed).elapsed.toFixed(3)));
    assert.ok(bites.size > 1);
  });
});
