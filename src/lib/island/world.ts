export type Vec2 = readonly [x: number, z: number];

export type FishKind = 'minnow' | 'koi' | 'trout' | 'goby' | 'moonCarp' | 'lilyLeaf';

export type FishingState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'walking-to-pond' }
  | { readonly kind: 'casting'; readonly t: number }
  | { readonly kind: 'waiting'; readonly t: number; readonly biteAt: number }
  | { readonly kind: 'bite'; readonly t: number; readonly fish: FishKind }
  | { readonly kind: 'caught'; readonly fish: FishKind };

export type FishingPhase = FishingState['kind'];

export interface WorldState {
  readonly position: Vec2;
  readonly velocity: Vec2;
  readonly facing: number;
  readonly route: readonly Vec2[];
  readonly fishing: FishingState;
  readonly elapsed: number;
  readonly seed: number;
  readonly caught: readonly FishKind[];
}

export type Command = { readonly type: 'tap'; readonly point: Vec2 } | { readonly type: 'action' };

export interface Input {
  readonly axis: Vec2;
  readonly commands: readonly Command[];
}

interface Circle {
  readonly center: Vec2;
  readonly radius: number;
}

export interface FishInfo {
  /** Used in a sentence: "You caught a sunset koi!" */
  readonly name: string;
  /** Used on its own, as in the basket. */
  readonly label: string;
  readonly weight: number;
  readonly color: string;
}

export const FISH: Readonly<Record<FishKind, FishInfo>> = {
  minnow: { name: 'a pond minnow', label: 'Pond minnow', weight: 5, color: '#9fb8cc' },
  goby: { name: 'a tiny goby', label: 'Tiny goby', weight: 4, color: '#d2a86c' },
  trout: { name: 'a speckled trout', label: 'Speckled trout', weight: 3, color: '#8fb07c' },
  koi: { name: 'a sunset koi', label: 'Sunset koi', weight: 2, color: '#f2894b' },
  moonCarp: { name: 'a moon carp', label: 'Moon carp', weight: 1, color: '#ece6f7' },
  lilyLeaf: { name: 'a lily leaf (it counts)', label: 'Lily leaf', weight: 1, color: '#6ab26b' },
};

export const FISH_KINDS = Object.keys(FISH) as FishKind[];

export function countCatches(caught: readonly FishKind[]): Partial<Record<FishKind, number>> {
  const counts: Partial<Record<FishKind, number>> = {};
  for (const fish of caught) counts[fish] = (counts[fish] ?? 0) + 1;
  return counts;
}

export const LAYOUT = {
  islandRadius: 9.2,
  walkRadius: 8.1,
  playerRadius: 0.32,
  pond: { center: [1.8, -1.0] as Vec2, radiusX: 3.0, radiusZ: 2.1, margin: 0.22 },
  dock: { minX: -2.1, maxX: 0.05, centerZ: -1.0, halfWidth: 0.42 },
  fishingSpot: [-0.25, -1.0] as Vec2,
  fishingFacing: Math.PI / 2,
  bobber: [1.75, -1.05] as Vec2,
  spawn: [-1.6, 2.4] as Vec2,
  trees: [
    { center: [-5.4, -3.6], radius: 0.5, variant: 'round' },
    { center: [-4.1, -5.4], radius: 0.45, variant: 'pine' },
    { center: [-6.6, -1.3], radius: 0.45, variant: 'pine' },
    { center: [-2.5, -6.1], radius: 0.5, variant: 'round' },
    { center: [-6.9, 1.6], radius: 0.5, variant: 'round' },
    { center: [0.3, -6.9], radius: 0.45, variant: 'pine' },
    { center: [4.4, -5.4], radius: 0.5, variant: 'round' },
    { center: [6.5, -3.4], radius: 0.45, variant: 'pine' },
    { center: [2.6, -6.6], radius: 0.45, variant: 'pine' },
    { center: [7.2, 0.9], radius: 0.5, variant: 'round' },
    { center: [5.9, 3.7], radius: 0.45, variant: 'pine' },
    { center: [-5.9, 4.3], radius: 0.5, variant: 'round' },
  ] as readonly (Circle & { readonly variant: 'round' | 'pine' })[],
  rocks: [
    { center: [3.6, 3.3], radius: 0.45 },
    { center: [-3.4, 2.4], radius: 0.35 },
    { center: [-4.2, -2.0], radius: 0.3 },
  ] as readonly Circle[],
  campfire: { center: [0.1, 5.6] as Vec2, radius: 0.5 },
  logSeat: { center: [-0.85, 6.25] as Vec2, radius: 0.38 },
  sign: { center: [-0.5, 3.5] as Vec2, radius: 0.32 },
} as const;

export const OBSTACLES: readonly Circle[] = [...LAYOUT.trees, ...LAYOUT.rocks, LAYOUT.campfire, LAYOUT.logSeat, LAYOUT.sign];

