"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { CaseStudyMediaBlock } from "@/lib/case-studies";

const DESKTOP_FOCUS_QUERY = "(min-width: 768px) and (hover: hover) and (pointer: fine)";
const FOCUS_EXIT_DURATION = 220;

function MediaSurface({ block, isFocused = false }: { block: CaseStudyMediaBlock; isFocused?: boolean }) {
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
        <video src={media.src} aria-label={media.alt} autoPlay muted loop playsInline preload="metadata" />
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
  const triggerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const openFrame = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  const closeFocus = useCallback(() => {
    if (!isFocusRendered) {
      return;
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
  }, [isFocusRendered]);

  const openFocus = useCallback(() => {
    if (!canFocus || !window.matchMedia(DESKTOP_FOCUS_QUERY).matches) {
      return;
    }

    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setIsFocusRendered(true);
    openFrame.current = window.requestAnimationFrame(() => {
      setIsFocusVisible(true);
      overlayRef.current?.focus({ preventScroll: true });
      openFrame.current = null;
    });
  }, [canFocus]);

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

  const focusedView = isFocusRendered
    ? createPortal(
        <div
          ref={overlayRef}
          className={`case-study-focus-overlay${isFocusVisible ? " is-visible" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label="Focused project media. Click anywhere or press Escape to close."
          tabIndex={-1}
          onClick={closeFocus}
        >
          <div className="case-study-focus-content">
            <MediaSurface block={block} isFocused />
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
          <MediaSurface block={block} />
        </div>
        {block.caption ? <figcaption className="case-study-media-caption">{block.caption}</figcaption> : null}
      </figure>
      {focusedView}
    </>
  );
}
