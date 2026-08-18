"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import type { CaseStudyMediaBlock } from "@/lib/case-studies";
import type { PortfolioVideoAsset } from "@/lib/media-assets";
import { AV1_MIME, H264_MIME, mediaUrl } from "@/lib/media-delivery";
import { useVideoRendition } from "@/hooks/use-video-rendition";
import { CaseStudyPip, usePipState } from "@/components/case-study-pip";
import type { PipState } from "@/components/case-study-pip";
import { CASE_STUDY_NAVIGATION_EVENT } from "@/lib/case-study-navigation";

const DESKTOP_FOCUS_QUERY = "(min-width: 768px) and (hover: hover) and (pointer: fine)";
const IMAGE_FOCUS_EXIT_DURATION = 370;
const VIDEO_FOCUS_EXIT_DURATION = 270;
const VIDEO_FOCUS_HANDOFF_DURATION = 70;

interface MediaBounds {
  top: number;
  left: number;
  width: number;
  height: number;
  targetTop: number;
  targetLeft: number;
  targetSize: number;
}

function getBackdropStyle(block: CaseStudyMediaBlock): CSSProperties | undefined {
  const backdrop = "backdrop" in block.media ? block.media.backdrop : undefined;

  return backdrop ? ({ "--case-study-media-backdrop": backdrop } as CSSProperties) : undefined;
}

/**
 * Two sizes rather than a curve: the standard one everywhere, and a larger one
 * past the same width the project grid treats as a big screen. Still clamped to
 * the viewport so a short window cannot push the media off screen.
 */
const FOCUS_SIZE_STANDARD = 796;
const FOCUS_SIZE_LARGE = 960;
const FOCUS_LARGE_VIEWPORT_QUERY = "(min-width: 1920px)";
const FOCUS_VIEWPORT_INSET = 96;

function getFocusTargetSize() {
  const base = window.matchMedia(FOCUS_LARGE_VIEWPORT_QUERY).matches
    ? FOCUS_SIZE_LARGE
    : FOCUS_SIZE_STANDARD;

  return Math.min(
    base,
    window.innerWidth - FOCUS_VIEWPORT_INSET,
    window.innerHeight - FOCUS_VIEWPORT_INSET,
  );
}

function getFocusBounds(source: DOMRect): MediaBounds {
  const targetSize = getFocusTargetSize();

  return {
    top: source.top,
    left: source.left,
    width: source.width,
    height: source.height,
    targetTop: (window.innerHeight - targetSize) / 2,
    targetLeft: (window.innerWidth - targetSize) / 2,
    targetSize,
  };
}

function waitForVideoFrame(video: HTMLVideoElement, callback: () => void) {
  let didFinish = false;
  const finish = () => {
    if (didFinish) {
      return;
    }

    didFinish = true;
    window.clearTimeout(fallbackTimer);
    callback();
  };
  const fallbackTimer = window.setTimeout(finish, 80);

  if ("requestVideoFrameCallback" in video) {
    video.requestVideoFrameCallback(finish);
    return;
  }

  window.requestAnimationFrame(finish);
}

/**
 * The inline video reserves the focused size up front on devices that can focus,
 * so both views share one file and opening focus costs no extra fetch.
 */
function getFocusReservedWidth() {
  if (typeof window === "undefined" || !window.matchMedia(DESKTOP_FOCUS_QUERY).matches) {
    return 0;
  }

  return getFocusTargetSize();
}

