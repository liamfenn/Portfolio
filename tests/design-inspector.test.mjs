import test from "node:test";
import assert from "node:assert/strict";
import { colorToHex, formatTextMetrics, nextInspectionMode } from "../src/lib/design-inspector.ts";

test("T and C each cycle through their two modes and restore content", () => {
  for (const [key, expected] of [["t", ["type-token", "type-metrics", "content"]], ["c", ["color-token", "color-hex", "content"]]]) {
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
  for (const mode of ["content", "type-token", "type-metrics", "color-token", "color-hex"]) {
    assert.equal(nextInspectionMode(mode, "Escape"), "content");
  }
});

test("pixel metrics keep fractional leading without trailing zeros", () => {
  assert.equal(formatTextMetrics("15px", "20.25px"), "15px / 20.25px");
  assert.equal(formatTextMetrics("14px", "18.9px"), "14px / 18.9px");
  assert.equal(formatTextMetrics("12px", "16.2px"), "12px / 16.2px");
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
