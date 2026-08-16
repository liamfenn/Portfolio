"use client";

import { createContext, useContext, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

export type DesktopDensity = 2 | 3 | 4 | 5;
export type MobileColumns = 1 | 2;

interface ProjectDisplayState {
  desktopDensity: DesktopDensity;
  setDesktopDensity: Dispatch<SetStateAction<DesktopDensity>>;
  mobileColumns: MobileColumns;
  setMobileColumns: Dispatch<SetStateAction<MobileColumns>>;
}

const ProjectDisplayContext = createContext<ProjectDisplayState | null>(null);

export function ProjectDisplayProvider({ children }: { children: ReactNode }) {
  const [desktopDensity, setDesktopDensity] = useState<DesktopDensity>(3);
  const [mobileColumns, setMobileColumns] = useState<MobileColumns>(1);

  return (
    <ProjectDisplayContext.Provider
      value={{ desktopDensity, setDesktopDensity, mobileColumns, setMobileColumns }}
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
