"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { useSmoothCorners } from "@lisse/react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type { PortfolioMediaAsset } from "@/lib/media-assets";
import { mediaUrl } from "@/lib/media-delivery";
import { useIsDesktopViewport } from "@/components/smooth-corners";

/**
 * Asymptote for the elastic pull on the tile's free edges. The edge approaches
 * it but never arrives, so a hard drag firms up instead of stopping dead.
 */
const PULL_LIMIT = 22;
/** Fraction of the tuck travel that flips the tile into its tucked state. */
const COMMIT_FRACTION = 0.5;
const TAP_SLOP = 4;
const CORNER_SMOOTHING = 0.6;
const MOBILE_RADIUS = 12;
const DESKTOP_RADIUS = 16;

/**
 * Elastic response: 1:1 for the first pixel, then progressively stiffer, and
 * asymptotic at `limit` so the edge can never pass it. Used for the upward pull
 * with the frame inset as the limit, which is what keeps the tile inside the
 * media box no matter how hard it is dragged.
 */
function elastic(distance: number, limit: number) {
  if (distance <= 0 || limit <= 0) {
    return 0;
  }

  return (distance * limit) / (distance + limit);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export interface PipMotion {
  /** Travel along the tuck axis, relative to whichever rest position applies. */
  x: number;
  /** Scale factors that stretch the pulled edge away from the anchored one. */
  stretchX: number;
  stretchY: number;
  /** The anchored corner the stretch pivots around. */
  origin: string;
  /** 0-1 darkening as the tile approaches the tuck. */
  scrim: number;
}

/** At rest the tile hangs off its top-right corner, which is where it is pinned. */
const REST: PipMotion = { x: 0, stretchX: 1, stretchY: 1, origin: "100% 0%", scrim: 0 };
const TUCKED_REST: PipMotion = { ...REST, scrim: 1 };

export interface PipState {
  isFlipped: boolean;
  isTucked: boolean;
  motion: PipMotion;
  isDragging: boolean;
  flip: () => void;
  untuck: () => void;
  beginDrag: () => void;
  moveTo: (motion: PipMotion, tucked: boolean) => void;
  endDrag: (tucked: boolean) => void;
}

/** Shared by the inline and focused surfaces so state survives focus opening. */
export function usePipState(): PipState {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isTucked, setIsTucked] = useState(false);
  const [motion, setMotion] = useState<PipMotion>(REST);
  const [isDragging, setIsDragging] = useState(false);

  const flip = useCallback(() => setIsFlipped((current) => !current), []);

  const untuck = useCallback(() => {
    setIsTucked(false);
    setMotion(REST);
  }, []);

  const beginDrag = useCallback(() => setIsDragging(true), []);

  // Tuck resolves live rather than on release, so the tile reads as tucked the
  // moment it crosses the commit point and un-tucks again if it is dragged back.
  const moveTo = useCallback((next: PipMotion, tucked: boolean) => {
    setMotion(next);
    setIsTucked(tucked);
  }, []);

  const endDrag = useCallback((tucked: boolean) => {
    setIsDragging(false);
    setIsTucked(tucked);
    // Only the bend has to settle; the tuck was already decided mid-drag.
    setMotion(tucked ? TUCKED_REST : REST);
  }, []);

  return { isFlipped, isTucked, motion, isDragging, flip, untuck, beginDrag, moveTo, endDrag };
}

interface DragOrigin {
  x: number;
  y: number;
  moved: boolean;
  /** Position along the tuck axis when the drag started: 0 or the full travel. */
  startAbs: number;
  travel: number;
  inset: number;
  width: number;
  height: number;
  tucked: boolean;
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
  const dragRef = useRef<DragOrigin | null>(null);
  const isDesktop = useIsDesktopViewport();

  useSmoothCorners(elementRef, {
    radius: isDesktop ? DESKTOP_RADIUS : MOBILE_RADIUS,
    smoothing: CORNER_SMOOTHING,
  });

