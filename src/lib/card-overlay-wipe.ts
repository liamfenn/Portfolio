/**
 * The card overlay's entry and exit: a straight front sweeps across the tile from its top-left corner at a set
 * angle, leaving the overlay's blur and white tint set behind it, and rewinds the same way on close. WebGL draws
 * only while the front moves; once it has crossed, the CSS surface takes over, so the resting overlay is the same
 * backdrop-filter as before. Three styles, picked from the design inspector while we compare them:
 *
 * - particles: the blurred, tinted surface dissolves in as fine grains that appear at scattered times across a
 *   wide band, the newest carrying a faint palette hue. The front wavers a little and bends the media slightly.
 * - glow: a gentle lens under a soft frosted edge, washed with pastel palette colors that drift along it.
 * - lens: the media bends as the front passes (stretching what it has crossed, compressing what lies ahead).
 *
 * Positions run along the sweep direction: 0 at the top-left corner, 1 at the corner the front reaches last.
 */

/** Half-width of the distortion band, in sweep units. The blur sets over twice this behind the front. */
export const WIPE_BAND = 0.14;
/** Peak lens displacement, as a fraction of the tile's shorter side. */
export const WIPE_DISTORTION = 0.07;
/** Where the entry starts: inside the corner's fade, so the first frame already shows movement. */
export const WIPE_START = -0.75 * WIPE_BAND;
/** Where the entry ends: far enough past the last corner that every style has fully set there. */
export const WIPE_END = 1 + 2.4 * WIPE_BAND;
/** Where the exit ends: far enough before the first corner that nothing is drawn. */
export const WIPE_HIDDEN = -2 * WIPE_BAND;

export const CARD_WIPE_STYLES = ["particles", "glow", "lens"] as const;
export type CardWipeStyle = typeof CARD_WIPE_STYLES[number];
export const CARD_WIPE_LABELS: Record<CardWipeStyle, string> = { particles: "Particles", glow: "Glow", lens: "Lens" };

/** A CSS cubic-bezier timing function, solved for x by Newton's method with a bisection fallback. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const ax = 1 + 3 * x1 - 3 * x2, bx = 3 * x2 - 6 * x1, cx = 3 * x1;
  const ay = 1 + 3 * y1 - 3 * y2, by = 3 * y2 - 6 * y1, cy = 3 * y1;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const error = sampleX(t) - x, slope = (3 * ax * t + 2 * bx) * t + cx;
      if (Math.abs(error) < 1e-6) return sampleY(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= error / slope;
    }
    let low = 0, high = 1;
    t = x;
    for (let i = 0; i < 32; i++) {
      if (sampleX(t) < x) low = t; else high = t;
      t = (low + high) / 2;
    }
    return sampleY(t);
  };
}

/** Parses a token like `.85, 0, .15, 1`. */
export function parseBezier(value: string) {
  const points = value.split(",").map(part => parseFloat(part));
  return points.length === 4 && points.every(Number.isFinite) ? cubicBezier(points[0], points[1], points[2], points[3]) : null;
}

/** The entry front's position for an eased progress. */
export function wipeFront(eased: number) {
  return WIPE_START + eased * (WIPE_END - WIPE_START);
}

/** A point's position along a sweep at `angle` degrees below horizontal, from the box's top-left corner. Valid for
 *  angles between 0 and 90, where the top-left corner is first and the bottom-right last. */
export function sweepPosition(x: number, y: number, width: number, height: number, angle: number) {
  const radians = angle * Math.PI / 180, dx = Math.cos(radians), dy = Math.sin(radians);
  return (x * dx + y * dy) / (width * dx + height * dy);
}

/** Content on top of the blur waits until the front has passed its center and the blur is half set beneath it,
 *  then fades in as the blur finishes setting, so text never sits on sharp media. Exits run the same in reverse. */
export function rowRevealOpacity(front: number, position: number, band = WIPE_BAND) {
  const t = Math.min(1, Math.max(0, (front - position - band) / (band * 1.25)));
  return t * t * (3 - 2 * t);
}

/** How long a sweep between two fronts takes, as a share of a full one, so reversing midway doesn't drag. */
export function sweepDuration(from: number, to: number, full: number) {
  return full * Math.min(1, Math.abs(to - from) / (WIPE_END - WIPE_START));
}

