import test from "node:test";
import assert from "node:assert/strict";
import Matter from "matter-js";
import { anchorPull, closestOnSegment, pushImpulse, releaseDelay, segmentDistance, swarmCount, wanderForce } from "../src/lib/glyph-physics.ts";
import { DEFAULT_GLYPHS, parsePalettePreferences } from "../src/lib/palette-toy.ts";

test("the swarm takes its share of on-screen letters, capped for long pages", () => {
  assert.equal(swarmCount(0, 0.7), 0);
  assert.equal(swarmCount(100, 0.7), 70);
  assert.equal(swarmCount(5000, 0.7), 520);
  assert.equal(swarmCount(100, 2), 100);
});
test("letters nearest the globe are released first", () => {
  assert.equal(releaseDelay(0, 800), 0);
  assert.ok(releaseDelay(200, 800) < releaseDelay(600, 800));
  assert.equal(releaseDelay(2000, 800), 520);
});
test("segment geometry catches fast sweeps between pointer events", () => {
  assert.equal(segmentDistance({x:50,y:30},{x:0,y:0},{x:100,y:0}), 30);
  assert.equal(segmentDistance({x:3,y:4},{x:0,y:0},{x:0,y:0}), 5);
  assert.deepEqual(closestOnSegment({x:150,y:10},{x:0,y:0},{x:100,y:0}), {x:100,y:0});
});
test("the anchor pulls toward itself and softens close in", () => {
  const far = anchorPull({x:400,y:0}), near = anchorPull({x:20,y:0});
  assert.ok(far.x > 0 && far.y === 0);
  assert.ok(near.x > 0 && near.x < far.x);
  assert.ok(anchorPull({x:0,y:-300}).y < 0);
  assert.deepEqual(anchorPull({x:0,y:0}), {x:0,y:0});
  assert.deepEqual(anchorPull({x:100,y:0}, 0), {x:0,y:0});
});
test("a moving pointer pushes nearby letters away from its path", () => {
  const above = pushImpulse({x:50,y:-20}, {x:40,y:0}, {x:60,y:0});
  assert.ok(above.y < 0, "a letter above the path is pushed up");
  const onPath = pushImpulse({x:50,y:0}, {x:40,y:0}, {x:60,y:0});
  assert.ok(Math.hypot(onPath.x, onPath.y) > 0, "a letter on the path is still moved");
  assert.deepEqual(pushImpulse({x:50,y:-200}, {x:40,y:0}, {x:60,y:0}), {x:0,y:0});
  assert.deepEqual(pushImpulse({x:50,y:-20}, {x:40,y:0}, {x:40,y:0}), {x:0,y:0});
  const slow = pushImpulse({x:50,y:-20}, {x:48,y:0}, {x:52,y:0});
  const fast = pushImpulse({x:50,y:-20}, {x:0,y:0}, {x:100,y:0});
  assert.ok(Math.abs(fast.y) > Math.abs(slow.y), "faster gestures push harder");
});
test("ambient drift stays far weaker than the anchor pull", () => {
  const drift = wanderForce(0.3);
  assert.ok(Math.hypot(drift.x, drift.y) < Math.hypot(anchorPull({x:300,y:0}).x, 0) / 3);
  assert.deepEqual(wanderForce(1, 0), {x:0,y:0});
});
test("saved glyph controls retain votes and clamp values", () => {
  const saved = parsePalettePreferences(JSON.stringify({ glyphs: { pull: 8, bounce: -1, amount: 0.4 }, votes: { "#B9A7E8": true } }));
  assert.equal(saved.glyphs.pull, 3); assert.equal(saved.glyphs.bounce, 0);
  assert.equal(saved.glyphs.amount, 0.4); assert.equal(saved.votes["#B9A7E8"], true);
  assert.deepEqual(parsePalettePreferences(null).glyphs, DEFAULT_GLYPHS);
});

test("a pushed letter floats back to the anchor in zero gravity", () => {
  const { Engine, Bodies, Body, Composite } = Matter;
  const engine = Engine.create(); engine.gravity.y = 0;
  const anchor = { x: 300, y: 300 };
  const glyph = Bodies.rectangle(300, 300, 8, 10, { frictionAir: 0.035 });
  Composite.add(engine.world, glyph);
  Body.setVelocity(glyph, pushImpulse(glyph.position, {x:260,y:300}, {x:300,y:300}));
  for (let i = 0; i < 20; i++) Engine.update(engine, 1000 / 60);
  const pushed = Math.hypot(glyph.position.x - anchor.x, glyph.position.y - anchor.y);
  assert.ok(pushed > 20, "the push should move the letter clear of the anchor");
  for (let i = 0; i < 600; i++) {
    const pull = anchorPull({ x: anchor.x - glyph.position.x, y: anchor.y - glyph.position.y });
    Body.applyForce(glyph, glyph.position, { x: pull.x * glyph.mass, y: pull.y * glyph.mass });
    Engine.update(engine, 1000 / 60);
  }
  assert.ok(Math.hypot(glyph.position.x - anchor.x, glyph.position.y - anchor.y) < pushed / 2, "the letter should drift back");
  Engine.clear(engine);
});
