// Renders the favicon: a handful of the burst's floating glyphs, tilted and scattered in glyph-palette colours on
// white, drawn in the site's own faces at 512px and scaled down for each icon size. Seeded, so a rerun matches.
//
// Needs Playwright, which is not a project dependency (see scripts/capture-og.mjs):
//   npx tsx scripts/render-favicon.mjs [seed] [--sheet]
// --sheet writes out/favicon-sheet.png comparing seeds seed..seed+5 at 16, 32, and 180px, and writes no icons.
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { DEFAULT_PALETTE, contrastOnWhite, glyphColors } from "../src/lib/palette-toy.ts";

const SEED = Number(process.argv[2] ?? 1);
const SHEET = process.argv.includes("--sheet");
const SIZE = 512;
/** Four or five glyphs still read as a scatter at 32px; more turn to noise. */
const GLYPHS = Array.from("@&?a*g%R#{e!f");
/** Only the stronger half of the glyph palette: the pale colours wash out once a glyph is a few pixels wide. */
const COLORS = glyphColors(DEFAULT_PALETTE).filter(color => contrastOnWhite(color.hex) >= 2.2).map(color => color.hex);
/** Every glyph stays this far inside the square, so none is clipped. */
const INSET = 16;
const FONTS = { sans: resolve("public/fonts/ABCOracle.ttf"), serif: resolve("public/fonts/ABCOttoVariable.woff2") };
const ICONS = [["favicon-glyphs-32.png", 32], ["favicon-glyphs-180.png", 180], ["favicon-glyphs-512.png", 512]];

const seeded = seed => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const pick = (random, list) => list.splice(Math.floor(random() * list.length), 1)[0];

/**
 * One glyph per cell of a jittered 3 × 3 grid, most cells left empty, then eased apart until none overlaps and all sit
 * inside the square. Colours are spaced evenly around the palette, which is in hue order, so neighbours differ.
 */
function layout(seed) {
  const random = seeded(seed), glyphs = [...GLYPHS];
  const cells = Array.from({ length: 9 }, (_, index) => index), count = 4 + Math.floor(random() * 2), placed = [];
  const offset = random() * COLORS.length;
  for (let n = 0; n < count; n++) {
    const cell = pick(random, cells), column = cell % 3, row = Math.floor(cell / 3), step = SIZE / 3, size = 220 + random() * 90;
    placed.push({
      char: pick(random, glyphs), color: COLORS[Math.floor(offset + n * COLORS.length / count) % COLORS.length],
      face: random() < 0.5 ? "sans" : "serif", size, radius: size * 0.34, angle: (random() - 0.5) * 80,
      x: (column + 0.5) * step + (random() - 0.5) * step * 0.45, y: (row + 0.5) * step + (random() - 0.5) * step * 0.45,
    });
  }
  for (let pass = 0; pass < 200; pass++) {
    for (const a of placed) for (const b of placed) {
      if (a === b) continue;
      const dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy) || 1, overlap = a.radius + b.radius - distance;
      if (overlap > 0) { a.x -= dx / distance * overlap / 4; a.y -= dy / distance * overlap / 4; b.x += dx / distance * overlap / 4; b.y += dy / distance * overlap / 4; }
    }
    for (const glyph of placed) {
      glyph.x = Math.max(INSET + glyph.radius, Math.min(SIZE - INSET - glyph.radius, glyph.x));
      glyph.y = Math.max(INSET + glyph.radius, Math.min(SIZE - INSET - glyph.radius, glyph.y));
    }
  }
  return placed;
}

const html = glyphs => `<!doctype html><style>
  @font-face { font-family: sans; src: url("file://${FONTS.sans}"); font-weight: 100 900; }
  @font-face { font-family: serif; src: url("file://${FONTS.serif}"); font-weight: 100 900; }
  html, body { margin: 0; width: ${SIZE}px; height: ${SIZE}px; background: #ffffff; overflow: hidden; }
  span { position: absolute; left: 0; top: 0; font-weight: 400; line-height: 1; white-space: pre; }
</style>${glyphs.map(glyph => `<span style="font-family:${glyph.face};font-size:${glyph.size}px;color:${glyph.color};` +
  `transform:translate(${glyph.x}px,${glyph.y}px) translate(-50%,-50%) rotate(${glyph.angle}deg)">${glyph.char.replace("&", "&amp;")}</span>`).join("")}`;

const scale = (input, output, size) => execFileSync("ffmpeg", ["-y", "-v", "error", "-i", input, "-vf", `scale=${size}:${size}:flags=lanczos`, output]);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
const render = async (seed, path) => {
  await page.setContent(html(layout(seed)));
  await page.evaluate(() => document.fonts.ready);
  // Nudges any glyph that pokes past the edge back inside, measured on the rotated ink box.
  await page.evaluate(({ size, inset }) => {
    for (const span of document.querySelectorAll("span")) {
      const box = span.getBoundingClientRect();
      const dx = Math.max(0, inset - box.left) - Math.max(0, box.right - (size - inset));
      const dy = Math.max(0, inset - box.top) - Math.max(0, box.bottom - (size - inset));
      span.style.translate = `${dx}px ${dy}px`;
    }
  }, { size: SIZE, inset: INSET });
  await page.screenshot({ path });
};
mkdirSync("out", { recursive: true });
if (SHEET) {
  const rows = [];
  for (let seed = SEED; seed < SEED + 6; seed++) {
    const master = `out/favicon-${seed}.png`;
    await render(seed, master);
    // Each size is scaled down and back up with nearest-neighbour, so the sheet shows the real pixels.
    for (const size of [16, 32, 180]) {
      scale(master, `out/favicon-${seed}-${size}.png`, size);
      execFileSync("ffmpeg", ["-y", "-v", "error", "-i", `out/favicon-${seed}-${size}.png`, "-vf", "scale=180:180:flags=neighbor", `out/favicon-${seed}-${size}-big.png`]);
    }
    rows.push(`out/favicon-${seed}-16-big.png`, `out/favicon-${seed}-32-big.png`, `out/favicon-${seed}-180-big.png`);
  }
  execFileSync("ffmpeg", ["-y", "-v", "error", ...rows.flatMap(path => ["-i", path]), "-filter_complex",
    `${rows.map((_, index) => `[${index}]`).join("")}xstack=inputs=${rows.length}:grid=3x6:fill=gray`, "out/favicon-sheet.png"]);
  console.log(`Wrote out/favicon-sheet.png (rows are seeds ${SEED}–${SEED + 5}; columns 16, 32, 180px)`);
} else {
  await render(SEED, "out/favicon-master.png");
  for (const [name, size] of ICONS) scale("out/favicon-master.png", `public/images/meta/${name}`, size);
  console.log(`Wrote ${ICONS.map(([name]) => `public/images/meta/${name}`).join(", ")}`);
}
await browser.close();
