"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { useColorScramble } from "@/hooks/use-color-scramble";
import { useSpotify } from "@/hooks/use-spotify";
import { trackPositionAt } from "@/lib/track-clock";
import { InspectableText } from "@/components/design-inspector";
import { AlbumArtwork } from "@/components/album-artwork";
import { FILTER_SCRAMBLE } from "@/lib/text-scramble";

export function HomepageIdentity() {
  return <span className="homepage-identity-frame">
    <button type="button" className="homepage-identity hover-surface" data-inspector-toggle aria-label="Open design controls">
    {/* Keep detail for high-density screens and pinch zoom instead of optimizing to the tiny display size. */}
    <span className="homepage-avatar"><Image src="/images/profile/headshot-v2-384.webp" alt="Liam Fennell" width={384} height={384} unoptimized priority /></span>
    </button>
  </span>;
}

function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
/** 4 is the widest digit in ABC Oracle, so this copy is never narrower than the real time. */
function widestDigits(text: string) {
  return text.replace(/\d/g, "4");
}
function formatAgo(timestamp: string | null | undefined, now: number) {
  if (!timestamp) return "Recently";
  if (!now) return "Recently";
  const minutes = Math.max(1, Math.floor((now - new Date(timestamp).getTime()) / 60_000));
  if (!Number.isFinite(minutes)) return "Recently";
  return minutes < 60 ? `${minutes}m ago` : minutes < 1440 ? `${Math.floor(minutes / 60)}h ago` : `${Math.floor(minutes / 1440)}d ago`;
}

/** Glyph-scrambles in on mount; the track line remounts per song, so this plays on song changes. */
function ScrambledTrackText({ text }: { text: string }) {
  const { ref } = useColorScramble({
    ...FILTER_SCRAMBLE, text, playOnMount: true,
    // Keep long titles as quick as the short filter labels.
    step: Math.max(1, Math.ceil(text.length / 24)),
  });
  return <span ref={ref}>{text}</span>;
}

function TrackText({ text, scramble }: { text: string; scramble: boolean }) {
  return <InspectableText text={text}>{scramble ? <ScrambledTrackText text={text} /> : text}</InspectableText>;
}

export function HomepageSpotify() {
  const { data, cachedAt } = useSpotify();
  const reducedMotion = useReducedMotion();
  const title = data?.title ?? null;
  const artist = data?.artist ?? null;
  // Scramble only the parts that changed when one song replaces another, not when the first song appears.
  const [trackChange, setTrackChange] = useState({ title, artist, scrambleTitle: false, scrambleArtist: false });
  if (trackChange.title !== title || trackChange.artist !== artist) {
    const hadTrack = trackChange.title !== null;
    setTrackChange({
      title,
      artist,
      scrambleTitle: hadTrack && trackChange.title !== title,
      scrambleArtist: hadTrack && trackChange.artist !== artist,
    });
  }
  const [now, setNow] = useState(0);
  const trackLine = useRef<HTMLSpanElement>(null);
  const trackContent = useRef<HTMLSpanElement>(null);
  const [trackOverflow, setTrackOverflow] = useState(0);
  useEffect(() => {
    const line = trackLine.current;
    const content = trackContent.current;
    if (!line || !content) return;
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const width = Math.max(content.scrollWidth, content.getBoundingClientRect().width);
      setTrackOverflow(Math.max(0, Math.ceil(width - line.clientWidth)));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(line);
    observer.observe(content);
    document.fonts.ready.then(measure);
    measure();
    return () => { cancelled = true; observer.disconnect(); };
  }, [data?.title, data?.artist]);
  // Redraw on the device clock's whole seconds; the footer palette strip slides on the same beat.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setNow(Date.now()));
    let timer = 0;
    const tick = () => {
      setNow(Date.now());
      timer = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    timer = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    return () => { window.cancelAnimationFrame(frame); window.clearTimeout(timer); };
  }, []);
  const progress = data ? trackPositionAt(data, now) : null;
  const trackTime = data?.isPlaying ? progress !== null ? formatDuration(progress) : "Now" : formatAgo(data?.playedAt ?? cachedAt, now);
  return <a className="homepage-spotify text-bodySans hover-surface" href={data?.songUrl ?? "https://open.spotify.com"} target="_blank" rel="noreferrer" aria-label={data ? `${data.isPlaying ? "Listening now" : "Last listened to"}: ${data.title} by ${data.artist} on Spotify` : "Spotify"}>
    <span className={`homepage-album-badge homepage-slide-badge${data?.isPlaying ? " is-playing" : ""}`}>
      <span className="homepage-brand homepage-spotify-brand"><span className="homepage-spotify-logo" /></span>
      <AlbumArtwork src={data?.albumImageUrl} />
    </span>
    <span className="homepage-track-info">
      <span className={`homepage-listening text-captionSans${data?.isPlaying ? " is-playing" : ""}`}>
        <InspectableText text={data?.isPlaying ? "Listening now..." : "Last listened to"}>{data?.isPlaying ? <>Listening now<span className="identity-status-dots" aria-hidden="true">
          <span className="identity-status-dot">.</span>
          <span className="identity-status-dot">.</span>
          <span className="identity-status-dot">.</span>
        </span></> : "Last listened to"}</InspectableText>
      </span>
      <span ref={trackLine} key={`${data?.title}-${data?.artist}`}
        className={`homepage-track${trackOverflow > 1 ? " is-overflowing" : ""}`}
        style={{ "--identity-song-marquee-offset": `-${trackOverflow}px` } as CSSProperties}>
        <span ref={trackContent} className="homepage-track-marquee"><span className="homepage-title">{data ? <TrackText text={data.title} scramble={trackChange.scrambleTitle && !reducedMotion} /> : <InspectableText>Loading track…</InspectableText>}</span>{data && <><wbr /><span className="homepage-artist"><TrackText text={data.artist} scramble={trackChange.scrambleArtist && !reducedMotion} /></span></>}</span>
        <span className="homepage-track-fade homepage-track-fade-left" aria-hidden="true" />
        <span className="homepage-track-fade homepage-track-fade-right" aria-hidden="true" />
      </span>
    </span>
    <span className="homepage-track-time text-captionSans">
      <span className="homepage-track-time-reserve" aria-hidden="true">{widestDigits(trackTime)}</span>
      <span><InspectableText>{trackTime}</InspectableText></span>
    </span>
  </a>;
}
