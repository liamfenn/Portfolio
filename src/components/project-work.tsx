"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useScramble } from "use-scramble";
import type { CSSProperties, FocusEvent } from "react";
import { PROJECT_PREVIEWS } from "@/lib/project-previews";

const DESKTOP_DENSITIES = [2, 3, 4, 5] as const;
const GRID_LABEL_GLYPHS = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789").map(
  (glyph) => glyph.charCodeAt(0),
) as [number, number, ...number[]];

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

const DENSITY_MENU_VARIANTS = {
  open: {},
  closed: {
    transition: {
      staggerChildren: 0.036,
      staggerDirection: 1,
    },
  },
} as const;

const DENSITY_MENU_SLOT_VARIANTS = {
  open: {
    visibility: "visible",
  },
  closed: {
    visibility: "hidden",
    transition: {
      duration: 0,
    },
  },
} as const;

function GridGlyphLabel({ text }: { text: string }) {
  const { ref } = useScramble({
    text,
    playOnMount: false,
    speed: 0.58,
    tick: 1,
    step: 1,
    scramble: 4,
    seed: 2,
    chance: 1,
    range: GRID_LABEL_GLYPHS,
    overdrive: false,
    overflow: true,
    ignore: [" "],
  });

  return (
    <span ref={ref} className="work-grid-label" data-final-text={text} aria-hidden="true">
      {text}
    </span>
  );
}

export function ProjectWork() {
  const [desktopDensity, setDesktopDensity] = useState<(typeof DESKTOP_DENSITIES)[number]>(3);
  const [mobileColumns, setMobileColumns] = useState<1 | 2>(1);
  const [isMobile, setIsMobile] = useState(false);
  const [isDensityMenuOpen, setIsDensityMenuOpen] = useState(false);
  const [hasChangedDensity, setHasChangedDensity] = useState(false);
  const densityControlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateMobileState = () => {
      setIsMobile(mediaQuery.matches);
      if (mediaQuery.matches) {
        setIsDensityMenuOpen(false);
      }
    };

    updateMobileState();
    mediaQuery.addEventListener("change", updateMobileState);
    return () => mediaQuery.removeEventListener("change", updateMobileState);
  }, []);

  const openDensityMenu = () => {
    if (!isMobile) {
      setHasChangedDensity(false);
      setIsDensityMenuOpen(true);
    }
  };

  const closeDensityMenu = () => {
    if (!isMobile) {
      setIsDensityMenuOpen(false);
      setHasChangedDensity(false);
    }
  };

  const handleDensityControlBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      closeDensityMenu();
    }
  };

  const selectDesktopDensity = (density: (typeof DESKTOP_DENSITIES)[number]) => {
    setHasChangedDensity(true);
    setDesktopDensity(density);
  };

  const toggleMobileGrid = () => {
    if (isMobile) {
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
          onPointerLeave={closeDensityMenu}
          onFocus={openDensityMenu}
          onBlur={handleDensityControlBlur}
        >
          <AnimatePresence initial={false}>
            {isDensityMenuOpen ? (
              <motion.div
                className="work-density-menu"
                role="menu"
                aria-label="Grid density"
                variants={DENSITY_MENU_VARIANTS}
                initial="open"
                animate="open"
                exit="closed"
              >
                {densityOptions.map((density, index) => (
                  <motion.div
                    className="work-density-slot"
                    role="none"
                    key={index}
                    variants={DENSITY_MENU_SLOT_VARIANTS}
                  >
                    <AnimatePresence initial={false} mode="popLayout">
                      <motion.button
                        key={density}
                        type="button"
                        role="menuitemradio"
                        aria-checked="false"
                        className={`work-density-option${hasChangedDensity ? "" : " is-opening"}`}
                        style={
                          {
                            "--density-option-index": densityOptions.length - 1 - index,
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
                    </AnimatePresence>
                  </motion.div>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>

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
            <span className="work-control-square" aria-hidden="true" />
            <GridGlyphLabel text={gridLabel} />
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
