"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useSpotify } from "@/hooks/use-spotify";

const SWITCH_MOTION_MS = 440;

export function IdentitySpotify() {
  const { data } = useSpotify();
  const [isTapped, setIsTapped] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [songOverflow, setSongOverflow] = useState(0);
  const [switchingBackLayer, setSwitchingBackLayer] = useState<"album" | "avatar" | null>(null);
  const exitCollapseTimer = useRef<number | null>(null);
  const hoverExitTimer = useRef<number | null>(null);
  const switchFrame = useRef<number | null>(null);
  const switchTimer = useRef<number | null>(null);
  const songLineRef = useRef<HTMLSpanElement>(null);
  const songMarqueeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    return () => {
      if (switchFrame.current !== null) {
        cancelAnimationFrame(switchFrame.current);
      }

      if (switchTimer.current !== null) {
        window.clearTimeout(switchTimer.current);
      }

      if (hoverExitTimer.current !== null) {
        window.clearTimeout(hoverExitTimer.current);
      }

      if (exitCollapseTimer.current !== null) {
        window.clearTimeout(exitCollapseTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const songLine = songLineRef.current;
    const songMarquee = songMarqueeRef.current;

    if (!songLine || !songMarquee) {
      return;
    }

    let isCancelled = false;

    const measure = () => {
      if (isCancelled) {
        return;
      }

      const marqueeWidth = Math.max(
        songMarquee.scrollWidth,
        songMarquee.getBoundingClientRect().width,
      );
      const difference = marqueeWidth - songLine.clientWidth;
      setSongOverflow(difference > 2 ? difference + 24 : 0);
    };

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(songLine);
    document.fonts?.ready.then(measure);
    measure();

    return () => {
      isCancelled = true;
      resizeObserver.disconnect();
    };
  }, [data?.artist, data?.title]);

  const triggerSwitchMotion = (backLayer: "album" | "avatar") => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    setSwitchingBackLayer(null);

    if (switchFrame.current !== null) {
      cancelAnimationFrame(switchFrame.current);
    }

    if (switchTimer.current !== null) {
      window.clearTimeout(switchTimer.current);
    }

    switchFrame.current = requestAnimationFrame(() => {
      setSwitchingBackLayer(backLayer);
      switchTimer.current = window.setTimeout(
        () => setSwitchingBackLayer(null),
        SWITCH_MOTION_MS,
      );
    });
  };

  const toggleMobileState = () => {
    if (window.matchMedia("(hover: none)").matches) {
      triggerSwitchMotion(isTapped ? "avatar" : "album");
      setIsTapped((current) => !current);
    }
  };

  const triggerHoverInMotion = () => {
    if (window.matchMedia("(hover: hover)").matches) {
      if (hoverExitTimer.current !== null) {
        window.clearTimeout(hoverExitTimer.current);
        hoverExitTimer.current = null;
      }

      if (exitCollapseTimer.current !== null) {
        window.clearTimeout(exitCollapseTimer.current);
        exitCollapseTimer.current = null;
      }

      setIsExiting(false);
      setIsHovered(true);
      triggerSwitchMotion("album");
    }
  };

  const triggerHoverOutMotion = () => {
    if (window.matchMedia("(hover: hover)").matches) {
      if (hoverExitTimer.current !== null) {
        window.clearTimeout(hoverExitTimer.current);
      }

      hoverExitTimer.current = window.setTimeout(() => {
        setIsExiting(true);
        setIsHovered(false);
        triggerSwitchMotion("avatar");
        exitCollapseTimer.current = window.setTimeout(() => {
          setIsExiting(false);
          exitCollapseTimer.current = null;
        }, 180);
        hoverExitTimer.current = null;
      }, 120);
    }
  };

  const status = data?.isPlaying ? "Listening now" : "Last listened to";
  const isSongMarqueeActive = songOverflow > 0 && (isTapped || isHovered);

  return (
    <div
      className={`identity-spotify${isTapped ? " is-tapped" : ""}${isHovered ? " is-hovered" : ""}${isExiting ? " is-exiting" : ""}${switchingBackLayer ? ` is-switching is-${switchingBackLayer}-to-back` : ""}`}
      onPointerEnter={triggerHoverInMotion}
      onPointerLeave={triggerHoverOutMotion}
    >
      <div className="identity-artwork">
        <span className="identity-avatar" aria-hidden="true">
          <Image
            src="/images/profile-v2.png"
            alt=""
            width={1536}
            height={1920}
            priority
          />
        </span>
        <span className="identity-album" aria-hidden="true">
          {data?.albumImageUrl ? (
            <Image src={data.albumImageUrl} alt="" fill sizes="44px" />
          ) : null}
        </span>
        {data ? (
          <a
            className="identity-artwork-action identity-artwork-link"
            href={data.songUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${data.title} by ${data.artist} in Spotify`}
          />
        ) : null}
        <button
          type="button"
          className="identity-artwork-action identity-artwork-toggle"
          aria-label={isTapped ? "Hide Spotify track" : "Show Spotify track"}
          aria-expanded={isTapped}
          onClick={toggleMobileState}
        />
      </div>

      {data ? (
        <a
          className="identity-track"
          href={data.songUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${data.title} by ${data.artist} in Spotify`}
        >
          <span className="identity-track-content">
            <span
              className={data.isPlaying ? "identity-status is-live" : "identity-status"}
              aria-label={data.isPlaying ? `${status}...` : status}
            >
              {status}
              {data.isPlaying ? (
                <span className="identity-status-dots" aria-hidden="true">
                  <span className="identity-status-dot">.</span>
                  <span className="identity-status-dot">.</span>
                  <span className="identity-status-dot">.</span>
                </span>
              ) : null}
            </span>
            <span
              ref={songLineRef}
              className={`identity-song-line${isSongMarqueeActive ? " is-marquee-active" : ""}`}
              style={{ "--identity-song-marquee-offset": `-${songOverflow}px` } as CSSProperties}
            >
              <span ref={songMarqueeRef} className="identity-song-marquee">
                <span>{data.title}</span>
                <span className="identity-track-separator" aria-hidden="true">•</span>
                <span className="identity-artist">{data.artist}</span>
              </span>
              {songOverflow > 0 ? (
                <>
                  <span className="identity-song-fade identity-song-fade-right" aria-hidden="true" />
                  <span className="identity-song-fade identity-song-fade-left" aria-hidden="true" />
                </>
              ) : null}
            </span>
          </span>
        </a>
      ) : null}
    </div>
  );
}
