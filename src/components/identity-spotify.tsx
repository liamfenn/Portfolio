"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useSpotify } from "@/hooks/use-spotify";

const SWITCH_MOTION_MS = 480;
type ShuffleOrientation = "over" | "under";

type ShuffleAnimationGroup = {
  animations: Animation[];
  motion: Animation;
};

const OVER_SHUFFLE_KEYFRAMES: Keyframe[] = [
  {
    offset: 0,
    opacity: 1,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    transform:
      "translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skewX(0deg) skewY(0deg) scaleX(1) scaleY(1)",
  },
  {
    offset: 0.2,
    opacity: 0.97,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    transform:
      "translate3d(-18px, -11px, -16px) rotateX(-18deg) rotateY(38deg) rotateZ(-9deg) skewX(0deg) skewY(0deg) scaleX(0.95) scaleY(0.95)",
  },
  {
    offset: 0.54,
    opacity: 0.99,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    transform:
      "translate3d(-2px, -1px, -2px) rotateX(-3deg) rotateY(6deg) rotateZ(-2deg) skewX(0deg) skewY(0deg) scaleX(0.99) scaleY(0.99)",
  },
  {
    offset: 1,
    opacity: 1,
    transform:
      "translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skewX(0deg) skewY(0deg) scaleX(1) scaleY(1)",
  },
];

const UNDER_SHUFFLE_KEYFRAMES: Keyframe[] = [
  {
    offset: 0,
    opacity: 1,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    transform:
      "translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skewX(0deg) skewY(0deg) scaleX(1) scaleY(1)",
  },
  {
    offset: 0.2,
    opacity: 0.97,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    transform:
      "translate3d(9px, 7px, -12px) rotateX(12deg) rotateY(-28deg) rotateZ(6deg) skewX(0deg) skewY(0deg) scaleX(0.96) scaleY(0.96)",
  },
  {
    offset: 0.54,
    opacity: 0.99,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    transform:
      "translate3d(1px, 1px, -2px) rotateX(2deg) rotateY(-4deg) rotateZ(1deg) skewX(0deg) skewY(0deg) scaleX(0.99) scaleY(0.99)",
  },
  {
    offset: 1,
    opacity: 1,
    transform:
      "translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skewX(0deg) skewY(0deg) scaleX(1) scaleY(1)",
  },
];

const AVATAR_GEOMETRY_KEYFRAMES: Keyframe[] = [
  {
    transform:
      "translate3d(var(--identity-stack-offset), var(--identity-stack-offset), 0) scale(1)",
  },
  {
    transform: "translate3d(0, 0, 0) scale(var(--identity-small-scale))",
  },
];

const ALBUM_GEOMETRY_KEYFRAMES: Keyframe[] = [
  {
    borderRadius: "var(--identity-album-front-radius)",
    transform: "translate3d(0, 0, 0) scale(var(--identity-small-scale))",
  },
  {
    borderRadius: "var(--identity-album-back-radius)",
    transform:
      "translate3d(var(--identity-stack-offset), var(--identity-stack-offset), 0) scale(1)",
  },
];

const AVATAR_STROKE_KEYFRAMES: Keyframe[] = [
  { offset: 0, boxShadow: "0 0 0 var(--identity-artwork-back-stroke-width) #fff" },
  { offset: 0.48, boxShadow: "0 0 0 var(--identity-artwork-back-stroke-width) #fff" },
  { offset: 0.6, boxShadow: "0 0 0 var(--identity-artwork-front-stroke-width) #fff" },
  { offset: 1, boxShadow: "0 0 0 var(--identity-artwork-front-stroke-width) #fff" },
];

const ALBUM_STROKE_KEYFRAMES: Keyframe[] = [
  { offset: 0, boxShadow: "0 0 0 var(--identity-artwork-front-stroke-width) #fff" },
  { offset: 0.48, boxShadow: "0 0 0 var(--identity-artwork-front-stroke-width) #fff" },
  { offset: 0.6, boxShadow: "0 0 0 var(--identity-artwork-back-stroke-width) #fff" },
  { offset: 1, boxShadow: "0 0 0 var(--identity-artwork-back-stroke-width) #fff" },
];

