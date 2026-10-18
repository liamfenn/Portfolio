/** Pure motion rules for the letter swarm. Forces are per unit mass; the engine multiplies by each body's mass. */
export type Point = { x: number; y: number };

const PULL = 0.00028;
const PUSH_RADIUS = 64;
const WANDER = 0.00005;

/** How many on-screen letters join the swarm. A cap keeps text-heavy screens smooth. */
export function swarmCount(visibleLetters: number, share: number, cap = 520) {
  return Math.min(cap, Math.round(Math.max(0, visibleLetters) * Math.max(0, Math.min(1, share))));
}

/** Letters nearest the globe leave first, so the pull ripples outward across the page. */
export function releaseDelay(distance: number, farthest: number, spread = 520) {
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

/** The anchor is the swarm's gravity. Close in, the pull softens so letters settle around it instead of onto one point. */
export function anchorPull(delta: Point, strength = 1): Point {
  const distance = Math.hypot(delta.x, delta.y);
  if (distance < 1 || strength <= 0) return { x: 0, y: 0 };
  const weight = PULL * Math.min(3, strength) * Math.max(0.2, Math.min(1, distance / 160));
  return { x: delta.x / distance * weight, y: delta.y / distance * weight };
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

/** A slow, wandering force that keeps a resting swarm churning. */
export function wanderForce(angle: number, strength = 1): Point {
  const weight = WANDER * Math.max(0, Math.min(3, strength));
  return { x: Math.cos(angle) * weight, y: Math.sin(angle) * weight };
}
