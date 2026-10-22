"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import { EXIT_RETURN_DELAY_MS, preloadSwarm } from "@/lib/glyph-swarm";

export type GlyphMode = "idle" | "loading" | "active" | "collapsing";

// A fixed scatter of characters, so server and client render the same globe.
const GLOBE_CHARS = "a&Ro7?g*Q2ks@m0yt%cWb#f5j".split("");
// When the globe bursts, every other character stays behind as the exit: a flat ring of glyphs around an empty
// centre, like a stroke, turning slowly clockwise. Positions are fractions of the control's size.
const RING_INDEX = GLOBE_CHARS.map((_, index) => index).filter(index => index % 2 === 0).slice(0, 12);
const RING_RADIUS = 0.36;
const RING = RING_INDEX.map((_, order) => {
  const angle = order / RING_INDEX.length * Math.PI * 2 - Math.PI / 2;
  // Each glyph sits along the circle, its top facing outward.
  return { x: Math.cos(angle) * RING_RADIUS, y: Math.sin(angle) * RING_RADIUS, turn: angle + Math.PI / 2 };
});
const RING_MS = 650;
const RING_STAGGER_MS = 22;
// One slow clockwise turn of the ring at rest; hover or keyboard focus winds it up.
const RING_TURN_MS = 14000;
const RING_HOT_SPEED = 3.5;
// Sized against the 28px globe; a larger globe scales its orbit and characters to match.
const BASE_SIZE = 28;
const RADIUS = 10;
const TURN_MS = 9000;
const TILT = 0.42;
// Evenly spread points on a sphere.
const POINTS = GLOBE_CHARS.map((_, index) => {
  const y = 1 - (index + 0.5) / GLOBE_CHARS.length * 2, ring = Math.sqrt(1 - y * y), theta = index * Math.PI * (3 - Math.sqrt(5));
  return { x: Math.cos(theta) * ring, y, z: Math.sin(theta) * ring };
});

function paint(chars: (HTMLSpanElement | null)[], angle: number, size: number) {
  const zoom = size / BASE_SIZE, cos = Math.cos(angle), sin = Math.sin(angle), tiltCos = Math.cos(TILT), tiltSin = Math.sin(TILT);
  chars.forEach((char, index) => {
    if (!char) return;
    const point = POINTS[index];
    const x = point.x * cos + point.z * sin, z0 = point.z * cos - point.x * sin;
    const y = point.y * tiltCos - z0 * tiltSin, z = point.y * tiltSin + z0 * tiltCos;
    const depth = (z + 1) / 2;
    char.style.transform = `translate(${x * RADIUS * zoom}px,${y * RADIUS * zoom}px) translate(-50%,-50%) scale(${(0.36 + 0.22 * depth) * zoom})`;
    char.style.opacity = String(0.3 + 0.7 * depth);
    char.style.zIndex = String(Math.round(depth * 10));
  });
}

// Sparse bursts return to the inherited text color instead of accumulating across the globe.
function startColorGlitches(glyphs: (HTMLElement | null)[], colors: string[], isHot: () => boolean) {
  const live = glyphs.filter((glyph): glyph is HTMLElement => glyph !== null);
  const active = new Map<HTMLElement, number>();
  let nextBurst = performance.now() + 1800 + Math.random() * 1200;
  let wasHot = false;
  const timer = window.setInterval(() => {
    const now = performance.now(), hot = isHot();
    for (const [glyph, until] of active) {
      if (now >= until) { glyph.style.color = ""; active.delete(glyph); }
    }
    if (hot !== wasHot) {
      nextBurst = hot ? now : now + 1800 + Math.random() * 1200;
      wasHot = hot;
      if (!hot) { live.forEach(glyph => { glyph.style.color = ""; }); active.clear(); }
    }
    if (now < nextBurst || !colors.length) return;
    // A shuffled pool prevents duplicate picks; even overlapping hot bursts stay below half the glyphs.
    const available = live.filter(glyph => !active.has(glyph));
    const limit = Math.floor(live.length * (hot ? 0.45 : 0.15));
    const count = Math.min(limit - active.size, hot ? 3 + Math.floor(Math.random() * 3) : 2);
    for (let index = 0; index < count && available.length; index++) {
      const glyph = available.splice(Math.floor(Math.random() * available.length), 1)[0];
      glyph.style.color = colors[Math.floor(Math.random() * colors.length)];
      active.set(glyph, now + 90 + Math.random() * (hot ? 170 : 240));
    }
    nextBurst = now + (hot ? 100 + Math.random() * 140 : 1800 + Math.random() * 1200);
  }, 50);
  return () => {
    window.clearInterval(timer);
    live.forEach(glyph => { glyph.style.color = ""; });
  };
}

