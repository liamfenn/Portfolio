// Optional browser QA, using the same Playwright tooling as the capture scripts.
// Start npm run dev; then PLAYWRIGHT_BROWSERS_PATH=<cache> node scripts/check-video-grid.mjs [origin]
import assert from "node:assert/strict";
import { webkit } from "playwright-core";
import sharp from "sharp";

const origin = process.argv[2] ?? "http://localhost:3001";
const browser = await webkit.launch({ headless: true });
const snapshots = page => page.locator("video").evaluateAll(videos => videos.map(video => ({
  src: video.getAttribute("src"), playing: !video.paused, state: video.dataset.playback,
  ready: video.dataset.frameReady, width: video.videoWidth, time: video.currentTime,
  top: video.getBoundingClientRect().top,
})));
try {
  for (const width of process.env.VIDEO_CHECK_FALLBACKS_ONLY ? [] : [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => {
      window.__videoStats = { maxLoading: 0, maxPlaying: 0, firstFrameMs: null };
      setInterval(() => {
        const videos = [...document.querySelectorAll("video")];
        if (window.__videoStats.firstFrameMs === null && videos.some(video => video.dataset.frameReady === "true")) window.__videoStats.firstFrameMs = Math.round(performance.now());
        window.__videoStats.maxLoading = Math.max(window.__videoStats.maxLoading, videos.filter(video => video.dataset.playback === "loading").length);
        window.__videoStats.maxPlaying = Math.max(window.__videoStats.maxPlaying, videos.filter(video => !video.paused).length);
      }, 25);
    });
    await page.goto(`${origin}/dev/video-lab`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector('video[data-frame-ready="true"]'));
    await page.waitForTimeout(1200);
    const limit = width < 768 ? 2 : 4;
    const initial = await snapshots(page);
    assert.equal(initial.length, 12);
    assert.ok(initial.filter(video => video.playing).length <= limit);
    assert.ok(initial.filter(video => video.src).length <= limit + 1);
    assert.ok(initial.some(video => !video.src));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() => [...document.querySelectorAll("video")].every(video => !video.hasAttribute("src")));
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForFunction(() => document.querySelector('video[data-frame-ready="true"]'));
    await page.getByRole("button", { name: "6 columns", exact: true }).click();
    await page.getByRole("button", { name: "Prioritize video 12", exact: true }).hover();
    await page.waitForFunction(() => document.querySelectorAll("video")[11].dataset.frameReady === "true");
    await page.getByRole("button", { name: "1 columns", exact: true }).click();
    const last = page.locator("video").last();
    await last.scrollIntoViewIfNeeded();
    await page.waitForFunction(expected => document.querySelectorAll("video")[11].videoWidth === expected && document.querySelectorAll("video")[11].dataset.frameReady === "true", width < 768 ? 800 : 1600);
    await page.waitForTimeout(16_000);
    assert.equal((await snapshots(page))[0].src, null, "far-away decoder source must be released");
    await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
    assert.ok((await snapshots(page)).every(video => !video.src && !video.playing));
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event("visibilitychange")); });
    await page.waitForFunction(() => document.querySelector('video[data-frame-ready="true"]'));
    // Check the actual rendered edge at fractional scroll positions, not just encoded pixels.
    for (const offset of [0, 0.5, -0.5, 7.25]) {
      await page.evaluate(y => window.scrollBy(0, y), offset);
      const wrapper = page.locator(".project-preview-media").last();
      const png = await wrapper.screenshot({ animations: "disabled" });
      const { data } = await sharp(png).extract({ left: 0, top: 0, width: 100, height: 2 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      assert.ok(Math.min(...data) > 150, "unexpected dark seam on the video's top edge");
    }
    const stats = await page.evaluate(() => ({ ...window.__videoStats,
      frames: [...document.querySelectorAll("video")].filter(video => !video.paused).map(video => {
        const quality = video.getVideoPlaybackQuality();
        return { total: quality.totalVideoFrames, dropped: quality.droppedVideoFrames };
      }),
    }));
    assert.ok(stats.maxLoading <= 2, JSON.stringify(stats));
    assert.ok(stats.maxPlaying <= limit, JSON.stringify(stats));
    assert.deepEqual(errors, []);
    console.log(`${width}px: twelve clips, priority, resizing, release, background policy, and clean edges`, stats);
    await context.close();
  }
  for (const mode of ["reduced-motion", "save-data", "no-js", "blocked", "failed"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: mode === "reduced-motion" ? "reduce" : "no-preference", javaScriptEnabled: mode !== "no-js" });
    const page = await context.newPage();
    let mediaRequests = 0;
    page.on("request", request => { if (request.url().includes(".mp4")) mediaRequests++; });
    if (mode === "save-data") await page.addInitScript(() => { const connection = new EventTarget(); connection.saveData = true; Object.defineProperty(navigator, "connection", { value: connection }); });
    if (mode === "blocked") await page.addInitScript(() => { HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException("Test autoplay denial", "NotAllowedError")); });
    if (mode === "failed") await page.route("**/*.mp4*", route => route.abort());
    await page.goto(`${origin}/dev/video-lab`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    const videos = await snapshots(page);
    assert.equal(videos.length, 12);
    assert.ok(videos.every(video => !video.playing && video.ready !== "true"));
    if (["reduced-motion", "save-data", "no-js"].includes(mode)) assert.equal(mediaRequests, 0);
    else {
      assert.ok(videos.some(video => video.state === (mode === "blocked" ? "blocked" : "error")));
      const before = mediaRequests;
      await page.waitForTimeout(1500);
      assert.equal(mediaRequests, before, "retries must stop");
    }
    console.log(`${mode}: poster fallback verified (${mediaRequests} media requests)`);
    await context.close();
  }
} finally { await browser.close(); }
