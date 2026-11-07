#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { ALPHA_MOBILE_RECIPE, processAlphaMobileVideo } from "./lib/alpha-mobile-processing.mjs";
import { fileHash } from "./lib/video-processing.mjs";
import { registerMediaAssets, requireBlobToken, uploadMediaFile } from "./lib/media-publishing.mjs";

async function main() {
  const pairs = process.argv.slice(2);
  if (!pairs.length || pairs.length % 2) throw new Error("Usage: node scripts/add-alpha-mobile-previews.mjs <asset-id> <original-master> [...]");
  requireBlobToken();
  const manifest = JSON.parse(await readFile("src/lib/imported-media.json", "utf8")), updated = [];
  for (let index = 0; index < pairs.length; index += 2) {
    const [id, input] = pairs.slice(index, index + 2), asset = manifest[id];
    if (!asset?.alpha) throw new Error(`Expected a registered transparent asset: ${id}`);
    const widths = asset.renditions.map(rung => rung.width);
    const version = createHash("sha256").update(await fileHash(input)).update(JSON.stringify({ recipe: ALPHA_MOBILE_RECIPE, widths })).digest("hex").slice(0, 16);
    const report = await processAlphaMobileVideo(input, `public/media/${id}/${version}-mobile`, { widths });
    const urls = new Map();
    for (const file of report.files) urls.set(file.publicPath, await uploadMediaFile(file.path, file.publicPath.slice(1), file.contentType));
    updated.push({ ...asset, mobileBackdrop: report.backdrop, renditions: asset.renditions.map(rung => {
      const mobile = report.renditions.find(item => item.width === rung.width);
      if (!mobile) throw new Error(`Missing mobile rendition at ${rung.width}px for ${id}`);
      return { ...rung, h264: urls.get(mobile.h264) };
    }) });
  }
  await registerMediaAssets(updated);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
