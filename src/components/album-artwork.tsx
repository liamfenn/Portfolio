"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { currentGlyphPalette } from "@/lib/palette-toy";
import { Skeleton } from "@/components/skeleton";

const GRID_SIZE = 8;
const CELLS = Array.from({ length: GRID_SIZE ** 2 }, (_, index) => ({ x: index % GRID_SIZE, y: Math.floor(index / GRID_SIZE) }));
const milliseconds = (value: string) => parseFloat(value) * (value.trim().endsWith("ms") ? 1 : 1000);

export function AlbumArtwork({ src }: { src?: string }) {
  const reducedMotion = useReducedMotion();
  const [shown, setShown] = useState(src);
  // Retain the completed URL so a later render cannot lose the source for the swap.
  const [loaded, setLoaded] = useState<{ src: string; url: string }>();
  const [failedIncoming, setFailedIncoming] = useState<string>();
  const [hasArtwork, setHasArtwork] = useState(false);
  const pending = !hasArtwork && (!src || failedIncoming !== src);
  const incoming = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!src || src === shown || loaded?.src !== src) return;
    if (!shown || reducedMotion) {
      const frame = requestAnimationFrame(() => setShown(src));
      return () => cancelAnimationFrame(frame);
    }
    const grid = incoming.current, source = loaded.url;
    if (!grid || !source) return;
    const tokens = getComputedStyle(document.documentElement);
    const duration = milliseconds(tokens.getPropertyValue("--album-swap-duration"));
    const flashDuration = milliseconds(tokens.getPropertyValue("--album-glitch-flash-duration"));
    const palette = currentGlyphPalette();
    const cells = Array.from(grid.children) as HTMLElement[];
    const origins = Array.from({ length: 3 }, () => ({ x: Math.random() * GRID_SIZE, y: Math.random() * GRID_SIZE }));
    const order = CELLS.map((cell, index) => ({
      index,
      rank: Math.min(...origins.map(origin => Math.hypot(cell.x - origin.x, cell.y - origin.y))) + Math.random(),
    })).sort((a, b) => a.rank - b.rank);
    const animations: Animation[] = [];
    order.forEach(({ index }, position) => {
      const cell = cells[index];
      cell.style.backgroundImage = `url("${source}")`;
      const delay = position / cells.length * (duration - flashDuration - 1);
      animations.push(cell.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1, delay, fill: "forwards" }));
      // Sparse color flashes echo the text scramble without covering the artwork in static.
      if (Math.random() < 0.1 && palette.length) {
        const flash = cell.firstElementChild as HTMLElement;
        flash.style.backgroundColor = palette[Math.floor(Math.random() * palette.length)];
        animations.push(flash.animate([{ opacity: 1 }, { opacity: 0 }], { duration: flashDuration, delay, fill: "both" }));
      }
    });
    let cancelled = false;
    Promise.all(animations.map(animation => animation.finished)).then(() => {
      if (!cancelled) setShown(src);
    }).catch(() => {});
    return () => { cancelled = true; animations.forEach(animation => animation.cancel()); };
  }, [src, shown, loaded, reducedMotion]);

  return <span className="homepage-album" aria-hidden="true">
    <Skeleton active={pending} />
    <span className="album-artwork-layer">{shown && <Image onLoad={() => setHasArtwork(true)} onError={() => setFailedIncoming(shown)}
      className={shown === failedIncoming ? "loading-image-error" : undefined} src={shown} alt="" fill sizes="28px" />}</span>
    {src && src !== shown && <span key={src}>
      <span className="album-artwork-preload"><Image src={src} alt="" fill sizes="28px" onLoad={event => setLoaded({ src, url: event.currentTarget.currentSrc })} onError={() => setFailedIncoming(src)} /></span>
      <span ref={incoming} className="album-artwork-grid" style={{ "--album-grid-size": GRID_SIZE } as CSSProperties}>
        {CELLS.map(({ x, y }, index) => <span className="album-artwork-cell" key={index} style={{ backgroundPosition: `${x / (GRID_SIZE - 1) * 100}% ${y / (GRID_SIZE - 1) * 100}%` }}><span className="album-artwork-flash" /></span>)}
      </span>
    </span>}
  </span>;
}
