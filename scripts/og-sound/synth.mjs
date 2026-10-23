// The og share cuts' sound effects, as one pure module with no imports: scripts/sound-og.mjs renders with it, and the
// sound lab page (scripts/og-sound/build-lab.mjs) inlines it, so what the lab plays is exactly what gets rendered.
//
// Sounds: glitch ticks, pops for the extra glyphs, the burst's whoosh, and a margin bell to finish. Each has a few
// presets and a `character` slider that morphs between neighbouring presets, plus adjustments
// on top. Volumes are in dB against a voice normalised to full scale, so morphing between presets keeps its level.

export const RATE = 48000;

/** Frequencies and times morph on a log scale, so halfway between 200 and 800 Hz is 400, not 500. */
const LOG = new Set(["pitch", "tone", "lowStart", "lowPeak", "subHz", "pitchHz", "decay", "attack", "glideMs"]);

export const PRESETS = {
  tick: [
    { name: "Dry tick", decay: 2.5, hp: 1, pitchAmt: 0, pitchHz: 3000 },
    { name: "Soft tick", decay: 4, hp: 0.35, pitchAmt: 0, pitchHz: 3000 },
    { name: "Digital blip", decay: 6, hp: 0.5, pitchAmt: 0.7, pitchHz: 2600 },
    { name: "Static", decay: 10, hp: 0.85, pitchAmt: 0, pitchHz: 3000 },
  ],
  whoosh: [
    { name: "Sub thump", lowStart: 60, lowPeak: 220, attack: 30, decay: 300, sub: 0.7, subHz: 55, air: 0 },
    { name: "Deep swell", lowStart: 120, lowPeak: 500, attack: 250, decay: 450, sub: 0.25, subHz: 48, air: 0 },
    { name: "Soft air", lowStart: 300, lowPeak: 2200, attack: 180, decay: 380, sub: 0, subHz: 48, air: 0.3 },
    { name: "Breath", lowStart: 500, lowPeak: 3500, attack: 350, decay: 600, sub: 0, subHz: 48, air: 0.6 },
    { name: "Sub swell", lowStart: 40, lowPeak: 260, attack: 400, decay: 700, sub: 0.9, subHz: 42, air: 0 },
  ],
  pop: [
    { name: "Thud", pitch: 180, ratio: 0.6, glideMs: 12, decay: 30, tone: 900, noise: 0 },
    { name: "Soft pop", pitch: 600, ratio: 0.5, glideMs: 12, decay: 18, tone: 1600, noise: 0 },
    { name: "Bubble", pitch: 350, ratio: 1.8, glideMs: 25, decay: 40, tone: 2500, noise: 0 },
    { name: "Droplet", pitch: 1200, ratio: 0.6, glideMs: 10, decay: 25, tone: 5000, noise: 0.05 },
    { name: "Tick", pitch: 2500, ratio: 1, glideMs: 10, decay: 4, tone: 8000, noise: 0.6 },
  ],
  // A typewriter's margin bell: a struck bell, its partials inharmonic like a real one, each dying away faster.
  finish: [
    { name: "Margin bell", pitch: 2350, decay: 900, strike: 0.35, bright: 0.8 },
    { name: "Soft bell", pitch: 1600, decay: 700, strike: 0.15, bright: 0.45 },
    { name: "Tiny ding", pitch: 3400, decay: 350, strike: 0.4, bright: 0.9 },
    { name: "Desk bell", pitch: 1250, decay: 1500, strike: 0.3, bright: 0.7 },
  ],
};
const BELL = [[1, 1, 1], [2.76, 0.5, 0.6], [5.4, 0.25, 0.35], [8.93, 0.12, 0.2]];

