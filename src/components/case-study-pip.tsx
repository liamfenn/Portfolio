"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type { PortfolioMediaAsset } from "@/lib/media-assets";
import { mediaUrl } from "@/lib/media-delivery";

/**
 * Slack the tile can be pulled into before resistance takes over. Deliberately
 * tight: it should feel pinned to its corner, not loosely parked there.
 */
const SLACK = 12;
const SLACK_UP = 8;
/** Fraction of the tuck travel that commits the gesture on release. */
const COMMIT_FRACTION = 0.5;
const TAP_SLOP = 4;

/**
 * iOS-style rubber band. Movement past the limit keeps responding but with
 * sharply falling returns, so it reads as pulling against something anchored.
 */
function rubberBand(distance: number, limit: number) {
  if (distance <= 0) {
    return 0;
  }

  const resisted = (distance * limit * 0.55) / (limit + 0.55 * distance);
  return Math.min(distance, limit + resisted);
}

/**
 * Resistance applied to the overflow vector as a whole rather than per axis, so
 * the reachable area is a rounded blob. Clamping x and y separately would leave
 * square corners for the tile to click into on a diagonal drag.
 */
function resistRadially(overflow: { x: number; y: number }) {
  const distance = Math.hypot(overflow.x, overflow.y);
  if (distance === 0) {
    return overflow;
  }

  const limit = overflow.y < 0 ? SLACK_UP : SLACK;
  const resisted = rubberBand(distance, limit);
  return { x: (overflow.x / distance) * resisted, y: (overflow.y / distance) * resisted };
}

export interface PipState {
  isFlipped: boolean;
  isTucked: boolean;
  offset: { x: number; y: number };
  isDragging: boolean;
  isSwapping: boolean;
  flip: () => void;
  untuck: () => void;
  beginDrag: () => void;
  moveTo: (offset: { x: number; y: number }) => void;
  endDrag: (offset: { x: number; y: number }, tuckDistance: number) => void;
}

/** Shared by the inline and focused surfaces so state survives focus opening. */
export function usePipState(): PipState {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isTucked, setIsTucked] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const swapTimer = useRef<number | null>(null);

  const flip = useCallback(() => {
    setIsFlipped((current) => !current);
    setIsSwapping(true);
    if (swapTimer.current !== null) {
      window.clearTimeout(swapTimer.current);
    }
    swapTimer.current = window.setTimeout(() => {
      setIsSwapping(false);
      swapTimer.current = null;
    }, 340);
  }, []);

  const untuck = useCallback(() => {
    setIsTucked(false);
    setOffset({ x: 0, y: 0 });
  }, []);

  const beginDrag = useCallback(() => setIsDragging(true), []);
  const moveTo = useCallback((next: { x: number; y: number }) => setOffset(next), []);

  const endDrag = useCallback((next: { x: number; y: number }, tuckDistance: number) => {
    setIsDragging(false);
    const commit = tuckDistance * COMMIT_FRACTION;
    setIsTucked((tucked) => {
      if (!tucked) {
        return next.x <= -commit;
      }

      return next.x < commit;
    });
    // The tile always returns to a resting spot; the drag only ever bends it.
    setOffset({ x: 0, y: 0 });
  }, []);

  return { isFlipped, isTucked, offset, isDragging, isSwapping, flip, untuck, beginDrag, moveTo, endDrag };
}

export function CaseStudyPip({
  asset,
  state,
  isFocused,
}: {
  asset: PortfolioMediaAsset;
  state: PipState;
  isFocused: boolean;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  /** How far left the tile travels to sit tucked against the frame. */
  const tuckDistance = () => {
    const element = elementRef.current;
    if (!element) {
      return 0;
    }

    const styles = getComputedStyle(element);
    const visible = parseFloat(styles.getPropertyValue("--pip-visible")) || 0;
    return element.offsetLeft + element.offsetWidth - visible;
  };

  /**
   * Leftward travel is free up to the tuck point, since that is the only gesture
   * that commits. Everything else is slack with resistance beyond it.
   */
  const constrain = (raw: { x: number; y: number }) => {
    const travel = tuckDistance();
    // Absolute position measured from rest: 0 at rest, -travel when tucked.
    const fromTucked = state.isTucked ? -travel : 0;
    const x = raw.x + fromTucked;

    // The tuck axis is the only direction with free travel; everything past it
    // is overflow that gets bent back, so the tile can never leave the media box.
    const freeX = Math.min(0, Math.max(-travel, x));
    const eased = resistRadially({ x: x - freeX, y: raw.y });

    return { x: freeX + eased.x - fromTucked, y: eased.y };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, moved: false };
    state.beginDrag();
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const origin = dragRef.current;
    if (!origin) {
      return;
    }

    const raw = { x: event.clientX - origin.x, y: event.clientY - origin.y };
    if (Math.abs(raw.x) > TAP_SLOP || Math.abs(raw.y) > TAP_SLOP) {
      origin.moved = true;
    }
    state.moveTo(constrain(raw));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const origin = dragRef.current;
    dragRef.current = null;
    if (!origin) {
      return;
    }

    event.stopPropagation();
    if (!origin.moved) {
      // Tucked tiles come back out first; a second tap then swaps.
      state.endDrag({ x: 0, y: 0 }, tuckDistance());
      if (state.isTucked) {
        state.untuck();
      } else {
        state.flip();
      }
      return;
    }

    state.endDrag(constrain({ x: event.clientX - origin.x, y: event.clientY - origin.y }), tuckDistance());
  };

  const className = [
    "case-study-pip",
    state.isTucked ? "is-tucked" : "",
    state.isDragging ? "is-dragging" : "",
    isFocused ? "is-focused" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={elementRef}
      className={className}
      style={
        {
          "--pip-drag-x": `${state.offset.x}px`,
          "--pip-drag-y": `${state.offset.y}px`,
          "--pip-scrim": state.isTucked ? 1 : Math.min(1, Math.max(0, -state.offset.x / Math.max(tuckDistance(), 1))),
        } as CSSProperties
      }
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={(event) => event.stopPropagation()}
      role="button"
      tabIndex={0}
      aria-label={state.isTucked ? "Show the secondary media" : `Swap to ${asset.alt}`}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (state.isTucked) {
            state.untuck();
          } else {
            state.flip();
          }
        }
      }}
    >
      {asset.kind === "video" ? (
        <video
          className="case-study-pip-media"
          poster={mediaUrl(asset.poster)}
          aria-label={asset.alt}
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        <Image className="case-study-pip-media" src={mediaUrl(asset.src)} alt={asset.alt ?? ""} fill sizes="120px" />
      )}
      <span className="case-study-pip-scrim" aria-hidden="true" />
      {asset.kind === "video" ? (
        // SF Symbols play.fill: the tile is paused until it becomes primary.
        <svg className="case-study-pip-play" viewBox="0 0 12 14" aria-hidden="true">
          <path d="M11.5 6.13a1 1 0 0 1 0 1.74l-9.5 5.5A1 1 0 0 1 .5 12.5v-11A1 1 0 0 1 2 .63l9.5 5.5Z" />
        </svg>
      ) : null}
    </div>
  );
}
