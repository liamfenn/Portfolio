"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useScramble } from "use-scramble";
import type { CSSProperties, FocusEvent, PointerEvent as ReactPointerEvent } from "react";
import { PROJECT_PREVIEWS } from "@/lib/project-previews";

const DESKTOP_DENSITIES = [2, 3, 4, 5] as const;
const GRID_LABEL_GLYPHS = Array.from("GridList2345x").map((glyph) => glyph.charCodeAt(0)) as [
  number,
  number,
  ...number[],
];

const DENSITY_TRANSITION = {
  duration: 0.28,
  ease: [0.16, 1, 0.3, 1],
} as const;

const DENSITY_HIDDEN = {
  opacity: 0,
  scale: 0.74,
  filter: "blur(5px)",
} as const;

const DENSITY_VISIBLE = {
  opacity: 1,
  scale: 1,
  filter: "blur(0px)",
} as const;

function GridGlyphControl({
  text,
  reserveScrambleWidth = false,
}: {
  text: string;
  reserveScrambleWidth?: boolean;
}) {
  const [isScrambling, setIsScrambling] = useState(false);
  const shouldReserveScrambleWidth = isScrambling || reserveScrambleWidth;
  const { ref } = useScramble({
    text,
    playOnMount: false,
    speed: 0.68,
    tick: 1,
    step: 1,
    scramble: 2,
    seed: 1,
    chance: 1,
    range: GRID_LABEL_GLYPHS,
    overdrive: false,
    overflow: true,
    ignore: [" "],
    onAnimationFrame: (result) => {
      if (result !== text) {
        setIsScrambling(true);
      }
    },
    onAnimationEnd: () => {
      setIsScrambling(false);
    },
  });

  return (
    <span className={`work-grid-label-group${shouldReserveScrambleWidth ? " is-scrambling" : ""}`}>
      <motion.span
        layout="position"
        className="work-control-square"
        aria-hidden="true"
        transition={
          shouldReserveScrambleWidth ? { duration: 0 } : { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
        }
      />
      <span ref={ref} className="work-grid-label" data-final-text={text} aria-hidden="true">
        {text}
      </span>
    </span>
  );
}

export function ProjectWork() {
  const [desktopDensity, setDesktopDensity] = useState<(typeof DESKTOP_DENSITIES)[number]>(3);
  const [mobileColumns, setMobileColumns] = useState<1 | 2>(1);
  const [isGridLabelTransitioning, setIsGridLabelTransitioning] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isDensityMenuOpen, setIsDensityMenuOpen] = useState(false);
  const [isDensityMenuRendered, setIsDensityMenuRendered] = useState(false);
  const [hasChangedDensity, setHasChangedDensity] = useState(false);
  const densityControlRef = useRef<HTMLDivElement>(null);
  const densityMenuExitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gridLabelTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateMobileState = () => {
      setIsMobile(mediaQuery.matches);
      if (mediaQuery.matches) {
        if (densityMenuExitTimeoutRef.current) {
          clearTimeout(densityMenuExitTimeoutRef.current);
          densityMenuExitTimeoutRef.current = null;
        }
        setIsDensityMenuOpen(false);
        setIsDensityMenuRendered(false);
      }
    };

    updateMobileState();
    mediaQuery.addEventListener("change", updateMobileState);
    return () => {
      mediaQuery.removeEventListener("change", updateMobileState);
      if (densityMenuExitTimeoutRef.current) {
        clearTimeout(densityMenuExitTimeoutRef.current);
      }
      if (gridLabelTransitionTimeoutRef.current) {
        clearTimeout(gridLabelTransitionTimeoutRef.current);
      }
    };
  }, []);

  const beginGridLabelTransition = () => {
    if (gridLabelTransitionTimeoutRef.current) {
      clearTimeout(gridLabelTransitionTimeoutRef.current);
    }
    setIsGridLabelTransitioning(true);
    gridLabelTransitionTimeoutRef.current = setTimeout(() => {
      setIsGridLabelTransitioning(false);
      gridLabelTransitionTimeoutRef.current = null;
    }, 120);
  };

  const openDensityMenu = () => {
    if (!isMobile) {
      if (densityMenuExitTimeoutRef.current) {
        clearTimeout(densityMenuExitTimeoutRef.current);
        densityMenuExitTimeoutRef.current = null;
      }
      if (!isDensityMenuOpen) {
        beginGridLabelTransition();
        setHasChangedDensity(false);
      }
      setIsDensityMenuRendered(true);
      setIsDensityMenuOpen(true);
    }
  };

  const closeDensityMenu = () => {
    if (!isMobile) {
      if (isDensityMenuOpen) {
        beginGridLabelTransition();
      }
      setIsDensityMenuOpen(false);
      setHasChangedDensity(false);
      if (densityMenuExitTimeoutRef.current) {
        clearTimeout(densityMenuExitTimeoutRef.current);
      }
      densityMenuExitTimeoutRef.current = setTimeout(() => {
        setIsDensityMenuRendered(false);
        densityMenuExitTimeoutRef.current = null;
      }, 110);
    }
  };

  const handleDensityControlBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) {
      closeDensityMenu();
    }
  };

  const handleDensityControlPointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    const { clientX, clientY, currentTarget } = event;
    const menu = currentTarget.querySelector<HTMLElement>(".work-density-menu");
    const hitAreas = [currentTarget.getBoundingClientRect(), menu?.getBoundingClientRect()].filter(
      (bounds): bounds is DOMRect => Boolean(bounds),
    );
    const pointerIsStillInside = hitAreas.some(
      (bounds) =>
        clientX >= bounds.left - 1 &&
        clientX <= bounds.right + 1 &&
        clientY >= bounds.top - 1 &&
        clientY <= bounds.bottom + 1,
    );

    if (!pointerIsStillInside) {
      closeDensityMenu();
    }
  };

  const selectDesktopDensity = (density: (typeof DESKTOP_DENSITIES)[number]) => {
    beginGridLabelTransition();
    setHasChangedDensity(true);
    setDesktopDensity(density);
  };

  const toggleMobileGrid = () => {
    if (isMobile) {
      beginGridLabelTransition();
      setMobileColumns((current) => (current === 1 ? 2 : 1));
    }
  };

  const densityOptions = DESKTOP_DENSITIES.filter((density) => density !== desktopDensity);
  const gridLabel = isMobile
    ? mobileColumns === 2
      ? "List"
      : "Grid"
    : isDensityMenuOpen
      ? `${desktopDensity} x ${desktopDensity}`
      : "Grid";
  const gridStyle = {
    "--project-columns": desktopDensity,
    "--project-mobile-columns": mobileColumns,
  } as CSSProperties;

  return (
    <section className="portfolio-work" aria-label="Work">
      <div className="work-toolbar" aria-label="Project display controls">
        <div className="work-toolbar-group">
          <button type="button" className="work-control">
            <Image src="/images/icons/filter-v2.svg" alt="" width={10} height={10} />
            Filter
          </button>
          <button type="button" className="work-control">
            <span className="work-control-square" aria-hidden="true" />
            Sort
          </button>
        </div>

        <div
          ref={densityControlRef}
          className="work-density-control"
          onPointerEnter={openDensityMenu}
          onPointerLeave={handleDensityControlPointerLeave}
          onFocus={openDensityMenu}
          onBlur={handleDensityControlBlur}
        >
          {isDensityMenuRendered ? (
            <div
              className={`work-density-menu${isDensityMenuOpen ? "" : " is-closing"}`}
              role="menu"
              aria-label="Grid density"
              aria-hidden={!isDensityMenuOpen}
            >
              <AnimatePresence initial={false} mode="popLayout">
                {densityOptions.map((density, index) => (
                  <motion.button
                    layout="position"
                    key={density}
                    type="button"
                    role="menuitemradio"
                    aria-checked="false"
                    tabIndex={isDensityMenuOpen ? 0 : -1}
                    className={`work-density-option${
                      isDensityMenuOpen ? (hasChangedDensity ? "" : " is-opening") : " is-closing"
                    }`}
                    style={
                      {
                        "--density-option-index": densityOptions.length - 1 - index,
                        "--density-option-exit-index": index,
                      } as CSSProperties
                    }
                    initial={hasChangedDensity ? DENSITY_HIDDEN : false}
                    animate={DENSITY_VISIBLE}
                    exit={DENSITY_HIDDEN}
                    transition={DENSITY_TRANSITION}
                    onClick={() => selectDesktopDensity(density)}
                  >
                    {density} x {density}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          ) : null}

          <button
            type="button"
            className="work-control work-grid-control"
            role={isMobile ? "switch" : undefined}
            aria-checked={isMobile ? mobileColumns === 2 : undefined}
            aria-haspopup={isMobile ? undefined : "menu"}
            aria-expanded={isMobile ? undefined : isDensityMenuOpen}
            aria-label={isMobile ? `Switch to ${mobileColumns === 1 ? 2 : 1} column grid` : "Grid density"}
            onClick={toggleMobileGrid}
          >
            <GridGlyphControl
              text={gridLabel}
              reserveScrambleWidth={isGridLabelTransitioning}
            />
          </button>
        </div>
      </div>

      <ul className="project-grid" style={gridStyle} aria-label="Selected work">
        {PROJECT_PREVIEWS.map((preview) => (
          <li
            key={preview.id}
            className="project-preview"
            data-case-study-slug={preview.caseStudySlug}
            aria-label={`${preview.label} preview placeholder`}
          >
            <span className="sr-only">
              {preview.label}. This preview will link to /work/{preview.caseStudySlug} when the case study is published.
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
