"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useScramble } from "use-scramble";
import type { CSSProperties, FocusEvent, PointerEvent as ReactPointerEvent } from "react";
import { useProjectDisplayState } from "@/components/project-display-state";
import type { DesktopDensity, ProjectSortMode } from "@/components/project-display-state";
import { ProjectPreviewVideo } from "@/components/project-preview-video";
import { PROJECT_PREVIEWS } from "@/lib/project-previews";
import { getCaseStudyOrder } from "@/lib/case-studies";

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "recent", label: "Recent" },
  { value: "random", label: "Random" },
] as const;

const WORK_LABEL_GLYPHS = Array.from("GridListSortFeaturedRecentRandom23456x–").map((glyph) =>
  glyph.charCodeAt(0),
) as [number, number, ...number[]];

/**
 * Deterministic shuffle so a given seed always produces the same order. Reshuffling
 * on every render would reorder the grid continuously.
 */
function shuffleWithSeed<T>(items: readonly T[], seed: number) {
  const result = [...items];
  let state = (seed + 1) * 0x6d2b79f5;
  const random = () => {
    state = Math.imul(state ^ (state >>> 15), state | 1);
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

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

/**
 * Five nodes that all start centred and move into place per sort mode, so the
 * marks morph into one another instead of swapping. Driven by transform rather
 * than the cx/cy/r geometry attributes, which are far less portable.
 */
function SortGlyph({ mode }: { mode: ProjectSortMode }) {
  return (
    <svg className="work-sort-glyph" viewBox="0 0 10 10" data-sort={mode} aria-hidden="true">
      <circle className="work-sort-node work-sort-node-center" cx="5" cy="5" r="1.5625" />
      <circle className="work-sort-node work-sort-node-a" cx="5" cy="5" r="1.5625" />
      <circle className="work-sort-node work-sort-node-b" cx="5" cy="5" r="1.5625" />
      <circle className="work-sort-node work-sort-node-c" cx="5" cy="5" r="1.5625" />
      <circle className="work-sort-node work-sort-node-d" cx="5" cy="5" r="1.5625" />
    </svg>
  );
}

function WorkGlyphControl({
  text,
  reserveScrambleWidth = false,
  variant = "grid",
  isSplit = false,
  sortMode = "featured",
}: {
  text: string;
  reserveScrambleWidth?: boolean;
  variant?: "grid" | "sort";
  /** Splits the solid square into the 2x2 grid glyph. */
  isSplit?: boolean;
  sortMode?: ProjectSortMode;
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
    range: WORK_LABEL_GLYPHS,
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
    <span
      className={`work-label-group work-${variant}-label-group${
        shouldReserveScrambleWidth ? " is-scrambling" : ""
      }`}
    >
      {variant === "sort" ? (
        <SortGlyph mode={sortMode} />
      ) : (
        <motion.span
          layout="position"
          className={`work-control-square${isSplit ? " is-split" : ""}`}
          aria-hidden="true"
          transition={{ duration: shouldReserveScrambleWidth ? 0.14 : 0.2, ease: [0.65, 0, 0.35, 1] }}
        >
          <i />
          <i />
          <i />
          <i />
        </motion.span>
      )}
      <span ref={ref} className="work-grid-label" data-final-text={text} aria-hidden="true">
        {text}
      </span>
    </span>
  );
}

export function ProjectWork() {
  const { desktopDensity, setDesktopDensity, densityChoices, mobileColumns, setMobileColumns, sortMode, setSortMode, randomSeed, reshuffle } =
    useProjectDisplayState();
  const [isGridLabelTransitioning, setIsGridLabelTransitioning] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isDensityMenuOpen, setIsDensityMenuOpen] = useState(false);
  const [isDensityMenuRendered, setIsDensityMenuRendered] = useState(false);
  const [hasChangedDensity, setHasChangedDensity] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isSortMenuRendered, setIsSortMenuRendered] = useState(false);
  const [hasChangedSort, setHasChangedSort] = useState(false);
  const densityControlRef = useRef<HTMLDivElement>(null);
  const sortControlRef = useRef<HTMLDivElement>(null);
  const densityMenuExitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sortMenuExitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gridLabelTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const densityHoverValidationFrameRef = useRef<number | null>(null);
  const sortHoverValidationFrameRef = useRef<number | null>(null);
  const densityMenuOpenedByPointerRef = useRef(false);
  const sortMenuOpenedByPointerRef = useRef(false);

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
        setIsSortMenuOpen(false);
        setIsSortMenuRendered(false);
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
      if (sortMenuExitTimeoutRef.current) {
        clearTimeout(sortMenuExitTimeoutRef.current);
      }
      if (densityHoverValidationFrameRef.current !== null) {
        cancelAnimationFrame(densityHoverValidationFrameRef.current);
      }
      if (sortHoverValidationFrameRef.current !== null) {
        cancelAnimationFrame(sortHoverValidationFrameRef.current);
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
    }, 180);
  };

  const openDensityMenu = () => {
    if (!isMobile) {
      if (densityMenuExitTimeoutRef.current) {
        clearTimeout(densityMenuExitTimeoutRef.current);
        densityMenuExitTimeoutRef.current = null;
      }
      if (!isDensityMenuOpen) {
        setHasChangedDensity(false);
      }
      setIsDensityMenuRendered(true);
      setIsDensityMenuOpen(true);
    }
  };

  const closeDensityMenu = () => {
    if (!isMobile) {
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

  const openSortMenu = () => {
    if (!isMobile) {
      if (sortMenuExitTimeoutRef.current) {
        clearTimeout(sortMenuExitTimeoutRef.current);
        sortMenuExitTimeoutRef.current = null;
      }
      if (!isSortMenuOpen) {
        setHasChangedSort(false);
      }
      setIsSortMenuRendered(true);
      setIsSortMenuOpen(true);
    }
  };

  const closeSortMenu = () => {
    if (!isMobile) {
      setIsSortMenuOpen(false);
      setHasChangedSort(false);
      if (sortMenuExitTimeoutRef.current) {
        clearTimeout(sortMenuExitTimeoutRef.current);
      }
      sortMenuExitTimeoutRef.current = setTimeout(() => {
        setIsSortMenuRendered(false);
        sortMenuExitTimeoutRef.current = null;
      }, 110);
    }
  };

  const handleSortControlBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) {
      closeSortMenu();
    }
  };

  const pointIsInsideDensityControl = (clientX: number, clientY: number) => {
    if (!densityControlRef.current) {
      return false;
    }

    const menu = densityControlRef.current.querySelector<HTMLElement>(".work-density-menu");
    const hitAreas = [densityControlRef.current.getBoundingClientRect(), menu?.getBoundingClientRect()].filter(
      (bounds): bounds is DOMRect => Boolean(bounds),
    );

    return hitAreas.some(
      (bounds) =>
        clientX >= bounds.left - 1 &&
        clientX <= bounds.right + 1 &&
        clientY >= bounds.top - 1 &&
        clientY <= bounds.bottom + 1,
    );
  };

  const pointIsInsideSortControl = (clientX: number, clientY: number) => {
    if (!sortControlRef.current) {
      return false;
    }

    const menu = sortControlRef.current.querySelector<HTMLElement>(".work-density-menu");
    const hitAreas = [sortControlRef.current.getBoundingClientRect(), menu?.getBoundingClientRect()].filter(
      (bounds): bounds is DOMRect => Boolean(bounds),
    );

    return hitAreas.some(
      (bounds) =>
        clientX >= bounds.left - 1 &&
        clientX <= bounds.right + 1 &&
        clientY >= bounds.top - 1 &&
        clientY <= bounds.bottom + 1,
    );
  };

  const handleDensityControlPointerEnter = () => {
    densityMenuOpenedByPointerRef.current = true;
    openDensityMenu();
    if (densityHoverValidationFrameRef.current !== null) {
      cancelAnimationFrame(densityHoverValidationFrameRef.current);
    }
    densityHoverValidationFrameRef.current = requestAnimationFrame(() => {
      densityHoverValidationFrameRef.current = requestAnimationFrame(() => {
        densityHoverValidationFrameRef.current = null;
        if (!densityControlRef.current?.matches(":hover")) {
          densityMenuOpenedByPointerRef.current = false;
          closeDensityMenu();
        }
      });
    });
  };

  const handleDensityControlPointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointIsInsideDensityControl(event.clientX, event.clientY)) {
      if (densityHoverValidationFrameRef.current !== null) {
        cancelAnimationFrame(densityHoverValidationFrameRef.current);
        densityHoverValidationFrameRef.current = null;
      }
      densityMenuOpenedByPointerRef.current = false;
      closeDensityMenu();
    }
  };

  const handleSortControlPointerEnter = () => {
    sortMenuOpenedByPointerRef.current = true;
    openSortMenu();
    if (sortHoverValidationFrameRef.current !== null) {
      cancelAnimationFrame(sortHoverValidationFrameRef.current);
    }
    sortHoverValidationFrameRef.current = requestAnimationFrame(() => {
      sortHoverValidationFrameRef.current = requestAnimationFrame(() => {
        sortHoverValidationFrameRef.current = null;
        if (!sortControlRef.current?.matches(":hover")) {
          sortMenuOpenedByPointerRef.current = false;
          closeSortMenu();
        }
      });
    });
  };

  const handleSortControlPointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointIsInsideSortControl(event.clientX, event.clientY)) {
      if (sortHoverValidationFrameRef.current !== null) {
        cancelAnimationFrame(sortHoverValidationFrameRef.current);
        sortHoverValidationFrameRef.current = null;
      }
      sortMenuOpenedByPointerRef.current = false;
      closeSortMenu();
    }
  };

  const handleWorkPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (
      isDensityMenuOpen &&
      densityMenuOpenedByPointerRef.current &&
      !pointIsInsideDensityControl(event.clientX, event.clientY)
    ) {
      densityMenuOpenedByPointerRef.current = false;
      closeDensityMenu();
    }
    if (isSortMenuOpen && sortMenuOpenedByPointerRef.current && !pointIsInsideSortControl(event.clientX, event.clientY)) {
      sortMenuOpenedByPointerRef.current = false;
      closeSortMenu();
    }
  };

  const selectDesktopDensity = (density: DesktopDensity) => {
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

  const selectDesktopSort = (nextSortMode: (typeof SORT_OPTIONS)[number]["value"]) => {
    setHasChangedSort(true);
    // Picking Random reshuffles, including when it is already the active sort.
    if (nextSortMode === "random") {
      reshuffle();
    }
    setSortMode(nextSortMode);
  };

  const cycleMobileSort = () => {
    if (!isMobile) {
      return;
    }

    const currentIndex = SORT_OPTIONS.findIndex((option) => option.value === sortMode);
    const next = SORT_OPTIONS[(currentIndex + 1) % SORT_OPTIONS.length].value;
    if (next === "random") {
      reshuffle();
    }
    setSortMode(next);
  };

  const densityOptions = densityChoices.filter((density) => density !== desktopDensity);
  const selectedSort = SORT_OPTIONS.find((option) => option.value === sortMode) ?? SORT_OPTIONS[0];
  const sortOptions = SORT_OPTIONS.filter((option) => option.value !== sortMode);
  const sortLabel = selectedSort.label;
  // Names the current layout, matching the desktop density and sort labels rather
  // than naming the layout the control would switch to.
  const mobileGridLabel = mobileColumns === 2 ? "Grid" : "List";
  const desktopGridLabel = `${desktopDensity} x ${desktopDensity}`;
  const gridStyle = {
    "--project-columns": desktopDensity,
    "--project-mobile-columns": mobileColumns,
  } as CSSProperties;
  const sortedPreviews = useMemo(() => {
    const entries = PROJECT_PREVIEWS.map((preview, index) => ({ preview, index }));

    if (sortMode === "random") {
      return shuffleWithSeed(entries, randomSeed).map(({ preview }) => preview);
    }

    return entries
      .sort((left, right) => {
        const leftOrder = getCaseStudyOrder(left.preview.caseStudySlug);
        const rightOrder = getCaseStudyOrder(right.preview.caseStudySlug);

        if (sortMode === "featured") {
          return leftOrder.featuredOrder - rightOrder.featuredOrder || left.index - right.index;
        }

        // Recent: newest year first, then newest quarter within it.
        return (
          rightOrder.year - leftOrder.year ||
          rightOrder.quarter - leftOrder.quarter ||
          left.index - right.index
        );
      })
      .map(({ preview }) => preview);
  }, [randomSeed, sortMode]);

  return (
    <section className="portfolio-work" aria-label="Work" onPointerMoveCapture={handleWorkPointerMove}>
      <div className="work-toolbar" aria-label="Project display controls">
        <div
          ref={sortControlRef}
          className="work-density-control work-sort-menu-control"
          onPointerEnter={handleSortControlPointerEnter}
          onPointerLeave={handleSortControlPointerLeave}
          onFocus={openSortMenu}
          onBlur={handleSortControlBlur}
        >
          {isSortMenuRendered ? (
            <div
              className={`work-density-menu work-sort-menu${isSortMenuOpen ? "" : " is-closing"}`}
              role="menu"
              aria-label="Project sort order"
              aria-hidden={!isSortMenuOpen}
            >
              <AnimatePresence initial={false} mode="popLayout">
                {sortOptions.map((option, index) => (
                  <motion.button
                    layout="position"
                    key={option.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked="false"
                    tabIndex={isSortMenuOpen ? 0 : -1}
                    className={`work-density-option${
                      isSortMenuOpen ? (hasChangedSort ? "" : " is-opening") : " is-closing"
                    }`}
                    style={
                      {
                        "--density-option-index": sortOptions.length - 1 - index,
                        "--density-option-exit-index": index,
                      } as CSSProperties
                    }
                    initial={hasChangedSort ? DENSITY_HIDDEN : false}
                    animate={DENSITY_VISIBLE}
                    exit={DENSITY_HIDDEN}
                    transition={DENSITY_TRANSITION}
                    onClick={() => selectDesktopSort(option.value)}
                  >
                    {option.label}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          ) : null}

          <button
            type="button"
            className="work-control work-sort-control"
            aria-haspopup={isMobile ? undefined : "menu"}
            aria-expanded={isMobile ? undefined : isSortMenuOpen}
            aria-label={isMobile ? `Sort projects: ${selectedSort.label}` : "Project sort order"}
            onClick={cycleMobileSort}
          >
            <WorkGlyphControl
              text={sortLabel}
              variant="sort"
              sortMode={sortMode}
            />
          </button>
        </div>

        <div
          ref={densityControlRef}
          className="work-density-control"
          onPointerEnter={handleDensityControlPointerEnter}
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
            <span className="work-grid-label-desktop">
              <WorkGlyphControl
                text={desktopGridLabel}
                reserveScrambleWidth={isGridLabelTransitioning}
              />
            </span>
            <span className="work-grid-label-mobile">
              <WorkGlyphControl
                text={mobileGridLabel}
                reserveScrambleWidth={isGridLabelTransitioning}
                isSplit={mobileColumns === 2}
              />
            </span>
          </button>
        </div>
      </div>

      <ul className="project-grid" style={gridStyle} aria-label="Selected work">
        {sortedPreviews.map((preview) => (
          <li
            key={preview.id}
            className="project-preview"
            data-case-study-slug={preview.caseStudySlug}
          >
            <Link
              className="project-preview-link"
              href={`/work/${preview.caseStudySlug}`}
              aria-label={`View the ${preview.label} case study`}
            >
              {preview.media?.kind === "video" ? <ProjectPreviewVideo asset={preview.media} /> : null}
              <span className="sr-only">{preview.label} case study preview.</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
