import test from "node:test";
import assert from "node:assert/strict";
import { glitchLetters } from "../src/lib/color-glitch.ts";

test("hover flashes never exceed 60% of a label, including short links", () => {
  for (let length = 0; length < 100; length++) {
    for (const random of [() => 0, () => 0.5, () => 0.999999]) {
      const selected = glitchLetters(length, 0.6, 3, random);
      assert.ok(selected.length <= Math.floor(length * 0.6));
      assert.ok(selected.length <= 3);
      assert.equal(new Set(selected).size, selected.length);
      assert.ok(selected.every(index => index >= 0 && index < length));
      if (length >= 2) assert.ok(selected.length > 0);
    }
  }
});

test("different random choices flash different letter positions", () => {
  assert.deepEqual(glitchLetters(10, 0.6, 3, () => 0), [0]);
  assert.deepEqual(glitchLetters(10, 0.6, 3, () => 0.999999), [9, 8, 7]);
});

test("globe hover increases density without exceeding the shared fraction cap", () => {
  for (const length of [12, 24]) {
    for (const random of [() => 0, () => 0.5, () => 0.999999]) {
      const selected = glitchLetters(length, 0.6, 6, random, 4);
      assert.ok(selected.length >= 4 && selected.length <= 6);
      assert.ok(selected.length <= Math.floor(length * 0.6));
      assert.equal(new Set(selected).size, selected.length);
    }
  }
});
