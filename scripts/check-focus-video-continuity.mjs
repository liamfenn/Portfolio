// Real H.264 in WebKit: stable DOM, continuous frames, synchronized geometry, and no focus covers.
import assert from "node:assert/strict";
import { webkit } from "playwright-core";

const origin = process.argv[2] ?? "http://localhost:3115";
const browser = await webkit.launch();
try {
  for (const width of [393, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2, isMobile: width < 768, hasTouch: width < 768 });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${origin}/?inspect=off&projects=focus`);
    await page.locator('.homepage-card-trigger[aria-haspopup="dialog"]').first().waitFor();
    const tile = page.locator('[data-project-id="shop-02"] .homepage-card-trigger');
    await tile.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const video = document.querySelector('[data-project-id="shop-02"] video');
      return video?.dataset.frameReady === "true" && !video.paused;
    });
    await page.evaluate(() => {
      window.__sources = [...document.querySelectorAll(".homepage-project-media")].map(media => ({ media, parent: media.parentElement }));
      window.__mediaMoves = 0;
      new MutationObserver(records => {
        window.__mediaMoves += records.filter(record => [...record.removedNodes].some(node => window.__sources.some(({ media }) => node === media || node.contains?.(media)))).length;
      }).observe(document.body, { childList: true, subtree: true });
    });
    await tile.evaluate(tile => {
      const video = tile.querySelector("video"), source = video.currentSrc;
      window.__entrySamples = [];
      const sample = () => {
        const root = document.querySelector(".project-focus-root");
        if (root?.dataset.phase === "open") return;
        if (root) window.__entrySamples.push({ sameSource: video.currentSrc === source, paused: video.paused });
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    const settledVideo = () => page.waitForFunction(() => {
      const root = document.querySelector(".project-focus-root"), video = document.querySelector('[data-focus-media="current"] video');
      return root?.dataset.phase === "open" && video?.dataset.frameReady === "true" && video.videoWidth >= Math.min(innerWidth, 620) * Math.min(devicePixelRatio, 2) && !document.querySelector(".project-preview-upgrade");
    });
    // Warm the focused rendition once; source upgrades are allowed only after movement settles.
    await tile.click();
    await settledVideo();
    assert.ok(await page.evaluate(() => window.__entrySamples.length > 5 && window.__entrySamples.every(sample => sample.sameSource && !sample.paused)), "the first entrance must not change rendition or pause before content settles");
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "detached" });
    await tile.evaluate(tile => {
      const video = tile.querySelector("video");
      window.__video = video;
      window.__source = video.currentSrc;
      window.__videoCount = document.querySelectorAll("video").length;
      window.__loads = window.__pauses = window.__frames = 0;
      window.__samples = [];
      video.addEventListener("pause", () => window.__pauses++);
      video.addEventListener("loadstart", () => window.__loads++);
      const frame = () => { window.__frames++; video.requestVideoFrameCallback(frame); };
      video.requestVideoFrameCallback(frame);
    });
    for (let cycle = 0; cycle < 4; cycle++) {
      await tile.click();
      if (cycle % 2) {
        await settledVideo();
        await page.locator(".project-focus-scroll").evaluate(scroller => { scroller.scrollTop = 180; });
        await page.waitForFunction(() => {
          const media = document.querySelector('[data-focus-media="current"]').getBoundingClientRect();
          const slot = document.querySelector(".project-focus-scroll .project-focus-media-slot").getBoundingClientRect();
          return Math.abs(media.top - slot.top) < 0.5 && Math.abs(media.left - slot.left) < 0.5;
        });
      } else await page.waitForTimeout(70);
      await page.evaluate(() => {
        window.__closeStart = { time: window.__video.currentTime, frames: window.__frames };
        const sample = () => {
          const root = document.querySelector(".project-focus-root");
          if (!root) return;
          window.__samples.push({ phase: root.dataset.phase, paused: window.__video.paused, videos: document.querySelectorAll("video").length });
          requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
      await page.getByRole("button", { name: "Close", exact: true }).click();
      await page.getByRole("dialog").waitFor({ state: "detached" });
      const result = await page.evaluate(() => ({
        elapsed: (window.__video.currentTime - window.__closeStart.time + window.__video.duration) % window.__video.duration,
        frames: window.__frames - window.__closeStart.frames,
        pauses: window.__pauses, loads: window.__loads, sameVideo: window.__video === document.querySelector('[data-project-id="shop-02"] video'),
        sameSource: window.__video.currentSrc === window.__source,
        parentsStable: window.__sources.every(({ media, parent }) => media.parentElement === parent), moves: window.__mediaMoves,
        clean: !document.querySelector("[data-focus-media], .project-preview-handoff, .project-preview-landing, .project-preview-upgrade"),
        samples: window.__samples, count: window.__videoCount,
      }));
      assert.ok(result.elapsed > 0.3 && result.frames > 8, JSON.stringify({ width, cycle, ...result }));
      assert.ok(result.sameVideo && result.sameSource && result.parentsStable && result.clean);
      assert.equal(result.moves, 0);
      assert.equal(result.pauses, 0);
      assert.equal(result.loads, 0);
      assert.ok(result.samples.every(sample => !sample.paused && sample.videos === result.count));
    }
    await tile.click(); await settledVideo();
    // Warm the other asset, then check native playback during both paging directions.
    await page.getByRole("button", { name: "Previous project" }).click(); await settledVideo();
    await page.getByRole("button", { name: "Next project" }).click(); await settledVideo();
    for (const name of ["Previous project", "Next project", "Previous project", "Next project"]) {
      await page.evaluate(() => {
        const video = document.querySelector('[data-focus-media="current"] video');
        window.__pagingVideo = { video, source: video.currentSrc, time: video.currentTime };
      });
      await page.getByRole("button", { name }).click();
      await page.waitForTimeout(70);
      assert.ok(await page.evaluate(() => {
        const { video, source, time } = window.__pagingVideo, box = video.getBoundingClientRect();
        return !video.paused && video.currentSrc === source && box.right > 0 && box.left < innerWidth
          && (video.currentTime - time + video.duration) % video.duration > 0.02;
      }), "outgoing video must keep playing during its visible page movement");
      await settledVideo();
    }
    assert.ok(await page.evaluate(() => window.__mediaMoves === 0 && window.__sources.every(({ media, parent }) => media.parentElement === parent)));
    await page.setViewportSize({ width: width < 768 ? 430 : 1280, height: 850 });
    await page.waitForFunction(() => {
      const media = document.querySelector('[data-focus-media="current"]').getBoundingClientRect();
      const slot = document.querySelector(".project-focus-scroll .project-focus-media-slot").getBoundingClientRect();
      return Math.abs(media.width - slot.width) < 0.5 && Math.abs(media.top - slot.top) < 0.5 && Math.abs(media.left - slot.left) < 0.5;
    });
    await settledVideo();
    await page.screenshot({ path: `/tmp/stable-focus-${width}.png` });
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.waitForFunction(() => document.querySelector(".project-focus-root")?.dataset.exit === "media");
    await page.setViewportSize({ width: width < 768 ? 393 : 1440, height: 900 });
    await page.getByRole("dialog").waitFor({ state: "detached" });
    assert.equal(await page.locator("[data-focus-media]").count(), 0);
    await tile.click(); await settledVideo();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() => !window.__video.hasAttribute("src"));
    await page.emulateMedia({ reducedMotion: "no-preference" }); await settledVideo();
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    assert.ok(await page.evaluate(() => [...document.querySelectorAll("video")].every(video => video.paused && !video.hasAttribute("src"))));
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event("visibilitychange")); });
    await settledVideo();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "detached" });
    assert.equal(await page.locator("[data-focus-media], .project-preview-upgrade").count(), 0);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ width, rapidAndScrolledExits: 4, continuousPaging: true, continuousFrames: true, stableParents: true, noPauseReloadOrDuplicate: true, responsiveAndPolicyCleanup: true }));
    await page.close();
  }
} finally { await browser.close(); }
