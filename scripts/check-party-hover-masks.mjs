// Checks actual painted gaps, not just the presence of Highlight ranges (Safari can register but not paint them).
import assert from "node:assert/strict";
import sharp from "sharp";
import { chromium, webkit } from "playwright-core";

const origin = process.argv[2] ?? "http://localhost:3124";
const engine = process.env.PARTY_BROWSER === "chromium" ? chromium : webkit;
const browser = await engine.launch({ headless: true, ...(engine === chromium && process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${origin}/?inspect=off`);
  const card = page.locator('[data-project-id="shop-03"] .homepage-card-trigger');
  const label = card.locator('[data-swarm-label-id="shop-03:company"]');
  await page.getByRole("button", { name: "Play with the letters" }).click();
  await page.waitForFunction(() => CSS.highlights?.has("glyph-swarm-taken") && document.querySelector(".glyph-swarm-layer"));
  await card.hover();
  await page.waitForFunction(() => {
    const label = document.querySelector('[data-swarm-label-id="shop-03:company"]');
    return label?.textContent === "Shop" && !label.children.length && [...CSS.highlights.get("glyph-swarm-taken")].some(range => label.contains(range.startContainer) && range.toString().trim());
  });
  // Keep floating copies out of the screenshot crop; the original source remains mounted and unmodified.
  await page.addStyleTag({ content: ".glyph-swarm-layer { visibility: hidden !important; }" });
  const screenshot = async () => sharp(await label.screenshot()).ensureAlpha().raw().toBuffer();
  const masked = await screenshot();
  const reveal = await page.addStyleTag({ content: "::highlight(glyph-swarm-taken) { color: #111 !important; }" });
  const unmasked = await screenshot();
  await reveal.evaluate(style => style.remove());
  let changedPixels = 0;
  for (let index = 0; index < masked.length; index += 4) {
    if (Math.abs(masked[index] - unmasked[index]) + Math.abs(masked[index + 1] - unmasked[index + 1]) + Math.abs(masked[index + 2] - unmasked[index + 2]) > 30) changedPixels++;
  }
  const donated = await label.evaluate(label => [...CSS.highlights.get("glyph-swarm-taken")].filter(range => label.contains(range.startContainer)).map(range => range.startOffset));
  assert.ok(changedPixels > 20, JSON.stringify({ browser: engine.name(), changedPixels, donated, selection: await card.evaluate(card => getComputedStyle(card).webkitUserSelect) }));
  assert.equal(await label.textContent(), "Shop", "the source text must remain mounted and accessible");
  await page.mouse.move(5, 5);
  await page.waitForFunction(() => !document.querySelector('[data-project-id="shop-03"] .homepage-project-overlay').classList.contains("is-visible"));
  await card.hover();
  await page.waitForFunction(() => { const label = document.querySelector('[data-swarm-label-id="shop-03:company"]'); return label.textContent === "Shop" && !label.children.length; });
  assert.deepEqual(await label.evaluate(label => [...CSS.highlights.get("glyph-swarm-taken")].filter(range => label.contains(range.startContainer)).map(range => range.startOffset)), donated, "reentry must retain the same donated character positions");
  assert.ok(await card.evaluate(card => !card.dispatchEvent(new Event("selectstart", { bubbles: true, cancelable: true }))), "party mode must still prevent manual text selection");
  await page.getByRole("button", { name: "Put the letters back" }).click();
  await page.waitForFunction(() => !CSS.highlights.has("glyph-swarm-taken") && !document.querySelector(".glyph-swarm-layer"));
  await card.hover();
  await page.waitForFunction(() => document.querySelector('[data-swarm-label-id="shop-03:company"]').textContent === "Shop");
  assert.equal(await card.evaluate(card => getComputedStyle(card).webkitUserSelect), "none");
  assert.ok(await card.evaluate(card => card.dispatchEvent(new Event("selectstart", { bubbles: true, cancelable: true }))), "selection listener must be cleaned up");
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ browser: engine.name(), changedPixels, paintedDonationGaps: true, stableReentry: true, sourceTextAndCleanup: true }));
} finally { await browser.close(); }
