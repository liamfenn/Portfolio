// Builds the sound lab page into out/sound-lab: lab.html with the shared synth, the loop's events, and its length
// inlined, beside the 1200×630 og video it plays against. Rerun after changing the synth, the animation, or the lab.
//
//   node scripts/og-sound/build-lab.mjs
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const FRAMES = "out/og-frames-1200x630@1x", FPS = 60;
const here = path => new URL(path, import.meta.url);
// Inline modules can't export, so the synth's exports become plain declarations in the page's own module.
const synth = readFileSync(here("./synth.mjs"), "utf8").replace(/^export /gm, "");
// Only what the lab reads, rounded: the page carries every event, so this keeps it small.
const events = JSON.parse(readFileSync(`${FRAMES}/events.json`, "utf8"))
  .filter(event => ["flick", "release", "kick", "pump", "pop", "hit", "land"].includes(event.type))
  .map(({ type, time, x, strength }) => ({ type, time: Math.round(time * 1e4) / 1e4, x: Math.round(x * 1e3) / 1e3, ...(strength ? { strength: Math.round(strength * 100) / 100 } : {}) }));
const seconds = readdirSync(FRAMES).filter(file => file.endsWith(".png")).length / FPS;
const page = readFileSync(here("./lab.html"), "utf8")
  .replace("/*SYNTH*/", () => synth).replace("/*EVENTS*/", () => JSON.stringify(events)).replace("/*SECONDS*/", String(seconds));
mkdirSync("out/sound-lab", { recursive: true });
writeFileSync("out/sound-lab/index.html", page);
copyFileSync("public/images/meta/og-office.mp4", "out/sound-lab/loop.mp4");
console.log(`Wrote out/sound-lab/index.html (${(page.length / 1024).toFixed(0)} KB, ${events.length} events, ${seconds}s) and loop.mp4`);
