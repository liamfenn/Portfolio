"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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
  const { data } = useSpotify();

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 72);
    const tick = () => setNow(Date.now());
    update();
    tick();
    window.addEventListener("scroll", update, { passive: true });
    const timer = window.setInterval(tick, 1000);
    const dismiss = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setOpen(null);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => {
      window.removeEventListener("scroll", update);
      window.clearInterval(timer);
      document.removeEventListener("pointerdown", dismiss);
    };
  }, []);

  const position = data ? trackPositionAt(data, now) : null;
  const seconds = Math.max(0, Math.floor((position ?? 0) / 1000));
  const time = data?.isPlaying ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "Recent";

  return <div ref={header} className={`portfolio-header${scrolled ? " is-scrolled" : ""}`} data-open={open ?? undefined}
    onKeyDown={event => {
      if (event.key === "Escape") {
        header.current?.querySelector<HTMLButtonElement>(`[aria-controls="header-${open}"]`)?.focus();
        setOpen(null);
      }
    }}>
    <div className={`header-identity header-control${open === "identity" ? " is-open" : ""}`}
      onPointerEnter={event => { if (event.pointerType === "mouse") setOpen("identity"); }}
      onPointerLeave={event => { if (event.pointerType === "mouse" && !event.currentTarget.contains(document.activeElement)) setOpen(null); }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(null); }}>
      <button className="header-avatar hover-surface" type="button" aria-label="About Liam Fennell"
        aria-expanded={open === "identity"} aria-controls="header-identity"
        onClick={() => setOpen(value => value === "identity" ? null : "identity")}>
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
    <div className={`header-spotify header-control${open === "spotify" ? " is-open" : ""}`}
      onPointerEnter={event => { if (event.pointerType === "mouse") setOpen("spotify"); }}
      onPointerLeave={event => { if (event.pointerType === "mouse" && !event.currentTarget.contains(document.activeElement)) setOpen(null); }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(null); }}>
      <button className="header-music-toggle hover-surface" type="button" aria-label="Show Spotify track"
        aria-expanded={open === "spotify"} aria-controls="header-spotify"
        onClick={() => setOpen(value => value === "spotify" ? null : "spotify")}>
        <AlbumArtwork src={data?.albumImageUrl} />
        <span className="header-spotify-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/redesign/spotify.svg" alt="" />
        </span>
      </button>
      <div id="header-spotify" className="header-reveal" inert={open !== "spotify"}>
        <a className="header-panel header-track hover-surface text-bodySans" href={data?.songUrl ?? "https://open.spotify.com"}
          target="_blank" rel="noreferrer" aria-label={data ? `${data.title} by ${data.artist} on Spotify` : "Open Spotify"}>
          <span className="header-track-copy"><SkeletonText loading={!data} label="Loading track"><InspectableText>{data?.title ?? "Loading track…"}</InspectableText></SkeletonText>{data && <> <span className="header-secondary"><InspectableText>{data.artist}</InspectableText></span></>}</span>
          {data && <span className={`header-track-time text-captionSans${data.isPlaying ? " is-playing" : ""}`}><InspectableText>{time}</InspectableText></span>}
        </a>
      </div>
    </div>
  </div>;
}
