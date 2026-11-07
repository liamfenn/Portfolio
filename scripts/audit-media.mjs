#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PROJECT_PREVIEWS } from "../src/lib/project-previews.ts";
import { MEDIA_ASSETS } from "../src/lib/media-assets.ts";
import { probe, run, rate } from "./lib/video-processing.mjs";

export const AUDIT_DIRECTORY = resolve("out/media-audit");

/** Cache public delivery bytes so repeated audits do not redownload unchanged immutable files. */
export async function localMedia(source) {
  if (!/^https?:/.test(source)) return resolve(`public${source}`);
  const target = `${AUDIT_DIRECTORY}/downloads/${createHash("sha256").update(source).digest("hex").slice(0, 12)}-${basename(new URL(source).pathname)}`;
  await mkdir(`${AUDIT_DIRECTORY}/downloads`, { recursive: true });
  try { if ((await stat(target)).size) return target; } catch {}
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Media download failed: ${response.status} ${source}`);
  await writeFile(target, Buffer.from(await response.arrayBuffer()));
  return target;
}

export function publishedVideos() {
  const projects = PROJECT_PREVIEWS.filter(project => project.media?.kind === "video").map(project => ({ label: project.label, asset: project.media }));
  // The OG reel and development lab share this retained project clip.
  return [...projects, { label: "OG reel", asset: MEDIA_ASSETS.shopProductPage }];
}

/** Check that MP4 metadata is available before the first media bytes. */
export async function fastStart(file) {
  const bytes = await readFile(file);
  for (let offset = 0; offset + 8 <= bytes.length;) {
    let size = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    if (type === "moov") return true;
    if (type === "mdat") return false;
    if (size === 1) size = Number(bytes.readBigUInt64BE(offset + 8));
    if (size < 8) break;
    offset += size;
  }
  return false;
}

async function main() {
  const report = [];
  for (const { label, asset } of publishedVideos()) {
    const files = [];
    for (const rung of asset.renditions) for (const codec of ["h264", "webmAlpha", "hevcAlpha"]) {
      if (!rung[codec]) continue;
      const file = await localMedia(rung[codec]), metadata = probe(file), stream = metadata.streams.find(stream => stream.codec_type === "video");
      const bytes = (await stat(file)).size, fps = rate(stream.avg_frame_rate);
      if (stream.width !== rung.width || stream.height !== Math.round(asset.height * rung.width / asset.width) || metadata.streams.some(stream => stream.codec_type === "audio") || Math.abs(fps - asset.frameRate) > 0.01 || Math.abs(Number(metadata.format.duration) - asset.duration) > 0.1) throw new Error(`Invalid dimensions, rate, duration or audio: ${rung[codec]}`);
      if ([stream.color_primaries, stream.color_space].some(value => value !== "bt709") || stream.color_transfer !== "iec61966-2-1") throw new Error(`Unexpected SDR color metadata: ${rung[codec]}`);
      const streaming = codec === "webmAlpha" || await fastStart(file);
      if (!streaming) throw new Error(`MP4 metadata follows media bytes: ${rung[codec]}`);
      if (codec === "webmAlpha" && (stream.tags?.alpha_mode ?? stream.tags?.ALPHA_MODE) !== "1") throw new Error(`Missing alpha metadata: ${rung[codec]}`);
      run(["-xerror", ...(codec === "webmAlpha" ? ["-c:v", "libvpx-vp9"] : []), "-i", file, "-f", "null", "-"]);
      files.push({ codec, width: rung.width, bytes, fps, duration: Number(metadata.format.duration), fastStart: streaming, source: rung[codec] });
    }
    for (const poster of asset.posters ?? []) {
      const file = await localMedia(poster.src), image = probe(file).streams[0];
      if (image.width !== poster.width || !(await stat(file)).size) throw new Error(`Invalid poster: ${poster.src}`);
      run(["-xerror", "-i", file, "-frames:v", "1", "-f", "null", "-"]);
    }
    report.push({ id: asset.id, label, alpha: Boolean(asset.alpha), files });
    console.log(`${label}: ${files.length} validated renditions`);
  }
  const socialFile = "public/images/meta/og-office.mp4", social = probe(socialFile);
  run(["-xerror", "-i", socialFile, "-f", "null", "-"]);
  await mkdir(AUDIT_DIRECTORY, { recursive: true });
  const result = { generatedAt: new Date().toISOString(), videos: report, social: { bytes: (await stat(socialFile)).size, fastStart: await fastStart(socialFile), stream: social.streams[0] } };
  await writeFile(`${AUDIT_DIRECTORY}/audit.json`, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`Audit: ${AUDIT_DIRECTORY}/audit.json`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
