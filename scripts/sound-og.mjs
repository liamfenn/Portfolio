// Scores the og share cuts with sound effects, no music: every sound is synthesised here and placed on the frame
// where its event happens, panned to where it happens. Events come from scripts/capture-og.mjs (events.json in each
// frames folder), so rerun that first after changing the animation. Seeded, so a rerun gives the same audio.
//
//   node scripts/sound-og.mjs
// Writes out/share/office-of-liam-fennell-{og,9x16}-sound.mp4 (and the .wav beside each).
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const RATE = 48000;
const FPS = 60;
const CUTS = [["og", "out/og-frames-1200x630@2x"], ["9x16", "out/og-frames-675x1200@1.6x"]];
/** Busy moments thin out: at most one of each sound per this many seconds, keeping the strongest. */
const SPACING = { flick: 0.05, hit: 0.08, pump: 0.03, pop: 0.03 };
/** Glancing contacts stay silent; only real knocks make a sound. */
const HIT_THRESHOLD = 4.5;
/** Integrated loudness: understated, well under social platforms' normalisation targets, with headroom on the peaks. */
const LOUDNESS = "I=-20:TP=-1.5:LRA=11";

let seed = 11;
const random = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const noise = () => random() * 2 - 1;
/** A gentle two-pole low-pass, which is most of what makes these sounds muffled and close rather than bright. */
const lowpass = cutoff => {
  const k = 1 - Math.exp(-2 * Math.PI * cutoff / RATE);
  let a = 0, b = 0;
  return value => { a += (value - a) * k; b += (a - b) * k; return b; };
};
/** A sine whose pitch can move while it plays, keeping its phase continuous. */
const oscillator = () => {
  let phase = 0, previous = 0;
  return (frequency, t) => { phase += 2 * Math.PI * frequency * (t - previous); previous = t; return Math.sin(phase); };
};

/**
 * A voice is a function of time since its start, in seconds, and lasts `length` seconds. Only these events make a
 * sound: the letters leaving their text and coming home are silent.
 */
const voices = {
  // A glitch flicker: a dry digital tick, high and very short.
  flick: () => {
    let last = 0;
    return { length: 0.012, gain: 0.022, at: t => { const n = noise(), hp = n - last; last = n; return hp * Math.exp(-t / 0.0025); } };
  },
  // The burst: one deep, soft whoosh, a low rumble of noise that opens a little and closes again, over a faint sub.
  kick: () => {
    const sub = oscillator();
    let low = 0;
    return { length: 1.6, gain: 0.32, at: t => {
      const open = Math.min(1, t / 0.25), cutoff = 140 + 520 * open * Math.exp(-Math.max(0, t - 0.25) / 0.5);
      low += (noise() - low) * (1 - Math.exp(-2 * Math.PI * cutoff / RATE));
      const swell = (1 - Math.exp(-t / 0.09)) * Math.exp(-t / 0.45);
      return (low * 1.6 + sub(48 - 10 * open, t) * 0.25) * swell;
    } };
  },
  // A knock between pieces: a low, rubbery pluck with a quick drop into its note, a soft keyboard tick on its front,
  // all muffled, like a key press heard underwater. Harder knocks are a little louder and deeper, never sharper.
  hit: strength => {
    const hard = Math.min(1, strength / 12), note = 260 - 90 * hard + random() * 70, body = oscillator(), muffle = lowpass(1300), tick = lowpass(2400);
    return { length: 0.14, gain: 0.05 + 0.07 * hard, at: t => {
      const pitch = note * (1 + 0.9 * Math.exp(-t / 0.006));
      const pluck = body(pitch, t) * Math.min(1, t / 0.0012) * Math.exp(-t / 0.045);
      return muffle(pluck + tick(noise()) * Math.exp(-t / 0.002) * 0.6);
    } };
  },
  // An extra glyph splitting off, or popping away: a very quiet, soft pop.
  pump: () => softPop(),
  pop: () => softPop(),
};
function softPop() {
  const from = 520 + random() * 160, body = oscillator(), muffle = lowpass(1600);
  return { length: 0.06, gain: 0.03, at: t => muffle(body(from * (0.5 + 0.5 * Math.exp(-t / 0.012)), t) * Math.min(1, t / 0.001) * Math.exp(-t / 0.018)) };
}

