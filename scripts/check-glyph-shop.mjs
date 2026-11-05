// Desktop long-hover intent and the shared glyph pickup/return lifecycle.
import assert from "node:assert/strict";
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright-core");
const engine = process.env.SHOP_BROWSER === "webkit" ? webkit : chromium;
const browser = await engine.launch({ headless: true });
const origin = process.argv[2] ?? "http://127.0.0.1:3000";
const errors = [];
const open = async options => {
  const page = await browser.newPage(options);
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${origin}/?inspect=off`, { waitUntil: "domcontentloaded" });
  const globe = page.getByRole("button", { name: "Play with the letters" });
  await globe.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  return { page, globe };
};
const layer = page => page.locator(".glyph-swarm-layer");
const shortDelay = page => page.addStyleTag({ content: ":root { --glyph-shop-hover-delay: 120ms; }" });
try {
  const { page, globe } = await open({ viewport: { width: 1440, height: 1000 } });
  await globe.hover();
  await page.waitForTimeout(4000);
  assert.equal(await layer(page).count(), 0);
  await page.mouse.move(30, 400);
  await page.waitForTimeout(6200);
  assert.equal(await layer(page).count(), 0, "leaving cancels the pending long hover");
  await globe.hover();
  await page.waitForTimeout(9000);
  assert.equal(await layer(page).count(), 0, "a fresh hover must last a full ten seconds");
  await page.waitForFunction(() => document.querySelector('.glyph-swarm-layer[data-formation="shop"]'), { timeout: 3000 });
  await page.waitForFunction(() => {
    const left = [...document.querySelectorAll('[data-entry-side="left"]')];
    const right = [...document.querySelectorAll('[data-entry-side="right"]')];
    return left.some(g => g.getBoundingClientRect().right < 0) && right.some(g => g.getBoundingClientRect().left > innerWidth);
  });
  await page.waitForTimeout(6000);
  const pose = () => page.locator(".glyph-swarm-glyph").evaluateAll(glyphs => glyphs.map(glyph => glyph.getAttribute("style")));
  const bounds = () => page.locator(".glyph-swarm-glyph").evaluateAll(glyphs => {
    const boxes = glyphs.map(glyph => glyph.getBoundingClientRect());
    return { x: (Math.min(...boxes.map(b => b.left)) + Math.max(...boxes.map(b => b.right))) / 2,
      y: (Math.min(...boxes.map(b => b.top)) + Math.max(...boxes.map(b => b.bottom))) / 2,
      width: Math.max(...boxes.map(b => b.right)) - Math.min(...boxes.map(b => b.left)),
      height: Math.max(...boxes.map(b => b.bottom)) - Math.min(...boxes.map(b => b.top)) };
  });
  assert.ok(await page.locator(".glyph-swarm-glyph").count() >= 800, "extra side entries make the sculpture substantially denser");
  assert.ok(await page.locator('[data-entry-side="left"]').count() > 100);
  assert.ok(await page.locator('[data-entry-side="right"]').count() > 100);
  assert.ok(await page.locator(".glyph-swarm-glyph").evaluateAll(gs => gs.every(g => /^var\(--glyph-shop-(?:purple(?:-light|-dark)?|pink|rose|orchid)\)$/.test(g.style.color))), "gathered glyphs use the pink/purple palette");
  assert.ok(await page.locator(".glyph-swarm-glyph").evaluateAll(gs => gs.filter(g => /pink|rose|orchid/.test(g.style.color)).length > gs.length * 0.3), "pink hues have a substantial share of the sculpture");
  assert.ok(await page.evaluate(() => CSS.highlights.get("glyph-swarm-taken")?.size > 0), "original text is masked, not removed");
  const first = await pose();
  await page.mouse.move(50, 50);
  await page.waitForTimeout(800);
  assert.notDeepEqual(await pose(), first, "the icon turns ambiently");
  const box = await bounds();
  assert.ok(Math.abs(box.x - 720) < 65 && Math.abs(box.y - 500) < 65, "the icon stays in the viewport center after the pointer moves");
  assert.ok(box.width < 400 && box.height < 400, "letters settle into the icon");
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
  const frozen = await pose();
  await page.waitForTimeout(300);
  assert.deepEqual(await pose(), frozen, "background sculpture stops drawing");
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event("visibilitychange")); });
  await page.screenshot({ path: "/tmp/portfolio-shop-verified.png" });
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector(".glyph-swarm-layer"));
  assert.equal(await page.locator("[data-away]").count(), 0);
  assert.equal(await page.locator("[data-entry-side]").count(), 0, "extra glyphs leave with the sculpture");
  assert.equal(await page.evaluate(() => CSS.highlights.has("glyph-swarm-taken")), false);
  await globe.click();
  assert.equal(await layer(page).getAttribute("data-formation"), "swarm", "ordinary clicks retain the existing swarm");
  assert.equal(await page.locator("[data-entry-side]").count(), 0, "the ordinary swarm does not gain extra copies");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(() => !document.querySelector(".glyph-swarm-layer"));
  assert.equal(await globe.isDisabled(), true);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await shortDelay(page);
  await page.mouse.move(30, 400);
  await globe.hover();
  await page.waitForFunction(() => document.querySelector('.glyph-swarm-layer[data-formation="shop"]'));
  await page.getByRole("button", { name: "Put the letters back" }).click();
  await page.waitForFunction(() => !document.querySelector(".glyph-swarm-layer"));
  await page.mouse.move(30, 400);
  await globe.hover();
  await page.waitForFunction(() => document.querySelector('.glyph-swarm-layer[data-formation="shop"]'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => !document.querySelector(".glyph-swarm-layer"));
  await page.close();
  const mobile = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await shortDelay(mobile.page);
  await mobile.globe.hover();
  await mobile.page.waitForTimeout(500);
  assert.equal(await layer(mobile.page).count(), 0, "mobile hover never starts the sculpture");
  await mobile.globe.tap();
  assert.equal(await layer(mobile.page).getAttribute("data-formation"), "swarm");
  await mobile.page.emulateMedia({ reducedMotion: "reduce" });
  await mobile.page.waitForFunction(() => !document.querySelector(".glyph-swarm-layer"));
  assert.deepEqual(errors, []);
  console.log("Shop checks passed: ten-second intent/reset, dense side entries, pink/purple assembly, centered ambient spin, background pause, Escape/ring return, resize cleanup, click/touch swarm, reduced motion.");
} finally { await browser.close(); }
