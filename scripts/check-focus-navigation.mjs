// Run against a development server or a production preview. Optional FOCUS_VIDEO_FIXTURE enables codec-independent playback.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright-core";

const origin = process.argv[2] ?? "http://localhost:3100";
const fixture = process.env.FOCUS_VIDEO_FIXTURE ? await readFile(process.env.FOCUS_VIDEO_FIXTURE) : null;
const description = "Experiential campaign centered around social graph of personalized baskets with real products selected from the canvas. Each card is generated on device, dynamic layout and physics every time.";
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
try {
  for (const width of [1440, 393]) {
    const mobile = width < 768;
    const context = await browser.newContext({ viewport: { width, height: mobile ? 650 : 1024 }, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    if (fixture) await page.route(/\.mp4(?:\?|$)/, route => route.fulfill({ status: 200, contentType: "video/webm", body: fixture }));
    await page.goto(`${origin}/?inspect=off`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector(".homepage-avatar")?.getAttribute("aria-busy") === "false");
    const order = () => page.locator(".project-grid > li").evaluateAll(nodes => nodes.map(node => node.dataset.projectId));
    const ids = await order();
    const tile = id => page.locator(`[data-project-id="${id}"] .homepage-card-trigger`);
    const dialog = page.getByRole("dialog");
    await tile(ids[0]).scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      window.__projectSources = Object.fromEntries([...document.querySelectorAll(".project-grid > li")].map(node => [node.dataset.projectId, {
        trigger: node.querySelector("button"), media: node.querySelector(".homepage-project-media"),
      }]));
      window.__focusInitialScroll = scrollY;
    });
    await tile(ids[0]).click();
    await dialog.waitFor();
    const fade = await dialog.locator(".project-focus-summary").evaluate(summary => {
      const animation = summary.getAnimations()[0];
      const timing = animation.effect.getTiming();
      animation.pause();
      animation.currentTime = timing.delay + timing.duration / 2;
      const opacity = Number(getComputedStyle(summary).opacity);
      animation.play();
      return { duration: timing.duration, delay: timing.delay, opacity, text: summary.textContent, streamed: Boolean(summary.querySelector(".project-focus-glyphs")) };
    });
    assert.ok(fade.duration > 500 && fade.duration < 700 && fade.delay === 180);
    assert.ok(fade.opacity > 0 && fade.opacity < 1);
    assert.equal(fade.text, description);
    assert.equal(fade.streamed, false);
    const settled = async id => {
      await page.waitForFunction(id => {
        const root = document.querySelector(".project-focus-root");
        return root?.dataset.focusProject === id && root.dataset.phase === "open" && [...root.querySelectorAll(".project-focus-glyphs")].every(node => node.dataset.reveal === "settled");
      }, id);
    };
    await settled(ids[0]);
    const layout = await dialog.evaluate(root => {
      const details = root.querySelector(".project-focus-details"), summary = root.querySelector(".project-focus-summary");
      const team = root.querySelector(".project-focus-team").getBoundingClientRect(), tech = root.querySelector(".project-focus-tech").getBoundingClientRect();
      const summaryBox = summary.getBoundingClientRect();
      return {
        gap: getComputedStyle(details).gap, summaryWidth: summaryBox.width, serif: getComputedStyle(summary).fontFamily,
        techOffset: tech.left - team.left, creditsWidth: root.querySelector(".project-focus-credits").getBoundingClientRect().width,
        tech: [...root.querySelectorAll(".project-focus-tech li [data-focus-text]")].map(node => node.dataset.focusText),
      };
    });
    assert.equal(layout.gap, mobile ? "32px" : "36px");
    assert.equal(layout.summaryWidth, mobile ? 361 : 500);
    assert.match(layout.serif, /Otto/i);
    assert.equal(layout.techOffset, layout.creditsWidth / 2);
    assert.deepEqual(layout.tech, ["Swift", "UIKit", "Metal"]);

    await page.evaluate(() => {
      const root = document.querySelector(".project-focus-root");
      window.__focusSession = { root, backdrop: root.querySelector(".project-focus-backdrop"), controls: root.querySelector(".project-focus-controls") };
      window.__focusLockMutations = 0;
      const observer = new MutationObserver(records => { window.__focusLockMutations += records.length; });
      observer.observe(document.body, { attributes: true, attributeFilter: ["style"] });
      observer.observe(document.querySelector("main"), { attributes: true, attributeFilter: ["inert"] });
      window.__focusLockObserver = observer;
    });
    const previous = page.getByRole("button", { name: "Previous project" });
    const next = page.getByRole("button", { name: "Next project" });
    const checkSession = async id => {
      assert.ok(await dialog.evaluate((root, id) => {
        const session = window.__focusSession, source = window.__projectSources[id];
        return root === session.root && root.querySelector(".project-focus-backdrop") === session.backdrop && root.querySelector(".project-focus-controls") === session.controls && root.querySelector(".project-focus-media-slot").contains(source.media) && document.body.style.position === "fixed" && document.querySelector("main").inert && Number(getComputedStyle(session.backdrop).opacity) === 1;
      }, id));
      assert.equal(await page.evaluate(() => window.__focusLockMutations), 0);
      assert.equal(await dialog.locator(".project-focus-summary").textContent(), description);
    };
    await previous.click();
    await settled(ids.at(-1));
    await checkSession(ids.at(-1));
    assert.ok(await page.evaluate(id => window.__projectSources[id].trigger.contains(window.__projectSources[id].media), ids[0]));
    await next.click();
    await settled(ids[0]);
    await checkSession(ids[0]);
    await next.click();
    await settled(ids[1]);
    await checkSession(ids[1]);
    assert.equal(await dialog.locator('.project-focus-description [data-focus-text]').getAttribute("data-focus-text"), "Rewards card");
    await page.keyboard.press("p");
    await settled(ids[0]);
    await page.keyboard.press("p");
    await settled(ids.at(-1));
    await page.keyboard.press("n");
    await settled(ids[0]);
    // Fast consecutive changes must cancel old reveals without returning the page to its unlocked state.
    for (let index = 1; index <= 4; index++) {
      await next.click();
      await page.waitForFunction(id => document.querySelector(".project-focus-root")?.dataset.focusProject === id, ids[index]);
    }
    for (let index = 3; index >= 0; index--) {
      await previous.click();
      await page.waitForFunction(id => document.querySelector(".project-focus-root")?.dataset.focusProject === id, ids[index]);
    }
    await settled(ids[0]);
    await checkSession(ids[0]);
    assert.ok(await page.evaluate(id => Object.entries(window.__projectSources).every(([key, source]) => key === id || source.trigger.contains(source.media)), ids[0]));
    const modifier = await page.evaluate(() => document.querySelector(".project-focus-root").dispatchEvent(new KeyboardEvent("keydown", { key: "n", ctrlKey: true, bubbles: true, cancelable: true })));
    assert.equal(modifier, true);
    await checkSession(ids[0]);

    if (mobile) {
      const scrolling = await dialog.evaluate(root => {
        const scroller = root.querySelector(".project-focus-scroll"), controls = root.querySelector(".project-focus-controls");
        const before = controls.getBoundingClientRect().top;
        scroller.scrollTop = scroller.scrollHeight;
        return {
          scrolls: scroller.scrollHeight > scroller.clientHeight && scroller.scrollTop > 0,
          controlsFixed: controls.getBoundingClientRect().top === before,
          creditsClear: root.querySelector(".project-focus-credits").getBoundingClientRect().bottom < controls.getBoundingClientRect().top,
        };
      });
      assert.deepEqual(scrolling, { scrolls: true, controlsFixed: true, creditsClear: true });
      await next.click();
      await settled(ids[1]);
      assert.equal(await dialog.locator(".project-focus-scroll").evaluate(node => node.scrollTop), 0);
      await previous.click();
      await settled(ids[0]);
    }

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() => document.querySelector('.project-focus-root .project-preview-poster')?.naturalWidth > 0);
    await page.screenshot({ path: `/tmp/project-focus-expanded-${width}.png` });
    if (mobile) {
      await dialog.locator(".project-focus-scroll").evaluate(node => { node.scrollTop = node.scrollHeight; });
      await page.screenshot({ path: "/tmp/project-focus-expanded-mobile-scrolled.png" });
    }
    await next.click();
    await settled(ids[1]);
    assert.equal(await dialog.locator('.project-focus-glyphs [style*="color"]').count(), 0);
    await page.evaluate(() => window.__focusLockObserver.disconnect());
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await dialog.waitFor({ state: "detached" });
    assert.ok(await page.evaluate(id => document.activeElement === window.__projectSources[id].trigger && scrollY === window.__focusInitialScroll && !document.querySelector("main").inert && document.body.style.position !== "fixed", ids[0]));

    // Recent and Random must navigate in the displayed grid order, rather than the registry order.
    for (const sort of ["Recent", "Random"]) {
      const control = page.locator(".work-sort-control");
      if (mobile) await control.click();
      else { await control.hover(); await page.getByRole("menuitemradio", { name: sort, exact: true }).click(); }
      await page.waitForFunction(sort => document.querySelector('.work-sort-control [data-final-text]')?.dataset.finalText === sort, sort);
      const sorted = await order();
      await tile(sorted[0]).click();
      await settled(sorted[0]);
      await previous.click();
      await settled(sorted.at(-1));
      await next.click();
      await settled(sorted[0]);
      await next.click();
      await settled(sorted[1]);
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "detached" });
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ width, ...layout, navigation: "both wrap boundaries, keyboard, sorted order, session lock, media reuse, and restoration passed" }));
    await context.close();
  }
} finally { await browser.close(); }
