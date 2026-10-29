// Uses real H.264 playback in WebKit. Test against a fresh production build to avoid stale dev CSS.
import assert from "node:assert/strict";
import { webkit } from "playwright-core";

const origin = process.argv[2] ?? "http://localhost:3102";
const browser = await webkit.launch({ headless: true });
try {
  for (const width of [1440, 393]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2, isMobile: width < 768, hasTouch: width < 768 });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    let release;
    const pending = new Promise(resolve => { release = resolve; });
    await page.route(/\.mp4(?:\?|$)/, async route => { await pending; await route.continue().catch(() => {}); });
    await page.goto(`${origin}/?inspect=off&projects=focus`, { waitUntil: "domcontentloaded" });
    await page.locator('.homepage-card-trigger[aria-haspopup="dialog"]').first().waitFor();
    const tile = page.locator('[data-project-id="shop-02"] .homepage-card-trigger');
    await tile.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-project-id="shop-02"] .project-preview-poster')?.naturalWidth > 0);
    assert.ok(await tile.evaluate(tile => tile.querySelector(".skeleton") && getComputedStyle(tile.querySelector(".project-preview-poster")).visibility === "hidden" && tile.querySelector(".project-preview-media").getAttribute("aria-busy") === "true"));
    await tile.click();
    await page.waitForFunction(() => document.querySelector(".project-focus-root")?.dataset.phase === "open");
    assert.equal(await page.locator('[data-focus-media="current"] .skeleton').count(), 1);
    release();
    await page.waitForFunction(() => document.querySelector('[data-focus-media="current"] video')?.dataset.frameReady === "true" && !document.querySelector('[data-focus-media="current"] .skeleton'));
    for (const name of ["Next project", "Next project", "Previous project", "Previous project"]) {
      await page.getByRole("button", { name }).click();
      await page.waitForFunction(() => document.querySelector(".project-focus-root")?.dataset.phase === "open");
    }
    await page.waitForFunction(() => document.querySelector(".project-focus-root")?.dataset.phase === "open" && document.querySelector('[data-focus-media="current"] video')?.dataset.frameReady === "true");
    await page.evaluate(() => {
      const video = document.querySelector('[data-focus-media="current"] video');
      window.__closingVideo = video;
      window.__closeSamples = [];
      window.__detailsHeight = document.querySelector(".project-focus-details").getBoundingClientRect().height;
      document.querySelector(".project-focus-close").addEventListener("click", () => {
        const start = performance.now();
        const sample = () => {
          const root = document.querySelector(".project-focus-root");
          if (!root) return;
          const details = root.querySelector(".project-focus-details");
          window.__closeSamples.push({ time: performance.now() - start, phase: root.dataset.phase, opacity: getComputedStyle(details).opacity, visibility: getComputedStyle(details).visibility, text: details.textContent, stableHeight: Math.abs(details.getBoundingClientRect().height - window.__detailsHeight) < 0.1, stableMedia: window.__closingVideo.closest(".homepage-card-trigger") !== null });
          requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }, { once: true });
    });
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "detached" });
    const samples = await page.evaluate(() => window.__closeSamples);
    assert.ok(samples.some(sample => sample.time > 140 && sample.phase === "closing" && sample.text === "" && sample.stableHeight && sample.stableMedia), JSON.stringify(samples));
    assert.equal(await page.locator(".project-preview-handoff, .project-preview-landing, [data-focus-media]").count(), 0);
    assert.ok(await tile.evaluate(tile => tile.querySelector("video") === window.__closingVideo));
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ width, loading: "skeleton persists past poster load until presented video", close: "text DOM removed after four pages without layout shift; original media stays in grid DOM throughout return" }));
    await context.close();
  }

  const page = await browser.newPage({ viewport: { width: 1440, height: 1024 }, deviceScaleFactor: 2 });
  let releaseUpgrade;
  const upgrade = new Promise(resolve => { releaseUpgrade = resolve; });
  await page.route(/shop-rewards-card\/.*-1600\.mp4/, async route => { await upgrade; await route.continue().catch(() => {}); });
  await page.goto(`${origin}/?inspect=off&projects=focus`, { waitUntil: "domcontentloaded" });
  await page.locator('.homepage-card-trigger[aria-haspopup="dialog"]').first().waitFor();
  const tile = page.locator('[data-project-id="shop-02"] .homepage-card-trigger');
  await tile.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('[data-project-id="shop-02"] video')?.dataset.frameReady === "true");
  await tile.click();
  await page.waitForFunction(() => document.querySelector('[data-focus-media="current"] video')?.dataset.playback === "loading");
  assert.ok(await page.locator('[data-focus-media="current"] .project-preview-media').evaluate(wrapper => wrapper.querySelector(".project-preview-upgrade") && wrapper.dataset.videoDisplay === "ready" && !wrapper.querySelector(".skeleton")));
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
  assert.equal(await tile.locator(".project-preview-upgrade").count(), 1, "closing during an unfinished upgrade must retain its existing picture");
  releaseUpgrade();
  await page.waitForFunction(() => document.querySelector('[data-project-id="shop-02"] video')?.dataset.frameReady === "true" && !document.querySelector('[data-project-id="shop-02"] .project-preview-upgrade'));
  await tile.click();
  await page.waitForFunction(() => document.querySelector(".project-focus-root")?.dataset.phase === "open" && document.querySelector('[data-focus-media="current"] video')?.dataset.frameReady === "true" && !document.querySelector('[data-focus-media="current"] .project-preview-upgrade'));
  const ids = await page.locator(".project-grid > li").evaluateAll(nodes => nodes.map(node => node.dataset.projectId));
  await page.mouse.move(720, 300);
  await page.evaluate(() => { window.__stationaryMoves = 0; document.addEventListener("pointermove", () => window.__stationaryMoves++); });
  for (const expected of ids.slice(2, 6)) {
    // New finger strokes start before the old fling's final deltas have had time to go quiet.
    for (const delta of [2, 6, 18, 42, 80, 55, 36, 22, 12, 5, 2]) {
      await page.mouse.wheel(delta, 0);
      await page.waitForTimeout(40);
    }
    await page.waitForFunction(id => document.querySelector(".project-focus-root")?.dataset.focusProject === id && document.querySelector(".project-focus-root")?.dataset.phase === "open", expected);
  }
  assert.equal(await page.evaluate(() => window.__stationaryMoves), 0);
  console.log("Desktop: upgrade holds the current frame; four successive two-finger-style strokes interrupt momentum without pointer movement");
  await page.close();
} finally { await browser.close(); }
