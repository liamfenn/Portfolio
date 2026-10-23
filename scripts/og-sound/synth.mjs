// The og share cuts' sound effects, as one pure module with no imports: scripts/sound-og.mjs renders with it, and the
// sound lab page (scripts/og-sound/build-lab.mjs) inlines it, so what the lab plays is exactly what gets rendered.
//
// Each sound has a few presets and a `character` slider that morphs between neighbouring presets, plus adjustments
// on top. Volumes are in dB against a voice normalised to full scale, so morphing between presets keeps its level.

export const RATE = 48000;

/** Frequencies and times morph on a log scale, so halfway between 200 and 800 Hz is 400, not 500. */
const LOG = new Set(["pitch", "tone", "tickTone", "lowStart", "lowPeak", "subHz", "pitchHz", "decay", "dropMs", "attack", "glideMs", "wobbleHz"]);

export const PRESETS = {
  tick: [
    { name: "Dry tick", decay: 2.5, hp: 1, pitchAmt: 0, pitchHz: 3000 },
    { name: "Soft tick", decay: 4, hp: 0.35, pitchAmt: 0, pitchHz: 3000 },
    { name: "Digital blip", decay: 6, hp: 0.5, pitchAmt: 0.7, pitchHz: 2600 },
    { name: "Static", decay: 10, hp: 0.85, pitchAmt: 0, pitchHz: 3000 },
  ],
  knock: [
    { name: "Wood block", pitch: 700, drop: 1.1, dropMs: 3, decay: 22, tick: 0.4, tickTone: 6000, tone: 6500, partial: 2.76, partialAmt: 0.35, wobble: 0, wobbleHz: 14 },
    { name: "Soft key", pitch: 520, drop: 1.15, dropMs: 4, decay: 28, tick: 0.55, tickTone: 4500, tone: 4500, partial: 2, partialAmt: 0.1, wobble: 0, wobbleHz: 14 },
    { name: "Springy", pitch: 300, drop: 1.4, dropMs: 6, decay: 90, tick: 0.3, tickTone: 3500, tone: 3200, partial: 2.5, partialAmt: 0.1, wobble: 0.5, wobbleHz: 18 },
    { name: "Rubber pluck", pitch: 230, drop: 1.8, dropMs: 9, decay: 65, tick: 0.25, tickTone: 2500, tone: 2600, partial: 2, partialAmt: 0.15, wobble: 0.15, wobbleHz: 14 },
    { name: "Deep thock", pitch: 200, drop: 1.9, dropMs: 6, decay: 45, tick: 0.6, tickTone: 2400, tone: 1300, partial: 2, partialAmt: 0, wobble: 0, wobbleHz: 14 },
  ],
  whoosh: [
    { name: "Sub thump", lowStart: 60, lowPeak: 220, attack: 30, decay: 300, sub: 0.7, subHz: 55, air: 0 },
    { name: "Deep swell", lowStart: 120, lowPeak: 500, attack: 250, decay: 450, sub: 0.25, subHz: 48, air: 0 },
    { name: "Soft air", lowStart: 300, lowPeak: 2200, attack: 180, decay: 380, sub: 0, subHz: 48, air: 0.3 },
    { name: "Breath", lowStart: 500, lowPeak: 3500, attack: 350, decay: 600, sub: 0, subHz: 48, air: 0.6 },
  ],
  pop: [
    { name: "Thud", pitch: 180, ratio: 0.6, glideMs: 12, decay: 30, tone: 900, noise: 0 },
    { name: "Soft pop", pitch: 600, ratio: 0.5, glideMs: 12, decay: 18, tone: 1600, noise: 0 },
    { name: "Bubble", pitch: 350, ratio: 1.8, glideMs: 25, decay: 40, tone: 2500, noise: 0 },
    { name: "Droplet", pitch: 1200, ratio: 0.6, glideMs: 10, decay: 25, tone: 5000, noise: 0.05 },
    { name: "Tick", pitch: 2500, ratio: 1, glideMs: 10, decay: 4, tone: 8000, noise: 0.6 },
  ],
};

