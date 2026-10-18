"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import { CROSS_RETURN_DELAY_MS, preloadSwarm } from "@/lib/glyph-swarm";

export type GlyphMode = "idle" | "loading" | "active" | "collapsing";

// A fixed scatter of characters, so server and client render the same globe.
const GLOBE_CHARS = "a&RE7?g*Q2ks@m0yt%cWb#f5j".split("");
// Nine of them stay behind when the globe bursts and become the close control: an X with one character at its
// centre and two along each arm. Positions are fractions of the control's size, arms on the diagonals.
const CROSS_INDEX = [12, 3, 0, 9, 6, 15, 18, 21, 24];
const CROSS_POINTS = [[0, 0], [-0.17, -0.17], [-0.36, -0.36], [0.17, -0.17], [0.36, -0.36], [-0.17, 0.17], [-0.36, 0.36], [0.17, 0.17], [0.36, 0.36]];
// Sized against the 28px globe; a larger globe scales its orbit and characters to match.
const BASE_SIZE = 28;
const RADIUS = 10;
const RETURN_MS = 620;
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

/** Moves each element from one box to another, scaling between their heights. */
function flip(element: HTMLElement, from: DOMRect, to: DOMRect, reverse: boolean, delay: number) {
  const dx = from.left + from.width / 2 - (to.left + to.width / 2), dy = from.top + from.height / 2 - (to.top + to.height / 2);
  const away = { transform: `translate(${dx}px,${dy}px) scale(${from.height / (to.height || 1)})`, opacity: reverse ? 0 : 0.6 };
  const home = { transform: "none", opacity: 1 };
  element.animate(reverse ? [home, away] : [away, home], reverse
    ? { duration: RETURN_MS, delay, easing: "cubic-bezier(.45,0,.2,1)", fill: "forwards" }
    : { duration: 650, delay, easing: "cubic-bezier(.34,1.45,.64,1)", fill: "backwards" });
}

export function GlyphGlobe({ mode, disabled, reducedMotion, globeRef, onToggle }: {
  mode: GlyphMode;
  disabled: boolean;
  reducedMotion: boolean;
  globeRef: RefObject<HTMLButtonElement | null>;
  onToggle: () => void;
}) {
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const crossRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const crossRef = useRef<HTMLButtonElement>(null);
  const hoverRef = useRef(false);
  // Kept across bursts, so the globe re-forms exactly where the X's characters return to.
  const angleRef = useRef(0.6);
  const previousMode = useRef(mode);
  // During the exit the globe re-forms as the X's characters arrive, rather than after every letter has landed.
  const [reforming, setReforming] = useState(false);
  const spent = mode === "active" || (mode === "collapsing" && !reforming);
  useEffect(() => {
    if (mode !== "collapsing") return;
    const timer = window.setTimeout(() => setReforming(true), CROSS_RETURN_DELAY_MS + RETURN_MS * 0.6);
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

  // The X's characters snap out of the globe on entry, centre first and arms outward, and fly back into it on exit.
  useLayoutEffect(() => {
    const previous = previousMode.current;
    previousMode.current = mode;
    const pairs = CROSS_INDEX.map((index, order) => ({ globe: charRefs.current[index], cross: crossRefs.current[order], ring: Math.ceil(order / 4) }));
    if (mode === "active" && previous === "loading") {
      // The globe is now disabled; a keyboard user's focus moves to the control that replaced it.
      if (document.activeElement === globeRef.current || document.activeElement === document.body) crossRef.current?.focus({ preventScroll: true });
      pairs.forEach(({ globe, cross, ring }, order) => { if (globe && cross) flip(cross, globe.getBoundingClientRect(), cross.getBoundingClientRect(), false, 80 + ring * 70 + order * 12); });
    }
    if (mode === "collapsing") {
      pairs.forEach(({ globe, cross, ring }, order) => { if (globe && cross) flip(cross, globe.getBoundingClientRect(), cross.getBoundingClientRect(), true, CROSS_RETURN_DELAY_MS + (2 - ring) * 50 + order * 10); });
    }
  }, [globeRef, mode]);

  const warm = () => { hoverRef.current = true; preloadSwarm(); };

  return <>
    <button ref={globeRef} type="button" className={`glyph-globe text-captionSans${spent ? " is-spent" : ""}`}
      aria-label="Play with the letters" disabled={disabled || mode !== "idle"} onClick={onToggle}
      onPointerEnter={warm} onPointerLeave={() => { hoverRef.current = false; }} onFocus={preloadSwarm} onTouchStart={preloadSwarm}>
      <span className="glyph-globe-sphere" aria-hidden="true">
        {GLOBE_CHARS.map((char, index) => <span key={index} ref={element => { charRefs.current[index] = element; }}
          className="glyph-globe-char" data-cross={CROSS_INDEX.includes(index) ? "" : undefined}>{char}</span>)}
      </span>
    </button>
    {/* The X takes the globe's place, so it sits where the swarm came from rather than over the page. */}
    {(mode === "active" || mode === "collapsing") && <button ref={crossRef} type="button" className="glyph-cross text-captionSans" aria-label="Put the letters back"
      aria-keyshortcuts="Escape" disabled={mode === "collapsing"} onClick={onToggle}>
      <span className="glyph-cross-arms" aria-hidden="true">
        {CROSS_INDEX.map((index, order) => <span key={index} ref={element => { crossRefs.current[order] = element; }} className="glyph-cross-char"
          style={{ "--cross-x": CROSS_POINTS[order][0], "--cross-y": CROSS_POINTS[order][1] } as CSSProperties}>{GLOBE_CHARS[index]}</span>)}
      </span>
    </button>}
  </>;
}
