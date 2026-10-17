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

/** A moving brush lifts settled glyphs clear of floor friction, even during a slow hover pass. */
export function brushImpulse(position: Point, from: Point, to: Point, strength = 1) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const travel = Math.hypot(dx, dy);
  const distance = segmentDistance(position, from, to);
  if (travel < 0.15 || distance >= 44 || strength <= 0) return { x: 0, y: 0, spin: 0 };
  const weight = Math.pow(1 - distance / 44, 0.65) * Math.min(3, strength);
  const side = Math.abs(dx) > 0.3 ? Math.sign(dx) : Math.sign(position.x - to.x) || 1;
  return {
    x: side * Math.min(10, 2.5 + travel * 0.14) * weight,
    y: (Math.max(-7, Math.min(3, dy * 0.14)) - 2.4) * weight,
    spin: side * 0.035 * weight,
  };
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