export const TUNING = {
  walkSpeed: 2.4,
  turnRate: 11,
  maxStep: 0.1,
  castDuration: 0.6,
  minWait: 2,
  maxWait: 4,
  arriveDistance: 0.06,
} as const;

const ROUTE_RING: readonly Vec2[] = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  const { center, radiusX, radiusZ } = LAYOUT.pond;
  return [center[0] + Math.cos(angle) * (radiusX + 1.05), center[1] + Math.sin(angle) * (radiusZ + 1.05)] as const;
});

export function createWorld(seed = 1): WorldState {
  return {
    position: LAYOUT.spawn,
    velocity: [0, 0],
    facing: 0,
    route: [],
    fishing: { kind: 'idle' },
    elapsed: 0,
    seed: seed >>> 0,
    caught: [],
  };
}

export function inPond(point: Vec2, margin = 0): boolean {
  const { center, radiusX, radiusZ } = LAYOUT.pond;
  const dx = (point[0] - center[0]) / (radiusX + margin);
  const dz = (point[1] - center[1]) / (radiusZ + margin);
  return dx * dx + dz * dz < 1;
}

export function onDock(point: Vec2): boolean {
  const { minX, maxX, centerZ, halfWidth } = LAYOUT.dock;
  return point[0] >= minX && point[0] <= maxX && Math.abs(point[1] - centerZ) <= halfWidth;
}

export function isWalkable(point: Vec2): boolean {
  if (Math.hypot(point[0], point[1]) > LAYOUT.walkRadius) return false;
  if (inPond(point, LAYOUT.pond.margin) && !onDock(point)) return false;
  for (const obstacle of OBSTACLES) {
    const distance = Math.hypot(point[0] - obstacle.center[0], point[1] - obstacle.center[1]);
    if (distance < obstacle.radius + LAYOUT.playerRadius) return false;
  }
  return true;
}

function segmentClear(from: Vec2, to: Vec2): boolean {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const samples = Math.max(1, Math.ceil(length / 0.12));
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    if (!isWalkable([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t])) return false;
  }
  return true;
}

