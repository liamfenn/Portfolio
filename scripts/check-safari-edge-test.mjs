// Verifies diagnostic geometry/layers only; native toolbar colors must be checked on iOS Safari.
import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const origin = process.argv[2] ?? "http://localhost:3100";
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
try {
  for (const width of [393, 1440]) {
    const mobile = width < 768;
    const page = await browser.newPage({ viewport: { width, height: 650 }, isMobile: mobile, hasTouch: mobile });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${origin}/?inspect`);
    await page.waitForFunction(() => document.documentElement.dataset.inspectorMode !== undefined);
    const dialog = page.getByRole("dialog");
    const edges = page.locator("[data-safari-edge-test]");
    const open = async () => {
      await page.locator(".homepage-card-trigger").first().click();
      await page.waitForFunction(() => document.querySelector(".project-focus-root")?.dataset.phase === "open");
    };
    const close = async () => {
      await page.getByRole("button", { name: "Close", exact: true }).click();
      await dialog.waitFor({ state: "detached" });
      assert.equal(await edges.count(), 0);
    };
    const menu = async () => {
      await page.locator(".homepage-identity").click();
      return page.getByRole("button", { name: "Test Safari edge colors" });
    };
    let toggle = await menu();
    assert.equal(await toggle.getAttribute("aria-pressed"), "false");
    await page.getByRole("button", { name: "Hide design inspector panel" }).click();
    await open();
    assert.equal(await edges.count(), 0);
    await close();
    toggle = await menu();
    await toggle.click();
    assert.equal(await toggle.getAttribute("aria-pressed"), "true");
    await page.getByRole("button", { name: "Hide design inspector panel" }).click();
    assert.equal(await edges.count(), 0);
    await open();
    assert.equal(await edges.count(), 2);
    const check = async (topHeight, bottomHeight, diagnostic = true) => {
      const selector = diagnostic ? "[data-safari-edge-test]" : ".project-focus-edge";
      const state = await page.evaluate(selector => {
        const root = document.querySelector(".project-focus-root");
        return [...document.querySelectorAll(selector)].map(node => {
          const style = getComputedStyle(node), rect = node.getBoundingClientRect();
          return { display: style.display, color: style.backgroundColor, top: rect.top, bottom: rect.bottom, height: rect.height, width: rect.width, position: style.position, above: Number(style.zIndex) > Number(getComputedStyle(root).zIndex), direct: node.parentElement === document.body, inert: node.inert, pointerEvents: style.pointerEvents, opacity: style.opacity, blur: style.backdropFilter, transform: style.transform, animations: node.getAnimations().length, inline: node.getAttribute("style") };
        });
      }, selector);
      if (!mobile) {
        assert.ok(state.every(edge => edge.display === "none"));
        return;
      }
      assert.equal(state[0].color, diagnostic ? "rgb(30, 215, 96)" : "rgb(246, 248, 249)");
      assert.equal(state[1].color, diagnostic ? "rgb(83, 67, 235)" : "rgb(255, 255, 255)");
      assert.equal(state[0].top, 0);
      assert.equal(state[0].height, topHeight);
      assert.equal(state[1].bottom, page.viewportSize().height);
      assert.equal(state[1].height, bottomHeight);
      assert.ok(state.every(edge => edge.width === width && edge.position === "fixed" && edge.above && edge.direct && !edge.inert && edge.pointerEvents === "none" && edge.opacity === "1" && edge.blur === "none" && edge.transform === "none" && edge.animations === 0 && edge.inline === null));
      assert.deepEqual(await page.evaluate(selector => {
        const style = document.createElement("style");
        style.textContent = `${selector} { pointer-events:auto!important; }`;
        document.head.append(style);
        const sampled = [4, innerHeight - 4].map(y => {
          const node = document.elementFromPoint(innerWidth / 2, y);
          return node?.matches(selector) ? node.matches(".safari-edge-test-top, .project-focus-edge-top") ? "top" : "bottom" : null;
        });
        style.remove();
        return sampled;
      }, selector), ["top", "bottom"]);
      const fade = await dialog.evaluate(root => {
        const fade = root.querySelector(".project-focus-bottom-fade"), controls = root.querySelector(".project-focus-controls");
        const style = getComputedStyle(fade), bounds = fade.getBoundingClientRect(), button = root.querySelector(".project-focus-close"), buttonBox = button.getBoundingClientRect();
        return { gradient: style.backgroundImage.includes("linear-gradient"), height: bounds.height, bottom: bounds.bottom, pointer: style.pointerEvents, behind: (Number(style.zIndex) || 0) < Number(getComputedStyle(controls).zIndex), closeClickable: document.elementFromPoint(buttonBox.left + buttonBox.width / 2, buttonBox.top + buttonBox.height / 2)?.closest("button") === button };
      });
      assert.deepEqual(fade, { gradient: true, height: 44 + bottomHeight, bottom: page.viewportSize().height, pointer: "none", behind: true, closeClickable: true });
      assert.deepEqual(await page.evaluate(() => [getComputedStyle(document.documentElement).backgroundColor, getComputedStyle(document.body).backgroundColor]), ["rgb(255, 255, 255)", "rgb(255, 255, 255)"]);
      assert.match(await page.locator('meta[name="theme-color"]').getAttribute("content"), /^#fff(?:fff)?$/i);
    };
    await check(12, 12);
    if (mobile) {
      await page.locator(".project-focus-scroll").evaluate(node => { node.scrollTop = node.scrollHeight; });
      await check(12, 12);
      await page.setViewportSize({ width, height: 820 });
      await check(12, 12);
      await page.evaluate(() => {
        document.documentElement.style.setProperty("--viewport-safe-top", "59px");
        document.documentElement.style.setProperty("--viewport-safe-bottom", "34px");
      });
      await check(59, 34);
      await page.getByRole("button", { name: "Next project" }).click();
      await check(59, 34);
      await page.screenshot({ path: "/tmp/portfolio-safari-edge-test.png" });
    }
    await close();
    toggle = await menu();
    await toggle.click();
    await page.getByRole("button", { name: "Hide design inspector panel" }).click();
    await open();
    assert.equal(await edges.count(), 0);
    await check(mobile ? 59 : 12, mobile ? 34 : 12, false);
    if (mobile) await page.screenshot({ path: "/tmp/portfolio-focus-normal-edges.png" });
    await close();
    toggle = await menu();
    await toggle.click();
    await page.reload();
    await page.waitForFunction(() => document.documentElement.dataset.inspectorMode !== undefined);
    toggle = await menu();
    assert.equal(await toggle.getAttribute("aria-pressed"), "false");
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ width, diagnostic: "default off, native edges above focus, colors, resize/scroll/safe areas, navigation, cleanup, baseline and reload passed" }));
    await page.close();
  }
} finally { await browser.close(); }
