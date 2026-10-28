// Inert backgrounds are skipped by hit testing even when they paint above the modal.
// Temporarily enabling their hits lets this check catch the actual stacking regression.
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright-core";

const origin = process.argv[2] ?? "http://localhost:3122";
const engine = process.env.FOCUS_BROWSER === "chromium" ? chromium : webkit;
const browser = await engine.launch({ headless: true, ...(engine === chromium && process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
try {
  for (const width of [1440, 393]) {
    for (const scenario of ["menus", "globe"]) {
      const page = await browser.newPage({ viewport: { width, height: 650 }, isMobile: width < 768, hasTouch: width < 768 });
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`${origin}/?inspect=off`);
      await page.waitForFunction(() => document.querySelector(".homepage-avatar")?.getAttribute("aria-busy") === "false");
      if (scenario === "globe") await page.locator(".glyph-globe").scrollIntoViewIfNeeded();
      else await page.locator(".work-toolbar").scrollIntoViewIfNeeded();
      const originalScroll = await page.evaluate(() => scrollY);
      // Open without moving the background away from the menus/footer being checked.
      await page.locator(".homepage-card-trigger").first().evaluate(trigger => trigger.click());
      await page.waitForFunction(() => document.querySelector(".project-focus-root")?.dataset.phase === "open");
      await page.locator(".project-focus-scroll").evaluate(scroller => { scroller.scrollTop = scroller.scrollHeight; });
      await page.waitForFunction(() => {
        const media = document.querySelector('[data-focus-media="current"]').getBoundingClientRect();
        const slot = document.querySelector(".project-focus-scroll .project-focus-media-slot").getBoundingClientRect();
        return Math.abs(media.top - slot.top) < 0.5;
      });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const state = await page.evaluate(scenario => {
        const inert = [...document.querySelectorAll("[inert]")];
        const style = document.createElement("style");
        style.textContent = ".glyph-globe-char { pointer-events: auto !important; }";
        document.head.append(style);
        inert.forEach(node => { node.inert = false; });
        try {
          const nodes = scenario === "menus"
            ? [...document.querySelectorAll(".work-sort-control, .work-grid-control")].filter(node => getComputedStyle(node).display !== "none")
            : [...document.querySelectorAll(".glyph-globe-char")].sort((a, b) => Number(getComputedStyle(b).zIndex) - Number(getComputedStyle(a).zIndex)).slice(0, 8);
          const points = nodes.map(node => {
            const box = node.getBoundingClientRect(), x = box.left + box.width / 2, y = box.top + box.height / 2;
            if (!box.width || !box.height || x < 0 || x >= innerWidth || y < 0 || y >= innerHeight) return null;
            const top = document.elementFromPoint(x, y);
            return { x, y, covered: Boolean(top?.closest(".project-focus-root")), top: top?.className };
          }).filter(Boolean);
          const pages = document.querySelector(".project-focus-pages").getBoundingClientRect();
          return { points, viewport: pages.left === 0 && pages.top === 0 && pages.width === innerWidth && pages.height === innerHeight };
        } finally {
          inert.forEach(node => { node.inert = true; });
          style.remove();
        }
      }, scenario);
      await page.screenshot({ path: `/tmp/focus-stacking-${engine.name()}-${width}-${scenario}.png` });
      assert.ok(state.viewport && state.points.length >= 2 && state.points.every(point => point.covered), JSON.stringify({ width, scenario, ...state }));
      await page.getByRole("button", { name: "Next project" }).click();
      await page.waitForFunction(() => document.querySelector(".project-focus-root")?.dataset.phase === "open");
      await page.getByRole("button", { name: "Close", exact: true }).click();
      await page.getByRole("dialog").waitFor({ state: "detached" });
      assert.ok(await page.evaluate(scroll => !document.querySelector("main").inert && Math.abs(scrollY - scroll) < 1, originalScroll));
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ browser: engine.name(), width, scenario, backgroundBelowFocus: true, viewportAndRestoration: true }));
      await page.close();
    }
  }
} finally { await browser.close(); }
