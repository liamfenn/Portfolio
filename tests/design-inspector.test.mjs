import test from "node:test";
import assert from "node:assert/strict";
import { colorToHex, createShakeDetector, formatTextMetrics, gapBoxes, isLabelMode, nextInspectionMode, resolveInspectorFlag, spacingKinds } from "../src/lib/design-inspector.ts";

test("T, O, P, M, G, and S each cycle through their two modes and restore content", () => {
  for (const [key, expected] of [
    ["t", ["type-token", "type-metrics", "content"]], ["o", ["color-token", "color-hex", "content"]],
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
  assert.equal(nextInspectionMode("type-metrics", "o"), "color-token");
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

test("the inspector is debug-only: off in production, flagged on previews, on in local dev", () => {
  const flag = overrides => resolveInspectorFlag({ vercelEnv: "preview", nodeEnv: "production", param: null, stored: null, ...overrides });
  assert.deepEqual(flag({}), { enabled: false });
  assert.deepEqual(flag({ param: "" }), { enabled: true, remember: "on" });
  assert.deepEqual(flag({ stored: "on" }), { enabled: true });
  assert.deepEqual(flag({ param: "off", stored: "on" }), { enabled: false, remember: "off" });
  assert.deepEqual(flag({ vercelEnv: "production", param: "", stored: "on" }), { enabled: false });
  assert.deepEqual(flag({ vercelEnv: undefined, nodeEnv: "development" }), { enabled: true });
  assert.deepEqual(flag({ vercelEnv: undefined, nodeEnv: "development", stored: "off" }), { enabled: false });
});

test("a shake needs repeated sharp jolts, counts each jolt once, then cools down", () => {
  const detect = createShakeDetector();
  const still = [0, 9.8, 0];
  const jolt = [20, 9.8, 0];
  let t = 0;
  const feed = sample => detect(sample[0], sample[1], sample[2], (t += 16));
  // Holding still or tilting slowly never triggers.
  for (let i = 0; i < 30; i++) assert.equal(feed([i * 0.2, 9.8, 0]), false);
  // One jolt (several fast samples) counts once.
  feed(still); assert.equal(feed(jolt), false); assert.equal(feed(still), false);
  t += 150;
  feed(still); assert.equal(feed(jolt), true);
  // Cooldown ignores the rest of the same shake.
  t += 150; feed(still); assert.equal(feed(jolt), false);
  // After the cooldown, a back-and-forth shake (out, then back) triggers again.
  t += 1500; feed(still); feed(still); feed(jolt); t += 150;
  assert.equal(feed(still), true);
});
