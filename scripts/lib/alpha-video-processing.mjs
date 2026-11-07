import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { alphaDecoder, encodingPlan, fileHash, probe, run } from "./video-processing.mjs";
import { ALPHA_MOBILE_RECIPE, processAlphaMobileVideo } from "./alpha-mobile-processing.mjs";

export const ALPHA_RECIPE = `portfolio-alpha-v3-vp9-hevc-${ALPHA_MOBILE_RECIPE}`;

export { alphaDecoder } from "./video-processing.mjs";

export async function processAlphaVideo(input, outputBase, options) {
  if (process.platform !== "darwin") throw new Error("Alpha imports require macOS for the HEVC-with-alpha encoder and native validation.");
  if (!resolve(outputBase).startsWith(`${resolve("public")}/`)) throw new Error("Output must be inside public/.");
  if (options.posterTime !== undefined && (!Number.isFinite(options.posterTime) || options.posterTime < 0)) throw new Error("Poster time must be a non-negative number.");
  if (options.av1) throw new Error("Use VP9 and HEVC for alpha imports; --av1 is for opaque clips.");
  const source = probe(input), video = source.streams.find(stream => stream.codec_type === "video");
  if (!video) throw new Error("Source has no video stream.");
  if (Number(video.tags?.rotate) || video.side_data_list?.some(data => data.rotation)) throw new Error("Bake rotation into the master before importing.");
  const decoder = alphaDecoder(video), plan = encodingPlan(video, options), sourceHash = await fileHash(input);
  const signature = createHash("sha256").update(JSON.stringify({ recipe: ALPHA_RECIPE, sourceHash, plan, posterTime: options.posterTime ?? 0.1 })).digest("hex");
  const reportPath = `${outputBase}-report.json`;
  try {
    const existing = JSON.parse(await readFile(reportPath, "utf8"));
    if (existing.signature === signature && (await Promise.all(existing.files.map(async file => await fileHash(file.path) === file.sha256))).every(Boolean)) return existing;
    throw new Error("Output base belongs to another source or recipe. Use a new version.");
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  await mkdir(dirname(outputBase), { recursive: true });
  const marker = `${outputBase}-recipe.json`;
  try {
    if (JSON.parse(await readFile(marker, "utf8")).signature !== signature) throw new Error("Output base belongs to another recipe.");
  } catch (error) { if (error.code !== "ENOENT") throw error; await writeFile(marker, JSON.stringify({ signature })); }
  const files = [], renditions = [], posters = [], alphaValidation = [];
  const publicPath = path => resolve(path).slice(resolve("public").length);
  const record = async (path, contentType) => {
    const info = await stat(path);
    files.push({ path, publicPath: publicPath(path), contentType, bytes: info.size, sha256: await fileHash(path) });
  };
  const verifyAlpha = file => {
    const result = JSON.parse(execFileSync("xcrun", ["swift", "-module-cache-path", "/tmp/portfolio-video-swift-cache", fileURLToPath(new URL("./check-video-alpha.swift", import.meta.url)), file], { encoding: "utf8" }));
    if (!result.frames || result.alphaMin !== 0 || result.alphaMax !== 255) throw new Error(`Alpha validation failed: ${file}`);
    alphaValidation.push({ file: publicPath(file), ...result });
  };
  const tags = ["-color_primaries", "bt709", "-color_trc", "iec61966-2-1", "-colorspace", "bt709"];
  for (const width of plan.widths) {
    // Convert color separately, then reattach the untouched alpha before resizing both together.
    const filter = `[0:v]split[color][alpha];[alpha]alphaextract[matte];[color]colorspace=iall=bt709:itrc=${plan.inputTransfer}:irange=${plan.inputRange}:all=bt709:trc=srgb:range=tv:format=yuv420p[converted];[converted][matte]alphamerge,scale=${width}:-2:flags=lanczos,setsar=1,fps=${plan.frameRate}`;
    const webm = `${outputBase}-${width}-alpha.webm`, hevc = `${outputBase}-${width}-alpha.mov`;
    console.log(`Alpha ${width}px / ${plan.frameRate}fps: VP9 + HEVC`);
    run(["-y", ...decoder, "-i", input, "-filter_complex", `${filter},format=yuva420p[out]`, "-map", "[out]", "-an", "-map_metadata", "-1", "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "28", "-deadline", "good", "-cpu-used", "2", "-row-mt", "1", "-auto-alt-ref", "0", "-g", String(Math.round(plan.fps)), "-metadata:s:v:0", "alpha_mode=1", ...tags, webm]);
    run(["-y", ...decoder, "-i", input, "-filter_complex", `${filter},format=bgra[out]`, "-map", "[out]", "-an", "-map_metadata", "-1", "-c:v", "hevc_videotoolbox", "-alpha_quality", "0.9", "-q:v", "65", "-g", String(Math.round(plan.fps)), "-tag:v", "hvc1", ...tags, "-movflags", "+faststart", hevc]);
    for (const file of [webm, hevc]) {
      const encoded = probe(file), stream = encoded.streams[0];
      if (stream.width !== width || stream.height % 2 || Math.abs(Number(encoded.format.duration) - Number(source.format.duration)) > Math.max(0.1, 2 / plan.fps) || Math.abs(Number(stream.avg_frame_rate.split("/")[0]) / Number(stream.avg_frame_rate.split("/")[1]) - plan.fps) > 0.01 || encoded.streams.some(stream => stream.codec_type === "audio")) throw new Error(`Validation failed: ${file}`);
      if (file === webm && (stream.tags?.alpha_mode ?? stream.tags?.ALPHA_MODE) !== "1") throw new Error(`Missing VP9 alpha: ${file}`);
      run(["-xerror", ...(file === webm ? ["-c:v", "libvpx-vp9"] : []), "-i", file, "-f", "null", "-"]);
    }
    // Apple decodes the auxiliary HEVC layer that ordinary FFmpeg decoders ignore.
    verifyAlpha(hevc);
    await record(webm, "video/webm"); await record(hevc, "video/quicktime");
    renditions.push({ width, webmAlpha: publicPath(webm), hevcAlpha: publicPath(hevc) });
  }
  const largest = renditions.at(-1), largestStream = probe(`public${largest.webmAlpha}`).streams[0];
  for (const width of [...new Set([Math.min(480, largest.width), Math.min(800, largest.width), largest.width])]) {
    const path = `${outputBase}-poster-${width}.webp`;
    const time = Math.min(options.posterTime ?? 0.1, Math.max(0, Number(source.format.duration) - 1 / plan.fps));
    run(["-y", "-c:v", "libvpx-vp9", "-ss", String(time), "-i", `public${largest.webmAlpha}`, "-frames:v", "1", "-vf", `scale=${width}:-2:flags=lanczos,format=rgba`, "-c:v", "libwebp", "-quality", "88", path]);
    await record(path, "image/webp"); posters.push({ width, src: publicPath(path) });
  }
  const mobile = await processAlphaMobileVideo(input, `${outputBase}-mobile`, options);
  files.push(...mobile.files);
  const report = { signature, recipe: ALPHA_RECIPE, sourceHash, source: { width: video.width, height: video.height, frameRate: video.avg_frame_rate }, alphaValidation,
    asset: { id: options.id, kind: "video", alpha: true, mobileBackdrop: mobile.backdrop, src: largest.webmAlpha, poster: posters.at(-1).src, posters, alt: options.alt, width: largestStream.width, height: largestStream.height, frameRate: plan.fps, duration: Number(source.format.duration), renditions: renditions.map(rung => ({ ...rung, h264: mobile.renditions.find(item => item.width === rung.width).h264 })) }, files };
  await writeFile(`${reportPath}.tmp`, `${JSON.stringify(report, null, 2)}\n`); await rename(`${reportPath}.tmp`, reportPath);
  console.table(files.map(file => ({ file: file.publicPath, KB: Math.round(file.bytes / 1000) })));
  return report;
}
