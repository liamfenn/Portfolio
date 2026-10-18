/** Pure motion rules for the letter swarm. Forces are per unit mass; the engine multiplies by each body's mass. */
export type Point = { x: number; y: number };

const PULL = 0.00028;
const POCKET = 34;
/** The room each letter keeps around itself, in px. */
export const SPACING = 22;
const SEPARATION = 0.00022;
const PUSH_RADIUS = 64;
const WANDER = 0.00005;

/** How many on-screen letters join the swarm. A cap keeps text-heavy screens smooth. */
export function swarmCount(visibleLetters: number, share: number, cap = 520) {
  return Math.min(cap, Math.round(Math.max(0, visibleLetters) * Math.max(0, Math.min(1, share))));
}

/** Letters nearest the globe leave first, so the pull ripples outward across the page. */
export function releaseDelay(distance: number, farthest: number, spread = 280) {
  return spread * Math.min(1, Math.max(0, distance) / Math.max(1, farthest));
}

export function closestOnSegment(point: Point, from: Point, to: Point): Point {
  const dx = to.x - from.x, dy = to.y - from.y;
  const t = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / (dx * dx + dy * dy || 1)));
  return { x: from.x + dx * t, y: from.y + dy * t };
}

export function segmentDistance(point: Point, from: Point, to: Point) {
  const near = closestOnSegment(point, from, to);
  return Math.hypot(point.x - near.x, point.y - near.y);
}

/** The zone around the anchor that a swarm of this size floats in, given the room each letter keeps around itself. */
export function zoneRadius(letters: number, spacing = SPACING) {
  return Math.max(60, Math.sqrt(Math.max(0, letters) * spacing * spacing / Math.PI));
}

/**
 * The pull toward a letter's spot in the zone. Inside the zone it is a faint centring drift, so letters wander
 * freely and only neighbour spacing shapes the cloud; past the edge it gently firms up to bring strays back.
 */
export function zoneForce(delta: Point, radius: number, strength = 1): Point {
  const distance = Math.hypot(delta.x, delta.y);
  if (distance < 1 || strength <= 0) return { x: 0, y: 0 };
  const outside = Math.max(0, distance - radius);
  const weight = PULL * Math.min(3, strength) * (0.12 * Math.min(1, distance / radius) + Math.min(1, outside / 220));
  return { x: delta.x / distance * weight, y: delta.y / distance * weight };
}

/** A small pocket that stays clear (around the cursor, or around Esc), so it is never buried. Pushes away from its centre. */
export function pocketForce(fromCenter: Point, radius = POCKET): Point {
  const distance = Math.hypot(fromCenter.x, fromCenter.y);
  if (distance < 0.5 || distance >= radius) return { x: 0, y: 0 };
  const weight = PULL * 1.6 * (1 - distance / radius);
  return { x: fromCenter.x / distance * weight, y: fromCenter.y / distance * weight };
}

/**
 * How strongly a letter is being drawn in, by its age. It floats free at first, then a suction fades in over its
 * own ramp and carries it across the screen, then relaxes to the swarm's loose ambient pull.
 */
export function captureStrength(age: number, floatMs: number, captureMs: number, suction = 1.8, settleMs = 1600) {
  const capture = smoothstep((age - floatMs) / captureMs);
  return capture * (1 + suction * (1 - smoothstep((age - floatMs - captureMs) / settleMs)));
}

/** Eases 0 → 1 with a soft start and finish; used to fade each letter's pull in at its own pace. */
export function smoothstep(t: number) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/** Neighbours closer than the spacing ease apart, so the swarm stays a loose cloud instead of one packed shape. */
export function separationForce(dx: number, dy: number, spacing = SPACING): Point {
  const distance = Math.hypot(dx, dy);
  if (distance >= spacing) return { x: 0, y: 0 };
  // Exactly overlapping letters still need a direction to separate in.
  const away = distance > 0.01 ? { x: dx / distance, y: dy / distance } : { x: 1, y: 0 };
  const weight = SEPARATION * (1 - distance / spacing);
  return { x: away.x * weight, y: away.y * weight };
}

/** A moving pointer shoves letters out of its path; faster gestures shove harder. Returns a velocity change. */
export function pushImpulse(position: Point, from: Point, to: Point, strength = 1): Point {
  const mx = to.x - from.x, my = to.y - from.y, travel = Math.hypot(mx, my);
  if (travel < 0.5 || strength <= 0) return { x: 0, y: 0 };
  const near = closestOnSegment(position, from, to);
  const ox = position.x - near.x, oy = position.y - near.y, distance = Math.hypot(ox, oy);
  if (distance >= PUSH_RADIUS) return { x: 0, y: 0 };
  // A letter exactly on the path is pushed to one side of it.
  const away = distance > 0.5 ? { x: ox / distance, y: oy / distance } : { x: -my / travel, y: mx / travel };
  const weight = Math.pow(1 - distance / PUSH_RADIUS, 0.7) * Math.min(3, strength);
  const speed = Math.min(9, 1.5 + travel * 0.22);
  return {
    x: (away.x + mx / travel * 0.35) * speed * weight,
    y: (away.y + my / travel * 0.35) * speed * weight,
  };
}

/** Where a letter enters the swarm: its own spot, or the nearest screen edge when it lives off screen. */
export function entryPoint(point: Point, width: number, height: number, inset = 8): Point {
  return { x: Math.max(inset, Math.min(width - inset, point.x)), y: Math.max(inset, Math.min(height - inset, point.y)) };
}

/** One step of a critically damped spring: a smooth glide that keeps the current velocity and never overshoots. */
export function springStep(position: number, velocity: number, target: number, omega: number, dt: number) {
  const next = velocity + (omega * omega * (target - position) - 2 * omega * velocity) * dt;
  return { position: position + next * dt, velocity: next };
}

/** A slow, wandering force that keeps a resting swarm churning. */
export function wanderForce(angle: number, strength = 1): Point {
  const weight = WANDER * Math.max(0, Math.min(3, strength));
  return { x: Math.cos(angle) * weight, y: Math.sin(angle) * weight };
}
