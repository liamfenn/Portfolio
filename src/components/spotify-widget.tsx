"use client";

import Image from "next/image";
import { useSpotify } from "@/hooks/use-spotify";
import { useRef, useState, useEffect } from "react";

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "1m ago";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function SpotifyWidget() {
  const { data, cachedAt, isLoading } = useSpotify();
  const [hovered, setHovered] = useState(false);
  const [, tick] = useState(0);

  // Re-render periodically when paused so "Xm ago" updates
  // Scale interval: every 60s for first hour, then every hour after
  const timeRef = data?.playedAt ?? cachedAt;
  useEffect(() => {
    if (data?.isPlaying || !timeRef) return;
    const getInterval = () => {
      const diffMs = Date.now() - new Date(timeRef).getTime();
      const diffMins = diffMs / (1000 * 60);
      return diffMins < 60 ? 60000 : 3600000;
    };
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        tick((t) => t + 1);
        schedule();
      }, getInterval());
    };
    schedule();
    return () => clearTimeout(timer);
  }, [data?.isPlaying, timeRef]);

  if (isLoading && !data) {
    return <SpotifySkeleton />;
  }

  if (!data) {
    return null;
  }

  const isActive = data.isPlaying;
  const timeAgo = data.playedAt
    ? formatTimeAgo(data.playedAt)
    : cachedAt
      ? formatTimeAgo(cachedAt)
      : "recently";

  return (
    <a
      href={data.songUrl}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="spotify-widget flex items-center gap-4 w-full pl-4 pr-5 py-2 rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-foreground/20 outline-none"
      style={{ backgroundColor: hovered ? "rgba(245, 245, 245, 0.6)" : "#f5f5f5" }}
    >
      {/* Album art + track info wrapper */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* Album art */}
        <div className="relative w-[28px] h-[28px] md:w-[32px] md:h-[32px] rounded-[8px] md:rounded-[10px] overflow-hidden shrink-0 shadow-[3px_3px_4px_0px_rgba(0,0,0,0.12)]">
          {data.albumImageUrl && (
            <Image
              src={data.albumImageUrl}
              alt={data.title}
              fill
              className="object-cover"
            />
          )}
        </div>

        {/* Track info */}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="type-secondary text-muted-foreground">
            {isActive ? "Listening to..." : "Last listened to"}
          </span>
          <MarqueeText title={data.title} artist={data.artist} hovered={hovered} isActive={isActive} />
        </div>
      </div>

      {/* Right side: Now/timer crossfades to "View" on hover */}
      <div className="relative shrink-0 grid items-center pr-1">
        <div
          className="col-start-1 row-start-1 flex items-center gap-3 justify-end transition-all duration-200"
          style={{
            opacity: hovered ? 0 : 1,
            filter: hovered ? "blur(4px)" : "blur(0px)",
            transform: hovered ? "scale(0.9)" : "scale(1)",
          }}
        >
          {isActive && (
            <span className="w-[4px] h-[4px] rounded-full bg-spotify-green animate-pulse-deep" />
          )}
          <span className={`type-mono-sm ${isActive ? "text-spotify-green" : "text-muted-foreground"}`}>
            {isActive ? "Now" : timeAgo}
          </span>
        </div>
        <div
          className="col-start-1 row-start-1 flex items-center gap-3 justify-end transition-all duration-200"
          style={{
            opacity: hovered ? 1 : 0,
            filter: hovered ? "blur(0px)" : "blur(4px)",
            transform: hovered ? "scale(1)" : "scale(0.8)",
          }}
        >
          <span className={`type-mono-sm ${isActive ? "text-spotify-green" : "text-muted-foreground"}`}>
            View
          </span>
        </div>
      </div>
    </a>
  );
}

function MarqueeText({ title, artist, hovered, isActive }: { title: string; artist: string; hovered: boolean; isActive: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(0);

  useEffect(() => {
    function measure() {
      const container = containerRef.current;
      const text = textRef.current;
      if (!container || !text) return;
      const diff = text.scrollWidth - container.clientWidth;
      // Add gradient width (24px) so text fully clears the fade
      setOverflow(diff > 2 ? diff + 24 : 0);
    }
    // Measure after fonts load to get accurate widths
    if (document.fonts?.ready) {
      document.fonts.ready.then(measure);
    } else {
      measure();
    }
  }, [title, artist]);

  return (
    <div className="relative overflow-hidden min-w-0" ref={containerRef}>
      {overflow > 0 && (
        <div
          className="absolute right-0 top-0 bottom-0 w-6 z-10 pointer-events-none"
          style={{ background: `linear-gradient(to left, ${hovered ? "#f9f9f9" : "#f5f5f5"}, transparent)` }}
        />
      )}
      <div
        ref={textRef}
        className={`spotify-marquee flex items-center gap-1 whitespace-nowrap w-fit${overflow > 0 && !hovered ? " spotify-marquee-active" : ""}`}
        style={{
          ...(overflow > 0 ? { "--marquee-offset": `-${overflow}px` } as React.CSSProperties : {}),
          ...(hovered ? { transform: "translateX(0)", transition: "transform 0.4s ease-out" } : {}),
        }}
      >
        <span
          className="inline-flex items-center transition-all duration-200 overflow-hidden"
          style={{
            width: hovered ? "14px" : "0px",
            marginRight: hovered ? "2px" : "-4px",
          }}
        >
          <SpotifyIcon
            className={`w-[14px] h-[14px] shrink-0 transition-all duration-200 ${isActive ? "text-spotify-green" : ""}`}
            style={{
              color: isActive ? undefined : "#555",
              opacity: hovered ? 1 : 0,
              filter: hovered ? "blur(0px)" : "blur(4px)",
              transform: hovered ? "scale(1)" : "scale(0.8)",
            }}
          />
        </span>
        <span className="type-secondary" style={{ color: "#555" }}>
          {title}
        </span>
        <span className="type-secondary" style={{ color: "#999" }}>
          ·
        </span>
        <span className="type-secondary" style={{ color: "#999" }}>
          {artist}
        </span>
      </div>
      {overflow > 0 && (
        <div
          className="spotify-marquee-left-fade absolute left-0 top-0 bottom-0 w-6 z-10 pointer-events-none"
          style={{
            background: `linear-gradient(to right, ${hovered ? "#f9f9f9" : "#f5f5f5"}, transparent)`,
            "--marquee-duration": "var(--marquee-duration, 10s)",
          } as React.CSSProperties}
        />
      )}
    </div>
  );
}

function SpotifySkeleton() {
  return (
    <div className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-full bg-card animate-pulse">
      <div className="w-[28px] h-[28px] md:w-[32px] md:h-[32px] rounded-[8px] md:rounded-[10px] bg-muted-foreground/20" />
      <div className="flex flex-col gap-1 flex-1">
        <div className="h-3 w-20 bg-muted-foreground/20 rounded" />
        <div className="h-4 w-32 bg-muted-foreground/20 rounded" />
      </div>
    </div>
  );
}


function SpotifyIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}
