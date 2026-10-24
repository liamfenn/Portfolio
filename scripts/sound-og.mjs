// Scores the 16:9 and 9:16 social share cuts with sound effects, no music. The sounds and the rules for when they play live in
// scripts/og-sound/synth.mjs, shared with the sound lab, and the chosen settings in scripts/og-sound/settings.json
// (pasted from the lab's Copy settings). Events come from scripts/capture-og.mjs (events.json in each frames folder),
// so rerun that first after changing the animation. Seeded, so a rerun gives the same audio.
//
//   node scripts/sound-og.mjs [--reel]
// --reel scores the work reel's cuts (office-of-liam-fennell-reel-*) with the glitch ticks only, for now. Pass the
// same version flags as the capture (--burst, --glitch-return, --rows, --video) to score those cuts.
// Writes out/share/office-of-liam-fennell-{16x9,9x16}-sound.mp4 (and the .wav beside each). The audio runs on past the
// loop until the last sound has died away, and the video holds its last frame (the plain name) for that tail.
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { DEFAULTS, RATE, mix } from "./og-sound/synth.mjs";

const FPS = 60;
const REEL = process.argv.includes("--reel");
// The same suffixes, in the same order, as the capture's variant flags.
const SUFFIX = [["--burst", "-burst"], ["--glitch-return", "-glitch-return"], ["--rows", "-rows"], ["--video", "-video"]]
  .filter(([flag]) => process.argv.includes(flag)).map(([, suffix]) => suffix).join("");
const FRAMES = (REEL ? "out/og-reel-frames" : "out/og-frames") + SUFFIX, NAME = REEL ? "office-of-liam-fennell-reel" : "office-of-liam-fennell";
const CUTS = [["16x9", `${FRAMES}-1200x675@1.6x`], ["9x16", `${FRAMES}-675x1200@1.6x`]];
const saved = JSON.parse(readFileSync(new URL("./og-sound/settings.json", import.meta.url), "utf8"));
const SETTINGS = Object.fromEntries(Object.entries(DEFAULTS).map(([sound, values]) => [sound, { ...values, ...saved[sound] }]));
if (REEL) { SETTINGS.pop.on = false; SETTINGS.finish.on = false; }

function wav(path, [left, right]) {
  const data = Buffer.alloc(left.length * 4);
  for (let i = 0; i < left.length; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i])) * 32767), i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i])) * 32767), i * 4 + 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + data.length, 4); header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22); header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 4, 28); header.writeUInt16LE(4, 32); header.writeUInt16LE(16, 34);
  header.write("data", 36); header.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([header, data]));
}

for (const [name, frames] of CUTS) {
  const events = JSON.parse(readFileSync(`${frames}/events.json`, "utf8"));
  const seconds = readdirSync(frames).filter(file => file.endsWith(".png")).length / FPS;
  const base = `out/share/${NAME}-${name}${SUFFIX}`;
  // No loudness normalisation: the levels are the ones chosen by ear in the lab.
  const audio = mix(events, seconds, SETTINGS), tail = audio[0].length / RATE - seconds;
  wav(`${base}-sound.wav`, audio);
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", `${base}.mp4`, "-i", `${base}-sound.wav`,
    "-filter_complex", `[0:v]tpad=stop_mode=clone:stop_duration=${tail.toFixed(3)}[v]`, "-map", "[v]", "-map", "1:a",
    "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", `${base}-sound.mp4`]);
  const report = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", `${base}-sound.wav`, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const loudness = report.slice(report.lastIndexOf("Summary")).match(/I:\s+(-?[\d.]+) LUFS[\s\S]*?Peak:\s+(-?[\d.inf]+) dBFS/);
  console.log(`${base}-sound.mp4: ${seconds.toFixed(2)}s + ${tail.toFixed(2)}s tail, ${loudness?.[1]} LUFS, peak ${loudness?.[2]} dBFS`);
}
