"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { formatDuration, formatAgo, TrackText } from "@/components/homepage-identity";
import { AlbumArtwork } from "@/components/album-artwork";
import { InspectableText } from "@/components/design-inspector";
import { ProjectSortControl } from "@/components/project-sort-control";
import { SkeletonText } from "@/components/skeleton";
import { useColorScramble } from "@/hooks/use-color-scramble";
import { useSpotify } from "@/hooks/use-spotify";
import { advanceHandoff, cssDurationMs, handoffLine, handoffOffset } from "@/lib/header-handoff";
import { FILTER_SCRAMBLE } from "@/lib/text-scramble";
import { trackPositionAt } from "@/lib/track-clock";

const TOP_LABEL = "Top";

function ScrambledTopLabel({ active }: { active: boolean }) {
  const { ref } = useColorScramble({
    ...FILTER_SCRAMBLE, text: active ? TOP_LABEL : " ".repeat(TOP_LABEL.length), ignore: [], playOnMount: false,
  });
  return <span ref={ref} aria-hidden="true">{" ".repeat(TOP_LABEL.length)}</span>;
}

export function PortfolioHeader() {
  const [condensed, setCondensed] = useState(false);
  const [docked, setDocked] = useState(false);
  const [now, setNow] = useState(0);
  const header = useRef<HTMLDivElement>(null);
  const filterSlot = useRef<HTMLDivElement>(null);
  const filterFlight = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const bar = header.current, slot = filterSlot.current, flight = filterFlight.current;
    const toolbar = document.querySelector<HTMLElement>(".feed-toolbar");
    const pageFilter = toolbar?.querySelector<HTMLElement>(".feed-sort-control");
    if (!bar || !slot || !flight || !toolbar || !pageFilter) return;
    const motionOff = matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = matchMedia("(max-width: 767px)");
    let progress = 0, frame = 0, target: 0 | 1 = 0, settled = false;
    let observer: IntersectionObserver | undefined;

    const fly = (next: 0 | 1) => {
      cancelAnimationFrame(frame);
      const duration = cssDurationMs(getComputedStyle(bar).getPropertyValue("--header-scroll-duration"));
      let last = performance.now();
      const step = (time: number) => {
        progress = advanceHandoff(progress, next, (time - last) / duration);
        last = time;
        // Read the page filter live: it keeps moving with the scroll while this one flies to or from it.
        const { x, y } = handoffOffset(pageFilter.getBoundingClientRect(), slot.getBoundingClientRect(), progress);
        flight.style.transform = `translate(${x}px, ${y}px)`;
        if (progress !== next) { frame = requestAnimationFrame(step); return; }
        flight.style.removeProperty("transform");
        if (!next) setDocked(false);
      };
      step(last);
    };
    const update = (next: 0 | 1) => {
      const first = !settled;
      settled = true;
      if (next === target) return;
      target = next;
      setCondensed(Boolean(next));
      if (next) setDocked(true);
      if (first || motionOff.matches) {
        // A page restored mid-scroll starts docked, without replaying the handoff.
        cancelAnimationFrame(frame);
        progress = next;
        flight.style.removeProperty("transform");
        if (!next) setDocked(false);
        return;
      }
      fly(next);
    };
    const observe = () => {
      observer?.disconnect();
      const box = bar.getBoundingClientRect();
      const line = handoffLine(box.top, box.height, toolbar.getBoundingClientRect().height);
      observer = new IntersectionObserver(([entry]) => {
        update(!entry.isIntersecting && entry.boundingClientRect.top < line ? 1 : 0);
      }, { rootMargin: `-${line}px 0px 0px 0px` });
      observer.observe(toolbar);
    };
    observe();
    mobile.addEventListener("change", observe);
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      mobile.removeEventListener("change", observe);
    };
  }, []);

  const position = data ? trackPositionAt(data, now) : null;
  const time = data?.isPlaying ? position === null ? "Now" : formatDuration(position) : formatAgo(data?.playedAt ?? cachedAt, now);

  return <div ref={header} className={`portfolio-header${condensed ? " is-condensed" : ""}${docked ? " is-docked" : ""}`}>
    <span className="header-fill" aria-hidden="true" />
    <div ref={filterSlot} className="header-filter text-bodySans" inert={!docked}>
      <div ref={filterFlight} className="header-filter-flight"><ProjectSortControl menuDirection="down" /></div>
    </div>
    <a className={`header-music hover-surface${data?.isPlaying ? " is-playing" : ""}`} href={data?.songUrl ?? "https://open.spotify.com"}
      target="_blank" rel="noreferrer" aria-label={data ? `${data.isPlaying ? "Listening now" : "Last listened to"}: ${data.title} by ${data.artist} on Spotify` : "Open Spotify"} inert={condensed}>
      <span className="header-music-clip">
        <AlbumArtwork src={data?.albumImageUrl} />
        <span className="header-track text-bodySans">
          <span ref={trackLine} className={`header-track-copy${overflow > 1 ? " is-overflowing" : ""}`} style={{ "--identity-song-marquee-offset": `-${overflow}px` } as CSSProperties}>
            <span ref={trackContent} className="header-track-marquee" key={`${title}-${artist}`}>
              <SkeletonText loading={!data} label="Loading track">{data ? <TrackText text={data.title} scramble={change.titleChanged && !reducedMotion} /> : <InspectableText>Loading track…</InspectableText>}</SkeletonText>
              {data && <span className="header-secondary"><TrackText text={data.artist} scramble={change.artistChanged && !reducedMotion} /></span>}
            </span>
            <span className="header-track-fade header-track-fade-left" aria-hidden="true" /><span className="header-track-fade header-track-fade-right" aria-hidden="true" />
          </span>
          {data && <span className={`header-track-time text-captionSans${data.isPlaying ? " is-playing" : ""}`}><InspectableText>{time}</InspectableText></span>}
        </span>
        <span className="header-spotify-brand"><span className="header-spotify-logo" /></span>
      </span>
    </a>
    <button className="header-avatar hover-surface" type="button" data-inspector-toggle aria-label="Open design controls">
      <Image src="/images/redesign/avatar.webp" width={384} height={384} alt="Liam Fennell" priority unoptimized />
    </button>
    <button className="header-top text-captionSans" type="button" data-hover-glitch aria-label="Back to top" inert={!condensed} onClick={event => {
      window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
      // This button goes inert at the top, so keyboard focus moves to the first thing there.
      if (!event.detail) document.querySelector<HTMLElement>(".portfolio-bio a")?.focus({ preventScroll: true });
    }}>
      <InspectableText text={TOP_LABEL}><span data-hover-glitch-text>{reducedMotion ? TOP_LABEL : <ScrambledTopLabel active={condensed} />}</span></InspectableText>
    </button>
  </div>;
}
