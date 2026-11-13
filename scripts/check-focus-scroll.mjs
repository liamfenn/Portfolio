// Sample before paint so a one-frame media lag cannot hide behind a settled-position check.
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright-core";

const origin = process.argv[2] ?? "http://localhost:3001";
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch({ headless: true, ...(engine === chromium ? { channel: "chrome" } : {}) });
  try {
    for (const width of [1440, 393]) {
      const page = await browser.newPage({ viewport: { width, height: width < 768 ? 500 : 650 }, isMobile: width < 768, hasTouch: width < 768 });
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`${origin}/?inspect=off`, { waitUntil: "domcontentloaded" });
      // Playwright cannot send wheel input to mobile WebKit; exercise its native scroll container directly.
      const scroll = delta => engine === webkit && width < 768
        ? page.locator(".project-focus-scroll").evaluate((node, amount) => node.scrollBy(0, amount), delta)
        : page.mouse.wheel(0, delta);
      const pageOverscroll = await page.evaluate(() => [document.documentElement, document.body].map(node => getComputedStyle(node).overscrollBehaviorY));
      // A tall viewport fits all the content: wheel input must not bounce its text or the locked page.
      await page.setViewportSize({ width, height: 1200 });
      const fittingTile = page.locator('[data-project-id="shop-07"] .homepage-card-trigger');
      await fittingTile.scrollIntoViewIfNeeded();
      await fittingTile.click();
      await page.waitForFunction(() => document.querySelector(".project-focus-root")?.dataset.phase === "open");
      const fitting = await page.evaluate(() => {
        const scroller = document.querySelector(".project-focus-scroll");
        return {
          fits: scroller.scrollHeight === scroller.clientHeight,
          overscroll: [document.documentElement, document.body, scroller].map(node => getComputedStyle(node).overscrollBehaviorY),
          textTop: scroller.querySelector(".project-focus-summary").getBoundingClientRect().top,
          backgroundScroll: scrollY,
        };
      });
      assert.ok(fitting.fits, "Exercise a focused view with no overflowing content");
      assert.deepEqual(fitting.overscroll, ["none", "none", "none"], "Disable rubber-banding on both the focused scroller and the locked page");
      const header = await page.locator(".portfolio-header").boundingBox();
      for (const y of [240, header.y + header.height / 2]) {
        await page.mouse.move(width / 2, y);
        for (const delta of [800, -800]) { await scroll(delta); await page.waitForTimeout(100); }
        const after = await page.evaluate(() => ({
          top: document.querySelector(".project-focus-summary").getBoundingClientRect().top,
          offset: document.querySelector(".project-focus-scroll").scrollTop,
          backgroundScroll: scrollY,
        }));
        assert.deepEqual(after, { top: fitting.textTop, offset: 0, backgroundScroll: fitting.backgroundScroll });
      }
      await page.keyboard.press("Escape");
      await page.getByRole("dialog").waitFor({ state: "detached" });
      assert.deepEqual(await page.evaluate(() => [document.documentElement, document.body].map(node => getComputedStyle(node).overscrollBehaviorY)), pageOverscroll);
      await page.setViewportSize({ width, height: width < 768 ? 500 : 650 });
      console.log(JSON.stringify({ browser: engine.name(), width, fittingContent: true, overscrollDisabled: true, pagePolicyRestored: true }));
      for (const reduced of [false, true]) {
        await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
        const tile = page.locator('[data-project-id="shop-07"] .homepage-card-trigger');
        await tile.scrollIntoViewIfNeeded();
        const backgroundScroll = await page.evaluate(() => scrollY);
        await tile.click();
        await page.waitForFunction(() => document.querySelector(".project-focus-root")?.dataset.phase === "open");
        await page.evaluate(() => {
          window.__scrollMedia = document.querySelector('[data-focus-media="current"]');
          window.__scrollParent = window.__scrollMedia.parentElement;
          window.__scrollSamples = [];
          const sample = () => {
            const root = document.querySelector(".project-focus-root");
            if (root?.dataset.phase === "open") {
              const slot = root.querySelector(".project-focus-scroll .project-focus-media-slot").getBoundingClientRect();
              const media = document.querySelector('[data-focus-media="current"]').getBoundingClientRect();
              const backing = document.querySelector(".project-focus-media-backdrop")?.getBoundingClientRect();
              window.__scrollSamples.push({
                offset: root.querySelector(".project-focus-scroll").scrollTop,
                delta: media.top - slot.top,
                backingDelta: backing?.width ? backing.top - slot.top : 0,
              });
            }
            window.__scrollFrame = requestAnimationFrame(sample);
          };
          sample();
        });
        await page.mouse.move(width / 2, 240);
        for (const delta of [40, 80, 120, -30, -70, -140]) {
          await scroll(delta);
          await page.waitForTimeout(50);
        }
        await page.waitForTimeout(100);
        const samples = await page.evaluate(() => {
          cancelAnimationFrame(window.__scrollFrame);
          return window.__scrollSamples;
        });
        assert.ok(samples.some(sample => sample.offset > 0), "Exercise real native scrolling");
        const misaligned = samples.filter(sample => Math.abs(sample.delta) > .5 || Math.abs(sample.backingDelta) > .5);
        assert.deepEqual(misaligned, [], `Media and its backing must follow native scrolling in every frame (${engine.name()}, ${width}, reduced=${reduced})`);
        assert.ok(await page.evaluate(() => window.__scrollMedia.parentElement === window.__scrollParent));
        // Paging resets the same scroller; scroll again on an opaque project, then close while scrolled.
        await page.keyboard.press("ArrowRight");
        await page.waitForFunction(() => {
          const root = document.querySelector(".project-focus-root");
          return root?.dataset.phase === "open" && root.dataset.focusProject !== "shop-07";
        });
        assert.equal(await page.locator(".project-focus-scroll").evaluate(node => node.scrollTop), 0);
        await scroll(160);
        await page.waitForFunction(() => document.querySelector(".project-focus-scroll").scrollTop > 0);
        await page.waitForTimeout(100);
        assert.ok(await page.evaluate(() => Math.abs(
          document.querySelector('[data-focus-media="current"]').getBoundingClientRect().top
          - document.querySelector(".project-focus-scroll .project-focus-media-slot").getBoundingClientRect().top,
        ) < .5));
        await page.keyboard.press("Escape");
        await page.getByRole("dialog").waitFor({ state: "detached" });
        assert.equal(await page.locator("[data-focus-media], .project-focus-media-backdrop").count(), 0);
        assert.ok(await page.evaluate(top => Math.abs(scrollY - top) < 1 && document.documentElement.style.overflow !== "hidden", backgroundScroll));
        console.log(JSON.stringify({ browser: engine.name(), width, reduced, alignedFrames: samples.length, pagingAndClose: true }));
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); }
}
