import test from "node:test";
import assert from "node:assert/strict";
import { emergeScale, popScale, pumpScale, rewind, shuffled, turnBetween } from "../src/lib/og-burst.ts";

test("a pump squeezes first, springs past full size, and rings out to rest", () => {
  assert.equal(pumpScale(0), 1);
  assert.ok(pumpScale(70) < 0.85);
  assert.ok(Math.max(...[180, 200, 220, 240].map(pumpScale)) > 1);
  assert.ok(Math.abs(pumpScale(1500) - 1) < 0.01);
});

test("a pumped character grows from nothing past full size, then settles", () => {
  assert.equal(emergeScale(0), 0);
  assert.ok(emergeScale(175) > 1.1);
  assert.ok(Math.abs(emergeScale(1200) - 1) < 0.01);
});

test("rewind plays a path from its last sample back to its first", () => {
  const path = [{ x: 0, y: 0, angle: 0 }, { x: 10, y: -20, angle: 0.5 }, { x: 30, y: -40, angle: 1 }];
  assert.deepEqual(rewind(path, 0), path[2]);
  assert.deepEqual(rewind(path, 1), path[0]);
  const middle = rewind(path, 0.5);
  assert.equal(middle.x, 10); assert.equal(middle.y, -20);
  assert.deepEqual(rewind([], 0.5), { x: 0, y: 0, angle: 0 });
});

test("the way home turns the short way, however many times a letter spun", () => {
  assert.ok(Math.abs(turnBetween(0, Math.PI / 2) - Math.PI / 2) < 1e-9);
  assert.ok(Math.abs(turnBetween(Math.PI * 6 + 0.2, 0) + 0.2) < 1e-9);
  assert.ok(Math.abs(turnBetween(0.1, Math.PI * 2 - 0.1) + 0.2) < 1e-9);
});

test("the pumped-character bag holds every character exactly once, leaving the source alone", () => {
  const chars = Array.from("@,.;:!?&");
  const bag = shuffled(chars);
  assert.deepEqual([...bag].sort(), [...chars].sort());
  assert.deepEqual(chars, Array.from("@,.;:!?&"));
});

test("a pumped character pops: it swells fast, easing out, then is gone rather than fading", () => {
  assert.equal(popScale(0), 1);
  assert.ok(popScale(60) > 1.3);
  assert.ok(popScale(119) > popScale(60));
  assert.equal(popScale(120), null);
});
