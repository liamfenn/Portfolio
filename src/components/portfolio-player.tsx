"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { formatDuration, formatAgo, TrackText } from "@/components/homepage-identity";
import { AlbumArtwork } from "@/components/album-artwork";
import { InspectableText } from "@/components/design-inspector";
import { SkeletonText } from "@/components/skeleton";
import { useSpotify } from "@/hooks/use-spotify";
import { trackPositionAt } from "@/lib/track-clock";

export function PortfolioPlayer() {
  const [now, setNow] = useState(0);
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
  }, [title, artist]);

  useEffect(() => {
    let timer = 0;
    const tick = () => { setNow(Date.now()); timer = window.setTimeout(tick, 1000 - Date.now() % 1000); };
    tick();
    return () => window.clearTimeout(timer);
  }, []);

  const position = data ? trackPositionAt(data, now) : null;
  const time = data?.isPlaying ? position === null ? "Now" : formatDuration(position) : formatAgo(data?.playedAt ?? cachedAt, now);

  return <a className={`portfolio-player hover-surface${data?.isPlaying ? " is-playing" : ""}`} href={data?.songUrl ?? "https://open.spotify.com"}
    target="_blank" rel="noreferrer" aria-label={data ? `${data.isPlaying ? "Listening now" : "Last listened to"}: ${data.title} by ${data.artist} on Spotify` : "Open Spotify"}>
    <AlbumArtwork src={data?.albumImageUrl} />
    <span className="player-brand"><span className="player-logo" /></span>
    <span className="player-track text-bodySans">
      <span ref={trackLine} className={`player-track-copy${overflow > 1 ? " is-overflowing" : ""}`} style={{ "--identity-song-marquee-offset": `-${overflow}px` } as CSSProperties}>
        <span ref={trackContent} className="player-track-marquee" key={`${title}-${artist}`}>
          <SkeletonText loading={!data} label="Loading track">{data ? <TrackText text={data.title} scramble={change.titleChanged && !reducedMotion} /> : <InspectableText>Loading track…</InspectableText>}</SkeletonText>
          {data && <span className="player-secondary"><TrackText text={data.artist} scramble={change.artistChanged && !reducedMotion} /></span>}
        </span>
        <span className="player-track-fade player-track-fade-left" aria-hidden="true" /><span className="player-track-fade player-track-fade-right" aria-hidden="true" />
      </span>
      {data && <span className={`player-track-time text-captionSans${data.isPlaying ? " is-playing" : ""}`} data-hover-glitch-skip><InspectableText>{time}</InspectableText></span>}
    </span>
  </a>;
}
