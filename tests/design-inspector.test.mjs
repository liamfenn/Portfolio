import test from "node:test";
import assert from "node:assert/strict";
import { colorToHex, formatTextMetrics, gapBoxes, isLabelMode, nextInspectionMode, spacingKinds } from "../src/lib/design-inspector.ts";

test("T, C, P, and G each cycle through their two modes and restore content", () => {
  for (const [key, expected] of [
    ["t", ["type-token", "type-metrics", "content"]], ["c", ["color-token", "color-hex", "content"]],
    ["p", ["padding-y", "padding-x", "content"]], ["m", ["margin-y", "margin-x", "content"]],
    ["g", ["gap-y", "gap-x", "content"]], ["s", ["spacing-y", "spacing-x", "content"]],
  ]) {
    let mode = "content";
    for (const next of expected) {
      mode = nextInspectionMode(mode, key);
      assert.equal(mode, next);
    }
  }
});

test("changing inspector families starts at tokens; Escape always restores content", () => {
  assert.equal(nextInspectionMode("color-hex", "t"), "type-token");
  assert.equal(nextInspectionMode("type-metrics", "c"), "color-token");
  assert.equal(nextInspectionMode("padding-x", "g"), "gap-y");
  assert.equal(nextInspectionMode("gap-y", "p"), "padding-y");
  assert.equal(nextInspectionMode("padding-y", "m"), "margin-y");
  for (const mode of ["content", "type-token", "type-metrics", "color-token", "color-hex", "padding-y", "padding-x", "margin-y", "margin-x", "gap-y", "gap-x", "spacing-y", "spacing-x"]) {
    assert.equal(nextInspectionMode(mode, "Escape"), "content");
  }
});

test("text metrics omit units and trailing zeros while retaining fractional values", () => {
  assert.equal(formatTextMetrics("15px", "20px"), "15 / 20");
  assert.equal(formatTextMetrics("14px", "18px"), "14 / 18");
  assert.equal(formatTextMetrics("13px", "18px"), "13 / 18");
  assert.equal(formatTextMetrics("15px", "20.25px"), "15 / 20.25");
});

test("computed text colors normalize to hex, including alpha and Safari RGB forms", () => {
  for (const [input, expected] of [
    ["rgb(85, 85, 85)", "#555555"], ["rgb(30 215 96)", "#1ED760"],
    ["rgba(255, 255, 255, 0.9)", "#FFFFFFE6"], ["rgb(100% 0% 0% / 50%)", "#FF000080"],
    ["rgb(50% 50% 50%)", "#808080"],
    ["color(srgb 0 0 0)", "#000000"], ["#999", "#999999"], ["#fff8", "#FFFFFF88"],
    ["#000000ff", "#000000"], ["#ffffff", "#FFFFFF"], ["transparent", "#00000000"],
  ]) assert.equal(colorToHex(input), expected);
});

test("only text and color modes replace text with labels", () => {
  assert.deepEqual(
    ["content", "type-token", "color-hex", "padding-y", "margin-x", "gap-x"].map(isLabelMode),
    [false, true, true, false, false, false],
  );
});

const box = (left, top, right, bottom) => ({ left, top, right, bottom });

test("vertical gaps sit between stacked rows and span the content width", () => {
  const content = box(0, 0, 100, 100);
  const items = [box(0, 0, 40, 20), box(0, 28, 100, 48), box(0, 60, 60, 80)];
  assert.deepEqual(gapBoxes(content, items, "vertical"), [box(0, 20, 100, 28), box(0, 48, 100, 60)]);
  assert.deepEqual(gapBoxes(content, items, "horizontal"), []);
});

test("horizontal gaps sit between items in each row, including wrapped rows", () => {
  const content = box(0, 0, 100, 100);
  const items = [box(0, 0, 30, 20), box(46, 0, 70, 10), box(0, 30, 20, 50), box(28, 30, 50, 50)];
  assert.deepEqual(gapBoxes(content, items, "horizontal"), [box(30, 0, 46, 20), box(20, 30, 28, 50)]);
  assert.deepEqual(gapBoxes(content, items, "vertical"), [box(0, 20, 100, 30)]);
});

test("spacing modes draw their own kind, and S draws all three with gaps on top", () => {
  assert.deepEqual(spacingKinds("padding-x"), ["padding"]);
  assert.deepEqual(spacingKinds("margin-y"), ["margin"]);
  assert.deepEqual(spacingKinds("gap-x"), ["gap"]);
  assert.deepEqual(spacingKinds("spacing-y"), ["margin", "padding", "gap"]);
  assert.deepEqual(spacingKinds("type-token"), []);
});