export const DEFAULTS = {
  tick: { on: true, volume: -8, character: 0, length: 1 },
  knock: { on: true, volume: -14, character: 1.6, pitch: 0, length: 1, brightness: 1, punch: 1, density: 7, variation: 0.15 },
  whoosh: { on: true, volume: -12, character: 1, length: 1, depth: 0 },
  pop: { on: true, volume: -24, character: 1, pitch: 0, length: 1 },
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

/** Renders one sound as a mono buffer. `strength` is how hard a knock was (Matter's relative speed, ~3–15). */
function voice(sound, settings, random, strength = 10) {
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
  if (sound === "knock") {
    const hard = Math.min(1, strength / 12), spread = 1 + (random() - 0.5) * 2 * s.variation;
    const f0 = p.pitch * Math.pow(2, s.pitch / 12) * spread * (1 - 0.15 * hard), decay = p.decay * s.length / 1000;
    const drop = 1 + (p.drop - 1) * s.punch, dropTime = p.dropMs / 1000, wobbleDecay = decay * 0.8;
    const out = new Float32Array(Math.ceil(Math.min(0.6, decay * 6) * RATE)), tone = lowpass(), click = lowpass();
    let phase = 0;
    for (let i = 0; i < out.length; i++) {
      const t = i / RATE;
      const f = f0 * (1 + (drop - 1) * Math.exp(-t / dropTime)) * (1 + p.wobble * 0.06 * Math.sin(2 * Math.PI * p.wobbleHz * t) * Math.exp(-t / wobbleDecay));
      phase += 2 * Math.PI * f / RATE;
      const body = (Math.sin(phase) + p.partialAmt * Math.sin(phase * p.partial)) * Math.min(1, t / 0.0008) * Math.exp(-t / decay);
      const tick = click(noise(), p.tickTone * s.brightness) * Math.exp(-t / 0.0015) * p.tick * s.punch * 3;
      out[i] = tone(body + tick, p.tone * s.brightness) * (0.45 + 0.55 * hard);
    }
    return out;
  }
  if (sound === "whoosh") {
    const attack = p.attack / 1000, decay = p.decay * s.length / 1000, shift = Math.pow(2, s.depth / 12);
    const out = new Float32Array(Math.ceil((attack + decay * 4) * RATE)), low = lowpass(), air = lowpass();
    let phase = 0;
    for (let i = 0; i < out.length; i++) {
      const t = i / RATE, rise = Math.min(1, t / attack), fall = t < attack ? 1 : Math.exp(-(t - attack) / decay);
      const cutoff = (p.lowStart + (p.lowPeak - p.lowStart) * rise * fall) * shift;
      const swell = (t < attack ? rise * rise * (3 - 2 * rise) : 1) * fall;
      phase += 2 * Math.PI * p.subHz * shift * (1 - 0.2 * rise) / RATE;
      out[i] = (low(noise(), cutoff) * 2.5 + air(noise(), cutoff * 4) * p.air + Math.sin(phase) * p.sub) * swell;
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
  return out;
}

/** Each sound's loudest version under these settings, so volume means the same thing whichever preset is chosen. */
function reference(sound, settings) {
  const buffer = voice(sound, { ...settings, [sound]: { ...settings[sound], variation: 0 } }, seeded(1), 12);
  let peak = 0;
  for (const value of buffer) peak = Math.max(peak, Math.abs(value));
  return peak || 1;
}

/** One sound on its own, for auditioning: [left, right]. */
export function single(sound, settings, strength = 10) {
  const scale = db(settings[sound].volume) * db(settings.master.volume) / reference(sound, settings);
  const mono = voice(sound, settings, seeded(Math.floor(Math.random() * 1e9)), strength).map(value => Math.tanh(value * scale));
  return [mono, mono];
}

const SOUND_OF = { flick: "tick", hit: "knock", kick: "whoosh", pump: "pop", pop: "pop" };
const CROWD = 0.08;

/**
 * Which events make a sound, and at what level. Glitch ticks come only from the opening and closing glitches; knocks
 * are the firmer contacts, at most `density` a second; the burst is one whoosh, at the first letter's kick; then at
 * most `overlap` sounds start within 80ms, those after the first at half level, and knocks under the whoosh's first
 * half-second are ducked by `duck`.
 */
export function plan(events, settings) {
  const sorted = [...events].sort((a, b) => a.time - b.time);
  const firstRelease = sorted.find(event => event.type === "release")?.time ?? Infinity;
  const lastLand = [...sorted].reverse().find(event => event.type === "land")?.time ?? -Infinity;
  const spacing = { flick: 0.05, hit: 1 / Math.max(1, settings.knock.density), pump: 0.03, pop: 0.03 };
  const kept = [], last = {};
  for (const event of sorted) {
    const sound = SOUND_OF[event.type];
    if (!sound || !settings[sound].on || (event.type === "hit" && event.strength < 3)) continue;
    if (event.type === "flick" && event.time > firstRelease && event.time < lastLand) continue;
    if (event.type === "kick") { if (!last.kick) { kept.push(event); last.kick = event; } continue; }
    const previous = last[event.type];
    if (previous && event.time - previous.time < spacing[event.type]) {
      if ((event.strength ?? 0) > (previous.strength ?? 0)) { kept[kept.indexOf(previous)] = event; last[event.type] = event; }
      continue;
    }
    kept.push(event); last[event.type] = event;
  }
  const whoosh = kept.find(event => event.type === "kick"), placed = [];
  for (const event of kept) {
    if (event.type === "kick") { placed.push({ ...event, sound: "whoosh", level: 1 }); continue; }
    const crowd = placed.filter(other => other.type !== "kick" && event.time - other.time < CROWD).length;
    if (crowd >= settings.master.overlap) continue;
    const under = whoosh && event.type === "hit" && event.time - whoosh.time >= 0 && event.time - whoosh.time < 0.5 ? 1 - settings.master.duck : 1;
    placed.push({ ...event, sound: SOUND_OF[event.type], level: (crowd ? 0.5 : 1) * under });
  }
  return placed;
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
    const buffer = voice(event.sound, settings, random, event.strength ?? 10), gain = scales[event.sound] * event.level;
    // Equal-power pan from the event's place across the card, kept off the hard edges; the whoosh sits in the middle.
    const pan = event.sound === "whoosh" ? 0 : (Math.min(1, Math.max(0, event.x)) - 0.5) * 1.4, angle = (pan + 1) * Math.PI / 4;
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
