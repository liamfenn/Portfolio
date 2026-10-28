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
    await page.locator(".homepage-identity").click();
    const toggle = page.getByRole("button", { name: /^Cycle project interaction:/ });
    await toggle.waitFor();
    assert.equal(await toggle.getAttribute("data-project-interaction"), "focus");
    const blank = page.locator('[data-project-id="shop-03"] .homepage-card-trigger');
    assert.equal(await blank.getAttribute("aria-haspopup"), "dialog");
    await toggle.click();
    assert.equal(await toggle.getAttribute("data-project-interaction"), "inline");
    assert.equal(await blank.getAttribute("aria-haspopup"), null);
    await blank.click();
    assert.equal(await page.getByRole("dialog").count(), 0);
    if (mobile) assert.equal(await blank.getAttribute("aria-expanded"), "true");
    await toggle.click();
    assert.equal(await toggle.getAttribute("data-project-interaction"), "overlay");
    await toggle.click();
    assert.equal(await toggle.getAttribute("data-project-interaction"), "focus");
    const tile = page.locator('[data-project-id="shop-01"] .homepage-card-trigger');
    await tile.scrollIntoViewIfNeeded();
    if (fixture) await page.waitForFunction(() => { const video = document.querySelector("video"); return video && !video.paused && video.currentTime > 1; });
    const videoTime = await tile.locator("video").evaluate(video => video.currentTime);
    await tile.evaluate(trigger => {
      window.__focusSource = { trigger, media: trigger.querySelector(".homepage-project-media"), video: trigger.querySelector("video"), scroll: scrollY };
    });
    await page.evaluate(mobile => {
      window.__focusSquareSamples = [];
      const square = document.querySelector(`${mobile ? '.work-grid-label-mobile' : '.work-grid-label-desktop'} .work-control-square`);
      const sample = () => {
        const bounds = square.getBoundingClientRect(), control = square.closest("button").getBoundingClientRect();
        window.__focusSquareSamples.push({ x: bounds.left - control.left, y: bounds.top - control.top, transform: getComputedStyle(square).transform });
        window.__focusSquareFrame = requestAnimationFrame(sample);
      };
      sample();
    }, mobile);
    await tile.click();
    const dialog = page.getByRole("dialog");
    assert.equal(await dialog.getAttribute("data-input"), "pointer");
    assert.equal(await dialog.locator(".project-focus-close").evaluate(node => getComputedStyle(node).outlineStyle), "none");
    await page.waitForFunction(() => document.querySelector(".project-focus-root")?.dataset.phase === "open");
    assert.equal(await dialog.locator(".project-focus-glyphs, .project-focus-text-reserve").count(), 0);
    assert.ok(await dialog.locator("[data-focus-text]").evaluateAll(nodes => nodes.every(node => node.textContent === node.dataset.focusText && getComputedStyle(node).visibility === "visible")));
    if (fixture) await page.waitForFunction(time => { const video = document.querySelector('[data-focus-media="current"] video'); return video && !video.paused && video.currentTime >= time; }, videoTime);
    const state = await dialog.evaluate(root => {
      const source = window.__focusSource;
      const slot = root.querySelector(".project-focus-media-slot").getBoundingClientRect();
      const close = root.querySelector(".project-focus-close").getBoundingClientRect();
      const backdrop = getComputedStyle(root.querySelector(".project-focus-backdrop"));
      const blur = getComputedStyle(root.querySelector(".project-focus-blur"));
      return { sameMedia: source.trigger.contains(source.media) && source.media.dataset.focusMedia === "current", sameVideo: source.media.contains(source.video), width: slot.width, left: slot.left, top: slot.top, closeBottom: innerHeight - close.bottom, blur: blur.backdropFilter, tintBlur: backdrop.backdropFilter, color: backdrop.backgroundColor, bodyLocked: document.body.style.position === "fixed", backgroundInert: document.querySelector("main").inert, teamLinks: Array.from(root.querySelectorAll(".project-focus-team a"), link => ({ name: link.querySelector("[data-focus-text]").dataset.focusText, href: link.href })), title: root.querySelector(".project-focus-description [data-focus-text]").dataset.focusText, periodFont: getComputedStyle(root.querySelector(".project-focus-period")).fontSize };
    });
    assert.ok(state.sameMedia && state.sameVideo && state.bodyLocked && state.backgroundInert);
    assert.equal(state.width, mobile ? width : 620);
    assert.equal(state.left, mobile ? 0 : (width - 620) / 2);
    assert.equal(state.top, mobile ? 12 : 24);
    assert.equal(state.closeBottom, mobile ? 24 : 44);
    assert.equal(state.blur, "blur(10px)");
    assert.equal(state.tintBlur, "none");
    assert.equal(state.color, "color(srgb 1 1 1 / 0.92)");
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
        const scroller = document.querySelector(".project-focus-scroll");
        const contentHeight = scroller.scrollHeight;
        const contentClientHeight = scroller.clientHeight;
        const documentHeight = document.documentElement.scrollHeight;
        try {
          document.documentElement.style.setProperty("--project-focus-full-height", "900px");
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
              bottomTop: edges[1].getBoundingClientRect().top,
              backdropBottom: document.querySelector(".project-focus-backdrop").getBoundingClientRect().bottom,
              opaque: edges.every(edge => getComputedStyle(edge).opacity === "1"),
              colors: edges.map(edge => getComputedStyle(edge).backgroundColor),
              unchangedScrollArea: scroller.scrollHeight === contentHeight && scroller.clientHeight === contentClientHeight && document.documentElement.scrollHeight === documentHeight,
              noGradient: edges.every(edge => getComputedStyle(edge, "::before").content === "none" && getComputedStyle(edge, "::after").content === "none"),
              directChildren: edges.every(edge => edge.parentElement === document.body),
              aboveContent: edges.every(edge => Number(getComputedStyle(edge).zIndex) > Number(getComputedStyle(document.querySelector(".project-focus-controls")).zIndex)),
              nativeEdges: edges.every(edge => edge.getAttribute("style") === null),
            });
          }
        } finally {
          document.documentElement.style.removeProperty("--project-focus-full-height");
          if (savedHeight) Object.defineProperty(viewport, "height", savedHeight); else delete viewport.height;
          if (savedTop) Object.defineProperty(viewport, "offsetTop", savedTop); else delete viewport.offsetTop;
          viewport.dispatchEvent(new Event("resize"));
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }
        return records;
      });
      assert.deepEqual(viewportEdges.map(edge => [edge.top, edge.bottomTop, edge.bottom]), Array(3).fill([0, 840, 852]));
      assert.ok(viewportEdges.every(edge => edge.opaque && edge.noGradient && edge.directChildren && edge.aboveContent && edge.nativeEdges));
      assert.ok(viewportEdges.every(edge => edge.unchangedScrollArea && edge.backdropBottom === 900));
      assert.ok(viewportEdges.every(edge => edge.colors[0] === "rgb(246, 248, 249)" && edge.colors[1] === "rgb(255, 255, 255)"));
    }
    await page.locator(".project-focus-media-slot").click({ force: true });
    assert.equal(await dialog.getAttribute("data-phase"), "open");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.querySelector("[data-focus-text]")?.dataset.focusText), "Annabel Lake");
    await page.keyboard.press("Shift+Tab");
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute("aria-label")), "Next project");
    await page.keyboard.press("Shift+Tab");
    assert.equal(await page.evaluate(() => document.activeElement.classList.contains("project-focus-close")), true);
    assert.equal(await dialog.getAttribute("data-input"), "keyboard");
    assert.equal(await dialog.locator(".project-focus-close").evaluate(node => getComputedStyle(node).outlineStyle), "solid");
    // Scrolling the content must never move the viewport-anchored close control.
    await page.locator(".project-focus-scroll").evaluate(node => { node.scrollTop = 200; });
    assert.equal(await page.locator(".project-focus-close").evaluate(node => innerHeight - node.getBoundingClientRect().bottom), mobile ? 24 : 44);
    await page.screenshot({ path: `/tmp/project-focus-${width}.png` });
    const buttonsFirst = await dialog.evaluate(root => {
      const media = document.querySelector('[data-focus-media="current"]');
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      const controls = root.querySelector(".project-focus-controls"), animation = controls.getAnimations()[0];
      animation.pause(); animation.currentTime = 90;
      const opacity = Number(getComputedStyle(controls).opacity);
      const rowsHeld = [...root.querySelectorAll(".project-focus-details h2, .project-focus-description, .project-focus-period, .project-focus-summary, .project-focus-details h3, .project-focus-details li")]
        .every(row => row.getAnimations().length === 0 && getComputedStyle(row).opacity === "1");
      const result = { rowsHeld, buttonsFading: opacity > 0 && opacity < 1, duration: animation.effect.getTiming().duration, mediaHeld: media.getAnimations().length === 0 };
      animation.play();
      return result;
    });
    assert.deepEqual(buttonsFirst, { rowsHeld: true, buttonsFading: true, duration: 180, mediaHeld: true });
    await page.waitForFunction(() => document.querySelector(".project-focus-root")?.dataset.exit === "text");
    const handoff = await dialog.evaluate(root => {
      const media = document.querySelector('[data-focus-media="current"]');
      const before = media.getBoundingClientRect();
      const animations = root.getAnimations({ subtree: true }).filter(animation => animation.effect.target.closest(".project-focus-details"));
      const noMediaAnimation = media.getAnimations().length === 0;
      animations.forEach(animation => { animation.pause(); animation.currentTime = 40; });
      const held = media.getBoundingClientRect();
      const controls = root.querySelector(".project-focus-controls");
      const controlsGone = getComputedStyle(controls).opacity === "0" && getComputedStyle(controls).visibility === "hidden";
      const rows = animations.filter(animation => animation.effect.target.closest(".project-focus-details"));
      const lastRow = rows.find(animation => animation.effect.getTiming().delay === 0);
      const textOpacity = Number(getComputedStyle(lastRow.effect.target).opacity);
      const textTiming = lastRow.effect.getTiming();
      const rowTimings = rows.map(animation => ({ top: animation.effect.target.getBoundingClientRect().top, delay: animation.effect.getTiming().delay, duration: animation.effect.getTiming().duration }));
      animations.forEach(animation => { animation.currentTime = 170; });
      const laterTextOpacity = Number(getComputedStyle(lastRow.effect.target).opacity);
      window.__exitHeldBounds = { top: held.top, left: held.left, width: held.width };
      animations.forEach(animation => animation.play());
      return { held: Math.abs(before.top - held.top) < 0.1 && Math.abs(before.width - held.width) < 0.1, noMediaAnimation, controlsGone, textOpacity, laterTextOpacity, textDelay: textTiming.delay, textDuration: textTiming.duration, rowTimings };
    });
    assert.ok(handoff.held && handoff.noMediaAnimation && handoff.controlsGone);
    assert.ok(handoff.textOpacity > 0 && handoff.textOpacity < 1 && handoff.laterTextOpacity < 0.1);
    assert.equal(handoff.textDelay, 0);
    assert.equal(handoff.textDuration, 180);
    const exitTops = [...new Set(handoff.rowTimings.map(row => row.top))].sort((a, b) => b - a);
    assert.ok(handoff.rowTimings.every(row => row.duration === 180 && row.delay === exitTops.indexOf(row.top) * 12));
    await page.waitForFunction(() => document.querySelector(".project-focus-root")?.dataset.exit === "media");
    const collapse = await dialog.evaluate(root => {
      const media = document.querySelector('[data-focus-media="current"]'), animation = media.getAnimations()[0];
      animation.pause(); animation.currentTime = 90;
      const moving = media.getBoundingClientRect(), held = window.__exitHeldBounds;
      const timing = animation.effect.getTiming();
      const controls = root.querySelector(".project-focus-controls");
      const result = { moves: Math.abs(moving.top - held.top) + Math.abs(moving.left - held.left) + Math.abs(moving.width - held.width) > 0.1, textGone: root.querySelector(".project-focus-details").textContent === "", controlsGone: getComputedStyle(controls).visibility === "hidden", mediaDelay: timing.delay, mediaDuration: timing.duration };
      animation.play();
      return result;
    });
    assert.ok(collapse.moves && collapse.textGone && collapse.controlsGone);
    assert.equal(collapse.mediaDelay, 0);
    assert.equal(collapse.mediaDuration, 180);
    await dialog.waitFor({ state: "detached" });
    assert.equal(await page.locator(".project-focus-edge").count(), 0);
    assert.equal(await page.locator('meta[name="theme-color"]').count(), 0);
    assert.ok(await page.evaluate(() => {
      const source = window.__focusSource;
      return source.trigger.contains(source.media) && source.trigger.contains(source.video) && !document.querySelector("main").inert && document.body.style.position !== "fixed" && document.activeElement === source.trigger && Math.abs(scrollY - source.scroll) < 1;
    }));
    const square = await page.evaluate(async () => {
      await new Promise(resolve => setTimeout(resolve, 250));
      cancelAnimationFrame(window.__focusSquareFrame);
      return window.__focusSquareSamples;
    });
    assert.ok(square.length > 10);
    assert.ok(square.every(sample => sample.transform === "none"));
    assert.ok(Math.max(...square.map(sample => sample.y)) - Math.min(...square.map(sample => sample.y)) < 0.5);
    assert.ok(Math.max(...square.map(sample => sample.x)) - Math.min(...square.map(sample => sample.x)) < 0.5);
    // Repeated open/close and reduced motion exercise cleanup and the alternate motion policy.
    for (let index = 0; index < 3; index++) {
      await page.emulateMedia({ reducedMotion: index === 2 ? "reduce" : "no-preference" });
      await tile.click();
      await dialog.waitFor();
      if (index === 2) {
        await page.waitForFunction(() => document.querySelector(".project-focus-root")?.dataset.phase === "open");
        assert.ok(await dialog.evaluate(root => root.getAnimations({ subtree: true }).every(animation => animation.effect.getTiming().duration === 0)));
      }
      if (index === 1) {
        await page.waitForFunction(() => document.querySelector(".project-focus-root")?.dataset.phase === "open");
        const stable = await dialog.evaluate(async root => {
          const before = [...root.querySelectorAll("[data-focus-text]")].map(node => node.innerHTML);
          document.querySelector(".project-grid").dispatchEvent(new PointerEvent("pointerout", { bubbles: true, relatedTarget: document.body }));
          window.dispatchEvent(new Event("resize"));
          await new Promise(resolve => setTimeout(resolve, 200));
          return [...root.querySelectorAll("[data-focus-text]")].every((node, index) => node.innerHTML === before[index]);
        });
        assert.equal(stable, true);
      }
      if (index === 0) {
        const timing = await dialog.evaluate(root => {
          const media = document.querySelector('[data-focus-media="current"]');
          const animations = [...root.getAnimations({ subtree: true }), ...media.getAnimations()];
          animations.forEach(animation => { animation.pause(); animation.currentTime = 90; });
          return animations.map(animation => ({ duration: animation.effect.getTiming().duration, easing: animation.effect.getTiming().easing, delay: animation.effect.getTiming().delay, text: Boolean(animation.effect.target.closest(".project-focus-details")), controls: Boolean(animation.effect.target.closest(".project-focus-controls")) }));
        });
        assert.equal(timing.length, 16);
        assert.ok(timing.every(animation => !animation.controls && animation.duration === (animation.text ? 600 : 180) && animation.easing === "cubic-bezier(0.65, 0, 0.35, 1)"));
        assert.deepEqual([...new Set(timing.filter(animation => animation.text).map(animation => animation.delay))], [120, 160, 200, 240, 280, 320, 360]);
      }
      await page.getByRole("button", { name: "Close", exact: true }).click();
      await dialog.waitFor({ state: "detached" });
    }
    await tile.click();
    await dialog.waitFor();
    await page.locator(".project-focus-scroll").click({ position: { x: mobile ? 5 : 10, y: mobile ? 840 : 400 } });
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
    assert.equal(await toggle.getAttribute("data-project-interaction"), "inline");
    await page.goto(`${origin}/?inspect=off`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.dataset.inspectorMode === undefined);
    const defaultTile = page.locator('[data-project-id="shop-02"] .homepage-card-trigger');
    await defaultTile.waitFor();
    assert.equal(await page.locator('.project-grid > li').nth(1).getAttribute("data-project-id"), "shop-02");
    assert.equal(await defaultTile.getAttribute("aria-haspopup"), "dialog");
    await defaultTile.click();
    await page.getByRole("dialog").waitFor();
    const rewards = page.getByRole("dialog");
    assert.equal(await rewards.getAttribute("data-input"), "pointer");
    assert.equal(await rewards.locator(".project-focus-close").evaluate(node => getComputedStyle(node).outlineStyle), "none");
    assert.equal(await rewards.locator('.project-focus-description [data-focus-text]').getAttribute("data-focus-text"), "Rewards card");
    assert.equal(await rewards.locator('.project-focus-period [data-focus-text]').getAttribute("data-focus-text"), "Q4 26");
    assert.deepEqual(await rewards.locator('.project-focus-team a').evaluateAll(links => links.map(link => ({ name: link.querySelector('[data-focus-text]').dataset.focusText, href: link.href }))), [
      { name: "Julian Kelly", href: "https://x.com/julianfkelly" },
      { name: "Max Kaplun", href: "https://x.com/maxkaplun" },
      { name: "Ben Parker", href: "https://x.com/benjamintparker" },
    ]);
    assert.equal(await defaultTile.locator('video').count(), 1);
    assert.equal(await defaultTile.locator('video').getAttribute("aria-label"), "Shop Rewards card interaction prototype");
    await page.waitForFunction(() => document.querySelector('[data-focus-media="current"] .project-preview-poster')?.naturalWidth > 0);
    assert.match(await defaultTile.locator('.project-preview-poster').getAttribute("src"), /\/media\/shop-rewards-card\//);
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "detached" });
    await page.reload({ waitUntil: "domcontentloaded" });
    // Keyboard activation can run before hydration; the image ref's settled state confirms React is ready.
    await page.waitForFunction(() => document.querySelector(".homepage-avatar")?.getAttribute("aria-busy") === "false");
    await defaultTile.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("dialog").waitFor();
    assert.equal(await page.getByRole("dialog").getAttribute("data-input"), "keyboard");
    assert.equal(await page.locator(".project-focus-close").evaluate(node => getComputedStyle(node).outlineStyle), "solid");
    await page.locator(".project-focus-media-slot").click({ force: true });
    assert.equal(await page.getByRole("dialog").getAttribute("data-input"), "pointer");
    assert.equal(await page.locator(".project-focus-close").evaluate(node => getComputedStyle(node).outlineStyle), "none");
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "detached" });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ viewportWidth: width, ...state, errors }));
    await context.close();
  }
} finally { await browser.close(); }
