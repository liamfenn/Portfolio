"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

/** The ring's current turn, read from its running spin, in radians. */
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
  const from = globeChar.getBoundingClientRect(), to = slot.getBoundingClientRect();
  const dx = from.left + from.width / 2 - (to.left + to.width / 2), dy = from.top + from.height / 2 - (to.top + to.height / 2);
  const cos = Math.cos(-ringTurn), sin = Math.sin(-ringTurn);
  const local = { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
  const inGlobe = { transform: `translate(${local.x}px,${local.y}px) scale(${from.height / (to.height || 1)})`, opacity: Number(globeChar.style.opacity || 1) };
  const onRing = { transform: "none", opacity: 1 };
  const upright = { transform: `rotate(${-(glyphTurn + ringTurn)}rad)` }, along = { transform: "none" };
  const timing: KeyframeAnimationOptions = reverse
    ? { duration: RING_MS, delay, easing: "cubic-bezier(.45,0,.2,1)", fill: "forwards" }
    : { duration: RING_MS, delay, easing: "cubic-bezier(.34,1.3,.64,1)", fill: "backwards" };
  slot.animate(reverse ? [onRing, inGlobe] : [inGlobe, onRing], timing);
  glyph.animate(reverse ? [along, upright] : [upright, along], timing);
}

export function GlyphGlobe({ mode, disabled, reducedMotion, globeRef, onToggle }: {
  mode: GlyphMode;
  disabled: boolean;
  reducedMotion: boolean;
  globeRef: RefObject<HTMLButtonElement | null>;
  onToggle: () => void;
}) {
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const exitRef = useRef<HTMLButtonElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const slotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const glyphRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const hoverRef = useRef(false);
  // Whether the globe was pressed from the keyboard (a click with no pointer detail), so focus can follow to the exit.
  const keyboardRef = useRef(false);
  // Kept across bursts, so the globe re-forms at the angle it burst from, where the ring glyphs return to.
  const angleRef = useRef(0.6);
  const previousMode = useRef(mode);
  // During the exit the globe re-forms once the ring glyphs are back in place, rather than after every letter has landed.
  const [reforming, setReforming] = useState(false);
  const spent = mode === "active" || (mode === "collapsing" && !reforming);
  useEffect(() => {
    if (mode !== "collapsing") return;
    const timer = window.setTimeout(() => setReforming(true), EXIT_RETURN_DELAY_MS + RING_MS + 120);
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
      each(false, order => 60 + order * 22);
    }
    // The spin pauses (see .is-leaving) so the glyphs glide home from where they are.
    if (mode === "collapsing") each(true, order => EXIT_RETURN_DELAY_MS + order * 14);
  }, [globeRef, mode]);

  const warm = () => { hoverRef.current = true; preloadSwarm(); };

  return <>
    <button ref={globeRef} type="button" className={`glyph-globe text-captionSans${spent ? " is-spent" : ""}`}
      aria-label="Play with the letters" disabled={disabled || mode !== "idle"} onClick={event => { keyboardRef.current = event.detail === 0; onToggle(); }}
      onPointerEnter={warm} onPointerLeave={() => { hoverRef.current = false; }} onFocus={preloadSwarm} onTouchStart={preloadSwarm}>
      <span className="glyph-globe-sphere" aria-hidden="true">
        {GLOBE_CHARS.map((char, index) => <span key={index} ref={element => { charRefs.current[index] = element; }}
          className="glyph-globe-char" data-ring={RING_INDEX.includes(index) ? "" : undefined}>{char}</span>)}
      </span>
    </button>
    {/* The ring takes the globe's place, so it sits where the swarm came from rather than over the page. */}
    {(mode === "active" || mode === "collapsing") && <button ref={exitRef} type="button"
      className={`glyph-exit text-captionSans${mode === "collapsing" ? " is-leaving" : ""}${reforming ? " is-reformed" : ""}`}
      aria-label="Put the letters back" aria-keyshortcuts="Escape" disabled={mode === "collapsing"} onClick={onToggle}>
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
