import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SHOP_MARK_PATH, projectShopPoint, shopPoints } from "../src/lib/glyph-shop.ts";

test("the sculpture uses the site's existing Shop mark", () => {
  const svg = readFileSync(new URL("../public/images/icons/shop-swirl.svg", import.meta.url), "utf8");
  assert.equal(SHOP_MARK_PATH, svg.match(/ d="([^"]+)"/)[1]);
});

test("Shop sampling fills both faces and the connecting rim without leaving the mark", () => {
  const contains = (x, y) => Math.hypot(x - 12, y - 12) <= 9;
  const points = shopPoints(320, contains);
  assert.equal(points.length, 320);
  for (const point of points) {
    assert.ok(contains(point.x * 11 + 12, point.y * 11 + 12));
    assert.ok(Math.abs(point.z) <= 0.17);
  }
  assert.ok(points.some(point => point.z === -0.17));
  assert.ok(points.some(point => point.z === 0.17));
  assert.ok(points.some(point => Math.abs(point.z) < 0.16));
  assert.deepEqual(shopPoints(12, () => false), []);
  assert.deepEqual(shopPoints(0, contains), []);
});

test("Shop projection preserves extrusion at the side and closes a full ambient turn", () => {
  const front = { x: 0.6, y: 0.4, z: 0.17 }, back = { ...front, z: -0.17 };
  const start = projectShopPoint(front, 0, 0.12);
  const end = projectShopPoint(front, Math.PI * 2, 0.12);
  assert.ok(Math.abs(start.x - end.x) < 1e-9);
  assert.ok(Math.abs(start.y - end.y) < 1e-9);
  const sideA = projectShopPoint(front, Math.PI / 2, 0);
  const sideB = projectShopPoint(back, Math.PI / 2, 0);
  assert.ok(sideA.x > 0 && sideB.x < 0, "the icon retains thickness edge-on");
  for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    for (const value of Object.values(projectShopPoint(front, angle, 0.2))) assert.ok(Number.isFinite(value));
  }
});
