// Start a development server or a production preview before running. Optional CHROMIUM_PATH selects an installed browser.
import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const photo = await readFile(new URL("../public/images/profile/headshot-v2-384.webp", import.meta.url));
const origin = process.argv[2] ?? "http://localhost:3100";
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
try {
  for (const width of [1440, 393]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 768, hasTouch: width < 768 });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    let releaseImages, releaseWeather, releaseSpotify, releaseIncoming;
    const images = new Promise(r => releaseImages = r), weather = new Promise(r => releaseWeather = r), spotify = new Promise(r => releaseSpotify = r), incoming = new Promise(r => releaseIncoming = r);
    const track = { isPlaying: false, title: "Cached song", artist: "Cached artist", album: "Cached album", albumImageUrl: "https://i.scdn.co/image/old-test", songUrl: "https://open.spotify.com/track/test" };
    await page.addInitScript(track => localStorage.setItem("spotify-last-track", JSON.stringify({ track, cachedAt: new Date().toISOString() })), track);
    await page.route("**/*", async (route) => {
      const request = route.request(), url = decodeURIComponent(request.url());
      if (url.includes("/api/weather")) {
        await weather;
        return route.fulfill({ json: { temperature: 72, condition: "Sunny", location: "Atlanta" } });
      }
      if (url.includes("/api/spotify/")) {
        await spotify;
        return route.fulfill({ json: { ...track, title: "Updated song", albumImageUrl: "https://i.scdn.co/image/new-test" } });
      }
      if (request.resourceType() === "image") {
        await (url.includes("new-test") ? incoming : images);
        return route.fulfill({ body: photo, contentType: "image/webp" });
      }
      if (url.includes(".mp4"))
        return route.abort();
      return route.continue();
    });
    await page.goto(`${origin}/?inspect=off`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector(".homepage-title")?.textContent === "Cached song");
    assert.equal(await page.locator(".homepage-avatar .skeleton").count(), 1);
    assert.equal(await page.locator(".homepage-album .skeleton").count(), 1);
    assert.equal(await page.locator(".project-preview-media > .skeleton").count(), 2);
    assert.equal(await page.locator("[data-project-id=\"shop-03\"] .skeleton").count(), 0);
    assert.equal(await page.locator(".footer-weather .skeleton").count(), 1);
    const geometry = await page.locator(".project-preview-media").evaluateAll(nodes => nodes.map(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })));
    await page.locator("[data-project-id=\"shop-02\"]").scrollIntoViewIfNeeded();
    assert.equal(await page.locator(".project-preview-media > .skeleton").first().evaluate(node => getComputedStyle(node, "::after").animationName), "skeleton-sweep");
    releaseImages();
    await page.locator(".homepage-spotify").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.querySelector(".homepage-avatar .skeleton, .homepage-album .skeleton, .project-preview-media > .skeleton"));
    assert.deepEqual(await page.locator(".project-preview-media").evaluateAll(nodes => nodes.map(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height }))), geometry);
    releaseWeather();
    await page.waitForFunction(() => !document.querySelector(".footer-weather .skeleton"));
    assert.match(await page.locator(".footer-weather").textContent(), /Sunny at 72°F/);
    releaseSpotify();
    await page.waitForFunction(() => document.querySelector(".homepage-title")?.textContent === "Updated song");
    assert.equal(await page.locator(".homepage-album .skeleton").count(), 0, "keep previous artwork during refresh");
    releaseIncoming();
    await page.waitForFunction(() => document.querySelector(".album-artwork-layer img")?.src.includes("new-test"));
    await page.waitForFunction(() => !document.querySelector(".homepage-album .skeleton"));
    assert.deepEqual(errors, []);
    console.log(width, "delayed media/weather, cached data, artwork refresh, stable geometry passed");
    await context.close();
  }
  for (const mode of ["failed", "reduced-motion", "no-js", "before-hydration"]) {
    const context = await browser.newContext({ viewport: { width: 393, height: 852 }, javaScriptEnabled: mode !== "no-js", reducedMotion: mode === "reduced-motion" ? "reduce" : "no-preference" });
    const page = await context.newPage();
    let releaseImages, releaseScripts;
    const images = new Promise(resolve => { releaseImages = resolve; });
    const scripts = new Promise(resolve => { releaseScripts = resolve; });
    let videoRequests = 0;
    await page.route("**/*", async (route) => {
      const request = route.request(), url = request.url();
      if (url.includes("/api/"))
        return route.fulfill({ status: 500, json: { error: "Test unavailable" } });
      if (request.resourceType() === "script" && mode === "before-hydration") {
        await scripts;
        return route.continue();
      }
      if (request.resourceType() === "image") {
        if (mode === "failed")
          return route.abort();
        if (mode === "reduced-motion")
          await images;
        return route.fulfill({ body: photo, contentType: "image/webp" });
      }
      if (url.includes(".mp4")) {
        videoRequests++;
        return route.abort();
      }
      return route.continue();
    });
    await page.goto(`${origin}/?inspect=off`, { waitUntil: mode === "before-hydration" ? "commit" : "domcontentloaded" });
    if (mode === "reduced-motion") {
      await page.waitForFunction(() => document.querySelector(".homepage-avatar .skeleton"));
      assert.equal(await page.locator(".homepage-avatar .skeleton").evaluate(node => getComputedStyle(node, "::after").display), "none");
      releaseImages();
    }
    if (mode === "before-hydration") {
      await page.waitForFunction(() => document.querySelector(".homepage-avatar img")?.complete && document.querySelector(".homepage-avatar img")?.naturalWidth > 0);
      releaseScripts();
    }
    await page.locator("[data-project-id=\"shop-02\"]").scrollIntoViewIfNeeded();
    await page.locator(".homepage-spotify").scrollIntoViewIfNeeded();
    if (mode === "no-js") {
      assert.ok(await page.locator(".skeleton").evaluateAll(nodes => nodes.every(node => getComputedStyle(node).display === "none")));
      assert.ok(await page.locator(".project-preview-poster").evaluateAll(nodes => nodes.every(node => node.complete && node.naturalWidth > 0 && getComputedStyle(node).visibility === "visible")));
    }
    else {
      await page.waitForFunction(() => !document.querySelector(".homepage-avatar .skeleton, .homepage-album .skeleton, .project-preview-media > .skeleton, .footer-weather .skeleton"));
      if (mode === "failed")
        assert.equal(await page.locator("img.loading-image-error:visible").count(), 0);
    }
    if (mode === "no-js" || mode === "reduced-motion")
      assert.equal(videoRequests, 0);
    console.log(`${mode}: loading fallback verified`);
    await context.close();
  }
}
finally {
  await browser.close();
}
