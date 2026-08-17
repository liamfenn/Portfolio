"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, animate, motion, useReducedMotion } from "motion/react";
import { useSmoothCorners } from "@lisse/react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useSpotify } from "@/hooks/use-spotify";
import { CASE_STUDY_NAVIGATION_EVENT } from "@/lib/case-study-navigation";
import { getCaseStudy } from "@/lib/case-studies";

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

const PROJECT_SHUFFLE_HALF_DURATION = 380;
const PROJECT_LOGO_SWAP_DELAY = PROJECT_SHUFFLE_HALF_DURATION + 100;

interface ProjectSurface {
  image: string;
  background: string;
}

export function PersistentIdentityHeader() {
  const pathname = usePathname();
  const projectSlug = pathname.match(/^\/work\/([^/]+)/)?.[1];
  const study = projectSlug ? getCaseStudy(decodeURIComponent(projectSlug)) : undefined;
  const isProject = Boolean(study);
  const { data } = useSpotify();
  const prefersReducedMotion = useReducedMotion();
  const [isTapped, setIsTapped] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isHomeHoverSuppressed, setIsHomeHoverSuppressed] = useState(false);
  const [isNavigationShuffling, setIsNavigationShuffling] = useState(false);
  const [heldProjectSurface, setHeldProjectSurface] = useState<ProjectSurface | null>(null);
  const [isProjectLogoSwapInstant, setIsProjectLogoSwapInstant] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [songOverflow, setSongOverflow] = useState(0);
  const [trackHugWidth, setTrackHugWidth] = useState(0);
  const exitCollapseTimer = useRef<number | null>(null);
  const hoverExitTimer = useRef<number | null>(null);
  const navigationShuffleTimer = useRef<number | null>(null);
  const projectLogoSwapTimer = useRef<number | null>(null);
  const projectLogoSwapResetFrame = useRef<number | null>(null);
  const currentProjectSurface = useRef<ProjectSurface | null>(
    study
      ? {
          image: study.companyLogo,
          background: study.companyLogoBackground,
        }
      : null,
  );
  const statusRef = useRef<HTMLSpanElement>(null);
  const songLineRef = useRef<HTMLSpanElement>(null);
  const songMarqueeRef = useRef<HTMLSpanElement>(null);
  const avatarSurfaceRef = useRef<HTMLSpanElement>(null);
  const secondarySurfaceRef = useRef<HTMLSpanElement>(null);
  const avatarStrokeValue = useRef(1);
  const secondaryStrokeValue = useRef(isProject ? 1 : 3.071);
  const secondaryRadiusValue = useRef(isProject ? 999 : 15.35);
  const [avatarStrokeWidth, setAvatarStrokeWidth] = useState(1);
  const [secondaryStrokeWidth, setSecondaryStrokeWidth] = useState(isProject ? 1 : 3.071);
  const [smoothedSecondaryRadius, setSmoothedSecondaryRadius] = useState(isProject ? 999 : 15.35);

  useEffect(() => {
    return () => {
      if (hoverExitTimer.current !== null) {
        window.clearTimeout(hoverExitTimer.current);
      }

      if (exitCollapseTimer.current !== null) {
        window.clearTimeout(exitCollapseTimer.current);
      }

      if (navigationShuffleTimer.current !== null) {
        window.clearTimeout(navigationShuffleTimer.current);
      }

      if (projectLogoSwapTimer.current !== null) {
        window.clearTimeout(projectLogoSwapTimer.current);
      }

      if (projectLogoSwapResetFrame.current !== null) {
        window.cancelAnimationFrame(projectLogoSwapResetFrame.current);
      }
    };
  }, []);

  useEffect(() => {
    currentProjectSurface.current = study
      ? {
          image: study.companyLogo,
          background: study.companyLogoBackground,
        }
      : null;
  }, [study]);

  useEffect(() => {
    if (hoverExitTimer.current !== null) {
      window.clearTimeout(hoverExitTimer.current);
      hoverExitTimer.current = null;
    }

    if (exitCollapseTimer.current !== null) {
      window.clearTimeout(exitCollapseTimer.current);
      exitCollapseTimer.current = null;
    }

    const resetFrame = window.requestAnimationFrame(() => {
      setIsTapped(false);
      setIsHovered(false);
      setIsExiting(false);
    });

    return () => window.cancelAnimationFrame(resetFrame);
  }, [pathname]);

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
    const handleCaseStudyNavigation = () => {
      if (navigationShuffleTimer.current !== null) {
        window.clearTimeout(navigationShuffleTimer.current);
      }

      if (projectLogoSwapTimer.current !== null) {
        window.clearTimeout(projectLogoSwapTimer.current);
      }

      if (projectLogoSwapResetFrame.current !== null) {
        window.cancelAnimationFrame(projectLogoSwapResetFrame.current);
        projectLogoSwapResetFrame.current = null;
      }

      if (prefersReducedMotion) {
        setHeldProjectSurface(null);
        setIsNavigationShuffling(false);
        return;
      }

      setHeldProjectSurface(currentProjectSurface.current);
      setIsNavigationShuffling(true);
      navigationShuffleTimer.current = window.setTimeout(() => {
        setIsNavigationShuffling(false);
        navigationShuffleTimer.current = null;
      }, PROJECT_SHUFFLE_HALF_DURATION);
      projectLogoSwapTimer.current = window.setTimeout(() => {
        setIsProjectLogoSwapInstant(true);
        setHeldProjectSurface(null);
        projectLogoSwapResetFrame.current = window.requestAnimationFrame(() => {
          setIsProjectLogoSwapInstant(false);
          projectLogoSwapResetFrame.current = null;
        });
        projectLogoSwapTimer.current = null;
      }, PROJECT_LOGO_SWAP_DELAY);
    };

    window.addEventListener(CASE_STUDY_NAVIGATION_EVENT, handleCaseStudyNavigation);
    return () => window.removeEventListener(CASE_STUDY_NAVIGATION_EVENT, handleCaseStudyNavigation);
  }, [prefersReducedMotion]);

  useEffect(() => {
    const songLine = songLineRef.current;
    const songMarquee = songMarqueeRef.current;
    const statusLine = statusRef.current;

    if (!songLine || !songMarquee || !statusLine) {
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
      const statusWidth = Math.max(statusLine.scrollWidth, statusLine.getBoundingClientRect().width);
      setTrackHugWidth(Math.ceil(Math.max(marqueeWidth, statusWidth) + 24));
      const difference = marqueeWidth - songLine.clientWidth;
      setSongOverflow(difference > 2 ? difference + 24 : 0);
    };

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(songLine);
    resizeObserver.observe(songMarquee);
    resizeObserver.observe(statusLine);
    document.fonts?.ready.then(measure);
    measure();

    return () => {
      isCancelled = true;
      resizeObserver.disconnect();
    };
  }, [data?.artist, data?.title, isProject]);

  const toggleMobileState = () => {
    if (!isProject && window.matchMedia("(hover: none)").matches) {
      setIsTapped((current) => !current);
    }
  };

  const triggerHoverInMotion = () => {
    if (window.matchMedia("(hover: hover)").matches) {
      if (isHomeHoverSuppressed) {
        return;
      }

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
      if (isHomeHoverSuppressed) {
        setIsHomeHoverSuppressed(false);
        setIsHovered(false);
        setIsExiting(false);
        return;
      }

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

  const suppressSpotifyHoverOnReturn = () => {
    if (window.matchMedia("(hover: hover)").matches) {
      setIsHomeHoverSuppressed(true);
    }
  };

  const status = data?.isPlaying ? "Listening now" : "Last listened to";
  const isVisibleHover = isHovered && !(isHomeHoverSuppressed && !isProject);
  const isSongMarqueeActive = !isProject && songOverflow > 0 && (isTapped || isVisibleHover);
  const isProjectStackSwapped = isProject && (isNavigationShuffling || isVisibleHover);
  const isAvatarFront = isProject ? !isProjectStackSwapped : isTapped || isVisibleHover;
  const stackOffset = isCompact ? 8 : isProject ? 9.45 : 9;
  const smallScale = isCompact ? 24 / 36 : isProject ? 28.364 / 43 : 28 / 43;
  const frontStroke = isCompact ? 2.25 : isProject ? 2.66 : 3.071;
  const backStroke = isCompact ? 0.75 : 1;
  const albumInnerStroke = isCompact ? 0.75 : 0.9;
  const albumFrontRadius = isCompact ? 12 : 15.35;
  const albumBackRadius = isCompact ? 10 : 12;
  const secondaryImage = isProject ? heldProjectSurface?.image ?? study?.companyLogo : data?.albumImageUrl;
  const secondaryBackground = isProject
    ? heldProjectSurface?.background ?? study?.companyLogoBackground ?? "#f5f5f5"
    : "#f5f5f5";
  const layerTransition = prefersReducedMotion ? { duration: 0 } : STACK_SPRING;
  const secondaryImageTransition = prefersReducedMotion || isProjectLogoSwapInstant
    ? { duration: 0 }
    : SURFACE_TRANSITION;
  const getLayerTarget = (isFront: boolean) => ({
    x: isFront ? 0 : stackOffset,
    y: isFront ? 0 : stackOffset,
    scale: isFront ? smallScale : 1,
  });

  useEffect(() => {
    const nextAvatarStroke = isAvatarFront ? frontStroke : backStroke;
    const nextSecondaryStroke = isAvatarFront ? backStroke : frontStroke;
    const nextSecondaryRadius = isProject ? 999 : isAvatarFront ? albumBackRadius : albumFrontRadius;

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
      animate(secondaryStrokeValue.current, nextSecondaryStroke, {
        ...animationOptions,
        onUpdate: (value) => {
          secondaryStrokeValue.current = value;
          setSecondaryStrokeWidth(value);
        },
      }),
      animate(secondaryRadiusValue.current, nextSecondaryRadius, {
        ...animationOptions,
        onUpdate: (value) => {
          secondaryRadiusValue.current = value;
          setSmoothedSecondaryRadius(value);
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
    isProject,
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
    secondarySurfaceRef,
    { radius: smoothedSecondaryRadius, smoothing: 0.6 },
    {
      autoEffects: false,
      effects: {
        ...(isProject
          ? {}
          : {
              innerBorder: {
                width: albumInnerStroke,
                color: "#000",
                opacity: 0.08,
              },
            }),
        ...(isProject || isCompact
          ? {
              middleBorder: {
                width: secondaryStrokeWidth,
                color: "#fff",
                opacity: 1,
              },
            }
          : {
              outerBorder: {
                width: secondaryStrokeWidth,
                color: "#fff",
                opacity: 1,
              },
            }),
      },
    },
  );

  return (
    <div className={`persistent-identity-header ${isProject ? "is-project-route" : "is-index-route"}`}>
      <div
        className={`identity-spotify persistent-identity${isProject ? " is-project" : " is-index"}${isTapped ? " is-tapped" : ""}${isVisibleHover ? " is-hovered" : ""}${isExiting ? " is-exiting" : ""}`}
        style={
          {
            "--identity-track-hug-width": trackHugWidth > 0 ? `${trackHugWidth}px` : "var(--identity-track-width)",
          } as CSSProperties
        }
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
            <motion.span ref={avatarSurfaceRef} className="identity-avatar">
              <Image src="/images/profile-v2.png" alt="" width={1536} height={1920} priority />
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
              ref={secondarySurfaceRef}
              className="identity-album identity-secondary"
              animate={{ backgroundColor: secondaryBackground }}
              transition={secondaryImageTransition}
            >
              <AnimatePresence initial={false} mode="sync">
                {secondaryImage ? (
                  <motion.span
                    key={secondaryImage}
                    className="identity-secondary-image"
                    initial={{ opacity: 0, scale: 0.94, filter: "blur(2px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 1.03, filter: "blur(1px)" }}
                    transition={secondaryImageTransition}
                  >
                    <Image src={secondaryImage} alt="" fill sizes="44px" />
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </motion.span>
          </motion.span>

          {!isProject && data ? (
            <a
              className="identity-artwork-action identity-artwork-link"
              href={data.songUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${data.title} by ${data.artist} in Spotify`}
            />
          ) : null}
          {!isProject ? (
            <button
              type="button"
              className="identity-artwork-action identity-artwork-toggle"
              aria-label={isTapped ? "Hide Spotify track" : "Show Spotify track"}
              aria-expanded={isTapped}
              onClick={toggleMobileState}
            />
          ) : null}
          {isProject ? (
            <Link
              className="identity-artwork-action persistent-project-artwork-link"
              href="/"
              aria-label="Back to Index"
              onPointerDown={suppressSpotifyHoverOnReturn}
            />
          ) : null}
        </div>

        {!isProject && data ? (
          <a
            className="identity-track"
            href={data.songUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${data.title} by ${data.artist} in Spotify`}
          >
            <span className="identity-track-content">
              <span
                ref={statusRef}
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

        {isProject && study ? (
          <Link
            className="project-identity-details persistent-project-details-link"
            href="/"
            aria-label="Back to Index"
            aria-hidden={!isVisibleHover}
            onPointerDown={suppressSpotifyHoverOnReturn}
          >
            <span className="project-identity-company-name">{study.company}</span>
            <span className="project-identity-index-label">Back to Index</span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
