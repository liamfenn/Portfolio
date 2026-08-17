"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import type { CaseStudyMediaBlock } from "@/lib/case-studies";

const DESKTOP_FOCUS_QUERY = "(min-width: 768px) and (hover: hover) and (pointer: fine)";
const FOCUS_EXIT_DURATION = 540;

interface MediaBounds {
  top: number;
  left: number;
  width: number;
  height: number;
}

function FocusedVideoPlayer({
  src,
  alt,
  startTime,
  shouldPlay,
  onVideoReady,
}: {
  src: string;
  alt?: string;
  startTime: number;
  shouldPlay: boolean;
  onVideoReady: (video: HTMLVideoElement | null) => void;
}) {
  const playerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let isCancelled = false;
    let idleStyle: HTMLStyleElement | null = null;

    const preparePlayer = async () => {
      await import("@grizzshutsdown/simpleplayer");
      await window.customElements.whenDefined("simple-player");

      const player = playerRef.current;
      const shadowRoot = player?.shadowRoot;

      if (isCancelled || !player || !shadowRoot) {
        return;
      }

      const video = shadowRoot.querySelector<HTMLVideoElement>(".sp-video");

      if (!video) {
        return;
      }

      const revealSyncedFrame = () => {
        if (isCancelled) {
          return;
        }

        player.classList.add("is-playback-ready");
        onVideoReady(video);
        if (shouldPlay) {
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      };

      const syncPlaybackPosition = () => {
        const targetTime = Number.isFinite(video.duration) && video.duration > 0
          ? startTime % video.duration
          : startTime;

        if (Math.abs(video.currentTime - targetTime) <= 1 / 30) {
          revealSyncedFrame();
          return;
        }

        video.addEventListener("seeked", revealSyncedFrame, { once: true });
        video.currentTime = targetTime;
      };

      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
        syncPlaybackPosition();
      } else {
        video.addEventListener("loadedmetadata", syncPlaybackPosition, { once: true });
      }

      idleStyle = document.createElement("style");
      idleStyle.dataset.caseStudyPlayer = "idle-controls";
      idleStyle.textContent = `
        .sp-progress-cluster {
          opacity: 0;
          pointer-events: none;
          transition:
            opacity 180ms ease,
            top 360ms cubic-bezier(0.23, 1, 0.32, 1),
            width 360ms cubic-bezier(0.23, 1, 0.32, 1),
            height 360ms cubic-bezier(0.23, 1, 0.32, 1),
            transform 360ms cubic-bezier(0.23, 1, 0.32, 1);
        }

        .sp-player.is-pointer-active .sp-progress-cluster,
        .sp-player.is-scrubbing .sp-progress-cluster,
        .sp-progress-cluster:focus-within {
          opacity: 1;
          pointer-events: auto;
        }
      `;
      shadowRoot.append(idleStyle);
    };

    void preparePlayer();

    return () => {
      isCancelled = true;
      onVideoReady(null);
      idleStyle?.remove();
    };
  }, [onVideoReady, shouldPlay, startTime]);

  return (
    <simple-player
      ref={playerRef}
      className="case-study-simple-player"
      src={src}
      aspect-ratio="1 / 1"
      aria-label={alt}
    />
  );
}

function MediaSurface({
  block,
  isFocused = false,
  inlineVideoRef,
  focusedVideoStartTime = 0,
  focusedVideoShouldPlay = true,
  onFocusedVideoReady,
}: {
  block: CaseStudyMediaBlock;
  isFocused?: boolean;
  inlineVideoRef?: React.RefObject<HTMLVideoElement | null>;
  focusedVideoStartTime?: number;
  focusedVideoShouldPlay?: boolean;
  onFocusedVideoReady?: (video: HTMLVideoElement | null) => void;
}) {
  const { media } = block;

  return (
    <div
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
        isFocused ? (
          <FocusedVideoPlayer
            src={media.src}
            alt={media.alt}
            startTime={focusedVideoStartTime}
            shouldPlay={focusedVideoShouldPlay}
            onVideoReady={onFocusedVideoReady ?? (() => undefined)}
          />
        ) : (
          <video
            ref={inlineVideoRef}
            src={media.src}
            aria-label={media.alt}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        )
      ) : null}
      {media.kind === "interactive" ? (
        <div className="case-study-interactive-slot" data-demo-id={media.demoId} aria-hidden="true" />
      ) : null}
    </div>
  );
}

