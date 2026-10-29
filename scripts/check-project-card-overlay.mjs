// Verify the three-way experiment and card interaction in a production preview build.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright-core");

const origin = process.argv[2] ?? "http://localhost:3126";
const engine = process.env.CARD_BROWSER === "webkit" ? webkit : chromium;
const browser = await engine.launch({ headless: true, ...(engine === chromium && process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
const fixture = process.env.FOCUS_VIDEO_FIXTURE ? await readFile(process.env.FOCUS_VIDEO_FIXTURE) : null;
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: { width: mobile ? 393 : 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage();
    if (fixture) await page.route(/\.mp4(?:\?|$)/, route => route.fulfill({ status: 200, contentType: "video/webm", body: fixture }));
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(origin);
    await page.locator(".homepage-identity").click();
    const cycle = page.getByRole("button", { name: /^Cycle project interaction:/ });
    assert.equal(await cycle.getAttribute("data-project-interaction"), "overlay");
    for (const mode of ["focus", "inline", "overlay", "focus", "inline", "overlay"]) {
      await cycle.click();
      assert.equal(await cycle.getAttribute("data-project-interaction"), mode);
    }
    await page.locator(".homepage-identity").click();
    const first = page.locator('[data-project-id="shop-03"]');
    const next = page.locator('[data-project-id="shop-04"]');
    const trigger = first.locator(".homepage-card-trigger");
    const panel = first.locator(".project-card-panel");
    assert.equal(await trigger.getAttribute("aria-controls"), await panel.getAttribute("id"));
    assert.equal(await panel.getAttribute("inert"), "");
    if (!mobile) await trigger.hover();
    await trigger.click();
    assert.equal(await page.getByRole("dialog").count(), 0);
    assert.equal(await trigger.getAttribute("aria-expanded"), "true");
    // The entry wipe draws on a canvas over a hidden surface, revealing rows itself, then hands back to CSS.
    assert.deepEqual(await panel.evaluate(panel => ({ wipe: panel.dataset.wipe, canvases: panel.querySelectorAll(".project-card-wipe > canvas").length, surface: getComputedStyle(panel.querySelector(".project-card-surface")).opacity })), { wipe: "running", canvases: 1, surface: "0" });
    // Production CSS minifies the token to seconds.
    assert.equal(await panel.evaluate(panel => { const value = getComputedStyle(panel).getPropertyValue("--project-card-overlay-enter-duration").trim(); return parseFloat(value) * (value.endsWith("ms") ? 1 : 1000); }), 900);
    await page.waitForFunction(() => { const panel = document.querySelector('[data-project-id="shop-03"] .project-card-panel'); return !panel.dataset.wipe && !panel.querySelector("canvas"); });
    await page.waitForFunction(() => document.querySelector('[data-project-id="shop-03"] .project-card-panel')?.getAnimations({ subtree: true }).length === 0);
    await page.waitForFunction(() => document.querySelector('[data-swarm-label-id="shop-03:company"]').textContent === "Shop");
    if (!mobile) await page.mouse.move(5, 5);
    assert.equal(await first.locator(".homepage-project-overlay").getAttribute("aria-hidden"), "false");
    const geometry = await first.evaluate(card => {
      const panel = card.querySelector(".project-card-panel"), header = card.querySelector(".homepage-project-overlay");
      const bounds = panel.getBoundingClientRect(), label = header.getBoundingClientRect(), style = getComputedStyle(panel), surface = getComputedStyle(panel.querySelector(".project-card-surface"));
      const rows = [...panel.querySelectorAll("h3,li")].map(row => ({ top: row.getBoundingClientRect().top, delay: parseFloat(getComputedStyle(row).transitionDelay) * 1000, duration: parseFloat(getComputedStyle(row).transitionDuration) * 1000, opacity: getComputedStyle(row).opacity }));
      return { width: bounds.width, height: bounds.height, inset: label.left - bounds.left, headerAbove: Number(getComputedStyle(header).zIndex) > Number(style.zIndex), background: surface.backgroundColor, blur: surface.backdropFilter || surface.webkitBackdropFilter, duration: parseFloat(surface.transitionDuration) * 1000, surfaceOpacity: surface.opacity, rows, caption: getComputedStyle(panel.querySelector("h3")).fontSize, body: getComputedStyle(panel.querySelector("li")).fontSize };
    });
    assert.equal(geometry.width, geometry.height);
    if (mobile) assert.equal(geometry.width, 393);
    assert.equal(geometry.inset, mobile ? 12 : 16);
    assert.ok(geometry.headerAbove);
    assert.ok(["color(srgb 1 1 1 / 0.88)", "rgba(255, 255, 255, 0.88)"].includes(geometry.background), geometry.background);
    assert.equal(geometry.blur, "blur(10px)");
    assert.equal(geometry.duration, 180);
    assert.equal(geometry.surfaceOpacity, "1");
    assert.equal(geometry.caption, mobile ? "13px" : "14px");
    assert.equal(geometry.body, mobile ? "14px" : "15px");
    assert.ok(geometry.rows.every(row => row.opacity === "1"));
    assert.equal(Math.max(...geometry.rows.map(row => row.delay + row.duration)), 180);
    assert.equal(Math.min(...geometry.rows.map(row => row.delay)), 0);
    assert.ok(geometry.rows.find(row => row.top > geometry.rows[0].top).delay > 0);
    assert.equal(await panel.locator("a").count(), 3);
    assert.equal(await trigger.locator("a").count(), 0);
    if (mobile) await first.screenshot({ path: "/tmp/project-card-overlay-mobile.png" });
    await panel.locator("a").first().evaluate(link => link.addEventListener("click", event => event.preventDefault(), { once: true }));
    await panel.locator("a").first().click();
    assert.equal(await trigger.getAttribute("aria-expanded"), "true", "credit links must not toggle the card");
    await trigger.click();
    assert.equal(await trigger.getAttribute("aria-expanded"), "false");
    assert.equal(await first.locator(".homepage-project-overlay").getAttribute("aria-hidden"), "true");
    const exit = await panel.evaluate(panel => [...panel.querySelectorAll("h3,li")].map(row => ({ top: row.getBoundingClientRect().top, delay: parseFloat(getComputedStyle(row).transitionDelay) * 1000, duration: parseFloat(getComputedStyle(row).transitionDuration) * 1000 })));
    assert.equal(Math.max(...exit.map(row => row.delay + row.duration)), 180);
    assert.ok(exit[0].delay > exit.at(-1).delay);
    await trigger.click();
    await next.locator(".homepage-card-trigger").click();
    assert.equal(await page.locator('.project-card-panel.is-open').count(), 1);
    assert.equal(await next.locator(".homepage-card-trigger").getAttribute("aria-expanded"), "true");
    await next.locator("a").first().focus();
    assert.ok(await next.locator("a").first().evaluate(link => document.activeElement === link));
    await page.keyboard.press("Escape");
    assert.equal(await next.locator(".homepage-card-trigger").getAttribute("aria-expanded"), "false");
    assert.ok(await next.locator(".homepage-card-trigger").evaluate(button => document.activeElement === button));
    if (mobile) {
      await page.locator('.work-grid-control').click();
      await trigger.click();
      await page.waitForTimeout(250);
      assert.ok(await first.evaluate(card => card.classList.contains("is-expanded") && card.getBoundingClientRect().width === 393));
      await next.locator(".homepage-card-trigger").click();
      await page.waitForTimeout(250);
      assert.equal(await page.locator(".homepage-card.is-expanded").count(), 1);
      assert.equal(await page.locator(".project-card-panel.is-open").count(), 1);
    } else {
      await trigger.focus();
      await page.keyboard.press("Enter");
      assert.equal(await trigger.getAttribute("aria-expanded"), "true");
      assert.equal(await panel.evaluate(panel => getComputedStyle(panel).outlineStyle), "solid", "the surface must not obscure keyboard focus");
      // A new project receiving keyboard focus closes the pinned card.
      await next.locator(".homepage-card-trigger").focus();
      assert.equal(await trigger.getAttribute("aria-expanded"), "false");
      const video = page.locator('[data-project-id="shop-01"] video');
      const videoButton = page.locator('[data-project-id="shop-01"] .homepage-card-trigger');
      await videoButton.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => { const video = document.querySelector("video"); return video.dataset.frameReady === "true" && !video.paused && video.currentTime > 0; });
      await video.evaluate(video => { window.__videoBeforeOverlay = { video, source: video.currentSrc, time: video.currentTime }; window.__overlayLoads = 0; video.addEventListener("loadstart", () => window.__overlayLoads++); });
      for (let i = 0; i < 4; i++) await videoButton.click();
      const continuity = await video.evaluate(video => ({ same: window.__videoBeforeOverlay.video === video, source: window.__videoBeforeOverlay.source === video.currentSrc, advanced: video.currentTime > window.__videoBeforeOverlay.time, loads: window.__overlayLoads, count: document.querySelector('[data-project-id="shop-01"]').querySelectorAll("video").length }));
      assert.deepEqual(continuity, { same: true, source: true, advanced: true, loads: 0, count: 1 });
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await trigger.click();
    assert.deepEqual(await panel.evaluate(panel => ({ panel: getComputedStyle(panel).transitionProperty, surface: getComputedStyle(panel.querySelector(".project-card-surface")).transitionProperty, wipe: panel.dataset.wipe ?? null, canvases: panel.querySelectorAll("canvas").length })), { panel: "none", surface: "none", wipe: null, canvases: 0 });
    await page.reload();
    await page.locator(".homepage-identity").click();
    assert.equal(await cycle.getAttribute("data-project-interaction"), "overlay");
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ browser: engine.name(), mobile, cycle: true, labelsPinned: true, overlayTiming: geometry.duration, keyboardAndLinks: true, originalVideo: !mobile }));
    await context.close();
  }
} finally { await browser.close(); }
