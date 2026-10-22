"use client";

import { createContext, useContext, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

type Experiments = {
  paletteAtAvatar: boolean;
  setPaletteAtAvatar: Dispatch<SetStateAction<boolean>>;
  paletteLabOpen: boolean;
  setPaletteLabOpen: Dispatch<SetStateAction<boolean>>;
};
const ExperimentsContext = createContext<Experiments>({
  paletteAtAvatar: false, setPaletteAtAvatar: () => {},
  paletteLabOpen: false, setPaletteLabOpen: () => {},
});
export const usePortfolioExperiments = () => useContext(ExperimentsContext);

export function PortfolioExperiments({ children }: { children: ReactNode }) {
  const [paletteAtAvatar, setPaletteAtAvatar] = useState(false);
  const [paletteLabOpen, setPaletteLabOpen] = useState(false);
  return <ExperimentsContext.Provider value={{ paletteAtAvatar, setPaletteAtAvatar, paletteLabOpen, setPaletteLabOpen }}>
    {children}
  </ExperimentsContext.Provider>;
}
