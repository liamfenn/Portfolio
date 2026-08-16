"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useSpotify } from "@/hooks/use-spotify";

export function IdentitySpotify() {
  const { data } = useSpotify();
  const [isTapped, setIsTapped] = useState(false);
  const [switchingBackLayer, setSwitchingBackLayer] = useState<"album" | "avatar" | null>(null);
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
      switchTimer.current = window.setTimeout(() => setSwitchingBackLayer(null), 360);
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
      triggerSwitchMotion("album");
    }
  };

  const triggerHoverOutMotion = () => {
    if (window.matchMedia("(hover: hover)").matches) {
      triggerSwitchMotion("avatar");
    }
  };

  const status = data?.isPlaying ? "Listening now" : "Last listened";

  return (
    <div
      className={`identity-spotify${isTapped ? " is-tapped" : ""}${switchingBackLayer ? ` is-switching is-${switchingBackLayer}-to-back` : ""}`}
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
              <span className="identity-track-separator" aria-hidden="true">•</span>
              <span className="identity-artist">{data.artist}</span>
            </span>
          </span>
        </a>
      ) : null}
    </div>
  );
}
