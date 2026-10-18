import test from "node:test";
import assert from "node:assert/strict";
import Matter from "matter-js";
import { captureStrength, closestOnSegment, entryPoint, pocketForce, smoothstep, pushImpulse, releaseDelay, segmentDistance, separationForce, springStep, swarmCount, wanderForce, zoneForce, zoneRadius } from "../src/lib/glyph-physics.ts";
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
  assert.equal(releaseDelay(2000, 800), 280);
});
test("segment geometry catches fast sweeps between pointer events", () => {
  assert.equal(segmentDistance({x:50,y:30},{x:0,y:0},{x:100,y:0}), 30);
  assert.equal(segmentDistance({x:3,y:4},{x:0,y:0},{x:0,y:0}), 5);
  assert.deepEqual(closestOnSegment({x:150,y:10},{x:0,y:0},{x:100,y:0}), {x:100,y:0});
});
test("the zone is faint inside and firms up past its edge", () => {
  const radius = 150;
  const inside = zoneForce({x:100,y:0}, radius), outside = zoneForce({x:400,y:0}, radius);
  assert.ok(inside.x > 0 && outside.x > inside.x * 3, "strays past the edge are pulled back much harder");
  assert.deepEqual(zoneForce({x:0,y:0}, radius), {x:0,y:0});
  assert.deepEqual(zoneForce({x:300,y:0}, radius, 0), {x:0,y:0});
});
test("letters right at the cursor are eased out of its pocket", () => {
  assert.ok(pocketForce({x:10,y:0}).x > 0);
  assert.ok(pocketForce({x:0,y:-10}).y < 0);
  assert.deepEqual(pocketForce({x:80,y:0}), {x:0,y:0});
});
test("a letter floats free, is sucked in, then relaxes to the ambient pull", () => {
  assert.equal(captureStrength(200, 500, 800), 0, "still floating");
  const suction = captureStrength(1300, 500, 800);
  assert.ok(suction > 1.5, "suction is stronger than the resting pull");
  assert.ok(Math.abs(captureStrength(10_000, 500, 800) - 1) < 1e-9, "settles back to the resting pull");
});
test("each letter's pull fades in smoothly", () => {
  assert.equal(smoothstep(-1), 0); assert.equal(smoothstep(2), 1); assert.equal(smoothstep(0.5), 0.5);
  assert.ok(smoothstep(0.1) < 0.1, "a soft start");
});
test("the zone grows with the swarm and the spacing", () => {
  assert.ok(zoneRadius(240) > zoneRadius(60));
  assert.ok(zoneRadius(240, 30) > zoneRadius(240, 20));
  assert.equal(zoneRadius(0), 60);
});
test("neighbours ease apart only inside the spacing", () => {
  assert.ok(separationForce(5, 0, 22).x > 0);
  assert.ok(separationForce(5, 0, 22).x > separationForce(15, 0, 22).x);
  assert.deepEqual(separationForce(30, 0, 22), {x:0,y:0});
  assert.ok(separationForce(0, 0, 22).x > 0, "overlapping letters still separate");
});
test("off-screen letters enter from the nearest screen edge", () => {
  assert.deepEqual(entryPoint({x:200,y:-500}, 800, 600), {x:200,y:8});
  assert.deepEqual(entryPoint({x:900,y:1400}, 800, 600), {x:792,y:592});
  assert.deepEqual(entryPoint({x:300,y:300}, 800, 600), {x:300,y:300});
});
test("the exit spring settles on its target without overshooting", () => {
  let state = { position: 0, velocity: 0 }, peak = 0;
  for (let i = 0; i < 120; i++) { state = springStep(state.position, state.velocity, 100, 10, 1 / 60); peak = Math.max(peak, state.position); }
  assert.ok(Math.abs(state.position - 100) < 0.5);
  assert.ok(peak <= 100.01);
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
  assert.ok(Math.hypot(drift.x, drift.y) < zoneForce({x:300,y:0}, 150).x / 3);
  assert.deepEqual(wanderForce(1, 0), {x:0,y:0});
});
test("saved glyph controls retain votes and clamp values", () => {
  const saved = parsePalettePreferences(JSON.stringify({ glyphs: { pull: 8, bounce: -1, amount: 0.4 }, votes: { "#B9A7E8": true } }));
  assert.equal(saved.glyphs.pull, 3); assert.equal(saved.glyphs.bounce, 0);
  assert.equal(saved.glyphs.amount, 0.4); assert.equal(saved.votes["#B9A7E8"], true);
  assert.deepEqual(parsePalettePreferences(null).glyphs, DEFAULT_GLYPHS);
});

test("a pushed letter floats back into the zone in zero gravity", () => {
  const { Engine, Bodies, Body, Composite } = Matter;
  const engine = Engine.create(); engine.gravity.y = 0;
  const anchor = { x: 300, y: 300 }, radius = 80;
  const glyph = Bodies.rectangle(340, 300, 8, 10, { frictionAir: 0.035 });
  Composite.add(engine.world, glyph);
  Body.setVelocity(glyph, pushImpulse(glyph.position, {x:300,y:300}, {x:330,y:300}, 3));
  for (let i = 0; i < 30; i++) Engine.update(engine, 1000 / 60);
  const pushed = Math.hypot(glyph.position.x - anchor.x, glyph.position.y - anchor.y);
  assert.ok(pushed > radius, "the push should carry the letter out of the zone");
  for (let i = 0; i < 600; i++) {
    const pull = zoneForce({ x: anchor.x - glyph.position.x, y: anchor.y - glyph.position.y }, radius);
    Body.applyForce(glyph, glyph.position, { x: pull.x * glyph.mass, y: pull.y * glyph.mass });
    Engine.update(engine, 1000 / 60);
  }
  assert.ok(Math.hypot(glyph.position.x - anchor.x, glyph.position.y - anchor.y) < radius, "the letter should float back inside the zone");
  Engine.clear(engine);
});
