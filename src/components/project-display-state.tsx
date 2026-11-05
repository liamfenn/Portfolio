"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { PROJECT_PREVIEWS } from "@/lib/project-previews";
import type { ProjectPreview } from "@/lib/project-previews";
import sharedOrder from "@/lib/featured-order.json";
import { placeNewProjects } from "@/lib/project-order";

const FILLED_PROJECTS = PROJECT_PREVIEWS.filter(project => project.media);
const FEATURED_ORDER = placeNewProjects(FILLED_PROJECTS, sharedOrder.order).map(project => project.id);

export type DesktopDensity = 2 | 3 | 4 | 6;
export type MobileColumns = 1 | 2;
export type ProjectSortMode = "recent" | "random";

/**
 * Above this width a 2-up grid leaves tiles absurdly large, so the ladder shifts
 * up a rung. Every current MacBook sits below it (the 16" is 1728pt at default
 * scaling) while a Studio Display at 2560pt sits well above.
 */
const WIDE_VIEWPORT_QUERY = "(min-width: 1920px)";

export const NARROW_DENSITIES = [2, 3, 4] as const;
export const WIDE_DENSITIES = [3, 4, 6] as const;

const NARROW_DEFAULT_DENSITY: DesktopDensity = 3;
const WIDE_DEFAULT_DENSITY: DesktopDensity = 4;

interface ProjectDisplayState {
  featuredOrder: string[];
  desktopDensity: DesktopDensity;
  setDesktopDensity: Dispatch<SetStateAction<DesktopDensity>>;
  /** Densities offered at the current viewport width, ascending. */
  densityChoices: readonly DesktopDensity[];
  mobileColumns: MobileColumns;
  setMobileColumns: Dispatch<SetStateAction<MobileColumns>>;
  sortMode: ProjectSortMode;
  setSortMode: Dispatch<SetStateAction<ProjectSortMode>>;
  /** Changes on every Random selection. Keeps one shuffle stable across renders. */
  randomSeed: number;
  reshuffle: () => void;
  /** The project the header is showing while the focused view is open. Clears as the view starts closing. */
  focusedProject: ProjectPreview | null;
  setFocusedProject: Dispatch<SetStateAction<ProjectPreview | null>>;
}

const ProjectDisplayContext = createContext<ProjectDisplayState | null>(null);

export function ProjectDisplayProvider({ children }: { children: ReactNode }) {
  const [desktopDensity, setDensityState] = useState<DesktopDensity>(NARROW_DEFAULT_DENSITY);
  const [isWideViewport, setIsWideViewport] = useState(false);
  const [mobileColumns, setMobileColumns] = useState<MobileColumns>(1);
  const [sortMode, setSortMode] = useState<ProjectSortMode>("recent");
  const [randomSeed, setRandomSeed] = useState(0);
  const [focusedProject, setFocusedProject] = useState<ProjectPreview | null>(null);
  const reshuffle = useCallback(() => setRandomSeed((current) => current + 1), []);
  // Once the reader picks a density we keep it across resizes rather than
  // snapping back to the width default, clamping only if it leaves the range.
  const hasChosenDensity = useRef(false);

  const setDesktopDensity = useCallback<Dispatch<SetStateAction<DesktopDensity>>>((value) => {
    hasChosenDensity.current = true;
    setDensityState(value);
  }, [setDensityState]);

  useEffect(() => {
    const query = window.matchMedia(WIDE_VIEWPORT_QUERY);

    const apply = () => {
      const isWide = query.matches;
      setIsWideViewport(isWide);
      setDensityState((current) => {
        const choices = isWide ? WIDE_DENSITIES : NARROW_DENSITIES;
        const fallback = isWide ? WIDE_DEFAULT_DENSITY : NARROW_DEFAULT_DENSITY;

        if (!hasChosenDensity.current) {
          return fallback;
        }

        return (choices as readonly DesktopDensity[]).includes(current) ? current : fallback;
      });
    };

    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  return (
    <ProjectDisplayContext.Provider
      value={{
        featuredOrder: FEATURED_ORDER,
        desktopDensity,
        setDesktopDensity,
        densityChoices: isWideViewport ? WIDE_DENSITIES : NARROW_DENSITIES,
        mobileColumns,
        setMobileColumns,
        sortMode,
        setSortMode,
        randomSeed,
        reshuffle,
        focusedProject,
        setFocusedProject,
      }}
    >
      {children}
    </ProjectDisplayContext.Provider>
  );
}

export function useProjectDisplayState() {
  const state = useContext(ProjectDisplayContext);

  if (!state) {
    throw new Error("useProjectDisplayState must be used within ProjectDisplayProvider");
  }

  return state;
}
