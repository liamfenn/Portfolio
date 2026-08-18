"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
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

/** Outline samples. At ~3px spacing the straight segments read as curves. */
const SAMPLE_COUNT = 128;
/** Width of the bulge along its edge, as a fraction of the tile. */
const SPREAD = 0.42;
/** How quickly the pull dies off toward the opposite edge. */
const FALLOFF = 2.2;

const SVG_NS = "http://www.w3.org/2000/svg";

type Point = [number, number];

/**
 * Elastic response: 1:1 for the first pixel, then progressively stiffer, and
 * asymptotic at `limit` so the edge can never pass it. Used for the upward pull
 * with the frame inset as the limit, which is what keeps the bulge inside the
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

/** Bell curve that concentrates the bulge around where the tile was grabbed. */
function bell(offset: number) {
  return Math.exp(-(offset * offset) / (2 * SPREAD * SPREAD));
}

function pathData(value: string) {
  const match = /path\(\s*(?:[a-z-]+\s*,\s*)?["']([^"']+)["']\s*\)/i.exec(value);
  return match ? match[1] : null;
}

/**
 * Walks a path into evenly spaced points. Lisse emits the squircle as one flat
 * `path()`, so sampling it is what lets the outline be deformed point by point
 * without having to reimplement Figma's corner smoothing.
 */
function samplePath(d: string, count: number): Point[] {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.position = "absolute";
  svg.style.visibility = "hidden";
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", d);
  svg.append(path);
  document.body.append(svg);

  const total = path.getTotalLength();
  const points: Point[] = [];
  for (let index = 0; index < count; index += 1) {
    const { x, y } = path.getPointAtLength((total * index) / count);
    points.push([x, y]);
  }

  svg.remove();
  return points;
}

function toClipPath(points: Point[]) {
  let d = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;
  for (let index = 1; index < points.length; index += 1) {
    d += ` L ${points[index][0].toFixed(2)} ${points[index][1].toFixed(2)}`;
  }
  return `path("${d} Z")`;
}

interface Pull {
  left: number;
  up: number;
  down: number;
  /** Where the tile was grabbed, normalised inside its own rect. */
  grab: { x: number; y: number };
}

/**
 * Pushes the outline out along whichever edge is being pulled. The displacement
 * peaks at the grab point and decays both along the edge and across the tile, so
 * the far side stays put and only the grabbed edge flows outward.
 */
function deform(base: Point[], pad: number, width: number, height: number, pull: Pull): Point[] {
  return base.map(([x, y]) => {
    const nx = (x - pad) / width;
    const ny = (y - pad) / height;
    let dx = 0;
    let dy = 0;

    if (pull.left > 0) {
      dx -= pull.left * Math.max(0, 1 - nx) ** FALLOFF * bell(ny - pull.grab.y);
    }
    if (pull.up > 0) {
      dy -= pull.up * Math.max(0, 1 - ny) ** FALLOFF * bell(nx - pull.grab.x);
    }
    if (pull.down > 0) {
      dy += pull.down * Math.max(0, ny) ** FALLOFF * bell(nx - pull.grab.x);
    }

    return [x + dx, y + dy] as Point;
  });
}

export interface PipMotion {
  /** Travel along the tuck axis, relative to whichever rest position applies. */
  x: number;
  /**
   * Scale on the media alone, sized so it reaches the furthest point the bulge
   * can push to. The tile itself never scales; this only supplies the pixels the
   * deformed outline exposes, and reads as the picture taking up the tension.
   */
  stretchX: number;
  stretchY: number;
  origin: string;
  /** 0-1 darkening as the tile approaches the tuck. */
  scrim: number;
}

