import test from "node:test";
import assert from "node:assert/strict";
import { agitationAfter, COLLAPSE_ENERGY, segmentDistance, shapeAt, shapePoint, SHAPES, scrollKick } from "../src/lib/glyph-physics.ts";
import { DEFAULT_GLYPHS, parsePalettePreferences } from "../src/lib/palette-toy.ts";

test("shapes change every 25 seconds and loop through distinct silhouettes", () => {
  assert.equal(shapeAt(24_999), "globe");
  assert.equal(shapeAt(25_000), "diamond");
  assert.equal(shapeAt(125_000), "globe");
  const sets = SHAPES.map(shape => Array.from({ length: 200 }, (_, i) => shapePoint(i, 200, shape)));
  for (const points of sets) for (const p of points) {
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    assert.ok(Math.abs(p.x) <= 1.01 && Math.abs(p.y) <= 1.01);
  }
  assert.notDeepEqual(sets[0], sets[1]);
  assert.ok(sets[2].every(p => Math.hypot(p.x, p.y) >= 0.72));
});
test("drag collision catches fast sweeps between events, including stationary pointers", () => {
  assert.equal(segmentDistance({x:50,y:0},{x:0,y:0},{x:100,y:0}), 0);
  assert.equal(segmentDistance({x:50,y:30},{x:0,y:0},{x:100,y:0}), 30);
  assert.equal(segmentDistance({x:3,y:4},{x:0,y:0},{x:0,y:0}), 5);
});
test("gentle drags recover; repeated fast drags collapse and old agitation decays", () => {
  assert.equal(agitationAfter(0, 16, 100, 0.2), 0);
  let energy = 0;
  for (let i=0;i<10;i++) energy = agitationAfter(energy, 30, 120, 2);
  assert.ok(energy >= COLLAPSE_ENERGY);
  assert.equal(agitationAfter(energy, 10_000, 0, 0), 0);
});
test("scroll response is subtle and capped even during fast flicks", () => {
  assert.equal(scrollKick(100), 0.8);
  assert.equal(scrollKick(100, 0.3), 0.24);
  assert.equal(scrollKick(-10_000), -1.2);
  assert.equal(scrollKick(0), 0);
});
test("saved glyph settings clamp, retain votes and ignore retired orientation settings", () => {
  const saved = parsePalettePreferences(JSON.stringify({ glyphs: { gravity: 8, bounce: -1, share: 0.4, catchChance: 1 }, votes: { "#B9A7E8": true } }));
  assert.equal(saved.glyphs.gravity, 3);
  assert.equal(saved.glyphs.bounce, 0);
  assert.equal(saved.glyphs.share, 0.4);
  assert.equal(saved.votes["#B9A7E8"], true);
  assert.deepEqual(parsePalettePreferences(null).glyphs, DEFAULT_GLYPHS);
});
