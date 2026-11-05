import test from "node:test";
import assert from "node:assert/strict";
import { advanceHandoff, cssDurationMs, handoffLine, handoffOffset } from "../src/lib/header-handoff.ts";

test("flight duration reads the token in either unit a minifier leaves it in", () => {
  assert.equal(cssDurationMs("360ms"), 360);
  assert.equal(cssDurationMs(".36s"), 360);
  assert.equal(cssDurationMs(" .36s "), 360);
});

test("the handoff line is where the toolbar's center meets the bar's center", () => {
  const line = handoffLine(24, 32, 20);
  assert.equal(line, 50);
  assert.equal(line - 20 / 2, 24 + 32 / 2);
});

test("handoff progress stops at its target and can reverse midway", () => {
  assert.equal(advanceHandoff(0.9, 1, 0.5), 1);
  assert.equal(advanceHandoff(0.1, 0, 0.5), 0);
  assert.equal(advanceHandoff(0.5, 1, 0.25), 0.75);
  assert.equal(advanceHandoff(0.75, 0, 0.25), 0.5);
});

test("the filter starts on the page control and lands exactly in its dock", () => {
  const page = { left: 448, top: 30, height: 20 };
  const dock = { left: 497, top: 24, height: 32 };
  assert.deepEqual(handoffOffset(page, dock, 0), { x: -49, y: 0 });
  assert.deepEqual(handoffOffset(page, dock, 1), { x: -0, y: 0 });
  assert.equal(handoffOffset(page, dock, 0.5).x, -24.5);
});

test("the offset follows the page control when it moves mid-flight", () => {
  const dock = { left: 497, top: 24, height: 32 };
  assert.equal(handoffOffset({ left: 448, top: 130, height: 20 }, dock, 0).y, 100);
});
