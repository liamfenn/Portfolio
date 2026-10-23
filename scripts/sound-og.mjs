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
/** Landings are tuned by where they land, left to right across a pentatonic octave and a half from A4, so the
 * reading-order landing rises as it reads. */
const LAND_SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19];
/** Busy moments thin out: at most one of each sound per this many seconds, keeping the strongest. */
const SPACING = { flick: 0.05, hit: 0.06, pump: 0.02, pop: 0.015, release: 0.012, kick: 0.01, return: 0.01, land: 0 };
/** Glancing contacts stay silent; only real knocks make a sound. */
const HIT_THRESHOLD = 3.5;
/** Integrated loudness: delicate, under social platforms' normalisation targets, with headroom on the peaks. */
const LOUDNESS = "I=-18:TP=-1.5:LRA=11";

let seed = 11;
const random = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const noise = () => random() * 2 - 1;

/** A voice is a function of time since its start, in seconds, and lasts `length` seconds. */
const voices = {
  // A glitch flicker: a dry digital tick, high and very short.
  flick: () => {
    let last = 0;
    return { length: 0.012, gain: 0.022, at: t => { const n = noise(), hp = n - last; last = n; return hp * Math.exp(-t / 0.0025); } };
  },
  // A letter popping out of the text: a soft blip that drops in pitch.
  release: () => {
    const from = 820 + random() * 220, to = from * 0.55;
    return { length: 0.12, gain: 0.14, at: t => {
      const f = to + (from - to) * Math.exp(-t / 0.025);
      return Math.sin(2 * Math.PI * f * t) * Math.min(1, t / 0.002) * Math.exp(-t / 0.04);
    } };
  },
  // The kick loose: an airy swell of filtered noise that opens up as it goes.
  kick: strength => {
    let low = 0;
    return { length: 0.45, gain: 0.05 * Math.min(1.4, strength / 10), at: t => {
      const cutoff = 600 + 5000 * Math.min(1, t / 0.18), k = 1 - Math.exp(-2 * Math.PI * cutoff / RATE);
      low += (noise() - low) * k;
      return low * Math.min(1, t / 0.03) * Math.exp(-Math.max(0, t - 0.03) / 0.12);
    } };
  },
  // A collision: a small glassy tap, two inharmonic partials, harder hits brighter and louder.
  hit: strength => {
    const f = 1500 + random() * 900 + strength * 40;
    return { length: 0.15, gain: 0.015 + 0.04 * Math.min(1, strength / 12), at: t =>
      (Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.035) + 0.4 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t / 0.015)) * Math.min(1, t / 0.0008) };
  },
  // A pump: a bubbly bloop that rises as the new glyph splits off.
  pump: () => {
    const from = 280 + random() * 80, to = from * (3 + random());
    let phase = 0, previous = 0;
    return { length: 0.14, gain: 0.09, at: t => {
      const f = from * Math.pow(to / from, Math.min(1, t / 0.07));
      phase += 2 * Math.PI * f * (t - previous); previous = t;
      return Math.sin(phase) * Math.min(1, t / 0.003) * Math.exp(-t / 0.05);
    } };
  },
  // A pumped glyph popping: a crisp click of noise with a short falling ping.
  pop: () => {
    const f = 1900 + random() * 500;
    return { length: 0.08, gain: 0.08, at: t => noise() * Math.exp(-t / 0.0035) * 0.7 + Math.sin(2 * Math.PI * f * (1 - t * 4) * t) * Math.exp(-t / 0.02) };
  },
  // A letter turning for home: the kick's swell in reverse, rising in and closing off as it leaves its float.
  return: () => {
    let low = 0;
    return { length: 0.32, gain: 0.035, at: t => {
      const rise = t / 0.32, cutoff = 400 + 3000 * rise, k = 1 - Math.exp(-2 * Math.PI * cutoff / RATE);
      low += (noise() - low) * k;
      return low * Math.pow(rise, 2) * Math.min(1, (0.32 - t) / 0.02);
    } };
  },
  // A letter landing home: a soft marimba-like tap, tuned by where it lands.
  land: x => {
    const step = LAND_SCALE[Math.min(LAND_SCALE.length - 1, Math.floor(Math.max(0, x) * LAND_SCALE.length))], f = 440 * Math.pow(2, step / 12);
    return { length: 0.5, gain: 0.08, at: t =>
      (Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.16) + 0.25 * Math.sin(2 * Math.PI * f * 4 * t) * Math.exp(-t / 0.03)) * Math.min(1, t / 0.002) };
  },
};

/** Drops events of a type that crowd in on a stronger one, so dense moments read as texture rather than noise. */
function thin(events) {
  const kept = [], last = {};
  for (const event of [...events].sort((a, b) => a.time - b.time)) {
    if (event.type === "hit" && event.strength < HIT_THRESHOLD) continue;
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
    const voice = voices[event.type](event.type === "land" ? event.x : event.strength ?? 0);
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
