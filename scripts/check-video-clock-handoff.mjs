// Real video playback: the safety image must not conceal a running-ahead media clock.
import assert from "node:assert/strict";
import { webkit } from "playwright-core";

const origin = process.argv[2] ?? "http://localhost:3108";
const browser = await webkit.launch({ headless: true });
try {
  for (const width of [393, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, isMobile: width < 768, hasTouch: width < 768 });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${origin}/?inspect=off`);
    const tile = page.locator('[data-project-id="shop-02"] .homepage-card-trigger');
    await tile.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-project-id="shop-02"] video')?.dataset.frameReady === "true");
    await tile.evaluate(tile => {
      window.__clockVideo = tile.querySelector("video");
      window.__clockSource = window.__clockVideo.currentSrc;
      window.__clockLoads = 0;
      window.__clockVideoCount = document.querySelectorAll("video").length;
      window.__clockVideo.addEventListener("loadstart", () => window.__clockLoads++);
      new MutationObserver(records => {
        if (records.some(record => [...record.removedNodes].includes(window.__clockCover))) window.__clockRevealTime = window.__clockVideo.currentTime;
      }).observe(document.body, { childList: true, subtree: true });
    });
    for (let index = 0; index < 4; index++) {
      await tile.click();
      await page.getByRole("dialog").waitFor();
      // Exit before the entry/text animation has settled, as in rapid repeated opening/closing.
      await page.waitForTimeout(80);
      await page.evaluate(() => {
        const video = window.__clockVideo;
        window.__clockSamples = [];
        window.__clockCover = undefined;
        window.__clockRevealTime = undefined;
        let closing = false;
        const sample = () => {
          const root = document.querySelector(".project-focus-root");
          closing ||= root?.dataset.phase === "closing";
          if (closing) {
            window.__clockCover ??= video.parentElement.querySelector(".project-preview-handoff");
            window.__clockSamples.push({ time: video.currentTime, paused: video.paused, inFocus: Boolean(root), held: root?.dataset.phase === "closing", covered: Boolean(document.querySelector(".project-preview-handoff, .project-preview-landing")) });
          }
          if (root || document.querySelector(".project-preview-handoff")) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
      await page.getByRole("button", { name: "Close", exact: true }).click();
      await page.getByRole("dialog").waitFor({ state: "detached" });
      await tile.locator(".project-preview-handoff").waitFor({ state: "detached" });
      const state = await page.evaluate(() => {
        const video = window.__clockVideo, held = window.__clockSamples.filter(sample => sample.held);
        const times = held.map(sample => sample.time);
        return { clockAdvanceWhileHeld: Math.max(...times) - Math.min(...times), revealAdvance: (window.__clockRevealTime - times[0] + video.duration) % video.duration, heldSamples: held.length, pausedWhileHeld: held.every(sample => sample.paused), source: video.currentSrc, sameVideo: video === document.querySelector('[data-project-id="shop-02"] video'), videos: document.querySelectorAll("video").length, baselineVideos: window.__clockVideoCount, overlays: document.querySelectorAll(".project-preview-handoff, .project-preview-landing").length, time: video.currentTime, loads: window.__clockLoads };
      });
      assert.ok(state.heldSamples >= 3);
      assert.ok(state.clockAdvanceWhileHeld < 1 / 60, JSON.stringify({ width, index, ...state }));
      assert.ok(state.pausedWhileHeld && state.sameVideo && state.overlays === 0);
      assert.ok(state.revealAdvance < 0.1, JSON.stringify({ width, index, ...state }));
      assert.equal(state.videos, state.baselineVideos, "handoff must never duplicate a video/decoder");
      assert.equal(state.loads, 0);
      assert.equal(state.source, await page.evaluate(() => window.__clockSource));
      await page.waitForFunction(time => !window.__clockVideo.paused && window.__clockVideo.currentTime > time + 0.05, state.time);
    }
    // Reopen while the destination frame is still pending, rather than waiting for guard cleanup.
    await tile.click();
    await page.waitForFunction(() => document.querySelector(".project-focus-root")?.dataset.phase === "open");
    await page.evaluate(() => {
      const video = window.__clockVideo;
      window.__clockNativeFrame = video.requestVideoFrameCallback.bind(video);
      video.requestVideoFrameCallback = () => -1;
    });
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "detached" });
    assert.equal(await tile.locator(".project-preview-handoff").count(), 1);
    await page.evaluate(() => { window.__clockVideo.requestVideoFrameCallback = window.__clockNativeFrame; });
    await tile.click();
    await page.getByRole("dialog").waitFor();
    await page.locator(".project-preview-handoff").waitFor({ state: "detached" });
    await page.waitForFunction(() => !window.__clockVideo.paused && window.__clockVideo.closest(".project-focus-root"));
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "detached" });
    await tile.locator(".project-preview-handoff").waitFor({ state: "detached" });
    assert.ok(await page.evaluate(() => document.querySelectorAll("video").length === window.__clockVideoCount && window.__clockLoads === 0 && !document.querySelector(".project-preview-landing")));
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ width, rapidExits: 4, overlappingReentry: true, mediaClockHeld: true, resumesSameSource: true, noExtraVideosOrLoads: true }));
    await page.close();
  }
} finally { await browser.close(); }
