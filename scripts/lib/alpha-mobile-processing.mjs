import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { alphaDecoder, encodingPlan, fileHash, h264EncodingArgs, probe, rate, run } from "./video-processing.mjs";

// Bind the encoded matte to the light-theme tile token, including its value in immutable versions.
export const ALPHA_MOBILE_BACKDROP = readFileSync(new URL("../../src/app/tokens.css", import.meta.url), "utf8").match(/^\s*--bg-secondary-fill:\s*(#[\da-f]{6});/im)?.[1];
if (!ALPHA_MOBILE_BACKDROP) throw new Error("Resolve the light bg-secondary-fill token before encoding mobile previews.");
export const ALPHA_MOBILE_RECIPE = `mobile-h264-v1-${ALPHA_MOBILE_BACKDROP}`;

/** Mobile has a separate header, so a matching matte avoids the alpha decoder entirely. */
export async function processAlphaMobileVideo(input, outputBase, options = {}) {
  if (!resolve(outputBase).startsWith(`${resolve("public")}/`)) throw new Error("Output must be inside public/.");
  const source = probe(input), video = source.streams.find(stream => stream.codec_type === "video");
  const decoder = alphaDecoder(video), plan = encodingPlan(video, options), sourceHash = await fileHash(input);
  const signature = createHash("sha256").update(JSON.stringify({ sourceHash, plan, recipe: ALPHA_MOBILE_RECIPE })).digest("hex");
  const reportPath = `${outputBase}-report.json`;
  try {
    const report = JSON.parse(await readFile(reportPath, "utf8"));
    if (report.signature === signature && (await Promise.all(report.files.map(async file => await fileHash(file.path) === file.sha256))).every(Boolean)) return report;
    throw new Error("Mobile output belongs to another source or recipe. Use a new version.");
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  await mkdir(dirname(outputBase), { recursive: true });
  const files = [], renditions = [];
  const tags = ["-color_primaries", "bt709", "-color_trc", "iec61966-2-1", "-colorspace", "bt709", "-color_range", "tv"];
  for (const width of plan.widths) {
    const height = Math.round(video.height * width / video.width / 2) * 2;
    const filter = `[0:v]split[color][alpha];[alpha]alphaextract[matte];[color]colorspace=iall=bt709:itrc=${plan.inputTransfer}:irange=${plan.inputRange}:all=bt709:trc=srgb:range=tv:format=yuv420p[converted];[converted][matte]alphamerge,scale=${width}:${height}:flags=lanczos,setsar=1,fps=${plan.frameRate},format=rgba[foreground];color=c=${ALPHA_MOBILE_BACKDROP}:s=${width}x${height}:r=${plan.frameRate},format=rgba[background];[background][foreground]overlay=shortest=1:format=rgb,scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p[out]`;
    const path = `${outputBase}-${width}.mp4`, publicPath = resolve(path).slice(resolve("public").length);
    console.log(`Mobile matte ${width}px / ${plan.frameRate}fps / ${ALPHA_MOBILE_BACKDROP}`);
    run(["-y", ...decoder, "-i", input, "-filter_complex", filter, "-map", "[out]", "-an", "-map_metadata", "-1", ...h264EncodingArgs(width, plan.fps), ...tags, "-movflags", "+faststart", path]);
    const encoded = probe(path), stream = encoded.streams[0];
    if (stream.codec_name !== "h264" || stream.pix_fmt !== "yuv420p" || stream.width !== width || stream.height !== height || Math.abs(rate(stream.avg_frame_rate) - plan.fps) > 0.01 || Math.abs(Number(encoded.format.duration) - Number(source.format.duration)) > 0.1 || encoded.streams.some(stream => stream.codec_type === "audio")) throw new Error(`Invalid mobile encode: ${path}`);
    run(["-xerror", "-i", path, "-f", "null", "-"]);
    files.push({ path, publicPath, contentType: "video/mp4", bytes: (await stat(path)).size, sha256: await fileHash(path) });
    renditions.push({ width, h264: publicPath });
  }
  const report = { signature, sourceHash, recipe: ALPHA_MOBILE_RECIPE, backdrop: ALPHA_MOBILE_BACKDROP, files, renditions };
  await writeFile(`${reportPath}.tmp`, `${JSON.stringify(report, null, 2)}\n`); await rename(`${reportPath}.tmp`, reportPath);
  return report;
}
