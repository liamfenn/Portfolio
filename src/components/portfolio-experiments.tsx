"use client";

import { createContext, useContext, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

type Experiments = {
  paletteLabOpen: boolean;
  setPaletteLabOpen: Dispatch<SetStateAction<boolean>>;
  inlineProjectPreviewEnabled: boolean;
  setInlineProjectPreviewEnabled: Dispatch<SetStateAction<boolean>>;
};
const ExperimentsContext = createContext<Experiments>({
  paletteLabOpen: false, setPaletteLabOpen: () => {},
  inlineProjectPreviewEnabled: false, setInlineProjectPreviewEnabled: () => {},
});
export const usePortfolioExperiments = () => useContext(ExperimentsContext);

export function PortfolioExperiments({ children }: { children: ReactNode }) {
  const [paletteLabOpen, setPaletteLabOpen] = useState(false);
  const [inlineProjectPreviewEnabled, setInlineProjectPreviewEnabled] = useState(false);
  return <ExperimentsContext.Provider value={{ paletteLabOpen, setPaletteLabOpen, inlineProjectPreviewEnabled, setInlineProjectPreviewEnabled }}>
    {children}
  </ExperimentsContext.Provider>;
}