const REST: PipMotion = { x: 0, stretchX: 1, stretchY: 1, origin: "100% 0%", scrim: 0 };
const TUCKED_REST: PipMotion = { ...REST, scrim: 1 };
const NO_PULL: Pull = { left: 0, up: 0, down: 0, grab: { x: 0.5, y: 0.5 } };

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
  pad: number;
  width: number;
  height: number;
  grab: { x: number; y: number };
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
  const shapeRef = useRef<HTMLSpanElement>(null);
  const dragRef = useRef<DragOrigin | null>(null);
  const baseRef = useRef<Point[] | null>(null);
  const isDesktop = useIsDesktopViewport();

  // Lisse runs on a stand-in sized to the tile rather than the tile itself: the
  // tile's box is deliberately oversized so the bulge has somewhere to go, and a
  // squircle fitted to that box would be the wrong shape.
  useSmoothCorners(shapeRef, {
    radius: isDesktop ? DESKTOP_RADIUS : MOBILE_RADIUS,
    smoothing: CORNER_SMOOTHING,
  });

  /** Re-samples the resting outline whenever lisse redraws or the tile resizes. */
  useEffect(() => {
    const element = elementRef.current;
    const shape = shapeRef.current;
    if (!element || !shape) {
      return;
    }

    let frame = 0;
    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const pad = parseFloat(getComputedStyle(element).getPropertyValue("--pip-pad")) || 0;
        const d = pathData(getComputedStyle(shape).clipPath);
        if (!d) {
          return;
        }

        // The stand-in sits inset by the padding, so its outline has to move
        // into the tile's own coordinate space before it can be used there.
        baseRef.current = samplePath(d, SAMPLE_COUNT).map(([x, y]) => [x + pad, y + pad] as Point);
        if (!dragRef.current) {
          element.style.clipPath = toClipPath(baseRef.current);
        }
      });
    };

    refresh();
    const resize = new ResizeObserver(refresh);
    resize.observe(shape);
    // Lisse writes the path straight to the style attribute, so watching it is
    // the only reliable signal that a new shape is ready to read.
    const mutation = new MutationObserver(refresh);
    mutation.observe(shape, { attributes: true, attributeFilter: ["style"] });

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
    };
  }, [isDesktop]);

  const applyPull = (origin: DragOrigin, pull: Pull) => {
    const element = elementRef.current;
    const base = baseRef.current;
    if (!element || !base) {
      return;
    }

    const points =
      pull.left || pull.up || pull.down
        ? deform(base, origin.pad, origin.width, origin.height, pull)
        : base;
    element.style.clipPath = toClipPath(points);
  };

  /** Layout numbers the drag needs, read once per gesture rather than per move. */
  const measure = (event: ReactPointerEvent<HTMLDivElement>) => {
    const element = elementRef.current;
    if (!element) {
      return { travel: 0, inset: 0, pad: 0, width: 1, height: 1, grab: { x: 0.5, y: 0.5 } };
    }

    const styles = getComputedStyle(element);
    const visible = parseFloat(styles.getPropertyValue("--pip-visible")) || 0;
    const inset = parseFloat(styles.getPropertyValue("--pip-inset")) || 0;
    const pad = parseFloat(styles.getPropertyValue("--pip-pad")) || 0;
    const width = Math.max(1, element.offsetWidth - pad * 2);
    const height = Math.max(1, element.offsetHeight - pad * 2);

    // Where inside the tile the press landed, which is where the bulge peaks.
    const bounds = element.getBoundingClientRect();
    const grab = {
      x: clamp((event.clientX - bounds.left - pad) / width, 0, 1),
      y: clamp((event.clientY - bounds.top - pad) / height, 0, 1),
    };

    return { travel: inset + width - visible, inset, pad, width, height, grab };
  };

  /**
   * Rightward travel is the tuck, and the only direction the tile actually
   * moves. Every other direction flows the outline outward instead: the grabbed
   * edge stretches toward the pointer while the rest of the tile holds its shape.
   */
  const resolve = (origin: DragOrigin, raw: { x: number; y: number }): [PipMotion, Pull, boolean] => {
    const abs = origin.startAbs + raw.x;
    const freeX = clamp(abs, 0, origin.travel);
    const tucked = abs >= origin.travel * COMMIT_FRACTION;

    // Past the tuck the tile is against the frame, so there is nowhere left to
    // go; before rest it flows out to the left instead of sliding.
    const left = abs < 0 ? elastic(-abs, PULL_LIMIT) : 0;
    // Upward is capped by the inset, which puts the ceiling exactly at the top
    // of the media box: the bulge can reach the frame but never cross it.
    const up = raw.y < 0 ? elastic(-raw.y, origin.inset) : 0;
    const down = raw.y > 0 ? elastic(raw.y, PULL_LIMIT) : 0;

    return [
      {
        x: freeX - (tucked ? origin.travel : 0),
        stretchX: (origin.width + left) / origin.width,
        stretchY: (origin.height + up + down) / origin.height,
        // Anchor the media on the corner opposite the pull so it feeds pixels
        // into the bulge rather than sliding away from it.
        origin: `100% ${up > 0 ? "100%" : "0%"}`,
        scrim: clamp(abs / Math.max(origin.travel, 1), 0, 1),
      },
      { left, up, down, grab: origin.grab },
      tucked,
    ];
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const metrics = measure(event);
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

    const [motion, pull, tucked] = resolve(origin, raw);
    origin.tucked = tucked;
    applyPull(origin, pull);
    state.moveTo(motion, tucked);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const origin = dragRef.current;
    dragRef.current = null;
    if (!origin) {
      return;
    }

    event.stopPropagation();
    // Releasing lets the outline flow back; the transition carries it home.
    applyPull(origin, NO_PULL);

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

  const mediaStyle = {
    "--pip-stretch-x": state.motion.stretchX,
    "--pip-stretch-y": state.motion.stretchY,
    "--pip-origin": state.motion.origin,
  } as CSSProperties;

  return (
    <div
      ref={elementRef}
      className={className}
      style={
        {
          "--pip-drag-x": `${state.motion.x}px`,
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
      {/* Shape source only: lisse draws the squircle here and nothing paints it. */}
      <span ref={shapeRef} className="case-study-pip-shape" aria-hidden="true" />
      {/* The frame carries the stretch so the media stays a plain cover fill. */}
      <span className="case-study-pip-frame" style={mediaStyle}>
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
          <Image
            className="case-study-pip-media"
            src={mediaUrl(asset.src)}
            alt={asset.alt ?? ""}
            fill
            sizes="120px"
          />
        )}
      </span>
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
