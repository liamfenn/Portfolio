"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useSpotify } from "@/hooks/use-spotify";

const SWITCH_MOTION_MS = 360;
type ShuffleOrientation = "over" | "under";

const SHUFFLE_KEYFRAMES: Keyframe[] = [
  {
    offset: 0,
    opacity: 1,
    zIndex: 3,
    transform: "translate3d(0, 0, 0) rotateY(0deg) rotateZ(0deg)",
    easing: "cubic-bezier(0.4, 0, 0.7, 0.2)",
  },
  {
    offset: 0.3,
    opacity: 0.98,
    zIndex: 3,
    transform: "translate3d(-2px, -4px, 6px) rotateY(-6deg) rotateZ(-1.5deg)",
    easing: "cubic-bezier(0.3, 0.55, 0.35, 1)",
  },
  {
    offset: 0.49,
    opacity: 0.92,
    zIndex: 3,
    transform: "translate3d(-5px, -1px, 9px) rotateY(-11deg) rotateZ(-3deg)",
    easing: "steps(1, end)",
  },
  {
    offset: 0.51,
    opacity: 0.92,
    zIndex: 1,
    transform: "translate3d(-5px, -1px, 8px) rotateY(-10deg) rotateZ(-3deg)",
    easing: "cubic-bezier(0.22, 0.7, 0.3, 1)",
  },
  {
    offset: 0.74,
    opacity: 0.97,
    zIndex: 1,
    transform: "translate3d(-2px, 2px, 2px) rotateY(-4deg) rotateZ(-1deg)",
    easing: "cubic-bezier(0.2, 0.72, 0.25, 1)",
  },
  {
    offset: 1,
    opacity: 1,
    zIndex: 1,
    transform: "translate3d(0, 0, 0) rotateY(0deg) rotateZ(0deg)",
  },
];

export function IdentitySpotify() {
  const { data } = useSpotify();
  const [isTapped, setIsTapped] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [shuffleOrientation, setShuffleOrientation] = useState<ShuffleOrientation>("over");
  const [songOverflow, setSongOverflow] = useState(0);
  const exitCollapseTimer = useRef<number | null>(null);
  const hoverExitTimer = useRef<number | null>(null);
  const avatarRef = useRef<HTMLSpanElement>(null);
  const albumRef = useRef<HTMLSpanElement>(null);
  const shuffleAnimationRef = useRef<Animation | null>(null);
  const shuffleIntentRef = useRef<"album" | "avatar" | null>(null);
  const songLineRef = useRef<HTMLSpanElement>(null);
  const songMarqueeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    return () => {
      shuffleAnimationRef.current?.cancel();

      if (hoverExitTimer.current !== null) {
        window.clearTimeout(hoverExitTimer.current);
      }

      if (exitCollapseTimer.current !== null) {
        window.clearTimeout(exitCollapseTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleShuffleShortcut = (event: KeyboardEvent) => {
      const target = event.target;
      const isEditable =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT");

      if (
        event.repeat ||
        isEditable ||
        !event.shiftKey ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.key.toLowerCase() !== "s"
      ) {
        return;
      }

      event.preventDefault();
      shuffleAnimationRef.current?.cancel();
      shuffleAnimationRef.current = null;
      shuffleIntentRef.current = null;
      setShuffleOrientation((current) => (current === "over" ? "under" : "over"));
    };

    window.addEventListener("keydown", handleShuffleShortcut);
    return () => window.removeEventListener("keydown", handleShuffleShortcut);
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
      shuffleAnimationRef.current?.cancel();
      shuffleAnimationRef.current = null;
      shuffleIntentRef.current = null;
      return;
    }

    const activeAnimation = shuffleAnimationRef.current;
    if (
      activeAnimation &&
      activeAnimation.playState !== "finished" &&
      activeAnimation.playState !== "idle"
    ) {
      if (shuffleIntentRef.current !== backLayer) {
        shuffleIntentRef.current = backLayer;
        activeAnimation.reverse();
      }
      return;
    }

    const movingLayer =
      shuffleOrientation === "over"
        ? backLayer === "album"
          ? albumRef.current
          : avatarRef.current
        : backLayer === "album"
          ? avatarRef.current
          : albumRef.current;
    if (!movingLayer) {
      return;
    }

    const animation = movingLayer.animate(SHUFFLE_KEYFRAMES, {
      duration: SWITCH_MOTION_MS,
      direction: shuffleOrientation === "under" ? "reverse" : "normal",
      easing: "linear",
    });

    shuffleAnimationRef.current = animation;
    shuffleIntentRef.current = backLayer;
    animation.onfinish = () => {
      if (shuffleAnimationRef.current === animation) {
        animation.cancel();
        shuffleAnimationRef.current = null;
        shuffleIntentRef.current = null;
      }
    };
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
      className={`identity-spotify${isTapped ? " is-tapped" : ""}${isHovered ? " is-hovered" : ""}${isExiting ? " is-exiting" : ""}`}
      data-shuffle-orientation={shuffleOrientation}
      onPointerEnter={triggerHoverInMotion}
      onPointerLeave={triggerHoverOutMotion}
    >
      <div className="identity-artwork">
        <span ref={avatarRef} className="identity-avatar" aria-hidden="true">
          <Image
            src="/images/profile-v2.png"
            alt=""
            width={1536}
            height={1920}
            priority
          />
        </span>
        <span ref={albumRef} className="identity-album" aria-hidden="true">
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
