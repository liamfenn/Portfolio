import { readFile, writeFile, rename } from "node:fs/promises";
import { BlobNotFoundError, head, put } from "@vercel/blob";

export function requireBlobToken() {
  try { process.loadEnvFile(".env.local"); } catch {}
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN is required to publish. Use --local for an unpublished encode.");
}

export async function uploadMediaFile(file, pathname, contentType) {
  let existing;
  try { existing = await head(pathname); } catch (error) { if (!(error instanceof BlobNotFoundError)) throw error; }
  const bytes = await readFile(file);
  if (existing) {
    if (existing.size !== bytes.length) throw new Error(`Immutable path already exists with a different size: ${pathname}`);
    return existing.url;
  }
  const result = await put(pathname, bytes, { access: "public", contentType, addRandomSuffix: false, allowOverwrite: false, cacheControlMaxAge: 31536000 });
  console.log(`Uploaded: ${pathname}`);
  return result.url;
}

export function mapMediaSources(asset, source) {
  return { ...asset, src: source(asset.src), poster: source(asset.poster),
    posters: asset.posters?.map(poster => ({ ...poster, src: source(poster.src) })),
    renditions: asset.renditions.map(rung => ({ width: rung.width,
      ...Object.fromEntries(["h264", "av1", "webmAlpha", "hevcAlpha"].filter(codec => rung[codec]).map(codec => [codec, source(rung[codec])])) })) };
}

export async function publishMediaReport(report) {
  const urls = new Map();
  for (const file of report.files) urls.set(file.publicPath, await uploadMediaFile(file.path, file.publicPath.slice(1), file.contentType));
  return mapMediaSources(report.asset, source => {
    const url = urls.get(source);
    if (!url) throw new Error(`Unpublished media reference: ${source}`);
    return url;
  });
}

export async function registerMediaAssets(assets) {
  const path = "src/lib/imported-media.json";
  const manifest = JSON.parse(await readFile(path, "utf8"));
  for (const asset of assets) manifest[asset.id] = asset;
  const ordered = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(ordered, null, 2)}\n`);
  await rename(temporary, path);
}