const AVATAR_PLANE_KEYFRAMES: Keyframe[] = [
  { offset: 0, zIndex: 1 },
  { offset: 0.539, zIndex: 1 },
  { offset: 0.54, zIndex: 2 },
  { offset: 1, zIndex: 2 },
];

const ALBUM_PLANE_KEYFRAMES: Keyframe[] = [
  { offset: 0, zIndex: 3 },
  { offset: 0.539, zIndex: 3 },
  { offset: 0.54, zIndex: 1 },
  { offset: 1, zIndex: 1 },
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
  const avatarSurfaceRef = useRef<HTMLSpanElement>(null);
  const albumSurfaceRef = useRef<HTMLSpanElement>(null);
  const shuffleAnimationRef = useRef<ShuffleAnimationGroup | null>(null);
  const shuffleIntentRef = useRef<"album" | "avatar" | null>(null);
  const songLineRef = useRef<HTMLSpanElement>(null);
  const songMarqueeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    return () => {
      shuffleAnimationRef.current?.animations.forEach((animation) => animation.cancel());

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
      shuffleAnimationRef.current?.animations.forEach((animation) => animation.cancel());
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
      shuffleAnimationRef.current?.animations.forEach((animation) => animation.cancel());
      shuffleAnimationRef.current = null;
      shuffleIntentRef.current = null;
      return;
    }

    const activeAnimation = shuffleAnimationRef.current;
    if (
      activeAnimation &&
      activeAnimation.motion.playState !== "finished" &&
      activeAnimation.motion.playState !== "idle"
    ) {
      if (shuffleIntentRef.current !== backLayer) {
        shuffleIntentRef.current = backLayer;
        activeAnimation.animations.forEach((animation) => animation.reverse());
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
    const avatarLayer = avatarRef.current;
    const albumLayer = albumRef.current;
    const avatarSurface = avatarSurfaceRef.current;
    const albumSurface = albumSurfaceRef.current;
    if (!movingLayer || !avatarLayer || !albumLayer || !avatarSurface || !albumSurface) {
      return;
    }

    const direction = backLayer === "album" ? "normal" : "reverse";
    const sharedOptions: KeyframeAnimationOptions = {
      duration: SWITCH_MOTION_MS,
      direction,
      fill: "both",
      easing: "cubic-bezier(0.45, 0, 0.2, 1)",
    };
    const stagedOptions: KeyframeAnimationOptions = {
      duration: SWITCH_MOTION_MS,
      direction,
      fill: "both",
      easing: "linear",
    };
    const motion = movingLayer.animate(
      shuffleOrientation === "over" ? OVER_SHUFFLE_KEYFRAMES : UNDER_SHUFFLE_KEYFRAMES,
      {
        duration: SWITCH_MOTION_MS,
        direction: "normal",
        fill: "both",
        easing: "linear",
      },
    );
    const animations = [
      motion,
      avatarSurface.animate(AVATAR_GEOMETRY_KEYFRAMES, sharedOptions),
      albumSurface.animate(ALBUM_GEOMETRY_KEYFRAMES, sharedOptions),
      avatarSurface.animate(AVATAR_STROKE_KEYFRAMES, stagedOptions),
      albumSurface.animate(ALBUM_STROKE_KEYFRAMES, stagedOptions),
      avatarLayer.animate(AVATAR_PLANE_KEYFRAMES, stagedOptions),
      albumLayer.animate(ALBUM_PLANE_KEYFRAMES, stagedOptions),
    ];

    shuffleAnimationRef.current = { animations, motion };
    shuffleIntentRef.current = backLayer;
    motion.onfinish = () => {
      if (shuffleAnimationRef.current?.motion === motion) {
        animations.forEach((animation) => animation.cancel());
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
        <span
          ref={avatarRef}
          className="identity-card-motion identity-avatar-motion"
          aria-hidden="true"
        >
          <span ref={avatarSurfaceRef} className="identity-avatar">
            <Image
              src="/images/profile-v2.png"
              alt=""
              width={1536}
              height={1920}
              priority
            />
          </span>
        </span>
        <span
          ref={albumRef}
          className="identity-card-motion identity-album-motion"
          aria-hidden="true"
        >
          <span ref={albumSurfaceRef} className="identity-album">
            {data?.albumImageUrl ? (
              <Image src={data.albumImageUrl} alt="" fill sizes="44px" />
            ) : null}
          </span>
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
