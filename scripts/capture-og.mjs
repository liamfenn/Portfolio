// Records one loop of the /og card, frame by frame, then encodes the link-preview video (1.91:1, only for og:video), its
// poster, and social share cuts in out/share: 16:9 and 9:16 at 1080p, and square, each with a still of its first frame. The page runs on a virtual clock (requestAnimationFrame and performance.now are replaced),
// so every frame is exactly 1/60s apart however long a screenshot takes, and Math.random is seeded, so a rerun gives
// the same video.
//
// Needs the dev server (npm run dev) and Playwright, which is not a project dependency:
//   npm i --no-save playwright-core && npx playwright-core install chromium
//   node scripts/capture-og.mjs [url] [seed] [--quick]
// --quick records only the 1200×630 frames, for tuning, and encodes nothing.
// Variants, recorded as share cuts with a suffix and leaving the site's og:video alone:
//   --reverse      the earlier landing, last out first home (/og?landing=reverse), named -reverse
//   --all-glitch   every letter glitches in and out, staggered, instead of six (/og?glitch=all), named -all-glitch
// --reel records the work reel (/og/reel: letters thrown off the card while the work grid plays) as 16:9 and 9:16 cuts
// named office-of-liam-fennell-reel-*, also leaving the og:video alone; with --quick, only its 16:9 frames.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const URL = process.argv[2] ?? "http://localhost:3000/og";
const SEED = Number(process.argv[3] ?? 7);
const QUICK = process.argv.includes("--quick");
const VARIANTS = [["--reverse", "landing=reverse", "-reverse"], ["--all-glitch", "glitch=all", "-all-glitch"]]
  .filter(([flag]) => process.argv.includes(flag));
const VARIANT = VARIANTS.length > 0;
const REEL = process.argv.includes("--reel");
const BASE = REEL ? URL.replace(/\/og\/?$/, "/og/reel") : URL;
const PAGE = VARIANTS.length ? `${BASE}?${VARIANTS.map(([, query]) => query).join("&")}` : BASE;
const SUFFIX = VARIANTS.map(([, , suffix]) => suffix).join("");
const NAME = REEL ? "office-of-liam-fennell-reel" : "office-of-liam-fennell";
const FPS = 60;
const MAX_FRAMES = FPS * 20;
const FRAMES = REEL ? "out/og-reel-frames" : "out/og-frames";
const SHARE = "out/share";

const clock = seed => {
  let now = 0, id = 0, queue = [], state = seed >>> 0;
  Math.random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  performance.now = () => now;
  // Collected for the sound effects (scripts/sound-og.mjs); its presence is what turns the logging on.
  window.__ogEvents = [];
  window.requestAnimationFrame = callback => { queue.push([++id, callback]); return id; };
  window.cancelAnimationFrame = handle => { queue = queue.filter(([queued]) => queued !== handle); };
  window.__ogAdvance = ms => { now += ms; const due = queue; queue = []; due.forEach(([, callback]) => callback(now)); };
};

async function record(width, height, scale) {
  const dir = `${FRAMES}${SUFFIX}-${width}x${height}@${scale}x`;
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  await page.addInitScript(clock, SEED);
  // Not "networkidle": dev tooling (Agentation retrying its local server) can keep the network busy indefinitely.
  await page.goto(PAGE, { waitUntil: "load" });
  // Dev-only overlays (the Next indicator, Agentation) would otherwise sit on top of the card.
  await page.addStyleTag({ content: "nextjs-portal, [data-feedback-toolbar] { display: none !important; }" });
  // The card sets this once its fonts and Matter.js have loaded, so the first virtual frame is its first real one.
  await page.waitForFunction(() => window.__ogReady === true, null, { timeout: 60000 });
  let frame = 0;
  for (; frame < MAX_FRAMES; frame++) {
    await page.screenshot({ path: `${dir}/${String(frame).padStart(5, "0")}.png` });
    if (await page.evaluate(() => (window.__ogLoops ?? 0) >= 1)) break;
    await page.evaluate(ms => window.__ogAdvance(ms), 1000 / FPS);
  }
  // One loop's events, in seconds from the first frame, which is at virtual time 0.
  const events = await page.evaluate(() => window.__ogEvents.map(event => ({ ...event, time: event.time / 1000 })));
  writeFileSync(`${dir}/events.json`, JSON.stringify(events));
  await browser.close();
  console.log(`${width}×${height}@${scale}x: ${frame + 1} frames, ${((frame + 1) / FPS).toFixed(2)}s`);
  return dir;
}

const encode = (dir, output, crf) => execFileSync("ffmpeg", ["-y", "-v", "error", "-framerate", String(FPS), "-i", `${dir}/%05d.png`,
  "-c:v", "libx264", "-preset", "slow", "-crf", String(crf), "-pix_fmt", "yuv420p", "-movflags", "+faststart", output], { stdio: "inherit" });

if (REEL) {
  mkdirSync(SHARE, { recursive: true });
  for (const [name, width, height, scale] of QUICK ? [["16x9", 1200, 675, 1]] : [["16x9", 1200, 675, 1.6], ["9x16", 675, 1200, 1.6]]) {
    const dir = await record(width, height, scale);
    if (QUICK) continue;
    encode(dir, `${SHARE}/${NAME}-${name}${SUFFIX}.mp4`, 16);
    execFileSync("cp", [`${dir}/00000.png`, `${SHARE}/${NAME}-${name}${SUFFIX}.png`]);
  }
  if (!QUICK) console.log(`Wrote ${SHARE}/${NAME}-{16x9,9x16}${SUFFIX}.{mp4,png}`);
  process.exit(0);
}
const preview = await record(1200, 630, 1);
if (!QUICK) {
  if (!VARIANT) {
    encode(preview, "public/images/meta/og-office.mp4", 20);
    execFileSync("cp", [`${preview}/00000.png`, "public/images/meta/og-office.png"]);
  }
  // Social share cuts, each a video and its first frame. The 16:9 and 9:16 cuts are laid out at 1200×675 and 675×1200 and
  // scaled up to 1080p, so the text keeps roughly the card's scale.
  mkdirSync(SHARE, { recursive: true });
  for (const [name, width, height, scale] of [["16x9", 1200, 675, 1.6], ["9x16", 675, 1200, 1.6], ["1x1", 1200, 1200, 2]]) {
    const dir = await record(width, height, scale);
    encode(dir, `${SHARE}/office-of-liam-fennell-${name}${SUFFIX}.mp4`, 16);
    execFileSync("cp", [`${dir}/00000.png`, `${SHARE}/office-of-liam-fennell-${name}${SUFFIX}.png`]);
  }
  console.log(`Wrote ${VARIANT ? "" : "public/images/meta/og-office.{mp4,png} and "}${SHARE}/office-of-liam-fennell-{16x9,9x16,1x1}${SUFFIX}.{mp4,png}`);
}
