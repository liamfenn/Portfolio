#!/usr/bin/env node
import { processVideo } from "./lib/video-processing.mjs";

const [input, outputBase, ...flags] = process.argv.slice(2);
if (!input || !outputBase) {
  console.error('Usage: npm run media:video -- <source> public/media/<versioned-name> [--fps 60] [--widths 800,1200,1600] [--av1] [--assume-srgb]');
  process.exit(1);
}
const options = {};
for (let index = 0; index < flags.length; index++) {
  const flag = flags[index];
  if (flag === "--av1") options.av1 = true;
  else if (flag === "--assume-srgb") options.assumeSrgb = true;
  else if (flag === "--fps") options.fps = flags[++index];
  else if (flag === "--widths") options.widths = flags[++index]?.split(",").map(Number);
  else if (flag === "--poster-time") options.posterTime = Number(flags[++index]);
  else throw new Error(`Unknown option: ${flag}. Frame rate is preserved by default; use named options.`);
}
processVideo(input, outputBase, options).catch(error => { console.error(error.message); process.exitCode = 1; });
