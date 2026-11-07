#!/usr/bin/env node
import { createHash } from "node:crypto";
import { fileHash, processVideo, RECIPE } from "./lib/video-processing.mjs";
import { ALPHA_RECIPE } from "./lib/alpha-video-processing.mjs";
import { publishMediaReport, registerMediaAssets, requireBlobToken } from "./lib/media-publishing.mjs";

const [input, ...flags] = process.argv.slice(2);
const options = {};
let local = false;
for (let index = 0; index < flags.length; index++) {
  const flag = flags[index];
  if (flag === "--id") options.id = flags[++index];
  else if (flag === "--alt") options.alt = flags[++index];
  else if (flag === "--fps") options.fps = flags[++index];
  else if (flag === "--widths") options.widths = flags[++index]?.split(",").map(Number);
  else if (flag === "--poster-time") options.posterTime = Number(flags[++index]);
  else if (flag === "--av1") options.av1 = true;
  else if (flag === "--alpha") options.alpha = true;
  else if (flag === "--assume-srgb") options.assumeSrgb = true;
  else if (flag === "--local") local = true;
  else throw new Error(`Unknown option: ${flag}`);
}

async function main() {
  if (!input || !/^[a-z][a-z0-9-]*$/.test(options.id ?? "") || !options.alt) throw new Error('Usage: npm run media:import -- <source> --id shop-product-page --alt "Shop product page prototype" [--local]');
  if (!local) requireBlobToken();
  const hash = createHash("sha256").update(await fileHash(input)).update(JSON.stringify({ recipe: options.alpha ? ALPHA_RECIPE : RECIPE, options })).digest("hex").slice(0, 16);
  const base = `public/media/${options.id}/${hash}`;
  const report = await processVideo(input, base, options);
  if (local) {
    console.log(`Local validation complete. Report: ${base}-report.json. The deployed registry was not changed.`);
    return;
  }
  await registerMediaAssets([await publishMediaReport(report)]);
  console.log(`Registered IMPORTED_MEDIA[${JSON.stringify(options.id)}]. Review and commit src/lib/imported-media.json; assign it to a tile in project-previews.ts.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