/** The ring's current turn, in radians. */
function ringAngle(ring: HTMLElement) {
  const matrix = new DOMMatrix(getComputedStyle(ring).transform);
  return Math.atan2(matrix.b, matrix.a);
}

/**
 * Moves one ring glyph between its place in the globe and its place on the ring. The glide is measured on screen
 * and turned into the ring's own frame, so it lands true however far the ring has spun. The glyph turns from
 * upright (in the globe) to lying along the circle (on the ring).
 */
function glide(slot: HTMLElement, glyph: HTMLElement, globeChar: HTMLElement, ringTurn: number, glyphTurn: number, reverse: boolean, delay: number) {
  // The exit plays the entry's own animation backwards: same keyframes, curve, and duration.
  const from = globeChar.getBoundingClientRect(), to = slot.getBoundingClientRect();
  const dx = from.left + from.width / 2 - (to.left + to.width / 2), dy = from.top + from.height / 2 - (to.top + to.height / 2);
  const cos = Math.cos(-ringTurn), sin = Math.sin(-ringTurn);
  const local = { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
  const inGlobe = { transform: `translate(${local.x}px,${local.y}px) scale(${from.height / (to.height || 1)})`, opacity: Number(globeChar.style.opacity || 1) };
  const onRing = { transform: "none", opacity: 1 };
  const upright = { transform: `rotate(${-(glyphTurn + ringTurn)}rad)` }, along = { transform: "none" };
  const timing: KeyframeAnimationOptions = { duration: RING_MS, delay, easing: "cubic-bezier(.34,1.3,.64,1)",
    direction: reverse ? "reverse" : "normal", fill: reverse ? "forwards" : "backwards" };
  slot.animate([inGlobe, onRing], timing);
  glyph.animate([upright, along], timing);
}

export function GlyphGlobe({ mode, disabled, reducedMotion, palette, globeRef, onToggle }: {
  mode: GlyphMode;
  /** The palette strip's colours, space-separated, so the globe's glyphs share them. */
  palette: string;
  disabled: boolean;
  reducedMotion: boolean;
  globeRef: RefObject<HTMLButtonElement | null>;
  onToggle: () => void;
}) {
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const colors = useMemo(() => palette.split(" "), [palette]);
  const exitRef = useRef<HTMLButtonElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const slotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const glyphRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const hoverRef = useRef(false);
  // Hover or keyboard focus on the ring winds its spin up; the speed eases, so the ring never jumps.
  const ringHotRef = useRef(false);
  // The ring's speed carries across the click, and the spin halts only as its glyphs start folding back.
  const ringSpeedRef = useRef(1);
  const ringHaltRef = useRef(false);
  // Whether the globe was pressed from the keyboard (a click with no pointer detail), so focus can follow to the exit.
  const keyboardRef = useRef(false);
  // Kept across bursts, so the globe re-forms at the angle it burst from, where the ring glyphs return to.
  const angleRef = useRef(0.6);
  const previousMode = useRef(mode);
  // During the exit the globe re-forms once the ring glyphs are back in place. Its burst letters are still landing,
  // and each spot reappears as its letter arrives (see data-away).
  const [reforming, setReforming] = useState(false);
  const spent = mode === "active" || (mode === "collapsing" && !reforming);
  useEffect(() => {
    if (mode !== "collapsing") return;
    const timer = window.setTimeout(() => setReforming(true), EXIT_RETURN_DELAY_MS + RING_STAGGER_MS * (RING_INDEX.length - 1) + RING_MS);
    return () => { window.clearTimeout(timer); setReforming(false); };
  }, [globeRef, mode]);

  // The globe turns slowly, faster under the cursor, and pauses off screen or while it is spent.
  useEffect(() => {
    const globe = globeRef.current, chars = charRefs.current;
    if (!globe) return;
    if (reducedMotion) { paint(chars, angleRef.current, globe.offsetWidth); return; }
    if (spent) return;
    let frame = 0, speed = 1, previous = 0;
    const turn = (time: number) => {
      speed += ((hoverRef.current ? 3 : 1) - speed) * 0.06;
      angleRef.current += Math.min(64, previous ? time - previous : 0) / TURN_MS * Math.PI * 2 * speed; previous = time;
      paint(chars, angleRef.current, globe.offsetWidth);
      frame = requestAnimationFrame(turn);
    };
    paint(chars, angleRef.current, globe.offsetWidth);
    const observer = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(frame); previous = 0;
      if (entry.isIntersecting) frame = requestAnimationFrame(turn);
    }, { rootMargin: "200px" });
    observer.observe(globe);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [globeRef, reducedMotion, spent]);

  // The ring turns slowly clockwise while the swarm is out, faster under the cursor, and keeps turning after the
  // click until its glyphs start folding back into the globe.
  useEffect(() => {
    const ring = ringRef.current;
    if (!ring || (mode !== "active" && mode !== "collapsing") || reducedMotion) return;
    let frame = 0, previous = 0, angle = ringAngle(ring);
    const spin = (time: number) => {
      if (ringHaltRef.current) return;
      const dt = Math.min(64, previous ? time - previous : 0); previous = time;
      // Eases toward the target speed over about 200ms, whatever the frame rate.
      ringSpeedRef.current += ((ringHotRef.current ? RING_HOT_SPEED : 1) - ringSpeedRef.current) * (1 - Math.exp(-dt / 200));
      angle += dt / RING_TURN_MS * Math.PI * 2 * ringSpeedRef.current;
      ring.style.transform = `rotate(${angle}rad)`;
      frame = requestAnimationFrame(spin);
    };
    frame = requestAnimationFrame(spin);
    return () => cancelAnimationFrame(frame);
  }, [mode, reducedMotion]);

  // Mostly monochrome, with brief sparse flickers; hover and keyboard focus intensify them.
  useEffect(() => {
    const globe = globeRef.current;
    if (reducedMotion || spent) return;
    hoverRef.current = globe?.matches(":hover, :focus-visible") ?? false;
    return startColorGlitches(charRefs.current, colors, () => hoverRef.current);
  }, [colors, globeRef, reducedMotion, spent]);

  useEffect(() => {
    if (mode !== "active" || reducedMotion) return;
    return startColorGlitches(glyphRefs.current, colors, () => ringHotRef.current);
  }, [colors, mode, reducedMotion]);

  // The ring glyphs glide out of the bursting globe into the ring, and back on exit. The globe is frozen while
  // spent, so each glyph returns to exactly where it left.
  useLayoutEffect(() => {
    const previous = previousMode.current;
    previousMode.current = mode;
    const ring = ringRef.current;
    if (!ring) return;
    const each = (reverse: boolean, delay: (order: number) => number) => RING_INDEX.forEach((index, order) => {
      const slot = slotRefs.current[order], glyph = glyphRefs.current[order], globeChar = charRefs.current[index];
      if (slot && glyph && globeChar) glide(slot, glyph, globeChar, ringAngle(ring), RING[order].turn, reverse, delay(order));
    });
    if (mode === "active" && previous === "loading") {
      // The globe is now disabled; a keyboard user's focus moves to the control that replaced it. After a mouse
      // click it stays put, since browsers can show programmatic focus as keyboard focus.
      if (keyboardRef.current) exitRef.current?.focus({ preventScroll: true });
      ringHaltRef.current = false; ringSpeedRef.current = 1;
      // Each glyph keeps its colour from the globe as it moves onto the ring.
      RING_INDEX.forEach((index, order) => { const glyph = glyphRefs.current[order]; if (glyph) glyph.style.color = charRefs.current[index]?.style.color ?? ""; });
      each(false, order => 60 + order * RING_STAGGER_MS);
    }
    if (mode !== "collapsing") return;
    // The ring spins on until its glyphs fold back. At that moment the spin halts and each glyph's path home is
    // measured from wherever the ring has turned to. Each takes its current colour back into the globe, and the
    // last glyph to arrive on entry is the first to leave.
    const fold = window.setTimeout(() => {
      ringHaltRef.current = true;
      RING_INDEX.forEach((index, order) => { const char = charRefs.current[index]; if (char) char.style.color = glyphRefs.current[order]?.style.color ?? ""; });
      each(true, order => (RING_INDEX.length - 1 - order) * RING_STAGGER_MS);
    }, EXIT_RETURN_DELAY_MS);
    return () => window.clearTimeout(fold);
  }, [globeRef, mode]);

  const warm = () => { hoverRef.current = true; preloadSwarm(); };

  return <>
    <button ref={globeRef} type="button" className={`glyph-globe text-captionSans${spent ? " is-spent" : ""}`}
      aria-label="Play with the letters" disabled={disabled || mode !== "idle"} onClick={event => { keyboardRef.current = event.detail === 0; onToggle(); }}
      onPointerEnter={warm} onPointerLeave={() => { hoverRef.current = false; }} onFocus={event => { hoverRef.current = event.currentTarget.matches(":focus-visible"); preloadSwarm(); }} onBlur={() => { hoverRef.current = false; }} onTouchStart={preloadSwarm}>
      <span className="glyph-globe-sphere" aria-hidden="true">
        {GLOBE_CHARS.map((char, index) => <span key={index} ref={element => { charRefs.current[index] = element; }}
          className="glyph-globe-char" data-ring={RING_INDEX.includes(index) ? "" : undefined}>{char}</span>)}
      </span>
    </button>
    {/* The ring takes the globe's place, so it sits where the swarm came from rather than over the page. */}
    {(mode === "active" || mode === "collapsing") && <button ref={exitRef} type="button"
      className={`glyph-exit text-captionSans${reforming ? " is-reformed" : ""}`}
      aria-label="Put the letters back" aria-keyshortcuts="Escape" disabled={mode === "collapsing"} onClick={onToggle}
      onPointerEnter={() => { ringHotRef.current = true; }} onPointerLeave={() => { ringHotRef.current = false; }}
      onFocus={event => { ringHotRef.current = event.currentTarget.matches(":focus-visible"); }} onBlur={() => { ringHotRef.current = false; }}>
      <span ref={ringRef} className="glyph-exit-ring" aria-hidden="true">
        {RING_INDEX.map((index, order) => <span key={index} ref={element => { slotRefs.current[order] = element; }} className="glyph-exit-slot"
          style={{ "--ring-x": RING[order].x, "--ring-y": RING[order].y } as CSSProperties}>
          <span ref={element => { glyphRefs.current[order] = element; }} className="glyph-exit-glyph"
            style={{ "--ring-turn": `${RING[order].turn}rad` } as CSSProperties}>{GLOBE_CHARS[index]}</span>
        </span>)}
      </span>
    </button>}
  </>;
}
