/**
 * Pure rules for the glyph drop's physics drivers, kept apart from the DOM and Matter.js so they can be tested.
 * Forces are in units of gravity: 1 means as strong as gravity's pull.
 */

/** Collision groups: catching glyphs land on ledges (the project cards); the rest fall past to the floors. */
export const COLLIDE = { world: 0x1, ledge: 0x2, catching: 0x4, falling: 0x8 } as const;

export function glyphCollision(catches: boolean) {
  return catches
    ? { category: COLLIDE.catching, mask: COLLIDE.world | COLLIDE.ledge | COLLIDE.catching }
    : { category: COLLIDE.falling, mask: COLLIDE.world | COLLIDE.falling };
}

/**
 * Phone tilt to gravity. gamma tilts left/right, beta tilts toward/away from you; held upright, gravity points
 * down the screen, and laid flat it fades out. Each axis is capped at `strength`.
 */
export function gravityFromTilt(beta: number | null, gamma: number | null, strength = 1) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  return {
    x: Math.sin(radians(Math.max(-90, Math.min(90, gamma ?? 0)))) * strength,
    y: Math.sin(radians(Math.max(-90, Math.min(90, beta ?? 90)))) * strength,
  };
}

/**
 * Sideways pull toward the cursor, in units of gravity. Full strength beyond `reach` px, easing to zero as a
 * glyph comes under the cursor so it settles there instead of oscillating.
 */
export function cursorPull(dx: number, strength = 1, reach = 240) {
  return Math.max(-1, Math.min(1, dx / reach)) * 0.9 * strength;
}

/**
 * Velocity nudge from a scroll step: scrolling up (negative delta) lifts glyphs a little, like loose things in a
 * moving box; scrolling down presses them into what they rest on. Capped so fast flicks stay subtle.
 */
export function scrollKick(deltaY: number, strength = 1) {
  return Math.max(-6, Math.min(6, deltaY * 0.04 * strength));
}
