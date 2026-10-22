"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

export function AlbumArtwork({ src }: { src?: string }) {
  const reducedMotion = useReducedMotion();
  const [shown, setShown] = useState(src);
  const [loaded, setLoaded] = useState<string>();
  const outgoing = useRef<HTMLSpanElement>(null);
  const incoming = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!src || src === shown || loaded !== src) return;
    // Wait for the incoming artwork to load so a slow network never produces an empty apex.
    if (!shown || reducedMotion) {
      const frame = requestAnimationFrame(() => setShown(src));
      return () => cancelAnimationFrame(frame);
    }
    const oldLayer = outgoing.current, newLayer = incoming.current;
    if (!oldLayer || !newLayer) return;
    const tokens = getComputedStyle(document.documentElement);
    const duration = tokens.getPropertyValue("--album-swap-duration").trim();
    const blur = `blur(${tokens.getPropertyValue("--album-swap-blur").trim()})`;
    const scale = `scale(${tokens.getPropertyValue("--album-swap-scale").trim()})`;
    const timing = { duration: parseFloat(duration) * (duration.endsWith("ms") ? 1 : 1000), fill: "forwards" as const };
    const oldAnimation = oldLayer.animate([
      { filter: "blur(0px)", transform: "scale(1)", opacity: 1, offset: 0 },
      { filter: blur, transform: scale, opacity: 1, offset: 0.4 },
      { filter: blur, transform: scale, opacity: 0, offset: 0.6 },
      { filter: blur, transform: scale, opacity: 0, offset: 1 },
    ], timing);
    const newAnimation = newLayer.animate([
      { filter: blur, transform: scale, opacity: 0, offset: 0 },
      { filter: blur, transform: scale, opacity: 0, offset: 0.4 },
      { filter: blur, transform: scale, opacity: 1, offset: 0.6 },
      { filter: "blur(0px)", transform: "scale(1)", opacity: 1, offset: 1 },
    ], timing);
    let cancelled = false;
    newAnimation.finished.then(() => { if (!cancelled) setShown(src); }).catch(() => {});
    return () => {
      cancelled = true;
      oldAnimation.cancel();
      newAnimation.cancel();
    };
  }, [src, shown, loaded, reducedMotion]);

  return <span className="homepage-album" aria-hidden="true">
    <span ref={outgoing} className="album-artwork-layer">{shown && <Image src={shown} alt="" fill sizes="28px" />}</span>
    {src && src !== shown && <span ref={incoming} className="album-artwork-layer album-artwork-incoming" key={src}>
      <Image src={src} alt="" fill sizes="28px" onLoad={() => setLoaded(src)} />
    </span>}
  </span>;
}
