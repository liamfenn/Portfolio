import test from "node:test";
import assert from "node:assert/strict";
import { PROJECTS, SPIN_MS, appear, reelLayout, rowAngle, scrollOffset, scrollSpeed, speedIntensity, vanish } from "../src/lib/og-reel.ts";

test("the wheel drifts slowly at first, then ramps up from about midway, never pausing", () => {
  assert.equal(scrollOffset(0), 0);
  assert.ok(scrollSpeed(SPIN_MS * 0.25) < 200);
  assert.ok(scrollSpeed(SPIN_MS) > 5000);
  for (let ms = 100; ms <= SPIN_MS; ms += 100) {
    assert.ok(scrollSpeed(ms) >= scrollSpeed(ms - 100));
    assert.ok(scrollOffset(ms) > scrollOffset(ms - 100));
  }
  // Most of the speed comes in the second half.
  assert.ok(scrollSpeed(SPIN_MS / 2) < scrollSpeed(SPIN_MS) / 4);
});

test("the spin blurs only once it is moving fast", () => {
  assert.equal(speedIntensity(70), 0);
  assert.ok(speedIntensity(300) < 0.1);
  assert.equal(speedIntensity(2000), 1);
});

test("the wheel eases in from slightly small and clear, and eases out the same way", () => {
  assert.deepEqual(appear(0), { scale: 0.92, opacity: 0 });
  assert.deepEqual(appear(10000), { scale: 1, opacity: 1 });
  assert.deepEqual(vanish(0), appear(10000));
  assert.deepEqual(vanish(1), appear(0));
  assert.ok(appear(100).opacity > 0.4);
});

test("twelve projects: six rows of two on a wide card, twelve in one column with 60px margins on a tall one", () => {
  assert.deepEqual(reelLayout(1200, 675), { columns: 2, rows: 6, size: 469.33, gap: 8 });
  assert.deepEqual(reelLayout(675, 1200), { columns: 1, rows: 12, size: 555, gap: 8 });
  for (const layout of [reelLayout(1200, 675), reelLayout(675, 1200)]) assert.equal(layout.rows * layout.columns, PROJECTS);
});

test("rows sit round the wheel, the first at the front, coming round again after the last", () => {
  const layout = reelLayout(1200, 675), pitch = layout.size + layout.gap;
  assert.ok(Math.abs(rowAngle(0, 0, layout)) < 1e-9);
  assert.ok(Math.abs(rowAngle(1, 0, layout) - Math.PI / 3) < 1e-9);
  assert.ok(Math.abs(rowAngle(0, pitch * layout.rows, layout)) < 1e-9);
  for (let offset = 0; offset < 5000; offset += 137) for (let row = 0; row < layout.rows; row++) {
    const angle = rowAngle(row, offset, layout);
    assert.ok(angle > -Math.PI - 1e-9 && angle <= Math.PI + 1e-9);
  }
});
