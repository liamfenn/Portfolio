import test from "node:test";
import assert from "node:assert/strict";
import Matter from "matter-js";
import { brushImpulse, cursorAttraction, flingVelocity, initialReleaseCount, segmentDistance, scrollKick } from "../src/lib/glyph-physics.ts";
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
test("a slow hover lifts and pushes resting letters without any button state", () => {
  const impulse = brushImpulse({x:12,y:10}, {x:0,y:10}, {x:3,y:10});
  assert.ok(impulse.x > 2 && impulse.y < -2);
  const reverse = brushImpulse({x:12,y:10}, {x:20,y:10}, {x:17,y:10});
  assert.ok(reverse.x < 0 && reverse.y < 0);
  assert.deepEqual(brushImpulse({x:12,y:100}, {x:0,y:10}, {x:3,y:10}), {x:0,y:0,spin:0});
  assert.deepEqual(brushImpulse({x:12,y:10}, {x:0,y:10}, {x:0,y:10}), {x:0,y:0,spin:0});
  assert.deepEqual(brushImpulse({x:12,y:10}, {x:0,y:10}, {x:3,y:10}, 0), {x:0,y:0,spin:0});
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

test("a hover brush actually lifts a settled physics body off the player floor", () => {
  const { Engine, Bodies, Body, Composite } = Matter;
  const engine = Engine.create(); engine.gravity.y = 0.65;
  const floor = Bodies.rectangle(300, 110, 600, 20, { isStatic:true, friction:0.85 });
  const glyph = Bodies.rectangle(200, 70, 8, 12, { friction:0.55, frictionStatic:1, frictionAir:0.018 });
  Composite.add(engine.world, [floor,glyph]);
  for(let i=0;i<180;i++) Engine.update(engine,1000/60);
  const before = { ...glyph.position };
  const impulse = brushImpulse(glyph.position, {x:before.x-4,y:before.y}, {x:before.x-1,y:before.y});
  Body.setVelocity(glyph, {x:impulse.x,y:impulse.y});
  for(let i=0;i<3;i++) Engine.update(engine,1000/60);
  assert.ok(glyph.position.y < before.y - 2, "hover should lift a resting glyph");
  assert.ok(glyph.position.x > before.x + 2, "hover should push a resting glyph sideways");
  Engine.clear(engine);
});
