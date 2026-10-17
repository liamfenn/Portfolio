import test from "node:test";
import assert from "node:assert/strict";
import { COLLIDE, cursorPull, glyphCollision, gravityFromTilt, scrollKick } from "../src/lib/glyph-physics.ts";
import { DEFAULT_GLYPHS, GLYPH_CONTROLS, parsePalettePreferences } from "../src/lib/palette-toy.ts";

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≈ ${expected}`);

test("catching glyphs land on ledges; falling glyphs pass through them to the floors", () => {
  const catching = glyphCollision(true);
  const falling = glyphCollision(false);
  assert.ok(catching.mask & COLLIDE.ledge);
  assert.ok(!(falling.mask & COLLIDE.ledge));
  assert.ok(catching.mask & COLLIDE.world && falling.mask & COLLIDE.world);
  // Each group stacks on itself, so the two piles don't interleave.
  assert.ok(catching.mask & catching.category && falling.mask & falling.category);
  assert.ok(!(catching.mask & falling.category));
});

test("tilt maps to gravity: upright points down, flat floats, sideways slides", () => {
  const upright = gravityFromTilt(90, 0);
  close(upright.x, 0); close(upright.y, 1);
  const flat = gravityFromTilt(0, 0);
  close(flat.y, 0);
  close(gravityFromTilt(90, 90).x, 1);
  close(gravityFromTilt(90, -30).x, -0.5);
  // Out-of-range readings are capped, and missing ones default to upright.
  close(gravityFromTilt(170, 0).y, 1);
  close(gravityFromTilt(null, null).y, 1);
  close(gravityFromTilt(90, 0, 2).y, 2);
});

test("the cursor pulls glyphs toward it and lets them settle underneath", () => {
  assert.ok(cursorPull(500) > 0 && cursorPull(-500) < 0);
  close(cursorPull(0), 0);
  assert.ok(Math.abs(cursorPull(20)) < Math.abs(cursorPull(200)));
  close(cursorPull(10_000), 0.9);
  close(cursorPull(10_000, 2), 1.8);
});

test("scrolling nudges subtly, lifting on scroll up and capped for flicks", () => {
  assert.ok(scrollKick(-50) < 0);
  assert.ok(scrollKick(50) > 0);
  close(scrollKick(-10_000), -6);
  close(scrollKick(0), 0);
});

test("saved glyph settings are clamped to their controls; unknown or old values fall back", () => {
  const saved = parsePalettePreferences(JSON.stringify({ glyphs: { share: 5, gravity: 1.5, bogus: 3 }, settings: { duration: 900 } }));
  const share = GLYPH_CONTROLS.find(control => control.key === "share");
  assert.equal(saved.glyphs.share, share.max);
  assert.equal(saved.glyphs.gravity, 1.5);
  assert.equal(saved.glyphs.bounce, DEFAULT_GLYPHS.bounce);
  assert.deepEqual(parsePalettePreferences(null).glyphs, DEFAULT_GLYPHS);
});
