// Hold the next presentation to verify that sorting keeps an opaque picture in place: a frame copy for playing
// videos, the poster for paused ones that the sort moved into view.
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright-core";

const origin = process.argv[2] ?? "http://localhost:3020";
for (const engine of [webkit, chromium]) {
  const browser = await engine.launch(engine === chromium ? { channel: "chrome" } : {});
  try {
    for (const width of [393, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 850 }, deviceScaleFactor: 2, isMobile: width < 768, hasTouch: width < 768 });
      page.setDefaultTimeout(30_000);
      const errors = [];
      page.on("pageerror", error => { if (!error.message.includes("localhost:4747")) errors.push(error.message); });
      await page.addInitScript(() => {
        const draw = CanvasRenderingContext2D.prototype.drawImage;
        CanvasRenderingContext2D.prototype.drawImage = function(source, ...args) {
          const result = draw.call(this, source, ...args);
          if (window.__sortCaptures && source instanceof HTMLVideoElement) {
            const pixels = this.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
            let picture = false;
            for (let index = 0; index < pixels.length; index += 4) {
              if (pixels[index + 3] && Math.max(pixels[index], pixels[index + 1], pixels[index + 2]) > 32) { picture = true; break; }
            }
            window.__sortCaptures.push({ order: [...document.querySelectorAll(".feed-projects > li")].map(tile => tile.style.order).join(","),
              picture, width: this.canvas.width, displayWidth: source.clientWidth, playing: !source.paused });
          }
          return result;
        };
        const native = HTMLVideoElement.prototype.requestVideoFrameCallback;
        window.__heldSortFrames = [];
        HTMLVideoElement.prototype.requestVideoFrameCallback = function(callback) {
          return native.call(this, (now, metadata) => {
            if (window.__holdSortFrames && (this.parentElement?.querySelector("[data-video-reorder]") || this.hasAttribute("data-reorder-hold"))) {
              window.__heldSortFrames.push(() => callback(now, metadata));
            } else callback(now, metadata);
          });
        };
      });
      await page.goto(`${origin}/?inspect=off`, { waitUntil: "domcontentloaded" });
      const videos = page.locator(".feed-projects video");
      for (let i = 0; i < await videos.count(); i++) {
        await videos.nth(i).scrollIntoViewIfNeeded();
        await page.waitForFunction(index => document.querySelectorAll(".feed-projects video")[index].dataset.frameReady === "true", i);
      }
      await page.locator(".feed-toolbar").evaluate(node => scrollTo(0, node.getBoundingClientRect().top + scrollY - 130));
      await page.waitForFunction(() => !document.querySelector(".portfolio-header").classList.contains("is-over-images"));
      await page.waitForTimeout(300);
      await page.evaluate(() => {
        window.__sortNodes = [...document.querySelectorAll(".feed-projects video")].map(video => ({ video, parent: video.parentElement, source: video.getAttribute("src") }));
        window.__sortSourceResets = 0;
        window.__sortCaptures = [];
        window.__beforeSortOrder = [...document.querySelectorAll(".feed-projects > li")].map(tile => tile.style.order).join(",");
        window.__sortHolds = [];
        new MutationObserver(changes => {
          for (const { target } of changes) {
            if (!target.hasAttribute("data-reorder-hold")) continue;
            const poster = target.parentElement.querySelector(".project-preview-poster");
            window.__sortHolds.push({ alpha: target.closest("[data-media-alpha]") !== null,
              video: getComputedStyle(target).opacity, poster: getComputedStyle(poster).visibility,
              background: getComputedStyle(poster).backgroundColor, layer: getComputedStyle(poster).zIndex });
          }
        }).observe(document.querySelector(".feed-projects"), { subtree: true, attributes: true, attributeFilter: ["data-reorder-hold"] });
        window.__sortNodes.forEach(({ video }) => video.addEventListener("emptied", () => window.__sortSourceResets++));
        window.__holdSortFrames = true;
      });
      const sort = page.locator(".feed-toolbar .work-sort-control");
      await sort.evaluate(button => button.click());
      assert.ok(await page.evaluate(() => window.__sortCaptures.length > 0 && window.__sortCaptures[0].order === window.__beforeSortOrder), "playing pictures must be captured before CSS order changes");
      await page.waitForFunction(() => document.querySelector("[data-video-reorder], [data-reorder-hold]") && window.__heldSortFrames.length);
      // Covers leaving the viewport can already be disposed by now; inspect pixels recorded at capture time.
      const protectedFrames = await page.evaluate(() => window.__sortCaptures);
      assert.ok(protectedFrames.every(frame => frame.picture), "retained pictures must not be blank/black (alpha edges may be transparent)");
      assert.ok(protectedFrames.every(frame => frame.width <= Math.ceil(frame.displayWidth * 2)));
      assert.ok(protectedFrames.every(frame => frame.playing), "only a playing surface can be copied");
      // Paused clips that sorting moved into view show their loaded poster instead of a possibly black surface.
      const holds = await page.locator("video[data-reorder-hold]").evaluateAll(videos => videos.map(video => {
        const poster = video.parentElement.querySelector(".project-preview-poster");
        return { video: getComputedStyle(video).opacity, poster: getComputedStyle(poster).visibility, loaded: poster.complete && poster.naturalWidth > 0,
          background: getComputedStyle(poster).backgroundColor, layer: getComputedStyle(poster).zIndex };
      }));
      const covered = hold => hold.poster === "visible" && (width < 768
        ? hold.video === "1" && hold.layer === "1" && !hold.background.includes("rgba") : hold.video === "0");
      assert.ok(holds.every(hold => hold.loaded && covered(hold)), JSON.stringify(holds));
      assert.ok(protectedFrames.length + holds.length > 0, "visible ready videos keep a picture through the sort");
      await page.evaluate(() => {
        window.__holdSortFrames = false;
        window.__heldSortFrames.splice(0).forEach(release => release());
      });
      await page.waitForFunction(() => !document.querySelector("[data-video-reorder], [data-reorder-hold]"));
      for (let i = 0; i < 6; i++) {
        await sort.evaluate(button => button.click());
        await page.waitForTimeout(60);
      }
      await page.waitForFunction(() => !document.querySelector("[data-video-reorder], [data-reorder-hold]"));
      const observedHolds = await page.evaluate(() => window.__sortHolds);
      assert.ok(observedHolds.length > 0 && observedHolds.every(covered), JSON.stringify(observedHolds));
      if (width < 768) assert.ok(observedHolds.some(hold => hold.alpha), "mobile matte clips must exercise the same solid poster coverage");
      assert.equal(await page.evaluate(() => window.__sortNodes.every(({ video, parent, source }) => video.isConnected && video.parentElement === parent && video.getAttribute("src") === source)), true);
      assert.equal(await page.evaluate(() => window.__sortSourceResets), 0, "ready videos must not reload on sort");
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.waitForFunction(() => matchMedia("(prefers-reduced-motion: reduce)").matches
        && [...document.querySelectorAll(".feed-projects video")].every(video => !video.hasAttribute("src")));
      await sort.evaluate(button => button.click());
      assert.equal(await page.locator("[data-video-reorder], [data-reorder-hold]").count(), 0);
      assert.deepEqual(errors, []);
      console.log(`${engine.name()} ${width}: ${protectedFrames.length} frame copies, ${holds.length} held posters; retained pictures, presentation handoff, rapid sorting, stable sources, reduced motion pass`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