function CaseStudyVideo({
  asset,
  videoRef,
  freezeOnNavigation,
}: {
  asset: PortfolioVideoAsset;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  freezeOnNavigation: boolean;
}) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const snapshotRef = useRef<HTMLCanvasElement>(null);
  const poster = asset.poster;
  const [isFrameReady, setIsFrameReady] = useState(Boolean(poster));
  // Both copies reserve the focused size. The inline one so opening focus needs
  // no extra fetch, and the focused one because it opens from the source bounds
  // and would otherwise measure itself mid-animation at the smaller inline size.
  // The focused copy is portal-mounted on demand and never server-rendered, so it
  // can resolve its rendition during the first render and skip the reload entirely.
  const rendition = useVideoRendition(asset, localVideoRef, getFocusReservedWidth(), {
    immediate: !freezeOnNavigation,
  });

  const setVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      localVideoRef.current = node;
      if (videoRef) {
        videoRef.current = node;
      }
    },
    [videoRef],
  );

  // A <source> added after mount is invisible to the element until it reloads, but
  // load() wipes playback state. When the rendition was already known on the first
  // render the sources shipped with the element, so no reload is needed at all —
  // currentSrc cannot be consulted here because resource selection runs async.
  const hadSourcesAtMount = useRef(rendition !== null);
  const hasLoadedRef = useRef(false);
  useEffect(() => {
    if (hadSourcesAtMount.current || !rendition || hasLoadedRef.current) {
      return;
    }

    hasLoadedRef.current = true;
    localVideoRef.current?.load();
  }, [rendition]);

  useEffect(() => {
    const video = localVideoRef.current;
    if (!video || !rendition) {
      return;
    }

    let cancelled = false;
    const revealPresentedFrame = () => {
      waitForVideoFrame(video, () => {
        if (!cancelled) {
          setIsFrameReady(true);
        }
      });
    };

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      revealPresentedFrame();
    } else {
      video.addEventListener("loadeddata", revealPresentedFrame, { once: true });
    }

    return () => {
      cancelled = true;
      video.removeEventListener("loadeddata", revealPresentedFrame);
    };
  }, [rendition]);

  useEffect(() => {
    if (!freezeOnNavigation) {
      return;
    }

    const video = localVideoRef.current;
    // Wait for a source. Observing earlier means the first intersection callback
    // calls play() on an empty element, which rejects, and the callback never
    // fires again because the intersection itself never changes.
    if (!video || !rendition) {
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (reduceMotion.matches || connection?.saveData) {
      video.pause();
      return;
    }

    let isVisible = false;
    const tryPlay = () => {
      if (isVisible && video.paused) {
        void video.play().catch(() => undefined);
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) {
          tryPlay();
        } else {
          video.pause();
        }
      },
      { rootMargin: "400px 0px", threshold: 0.01 },
    );

    observer.observe(video);
    // A rejected play() leaves the video stuck paused until the user taps it, and
    // the observer will not fire again while the intersection is unchanged. Retry
    // whenever the element becomes playable.
    video.addEventListener("canplay", tryPlay);
    return () => {
      observer.disconnect();
      video.removeEventListener("canplay", tryPlay);
    };
  }, [freezeOnNavigation, rendition]);

  useEffect(() => {
    if (!freezeOnNavigation) {
      return;
    }

    const freezePresentedFrame = () => {
      const video = localVideoRef.current;
      const snapshot = snapshotRef.current;
      if (!video || !snapshot || video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }

      const context = snapshot.getContext("2d");
      if (!context) {
        return;
      }

      snapshot.width = video.videoWidth;
      snapshot.height = video.videoHeight;
      context.drawImage(video, 0, 0, snapshot.width, snapshot.height);
      snapshot.classList.add("is-visible");
      video.classList.add("is-route-exiting");
    };

    window.addEventListener(CASE_STUDY_NAVIGATION_EVENT, freezePresentedFrame);
    return () => window.removeEventListener(CASE_STUDY_NAVIGATION_EVENT, freezePresentedFrame);
  }, [freezeOnNavigation]);

  return (
    <div className="case-study-video-viewport">
      <video
        ref={setVideoRef}
        className={isFrameReady ? "is-frame-ready" : undefined}
        poster={poster ? mediaUrl(poster) : undefined}
        aria-label={asset.alt}
        autoPlay={!freezeOnNavigation}
        muted
        loop
        playsInline
        // Both copies loop visibly off a remote origin, where "metadata" leaves too
        // little buffered and the element starves at the loop point and on seek.
        preload="auto"
      >
        {rendition ? (
          <>
            <source src={mediaUrl(rendition.av1)} type={AV1_MIME} />
            <source src={mediaUrl(rendition.h264)} type={H264_MIME} />
          </>
        ) : null}
      </video>
      {freezeOnNavigation ? (
        <canvas ref={snapshotRef} className="case-study-video-snapshot" aria-hidden="true" />
      ) : null}
    </div>
  );
}

