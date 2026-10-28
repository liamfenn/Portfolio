// Holds real WebKit presentation to test startup coverage and the bounded paint handoff, including reload.
import assert from "node:assert/strict";
import { webkit } from "playwright-core";

const origin = process.argv[2] ?? "http://localhost:3113";
const browser = await webkit.launch();
try {
  for (const width of [393, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2, isMobile: width < 768, hasTouch: width < 768 });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => {
      const native = HTMLVideoElement.prototype.requestVideoFrameCallback;
      HTMLVideoElement.prototype.requestVideoFrameCallback = function(callback) {
        return native.call(this, (now, metadata) => {
          if (!this.dataset.frameReady && this.closest('[data-project-id="shop-02"]')) window.__startupFrame = () => callback(now, metadata);
          else callback(now, metadata);
        });
      };
    });
    for (let cycle = 0; cycle < 3; cycle++) {
      if (cycle) await page.reload(); else await page.goto(`${origin}/?inspect=off`);
      const tile = page.locator('[data-project-id="shop-02"] .homepage-card-trigger');
      await tile.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => window.__startupFrame);
      const startup = await tile.evaluate(tile => {
        const video = tile.querySelector("video"), wrapper = video.parentElement, skeleton = wrapper.querySelector(".skeleton");
        const covered = !video.dataset.frameReady && wrapper.dataset.videoDisplay === "loading" && Boolean(skeleton)
          && getComputedStyle(skeleton).zIndex === "1" && getComputedStyle(skeleton).backgroundColor !== "rgba(0, 0, 0, 0)";
        const composited = getComputedStyle(video).visibility === "visible" && video.videoWidth > 0 && !video.paused;
        const native = window.requestAnimationFrame, paints = [];
        window.requestAnimationFrame = callback => { paints.push(callback); return 0; };
        try {
          window.__startupFrame();
          const afterFrame = video.dataset.frameReady === "true";
          paints.shift()?.(performance.now());
          const afterFirstPaint = video.dataset.frameReady === "true";
          paints.shift()?.(performance.now());
          return { covered, composited, afterFrame, afterFirstPaint, afterSecondPaint: video.dataset.frameReady === "true", pendingPaints: paints.length };
        } finally { window.requestAnimationFrame = native; }
      });
      assert.deepEqual(startup, { covered: true, composited: true, afterFrame: false, afterFirstPaint: false, afterSecondPaint: true, pendingPaints: 0 });
      await page.waitForFunction(() => {
        const wrapper = document.querySelector('[data-project-id="shop-02"] .project-preview-media');
        return wrapper.dataset.videoDisplay === "ready" && !wrapper.querySelector(".skeleton");
      });
    }
    await page.reload();
    await page.locator('[data-project-id="shop-02"] .homepage-card-trigger').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => window.__startupFrame);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() => !document.querySelector('[data-project-id="shop-02"] video').hasAttribute("src"));
    assert.ok(await page.evaluate(() => {
      window.__startupFrame();
      const video = document.querySelector('[data-project-id="shop-02"] video');
      return video.paused && !video.hasAttribute("src") && !video.dataset.frameReady;
    }));
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ width, coldLoadAndReloads: 3, opaqueCoverage: true, surfaceStaysVisible: true, twoPaintReveal: true, staleRevealCanceledByPolicy: true }));
    await page.close();
  }
} finally { await browser.close(); }
