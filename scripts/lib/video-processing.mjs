import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export const RECIPE = "portfolio-video-v1-srgb-source-fps";
export const DEFAULT_WIDTHS = [800, 1200, 1600];

export function rate(value) {
  const [numerator, denominator = 1] = String(value).split("/").map(Number);
  return numerator / denominator;
}

export function encodingPlan(stream, { fps, widths = DEFAULT_WIDTHS, assumeSrgb = false } = {}) {
  const sourceFps = rate(stream.avg_frame_rate || stream.r_frame_rate);
  const frameRate = fps ?? stream.avg_frame_rate ?? stream.r_frame_rate;
  if (!Number.isFinite(sourceFps) || sourceFps <= 0 || sourceFps > 120) throw new Error("Source must have a valid frame rate up to 120fps.");
  if (!Number.isFinite(rate(frameRate)) || rate(frameRate) <= 0 || rate(frameRate) > sourceFps + 0.01) throw new Error("Frame rate must be positive and cannot exceed the source rate.");
  if (!widths.length || widths.some(width => !Number.isInteger(width) || width < 64 || width % 2)) throw new Error("Widths must be even integers of at least 64px.");
  if (stream.color_primaries && stream.color_primaries !== "bt709") throw new Error("Export an SDR sRGB/Rec.709 master; wide-gamut/HDR input needs an intentional conversion first.");
  if (stream.sample_aspect_ratio && !["1:1", "0:1"].includes(stream.sample_aspect_ratio)) throw new Error("Export a square-pixel master before importing.");
  if (stream.color_space && stream.color_space !== "bt709") throw new Error("Export a Rec.709 matrix SDR master before importing.");
  const transfer = stream.color_transfer;
  if (transfer && !["bt709", "iec61966-2-1"].includes(transfer)) throw new Error("Export SDR sRGB/Rec.709 rather than HDR or an unsupported transfer function.");
  if ((!transfer || !stream.color_primaries) && !assumeSrgb) throw new Error("Source has incomplete color metadata. Export tagged SDR or explicitly use --assume-srgb.");
  const selected = [...new Set([...widths.filter(width => width <= stream.width), Math.min(stream.width - stream.width % 2, Math.max(...widths))])].sort((a, b) => a - b);
  return {
    frameRate: String(frameRate), fps: rate(frameRate),
    inputTransfer: transfer === "bt709" ? "bt709" : "srgb",
    inputRange: stream.color_range === "pc" ? "pc" : "tv",
    widths: selected,
  };
}

export function probe(path) {
  return JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", path], { encoding: "utf8" }));
}

export function run(args) {
  const result = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-nostdin", ...args], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ffmpeg failed (${result.status}).`);
}

