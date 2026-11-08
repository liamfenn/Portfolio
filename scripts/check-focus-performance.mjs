// Production-build comparison with the real alpha assets, not a substitute video fixture.
// FOCUS_BROWSER=chromium enables Chrome's layout metrics; default is WebKit.
// FOCUS_CSS optionally isolates a suspected CSS cost without changing the source.
// Frame timings in a headless browser do not establish native Safari smoothness.
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright-core";

const engine = process.env.FOCUS_BROWSER === "chromium" ? chromium : webkit;
const browser = await engine.launch({ headless: true, ...(engine === chromium ? { channel: "chrome" } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${process.argv[2] ?? "http://localhost:3002"}/?inspect=off`, { waitUntil: "networkidle" });
  if (process.env.FOCUS_CSS) await page.addStyleTag({ content: process.env.FOCUS_CSS });
  const tile = page.locator('[data-project-id="milktooth-blink-timer"] .homepage-card-trigger');
  await tile.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('[data-project-id="milktooth-blink-timer"] video')?.dataset.frameReady === "true");
  const session = engine === chromium ? await page.context().newCDPSession(page) : null;
  await session?.send("Performance.enable");
  const metrics = async () => Object.fromEntries((await session?.send("Performance.getMetrics"))?.metrics.map(item => [item.name, item.value]) ?? []);
  const start = await metrics();
  await page.evaluate(() => {
    window.__focusStats = { frames: [], mutations: 0, replacements: 0 };
    let previous = performance.now();
    const frame = now => {
      window.__focusStats.frames.push(now - previous); previous = now;
      window.__focusFrame = requestAnimationFrame(frame);
    };
    window.__focusFrame = requestAnimationFrame(frame);
    window.__focusObserver = new MutationObserver(records => {
      window.__focusStats.mutations += records.length;
      window.__focusStats.replacements += records.filter(record => record.type === "childList").length;
    });
    window.__focusObserver.observe(document.querySelector(".portfolio-header"), { subtree: true, childList: true, characterData: true, attributes: true });
  });
  for (let cycle = 0; cycle < 4; cycle++) {
    await tile.click();
    await page.waitForFunction(() => document.querySelector(".project-focus-root")?.dataset.phase === "open");
    await page.waitForFunction(() => {
      const video = document.querySelector('[data-focus-media="current"] video');
      return video?.dataset.frameReady === "true" && !video.paused && !video.parentElement.querySelector(".project-preview-upgrade");
    });
    assert.equal(await page.locator(".homepage-project-media video").evaluateAll(videos => videos.filter(video => !video.closest("[data-focus-media]") && !video.paused).length), 0);
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "detached" });
    await page.waitForTimeout(700);
  }
  const end = await metrics();
  const stats = await page.evaluate(() => {
    cancelAnimationFrame(window.__focusFrame); window.__focusObserver.disconnect();
    const { frames, ...stats } = window.__focusStats;
    frames.sort((a, b) => a - b);
    return { ...stats, frames: frames.length, p95FrameMs: frames[Math.floor(frames.length * .95)], maxFrameMs: frames.at(-1), over34ms: frames.filter(ms => ms > 34).length,
      videos: [...document.querySelectorAll(".homepage-project-media video")].filter(video => video.getAttribute("src")).map(video => ({ id: video.closest("[data-project-id]").dataset.projectId, width: video.videoWidth, paused: video.paused, format: video.dataset.alphaFormat })) };
  });
  for (const name of ["LayoutCount", "LayoutDuration", "RecalcStyleCount", "RecalcStyleDuration", "ScriptDuration"]) if (session) stats[name] = end[name] - start[name];
  assert.equal(await page.locator("[data-focus-media], .project-focus-media-backdrop").count(), 0);
  assert.deepEqual(errors, []);
  console.log(engine.name(), JSON.stringify(stats, null, 2));
} finally { await browser.close(); }
