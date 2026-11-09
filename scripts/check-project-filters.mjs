// Optional production-browser QA with real media. Checks current filters and focused navigation, not native iPhone paint timing.
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright-core";

const origin = process.argv[2] ?? "http://localhost:3003";
const visibleIds = page => page.locator(".feed-projects > li:not([hidden])").evaluateAll(tiles => tiles.map(tile => tile.dataset.projectId));
const waitFocus = (page, id) => page.waitForFunction(id => {
  const root = document.querySelector(".project-focus-root");
  return root?.dataset.phase === "open" && root.dataset.focusProject === id;
}, id);

for (const engine of [webkit, chromium]) {
  const browser = await engine.launch({ headless: true, ...(engine === chromium ? { channel: "chrome" } : {}) });
  try {
    for (const width of [393, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2, isMobile: width < 768, hasTouch: width < 768 });
      page.setDefaultTimeout(30_000);
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`${origin}/?inspect=off`, { waitUntil: "domcontentloaded" });
      const control = page.locator(".feed-toolbar button[aria-controls='project-feed-projects']");
      const showToolbar = async () => {
        await page.locator(".feed-toolbar").evaluate(toolbar => scrollTo(0, toolbar.getBoundingClientRect().top + scrollY - 130));
        await page.waitForFunction(() => !document.querySelector(".portfolio-header").classList.contains("is-over-images"));
      };
      await showToolbar();
      await page.waitForFunction(() => document.querySelector('[data-project-id="shop-01"] video')?.dataset.frameReady === "true");
      const groups = await page.locator(".feed-projects > li").evaluateAll(tiles => ({
        All: tiles.map(tile => tile.dataset.projectId),
        Shop: tiles.filter(tile => tile.dataset.company === "Shop").map(tile => tile.dataset.projectId),
        Other: tiles.filter(tile => tile.dataset.company !== "Shop").map(tile => tile.dataset.projectId),
      }));
      assert.deepEqual(Object.values(groups).map(group => group.length), [10, 7, 3]);
      await page.evaluate(() => {
        window.__filterPlayers = [...document.querySelectorAll(".feed-projects video")].map(video => ({ video, parent: video.parentElement }));
        window.__retainedSource = document.querySelector('[data-project-id="shop-01"] video').getAttribute("src");
      });
      const checkGroup = async label => {
        await page.waitForFunction(label => document.querySelector(".feed-toolbar button")?.getAttribute("aria-label") === `Filter projects: ${label}`, label);
        assert.deepEqual(await visibleIds(page), groups[label]);
        assert.ok(await page.locator(".feed-projects > li[hidden]").evaluateAll(tiles => tiles.every(tile => getComputedStyle(tile).display === "none" && tile.getBoundingClientRect().height === 0)));
        assert.ok(await page.locator(".feed-projects > li").evaluateAll(tiles => tiles.every(tile => tile.style.order === "")));
        assert.ok(await page.evaluate(() => window.__filterPlayers.every(({ video, parent }) => video.isConnected && video.parentElement === parent)));
        await page.waitForFunction(() => [...document.querySelectorAll(".feed-projects > li[hidden] video")].every(video => video.paused));
        assert.equal(await page.locator("[data-video-reorder], [data-reorder-hold]").count(), 0);
      };
      const activate = async () => width < 768 ? control.tap() : control.click();
      await checkGroup("All");
      for (let cycle = 0; cycle < 2; cycle++) {
        for (const label of ["Shop", "Other", "All"]) {
          await activate();
          await checkGroup(label);
          if (label === "Other") assert.ok(await page.evaluate(() => document.querySelector('[data-project-id="shop-01"] video').getAttribute("src") === window.__retainedSource));
        }
      }
      await page.waitForFunction(() => {
        const video = document.querySelector('[data-project-id="shop-01"] video');
        return !video.paused && video.currentTime > 0;
      });

      // The header and feed share the same filter; actual mouse/keyboard activation remains usable.
      await page.evaluate(() => scrollBy(0, 240));
      await page.waitForFunction(() => document.querySelector(".portfolio-header").classList.contains("is-over-images"));
      await page.locator(".portfolio-header button[aria-controls='project-feed-projects']").click();
      await checkGroup("Shop");
      await showToolbar();
      await control.focus();
      await page.keyboard.press("Enter");
      await checkGroup("Other");
      await page.keyboard.press("Space");
      await checkGroup("All");
      await showToolbar();
      await control.locator(".is-scrambling").waitFor({ state: "detached" });
      const box = await control.boundingBox();
      await page.mouse.click(box.x + 22, box.y + box.height / 2, { clickCount: 3, delay: 60 });
      assert.equal(await page.evaluate(() => getSelection().toString()), "");
      // Scrambling replaces text nodes between pointer-down/up, so a text click can be cancelled by the browser.
      await checkGroup((await control.getAttribute("aria-label")).replace("Filter projects: ", ""));
      for (let attempt = 0; attempt < 2 && await control.getAttribute("aria-label") !== "Filter projects: All"; attempt++) {
        await control.focus();
        await page.keyboard.press("Enter");
      }
      await checkGroup("All");

      for (const label of ["All", "Shop", "Other"]) {
        if (label !== "All") { await showToolbar(); await activate(); }
        await checkGroup(label);
        const ids = groups[label];
        const first = page.locator(`[data-project-id="${ids[0]}"] .homepage-card-trigger`);
        await first.click();
        await waitFocus(page, ids[0]);
        assert.ok((await page.locator(".project-focus-root [role='status']").textContent()).includes(`of ${ids.length}`));
        await page.keyboard.press("ArrowLeft");
        await waitFocus(page, ids.at(-1));
        await page.keyboard.press("ArrowRight");
        await waitFocus(page, ids[0]);
        for (let index = 1; index <= ids.length; index++) {
          await page.keyboard.press("ArrowRight");
          await waitFocus(page, ids[index % ids.length]);
          assert.equal(await page.locator(".homepage-project-media video").evaluateAll(videos => videos.filter(video => !video.closest("[data-focus-media]") && !video.paused).length), 0);
        }
        await page.keyboard.press("Escape");
        await page.getByRole("dialog").waitFor({ state: "detached" });
        assert.deepEqual(await visibleIds(page), ids);
      }
      if (process.env.FILTER_SCREENSHOTS) {
        await showToolbar();
        await page.waitForTimeout(500);
        await page.screenshot({ path: `/tmp/portfolio-other-${width}.png` });
      }
      await showToolbar();
      await page.emulateMedia({ reducedMotion: "reduce" });
      await activate();
      await checkGroup("All");
      await page.waitForFunction(() => [...document.querySelectorAll(".feed-projects video")].every(video => !video.hasAttribute("src")));
      assert.equal(await page.locator("[data-focus-media], .project-focus-media-backdrop").count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []);
      console.log(`${engine.name()} ${width}: All/Shop/Other visibility, stable media/order, pause/retention, header, keyboard/repeated clicks, filtered focus cycles, cleanup and reduced motion pass`);
      await page.close();
    }
  } finally { await browser.close(); }
}
