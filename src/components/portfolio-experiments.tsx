"use client";

import { createContext, useContext, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

type Experiments = {
  paletteLabOpen: boolean;
  setPaletteLabOpen: Dispatch<SetStateAction<boolean>>;
  inlineProjectPreviewEnabled: boolean;
  setInlineProjectPreviewEnabled: Dispatch<SetStateAction<boolean>>;
  skeletonPreviewEnabled: boolean;
  setSkeletonPreviewEnabled: Dispatch<SetStateAction<boolean>>;
  safariEdgeTestEnabled: boolean;
  setSafariEdgeTestEnabled: Dispatch<SetStateAction<boolean>>;
};
const ExperimentsContext = createContext<Experiments>({
  paletteLabOpen: false, setPaletteLabOpen: () => {},
  inlineProjectPreviewEnabled: false, setInlineProjectPreviewEnabled: () => {},
  skeletonPreviewEnabled: false, setSkeletonPreviewEnabled: () => {},
  safariEdgeTestEnabled: false, setSafariEdgeTestEnabled: () => {},
});
export const usePortfolioExperiments = () => useContext(ExperimentsContext);

export function PortfolioExperiments({ children }: { children: ReactNode }) {
  const [paletteLabOpen, setPaletteLabOpen] = useState(false);
  const [inlineProjectPreviewEnabled, setInlineProjectPreviewEnabled] = useState(false);
  const [skeletonPreviewEnabled, setSkeletonPreviewEnabled] = useState(false);
  const [safariEdgeTestEnabled, setSafariEdgeTestEnabled] = useState(false);
  return <ExperimentsContext.Provider value={{ paletteLabOpen, setPaletteLabOpen, inlineProjectPreviewEnabled, setInlineProjectPreviewEnabled, skeletonPreviewEnabled, setSkeletonPreviewEnabled, safariEdgeTestEnabled, setSafariEdgeTestEnabled }}>
    {children}
  </ExperimentsContext.Provider>;
}
