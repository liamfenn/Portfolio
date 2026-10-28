// Use FOCUS_VIDEO_FIXTURE for Chromium builds without H.264. Tests frame handoff, not native Safari compositing.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium, webkit } from "playwright-core";

const origin = process.argv[2] ?? "http://localhost:3100";
const fixture = process.env.FOCUS_VIDEO_FIXTURE ? await readFile(process.env.FOCUS_VIDEO_FIXTURE) : null;
const engine = process.env.FOCUS_BROWSER === "webkit" ? webkit : chromium;
const browser = await engine.launch({ headless: true, ...(engine === chromium && process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
try {
  for (const width of [393, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: width < 768 ? 650 : 1024 }, isMobile: width < 768, hasTouch: width < 768 });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    if (fixture) await page.route(/\.mp4(?:\?|$)/, route => route.fulfill({ contentType: "video/webm", body: fixture }));
    await page.goto(`${origin}/?inspect=off`);
    await page.waitForFunction(() => document.querySelector(".homepage-avatar")?.getAttribute("aria-busy") === "false");
    const tile = page.locator('[data-project-id="shop-01"] .homepage-card-trigger');
    await tile.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-project-id="shop-01"] video')?.dataset.frameReady === "true");
    for (let index = 0; index < 3; index++) {
      await tile.click();
      await page.waitForFunction(() => document.querySelector(".project-focus-root")?.dataset.phase === "open" && document.querySelector(".project-focus-root video")?.dataset.frameReady === "true");
      await page.evaluate(() => {
        const video = document.querySelector(".project-focus-root video");
        window.__handoffVideo = video;
        window.__handoffSource = video.currentSrc;
        window.__handoffTime = video.currentTime;
        window.__handoffLoads = 0;
        video.addEventListener("loadstart", () => window.__handoffLoads++, { once: true });
        const native = video.requestVideoFrameCallback.bind(video);
        video.requestVideoFrameCallback = callback => {
          video.requestVideoFrameCallback = native;
          window.__presentAfterMove = () => native(callback);
          return -1;
        };
      });
      await page.getByRole("button", { name: "Close", exact: true }).click();
      await page.getByRole("dialog").waitFor({ state: "detached" });
      const cover = tile.locator(".project-preview-handoff");
      assert.equal(await cover.count(), 1);
      assert.ok(await cover.evaluate(canvas => {
        const video = window.__handoffVideo, bounds = canvas.getBoundingClientRect(), videoBounds = video.getBoundingClientRect();
        const elapsed = (video.currentTime - window.__handoffTime + video.duration) % video.duration;
        return canvas.width === video.videoWidth && canvas.height === video.videoHeight && canvas.getAttribute("aria-hidden") === "true" && canvas.parentElement === video.parentElement && bounds.width === videoBounds.width && bounds.height === videoBounds.height && getComputedStyle(canvas).visibility === "visible" && video.currentSrc === window.__handoffSource && elapsed < 1.5 && video.dataset.frameReady === "true";
      }));
      if (index === 2) {
        // Policy release must cancel the pending handoff and reveal the poster, without waiting for a frame.
        await page.emulateMedia({ reducedMotion: "reduce" });
        await cover.waitFor({ state: "detached" });
        assert.ok(await tile.locator("video").evaluate(video => video.paused && !video.hasAttribute("src") && !video.dataset.frameReady));
      } else {
        await page.evaluate(() => window.__presentAfterMove());
        await cover.waitFor({ state: "detached" });
        assert.equal(await page.evaluate(() => window.__handoffLoads), 0);
        assert.ok(await tile.locator("video").evaluate(video => video === window.__handoffVideo && getComputedStyle(video).visibility === "visible" && getComputedStyle(video.nextElementSibling).visibility === "hidden"));
        if (index === 1) {
          await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
          await page.waitForFunction(() => window.__handoffVideo.paused);
          assert.equal(await tile.locator("video").getAttribute("data-frame-ready"), "true");
          await tile.scrollIntoViewIfNeeded();
        }
      }
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ width, handoff: "last-frame cover retained until presentation, same source/video/playhead, repeated exits and policy cleanup passed" }));
    await page.close();
  }
} finally { await browser.close(); }
