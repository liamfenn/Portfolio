#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { basename } from "node:path";
import { AUDIT_DIRECTORY, localMedia, publishedVideos } from "./audit-media.mjs";
import { fileHash, processVideo, RECIPE, run } from "./lib/video-processing.mjs";
import { ALPHA_RECIPE } from "./lib/alpha-video-processing.mjs";
import { mapMediaSources, publishMediaReport, registerMediaAssets, requireBlobToken, uploadMediaFile } from "./lib/media-publishing.mjs";

const flags = process.argv.slice(2);
const alphaSource = flags.includes("--alpha-source") ? flags[flags.indexOf("--alpha-source") + 1] : undefined;

function scores(result) {
  const values = result.frames.map(frame => frame.metrics.vmaf).sort((a, b) => a - b);
  return { mean: result.pooled_metrics.vmaf.mean, fifthPercentile: values[Math.floor(values.length * 0.05)] };
}

async function quality(file, reference, path) {
  try { return scores(JSON.parse(await readFile(path, "utf8"))); } catch {}
  run(["-i", file, "-i", reference, "-filter_complex", `[0:v]scale=640:-2:flags=lanczos,setpts=PTS-STARTPTS[d];[1:v]scale=640:-2:flags=lanczos,setpts=PTS-STARTPTS[r];[d][r]libvmaf=log_path=${path}:log_fmt=json:n_threads=2:n_subsample=2`, "-f", "null", "-"]);
  return scores(JSON.parse(await readFile(path, "utf8")));
}

async function migrateDelivery(asset) {
  const sources = new Set([asset.src, asset.poster, ...(asset.posters ?? []).map(p => p.src), ...asset.renditions.flatMap(r => [r.h264, r.av1, r.webmAlpha, r.hevcAlpha].filter(Boolean))]);
  const urls = new Map();
  for (const source of sources) {
    if (/^https?:/.test(source)) { urls.set(source, source); continue; }
    const type = source.endsWith(".webp") ? "image/webp" : source.endsWith(".webm") ? "video/webm" : source.endsWith(".mov") ? "video/quicktime" : "video/mp4";
    urls.set(source, await uploadMediaFile(await localMedia(source), `media/${asset.id}/${basename(source)}`, type));
  }
  return mapMediaSources(asset, source => urls.get(source));
}

async function main() {
  requireBlobToken();
  await mkdir(AUDIT_DIRECTORY, { recursive: true });
  const assets = [], comparisons = [];
  for (const { label, asset } of publishedVideos()) {
    if (asset.renditions.some(rung => rung.width === 640)) { assets.push(await migrateDelivery(asset)); continue; }
    const largest = [...asset.renditions].sort((a, b) => b.width - a.width)[0];
    if (asset.alpha && !alphaSource) throw new Error("Supply --alpha-source with the original transparent master; the registry has not been changed.");
    const input = asset.alpha ? alphaSource : await localMedia(largest.h264);
    const sourceHash = await fileHash(input), recipe = asset.alpha ? ALPHA_RECIPE : RECIPE;
    const options = { id: asset.id, alt: asset.alt, widths: [640], ...(asset.alpha ? { alpha: true, posterTime: 1 } : {}) };
    const version = createHash("sha256").update(sourceHash).update(JSON.stringify({ recipe, options })).digest("hex").slice(0, 16);
    const report = await processVideo(input, `public/media/${asset.id}/${version}`, options);
    const previous = [...asset.renditions].sort((a, b) => a.width - b.width).find(rung => rung.width >= 640);
    const comparison = { id: asset.id, label, source: asset.alpha ? "original-alpha-master" : "existing-largest-delivery", previousWidth: previous.width, newWidth: 640 };
    if (!asset.alpha) {
      const before = await localMedia(previous.h264), candidate = `public${report.asset.renditions[0].h264}`;
      comparison.before = await quality(before, input, `${AUDIT_DIRECTORY}/${asset.id}-${version}-before-vmaf.json`);
      comparison.after = await quality(candidate, input, `${AUDIT_DIRECTORY}/${asset.id}-${version}-after-vmaf.json`);
      if (comparison.after.mean < 95 || comparison.after.mean < comparison.before.mean - 0.5 || comparison.after.fifthPercentile < comparison.before.fifthPercentile - 1) throw new Error(`Quality gate failed for ${label}; existing delivery and registry are retained.`);
      comparison.previousBytes = (await stat(before)).size;
      comparison.newBytes = (await stat(candidate)).size;
    } else {
      comparison.previousBytes = (await stat(await localMedia(previous.webmAlpha))).size;
      comparison.newBytes = report.files.find(file => file.path.endsWith(".webm")).bytes;
    }
    const published = await publishMediaReport(report), migrated = await migrateDelivery(asset);
    assets.push({ ...migrated, renditions: [...published.renditions, ...migrated.renditions].sort((a, b) => a.width - b.width) });
    comparisons.push(comparison);
    console.log(`${label}: ${(comparison.previousBytes / 1e6).toFixed(2)} → ${(comparison.newBytes / 1e6).toFixed(2)} MB for smaller screens`);
  }
  // All quality gates and uploads finish before one atomic registry update.
  await registerMediaAssets(assets);
  if (comparisons.length) {
    let previous = [];
    try { previous = JSON.parse(await readFile(`${AUDIT_DIRECTORY}/optimization.json`, "utf8")).comparisons; } catch {}
    const combined = new Map(previous.map(comparison => [comparison.id, comparison]));
    for (const comparison of comparisons) combined.set(comparison.id, comparison);
    await writeFile(`${AUDIT_DIRECTORY}/optimization.json`, `${JSON.stringify({ recipe: RECIPE, generatedAt: new Date().toISOString(), comparisons: [...combined.values()] }, null, 2)}\n`);
  }
  console.log(`Optimization report: ${AUDIT_DIRECTORY}/optimization.json`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
