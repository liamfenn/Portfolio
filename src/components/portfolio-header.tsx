"use client";

import Image from "next/image";
import { useEffect, useEffectEvent, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { formatDuration, formatAgo, TrackText } from "@/components/homepage-identity";
import { AlbumArtwork } from "@/components/album-artwork";
import { InspectableText } from "@/components/design-inspector";
import { SkeletonText } from "@/components/skeleton";
import { useSpotify } from "@/hooks/use-spotify";
import { trackPositionAt } from "@/lib/track-clock";

export function PortfolioHeader() {
  const [open, setOpen] = useState<"identity" | "spotify" | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [now, setNow] = useState(0);
  const header = useRef<HTMLDivElement>(null);
  const { data, cachedAt } = useSpotify();
  const reducedMotion = useReducedMotion();
  const trackLine = useRef<HTMLSpanElement>(null);
  const trackContent = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);
  const title = data?.title ?? null, artist = data?.artist ?? null;
  const [change, setChange] = useState({ title, artist, titleChanged: false, artistChanged: false });
  if (change.title !== title || change.artist !== artist) {
    setChange({ title, artist, titleChanged: change.title !== null && change.title !== title, artistChanged: change.artist !== null && change.artist !== artist });
  }
  useEffect(() => {
    const line = trackLine.current, content = trackContent.current;
    if (!line || !content) return;
    let cancelled = false;
    const measure = () => { if (!cancelled) setOverflow(Math.max(0, Math.ceil(content.scrollWidth - line.clientWidth))); };
    const observer = new ResizeObserver(measure);
    observer.observe(line); observer.observe(content);
    document.fonts.ready.then(measure); measure();
    return () => { cancelled = true; observer.disconnect(); };
  }, [title, artist, scrolled]);

  const escape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== "Escape" || !open) return;
    event.preventDefault(); event.stopPropagation();
    header.current?.querySelector<HTMLButtonElement>(`[aria-controls="header-${open}"]`)?.focus();
    setOpen(null);
  });

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 72);
    let timer = 0;
    const tick = () => { setNow(Date.now()); timer = window.setTimeout(tick, 1000 - Date.now() % 1000); };
    update();
    tick();
    window.addEventListener("scroll", update, { passive: true });

    const dismiss = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setOpen(null);
    };
    const onKey = (event: KeyboardEvent) => escape(event);
    window.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", dismiss);
    return () => {
      window.removeEventListener("scroll", update);
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", onKey, true);
    };
  }, []);

  const position = data ? trackPositionAt(data, now) : null;
  const time = data?.isPlaying ? position === null ? "Now" : formatDuration(position) : formatAgo(data?.playedAt ?? cachedAt, now);

  return <div ref={header} className={`portfolio-header${scrolled ? " is-scrolled" : ""}`} data-open={open ?? undefined}>
    <div className={`header-identity header-control${open === "identity" ? " is-open" : ""}`}
      onPointerEnter={event => { if (event.pointerType === "mouse" && matchMedia("(hover: hover) and (pointer: fine)").matches) setOpen("identity"); }}
      onPointerLeave={event => { if (event.pointerType === "mouse" && matchMedia("(hover: hover) and (pointer: fine)").matches) setOpen(null); }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(null); }}>
      <button className="header-avatar hover-surface" type="button" aria-label="About Liam Fennell"
        aria-expanded={open === "identity"} aria-controls="header-identity"
        onClick={event => setOpen(value => event.detail && matchMedia("(hover: hover) and (pointer: fine)").matches ? "identity" : value === "identity" ? null : "identity")}>
        <Image src="/images/redesign/avatar.webp" width={384} height={384} alt="Liam Fennell" priority unoptimized />
      </button>
      <div id="header-identity" className="header-reveal" inert={open !== "identity"}>
        <a className="header-shop hover-surface" href="https://shop.com" target="_blank" rel="noreferrer" aria-label="Shop">
          {/* The asset includes the badge background and its original 32px geometry. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/redesign/shop-badge.svg" alt="" />
        </a>
        <div className="header-panel text-captionSans">
          <button className="header-name" type="button" data-inspector-toggle aria-label="Open design controls"><InspectableText>Liam Fennell</InspectableText></button>
          <span className="header-secondary"><InspectableText>Staff Product Designer</InspectableText></span>
        </div>
      </div>
    </div>
    <div className={`header-spotify header-control${data?.isPlaying ? " is-playing" : ""}${open === "spotify" ? " is-open" : ""}`}
      onPointerEnter={event => { if (event.pointerType === "mouse" && matchMedia("(hover: hover) and (pointer: fine)").matches) setOpen("spotify"); }}
      onPointerLeave={event => { if (event.pointerType === "mouse" && matchMedia("(hover: hover) and (pointer: fine)").matches) setOpen(null); }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(null); }}>
      <button className="header-music-toggle hover-surface" type="button" aria-label={data ? `${data.isPlaying ? "Listening now" : "Last listened to"}: ${data.title} by ${data.artist}` : "Show Spotify track"}
        aria-expanded={open === "spotify"} aria-controls="header-spotify"
        onClick={event => setOpen(value => event.detail && matchMedia("(hover: hover) and (pointer: fine)").matches ? "spotify" : value === "spotify" ? null : "spotify")}>
        <AlbumArtwork src={data?.albumImageUrl} />
        <span className="header-spotify-brand">
          <span className="header-spotify-logo" />
        </span>
      </button>
      <div id="header-spotify" className="header-reveal" inert={open !== "spotify"}>
        <a className="header-panel header-track hover-surface text-bodySans" href={data?.songUrl ?? "https://open.spotify.com"}
          target="_blank" rel="noreferrer" aria-label={data ? `${data.title} by ${data.artist} on Spotify` : "Open Spotify"}>
          <span ref={trackLine} className={`header-track-copy${overflow > 1 ? " is-overflowing" : ""}`} style={{ "--identity-song-marquee-offset": `-${overflow}px` } as CSSProperties}>
            <span ref={trackContent} className="header-track-marquee" key={`${title}-${artist}`}>
              <SkeletonText loading={!data} label="Loading track">{data ? <TrackText text={data.title} scramble={change.titleChanged && !reducedMotion} /> : <InspectableText>Loading track…</InspectableText>}</SkeletonText>
              {data && <span className="header-secondary"><TrackText text={data.artist} scramble={change.artistChanged && !reducedMotion} /></span>}
            </span>
            <span className="header-track-fade header-track-fade-left" aria-hidden="true" /><span className="header-track-fade header-track-fade-right" aria-hidden="true" />
          </span>
          {data && <span className={`header-track-time text-captionSans${data.isPlaying ? " is-playing" : ""}`}><InspectableText>{time}</InspectableText></span>}
        </a>
      </div>
    </div>
  </div>;
}
