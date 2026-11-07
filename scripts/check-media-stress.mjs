// Optional browser QA for the real homepage media mix. Start npm run dev, then:
//   node scripts/check-media-stress.mjs [origin]
// MEDIA_BROWSER=chromium with CHROMIUM_PATH (an installed Chrome, for H.264) repeats it in Chrome.
// Checks source choice per clip (matte vs alpha), one load per clip across repeated scroll passes, no skeleton on
// return, background-tab pause without release, and that no unrevealed video shows beneath a transparent poster.
// MEDIA_REPORT_ONLY=1 prints the measurements without failing, for comparing against another build.
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright-core";

const origin = process.argv[2] ?? "http://localhost:3001";
const engine = process.env.MEDIA_BROWSER === "chromium" ? chromium : webkit;
const browser = await engine.launch({ headless: true, ...(engine === chromium && process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
const check = process.env.MEDIA_REPORT_ONLY ? new Proxy({}, { get: () => () => {} }) : assert;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

try {
  for (const width of (process.env.MEDIA_WIDTHS ?? "1440,390").split(",").map(Number)) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    const errors = [], bytes = new Map();
    // The dev-only Agentation overlay polls its own local server, unrelated to media.
    page.on("pageerror", error => { if (!error.message.includes("localhost:4747")) errors.push(error.message); });
    page.on("response", async response => {
      if (!/\.(mp4|mov|webm)$/.test(new URL(response.url()).pathname) || response.url().includes("/support/")) return;
      const length = Number(response.headers()["content-length"] ?? 0);
      bytes.set(response.url(), (bytes.get(response.url()) ?? 0) + length);
    });
    await page.addInitScript(() => {
      window.__media = { loads: new Map(), skeletonAfterReady: 0, ghost: 0 };
      const seen = new WeakSet();
      setInterval(() => {
        for (const video of document.querySelectorAll(".homepage-project-media video")) {
          const media = video.closest(".homepage-project-media"), id = media.closest("li")?.dataset.projectId ?? video.getAttribute("aria-label");
          if (!seen.has(video)) {
            seen.add(video);
            video.addEventListener("loadstart", () => {
              if (!video.getAttribute("src")) return;
              const list = window.__media.loads.get(id) ?? [];
              list.push(video.getAttribute("src").split("/").pop());
              window.__media.loads.set(id, list);
            });
          }
          if (video.dataset.everReady === "true" && media.querySelector(".skeleton[data-active='true'], .project-preview-media[aria-busy='true']")) window.__media.skeletonAfterReady++;
          if (video.dataset.frameReady === "true") video.dataset.everReady = "true";
          // A transparent poster over a visible, unrevealed video frame reads as two overlapping phones.
          const poster = media.querySelector(".project-preview-poster");
          if (media.hasAttribute("data-media-alpha") && video.readyState >= 2 && poster && getComputedStyle(poster).visibility === "visible"
            && poster.complete && poster.naturalWidth && Number(getComputedStyle(video).opacity) > 0) window.__media.ghost++;
        }
      }, 30);
    });
    await page.goto(`${origin}/?inspect=off`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelectorAll('.homepage-project-media video[data-frame-ready="true"]').length > 0, null, { timeout: 30_000 });

    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    // Three slow passes over the whole feed, separated by more than the old 15-second release delay.
    for (let pass = 0; pass < 3; pass++) {
      for (let y = 0; y <= height; y += 300) { await page.evaluate(top => scrollTo(0, top), y); await wait(250); }
      for (let y = height; y >= 0; y -= 300) { await page.evaluate(top => scrollTo(0, top), y); await wait(250); }
      if (pass < 2) await wait(16_000);
    }
    await wait(1500);
    const result = await page.evaluate(() => {
      const videos = [...document.querySelectorAll(".homepage-project-media video")];
      return {
        loads: Object.fromEntries(window.__media.loads),
        skeletonAfterReady: window.__media.skeletonAfterReady,
        ghost: window.__media.ghost,
        alphaFormats: videos.filter(video => video.closest("[data-media-alpha]")).map(video => video.dataset.alphaFormat ?? null),
        attached: videos.filter(video => video.getAttribute("src")).length,
        visiblePlaying: videos.filter(video => { const box = video.getBoundingClientRect(); return box.bottom > 0 && box.top < innerHeight; }).map(video => !video.paused),
      };
    });
    const totalMB = [...bytes.values()].reduce((sum, value) => sum + value, 0) / 1e6;
    console.log(`${engine.name()} ${width}px`, JSON.stringify({ ...result, transferredMB: Number(totalMB.toFixed(2)) }, null, 1));
    for (const [id, loads] of Object.entries(result.loads)) {
      // An upgrade to a larger rung is allowed; reloading the same file is not.
      check.equal(new Set(loads).size, loads.length, `${id} reloaded the same source while scrolling: ${loads.join(", ")}`);
    }
    check.equal(result.skeletonAfterReady, 0, "a clip that already played must not show its skeleton again");
    check.equal(result.ghost, 0, "an unrevealed video must not show beneath a transparent poster");
    check.ok(result.alphaFormats.every(format => format === null || format === "h264"), "grid tiles use the composited H.264 copy");
    check.ok(result.visiblePlaying.every(Boolean), "visible clips play after repeated passes");

    // A background tab pauses but keeps its sources.
    const before = await page.evaluate(() => [...document.querySelectorAll(".homepage-project-media video")].map(video => video.getAttribute("src")));
    await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
    await wait(300);
    const hidden = await page.evaluate(() => [...document.querySelectorAll(".homepage-project-media video")].map(video => ({ src: video.getAttribute("src"), paused: video.paused })));
    check.ok(hidden.every(video => video.paused), "background tabs pause every clip");
    check.deepEqual(hidden.map(video => video.src), before, "background tabs keep loaded sources");
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event("visibilitychange")); });
    await page.waitForFunction(() => [...document.querySelectorAll(".homepage-project-media video")].some(video => !video.paused));

    if (width >= 768) {
      // Desktop focus is the one place real alpha shows, above the header.
      const tile = page.locator("button:has(.homepage-project-media[data-media-alpha])").first();
      await tile.scrollIntoViewIfNeeded();
      await wait(600);
      await tile.click();
      const format = await page.waitForFunction(() => {
        const video = document.querySelector('[data-focus-media="current"] video');
        return video?.dataset.frameReady === "true" && video.dataset.alphaFormat !== "h264" && !video.parentElement.querySelector(".project-preview-upgrade") && video.dataset.alphaFormat;
      }, null, { timeout: 30_000 }).then(handle => handle.jsonValue()).catch(async error => {
        console.log(await page.evaluate(() => [...document.querySelectorAll("[data-focus-media] video")].map(video => ({
          role: video.closest("[data-focus-media]").dataset.focusMedia, src: video.getAttribute("src"), format: video.dataset.alphaFormat,
          ready: video.dataset.frameReady, playback: video.dataset.playback, phase: document.querySelector(".project-focus-root")?.dataset.phase }))));
        throw error;
      });
      console.log(`  focused alpha clip plays as ${format}`);
      check.match(format, /^(hevcAlpha|webmAlpha)$/);
      await page.getByRole("button", { name: "Close", exact: true }).click({ force: true }).catch(() => page.keyboard.press("Escape"));
      await page.getByRole("dialog").waitFor({ state: "detached" });
    }
    check.deepEqual(errors, []);
    await context.close();
  }
} finally {
  await browser.close();
}