function nearestClear(point: Vec2, reverse: boolean): number {
  let best = -1;
  let bestDistance = Infinity;
  ROUTE_RING.forEach((ringPoint, index) => {
    const clear = reverse ? segmentClear(ringPoint, point) : segmentClear(point, ringPoint);
    const distance = Math.hypot(ringPoint[0] - point[0], ringPoint[1] - point[1]);
    if (clear && distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

export function planRoute(from: Vec2, goal: Vec2): readonly Vec2[] {
  if (segmentClear(from, goal)) return [goal];
  const start = nearestClear(from, false);
  const end = nearestClear(goal, true);
  if (start < 0 || end < 0) return [goal];
  const count = ROUTE_RING.length;
  const forward = (end - start + count) % count;
  const direction = forward <= count / 2 ? 1 : -1;
  const steps = direction === 1 ? forward : count - forward;
  const ring = Array.from({ length: steps + 1 }, (_, i) => ROUTE_RING[(start + direction * i + count) % count]);
  return [...ring, goal];
}

function clampToIsland(point: Vec2): Vec2 {
  const distance = Math.hypot(point[0], point[1]);
  const limit = LAYOUT.walkRadius - 0.05;
  return distance <= limit ? point : [(point[0] / distance) * limit, (point[1] / distance) * limit];
}

function random(seed: number): readonly [value: number, nextSeed: number] {
  const nextSeed = (seed + 0x6d2b79f5) >>> 0;
  let r = Math.imul(nextSeed ^ (nextSeed >>> 15), nextSeed | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
  return [((r ^ (r >>> 14)) >>> 0) / 4294967296, nextSeed];
}

function pickFish(roll: number): FishKind {
  const entries = Object.entries(FISH) as [FishKind, (typeof FISH)[FishKind]][];
  const total = entries.reduce((sum, [, fish]) => sum + fish.weight, 0);
  let remaining = roll * total;
  for (const [kind, fish] of entries) {
    remaining -= fish.weight;
    if (remaining < 0) return kind;
  }
  return 'minnow';
}

function atFishingSpot(state: WorldState): boolean {
  const [x, z] = state.position;
  return Math.hypot(x - LAYOUT.fishingSpot[0], z - LAYOUT.fishingSpot[1]) <= TUNING.arriveDistance * 2;
}

function startFishing(state: WorldState): WorldState {
  if (atFishingSpot(state)) {
    return { ...state, route: [], velocity: [0, 0], fishing: { kind: 'casting', t: 0 } };
  }
  return { ...state, route: planRoute(state.position, LAYOUT.fishingSpot), fishing: { kind: 'walking-to-pond' } };
}

function applyAction(state: WorldState): WorldState {
  switch (state.fishing.kind) {
    case 'bite':
      return { ...state, fishing: { kind: 'caught', fish: state.fishing.fish }, caught: [...state.caught, state.fishing.fish] };
    case 'idle':
    case 'caught':
      return startFishing(state);
    case 'walking-to-pond':
    case 'casting':
    case 'waiting':
      return state;
  }
}

function applyCommand(state: WorldState, command: Command): WorldState {
  if (command.type === 'action') return applyAction(state);
  if (inPond(command.point) && !onDock(command.point)) return applyAction(state);
  const goal = clampToIsland(command.point);
  return { ...state, fishing: { kind: 'idle' }, route: planRoute(state.position, goal) };
}

function turnToward(current: number, target: number, maxDelta: number): number {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + Math.max(-maxDelta, Math.min(maxDelta, delta));
}

function slide(position: Vec2, delta: Vec2): Vec2 | null {
  const candidates: Vec2[] = [
    [position[0] + delta[0], position[1] + delta[1]],
    [position[0] + delta[0], position[1]],
    [position[0], position[1] + delta[1]],
  ];
  return candidates.find((candidate) => (candidate[0] !== position[0] || candidate[1] !== position[1]) && isWalkable(candidate)) ?? null;
}

function advanceFishing(state: WorldState, dt: number): WorldState {
  const fishing = state.fishing;
  switch (fishing.kind) {
    case 'casting': {
      if (fishing.t + dt < TUNING.castDuration) return { ...state, fishing: { kind: 'casting', t: fishing.t + dt } };
      const [roll, seed] = random(state.seed);
      const biteAt = TUNING.minWait + roll * (TUNING.maxWait - TUNING.minWait);
      return { ...state, seed, fishing: { kind: 'waiting', t: 0, biteAt } };
    }
    case 'waiting': {
      if (fishing.t + dt < fishing.biteAt) return { ...state, fishing: { ...fishing, t: fishing.t + dt } };
      const [roll, seed] = random(state.seed);
      return { ...state, seed, fishing: { kind: 'bite', t: 0, fish: pickFish(roll) } };
    }
    case 'bite':
      return { ...state, fishing: { ...fishing, t: fishing.t + dt } };
    case 'idle':
    case 'walking-to-pond':
    case 'caught':
      return state;
  }
}

function move(state: WorldState, axis: Vec2, dt: number): WorldState {
  const axisLength = Math.hypot(axis[0], axis[1]);
  let direction: Vec2 | null = null;
  let route = state.route;
  let fishing = state.fishing;

  if (axisLength > 0.01) {
    direction = [axis[0] / Math.max(1, axisLength), axis[1] / Math.max(1, axisLength)];
    route = [];
    fishing = { kind: 'idle' };
  } else if (route.length > 0) {
    const [tx, tz] = route[0];
    const dx = tx - state.position[0];
    const dz = tz - state.position[1];
    const distance = Math.hypot(dx, dz);
    if (distance <= TUNING.arriveDistance) {
      route = route.slice(1);
    } else {
      const reach = Math.min(1, distance / (TUNING.walkSpeed * dt));
      direction = [(dx / distance) * reach, (dz / distance) * reach];
    }
  }

  let position = state.position;
  let velocity: Vec2 = [0, 0];
  let facing = state.facing;

  if (direction) {
    const delta: Vec2 = [direction[0] * TUNING.walkSpeed * dt, direction[1] * TUNING.walkSpeed * dt];
    const next = slide(position, delta);
    if (next) {
      velocity = [(next[0] - position[0]) / dt, (next[1] - position[1]) / dt];
      position = next;
      facing = turnToward(facing, Math.atan2(delta[0], delta[1]), TUNING.turnRate * dt);
    } else {
      route = [];
      if (fishing.kind === 'walking-to-pond') fishing = { kind: 'idle' };
    }
  }

  if (fishing.kind === 'walking-to-pond' && route.length === 0) {
    fishing = { kind: 'casting', t: 0 };
  }
  if (fishing.kind !== 'idle' && fishing.kind !== 'walking-to-pond' && fishing.kind !== 'caught') {
    facing = turnToward(facing, LAYOUT.fishingFacing, TUNING.turnRate * dt);
  }

  return { ...state, position, velocity, facing, route, fishing };
}

export function step(state: WorldState, input: Input, dt: number): WorldState {
  const clampedDt = Math.max(0, Math.min(TUNING.maxStep, dt));
  let next = input.commands.reduce(applyCommand, state);
  if (clampedDt === 0) return next;
  next = advanceFishing(move(next, input.axis, clampedDt), clampedDt);
  return { ...next, elapsed: next.elapsed + clampedDt };
}

export function describePhase(state: WorldState): string {
  const fishing = state.fishing;
  switch (fishing.kind) {
    case 'idle':
      return 'Wandering the island.';
    case 'walking-to-pond':
      return 'Heading to the dock to fish.';
    case 'casting':
      return 'Casting the line…';
    case 'waiting':
      return 'Waiting quietly. No rush.';
    case 'bite':
      return 'Something is nibbling! Reel in whenever you like.';
    case 'caught':
      return `You caught ${FISH[fishing.fish].name}!`;
  }
}