function MediaSurface({
  block,
  isFocused = false,
  videoRef,
  surfaceRef,
  pip,
}: {
  block: CaseStudyMediaBlock;
  isFocused?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  surfaceRef?: React.RefObject<HTMLDivElement | null>;
  pip?: PipState;
}) {
  // With a secondary asset the two trade places, so which one is "media" depends
  // on the flip rather than on the block.
  const media = pip?.isFlipped && block.secondaryMedia ? block.secondaryMedia : block.media;
  // Only real assets can trade places; placeholders and interactive slots cannot.
  const swappable = block.media.kind === "image" || block.media.kind === "video" ? block.media : undefined;
  const tile =
    block.secondaryMedia && swappable
      ? pip?.isFlipped
        ? swappable
        : block.secondaryMedia
      : undefined;

  return (
    <div
      ref={surfaceRef}
      className={isFocused ? "case-study-focused-media" : "case-study-media"}
      data-media-kind={media.kind}
    >
      {media.kind === "image" && media.src ? (
        <Image
          src={mediaUrl(media.src)}
          alt={media.alt ?? ""}
          fill
          quality={90}
          sizes={isFocused ? "796px" : "(max-width: 767px) 100vw, 600px"}
        />
      ) : null}
      {media.kind === "video" ? (
        <CaseStudyVideo
          // Keyed so swapping the tile remounts against the new asset; the
          // rendition hook resolves once per element and would otherwise keep
          // serving the previous asset's files.
          key={media.id}
          asset={media}
          videoRef={videoRef}
          freezeOnNavigation={!isFocused}
        />
      ) : null}
      {media.kind === "interactive" ? (
        <div className="case-study-interactive-slot" data-demo-id={media.demoId} aria-hidden="true" />
      ) : null}
      {tile && pip ? <CaseStudyPip asset={tile} state={pip} isFocused={isFocused} /> : null}
    </div>
  );
}

