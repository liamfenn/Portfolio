"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useSpotify } from "@/hooks/use-spotify";

export function IdentitySpotify() {
  const { data } = useSpotify();
  const [isTapped, setIsTapped] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const switchFrame = useRef<number | null>(null);
  const switchTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (switchFrame.current !== null) {
        cancelAnimationFrame(switchFrame.current);
      }

      if (switchTimer.current !== null) {
        window.clearTimeout(switchTimer.current);
      }
    };
  }, []);

  const triggerSwitchMotion = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    setIsSwitching(false);

    if (switchFrame.current !== null) {
      cancelAnimationFrame(switchFrame.current);
    }

    if (switchTimer.current !== null) {
      window.clearTimeout(switchTimer.current);
    }

    switchFrame.current = requestAnimationFrame(() => {
      setIsSwitching(true);
      switchTimer.current = window.setTimeout(() => setIsSwitching(false), 360);
    });
  };

  const toggleMobileState = () => {
    if (window.matchMedia("(hover: none)").matches) {
      triggerSwitchMotion();
      setIsTapped((current) => !current);
    }
  };

  const triggerHoverMotion = () => {
    if (window.matchMedia("(hover: hover)").matches) {
      triggerSwitchMotion();
    }
  };

  const status = data?.isPlaying ? "Listening now" : "Last listened";

  return (
    <div
      className={`identity-spotify${isTapped ? " is-tapped" : ""}${isSwitching ? " is-switching" : ""}`}
      onPointerEnter={triggerHoverMotion}
      onPointerLeave={triggerHoverMotion}
    >
      <button
        type="button"
        className="identity-artwork"
        aria-label={isTapped ? "Hide Spotify track" : "Show Spotify track"}
        aria-expanded={isTapped}
        onClick={toggleMobileState}
      >
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
      </button>

      {data ? (
        <a
          className="identity-track"
          href={data.songUrl}
          target="_blank"
          rel="noreferrer"
        >
          <span
            className={data.isPlaying ? "identity-status is-live" : "identity-status"}
            aria-label={`${status}...`}
          >
            {status}
            <span className="identity-status-dots" aria-hidden="true">
              <span className="identity-status-dot">.</span>
              <span className="identity-status-dot">.</span>
              <span className="identity-status-dot">.</span>
            </span>
          </span>
          <span className="identity-song-line">
            <span>{data.title}</span>
            <span className="identity-track-separator" aria-hidden="true"> • </span>
            <span className="identity-artist">{data.artist}</span>
          </span>
        </a>
      ) : null}
    </div>
  );
}
