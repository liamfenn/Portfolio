import test from "node:test";
import assert from "node:assert/strict";
import { linkGlitchLetters } from "../src/lib/link-hover-glitch.ts";

test("hover flashes never exceed 60% of a label, including short links", () => {
  for (let length = 0; length < 100; length++) {
    for (const random of [() => 0, () => 0.5, () => 0.999999]) {
      const selected = linkGlitchLetters(length, 0.6, 3, random);
      assert.ok(selected.length <= Math.floor(length * 0.6));
      assert.ok(selected.length <= 3);
      assert.equal(new Set(selected).size, selected.length);
      assert.ok(selected.every(index => index >= 0 && index < length));
      if (length >= 2) assert.ok(selected.length > 0);
    }
  }
});

test("different random choices flash different letter positions", () => {
  assert.deepEqual(linkGlitchLetters(10, 0.6, 3, () => 0), [0]);
  assert.deepEqual(linkGlitchLetters(10, 0.6, 3, () => 0.999999), [9, 8, 7]);
});
