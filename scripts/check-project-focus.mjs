// Start the dev server (or a production build with NEXT_PUBLIC_VERCEL_ENV=preview).
// Uses the same optional Playwright setup as the media capture scripts.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
const origin = process.argv[2] ?? "http://localhost:3100";
// Optional supported-codec fixture for Chromium builds without H.264 decoding.
const fixture = process.env.FOCUS_VIDEO_FIXTURE ? await readFile(process.env.FOCUS_VIDEO_FIXTURE) : null;
try {
  for (const width of [1440, 393]) {
    const mobile = width < 768;
    const context = await browser.newContext({ viewport: { width, height: mobile ? 852 : 1024 }, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage();
    if (fixture) await page.route(/\.mp4(?:\?|$)/, route => route.fulfill({ status: 200, contentType: "video/webm", body: fixture }));
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.dataset.inspectorMode !== undefined);
    assert.ok((await page.locator('meta[name="viewport"]').getAttribute("content")).includes("viewport-fit=cover"));
    await page.evaluate(() => {
      window.__focusGlitched = new Set();
      window.__focusShortFrames = new Set();
      window.__focusVisibleColors = {};
      window.__focusColorsDuringMediaMove = false;
      new MutationObserver(() => {
        document.querySelectorAll(".project-focus-text").forEach(node => {
          if (node.querySelector(".project-focus-glyphs").textContent.length !== node.dataset.focusText.length) window.__focusShortFrames.add(node.dataset.focusText);
          if (node.querySelector('.project-focus-glyphs [style*="color"]')) {
            window.__focusGlitched.add(node.dataset.focusText);
            const media = document.querySelector(".project-focus-root .homepage-project-media");
            if (media?.getAnimations().some(animation => animation.playState === "running" && animation.currentTime < animation.effect.getTiming().duration)) window.__focusColorsDuringMediaMove = true;
            const container = node.closest(".project-focus-details, .project-focus-close");
            if (Number(getComputedStyle(container).opacity) >= 0.75) {
              const observation = window.__focusVisibleColors[node.dataset.focusText] ??= { first: performance.now(), last: 0 };
              observation.last = performance.now();
            }
          }
        });
      }).observe(document.body, { subtree: true, childList: true });
    });
    await page.locator(".homepage-identity").click();
    const toggle = page.getByRole("button", { name: "Preview project focus on tap" });
    await toggle.waitFor();
    assert.equal(await toggle.getAttribute("aria-pressed"), "false");
    const blank = page.locator('[data-project-id="shop-02"] .homepage-card-trigger');
    await blank.click();
    assert.equal(await page.getByRole("dialog").count(), 0);
    if (mobile) assert.equal(await blank.getAttribute("aria-expanded"), "true");
    await toggle.click();
    assert.equal(await toggle.getAttribute("aria-pressed"), "true");
    const tile = page.locator('[data-project-id="shop-01"] .homepage-card-trigger');
    await tile.scrollIntoViewIfNeeded();
    if (fixture) await page.waitForFunction(() => { const video = document.querySelector("video"); return video && !video.paused && video.currentTime > 1; });
    const videoTime = await tile.locator("video").evaluate(video => video.currentTime);
    await tile.evaluate(trigger => {
      window.__focusSource = { trigger, media: trigger.querySelector(".homepage-project-media"), video: trigger.querySelector("video"), scroll: scrollY };
    });
    await tile.click();
    const dialog = page.getByRole("dialog");
    await page.waitForFunction(() => document.querySelector(".project-focus-root")?.dataset.phase === "open");
    await page.waitForFunction(() => Array.from(document.querySelectorAll(".project-focus-text")).every(node => node.querySelector(".project-focus-glyphs").textContent === node.dataset.focusText));
    assert.equal(await page.evaluate(() => window.__focusGlitched.size), 8);
    assert.equal(await page.evaluate(() => window.__focusShortFrames.size), 0);
    assert.equal(await page.evaluate(() => window.__focusColorsDuringMediaMove), false);
    const visibleColors = await page.evaluate(() => Object.values(window.__focusVisibleColors).map(timing => timing.last - timing.first));
    assert.equal(visibleColors.length, 8);
    assert.ok(visibleColors.every(duration => duration >= 80), `Visible glitch durations: ${visibleColors}`);
    const lateFlashes = await dialog.evaluate(async root => {
      const changes = [];
      const observer = new MutationObserver(() => {
        if (root.querySelector('.project-focus-glyphs [style*="color"]')) changes.push(performance.now());
      });
      observer.observe(root, { subtree: true, childList: true });
      await new Promise(resolve => setTimeout(resolve, 600));
      observer.disconnect();
      return changes.length;
    });
    assert.equal(lateFlashes, 0);
    if (fixture) await page.waitForFunction(time => { const video = document.querySelector(".project-focus-root video"); return video && !video.paused && video.currentTime >= time; }, videoTime);
    const state = await dialog.evaluate(root => {
      const source = window.__focusSource;
      const slot = root.querySelector(".project-focus-media-slot").getBoundingClientRect();
      const close = root.querySelector(".project-focus-close").getBoundingClientRect();
      const backdrop = getComputedStyle(root.querySelector(".project-focus-backdrop"));
      const blur = getComputedStyle(root.querySelector(".project-focus-blur"));
      return { sameMedia: root.contains(source.media), sameVideo: root.contains(source.video), width: slot.width, left: slot.left, top: slot.top, closeBottom: innerHeight - close.bottom, blur: blur.backdropFilter, tintBlur: backdrop.backdropFilter, color: backdrop.backgroundColor, bodyLocked: document.body.style.position === "fixed", backgroundInert: document.querySelector("main").inert, teamLinks: Array.from(root.querySelectorAll(".project-focus-team a"), link => ({ name: link.querySelector("[data-focus-text]").dataset.focusText, href: link.href })), title: root.querySelector(".project-focus-description [data-focus-text]").dataset.focusText, periodFont: getComputedStyle(root.querySelector(".project-focus-period")).fontSize };
    });
    assert.ok(state.sameMedia && state.sameVideo && state.bodyLocked && state.backgroundInert);
    assert.equal(state.width, mobile ? width : 620);
    assert.equal(state.left, mobile ? 0 : (width - 620) / 2);
    assert.equal(state.top, mobile ? 12 : 24);
    assert.equal(state.closeBottom, mobile ? 24 : 44);
    assert.equal(state.blur, "blur(8px)");
    assert.equal(state.tintBlur, "none");
    assert.equal(state.color, "color(srgb 1 1 1 / 0.88)");
    assert.equal(state.title, "Product details page");
    assert.deepEqual(state.teamLinks, [
      { name: "Annabel Lake", href: "https://uk.linkedin.com/in/annabellake" },
      { name: "Luke Dupont", href: "https://www.linkedin.com/in/lukedupont" },
      { name: "Jon Rundle", href: "https://jonrundle.design/" },
    ]);
    assert.equal(state.periodFont, mobile ? "13px" : "14px");
    if (mobile) {
      const viewportEdges = await page.evaluate(async () => {
        const viewport = window.visualViewport;
        const savedHeight = Object.getOwnPropertyDescriptor(viewport, "height");
        const savedTop = Object.getOwnPropertyDescriptor(viewport, "offsetTop");
        const records = [];
        try {
          for (const [height, top] of [[650, 0], [820, 0], [790, 12]]) {
            Object.defineProperty(viewport, "height", { configurable: true, value: height });
            Object.defineProperty(viewport, "offsetTop", { configurable: true, value: top });
            viewport.dispatchEvent(new Event("resize"));
            viewport.dispatchEvent(new Event("scroll"));
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            const edges = [...document.querySelectorAll(".project-focus-edge")];
            records.push({
              top: edges[0].getBoundingClientRect().top,
              bottom: edges[1].getBoundingClientRect().bottom,
              opaque: edges.every(edge => getComputedStyle(edge).opacity === "1" && getComputedStyle(edge).backgroundColor === "rgb(255, 255, 255)"),
              noGradient: edges.every(edge => getComputedStyle(edge, "::before").content === "none" && getComputedStyle(edge, "::after").content === "none"),
              directChildren: edges.every(edge => edge.parentElement === document.body),
              behindContent: edges.every(edge => Number(getComputedStyle(edge).zIndex) < Number(getComputedStyle(document.querySelector(".project-focus-root")).zIndex)),
            });
          }
        } finally {
          if (savedHeight) Object.defineProperty(viewport, "height", savedHeight); else delete viewport.height;
          if (savedTop) Object.defineProperty(viewport, "offsetTop", savedTop); else delete viewport.offsetTop;
          viewport.dispatchEvent(new Event("resize"));
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }
        return records;
      });
      assert.deepEqual(viewportEdges.map(edge => [edge.top, edge.bottom]), [[0, 650], [0, 820], [12, 802]]);
      assert.ok(viewportEdges.every(edge => edge.opaque && edge.noGradient && edge.directChildren && edge.behindContent));
    }
    await page.locator(".project-focus-media-slot").click();
    assert.equal(await dialog.getAttribute("data-phase"), "open");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.querySelector("[data-focus-text]")?.dataset.focusText), "Annabel Lake");
    await page.keyboard.press("Shift+Tab");
    assert.equal(await page.evaluate(() => document.activeElement.classList.contains("project-focus-close")), true);
    // Scrolling the content must never move the viewport-anchored close control.
    await page.locator(".project-focus-scroll").evaluate(node => { node.scrollTop = 200; });
    assert.equal(await page.locator(".project-focus-close").evaluate(node => innerHeight - node.getBoundingClientRect().bottom), mobile ? 24 : 44);
    await page.screenshot({ path: `/tmp/project-focus-${width}.png` });
    await page.keyboard.press("Escape");
    const handoff = await dialog.evaluate(root => {
      const media = root.querySelector(".homepage-project-media");
      const before = media.getBoundingClientRect();
      const animations = root.getAnimations({ subtree: true });
      animations.forEach(animation => { animation.pause(); animation.currentTime = 40; });
      const held = media.getBoundingClientRect();
      const details = root.querySelector(".project-focus-details");
      const textOpacity = Number(getComputedStyle(details).opacity);
      const mediaTiming = animations.find(animation => animation.effect.target === media).effect.getTiming();
      const textTiming = animations.find(animation => animation.effect.target === details).effect.getTiming();
      animations.forEach(animation => { animation.currentTime = 110; });
      const moving = media.getBoundingClientRect();
      const laterTextOpacity = Number(getComputedStyle(details).opacity);
      animations.forEach(animation => animation.play());
      return { held: Math.abs(before.top - held.top) < 0.1 && Math.abs(before.width - held.width) < 0.1, textOpacity, laterTextOpacity, movesAfterDelay: Math.abs(moving.top - held.top) + Math.abs(moving.width - held.width) > 0.1, mediaDelay: mediaTiming.delay, textDelay: textTiming.delay, textDuration: textTiming.duration };
    });
    assert.ok(handoff.held && handoff.movesAfterDelay);
    assert.ok(handoff.textOpacity > 0 && handoff.textOpacity < 1 && handoff.laterTextOpacity < 0.1);
    assert.equal(handoff.mediaDelay, 80);
    assert.equal(handoff.textDelay, 0);
    assert.equal(handoff.textDuration, 120);
    await dialog.waitFor({ state: "detached" });
    assert.equal(await page.locator(".project-focus-edge").count(), 0);
    assert.equal(await page.locator('meta[name="theme-color"]').count(), 0);
    assert.ok(await page.evaluate(() => {
      const source = window.__focusSource;
      return source.trigger.contains(source.media) && source.trigger.contains(source.video) && !document.querySelector("main").inert && document.body.style.position !== "fixed" && document.activeElement === source.trigger && Math.abs(scrollY - source.scroll) < 1;
    }));
    // Repeated open/close and reduced motion exercise cleanup and the alternate motion policy.
    for (let index = 0; index < 3; index++) {
      await page.emulateMedia({ reducedMotion: index === 2 ? "reduce" : "no-preference" });
      if (index === 2) await page.evaluate(() => window.__focusGlitched.clear());
      await tile.click();
      await dialog.waitFor();
      if (index === 2) {
        await page.waitForFunction(() => document.querySelector(".project-focus-root")?.dataset.phase === "open");
        assert.equal(await page.evaluate(() => window.__focusGlitched.size), 0);
      }
      if (index === 0) {
        const timing = await dialog.evaluate(root => {
          const animations = root.getAnimations({ subtree: true });
          animations.forEach(animation => { animation.pause(); animation.currentTime = 90; });
          return animations.map(animation => ({ duration: animation.effect.getTiming().duration, easing: animation.effect.getTiming().easing, delay: animation.effect.getTiming().delay, text: animation.effect.target.matches(".project-focus-details, .project-focus-close") }));
        });
        assert.equal(timing.length, 5);
        assert.ok(timing.every(animation => animation.duration === (animation.text ? 80 : 180) && animation.easing === "cubic-bezier(0.65, 0, 0.35, 1)"));
        assert.ok(timing.every(animation => animation.delay === (animation.text ? 180 : 0)));
      }
      await page.getByRole("button", { name: "Close", exact: true }).click();
      await dialog.waitFor({ state: "detached" });
    }
    await tile.click();
    await dialog.waitFor();
    await page.locator(".project-focus-scroll").click({ position: { x: mobile ? width / 2 : 10, y: mobile ? 650 : 400 } });
    await dialog.waitFor({ state: "detached" });
    if (mobile) {
      await page.evaluate(() => {
        document.documentElement.style.setProperty("--viewport-safe-top", "59px");
        document.documentElement.style.setProperty("--viewport-safe-bottom", "34px");
      });
      await blank.click();
      await page.waitForFunction(() => document.querySelector(".project-focus-root")?.dataset.phase === "open");
      const safe = await dialog.evaluate(root => ({
        tintTop: root.querySelector(".project-focus-backdrop").getBoundingClientRect().top,
        tintBottom: root.querySelector(".project-focus-backdrop").getBoundingClientRect().bottom,
        blurTop: root.querySelector(".project-focus-blur").getBoundingClientRect().top,
        blurBottom: root.querySelector(".project-focus-blur").getBoundingClientRect().bottom,
        mediaTop: root.querySelector(".project-focus-media-slot").getBoundingClientRect().top,
        closeBottom: innerHeight - root.querySelector(".project-focus-close").getBoundingClientRect().bottom,
      }));
      assert.deepEqual(safe, { tintTop: -59, tintBottom: 886, blurTop: -59, blurBottom: 886, mediaTop: 59, closeBottom: 58 });
      await page.getByRole("button", { name: "Close", exact: true }).click();
      await dialog.waitFor({ state: "detached" });
      await page.evaluate(() => {
        document.documentElement.style.removeProperty("--viewport-safe-top");
        document.documentElement.style.removeProperty("--viewport-safe-bottom");
      });
    }
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.locator(".homepage-identity").click();
    // The inspector was left shown before opening, so this first click hides it.
    await page.locator(".homepage-identity").click();
    await toggle.click();
    assert.equal(await toggle.getAttribute("aria-pressed"), "false");
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ viewportWidth: width, ...state, errors }));
    await context.close();
  }
} finally { await browser.close(); }