/** Drops events of a type that crowd in on a stronger one, so dense moments read as texture rather than noise. */
function thin(events) {
  const kept = [], last = {};
  for (const event of [...events].sort((a, b) => a.time - b.time)) {
    if (!voices[event.type] || (event.type === "hit" && event.strength < HIT_THRESHOLD)) continue;
    // The burst is one whoosh, at the first letter's kick.
    if (event.type === "kick" && last.kick) continue;
    const gap = SPACING[event.type] ?? 0, previous = last[event.type];
    if (previous && event.time - previous.time < gap) {
      if ((event.strength ?? 0) > (previous.strength ?? 0)) { kept[kept.indexOf(previous)] = event; last[event.type] = event; }
      continue;
    }
    kept.push(event); last[event.type] = event;
  }
  return kept;
}

/** A small Schroeder room, so the dry synth sits in a space rather than in your ears. */
function room(input, delays) {
  const out = new Float32Array(input.length);
  for (const [delay, feedback] of delays) {
    const buffer = new Float32Array(delay);
    for (let i = 0, at = 0; i < input.length; i++, at = (at + 1) % delay) {
      const echo = buffer[at]; buffer[at] = input[i] + echo * feedback; out[i] += echo / delays.length;
    }
  }
  for (const delay of [347, 113]) {
    const buffer = new Float32Array(delay);
    for (let i = 0, at = 0; i < out.length; i++, at = (at + 1) % delay) {
      const echo = buffer[at], value = out[i]; buffer[at] = value + echo * 0.5; out[i] = echo - value * 0.5;
    }
  }
  return out;
}

function score(events, seconds) {
  const length = Math.ceil(seconds * RATE), left = new Float32Array(length), right = new Float32Array(length);
  for (const event of thin(events)) {
    const voice = voices[event.type](event.strength ?? 0);
    // Equal-power pan from the event's place across the card, kept off the hard edges.
    const pan = (Math.min(1, Math.max(0, event.x)) - 0.5) * 1.4, angle = (pan + 1) * Math.PI / 4;
    const start = Math.round(event.time * RATE), count = Math.round(voice.length * RATE);
    for (let i = 0; i < count && start + i < length; i++) {
      const value = voice.at(i / RATE) * voice.gain;
      left[start + i] += value * Math.cos(angle); right[start + i] += value * Math.sin(angle);
    }
  }
  // The loop's end runs into its start, so the room hears it twice and keeps the second pass: the tail of the last
  // landings wraps into the opening instead of being cut off at the seam.
  const looped = channel => { const twice = new Float32Array(length * 2); twice.set(channel); twice.set(channel, length); return twice; };
  const wetLeft = room(looped(left), [[1557, 0.78], [1617, 0.77], [1491, 0.79], [1422, 0.8]]).subarray(length);
  const wetRight = room(looped(right), [[1580, 0.78], [1640, 0.77], [1514, 0.79], [1445, 0.8]]).subarray(length);
  for (const [dry, wet] of [[left, wetLeft], [right, wetRight]]) for (let i = 0; i < length; i++) dry[i] += wet[i] * 0.18;
  let peak = 0;
  for (const channel of [left, right]) for (const value of channel) peak = Math.max(peak, Math.abs(value));
  const scale = 0.89 / Math.max(peak, 1e-6);
  return [left, right].map(channel => channel.map(value => value * scale));
}

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
  const base = `out/share/office-of-liam-fennell-${name}`;
  wav(`${base}-sound.wav`, score(events, seconds));
  // Two-pass loudness: measure, then apply one linear gain, so the mix keeps its dynamics rather than being pumped.
  const report = spawnSync("ffmpeg", ["-hide_banner", "-i", `${base}-sound.wav`, "-af", `loudnorm=${LOUDNESS}:print_format=json`, "-f", "null", "-"],
    { encoding: "utf8" }).stderr;
  const measured = JSON.parse(report.match(/\{[^{}]*"input_i"[^{}]*\}/)[0]);
  const loudnorm = `loudnorm=${LOUDNESS}:linear=true:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}` +
    `:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}`;
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", `${base}.mp4`, "-i", `${base}-sound.wav`, "-map", "0:v", "-map", "1:a",
    "-c:v", "copy", "-af", `${loudnorm},aresample=${RATE}`, "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", `${base}-sound.mp4`]);
  const counts = Object.entries(events.reduce((all, event) => ({ ...all, [event.type]: (all[event.type] ?? 0) + 1 }), {}));
  console.log(`${base}-sound.mp4: ${seconds.toFixed(2)}s, ${counts.map(([type, count]) => `${count} ${type}`).join(", ")}`);
}
