import test from "node:test";
import assert from "node:assert/strict";
import { commitsPage, pagingIntent } from "../src/lib/project-paging.ts";

test("paging intent waits for deliberate horizontal motion and leaves vertical gestures to scrolling", () => {
  assert.equal(pagingIntent(5, 3, 8), "pending");
  assert.equal(pagingIntent(12, 11, 8), "vertical");
  assert.equal(pagingIntent(-40, 10, 8), "horizontal");
  assert.equal(pagingIntent(20, -80, 8), "vertical");
});

test("paging commits sufficient travel or a deliberate flick in either direction", () => {
  for (const sign of [-1, 1]) {
    assert.equal(commitsPage(sign * 80, 393, 0, 8), true);
    assert.equal(commitsPage(sign * 30, 393, sign * 0.8, 8), true);
    assert.equal(commitsPage(sign * 20, 393, sign * 2, 8), false);
    assert.equal(commitsPage(sign * 45, 393, 0.1, 8), false);
  }
});

test("a reversed short drag snaps back instead of using stale flick velocity", () => {
  assert.equal(commitsPage(35, 393, -0.8, 8), false);
  assert.equal(commitsPage(-35, 393, 0.8, 8), false);
});
