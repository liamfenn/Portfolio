"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";
import { GATHER_MS, preloadSwarm } from "@/lib/glyph-swarm";

export type GlyphMode = "idle" | "loading" | "active" | "collapsing";

// A fixed scatter of characters, so server and client render the same globe. E, s and c hide among them:
// they are the three that stay behind and become the exit.
const GLOBE_CHARS = "a&RE7?g*Q2ks@m0yt%cWb#f5j".split("");
const ESC_INDEX = [GLOBE_CHARS.indexOf("E"), GLOBE_CHARS.indexOf("s"), GLOBE_CHARS.indexOf("c")];
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
  const escRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const hoverRef = useRef(false);
  // Kept across bursts, so the globe re-forms exactly where Esc's letters return to.
  const angleRef = useRef(0.6);
  const previousMode = useRef(mode);
  // During the exit the globe re-forms as Esc's letters arrive, rather than after every letter has landed.
  const [reforming, setReforming] = useState(false);
  const spent = mode === "active" || (mode === "collapsing" && !reforming);
  useEffect(() => {
    if (mode !== "collapsing") return;
    const timer = window.setTimeout(() => setReforming(true), GATHER_MS + RETURN_MS * 0.6);
    return () => { window.clearTimeout(timer); setReforming(false); };
  }, [mode]);

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

  // Esc's letters snap out of the globe on entry, and fly back to it once the swarm has balled up.
  useLayoutEffect(() => {
    const previous = previousMode.current;
    previousMode.current = mode;
    const pairs = ESC_INDEX.map((index, order) => ({ globe: charRefs.current[index], esc: escRefs.current[order] }));
    if (mode === "active" && previous === "loading") {
      pairs.forEach(({ globe, esc }, order) => { if (globe && esc) flip(esc, globe.getBoundingClientRect(), esc.getBoundingClientRect(), false, 80 + order * 60); });
    }
    if (mode === "collapsing") {
      pairs.forEach(({ globe, esc }, order) => { if (globe && esc) flip(esc, globe.getBoundingClientRect(), esc.getBoundingClientRect(), true, GATHER_MS + order * 40); });
    }
  }, [mode]);

  const warm = () => { hoverRef.current = true; preloadSwarm(); };

  return <>
    <button ref={globeRef} type="button" className={`glyph-globe text-captionSans${spent ? " is-spent" : ""}`}
      aria-label="Play with the letters" disabled={disabled || mode !== "idle"} onClick={onToggle}
      onPointerEnter={warm} onPointerLeave={() => { hoverRef.current = false; }} onFocus={preloadSwarm} onTouchStart={preloadSwarm}>
      <span className="glyph-globe-sphere" aria-hidden="true">
        {GLOBE_CHARS.map((char, index) => <span key={index} ref={element => { charRefs.current[index] = element; }}
          className="glyph-globe-char" data-esc={ESC_INDEX.includes(index) ? "" : undefined}>{char}</span>)}
      </span>
    </button>
    {(mode === "active" || mode === "collapsing") && createPortal(<button type="button" className="glyph-esc text-captionSans" aria-label="Put the letters back"
      aria-keyshortcuts="Escape" disabled={mode === "collapsing"} onClick={onToggle}>
      {["E", "s", "c"].map((char, order) => <span key={char} ref={element => { escRefs.current[order] = element; }} aria-hidden="true">{char}</span>)}
    </button>, document.body)}
  </>;
}
