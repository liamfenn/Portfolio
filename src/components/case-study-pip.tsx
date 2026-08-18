"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import type { PortfolioMediaAsset } from "@/lib/media-assets";
import { mediaUrl } from "@/lib/media-delivery";

/** Past this leftward drag the tile tucks; past this rightward drag it comes back. */
const TUCK_THRESHOLD = 28;
const UNTUCK_THRESHOLD = 24;
/** Below this movement a pointer sequence counts as a tap rather than a drag. */
const TAP_SLOP = 4;

export interface PipState {
  isFlipped: boolean;
  isTucked: boolean;
  offset: { x: number; y: number };
  isDragging: boolean;
  flip: () => void;
  beginDrag: () => void;
  moveTo: (offset: { x: number; y: number }) => void;
  endDrag: (offset: { x: number; y: number }) => void;
}

/**
 * Shared by the inline and focused surfaces so the tile keeps its position and
 * which asset is primary as focus opens and closes.
 */
export function usePipState(): PipState {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isTucked, setIsTucked] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const flip = useCallback(() => setIsFlipped((current) => !current), []);
  const beginDrag = useCallback(() => setIsDragging(true), []);
  const moveTo = useCallback((next: { x: number; y: number }) => setOffset(next), []);

  const endDrag = useCallback((next: { x: number; y: number }) => {
    setIsDragging(false);
    setIsTucked((tucked) => {
      if (!tucked && next.x <= -TUCK_THRESHOLD) {
        setOffset({ x: 0, y: 0 });
        return true;
      }

      if (tucked && next.x >= UNTUCK_THRESHOLD) {
        setOffset({ x: 0, y: 0 });
        return false;
      }

      // Tucked tiles spring back to the edge; loose ones keep where they landed.
      setOffset(tucked ? { x: 0, y: 0 } : next);
      return tucked;
    });
  }, []);

  return { isFlipped, isTucked, offset, isDragging, flip, beginDrag, moveTo, endDrag };
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

  const clamp = (next: { x: number; y: number }) => {
    const element = elementRef.current;
    const frame = element?.parentElement;
    if (!element || !frame) {
      return next;
    }

    // Keep the tile inside the media box, measured from its resting corner.
    const size = element.offsetWidth;
    const inset = element.offsetLeft;
    const maxX = frame.clientWidth - size - inset * 2;
    const maxY = frame.clientHeight - size - inset * 2;
    return {
      x: Math.min(Math.max(next.x, -size), Math.max(maxX, 0)),
      y: Math.min(Math.max(next.y, -inset), Math.max(maxY, 0)),
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX - state.offset.x, y: event.clientY - state.offset.y, moved: false };
    state.beginDrag();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const origin = dragRef.current;
    if (!origin) {
      return;
    }

    const next = clamp({ x: event.clientX - origin.x, y: event.clientY - origin.y });
    if (Math.abs(next.x) > TAP_SLOP || Math.abs(next.y) > TAP_SLOP) {
      origin.moved = true;
    }
    state.moveTo(next);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const origin = dragRef.current;
    dragRef.current = null;
    if (!origin) {
      return;
    }

    event.stopPropagation();
    const next = clamp({ x: event.clientX - origin.x, y: event.clientY - origin.y });
    if (!origin.moved) {
      // A tap swaps which asset is primary.
      state.endDrag({ x: state.offset.x, y: state.offset.y });
      state.flip();
      return;
    }

    state.endDrag(next);
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
      style={{ "--pip-drag-x": `${state.offset.x}px`, "--pip-drag-y": `${state.offset.y}px` } as React.CSSProperties}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={(event) => event.stopPropagation()}
      role="button"
      tabIndex={0}
      aria-label={`Swap to ${asset.alt}`}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          state.flip();
        }
      }}
    >
      {asset.kind === "video" ? (
        // Held paused until it becomes the primary asset.
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
    </div>
  );
}
