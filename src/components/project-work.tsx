"use client";

import { flushSync } from "react-dom";
import { WORK_OPTION_TRANSITION as DENSITY_TRANSITION, WORK_OPTION_HIDDEN as DENSITY_HIDDEN, WORK_OPTION_VISIBLE as DENSITY_VISIBLE, MenuOptionText, WorkGlyphControl } from "@/components/work-glyph-control";
import { HomepageCard } from "@/components/homepage-card";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FocusEvent, PointerEvent as ReactPointerEvent } from "react";
import { useProjectDisplayState } from "@/components/project-display-state";
import type { DesktopDensity } from "@/components/project-display-state";
import { PROJECT_PREVIEWS } from "@/lib/project-previews";
import { sortProjects } from "@/lib/project-order";
import { arrangeProjectGrid, expandProjectGrid } from "@/lib/project-arrangement";
import { usePortfolioExperiments } from "@/components/portfolio-experiments";
import { ProjectFocus } from "@/components/project-focus";
import type { ProjectFocusSelection } from "@/components/project-focus";

const SORT_OPTIONS = [
  { value: "recent", label: "Recent" },
  { value: "random", label: "Random" },
] as const;

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

export function ProjectWork() {
  const { projectInteractionMode } = usePortfolioExperiments();
  const [focusSelection, setFocusSelection] = useState<ProjectFocusSelection | null>(null);
  const closeFocus = useCallback(() => setFocusSelection(null), []);
  const { featuredOrder, editingOrder, swapOrder, desktopDensity, setDesktopDensity, densityChoices, mobileColumns, setMobileColumns, sortMode, setSortMode, randomSeed, reshuffle } =
    useProjectDisplayState();
  const gridRef = useRef<HTMLUListElement>(null);
  const layoutAnimations = useRef<Animation[]>([]);
  const [sortSelection, setSortSelection] = useState(0);
  const [gridSelection, setGridSelection] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  useEffect(() => {
    if (!editingOrder) return;
    const frame = requestAnimationFrame(() => { setExpandedId(null); setHoveredId(null); setFocusSelection(null); });
    return () => cancelAnimationFrame(frame);
  }, [editingOrder]);
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
    setGridSelection(value => value + 1);
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
    animateGridChange(() => {
      beginGridLabelTransition();
      setHasChangedDensity(true);
      setDesktopDensity(density);
    });
  };

  const toggleMobileGrid = () => {
    if (isMobile) {
      animateGridChange(() => {
        beginGridLabelTransition();
        setMobileColumns((current) => (current === 1 ? 2 : 1));
      });
    }
  };

  const selectDesktopSort = (nextSortMode: (typeof SORT_OPTIONS)[number]["value"]) => {
    setSortSelection(value => value + 1);
    setHasChangedSort(true);
    // Picking Random reshuffles, including when it is already the active sort.
    if (editingOrder) return;
    if (nextSortMode === "random") {
      reshuffle();
    }
    setSortMode(nextSortMode);
  };

  const cycleMobileSort = () => {
    if (!isMobile || editingOrder) {
      return;
    }

    setSortSelection(value => value + 1);
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

    return sortProjects(PROJECT_PREVIEWS, featuredOrder, sortMode === "recent");
  }, [randomSeed, sortMode, featuredOrder]);

  const animateGridChange = (update: () => void) => {
    const grid = gridRef.current;
    if (!grid || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      update();
      return;
    }
    const tiles = Array.from(grid.querySelectorAll<HTMLElement>(".homepage-card"));
    const before = new Map(tiles.map(tile => [tile.dataset.projectId, tile.getBoundingClientRect()]));
    layoutAnimations.current.forEach(animation => animation.cancel());
    layoutAnimations.current = [];
    flushSync(update);
    const tokens = getComputedStyle(document.documentElement);
    // Production CSS may serialize milliseconds as seconds.
    const duration = tokens.getPropertyValue("--project-layout-duration").trim();
    const timing = {
      duration: parseFloat(duration) * (duration.endsWith("ms") ? 1 : 1000),
      easing: `cubic-bezier(${tokens.getPropertyValue("--project-layout-ease").trim()})`,
    };
    tiles.forEach(tile => {
      const from = before.get(tile.dataset.projectId), to = tile.getBoundingClientRect();
      if (!from || !to.width || !to.height) return;
      const dx = from.left - to.left, dy = from.top - to.top;
      const sx = from.width / to.width, sy = from.height / to.height;
      if (!dx && !dy && sx === 1 && sy === 1) return;
      layoutAnimations.current.push(tile.animate([
        { transformOrigin: "top left", transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
        { transformOrigin: "top left", transform: "none" },
      ], timing));
      const label = tile.querySelector<HTMLElement>(".homepage-project-overlay");
      if (!label) return;
      const inset = getComputedStyle(label);
      const left = parseFloat(inset.left), top = parseFloat(inset.top);
      // Counter-scale the label through the tween so type and corner insets stay steady.
      const frames = Array.from({ length: 21 }, (_, index) => {
        const x = sx + (1 - sx) * index / 20, y = sy + (1 - sy) * index / 20;
        return { transformOrigin: "top left", transform: `translate(${left * (1 / x - 1)}px, ${top * (1 / y - 1)}px) scale(${1 / x}, ${1 / y})` };
      });
      layoutAnimations.current.push(label.animate(frames, timing));
    });
  };

  const togglePreview = (id: string) => {
    const update = () => setExpandedId(current => current === id ? null : id);
    if (isMobile) animateGridChange(update);
    else update();
  };

  const activeExpandedId = projectInteractionMode === "focus" ? null : expandedId;
  const columns = isMobile ? mobileColumns : desktopDensity;
  const arrangedPreviews = useMemo(() => editingOrder ? sortedPreviews : arrangeProjectGrid(sortedPreviews, columns),
    [sortedPreviews, columns, editingOrder]);
  const displayedPreviews = isMobile && mobileColumns === 2 && activeExpandedId
    ? expandProjectGrid(arrangedPreviews, mobileColumns, activeExpandedId)
    : arrangedPreviews;

  const navigateFocus = (direction: -1 | 1, keyboard: boolean) => {
    if (!focusSelection || displayedPreviews.length < 2) return;
    const index = displayedPreviews.findIndex(preview => preview.id === focusSelection.preview.id);
    const preview = displayedPreviews[(index + direction + displayedPreviews.length) % displayedPreviews.length];
    const trigger = gridRef.current?.querySelector<HTMLButtonElement>(`[data-project-id="${preview.id}"] .homepage-card-trigger`);
    if (trigger) setFocusSelection({ preview, trigger, origin: trigger.getBoundingClientRect(), keyboard, navigation: true });
  };
  const focusIndex = focusSelection ? displayedPreviews.findIndex(preview => preview.id === focusSelection.preview.id) : -1;

  return (
    <section className="portfolio-work" aria-label="Work" onPointerMoveCapture={handleWorkPointerMove}>
      <div className="work-toolbar text-bodySans" aria-label="Project display controls">
        <div
          ref={sortControlRef}
          className="work-density-control"
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
                    <MenuOptionText labelId={`sort:${option.value}`} text={option.label} />
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
              selection={sortSelection}
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
                    <MenuOptionText labelId={`density:${density}`} text={`${density} x ${density}`} />
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
                selection={gridSelection}
                reserveScrambleWidth={isGridLabelTransitioning}
              />
            </span>
            <span className="work-grid-label-mobile">
              <WorkGlyphControl
                text={mobileGridLabel}
                selection={gridSelection}
                reserveScrambleWidth={isGridLabelTransitioning}
              />
            </span>
          </button>
        </div>
      </div>

      <ul ref={gridRef} className="project-grid" style={gridStyle} aria-label="Selected work"
        onFocusCapture={event => {
          if (projectInteractionMode !== "overlay" || !expandedId) return;
          const trigger = (event.target as Element).closest(".homepage-card-trigger");
          if (trigger?.matches(":focus-visible") && trigger.closest<HTMLElement>("[data-project-id]")?.dataset.projectId !== expandedId) setExpandedId(null);
        }}
        onPointerLeave={() => setHoveredId(null)}>
        {displayedPreviews.map((preview) => (
          <HomepageCard key={preview.id} preview={preview} isMobile={isMobile}
            reorder={editingOrder ? { swap: swapOrder, columns: isMobile ? mobileColumns : desktopDensity, order: featuredOrder } : undefined}
            expanded={!editingOrder && activeExpandedId === preview.id}
            cardOverlay={projectInteractionMode === "overlay"}
            hovered={!editingOrder && hoveredId === preview.id}
            onHover={() => setHoveredId(preview.id)}
            onClearHover={() => setHoveredId(null)}
            focusActive={focusSelection?.preview.id === preview.id}
            onOpenFocus={projectInteractionMode === "focus" ? (trigger, keyboard) => {
              const origin = trigger.getBoundingClientRect();
              layoutAnimations.current.forEach(animation => animation.finish());
              setFocusSelection({ preview, trigger, origin, keyboard });
            } : undefined}
            onToggle={() => togglePreview(preview.id)} />
        ))}
      </ul>
      {focusSelection && <ProjectFocus selection={focusSelection} neighbors={{ previous: displayedPreviews[(focusIndex - 1 + displayedPreviews.length) % displayedPreviews.length], next: displayedPreviews[(focusIndex + 1) % displayedPreviews.length] }} onClose={closeFocus} onNavigate={navigateFocus} position={focusIndex + 1} total={displayedPreviews.length} />}
    </section>
  );
}
