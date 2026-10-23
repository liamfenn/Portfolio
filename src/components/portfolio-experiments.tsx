"use client";

import { createContext, useContext, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

export type PalettePosition = "avatar" | "player";

type Experiments = {
  palettePosition: PalettePosition;
  setPalettePosition: Dispatch<SetStateAction<PalettePosition>>;
  paletteLabOpen: boolean;
  setPaletteLabOpen: Dispatch<SetStateAction<boolean>>;
};
const ExperimentsContext = createContext<Experiments>({
  palettePosition: "player", setPalettePosition: () => {},
  paletteLabOpen: false, setPaletteLabOpen: () => {},
});
export const usePortfolioExperiments = () => useContext(ExperimentsContext);

export function PortfolioExperiments({ children }: { children: ReactNode }) {
  const [palettePosition, setPalettePosition] = useState<PalettePosition>("player");
  const [paletteLabOpen, setPaletteLabOpen] = useState(false);
  return <ExperimentsContext.Provider value={{ palettePosition, setPalettePosition, paletteLabOpen, setPaletteLabOpen }}>
    {children}
  </ExperimentsContext.Provider>;
}