/** The visible fraction of a source drawn with `object-fit: cover` into a box. */
export function coverFraction(boxWidth: number, boxHeight: number, sourceWidth: number, sourceHeight: number) {
  const scale = Math.max(boxWidth / sourceWidth, boxHeight / sourceHeight);
  return [boxWidth / (sourceWidth * scale), boxHeight / (sourceHeight * scale)] as const;
}

/** Up to `count` colors spread evenly across a palette, as 0–1 RGB. */
export function paletteSamples(hexes: readonly string[], count: number) {
  if (!hexes.length) return [[1, 1, 1]];
  const step = Math.max(1, hexes.length / count);
  return Array.from({ length: Math.min(count, hexes.length) }, (_, index) => {
    const hex = hexes[Math.floor(index * step)].replace("#", "");
    return [0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  });
}

const VERTEX = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

// Blur is a gaussian-weighted golden-angle disc; under the 88% tint its grain is invisible, and it only has to
// match the CSS blur closely enough for the short crossfade at the end.
const FRAGMENT = `
precision mediump float;
uniform sampler2D source;
uniform bool hasSource;
uniform vec3 backdrop;
uniform vec2 resolution;
uniform vec4 media;
uniform vec2 fraction;
uniform vec2 direction;
uniform float front;
uniform float band;
uniform float distortion;
uniform float blur;
uniform float tint;
uniform int style;
uniform float time;
uniform float cell;
uniform vec3 palette[8];
uniform int paletteSize;

vec3 sampleAt(vec2 point) {
  if (!hasSource) return backdrop;
  vec2 uv = clamp((point - media.xy) / media.zw, 0.0, 1.0);
  return texture2D(source, 0.5 + (uv - 0.5) * fraction).rgb;
}

vec3 blurred(vec2 point, float radius) {
  if (radius < 0.5) return sampleAt(point);
  vec3 total = sampleAt(point);
  float weight = 1.0;
  for (int i = 0; i < 32; i++) {
    float f = (float(i) + 0.5) / 32.0;
    float distance = sqrt(f) * radius * 2.0;
    float angle = float(i) * 2.39996;
    float w = exp(-0.5 * distance * distance / (radius * radius));
    total += sampleAt(point + vec2(cos(angle), sin(angle)) * distance) * w;
    weight += w;
  }
  return total / weight;
}

// Constant-index lookup: GLSL ES 1.0 only promises loop-index access to uniform arrays in fragment shaders.
vec3 paletteAt(float position) {
  float scaled = fract(position) * float(paletteSize);
  vec3 low = palette[0], high = palette[0];
  for (int i = 0; i < 8; i++) {
    if (i == int(floor(scaled))) low = palette[i];
    if (i == int(mod(floor(scaled) + 1.0, float(paletteSize)))) high = palette[i];
  }
  return mix(low, high, smoothstep(0.0, 1.0, fract(scaled)));
}

float hash(vec2 value) {
  return fract(sin(dot(value, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 point = vec2(gl_FragCoord.x, resolution.y - gl_FragCoord.y);
  float span = dot(resolution, direction);
  // Position across the sweep, so colors and waves run along the front rather than through it.
  float along = dot(point, vec2(-direction.y, direction.x)) / length(resolution) + 0.5;
  float behind = front - dot(point, direction) / span;
  float alpha = smoothstep(-2.0 * band, -0.75 * band, behind);

  if (style == 0) {
    // A slow, shallow wave along the front and a light lens, so the dissolve isn't ruler-straight.
    float waver = sin(along * 9.0 + time * 4.0) * 0.18 * band;
    float wavy = behind + waver;
    float lens = exp(-(wavy * wavy) / (band * band));
    vec2 bent = point - direction * distortion * 0.3 * (wavy / band) * lens;

    // Each grain sits jittered in its own small cell and arrives at a scattered time across a wide band: a speck
    // at first, growing until it meets its neighbors. Behind the band a smooth fill closes what's left.
    vec2 id = floor(point / cell);
    vec2 center = (id + 0.5 + (vec2(hash(id), hash(id + 7.1)) - 0.5) * 0.4) * cell;
    float arrival = front - dot(center, direction) / span + waver + (hash(id + 3.7) - 0.5) * 2.4 * band;
    float grow = smoothstep(0.0, 0.8 * band, arrival);
    float radius = mix(0.35, 0.85, grow) * cell;
    float grain = (1.0 - smoothstep(radius - 0.75, radius + 0.75, length(point - center))) * step(0.001, grow);
    float cover = max(grain, smoothstep(1.5 * band, 2.3 * band, wavy));
    vec3 settled = mix(blurred(point, blur), vec3(1.0), tint);
    // Only young grains carry color, and only faintly.
    vec3 hue = mix(paletteAt(hash(id + 1.3) * 0.5 + along * 0.6), vec3(1.0), 0.3);
    vec3 color = mix(settled, hue, (1.0 - grow) * 0.28 * grain);
    // Between grains near the front, the media shows through bent slightly.
    float near = lens * (1.0 - cover) * alpha;
    color = mix(color, sampleAt(bent), near / max(cover + near, 0.001));
    float shown = max(cover, near);
    gl_FragColor = vec4(color * shown, shown);
    return;
  }

  float lens = exp(-(behind * behind) / (band * band));
  float strength = style == 1 ? 0.6 : 1.0;
  vec2 bent = point - direction * distortion * strength * (behind / band) * lens;
  float set = smoothstep(0.0, 2.0 * band, behind);
  vec3 color;
  if (style == 1) {
    // Frost reaches a little ahead of the tint, and a broad pastel wash rides just behind the front.
    float frost = smoothstep(-0.75 * band, 1.25 * band, behind);
    color = mix(blurred(bent, blur * frost), vec3(1.0), tint * set);
    float edge = exp(-pow((behind - 0.5 * band) / (1.1 * band), 2.0));
    vec3 pastel = mix(paletteAt(along * 0.8 + time * 0.35), vec3(1.0), 0.4);
    color = mix(color, pastel, edge * 0.24);
  } else {
    color = mix(blurred(bent, blur * set), vec3(1.0), tint * set);
  }
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

type Source = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;

/** The frame currently on screen in a card: a rendition-upgrade cover, the playing video, its poster, or a still. */
function visibleSource(card: Element): Source | null {
  // In the order they stack: an upgrade cover hides the video, which hides its poster.
  const candidates = [".project-preview-upgrade", ".project-preview-video[data-frame-ready='true']", ".homepage-project-media img"]
    .flatMap(selector => [...card.querySelectorAll<Source>(selector)]);
  return candidates.find(element => element instanceof HTMLCanvasElement ? element.width > 0
    : element instanceof HTMLVideoElement ? element.readyState >= 2 && element.videoWidth > 0
    : element.complete && element.naturalWidth > 0 && getComputedStyle(element).visibility !== "hidden") ?? null;
}

function sourceSize(source: Source) {
  return source instanceof HTMLVideoElement ? [source.videoWidth, source.videoHeight] as const
    : source instanceof HTMLImageElement ? [source.naturalWidth, source.naturalHeight] as const
    : [source.width, source.height] as const;
}

function compile(gl: WebGLRenderingContext) {
  const program = gl.createProgram()!;
  for (const [type, code] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]] as const) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, code);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

function cssColor(value: string) {
  const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [0, 0, 0];
  // color(srgb r g b) reports 0–1 channels; rgb() reports 0–255.
  const scale = value.startsWith("color(") ? 1 : 255;
  return channels.map(channel => channel / scale) as [number, number, number];
}

export type CardWipeOptions = {
  panel: HTMLElement;
  canvas: HTMLCanvasElement;
  blur: number;
  tint: number;
  style: CardWipeStyle;
  /** Degrees below horizontal that the front travels, starting from the top-left corner. */
  angle: number;
  /** Hex colors for the glow and particle edges; the site's live glyph palette. */
  palette: readonly string[];
};

export type CardWipe = NonNullable<ReturnType<typeof createCardWipe>>;

/** Sets up a wipe renderer on a canvas, or returns null without WebGL so the overlay keeps its plain fade. `play`
 *  sweeps the front to a position, revealing or hiding the rows with it, and can be called again mid-sweep to
 *  reverse from wherever the front is. `release` frees the context once the canvas is no longer visible (losing it
 *  earlier would blank the canvas). */
export function createCardWipe({ panel, canvas, blur, tint, style, angle, palette }: CardWipeOptions) {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false });
  const program = gl && compile(gl);
  if (!gl || !program) return null;
  const card = panel.closest(".homepage-card")!;
  const mediaBox = card.querySelector<HTMLElement>(".homepage-project-media");
  const rows = [...panel.querySelectorAll<HTMLElement>("h3, li")];
  const radians = angle * Math.PI / 180;

  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  for (const [name, value] of [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]])
    gl.texParameteri(gl.TEXTURE_2D, name, value);
  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const backdrop = cssColor(getComputedStyle(card.querySelector(".project-preview-media") ?? mediaBox ?? panel).backgroundColor);
  gl.uniform3f(uniform("backdrop"), ...backdrop);
  gl.uniform1f(uniform("band"), WIPE_BAND);
  gl.uniform1f(uniform("tint"), tint);
  gl.uniform1i(uniform("style"), { particles: 0, glow: 1, lens: 2 }[style]);
  gl.uniform2f(uniform("direction"), Math.cos(radians), Math.sin(radians));
  const colors = paletteSamples(palette, 8);
  gl.uniform3fv(uniform("palette"), new Float32Array(Array.from({ length: 8 }, (_, index) => colors[index % colors.length]).flat()));
  gl.uniform1i(uniform("paletteSize"), colors.length);

  let source = visibleSource(card), uploaded: Source | null = null, frame = 0;
  const born = performance.now();

  const draw = (now: number) => {
    const bounds = panel.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(bounds.width * ratio)), height = Math.max(1, Math.round(bounds.height * ratio));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    gl.viewport(0, 0, width, height);
    gl.uniform2f(uniform("resolution"), width, height);
    gl.uniform1f(uniform("distortion"), WIPE_DISTORTION * Math.min(width, height));
    gl.uniform1f(uniform("blur"), blur * ratio);
    gl.uniform1f(uniform("front"), wipe.front);
    gl.uniform1f(uniform("time"), (now - born) / 1000);
    // Particle grains stay about 3 CSS pixels apart at any density.
    gl.uniform1f(uniform("cell"), 3 * ratio);

    const media = mediaBox?.getBoundingClientRect() ?? bounds;
    gl.uniform4f(uniform("media"), (media.left - bounds.left) * ratio, (media.top - bounds.top) * ratio, Math.max(1, media.width * ratio), Math.max(1, media.height * ratio));
    // Re-pick each frame: an upgrade cover can appear or leave mid-sweep.
    if (!source?.isConnected || (source instanceof HTMLVideoElement && source.readyState < 2)) source = visibleSource(card);
    let hasSource = false;
    if (source) {
      try {
        // Videos upload every frame so playback continues under the front; stills upload once.
        if (!(source instanceof HTMLImageElement) || uploaded !== source) {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
          uploaded = source;
        }
        gl.uniform2f(uniform("fraction"), ...coverFraction(media.width, media.height, ...sourceSize(source)));
        hasSource = true;
      } catch {
        // A frame the page can't read (no CORS) still gets the sweep, over the media's backdrop color.
        source = null;
      }
    }
    gl.uniform1i(uniform("hasSource"), hasSource ? 1 : 0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    for (const row of rows) {
      const rect = row.getBoundingClientRect();
      const center = sweepPosition(rect.left + rect.width / 2 - bounds.left, rect.top + rect.height / 2 - bounds.top, bounds.width, bounds.height, angle);
      row.style.opacity = String(rowRevealOpacity(wipe.front, center));
    }
  };

  const wipe = {
    front: WIPE_HIDDEN,
    play(to: number, duration: number, ease: (progress: number) => number, onDone: () => void) {
      cancelAnimationFrame(frame);
      const from = wipe.front, start = performance.now();
      const step = (now: number) => {
        const progress = duration > 0 ? Math.min(1, (now - start) / duration) : 1;
        wipe.front = from + (to - from) * ease(progress);
        draw(now);
        if (progress < 1) frame = requestAnimationFrame(step);
        else { wipe.stop(); onDone(); }
      };
      // Draw the starting frame now, before the browser paints: a rewind replaces the CSS surface in this frame.
      step(start);
    },
    /** Halts drawing and hands the rows back to CSS. */
    stop() {
      cancelAnimationFrame(frame);
      for (const row of rows) row.style.removeProperty("opacity");
    },
    release() {
      wipe.stop();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
  return wipe;
}
