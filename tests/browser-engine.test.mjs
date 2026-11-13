import test from "node:test";
import assert from "node:assert/strict";
import { isChromium, isSafari } from "../src/lib/browser-engine.ts";

test("Chrome's Safari token does not select Safari's scroll workaround", () => {
  const chrome = "Mozilla/5.0 AppleWebKit/537.36 Chrome/142.0.0.0 Safari/537.36";
  assert.equal(isChromium(chrome), true);
  assert.equal(isSafari(chrome), false);
  assert.equal(isChromium(chrome.replace("Chrome/", "HeadlessChrome/")), true);
});

test("Safari keeps native overscroll and selects the Top scroll workaround", () => {
  const safari = "Mozilla/5.0 AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15";
  assert.equal(isChromium(safari), false);
  assert.equal(isSafari(safari), true);
});

test("Chrome on iOS is not the Chromium engine", () => {
  const chromeIOS = "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 CriOS/142.0.0.0 Mobile/15E148 Safari/604.1";
  assert.equal(isChromium(chromeIOS), false);
  assert.equal(isSafari(chromeIOS), false);
  assert.equal(isSafari("Mozilla/5.0 Firefox/142.0"), false);
});
