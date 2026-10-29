/**
 * The card overlay's entry: a diagonal front sweeps from the tile's top-left corner to its bottom-right, bending the
 * media as it passes (a lens that stretches what it has crossed and compresses what lies ahead) and leaving the
 * overlay's blur and white tint set behind it. WebGL draws only while the front moves; once it has crossed, the
 * CSS surface takes over, so the resting overlay is the same backdrop-filter as before.
 *
 * Positions are on the tile's diagonal: 0 at the top-left corner, 1 at the bottom-right, halfway between the two
 * edge fractions so wide (expanded mobile) tiles still sweep corner to corner.
 */

/** Half-width of the distortion band, in diagonal units. The blur sets over twice this behind the front. */
export const WIPE_BAND = 0.14;
/** Peak lens displacement, as a fraction of the tile's shorter side. */
export const WIPE_DISTORTION = 0.07;

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

/** The front's diagonal position for an eased progress. It starts and ends far enough outside the tile that the
 *  band enters unseen and the blur has fully set at the bottom-right corner when it finishes. */
export function wipeFront(eased: number, band = WIPE_BAND) {
  return -2 * band + eased * (1 + 4 * band);
}

/** A point's diagonal position inside a box. */
export function diagonalOf(x: number, y: number, width: number, height: number) {
  return (x / width + y / height) / 2;
}

/** Content on top of the blur waits until the lens has passed its center and the blur is half set beneath it, then
 *  fades in as the blur finishes setting, so text never sits on sharp, bent media. */
export function rowRevealOpacity(front: number, diagonal: number, band = WIPE_BAND) {
  const t = Math.min(1, Math.max(0, (front - diagonal - band) / (band * 1.25)));
  return t * t * (3 - 2 * t);
}

/** The visible fraction of a source drawn with `object-fit: cover` into a box. */
export function coverFraction(boxWidth: number, boxHeight: number, sourceWidth: number, sourceHeight: number) {
  const scale = Math.max(boxWidth / sourceWidth, boxHeight / sourceHeight);
  return [boxWidth / (sourceWidth * scale), boxHeight / (sourceHeight * scale)] as const;
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

void main() {
  vec2 point = vec2(gl_FragCoord.x, resolution.y - gl_FragCoord.y);
  float diagonal = (point.x / resolution.x + point.y / resolution.y) * 0.5;
  float behind = front - diagonal;
  float lens = exp(-(behind * behind) / (band * band));
  vec2 bent = point - direction * distortion * (behind / band) * lens;
  float set = smoothstep(0.0, 2.0 * band, behind);
  float alpha = smoothstep(-2.0 * band, -0.75 * band, behind);
  vec3 color = mix(blurred(bent, blur * set), vec3(1.0), tint * set);
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
  rows: HTMLElement[];
  duration: number;
  ease: (progress: number) => number;
  blur: number;
  tint: number;
  /** Called once the front has crossed and the CSS surface is showing. */
  onSettle: () => void;
};

/** Starts the entry. `stop` halts drawing and hands the rows back to CSS; `release` frees the context once the
 *  canvas has faded out (losing it earlier would blank the canvas mid-fade). Returns null when WebGL is
 *  unavailable, so the overlay keeps its plain fade. */
export function playCardWipe({ panel, canvas, rows, duration, ease, blur, tint, onSettle }: CardWipeOptions) {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false });
  const program = gl && compile(gl);
  if (!gl || !program) return null;
  const card = panel.closest(".homepage-card")!;
  const mediaBox = card.querySelector<HTMLElement>(".homepage-project-media");

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

  let source = visibleSource(card), uploaded: Source | null = null, frame = 0, stopped = false;
  const start = performance.now();
  const draw = (now: number) => {
    if (stopped) return;
    const progress = Math.min(1, (now - start) / duration);
    const front = wipeFront(ease(progress));
    const bounds = panel.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(bounds.width * ratio)), height = Math.max(1, Math.round(bounds.height * ratio));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    gl.viewport(0, 0, width, height);
    gl.uniform2f(uniform("resolution"), width, height);
    // Pixel direction of the diagonal's gradient, so the lens pushes across the front on any aspect ratio.
    const gx = 1 / width, gy = 1 / height, length = Math.hypot(gx, gy);
    gl.uniform2f(uniform("direction"), gx / length, gy / length);
    gl.uniform1f(uniform("distortion"), WIPE_DISTORTION * Math.min(width, height));
    gl.uniform1f(uniform("blur"), blur * ratio);
    gl.uniform1f(uniform("front"), front);

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
      const center = diagonalOf(rect.left + rect.width / 2 - bounds.left, rect.top + rect.height / 2 - bounds.top, bounds.width, bounds.height);
      row.style.opacity = String(rowRevealOpacity(front, center));
    }
    if (progress < 1) frame = requestAnimationFrame(draw);
    else { stop(); onSettle(); }
  };
  const stop = () => {
    stopped = true;
    cancelAnimationFrame(frame);
    for (const row of rows) row.style.removeProperty("opacity");
  };
  frame = requestAnimationFrame(draw);
  return { stop, release: () => { stop(); gl.getExtension("WEBGL_lose_context")?.loseContext(); } };
}
