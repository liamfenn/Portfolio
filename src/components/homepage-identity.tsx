"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useSpotify } from "@/hooks/use-spotify";

export function HomepageIdentity() {
  return <a className="homepage-identity homepage-slide-badge" href="https://shop.app" target="_blank" rel="noreferrer" aria-label="Currently at Shop">
    <span className="homepage-brand homepage-shop-brand"><Image src="/images/icons/shop-swirl.svg" alt="" width={24} height={24} /></span>
    <span className="homepage-avatar"><Image src="/images/profile-v2.png" alt="Liam Fennell" width={1536} height={1920} sizes="116px" priority /></span>
  </a>;
}

function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
function formatAgo(timestamp: string | null | undefined, now: number) {
  if (!timestamp) return "Recently";
  if (!now) return "Recently";
  const minutes = Math.max(1, Math.floor((now - new Date(timestamp).getTime()) / 60_000));
  if (!Number.isFinite(minutes)) return "Recently";
  return minutes < 60 ? `${minutes}m ago` : minutes < 1440 ? `${Math.floor(minutes / 60)}h ago` : `${Math.floor(minutes / 1440)}d ago`;
}

export function HomepageSpotify() {
  const { data, cachedAt } = useSpotify();
  const [now, setNow] = useState(0);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setNow(Date.now()));
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { window.cancelAnimationFrame(frame); window.clearInterval(timer); };
  }, []);
  const progress = data?.progressMs === undefined ? null : Math.min(data.durationMs ?? Infinity,
    data.progressMs + (data.isPlaying && data.fetchedAt && now ? Math.max(0, now - new Date(data.fetchedAt).getTime()) : 0));
  return <a className="homepage-spotify" href={data?.songUrl ?? "https://open.spotify.com"} target="_blank" rel="noreferrer" aria-label={data ? `${data.isPlaying ? "Listening now" : "Last listened to"}: ${data.title} by ${data.artist} on Spotify` : "Spotify"}>
    <span className="homepage-album-badge homepage-slide-badge">
      <span className="homepage-brand homepage-spotify-brand"><Image src="/images/icons/spotify-black.svg" alt="" width={16} height={16} /></span>
      <span className="homepage-album">{data?.albumImageUrl && <Image src={data.albumImageUrl} alt="" fill sizes="28px" />}</span>
    </span>
    <span className="homepage-track-info">
      <span className={`homepage-listening${data?.isPlaying ? " is-playing" : ""}`}>
        {data?.isPlaying ? <>Listening now<span className="identity-status-dots" aria-hidden="true">
          <span className="identity-status-dot">.</span>
          <span className="identity-status-dot">.</span>
          <span className="identity-status-dot">.</span>
        </span></> : "Last listened to"}
      </span>
      <span className="homepage-track"><span>{data?.title ?? "Loading track…"}</span>{data && <> <span className="homepage-artist">{data.artist}</span></>}</span>
    </span>
    <span className="homepage-track-time">{data?.isPlaying ? progress !== null && data.durationMs ? `${formatDuration(progress)} / ${formatDuration(data.durationMs)}` : "Now" : formatAgo(data?.playedAt ?? cachedAt, now)}</span>
  </a>;
}
