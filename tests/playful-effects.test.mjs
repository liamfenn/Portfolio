import test from "node:test";
import assert from "node:assert/strict";
import { settlePile } from "../src/lib/glyph-pile.ts";
import { nextDirection, stepCell } from "../src/lib/pixel-snake.ts";

const seeded = seed => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

test("glyphs pile without overlapping or floating, inside the floor", () => {
  const random = seeded(7);
  const glyphs = Array.from({ length: 300 }, () => ({ x: random() * 400, width: 6 + random() * 6, height: 18 }));
  const spots = settlePile(glyphs, 400, 4, seeded(3));
  const boxes = spots.map((spot, index) => ({ left: spot.x, right: spot.x + glyphs[index].width, bottom: spot.y, top: spot.y + glyphs[index].height }));
  for (const [index, box] of boxes.entries()) {
    assert.ok(box.left >= 0 && box.right <= 400 + 4, `glyph ${index} stays on the floor`);
    // Resting on the floor or on top of an earlier glyph it overlaps horizontally.
    const support = box.bottom === 0 || boxes.slice(0, index).some(other => other.top === box.bottom && other.left < box.right && other.right > box.left);
    assert.ok(support, `glyph ${index} is supported`);
    for (const other of boxes.slice(0, index)) {
      const overlaps = other.left < box.right - 4 && other.right > box.left + 4 && other.bottom < box.top && other.top > box.bottom;
      assert.ok(!overlaps, `glyph ${index} doesn't overlap an earlier glyph`);
    }
  }
});

test("a pile spreads into a mound rather than a single tower", () => {
  const glyphs = Array.from({ length: 120 }, () => ({ x: 200, width: 8, height: 18 }));
  const spots = settlePile(glyphs, 400, 4, seeded(11));
  const tallest = Math.max(...spots.map(spot => spot.y)) + 18;
  assert.ok(tallest < 120 * 18 / 4, `mound is ${tallest}px tall, not a ${120 * 18}px tower`);
  const xs = spots.map(spot => spot.x);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 80, "glyphs slid out to the sides");
});

test("the snake wraps around the edges", () => {
  assert.deepEqual(stepCell({ x: 0, y: 3 }, "left", 10, 8), { x: 9, y: 3 });
  assert.deepEqual(stepCell({ x: 4, y: 7 }, "down", 10, 8), { x: 4, y: 0 });
});

test("the snake never reverses, follows steering, and avoids its body when it can", () => {
  const base = { head: { x: 5, y: 5 }, columns: 20, rows: 20, body: [{ x: 4, y: 5 }] };
  for (let seed = 1; seed < 200; seed++) {
    const direction = nextDirection({ ...base, direction: "right", random: seeded(seed) });
    assert.notEqual(direction, "left");
  }
  assert.equal(nextDirection({ ...base, direction: "right", steer: "up" }), "up");
  assert.equal(nextDirection({ ...base, direction: "right", steer: "left", random: () => 0.9 }), "right");
  // Body directly ahead and above: the only free move is down.
  const boxed = { head: { x: 5, y: 5 }, columns: 20, rows: 20, body: [{ x: 4, y: 5 }, { x: 6, y: 5 }, { x: 5, y: 4 }] };
  for (let seed = 1; seed < 50; seed++) {
    assert.equal(nextDirection({ ...boxed, direction: "right", random: seeded(seed) }), "down");
  }
});
