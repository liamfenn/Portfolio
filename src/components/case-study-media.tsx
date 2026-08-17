"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import type { CaseStudyMediaBlock } from "@/lib/case-studies";

const DESKTOP_FOCUS_QUERY = "(min-width: 768px) and (hover: hover) and (pointer: fine)";
const IMAGE_FOCUS_EXIT_DURATION = 540;
const VIDEO_FOCUS_EXIT_DURATION = 380;

interface MediaBounds {
  top: number;
  left: number;
  width: number;
  height: number;
  targetTop: number;
  targetLeft: number;
  targetSize: number;
}

function getFocusBounds(source: DOMRect): MediaBounds {
  const targetSize = Math.min(796, window.innerWidth - 48, window.innerHeight - 48);

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
  if ("requestVideoFrameCallback" in video) {
    video.requestVideoFrameCallback(() => callback());
    return;
  }

  window.requestAnimationFrame(callback);
}

function MediaSurface({
  block,
  isFocused = false,
  videoRef,
  surfaceRef,
}: {
  block: CaseStudyMediaBlock;
  isFocused?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  surfaceRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const { media } = block;

  return (
    <div
      ref={surfaceRef}
      className={isFocused ? "case-study-focused-media" : "case-study-media"}
      data-media-kind={media.kind}
    >
      {media.kind === "image" && media.src ? (
        <Image
          src={media.src}
          alt={media.alt ?? ""}
          fill
          sizes={isFocused ? "796px" : "(max-width: 767px) 100vw, 600px"}
        />
      ) : null}
      {media.kind === "video" && media.src ? (
        <div className="case-study-video-viewport">
          <video
            ref={videoRef}
            src={media.src}
            aria-label={media.alt}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />
        </div>
      ) : null}
      {media.kind === "interactive" ? (
        <div className="case-study-interactive-slot" data-demo-id={media.demoId} aria-hidden="true" />
      ) : null}
    </div>
  );
}

export function CaseStudyMedia({ block }: { block: CaseStudyMediaBlock }) {
  const canFocus = block.media.kind !== "interactive";
  const isVideo = block.media.kind === "video";
  const [isFocusRendered, setIsFocusRendered] = useState(false);
  const [isFocusReady, setIsFocusReady] = useState(false);
  const [isFocusVisible, setIsFocusVisible] = useState(false);
  const [isFocusClosing, setIsFocusClosing] = useState(false);
  const [sourceBounds, setSourceBounds] = useState<MediaBounds | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const mediaSurfaceRef = useRef<HTMLDivElement>(null);
  const inlineVideoRef = useRef<HTMLVideoElement>(null);
  const focusedVideoRef = useRef<HTMLVideoElement>(null);
  const openFrame = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

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

    if (isVideo && inlineVideoRef.current && focusedVideoRef.current) {
      inlineVideoRef.current.currentTime = focusedVideoRef.current.currentTime;
      void inlineVideoRef.current.play().catch(() => undefined);
    }

    setIsFocusClosing(true);
    setIsFocusVisible(false);
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
    }
    closeTimer.current = window.setTimeout(() => {
      setIsFocusRendered(false);
      setIsFocusReady(false);
      setIsFocusClosing(false);
      triggerRef.current?.focus({ preventScroll: true });
      closeTimer.current = null;
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
    };
  }, []);

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFocus();
    }
  };

  const focusStyle = sourceBounds
    ? ({
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
          className={`case-study-focus-overlay${isFocusReady ? " is-ready" : ""}${isFocusVisible ? " is-visible" : ""}${isFocusClosing ? " is-closing" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label="Focused project media. Click outside the media or press Escape to close."
          tabIndex={-1}
          style={focusStyle}
          onClick={closeFocus}
        >
          <div
            className={`case-study-focus-content${isVideo ? " is-video" : ""}`}
            onClick={(event) => event.stopPropagation()}
          >
            <MediaSurface block={block} isFocused videoRef={focusedVideoRef} />
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <figure
        className={`case-study-media-block${isFocusReady ? " is-focused" : ""}`}
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
          <MediaSurface block={block} videoRef={inlineVideoRef} surfaceRef={mediaSurfaceRef} />
        </div>
        {block.caption ? <figcaption className="case-study-media-caption">{block.caption}</figcaption> : null}
      </figure>
      {focusedView}
    </>
  );
}
