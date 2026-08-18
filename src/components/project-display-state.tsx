"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

export type DesktopDensity = 2 | 3 | 4 | 5 | 6;
export type MobileColumns = 1 | 2;
export type ProjectSortMode = "featured" | "recent" | "random";

/**
 * Above this width a 2-up grid leaves tiles absurdly large, so the ladder shifts
 * up a rung. Every current MacBook sits below it (the 16" is 1728pt at default
 * scaling) while a Studio Display at 2560pt sits well above.
 */
const WIDE_VIEWPORT_QUERY = "(min-width: 1920px)";

export const NARROW_DENSITIES = [2, 3, 4, 5] as const;
export const WIDE_DENSITIES = [3, 4, 5, 6] as const;

const NARROW_DEFAULT_DENSITY: DesktopDensity = 3;
const WIDE_DEFAULT_DENSITY: DesktopDensity = 4;

interface ProjectDisplayState {
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
}

const ProjectDisplayContext = createContext<ProjectDisplayState | null>(null);

export function ProjectDisplayProvider({ children }: { children: ReactNode }) {
  const [desktopDensity, setDensityState] = useState<DesktopDensity>(NARROW_DEFAULT_DENSITY);
  const [isWideViewport, setIsWideViewport] = useState(false);
  const [mobileColumns, setMobileColumns] = useState<MobileColumns>(1);
  const [sortMode, setSortMode] = useState<ProjectSortMode>("featured");
  const [randomSeed, setRandomSeed] = useState(0);
  const reshuffle = useCallback(() => setRandomSeed((current) => current + 1), []);
  // Once the reader picks a density we keep it across resizes rather than
  // snapping back to the width default, clamping only if it leaves the range.
  const hasChosenDensity = useRef(false);

  const setDesktopDensity = useCallback<Dispatch<SetStateAction<DesktopDensity>>>((value) => {
    hasChosenDensity.current = true;
    setDensityState(value);
  }, []);

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
        desktopDensity,
        setDesktopDensity,
        densityChoices: isWideViewport ? WIDE_DENSITIES : NARROW_DENSITIES,
        mobileColumns,
        setMobileColumns,
        sortMode,
        setSortMode,
        randomSeed,
        reshuffle,
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
