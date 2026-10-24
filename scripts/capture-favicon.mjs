// Captures the favicon from the real footer globe (/og/favicon): sizes it so its glyphs span 80% of a 512px square,
// then watches it in real time and saves a frame each time one of its colour glitches is under way. A glitch ripples
// through its glyphs a few at a time, so mid-glitch is three or more lit at once.
// Real time, not the og video's virtual clock, since the glitch runs on its own timer; pick the best frame by eye.
//
// Needs the dev server and Playwright (see scripts/capture-og.mjs):
//   node scripts/capture-favicon.mjs [url]            → out/favicon/candidate-*.png and out/favicon/sheet.png
//   node scripts/capture-favicon.mjs --pick <n>       → public/images/meta/favicon-globe-{32,180,192}.png (from a 1024px master)
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";

// Laid out at 512px and captured at 2×, so every icon size is scaled down from a 1024px master.
const SIZE = 512, SCALE = 2, FILL = 0.8, DIR = "out/favicon";
const ICONS = [32, 180, 192];
const pick = process.argv.indexOf("--pick");

if (pick > -1) {
  const source = `${DIR}/candidate-${process.argv[pick + 1]}.png`;
  for (const size of ICONS) execFileSync("ffmpeg", ["-y", "-v", "error", "-i", source, "-vf", `scale=${size}:${size}:flags=lanczos`, `public/images/meta/favicon-globe-${size}.png`]);
  copyFileSync(source, `${DIR}/favicon-globe-${SIZE * SCALE}.png`);
  console.log(`Wrote public/images/meta/favicon-globe-{${ICONS.join(",")}}.png from ${source}`);
} else {
  const { chromium } = await import("playwright-core");
  const url = process.argv[2] ?? "http://localhost:3000/og/favicon";
  rmSync(DIR, { recursive: true, force: true }); mkdirSync(DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: SCALE });
  await page.goto(url, { waitUntil: "load" });
  // Dev overlays, and the swarm's exit ring, which shares the globe's spot but only shows while the swarm is out.
  await page.addStyleTag({ content: "nextjs-portal, [data-feedback-toolbar], .glyph-exit { display: none !important; }" });
  await page.evaluate(() => document.fonts.ready);
  // The glyphs' extent turns with the globe, so it is averaged over a second before fitting.
  const extent = () => page.evaluate(async () => {
    let total = 0;
    for (let sample = 0; sample < 10; sample++) {
      let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
      for (const char of document.querySelectorAll(".glyph-globe-char")) {
        const box = char.getBoundingClientRect();
        left = Math.min(left, box.left); top = Math.min(top, box.top); right = Math.max(right, box.right); bottom = Math.max(bottom, box.bottom);
      }
      total += Math.max(right - left, bottom - top);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return total / 10;
  });
  let globe = 400;
  for (let pass = 0; pass < 2; pass++) {
    globe *= SIZE * FILL / await extent();
    await page.evaluate(size => document.documentElement.style.setProperty("--og-favicon-globe", `${size}px`), globe);
  }
  console.log(`Globe at ${globe.toFixed(0)}px spans ${(await extent()).toFixed(0)}px of ${SIZE}`);
  let saved = 0, lastAt = 0;
  for (const started = Date.now(); Date.now() - started < 30000 && saved < 16;) {
    const lit = await page.evaluate(() => [...document.querySelectorAll(".glyph-globe-char")].filter(char => char.style.color).length);
    if (lit >= 3 && Date.now() - lastAt > 250) {
      await page.screenshot({ path: `${DIR}/candidate-${saved}.png` });
      console.log(`candidate-${saved}: ${lit} glyphs lit`);
      saved++; lastAt = Date.now();
    }
    await page.waitForTimeout(30);
  }
  await browser.close();
  // A sheet of every candidate at full size and at 32px (shown enlarged, nearest-neighbour), to choose from.
  const files = readdirSync(DIR).filter(file => file.startsWith("candidate-")).sort((a, b) => parseInt(a.slice(10)) - parseInt(b.slice(10)));
  const inputs = files.flatMap(file => ["-i", `${DIR}/${file}`]);
  const cells = files.map((_, index) => `[${index}]split[a${index}][b${index}];[a${index}]scale=192:192[l${index}];[b${index}]scale=32:32:flags=lanczos,scale=96:96:flags=neighbor,pad=96:192:0:48:white[s${index}];[l${index}][s${index}]hstack[c${index}]`);
  const columns = Math.min(4, files.length), rows = Math.ceil(files.length / columns);
  execFileSync("ffmpeg", ["-y", "-v", "error", ...inputs, "-filter_complex",
    `${cells.join(";")};${files.map((_, index) => `[c${index}]`).join("")}xstack=inputs=${files.length}:grid=${columns}x${rows}:fill=gray`, `${DIR}/sheet.png`]);
  console.log(`Wrote ${files.length} candidates and ${DIR}/sheet.png`);
}
