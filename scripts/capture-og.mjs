// Records one loop of the /og card, frame by frame, then encodes the link-preview video, its poster, and a
// high-resolution share cut. The page runs on a virtual clock (requestAnimationFrame and performance.now are replaced),
// so every frame is exactly 1/60s apart however long a screenshot takes, and Math.random is seeded, so a rerun gives
// the same video.
//
// Needs the dev server (npm run dev) and Playwright, which is not a project dependency:
//   npm i --no-save playwright-core && npx playwright-core install chromium
//   node scripts/capture-og.mjs [url] [seed] [--quick]
// --quick records only the 1200×630 frames, for tuning, and encodes nothing.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { chromium } from "playwright-core";

const URL = process.argv[2] ?? "http://localhost:3000/og";
const SEED = Number(process.argv[3] ?? 7);
const QUICK = process.argv.includes("--quick");
const FPS = 60;
const MAX_FRAMES = FPS * 20;
const FRAMES = "out/og-frames";

const clock = seed => {
  let now = 0, id = 0, queue = [], state = seed >>> 0;
  Math.random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  performance.now = () => now;
  window.requestAnimationFrame = callback => { queue.push([++id, callback]); return id; };
  window.cancelAnimationFrame = handle => { queue = queue.filter(([queued]) => queued !== handle); };
  window.__ogAdvance = ms => { now += ms; const due = queue; queue = []; due.forEach(([, callback]) => callback(now)); };
};

async function record(width, height, scale) {
  const dir = `${FRAMES}-${width}x${height}@${scale}x`;
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  await page.addInitScript(clock, SEED);
  await page.goto(URL, { waitUntil: "networkidle" });
  // Dev-only overlays (the Next indicator, Agentation) would otherwise sit on top of the card.
  await page.addStyleTag({ content: "nextjs-portal, [data-feedback-toolbar] { display: none !important; }" });
  await page.evaluate(() => document.fonts.ready);
  // Lets the card finish loading Matter.js on real time before its first virtual frame.
  await page.waitForTimeout(500);
  let frame = 0;
  for (; frame < MAX_FRAMES; frame++) {
    await page.screenshot({ path: `${dir}/${String(frame).padStart(5, "0")}.png` });
    if (await page.evaluate(() => (window.__ogLoops ?? 0) >= 1)) break;
    await page.evaluate(ms => window.__ogAdvance(ms), 1000 / FPS);
  }
  await browser.close();
  console.log(`${width}×${height}@${scale}x: ${frame + 1} frames, ${((frame + 1) / FPS).toFixed(2)}s`);
  return dir;
}

const encode = (dir, output, crf) => execFileSync("ffmpeg", ["-y", "-v", "error", "-framerate", String(FPS), "-i", `${dir}/%05d.png`,
  "-c:v", "libx264", "-preset", "slow", "-crf", String(crf), "-pix_fmt", "yuv420p", "-movflags", "+faststart", output], { stdio: "inherit" });

const preview = await record(1200, 630, 1);
if (!QUICK) {
  encode(preview, "public/images/meta/og-office.mp4", 20);
  execFileSync("cp", [`${preview}/00000.png`, "public/images/meta/og-office.png"]);
  encode(await record(1200, 630, 2), "out/office-of-liam-fennell.mp4", 16);
  const square = await record(1200, 1200, 2);
  encode(square, "out/office-of-liam-fennell-square.mp4", 16);
  execFileSync("cp", [`${square}/00000.png`, "out/office-of-liam-fennell-square.png"]);
  console.log("Wrote public/images/meta/og-office.{mp4,png} and out/office-of-liam-fennell{,-square}.mp4");
}
