// Production lifecycle checks. Timings are observations, not a real-device frame-rate guarantee.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const { chromium, webkit } = await import(process.env.GLYPH_PLAYWRIGHT_MODULE ?? "playwright-core");

const origin = process.argv[2] ?? "http://localhost:3002";
const engine = process.env.GLYPH_BROWSER === "chromium" ? chromium : webkit;
const fixture = process.env.GLYPH_MEDIA_FIXTURE ? await readFile(process.env.GLYPH_MEDIA_FIXTURE) : null;
const browser = await engine.launch({ headless: true, ...(engine === chromium && process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, deviceScaleFactor: 2 });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    if (fixture) await page.route(/https:.*\.mp4/, route => route.fulfill({
      body: fixture, contentType: "video/mp4", headers: { "Access-Control-Allow-Origin": "*" },
    }));
    await page.addInitScript(() => {
      window.__glyphReads = { sizes: 0, bounds: 0 };
      const size = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
      Object.defineProperty(HTMLElement.prototype, "offsetWidth", { ...size, get() {
        if (this.classList.contains("glyph-globe")) window.__glyphReads.sizes++;
        return size.get.call(this);
      } });
      const bounds = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = function() {
        if (this.matches(".glyph-globe-char,.glyph-exit-glyph,.glyph-exit")) window.__glyphReads.bounds++;
        return bounds.call(this);
      };
    });
    await page.goto(`${origin}/${process.env.GLYPH_LAB ? "dev/video-lab" : ""}?inspect=off`);
    const globe = page.getByRole("button", { name: "Play with the letters" });
    const state = () => page.locator(".glyph-globe-char").evaluateAll(chars => chars.map(char => char.getAttribute("style")));
    const hidden = value => page.evaluate(value => {
      if (value) Object.defineProperty(document, "hidden", { configurable: true, value: true });
      else delete document.hidden;
      document.dispatchEvent(new Event("visibilitychange"));
    }, value);
    await globe.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    const turning = await state();
    await page.waitForTimeout(300);
    assert.notDeepEqual(await state(), turning, "visible globe turns");
    await page.evaluate(() => { window.__glyphReads = { sizes: 0, bounds: 0 }; });
    await page.waitForTimeout(2000);
    assert.deepEqual(await page.evaluate(() => window.__glyphReads), { sizes: 0, bounds: 0 }, "steady globe animation never measures layout");
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(300);
    const offscreen = await state();
    await page.waitForTimeout(1200);
    assert.deepEqual(await state(), offscreen, "offscreen spin and color flickers stop together");
    await globe.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await hidden(true);
    const background = await state();
    await page.waitForTimeout(300);
    assert.deepEqual(await state(), background, "background globe does no animation work");
    await hidden(false);
    await page.waitForTimeout(300);
    assert.notDeepEqual(await state(), background, "globe resumes on return");
    await globe.click();
    await page.waitForFunction(() => document.querySelectorAll(".glyph-swarm-glyph").length > 30);
    await page.waitForTimeout(1800);
    const glyphCount = await page.locator(".glyph-swarm-glyph").count();
    await hidden(true);
    const frozen = await page.locator(".glyph-swarm-glyph").evaluateAll(glyphs => glyphs.map(glyph => glyph.getAttribute("style")));
    await page.waitForTimeout(300);
    assert.deepEqual(await page.locator(".glyph-swarm-glyph").evaluateAll(glyphs => glyphs.map(glyph => glyph.getAttribute("style"))), frozen, "background swarm stops its physics and drawing");
    await hidden(false);
    await page.locator("video").first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    if (process.env.GLYPH_LAB && width < 768) {
      await page.locator(".project-grid").evaluate(grid => grid.style.setProperty("--project-mobile-columns", "2"));
      if (engine === webkit) await page.waitForFunction(() => [...document.querySelectorAll("video")].filter(video => !video.paused && video.currentTime > 0).length > 4);
    }
    // A codec-capable browser must actually decode while the letters are out.
    if (engine === webkit) await page.waitForFunction(mobile => {
      const visible = [...document.querySelectorAll("video")].filter(video => {
        const box = video.getBoundingClientRect();
        return box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth;
      });
      const expected = mobile ? visible.length : Math.min(4, visible.length);
      return expected > 0 && visible.filter(video => !video.paused && video.currentTime > 0 && video.dataset.frameReady === "true").length === expected;
    }, width < 768);
    const before = await page.locator("video").evaluateAll(videos => videos.map(video => video.currentTime));
    await page.mouse.move(width / 2, 400);
    await page.mouse.move(width / 2 + 80, 500, { steps: 8 });
    await page.waitForTimeout(600);
    const videos = await page.locator("video").evaluateAll(videos => videos.map(video => ({
      time: video.currentTime, playing: !video.paused, width: video.videoWidth,
      frames: video.getVideoPlaybackQuality?.().totalVideoFrames, dropped: video.getVideoPlaybackQuality?.().droppedVideoFrames,
    })));
    if (engine === webkit) assert.ok(videos.some((video, index) => video.playing && video.time !== before[index]), "video clocks keep advancing with active physics");
    await page.setViewportSize({ width, height: 900 });
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector(".glyph-swarm-layer,.glyph-exit") && !CSS.highlights?.has("glyph-swarm-taken"));
    assert.equal(await page.locator(".glyph-globe-char[data-away]").count(), 0);
    assert.equal(await page.locator(".glyph-exit").count(), 0);
    await globe.click();
    await page.waitForFunction(() => document.querySelector(".glyph-swarm-layer"));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() => !document.querySelector(".glyph-swarm-layer"));
    await page.waitForTimeout(300);
    const reduced = await state();
    await page.waitForTimeout(300);
    assert.deepEqual(await state(), reduced, "reduced motion removes decorative work");
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ browser: engine.name(), width, glyphCount, layoutReadsDuringIdle: 0, offscreenAndBackgroundPaused: true, returnAndReducedMotionCleanup: true, fixture: Boolean(fixture), videos }));
    await page.close();
  }
} finally { await browser.close(); }