export function CaseStudyMedia({ block }: { block: CaseStudyMediaBlock }) {
  const pip = usePipState();
  const canFocus = block.media.kind !== "interactive";
  const isVideo = block.media.kind === "video";
  const [isFocusRendered, setIsFocusRendered] = useState(false);
  const [isFocusReady, setIsFocusReady] = useState(false);
  const [isFocusVisible, setIsFocusVisible] = useState(false);
  const [isFocusClosing, setIsFocusClosing] = useState(false);
  const [isFocusHandoff, setIsFocusHandoff] = useState(false);
  const [sourceBounds, setSourceBounds] = useState<MediaBounds | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const mediaSurfaceRef = useRef<HTMLDivElement>(null);
  const inlineVideoRef = useRef<HTMLVideoElement>(null);
  const focusedVideoRef = useRef<HTMLVideoElement>(null);
  const openFrame = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const handoffTimer = useRef<number | null>(null);

  const revealFocus = useCallback(() => {
    setIsFocusReady(true);
    openFrame.current = window.requestAnimationFrame(() => {
      openFrame.current = window.requestAnimationFrame(() => {
        setIsFocusVisible(true);
        overlayRef.current?.focus({ preventScroll: true });
        openFrame.current = null;
      });
    });
  }, []);

  const closeFocus = useCallback(() => {
    if (!isFocusRendered || isFocusClosing) {
      return;
    }

    const source = mediaSurfaceRef.current?.getBoundingClientRect();
    if (source) {
      setSourceBounds(getFocusBounds(source));
    }

    setIsFocusClosing(true);
    setIsFocusVisible(false);
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
    }
    closeTimer.current = window.setTimeout(() => {
      const finishClose = () => {
        setIsFocusRendered(false);
        setIsFocusReady(false);
        setIsFocusClosing(false);
        setIsFocusHandoff(false);
        triggerRef.current?.focus({ preventScroll: true });
        closeTimer.current = null;
        handoffTimer.current = null;
      };

      if (isVideo) {
        setIsFocusHandoff(true);
        handoffTimer.current = window.setTimeout(finishClose, VIDEO_FOCUS_HANDOFF_DURATION);
      } else {
        finishClose();
      }
    }, isVideo ? VIDEO_FOCUS_EXIT_DURATION : IMAGE_FOCUS_EXIT_DURATION);
  }, [isFocusClosing, isFocusRendered, isVideo]);

  const openFocus = useCallback(() => {
    if (isFocusRendered || !canFocus || !window.matchMedia(DESKTOP_FOCUS_QUERY).matches) {
      return;
    }

    const source = mediaSurfaceRef.current?.getBoundingClientRect();
    if (!source) {
      return;
    }

    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setSourceBounds(getFocusBounds(source));
    setIsFocusClosing(false);
    setIsFocusHandoff(false);
    setIsFocusRendered(true);

    if (!isVideo) {
      revealFocus();
    }
  }, [canFocus, isFocusRendered, isVideo, revealFocus]);

  useEffect(() => {
    if (!isVideo || !isFocusRendered || isFocusReady) {
      return;
    }

    const inlineVideo = inlineVideoRef.current;
    const focusedVideo = focusedVideoRef.current;
    if (!inlineVideo || !focusedVideo) {
      return;
    }

    let cancelled = false;

    const prepareFocusedVideo = () => {
      const showSyncedFrame = () => {
        if (cancelled) {
          return;
        }

        focusedVideo.currentTime = inlineVideo.currentTime;
        void focusedVideo.play().catch(() => undefined);
        waitForVideoFrame(focusedVideo, () => {
          if (!cancelled) {
            revealFocus();
          }
        });
      };

      if (focusedVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        showSyncedFrame();
      } else {
        focusedVideo.addEventListener("loadeddata", showSyncedFrame, { once: true });
      }
    };

    if (focusedVideo.readyState >= HTMLMediaElement.HAVE_METADATA) {
      prepareFocusedVideo();
    } else {
      focusedVideo.addEventListener("loadedmetadata", prepareFocusedVideo, { once: true });
    }

    return () => {
      cancelled = true;
      focusedVideo.removeEventListener("loadedmetadata", prepareFocusedVideo);
    };
  }, [isFocusReady, isFocusRendered, isVideo, revealFocus]);

  // Chrome does not include hardware-composited video layers in a backdrop-filter,
  // so the page content is blurred directly instead. Keyed on visibility rather
  // than render so the blur fades out with the scrim instead of snapping off.
  useEffect(() => {
    if (!isFocusVisible) {
      return;
    }

    document.body.classList.add("is-media-focused");
    return () => document.body.classList.remove("is-media-focused");
  }, [isFocusVisible]);

  useEffect(() => {
    if (!isFocusRendered) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeFocus();
      }
    };

    const mediaQuery = window.matchMedia(DESKTOP_FOCUS_QUERY);
    const handleMediaChange = () => {
      if (!mediaQuery.matches) {
        closeFocus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    mediaQuery.addEventListener("change", handleMediaChange);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, [closeFocus, isFocusRendered]);

  useEffect(() => {
    return () => {
      if (openFrame.current !== null) {
        window.cancelAnimationFrame(openFrame.current);
      }
      if (closeTimer.current !== null) {
        window.clearTimeout(closeTimer.current);
      }
      if (handoffTimer.current !== null) {
        window.clearTimeout(handoffTimer.current);
      }
    };
  }, []);

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFocus();
    }
  };

  const backdropStyle = getBackdropStyle(block);
  // Caption tracks the primary asset, so swapping the tile relabels the block.
  const activeCaption =
    pip.isFlipped && block.secondaryMedia ? block.secondaryCaption ?? block.caption : block.caption;
  const focusStyle = sourceBounds
    ? ({
        ...backdropStyle,
        "--case-study-focus-source-top": `${sourceBounds.top}px`,
        "--case-study-focus-source-left": `${sourceBounds.left}px`,
        "--case-study-focus-source-width": `${sourceBounds.width}px`,
        "--case-study-focus-source-height": `${sourceBounds.height}px`,
        "--case-study-focus-target-top": `${sourceBounds.targetTop}px`,
        "--case-study-focus-target-left": `${sourceBounds.targetLeft}px`,
        "--case-study-focus-target-size": `${sourceBounds.targetSize}px`,
      } as CSSProperties)
    : undefined;

  const focusedView = isFocusRendered && sourceBounds
    ? createPortal(
        <div
          ref={overlayRef}
          className={`case-study-focus-overlay${isFocusReady ? " is-ready" : ""}${isFocusVisible ? " is-visible" : ""}${isFocusClosing ? " is-closing" : ""}${isFocusHandoff ? " is-handoff" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label="Focused project media. Click anywhere or press Escape to close."
          tabIndex={-1}
          style={focusStyle}
          onClick={closeFocus}
        >
          {isVideo ? <div className="case-study-focus-source-cover" aria-hidden="true" /> : null}
          <div className={`case-study-focus-content${isVideo ? " is-video" : ""}`}>
            <MediaSurface block={block} isFocused videoRef={focusedVideoRef} pip={pip} />
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <figure
        className={`case-study-media-block${isFocusReady ? " is-focused" : ""}`}
        style={backdropStyle}
        aria-hidden={isFocusReady || undefined}
      >
        <div
          ref={triggerRef}
          className={canFocus ? "case-study-media-trigger is-focusable" : "case-study-media-trigger"}
          role={canFocus ? "button" : undefined}
          aria-label={canFocus ? "Expand project media" : undefined}
          tabIndex={canFocus ? 0 : undefined}
          onClick={openFocus}
          onKeyDown={handleTriggerKeyDown}
        >
          <MediaSurface block={block} videoRef={inlineVideoRef} surfaceRef={mediaSurfaceRef} pip={pip} />
        </div>
        {activeCaption ? (
          <figcaption className="case-study-media-caption">{activeCaption}</figcaption>
        ) : null}
      </figure>
      {focusedView}
    </>
  );
}
