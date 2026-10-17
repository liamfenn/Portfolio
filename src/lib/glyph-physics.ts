/** Pure geometry and gesture rules for the footer glyph toy. */
export const SHAPE_PERIOD_MS = 25_000;
export const SHAPES = ["globe", "diamond", "ring", "flower", "heart"] as const;
export type GlyphShape = typeof SHAPES[number];
export type Point = { x: number; y: number };

/** Evenly filled silhouettes; stable indices let each letter morph to its next place. */
export function shapePoint(index: number, count: number, shape: GlyphShape): Point {
  const angle = index * Math.PI * (3 - Math.sqrt(5));
  const fill = Math.sqrt((index + 0.5) / Math.max(1, count));
  let radius = fill;
  if (shape === "ring") radius = 0.72 + fill * 0.28;
  if (shape === "diamond") radius /= Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle));
  if (shape === "flower") radius *= 0.77 + 0.23 * Math.cos(5 * angle);
  if (shape === "heart") {
    return { x: fill * Math.pow(Math.sin(angle), 3), y: -fill * (13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle)) / 17 };
  }
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

export function shapeAt(elapsed: number) {
  return SHAPES[Math.floor(Math.max(0, elapsed) / SHAPE_PERIOD_MS) % SHAPES.length];
}

export function segmentDistance(point: Point, from: Point, to: Point) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const t = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(point.x - from.x - dx * t, point.y - from.y - dy * t);
}

/** Slow passes heal between gestures; repeated fast passes through the shape break it. */
export function agitationAfter(energy: number, elapsedMs: number, distance: number, speed: number) {
  return Math.max(0, energy - elapsedMs * 0.16) + (speed > 0.45 ? Math.min(distance, 120) : 0);
}
export const COLLAPSE_ENERGY = 850;

/** Scroll is a small nudge, never a launch. */
export function scrollKick(deltaY: number, strength = 1) {
  return Math.max(-1.2, Math.min(1.2, deltaY * 0.008 * strength));
}
