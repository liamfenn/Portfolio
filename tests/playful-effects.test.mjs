import test from "node:test";
import assert from "node:assert/strict";
import { cursorAttraction, flingVelocity, initialReleaseCount, segmentDistance, scrollKick } from "../src/lib/glyph-physics.ts";
import { DEFAULT_GLYPHS, parsePalettePreferences } from "../src/lib/palette-toy.ts";

test("activation releases only a few letters even on a long page", () => {
  assert.equal(initialReleaseCount(0), 0);
  assert.equal(initialReleaseCount(80), 2);
  assert.equal(initialReleaseCount(5000), 6);
});
test("drag collision catches fast sweeps between events and stationary pointers", () => {
  assert.equal(segmentDistance({x:50,y:0},{x:0,y:0},{x:100,y:0}), 0);
  assert.equal(segmentDistance({x:50,y:30},{x:0,y:0},{x:100,y:0}), 30);
  assert.equal(segmentDistance({x:3,y:4},{x:0,y:0},{x:0,y:0}), 5);
});
test("the initial fling follows the gesture with upward lift and capped speed", () => {
  const fling = flingVelocity({x:20,y:0}, () => 0.5);
  assert.ok(fling.x > 0 && fling.y < 0);
  const fast = flingVelocity({x:10000,y:-10000}, () => 0.5);
  assert.ok(fast.x <= 14 && fast.y >= -16);
  assert.ok(flingVelocity({x:0,y:0}, () => 0.5).y < 0);
});
test("cursor attraction is local, gentle, and weaker vertically than default gravity", () => {
  assert.deepEqual(cursorAttraction({x:400,y:0}), {x:0,y:0});
  assert.deepEqual(cursorAttraction({x:0,y:0}), {x:0,y:0});
  assert.ok(cursorAttraction({x:100,y:0}).x > 0);
  assert.ok(cursorAttraction({x:-100,y:0}).x < 0);
  assert.ok(Math.abs(cursorAttraction({x:0,y:-100},3).y) < 0.00065);
});
test("scroll response stays subtle and capped", () => {
  assert.equal(scrollKick(100, 0.3), 0.24);
  assert.equal(scrollKick(-10_000), -1.2);
});
test("saved glyph controls retain votes and clamp values", () => {
  const saved = parsePalettePreferences(JSON.stringify({ glyphs: { gravity: 8, bounce: -1, share: 0.4 }, votes: { "#B9A7E8": true } }));
  assert.equal(saved.glyphs.gravity, 3); assert.equal(saved.glyphs.bounce, 0);
  assert.equal(saved.glyphs.share, 0.4); assert.equal(saved.votes["#B9A7E8"], true);
  assert.deepEqual(parsePalettePreferences(null).glyphs, DEFAULT_GLYPHS);
});
