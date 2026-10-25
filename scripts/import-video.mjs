#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { BlobNotFoundError, head, put } from "@vercel/blob";
import { fileHash, processVideo, RECIPE } from "./lib/video-processing.mjs";

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
  else if (flag === "--assume-srgb") options.assumeSrgb = true;
  else if (flag === "--local") local = true;
  else throw new Error(`Unknown option: ${flag}`);
}

async function main() {
  if (!input || !/^[a-z][a-z0-9-]*$/.test(options.id ?? "") || !options.alt) throw new Error('Usage: npm run media:import -- <source> --id shop-product-page --alt "Shop product page prototype" [--local]');
  if (!local) {
    try { process.loadEnvFile(".env.local"); } catch {}
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN is required to publish. Use --local for an unpublished encode.");
  }
  const hash = createHash("sha256").update(await fileHash(input)).update(JSON.stringify({ recipe: RECIPE, options })).digest("hex").slice(0, 16);
  const base = `public/media/${options.id}/${hash}`;
  const report = await processVideo(input, base, options);
  if (local) {
    console.log(`Local validation complete. Report: ${base}-report.json. The deployed registry was not changed.`);
    return;
  }
  const urls = new Map();
  for (const file of report.files) {
    const pathname = file.publicPath.slice(1);
    let existing;
    try { existing = await head(pathname); } catch (error) { if (!(error instanceof BlobNotFoundError)) throw error; }
    if (existing) {
      if (existing.size !== file.bytes) throw new Error(`Immutable path already exists with a different size: ${pathname}`);
      urls.set(file.publicPath, existing.url);
      console.log(`Exists: ${pathname}`);
    } else {
      const result = await put(pathname, await readFile(file.path), { access: "public", contentType: file.contentType, addRandomSuffix: false, allowOverwrite: false, cacheControlMaxAge: 31536000 });
      urls.set(file.publicPath, result.url);
      console.log(`Uploaded: ${pathname}`);
    }
  }
  const asset = { ...report.asset, src: urls.get(report.asset.src), poster: urls.get(report.asset.poster),
    posters: report.asset.posters.map(poster => ({ ...poster, src: urls.get(poster.src) })),
    renditions: report.asset.renditions.map(rung => ({ ...rung, h264: urls.get(rung.h264), ...(rung.av1 ? { av1: urls.get(rung.av1) } : {}) })) };
  const manifestPath = "src/lib/imported-media.json";
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest[options.id] = asset;
  const ordered = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  await mkdir("src/lib", { recursive: true });
  const temporary = `${manifestPath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(ordered, null, 2)}\n`);
  await rename(temporary, manifestPath);
  console.log(`Registered IMPORTED_MEDIA[${JSON.stringify(options.id)}]. Review and commit ${manifestPath}; assign it to a tile in project-previews.ts.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
