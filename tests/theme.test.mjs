import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { resolveTheme, themeDurationMilliseconds, THEME_INIT_SCRIPT } from "../src/lib/theme.ts";

test("theme timing accepts seconds produced by the production CSS optimizer", () => {
  assert.equal(themeDurationMilliseconds("480ms"), 480);
  assert.equal(themeDurationMilliseconds(".48s"), 480);
  assert.equal(themeDurationMilliseconds(" 0.48s "), 480);
  assert.equal(themeDurationMilliseconds("0s"), 0);
});

test("explicit theme wins over the system; unset or invalid preferences follow it", () => {
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme(null, true), "dark");
  assert.equal(resolveTheme(null, false), "light");
  assert.equal(resolveTheme("invalid", true), "dark");
});

test("first-paint script resolves saved and system themes even without storage access", () => {
  for (const [preference, systemDark, blocked, expected] of [
    ["dark", false, false, "dark"],
    ["light", true, false, "light"],
    [null, true, false, "dark"],
    ["invalid", false, false, "light"],
    [null, true, true, "dark"],
  ]) {
    const document = { documentElement: { dataset: {} } };
    vm.runInNewContext(THEME_INIT_SCRIPT, {
      document,
      localStorage: { getItem() { if (blocked) throw new Error("blocked"); return preference; } },
      matchMedia: () => ({ matches: systemDark }),
    });
    assert.equal(document.documentElement.dataset.theme, expected);
  }
});
