"use client";

import { createContext, useContext, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

type Experiments = {
  paletteLabOpen: boolean;
  setPaletteLabOpen: Dispatch<SetStateAction<boolean>>;
  projectFocusEnabled: boolean;
  setProjectFocusEnabled: Dispatch<SetStateAction<boolean>>;
};
const ExperimentsContext = createContext<Experiments>({
  paletteLabOpen: false, setPaletteLabOpen: () => {},
  projectFocusEnabled: false, setProjectFocusEnabled: () => {},
});
export const usePortfolioExperiments = () => useContext(ExperimentsContext);

export function PortfolioExperiments({ children }: { children: ReactNode }) {
  const [paletteLabOpen, setPaletteLabOpen] = useState(false);
  const [projectFocusEnabled, setProjectFocusEnabled] = useState(false);
  return <ExperimentsContext.Provider value={{ paletteLabOpen, setPaletteLabOpen, projectFocusEnabled, setProjectFocusEnabled }}>
    {children}
  </ExperimentsContext.Provider>;
}
