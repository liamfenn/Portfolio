// Production-build regression check with actual WebKit video playback.
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright-core";

const engine = process.env.FOCUS_BROWSER === "chromium" ? chromium : webkit;
const browser = await engine.launch({ headless: true, ...(engine === chromium ? { channel: "chrome" } : {}) });
const origin = process.argv[2] ?? "http://localhost:3002";
const rect = locator => locator.evaluate(element => {
  const { left, right, width, height } = element.getBoundingClientRect();
  return { left, right, width, height };
});
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${origin}/?inspect=off`, { waitUntil: "networkidle" });
    const bar = page.locator(".portfolio-header"), fill = bar.locator(".header-fill");
    assert.equal((await rect(bar)).width, width === 1440 ? 552 : 366);
    const tile = page.locator('[data-project-id="milktooth-blink-timer"] .homepage-card-trigger');
    await tile.scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    const idle = await rect(fill);
    await tile.click();
    await page.waitForFunction(() => document.querySelector(".portfolio-header")?.classList.contains("is-project-focus"));
    await page.waitForFunction(() => document.querySelector(".project-focus-root")?.dataset.phase === "open");
    await page.waitForTimeout(600);
    assert.equal((await rect(bar)).width, width === 1440 ? 636 : 366);
    assert.ok((await bar.innerText()).includes("Blink"));
    assert.ok(await bar.locator(".header-project-detail").evaluate(element => element.textContent === "Blink" && element.children.length === 0), "scramble settles to plain text");
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(() => document.querySelector(".project-focus-root")?.dataset.phase === "open" && document.querySelector(".project-focus-root")?.dataset.focusProject !== "milktooth-blink-timer");
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "detached" });
    await page.waitForTimeout(700);
    const returned = await rect(fill);
    assert.ok(Math.abs(returned.left - idle.left) < .1 && Math.abs(returned.width - idle.width) < .1, JSON.stringify({ returned, idle }));
    // Interrupt expansion with a quick exit/reopen; no intermediate transform should remain.
    for (let cycle = 0; cycle < 2; cycle++) {
      await tile.click();
      await page.waitForTimeout(70);
      await page.keyboard.press("Escape");
      await page.getByRole("dialog").waitFor({ state: "detached" });
    }
    await page.waitForTimeout(800);
    assert.ok(await fill.evaluate(element => getComputedStyle(element).transform === "none"));
    const sources = await page.locator(".homepage-project-media video").evaluateAll(videos => videos.map(video => video.getAttribute("src")));
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(200);
    assert.ok(await page.locator(".homepage-project-media video").evaluateAll(videos => videos.every(video => video.paused)));
    assert.deepEqual(await page.locator(".homepage-project-media video").evaluateAll(videos => videos.map(video => video.getAttribute("src"))), sources);
    await page.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    // Return from a background tab and immediately scroll across several loaded/unloaded tiles.
    const scroll = await page.evaluate(() => scrollY);
    for (const top of [0, 1800, 3200, 600, scroll]) {
      await page.evaluate(top => scrollTo(0, top), top);
      await page.waitForTimeout(50);
    }
    await page.waitForFunction(() => {
      const visible = [...document.querySelectorAll(".homepage-project-media video")].filter(video => {
        const bounds = video.getBoundingClientRect();
        return bounds.bottom > 0 && bounds.top < innerHeight;
      });
      return visible.length && visible.every(video => !video.paused && video.dataset.frameReady === "true");
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await tile.click();
    await page.waitForFunction(() => document.querySelector(".project-focus-root")?.dataset.phase === "open");
    assert.equal(await bar.evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === "running").length), 0);
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "detached" });
    assert.equal(await page.locator("[data-focus-media], .project-focus-media-backdrop").count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    console.log(engine.name(), width, "header geometry, text settlement, paging, interruptions, background return/fast scroll, cleanup and reduced motion pass");
    await page.close();
  }
} finally { await browser.close(); }
