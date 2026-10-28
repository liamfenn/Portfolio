import assert from "node:assert/strict";
import { chromium, webkit } from "playwright-core";

const engine = process.env.FOCUS_BROWSER === "chromium" ? chromium : webkit;
const browser = await engine.launch({ headless: true, ...(engine === chromium && process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
const origin = process.argv[2] ?? "http://localhost:3106";
const cases = [
  { name: "paged and scrolled placeholder", width: 1710, start: "shop-01", steps: [1, 1, -1, 1], scroll: true },
  { name: "paged placeholder", width: 1710, start: "shop-01", steps: [1, 1, -1, 1], scroll: false },
  { name: "paged and scrolled video", width: 1710, start: "shop-01", steps: [1, 1, -1, -1], scroll: true },
  { name: "wide grid return", width: 2100, start: "shop-01", steps: [1, 1, -1, 1], scroll: true },
  { name: "solo placeholder", width: 1710, start: "shop-03", steps: [], scroll: true },
];
try {
  for (const scenario of cases) {
    const page = await browser.newPage({ viewport: { width: scenario.width, height: 950 }, deviceScaleFactor: 2 });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${origin}/?inspect=off`);
    await page.waitForFunction(() => document.querySelector(".homepage-avatar")?.getAttribute("aria-busy") === "false");
    await page.locator(`[data-project-id="${scenario.start}"] .homepage-card-trigger`).click();
    const settled = () => page.waitForFunction(() => document.querySelector(".project-focus-root")?.dataset.phase === "open" && !document.querySelector("[data-paging-outgoing]"));
    await settled();
    for (const direction of scenario.steps) {
      await page.getByRole("button", { name: direction === 1 ? "Next project" : "Previous project" }).click();
      await settled();
    }
    await page.locator(".project-focus-scroll").evaluate((scroller, scroll) => { scroller.scrollTop = scroll ? 100 : 0; }, scenario.scroll);
    await page.mouse.move(scenario.width / 2, 300);
    await page.evaluate(() => {
      const root = document.querySelector(".project-focus-root"), scroller = root.querySelector(".project-focus-scroll");
      window.__exitSamples = [];
      let initial, started;
      const sample = () => {
        if (!root.isConnected) return;
        if (root.dataset.phase === "closing") {
          started ??= performance.now();
          const box = document.querySelector('[data-focus-media="current"]').getBoundingClientRect();
          initial ??= box;
          const controls = getComputedStyle(root.querySelector(".project-focus-controls"));
          const rowsFading = [...root.querySelectorAll(".project-focus-details h2, .project-focus-description, .project-focus-period, .project-focus-summary, .project-focus-details h3, .project-focus-details li")]
            .some(row => Number(getComputedStyle(row).opacity) < 1);
          window.__exitSamples.push({ elapsed: performance.now() - started, stage: root.dataset.exit, rowsFading, movement: Math.abs(box.left - initial.left) + Math.abs(box.top - initial.top) + Math.abs(box.width - initial.width), scrollTop: scroller.scrollTop, text: [...root.querySelectorAll(".project-focus-details")].map(node => node.textContent.trim()).join(""), controlsOpacity: Number(controls.opacity), controlsVisibility: controls.visibility });
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.querySelector(".project-focus-root")?.dataset.exit === "text");
    const rows = await page.getByRole("dialog").evaluate(root => root.getAnimations({ subtree: true })
      .filter(animation => animation.effect.target.closest(".project-focus-details"))
      .map(animation => ({ top: animation.effect.target.getBoundingClientRect().top, delay: animation.effect.getTiming().delay, duration: animation.effect.getTiming().duration })));
    const tops = [...new Set(rows.map(row => row.top))].sort((a, b) => b - a);
    assert.ok(rows.length > 0 && rows.every(row => row.duration === 180 && row.delay === tops.indexOf(row.top) * 12), JSON.stringify({ scenario: scenario.name, rows }));
    if (scenario.scroll) await page.mouse.wheel(0, 200);
    await page.getByRole("dialog").waitFor({ state: "detached" });
    const samples = await page.evaluate(() => window.__exitSamples);
    const moved = samples.filter(sample => sample.movement > 0.5);
    assert.ok(moved.length > 0, scenario.name);
    assert.ok(samples.some(sample => sample.stage === "controls" && sample.controlsOpacity > 0 && sample.controlsOpacity < 1 && !sample.rowsFading), "controls fade while content holds still");
    assert.ok(samples.some(sample => sample.stage === "text" && sample.rowsFading), "reverse stagger follows the controls");
    assert.ok(samples.every(sample => sample.stage !== "text" || (sample.controlsOpacity === 0 && sample.controlsVisibility === "hidden")), "controls must disappear before the content fades");
    assert.ok(moved.every(sample => sample.text === ""), JSON.stringify({ scenario: scenario.name, overlap: moved.filter(sample => sample.text !== "").map(({ elapsed, movement, text }) => ({ elapsed, movement, textLength: text.length })) }));
    assert.ok(samples.every(sample => Math.abs(sample.scrollTop - samples[0].scrollTop) < 0.1), JSON.stringify({ scenario: scenario.name, scrollOffsets: samples.map(sample => sample.scrollTop) }));
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ scenario: scenario.name, firstMovement: Math.round(moved[0].elapsed), textGoneBeforeAllMovement: true, scrollLocked: true }));
    await page.close();
  }
} finally { await browser.close(); }
