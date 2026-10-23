// The og share cuts' sound effects, as one pure module with no imports: scripts/sound-og.mjs renders with it, and the
// sound lab page (scripts/og-sound/build-lab.mjs) inlines it, so what the lab plays is exactly what gets rendered.
//
// Sounds: glitch ticks, pops for the extra glyphs, the burst's whoosh, and a soft pluck to finish. Each has a few presets and a `character` slider that morphs between neighbouring presets,
// plus adjustments on top. Volumes are in dB against a voice normalised to full scale, so morphing between presets keeps its level.

export const RATE = 48000;

/** Frequencies and times morph on a log scale, so halfway between 200 and 800 Hz is 400, not 500. */
const LOG = new Set(["pitch", "tone", "lowStart", "lowPeak", "subHz", "pitchHz", "decay", "attack", "glideMs"]);
/** The audio runs on past the loop's last frame until every sound, and the room after it, has died away. */
const TAIL_PAD = 0.6;

export const PRESETS = {
  tick: [
    { name: "Dry tick", decay: 2.5, hp: 1, pitchAmt: 0, pitchHz: 3000 },
    { name: "Soft tick", decay: 4, hp: 0.35, pitchAmt: 0, pitchHz: 3000 },
    { name: "Digital blip", decay: 6, hp: 0.5, pitchAmt: 0.7, pitchHz: 2600 },
    { name: "Static", decay: 10, hp: 0.85, pitchAmt: 0, pitchHz: 3000 },
  ],
  whoosh: [
    // All low and short, with no air: a mellow push as the letters fly apart rather than a gust of wind.
    { name: "Low puff", lowStart: 60, lowPeak: 240, attack: 110, decay: 220, sub: 0.5, subHz: 46, air: 0 },
    { name: "Soft thud", lowStart: 50, lowPeak: 160, attack: 40, decay: 260, sub: 0.8, subHz: 52, air: 0 },
    { name: "Muted swell", lowStart: 80, lowPeak: 380, attack: 180, decay: 300, sub: 0.35, subHz: 44, air: 0 },
    { name: "Felt drum", lowStart: 70, lowPeak: 200, attack: 15, decay: 180, sub: 0.9, subHz: 60, air: 0 },
  ],
  pop: [
    { name: "Thud", pitch: 180, ratio: 0.6, glideMs: 12, decay: 30, tone: 900, noise: 0 },
    { name: "Soft pop", pitch: 600, ratio: 0.5, glideMs: 12, decay: 18, tone: 1600, noise: 0 },
    { name: "Bubble", pitch: 350, ratio: 1.8, glideMs: 25, decay: 40, tone: 2500, noise: 0 },
    { name: "Droplet", pitch: 1200, ratio: 0.6, glideMs: 10, decay: 25, tone: 5000, noise: 0.05 },
    { name: "Tick", pitch: 2500, ratio: 1, glideMs: 10, decay: 4, tone: 8000, noise: 0.6 },
  ],
  // The finish: a soft plucked string, muffled, with a little click where it is plucked. No bell tone.
  finish: [
    { name: "Soft pluck", pitch: 220, decay: 120, tone: 1800, click: 0.2 },
    { name: "Felt pluck", pitch: 160, decay: 90, tone: 1100, click: 0.1 },
    { name: "Wood pluck", pitch: 330, decay: 70, tone: 3000, click: 0.35 },
    { name: "Low pluck", pitch: 110, decay: 160, tone: 900, click: 0.15 },
  ],
};

export const DEFAULTS = {
  tick: { on: true, volume: -8, character: 0, length: 1 },
  pop: { on: true, volume: -15, character: 1, pitch: -6, length: 1.7, density: 8 },
  whoosh: { on: true, volume: -20, character: 0, length: 1, depth: 0, bass: 1, softness: 1, start: -10 },
  finish: { on: true, volume: -24, character: 0, pitch: 0, length: 1, delay: 220, brightness: 1, click: 1 },
  master: { volume: 0, room: 0.15, overlap: 2, duck: 0.5 },
};

/** A preset blend: `character` 1.4 is 60% preset 1 and 40% preset 2. */
export function blend(sound, character) {
  const list = PRESETS[sound], at = Math.max(0, Math.min(list.length - 1, character));
  const low = Math.floor(at), high = Math.min(list.length - 1, low + 1), mix = at - low, a = list[low], b = list[high];
  const params = {};
  for (const key of Object.keys(a)) {
    if (key === "name") continue;
    params[key] = LOG.has(key) && a[key] > 0 && b[key] > 0 ? a[key] * Math.pow(b[key] / a[key], mix) : a[key] + (b[key] - a[key]) * mix;
  }
  return params;
}
/** Which presets a character sits between, for the lab's readout. */
export function blendName(sound, character) {
  const list = PRESETS[sound], at = Math.max(0, Math.min(list.length - 1, character)), low = Math.floor(at), mix = at - low;
  return mix < 0.05 || low === list.length - 1 ? list[low].name : mix > 0.95 ? list[low + 1].name
    : `${list[low].name} ${Math.round((1 - mix) * 100)}% · ${list[low + 1].name} ${Math.round(mix * 100)}%`;
}

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** A two-pole low-pass whose cutoff can move per sample. */
function lowpass() {
  let a = 0, b = 0;
  return (value, cutoff) => { const k = 1 - Math.exp(-2 * Math.PI * Math.min(cutoff, RATE * 0.45) / RATE); a += (value - a) * k; b += (a - b) * k; return b; };
}
const db = value => Math.pow(10, value / 20);