export function CaseStudyMedia({ block }: { block: CaseStudyMediaBlock }) {
  const canFocus = block.media.kind !== "interactive";
  const [isFocusRendered, setIsFocusRendered] = useState(false);
  const [isFocusVisible, setIsFocusVisible] = useState(false);
  const [sourceBounds, setSourceBounds] = useState<MediaBounds | null>(null);
  const [focusedVideoStartTime, setFocusedVideoStartTime] = useState(0);
  const [focusedVideoShouldPlay, setFocusedVideoShouldPlay] = useState(true);
  const triggerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const inlineVideoRef = useRef<HTMLVideoElement>(null);
  const focusedVideoRef = useRef<HTMLVideoElement | null>(null);
  const openFrame = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  const handleFocusedVideoReady = useCallback((video: HTMLVideoElement | null) => {
    focusedVideoRef.current = video;
  }, []);

  useEffect(() => {
    if (block.media.kind === "video" && window.matchMedia(DESKTOP_FOCUS_QUERY).matches) {
      void import("@grizzshutsdown/simpleplayer");
    }
  }, [block.media.kind]);

  const closeFocus = useCallback(() => {
    if (!isFocusRendered) {
      return;
    }

    if (block.media.kind === "video" && inlineVideoRef.current) {
      const inlineVideo = inlineVideoRef.current;
      const focusedVideo = focusedVideoRef.current;

      if (focusedVideo && Number.isFinite(focusedVideo.currentTime)) {
        inlineVideo.currentTime = focusedVideo.currentTime;
      }

      if (focusedVideo?.paused ?? !focusedVideoShouldPlay) {
        inlineVideo.pause();
      } else {
        void inlineVideo.play().catch(() => undefined);
      }
    }

    const source = triggerRef.current?.getBoundingClientRect();
    if (source) {
      setSourceBounds({
        top: source.top,
        left: source.left,
        width: source.width,
        height: source.height,
      });
    }
    setIsFocusVisible(false);
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
    }
    closeTimer.current = window.setTimeout(() => {
      setIsFocusRendered(false);
      triggerRef.current?.focus({ preventScroll: true });
      closeTimer.current = null;
    }, FOCUS_EXIT_DURATION);
  }, [block.media.kind, focusedVideoShouldPlay, isFocusRendered]);

  const openFocus = useCallback(() => {
    if (!canFocus || !window.matchMedia(DESKTOP_FOCUS_QUERY).matches) {
      return;
    }

    const source = triggerRef.current?.getBoundingClientRect();
    if (!source) {
      return;
    }

    if (block.media.kind === "video" && inlineVideoRef.current) {
      setFocusedVideoStartTime(inlineVideoRef.current.currentTime);
      setFocusedVideoShouldPlay(!inlineVideoRef.current.paused);
      inlineVideoRef.current.pause();
    }

    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setSourceBounds({
      top: source.top,
      left: source.left,
      width: source.width,
      height: source.height,
    });
    setIsFocusRendered(true);
    openFrame.current = window.requestAnimationFrame(() => {
      setIsFocusVisible(true);
      overlayRef.current?.focus({ preventScroll: true });
      openFrame.current = null;
    });
  }, [block.media.kind, canFocus]);

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
      } as CSSProperties)
    : undefined;

  const focusedView = isFocusRendered && sourceBounds
    ? createPortal(
        <div
          ref={overlayRef}
          className={`case-study-focus-overlay${isFocusVisible ? " is-visible" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label="Focused project media. Click anywhere or press Escape to close."
          tabIndex={-1}
          style={focusStyle}
          onClick={closeFocus}
        >
          <div className="case-study-focus-content" onClick={(event) => event.stopPropagation()}>
            <MediaSurface
              block={block}
              isFocused
              focusedVideoStartTime={focusedVideoStartTime}
              focusedVideoShouldPlay={focusedVideoShouldPlay}
              onFocusedVideoReady={handleFocusedVideoReady}
            />
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <figure
        className={`case-study-media-block${isFocusRendered ? " is-focused" : ""}`}
        aria-hidden={isFocusRendered || undefined}
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
          <MediaSurface block={block} inlineVideoRef={inlineVideoRef} />
        </div>
        {block.caption ? <figcaption className="case-study-media-caption">{block.caption}</figcaption> : null}
      </figure>
      {focusedView}
    </>
  );
}
