import assert from "node:assert/strict";
import { chromium, webkit } from "playwright-core";

const origin = process.argv[2] ?? "http://localhost:3001";
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch({ headless: true, ...(engine === chromium ? { channel: "chrome" } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route(/\.(?:mp4|webm)(?:\?|$)/, route => route.abort());
    await page.goto(`${origin}/?inspect=off`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => document.documentElement.scrollHeight > 5000);
    const position = async depth => {
      await page.evaluate(y => window.scrollTo({ top: y, behavior: "instant" }), depth);
      await page.waitForFunction(() => document.querySelector(".portfolio-header")?.classList.contains("is-over-images"));
      await page.waitForTimeout(500);
    };
    const times = [];
    for (const depth of [1200, 4500]) {
      await position(depth);
      await page.evaluate(() => {
        window.__topSamples = [];
        const start = performance.now();
        const sample = () => {
          window.__topSamples.push({ time: performance.now() - start, top: scrollY });
          window.__topFrame = requestAnimationFrame(sample);
        };
        sample();
      });
      await page.getByRole("link", { name: "Back to top" }).click();
      await page.waitForFunction(() => scrollY === 0);
      // Pixel rounding reaches zero just before Safari's final eased frames complete.
      await page.waitForTimeout(150);
      const samples = await page.evaluate(() => {
        cancelAnimationFrame(window.__topFrame);
        return window.__topSamples;
      });
      const moving = samples.filter(sample => sample.top < depth && sample.top > 0);
      assert.ok(moving.length > 15, "Return to top should have intermediate frames, not jump");
      assert.ok(samples.every((sample, index) => !index || sample.top <= samples[index - 1].top), "Scroll toward the top without reversing");
      const duration = moving.at(-1).time - moving[0].time;
      assert.ok(duration > 350 && duration < 1600, JSON.stringify({ browser: engine.name(), depth, duration }));
      times.push(duration);
    }
    assert.ok(times[1] > times[0] + 150, `Deeper returns take longer: ${times}`);
    if (engine === webkit) {
      // Wheel and keyboard input must stop the scripted animation without preventing that input.
      for (const input of ["wheel", "keyboard"]) {
        await position(4500);
        await page.getByRole("link", { name: "Back to top" }).click();
        await page.waitForTimeout(120);
        const prevented = await page.evaluate(input => {
          const event = input === "wheel"
            ? new WheelEvent("wheel", { deltaY: 120, bubbles: true, cancelable: true })
            : new KeyboardEvent("keydown", { key: "PageDown", bubbles: true, cancelable: true });
          window.dispatchEvent(event);
          return event.defaultPrevented;
        }, input);
        assert.equal(prevented, false);
        const stopped = await page.evaluate(() => scrollY);
        await page.waitForTimeout(300);
        assert.equal(await page.evaluate(() => scrollY), stopped);
        assert.ok(stopped > 0);
      }
      await position(4500);
      await page.getByRole("link", { name: "Back to top" }).click();
      await page.waitForTimeout(120);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.waitForFunction(() => scrollY === 0);
      await page.emulateMedia({ reducedMotion: "no-preference" });
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await position(4500);
    const reducedTop = await page.getByRole("link", { name: "Back to top" }).evaluate(link => { link.click(); return scrollY; });
    assert.equal(reducedTop, 0, "Reduced motion goes directly to the top");
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ browser: engine.name(), durations: times, distanceScaling: true, reducedMotion: true, interruption: engine === webkit }));
  } finally { await browser.close(); }
}