export async function fileHash(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

export async function processVideo(input, outputBase, options = {}) {
  if (!resolve(outputBase).startsWith(`${resolve("public")}/`)) throw new Error("Output must be inside public/.");
  if (options.posterTime !== undefined && (!Number.isFinite(options.posterTime) || options.posterTime < 0)) throw new Error("Poster time must be a non-negative number.");
  const source = probe(input);
  const video = source.streams.find(stream => stream.codec_type === "video");
  if (!video) throw new Error("Source has no video stream.");
  if (Number(video.tags?.rotate) || video.side_data_list?.some(data => data.rotation)) throw new Error("Bake rotation into the master before importing.");
  const plan = encodingPlan(video, options);
  const sourceHash = await fileHash(input);
  const signature = createHash("sha256").update(JSON.stringify({ recipe: RECIPE, sourceHash, plan, av1: Boolean(options.av1), posterTime: options.posterTime ?? 0.1 })).digest("hex");
  const reportPath = `${outputBase}-report.json`;
  try {
    const existing = JSON.parse(await readFile(reportPath, "utf8"));
    if (existing.signature === signature && (await Promise.all(existing.files.map(async file => await fileHash(file.path) === file.sha256))).every(Boolean)) {
      console.log("Validated outputs already exist; reusing this recipe.");
      return existing;
    }
    throw new Error("Output base already belongs to another source or recipe. Use a new versioned output base.");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await mkdir(dirname(outputBase), { recursive: true });
  const marker = `${outputBase}-recipe.json`;
  try {
    if (JSON.parse(await readFile(marker, "utf8")).signature !== signature) throw new Error("Output base belongs to another recipe; choose a new version.");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    for (const width of plan.widths) {
      try { await stat(`${outputBase}-${width}.mp4`); } catch (error) { if (error.code === "ENOENT") continue; throw error; }
      throw new Error("Unversioned output already exists; choose a new output base.");
    }
    await writeFile(marker, JSON.stringify({ signature }));
  }
  const files = [], renditions = [], posters = [];
  const publicPath = path => {
    const root = resolve("public");
    const absolute = resolve(path);
    if (!absolute.startsWith(`${root}/`)) throw new Error("Output must be inside public/.");
    return absolute.slice(root.length);
  };
  const record = async (path, contentType) => {
    const info = await stat(path);
    const file = { path, publicPath: publicPath(path), contentType, bytes: info.size, sha256: await fileHash(path) };
    files.push(file);
    return file;
  };
  console.log(`${video.width}×${video.height}, ${source.format.duration}s → ${plan.frameRate}fps (source ${video.avg_frame_rate}), widths ${plan.widths.join("/")}`);
  // Convert tagged SDR into one sRGB transfer/Rec.709 matrix pipeline for both video and posters.
  const color = `colorspace=iall=bt709:itrc=${plan.inputTransfer}:irange=${plan.inputRange}:all=bt709:trc=srgb:range=tv:format=yuv420p`;
  const tags = ["-color_primaries", "bt709", "-color_trc", "iec61966-2-1", "-colorspace", "bt709", "-color_range", "tv"];
  const gop = String(Math.round(plan.fps));
  for (const width of plan.widths) {
    const filter = `${color},scale=${width}:-2:flags=lanczos,setsar=1,fps=${plan.frameRate},format=yuv420p`;
    const crf = width <= 800 ? 18 : width <= 1200 ? 19 : 20;
    const h264 = `${outputBase}-${width}.mp4`;
    console.log(`H.264 ${width}px / ${plan.frameRate}fps / CRF ${crf}`);
    run(["-y", "-i", input, "-map", "0:v:0", "-vf", filter, "-an", "-map_metadata", "-1", "-c:v", "libx264", "-preset", "slow", "-crf", String(crf), "-profile:v", "high", "-g", gop, "-keyint_min", gop, "-sc_threshold", "0", ...tags, "-movflags", "+faststart", h264]);
    const encoded = probe(h264);
    const stream = encoded.streams[0];
    if (stream.width !== width || stream.height % 2 || stream.pix_fmt !== "yuv420p" || stream.sample_aspect_ratio !== "1:1" || stream.color_primaries !== "bt709" || stream.color_transfer !== "iec61966-2-1" || stream.color_space !== "bt709" || Math.abs(rate(stream.avg_frame_rate) - plan.fps) > 0.01 || encoded.streams.some(s => s.codec_type === "audio")) throw new Error(`Validation failed: ${h264}`);
    if (Math.abs(Number(encoded.format.duration) - Number(source.format.duration)) > Math.max(0.1, 2 / plan.fps)) throw new Error(`Duration mismatch: ${h264}`);
    run(["-xerror", "-i", h264, "-f", "null", "-"]);
    const file = await record(h264, "video/mp4");
    const reviewBytes = (width <= 800 ? 3 : width <= 1200 ? 5 : 8) * 1_000_000 * Math.max(1, Number(source.format.duration) / 15);
    if (file.bytes > reviewBytes) console.warn(`Review ${h264}: ${(file.bytes / 1_000_000).toFixed(2)} MB exceeds the review budget; quality and frame rate were preserved.`);
    const rendition = { width, h264: publicPath(h264) };
    if (options.av1) {
      const av1 = `${outputBase}-${width}.av1.mp4`;
      console.log(`AV1 ${width}px / ${plan.frameRate}fps`);
      run(["-y", "-i", input, "-map", "0:v:0", "-vf", filter, "-an", "-map_metadata", "-1", "-c:v", "libsvtav1", "-preset", "6", "-crf", String(crf + 9), "-g", gop, ...tags, "-movflags", "+faststart", av1]);
      const avStream = probe(av1).streams[0];
      if (avStream.width !== width || avStream.height !== stream.height || Math.abs(rate(avStream.avg_frame_rate) - plan.fps) > 0.01) throw new Error(`Validation failed: ${av1}`);
      run(["-xerror", "-i", av1, "-f", "null", "-"]);
      await record(av1, "video/mp4");
      rendition.av1 = publicPath(av1);
    }
    renditions.push(rendition);
  }
  const largest = `${outputBase}-${plan.widths.at(-1)}.mp4`;
  const largestStream = probe(largest).streams[0];
  for (const width of [...new Set([Math.min(480, largestStream.width), Math.min(800, largestStream.width), largestStream.width])]) {
    const path = `${outputBase}-poster-${width}.webp`;
    const posterTime = Math.min(options.posterTime ?? 0.1, Math.max(0, Number(source.format.duration) - 1 / plan.fps));
    run(["-y", "-ss", String(posterTime), "-i", largest, "-frames:v", "1", "-vf", `scale=${width}:-2:flags=lanczos:in_range=tv:out_range=pc,format=rgb24`, "-c:v", "libwebp", "-quality", "88", path]);
    await record(path, "image/webp");
    posters.push({ width, src: publicPath(path) });
  }
  const largestRung = renditions.at(-1);
  const report = {
    signature, recipe: RECIPE, sourceHash, source: { width: video.width, height: video.height, frameRate: video.avg_frame_rate },
    asset: { id: options.id ?? "video", kind: "video", src: largestRung.h264, poster: posters.at(-1).src, posters, alt: options.alt ?? "Portfolio project video", width: largestStream.width, height: largestStream.height, frameRate: plan.fps, duration: Number(source.format.duration), renditions }, files,
  };
  await writeFile(`${reportPath}.tmp`, `${JSON.stringify(report, null, 2)}\n`);
  await rename(`${reportPath}.tmp`, reportPath);
  console.table(files.map(file => ({ file: file.publicPath, KB: Math.round(file.bytes / 1000) })));
  return report;
}