export const DEFAULTS = {
  tick: { on: true, volume: -8, character: 0, length: 1 },
  pop: { on: true, volume: -15, character: 1, pitch: -6, length: 1.7, density: 8 },
  whoosh: { on: true, volume: -18, character: 1, length: 1.6, depth: -7, bass: 1.8, softness: 1.6, start: -100 },
  finish: { on: true, volume: -22, character: 0, pitch: 0, length: 1, delay: 160 },
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
    const f0 = p.pitch * Math.pow(2, s.pitch / 12), decay = p.decay * s.length / 1000;
    const out = new Float32Array(Math.ceil(Math.min(4, decay * 5) * RATE)), click = lowpass();
    for (let i = 0; i < out.length; i++) {
      const t = i / RATE;
      let ring = 0;
      for (const [ratio, amount, life] of BELL) ring += Math.sin(2 * Math.PI * f0 * ratio * t) * amount * (ratio === 1 ? 1 : p.bright) * Math.exp(-t / (decay * life));
      out[i] = ring * Math.min(1, t / 0.0005) + click(noise(), 6000) * Math.exp(-t / 0.001) * p.strike * 4;
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
 * `density` a second, firmer knocks louder), and one played backwards as each extra glyph vanishes. The whoosh starts
 * `start` ms from the first letter popping out of the text, and the margin bell rings `delay` ms after the last tick.
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
  const whooshAt = firstRelease + settings.whoosh.start / 1000, placed = [];
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

/** A small Schroeder room, fed the loop twice so the tail of the end wraps into the start. */
function room(input, delays, length) {
  const twice = new Float32Array(length * 2); twice.set(input); twice.set(input, length);
  const out = new Float32Array(twice.length);
  for (const [delay, feedback] of delays) {
    const buffer = new Float32Array(delay);
    for (let i = 0, at = 0; i < twice.length; i++, at = (at + 1) % delay) {
      const echo = buffer[at]; buffer[at] = twice[i] + echo * feedback; out[i] += echo / delays.length;
    }
  }
  for (const delay of [347, 113]) {
    const buffer = new Float32Array(delay);
    for (let i = 0, at = 0; i < out.length; i++, at = (at + 1) % delay) {
      const echo = buffer[at], value = out[i]; buffer[at] = value + echo * 0.5; out[i] = echo - value * 0.5;
    }
  }
  return out.subarray(length);
}

/** The whole loop's sound: [left, right] at RATE. Seeded, so the same events and settings give the same audio. */
export function mix(events, seconds, settings) {
  const length = Math.ceil(seconds * RATE), left = new Float32Array(length), right = new Float32Array(length);
  const random = seeded(11), scales = {};
  for (const sound of Object.keys(PRESETS)) scales[sound] = db(settings[sound].volume) * db(settings.master.volume) / reference(sound, settings);
  for (const event of plan(events, settings)) {
    const buffer = voice(event.sound, settings, random, event.reverse), gain = scales[event.sound] * event.level;
    // Equal-power pan from the event's place across the card, kept off the hard edges.
    const pan = (Math.min(1, Math.max(0, event.x)) - 0.5) * 1.4, angle = (pan + 1) * Math.PI / 4;
    const start = Math.round(event.time * RATE), l = Math.cos(angle) * gain, r = Math.sin(angle) * gain;
    for (let i = 0; i < buffer.length; i++) {
      const at = (start + i) % length;
      left[at] += buffer[i] * l; right[at] += buffer[i] * r;
    }
  }
  if (settings.master.room > 0) {
    const wetLeft = room(left, [[1557, 0.78], [1617, 0.77], [1491, 0.79], [1422, 0.8]], length);
    const wetRight = room(right, [[1580, 0.78], [1640, 0.77], [1514, 0.79], [1445, 0.8]], length);
    for (let i = 0; i < length; i++) { left[i] += wetLeft[i] * settings.master.room; right[i] += wetRight[i] * settings.master.room; }
  }
  // tanh is transparent at these levels and only rounds off a peak that would clip.
  for (const channel of [left, right]) for (let i = 0; i < length; i++) channel[i] = Math.tanh(channel[i]);
  return [left, right];
}