/** Renders one sound as a mono buffer. `reverse` plays a pop backwards, so it swells in and is sucked away. */
function voice(sound, settings, random, reverse = false) {
  const s = settings[sound], p = blend(sound, s.character), noise = () => random() * 2 - 1;
  if (sound === "tick") {
    const decay = p.decay * s.length / 1000, out = new Float32Array(Math.ceil(decay * 6 * RATE)), smooth = lowpass();
    let last = 0;
    for (let i = 0; i < out.length; i++) {
      const t = i / RATE, n = noise(), high = n - last; last = n;
      const grain = high * p.hp + smooth(n, 3500) * 2 * (1 - p.hp);
      out[i] = (grain + Math.sin(2 * Math.PI * p.pitchHz * t) * p.pitchAmt) * Math.exp(-t / decay);
    }
    return out;
  }
  if (sound === "whoosh") {
    // Bass adds sub and, an octave up, its second harmonic, which phone speakers can actually play.
    const attack = p.attack * s.softness / 1000, decay = p.decay * s.length / 1000, shift = Math.pow(2, s.depth / 12), sub = Math.max(p.sub, 0.25) * s.bass;
    const out = new Float32Array(Math.ceil((attack + decay * 4) * RATE)), low = lowpass(), air = lowpass();
    let phase = 0;
    for (let i = 0; i < out.length; i++) {
      const t = i / RATE, rise = Math.min(1, t / attack), fall = t < attack ? 1 : Math.exp(-(t - attack) / decay);
      const cutoff = (p.lowStart + (p.lowPeak - p.lowStart) * rise * fall) * shift;
      const swell = (t < attack ? rise * rise * (3 - 2 * rise) : 1) * fall;
      phase += 2 * Math.PI * p.subHz * shift * (1 - 0.2 * rise) / RATE;
      out[i] = (low(noise(), cutoff) * 2.5 + air(noise(), cutoff * 4) * p.air + (Math.sin(phase) + 0.35 * Math.sin(phase * 2)) * sub) * swell;
    }
    return out;
  }
  if (sound === "finish") {
    // Karplus–Strong: a burst of soft noise circulating in a delay line one period long, averaged and damped each
    // pass, which is what makes it a plucked string rather than a tone. Brightness opens the burst and the output.
    const f0 = p.pitch * Math.pow(2, s.pitch / 12), decay = p.decay * s.length / 1000, period = Math.max(2, Math.round(RATE / f0));
    const loss = Math.exp(-period / (RATE * decay)), out = new Float32Array(Math.ceil(decay * 7 * RATE)), line = new Float32Array(period);
    const burst = lowpass(), tone = lowpass(), click = lowpass();
    for (let i = 0; i < period; i++) line[i] = burst(noise(), p.tone * s.brightness);
    for (let i = 0, at = 0, previous = 0; i < out.length; i++, at = (at + 1) % period) {
      const value = line[at], next = (value + previous) * 0.5 * loss;
      previous = value; line[at] = next;
      out[i] = tone(value, p.tone * s.brightness * 1.5) + click(noise(), 4000) * Math.exp(-i / RATE / 0.0012) * p.click * s.click * 2;
    }
    return out;
  }
  // pop
  const f0 = p.pitch * Math.pow(2, s.pitch / 12) * (1 + (random() - 0.5) * 0.2), decay = p.decay * s.length / 1000, glide = p.glideMs / 1000;
  const out = new Float32Array(Math.ceil(decay * 6 * RATE)), tone = lowpass();
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE, f = f0 * (p.ratio + (1 - p.ratio) * Math.exp(-t / glide));
    phase += 2 * Math.PI * f / RATE;
    out[i] = tone(Math.sin(phase) * Math.min(1, t / 0.001) * Math.exp(-t / decay) + noise() * p.noise * Math.exp(-t / 0.002), p.tone);
  }
  return reverse ? out.reverse() : out;
}

/** Each sound's loudest version under these settings, so volume means the same thing whichever preset is chosen. */
function reference(sound, settings) {
  const buffer = voice(sound, settings, seeded(1));
  let peak = 0;
  for (const value of buffer) peak = Math.max(peak, Math.abs(value));
  return peak || 1;
}

/** One sound on its own, for auditioning: [left, right]. */
export function single(sound, settings, reverse = false) {
  const scale = db(settings[sound].volume) * db(settings.master.volume) / reference(sound, settings);
  const mono = voice(sound, settings, seeded(Math.floor(Math.random() * 1e9)), reverse).map(value => Math.tanh(value * scale));
  return [mono, mono];
}

const SOUND_OF = { flick: "tick", hit: "pop", pump: "pop", pop: "pop" };
const CROWD = 0.08;

