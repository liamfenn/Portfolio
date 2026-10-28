import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";

const origin = process.argv[2] ?? "http://localhost:3100";
const fixture = process.env.FOCUS_VIDEO_FIXTURE ? await readFile(process.env.FOCUS_VIDEO_FIXTURE) : null;
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
try {
  for (const width of [1440, 393]) {
    const mobile = width < 768;
    const page = await browser.newPage({ viewport: { width, height: mobile ? 650 : 1024 }, isMobile: mobile, hasTouch: mobile });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    if (fixture) await page.route(/\.mp4(?:\?|$)/, route => route.fulfill({ contentType: "video/webm", body: fixture }));
    await page.goto(`${origin}/?inspect=off`);
    await page.waitForFunction(() => document.querySelector(".homepage-avatar")?.getAttribute("aria-busy") === "false");
    const ids = await page.locator(".project-grid > li").evaluateAll(nodes => nodes.map(node => node.dataset.projectId));
    await page.evaluate(() => { window.__pagingMedia = [...document.querySelectorAll(".project-grid > li")].map(node => ({ trigger: node.querySelector("button"), media: node.querySelector(".homepage-project-media") })); });
    await page.locator(".homepage-card-trigger").first().click();
    const settled = async id => {
      try { await page.waitForFunction(id => {
        const root = document.querySelector(".project-focus-root");
        return root?.dataset.focusProject === id && root.dataset.phase === "open" && !root.querySelector("[data-paging-outgoing], [data-paging-neighbor]");
      }, id); } catch (error) {
        const state = await page.evaluate(id => ({ expected: id, url: location.href, phase: document.querySelector(".project-focus-root")?.dataset.phase, actual: document.querySelector(".project-focus-root")?.dataset.focusProject, outgoing: document.querySelectorAll("[data-paging-outgoing]").length, neighbor: document.querySelectorAll("[data-paging-neighbor]").length, transform: document.querySelector(".project-focus-scroll")?.style.transform }), id);
        throw new Error(JSON.stringify(state), { cause: error });
      }
    };
    await settled(ids[0]);
    const dialog = page.getByRole("dialog");
    const previous = page.getByRole("button", { name: "Previous project" });
    const next = page.getByRole("button", { name: "Next project" });
    const controlBounds = await dialog.locator(".project-focus-controls").boundingBox();
    for (const [control, direction, id] of [[next, 1, ids[1]], [previous, -1, ids[0]]]) {
      await control.click();
      const motion = await dialog.evaluate(async root => {
        const incoming = root.querySelector(".project-focus-scroll"), outgoing = root.querySelector("[data-paging-outgoing]");
        const animations = [incoming.getAnimations()[0], outgoing.getAnimations()[0]];
        animations.forEach(animation => animation.pause());
        await Promise.all(animations.map(animation => animation.ready));
        animations.forEach(animation => { animation.currentTime = animation.effect.getTiming().duration / 2; });
        await new Promise(resolve => requestAnimationFrame(resolve));
        const state = { duration: animations[0].effect.getTiming().duration, incoming: incoming.getBoundingClientRect().left, outgoing: outgoing.getBoundingClientRect().left, outgoingInert: outgoing.inert, outgoingHidden: outgoing.getAttribute("aria-hidden"), nativeMedia: outgoing.querySelectorAll("video").length, duplicateIds: outgoing.querySelectorAll("[id]").length, textVisible: [...incoming.querySelectorAll("[data-focus-text]")].every(node => node.textContent === node.dataset.focusText && getComputedStyle(node).visibility === "visible" && getComputedStyle(node.closest("h2, h3, p, li")).opacity === "1"), tint: getComputedStyle(root.querySelector(".project-focus-backdrop")).opacity };
        return state;
      });
      assert.equal(motion.duration, 300);
      assert.ok(Math.abs(motion.incoming - direction * width / 2) < 2, JSON.stringify(motion));
      assert.ok(Math.abs(motion.outgoing + direction * width / 2) < 2, JSON.stringify(motion));
      assert.ok(motion.outgoingInert && motion.outgoingHidden === "true" && motion.duplicateIds === 0 && motion.textVisible && motion.tint === "1");
      assert.equal(motion.nativeMedia, 1);
      assert.deepEqual(await dialog.locator(".project-focus-controls").boundingBox(), controlBounds);
      if (direction === 1) await page.screenshot({ path: `/tmp/portfolio-paging-${width}-mid.png` });
      await dialog.evaluate(root => [root.querySelector(".project-focus-scroll"), root.querySelector("[data-paging-outgoing]")].forEach(node => node.getAnimations().forEach(animation => animation.play())));
      await settled(id);
    }
    if (mobile) {
      assert.equal(await dialog.locator(".project-focus-scroll").evaluate(node => getComputedStyle(node).touchAction), "pan-y pinch-zoom");
      const cdp = await page.context().newCDPSession(page);
      let capturedDrag = false;
      const touch = async (type, x = 200, y = 210) => {
        await cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" || type === "touchCancel" ? [] : [{ x, y, id: 1 }] });
      };
      const swipe = async direction => {
        const start = direction === 1 ? 280 : 110;
        await touch("touchStart", start);
        await touch("touchMove", start - direction * 60);
        await page.locator("[data-paging-neighbor]").waitFor();
        const positions = await dialog.evaluate(root => [root.querySelector(".project-focus-scroll").getBoundingClientRect().left, root.querySelector("[data-paging-neighbor]").getBoundingClientRect().left]);
        assert.ok(Math.abs(positions[0] + direction * 60) < 1);
        assert.ok(Math.abs(positions[1] - direction * (width - 60)) < 1);
        if (direction === 1 && !capturedDrag) { await page.screenshot({ path: "/tmp/portfolio-paging-mobile-drag.png" }); capturedDrag = true; }
        await touch("touchMove", start - direction * 170);
        await touch("touchEnd");
      };
      await swipe(1); await settled(ids[1]);
      await swipe(-1); await settled(ids[0]);
      await swipe(-1); await settled(ids.at(-1));
      await swipe(1); await settled(ids[0]);
      // A short horizontal drag snaps back; canceling a longer drag must also retain the project.
      for (const [distance, end] of [[20, "touchEnd"], [100, "touchCancel"]]) {
        await touch("touchStart"); await touch("touchMove", 200 - distance); await touch(end);
        await settled(ids[0]);
        assert.equal(await dialog.locator(".project-focus-scroll").evaluate(node => getComputedStyle(node).transform), "none");
      }
      await touch("touchStart", 200, 520); await touch("touchMove", 200, 450); await touch("touchMove", 200, 330); await touch("touchEnd");
      await page.waitForFunction(() => document.querySelector(".project-focus-scroll").scrollTop > 0);
      assert.equal(await dialog.getAttribute("data-focus-project"), ids[0]);
      await touch("touchStart", 10, 210); await touch("touchMove", 100, 210); await touch("touchEnd");
      await settled(ids[0]);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await swipe(1); await settled(ids[1]);
      assert.equal(await dialog.evaluate(root => root.getAnimations({ subtree: true }).filter(animation => animation.playState === "running").length), 0);
      await page.emulateMedia({ reducedMotion: "no-preference" });
    }
    await next.click();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await dialog.waitFor({ state: "detached" });
    assert.equal(await page.locator("[data-paging-outgoing], [data-paging-neighbor]").count(), 0);
    assert.ok(await page.evaluate(() => window.__pagingMedia.every(({ trigger, media }) => trigger.contains(media)) && !document.querySelector("main").inert && document.body.style.position !== "fixed"));
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ width, paging: "directional paired motion, retained media, static controls, swipe tracking/wrap/cancel/vertical scroll, reduced motion and interruption cleanup passed" }));
    await page.close();
  }
} finally { await browser.close(); }
