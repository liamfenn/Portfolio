"use client";

import Image from "next/image";
import { animate, motion, useReducedMotion } from "motion/react";
import { useSmoothCorners } from "@lisse/react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useSpotify } from "@/hooks/use-spotify";

const STACK_SPRING = {
  type: "spring",
  stiffness: 320,
  damping: 30,
  mass: 0.7,
} as const;

const SURFACE_TRANSITION = {
  duration: 0.16,
  ease: [0.16, 1, 0.3, 1],
} as const;

export function IdentitySpotify() {
  const { data } = useSpotify();
  const prefersReducedMotion = useReducedMotion();
  const [isTapped, setIsTapped] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [songOverflow, setSongOverflow] = useState(0);
  const exitCollapseTimer = useRef<number | null>(null);
  const hoverExitTimer = useRef<number | null>(null);
  const songLineRef = useRef<HTMLSpanElement>(null);
  const songMarqueeRef = useRef<HTMLSpanElement>(null);
  const avatarSurfaceRef = useRef<HTMLSpanElement>(null);
  const albumSurfaceRef = useRef<HTMLSpanElement>(null);
  const avatarStrokeValue = useRef(1);
  const albumStrokeValue = useRef(3.071);
  const albumRadiusValue = useRef(15.35);
  const [avatarStrokeWidth, setAvatarStrokeWidth] = useState(1);
  const [albumStrokeWidth, setAlbumStrokeWidth] = useState(3.071);
  const [smoothedAlbumRadius, setSmoothedAlbumRadius] = useState(15.35);

  useEffect(() => {
    return () => {
      if (hoverExitTimer.current !== null) {
        window.clearTimeout(hoverExitTimer.current);
      }

      if (exitCollapseTimer.current !== null) {
        window.clearTimeout(exitCollapseTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateCompactState = () => {
      setIsCompact(mediaQuery.matches);
    };

    updateCompactState();
    mediaQuery.addEventListener("change", updateCompactState);
    return () => mediaQuery.removeEventListener("change", updateCompactState);
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

  const toggleMobileState = () => {
    if (window.matchMedia("(hover: none)").matches) {
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
  const isAvatarFront = isTapped || isHovered;
  const stackOffset = isCompact ? 8 : 9;
  const smallScale = isCompact ? 24 / 36 : 28 / 43;
  const frontStroke = isCompact ? 2.25 : 3.071;
  const backStroke = isCompact ? 0.75 : 1;
  const albumInnerStroke = isCompact ? 0.75 : 0.9;
  const albumFrontRadius = isCompact ? 12 : 15.35;
  const albumBackRadius = isCompact ? 10 : 12;
  const layerTransition = prefersReducedMotion ? { duration: 0 } : STACK_SPRING;
  const getLayerTarget = (isFront: boolean) => ({
    x: isFront ? 0 : stackOffset,
    y: isFront ? 0 : stackOffset,
    scale: isFront ? smallScale : 1,
  });

  useEffect(() => {
    const nextAvatarStroke = isAvatarFront ? frontStroke : backStroke;
    const nextAlbumStroke = isAvatarFront ? backStroke : frontStroke;
    const nextAlbumRadius = isAvatarFront ? albumBackRadius : albumFrontRadius;

    const animationOptions = {
      duration: prefersReducedMotion ? 0 : SURFACE_TRANSITION.duration,
      ease: SURFACE_TRANSITION.ease,
    } as const;
    const animations = [
      animate(avatarStrokeValue.current, nextAvatarStroke, {
        ...animationOptions,
        onUpdate: (value) => {
          avatarStrokeValue.current = value;
          setAvatarStrokeWidth(value);
        },
      }),
      animate(albumStrokeValue.current, nextAlbumStroke, {
        ...animationOptions,
        onUpdate: (value) => {
          albumStrokeValue.current = value;
          setAlbumStrokeWidth(value);
        },
      }),
      animate(albumRadiusValue.current, nextAlbumRadius, {
        ...animationOptions,
        onUpdate: (value) => {
          albumRadiusValue.current = value;
          setSmoothedAlbumRadius(value);
        },
      }),
    ];

    return () => animations.forEach((animation) => animation.stop());
  }, [
    albumBackRadius,
    albumFrontRadius,
    backStroke,
    frontStroke,
    isAvatarFront,
    prefersReducedMotion,
  ]);

  useSmoothCorners(
    avatarSurfaceRef,
    { radius: 999, smoothing: 0.6 },
    {
      autoEffects: false,
      effects: {
        middleBorder: {
          width: avatarStrokeWidth,
          color: "#fff",
          opacity: 1,
        },
      },
    },
  );

  useSmoothCorners(
    albumSurfaceRef,
    { radius: smoothedAlbumRadius, smoothing: 0.6 },
    {
      autoEffects: false,
      effects: {
        innerBorder: {
          width: albumInnerStroke,
          color: "#000",
          opacity: 0.08,
        },
        ...(isCompact
          ? {
              middleBorder: {
                width: albumStrokeWidth,
                color: "#fff",
                opacity: 1,
              },
            }
          : {
              outerBorder: {
                width: albumStrokeWidth,
                color: "#fff",
                opacity: 1,
              },
            }),
      },
    },
  );

  return (
    <div
      className={`identity-spotify${isTapped ? " is-tapped" : ""}${isHovered ? " is-hovered" : ""}${isExiting ? " is-exiting" : ""}`}
      onPointerEnter={triggerHoverInMotion}
      onPointerLeave={triggerHoverOutMotion}
    >
      <div className="identity-artwork">
        <motion.span
          className="identity-card-motion identity-avatar-motion"
          aria-hidden="true"
          initial={false}
          animate={getLayerTarget(isAvatarFront)}
          transition={layerTransition}
          style={{ zIndex: isAvatarFront ? 2 : 1 }}
        >
          <motion.span
            ref={avatarSurfaceRef}
            className="identity-avatar"
          >
            <Image
              src="/images/profile-v2.png"
              alt=""
              width={1536}
              height={1920}
              priority
            />
          </motion.span>
        </motion.span>
        <motion.span
          className="identity-card-motion identity-album-motion"
          aria-hidden="true"
          initial={false}
          animate={getLayerTarget(!isAvatarFront)}
          transition={layerTransition}
          style={{ zIndex: isAvatarFront ? 1 : 2 }}
        >
          <motion.span
            ref={albumSurfaceRef}
            className="identity-album"
          >
            {data?.albumImageUrl ? (
              <Image src={data.albumImageUrl} alt="" fill sizes="44px" />
            ) : null}
          </motion.span>
        </motion.span>
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
              {data.isPlaying ? (
                <Image
                  className="identity-status-spotify-logo"
                  src="/images/icons/spotify-live.svg"
                  alt=""
                  width={10}
                  height={10}
                />
              ) : null}
              <span>
                {status}
                {data.isPlaying ? (
                  <span className="identity-status-dots" aria-hidden="true">
                    <span className="identity-status-dot">.</span>
                    <span className="identity-status-dot">.</span>
                    <span className="identity-status-dot">.</span>
                  </span>
                ) : null}
              </span>
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