/**
 * Which events make a sound, and at what level. Glitch ticks come only from the opening and closing glitches. Pops
 * run the whole time glyphs bounce: one as each extra glyph splits off, one for knocks between pieces (at most
 * `density` a second, firmer knocks louder), and one played backwards as each extra glyph vanishes. The whoosh begins
 * `start` ms from the first kick, the moment the letters fly apart, and the finishing pluck sounds `delay` ms after the
 * last tick.
 * Then at most `overlap` sounds start within 80ms, those after the first at half level, and pops under the whoosh's
 * first half-second are ducked by `duck`.
 */
export function plan(events, settings) {
  const sorted = [...events].sort((a, b) => a.time - b.time);
  const firstRelease = sorted.find(event => event.type === "release")?.time ?? Infinity;
  const lastLand = [...sorted].reverse().find(event => event.type === "land")?.time ?? -Infinity;
  const spacing = { flick: 0.05, hit: 1 / Math.max(1, settings.pop.density), pump: 0.03, pop: 0.03 };
  const kept = [], last = {};
  for (const event of sorted) {
    const sound = SOUND_OF[event.type];
    if (!sound || !settings[sound].on || (event.type === "hit" && event.strength < 3)) continue;
    if (event.type === "flick" && event.time > firstRelease && event.time < lastLand) continue;
    const previous = last[event.type];
    if (previous && event.time - previous.time < spacing[event.type]) {
      if ((event.strength ?? 0) > (previous.strength ?? 0)) { kept[kept.indexOf(previous)] = event; last[event.type] = event; }
      continue;
    }
    kept.push(event); last[event.type] = event;
  }
  const firstKick = sorted.find(event => event.type === "kick")?.time ?? Infinity;
  const whooshAt = firstKick + settings.whoosh.start / 1000, placed = [];
  for (const event of kept) {
    const crowd = placed.filter(other => event.time - other.time < CROWD).length;
    if (crowd >= settings.master.overlap) continue;
    const under = event.type !== "flick" && event.time >= whooshAt && event.time - whooshAt < 0.5 && settings.whoosh.on ? 1 - settings.master.duck : 1;
    const firm = event.type === "hit" ? 0.55 + 0.45 * Math.min(1, event.strength / 12) : 1;
    placed.push({ ...event, sound: SOUND_OF[event.type], reverse: event.type === "pop", level: (crowd ? 0.5 : 1) * under * firm });
  }
  if (settings.whoosh.on && Number.isFinite(whooshAt)) placed.push({ type: "whoosh", sound: "whoosh", time: Math.max(0, whooshAt), x: 0.5, level: 1 });
  const lastTick = [...placed].reverse().find(event => event.sound === "tick");
  if (settings.finish.on && lastTick) placed.push({ type: "finish", sound: "finish", time: lastTick.time + settings.finish.delay / 1000, x: 0.5, level: 1 });
  return placed.sort((a, b) => a.time - b.time);
}

/** A small Schroeder room. */
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

/**
 * The loop's sound: [left, right] at RATE. Seeded, so the same events and settings give the same audio. Nothing wraps
 * into the start; instead the audio runs past the loop's `seconds` until the last sound and the room have died away,
 * and the video holds its last frame for that tail.
 */
export function mix(events, seconds, settings) {
  const random = seeded(11), scales = {};
  for (const sound of Object.keys(PRESETS)) scales[sound] = db(settings[sound].volume) * db(settings.master.volume) / reference(sound, settings);
  const voices = plan(events, settings).map(event => ({ event, buffer: voice(event.sound, settings, random, event.reverse) }));
  const end = voices.reduce((latest, { event, buffer }) => Math.max(latest, event.time + buffer.length / RATE), 0);
  const length = Math.ceil(Math.max(seconds, end + TAIL_PAD) * RATE), left = new Float32Array(length), right = new Float32Array(length);
  for (const { event, buffer } of voices) {
    const gain = scales[event.sound] * event.level;
    // Equal-power pan from the event's place across the card, kept off the hard edges.
    const pan = (Math.min(1, Math.max(0, event.x)) - 0.5) * 1.4, angle = (pan + 1) * Math.PI / 4;
    const start = Math.round(event.time * RATE), l = Math.cos(angle) * gain, r = Math.sin(angle) * gain;
    for (let i = 0; i < buffer.length && start + i < length; i++) { left[start + i] += buffer[i] * l; right[start + i] += buffer[i] * r; }
  }
  if (settings.master.room > 0) {
    const wetLeft = room(left, [[1557, 0.78], [1617, 0.77], [1491, 0.79], [1422, 0.8]]);
    const wetRight = room(right, [[1580, 0.78], [1640, 0.77], [1514, 0.79], [1445, 0.8]]);
    for (let i = 0; i < length; i++) { left[i] += wetLeft[i] * settings.master.room; right[i] += wetRight[i] * settings.master.room; }
  }
  // tanh is transparent at these levels and only rounds off a peak that would clip.
  for (const channel of [left, right]) for (let i = 0; i < length; i++) channel[i] = Math.tanh(channel[i]);
  return [left, right];
}