  /** Layout numbers the drag needs, read once per gesture rather than per move. */
  const measure = () => {
    const element = elementRef.current;
    if (!element) {
      return { travel: 0, inset: 0, width: 1, height: 1 };
    }

    const styles = getComputedStyle(element);
    const visible = parseFloat(styles.getPropertyValue("--pip-visible")) || 0;
    const inset = parseFloat(styles.getPropertyValue("--pip-inset")) || 0;
    const width = element.offsetWidth || 1;
    const height = element.offsetHeight || 1;
    return { travel: inset + width - visible, inset, width, height };
  };

  /**
   * Rightward travel is the tuck, and the only direction the tile actually
   * moves. Every other direction stretches it instead: the pulled edge follows
   * the pointer while the opposite corner stays pinned, and lets go on release.
   */
  const resolve = (origin: DragOrigin, raw: { x: number; y: number }): [PipMotion, boolean] => {
    const abs = origin.startAbs + raw.x;
    const freeX = clamp(abs, 0, origin.travel);
    const tucked = abs >= origin.travel * COMMIT_FRACTION;

    // Past the tuck the tile is against the frame, so there is nowhere left to
    // go; before rest it stretches out to the left instead of sliding.
    const pullLeft = abs < 0 ? elastic(-abs, PULL_LIMIT) : 0;
    // Upward is capped by the inset, which puts the ceiling exactly at the top
    // of the media box: the tile can bulge up to the frame but never past it.
    const pullUp = raw.y < 0 ? elastic(-raw.y, origin.inset) : 0;
    const pullDown = raw.y > 0 ? elastic(raw.y, PULL_LIMIT) : 0;

    return [
      {
        x: freeX - (tucked ? origin.travel : 0),
        stretchX: (origin.width + pullLeft) / origin.width,
        stretchY: (origin.height + pullUp + pullDown) / origin.height,
        // Anchor the corner opposite the pull so only the grabbed edge moves.
        origin: `100% ${pullUp > 0 ? "100%" : "0%"}`,
        scrim: clamp(abs / Math.max(origin.travel, 1), 0, 1),
      },
      tucked,
    ];
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const metrics = measure();
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      moved: false,
      startAbs: state.isTucked ? metrics.travel : 0,
      tucked: state.isTucked,
      ...metrics,
    };
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

    const [motion, tucked] = resolve(origin, raw);
    origin.tucked = tucked;
    state.moveTo(motion, tucked);
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
      const wasTucked = origin.startAbs > 0;
      state.endDrag(false);
      if (!wasTucked) {
        state.flip();
      }
      return;
    }

    state.endDrag(origin.tucked);
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
          "--pip-drag-x": `${state.motion.x}px`,
          "--pip-stretch-x": state.motion.stretchX,
          "--pip-stretch-y": state.motion.stretchY,
          "--pip-origin": state.motion.origin,
          "--pip-scrim": state.motion.scrim,
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
      {/* Grip on the sliver that stays on screen while tucked. */}
      <svg className="case-study-pip-grip" viewBox="0 0 8 14" aria-hidden="true">
        <g fill="#fff" fillOpacity="0.48">
          <circle cx="1.6" cy="1.615" r="1.6" />
          <circle cx="1.6" cy="7" r="1.6" />
          <circle cx="1.6" cy="12.385" r="1.6" />
          <circle cx="6.4" cy="1.615" r="1.6" />
          <circle cx="6.4" cy="7" r="1.6" />
          <circle cx="6.4" cy="12.385" r="1.6" />
        </g>
      </svg>
      {asset.kind === "video" ? (
        // SF Symbols play.fill: the tile is paused until it becomes primary.
        <svg className="case-study-pip-play" viewBox="0 0 12 14" aria-hidden="true">
          <path d="M11.5 6.13a1 1 0 0 1 0 1.74l-9.5 5.5A1 1 0 0 1 .5 12.5v-11A1 1 0 0 1 2 .63l9.5 5.5Z" />
        </svg>
      ) : null}
    </div>
  );
}
