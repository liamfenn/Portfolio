/** Pure gesture rules for the loose-type toy. */
export type Point = { x: number; y: number };

export function initialReleaseCount(visibleLetters: number) {
  return Math.min(6, Math.ceil(Math.max(0, visibleLetters) * 0.025));
}

export function segmentDistance(point: Point, from: Point, to: Point) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const t = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(point.x - from.x - dx * t, point.y - from.y - dy * t);
}

/** Enough initial movement to tumble; fast gestures add a stronger, capped fling. */
export function flingVelocity(delta: Point, random = Math.random): Point {
  return { x: Math.max(-12, Math.min(12, delta.x * 0.2)) + (random() - 0.5) * 4,
    y: Math.max(-10, Math.min(5, delta.y * 0.14)) - 3 - random() * 3 };
}

/** A nearby cursor gently tugs loose letters; gravity remains stronger than the vertical pull. */
export function cursorAttraction(delta: Point, strength = 1): Point {
  const distance = Math.hypot(delta.x, delta.y);
  if (distance < 8 || distance > 340) return { x: 0, y: 0 };
  const weight = (1 - distance / 340) * Math.min(1, distance / 70) * Math.min(3, strength);
  return { x: delta.x / distance * weight * 0.00022, y: delta.y / distance * weight * 0.00016 };
}

/** Scroll is a small nudge, never a launch. */
export function scrollKick(deltaY: number, strength = 1) {
  return Math.max(-1.2, Math.min(1.2, deltaY * 0.008 * strength));
}
