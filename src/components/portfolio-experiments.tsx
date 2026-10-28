"use client";

import { createContext, useContext, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

export const PROJECT_INTERACTION_MODES = ["focus", "inline", "overlay"] as const;
export type ProjectInteractionMode = typeof PROJECT_INTERACTION_MODES[number];
export const PROJECT_INTERACTION_LABELS: Record<ProjectInteractionMode, string> = {
  focus: "Focused view", inline: "Inline expansion", overlay: "Card overlay",
};

type Experiments = {
  paletteLabOpen: boolean;
  setPaletteLabOpen: Dispatch<SetStateAction<boolean>>;
  projectInteractionMode: ProjectInteractionMode;
  setProjectInteractionMode: Dispatch<SetStateAction<ProjectInteractionMode>>;
  skeletonPreviewEnabled: boolean;
  setSkeletonPreviewEnabled: Dispatch<SetStateAction<boolean>>;
  safariEdgeTestEnabled: boolean;
  setSafariEdgeTestEnabled: Dispatch<SetStateAction<boolean>>;
};
const ExperimentsContext = createContext<Experiments>({
  paletteLabOpen: false, setPaletteLabOpen: () => {},
  projectInteractionMode: "focus", setProjectInteractionMode: () => {},
  skeletonPreviewEnabled: false, setSkeletonPreviewEnabled: () => {},
  safariEdgeTestEnabled: false, setSafariEdgeTestEnabled: () => {},
});
export const usePortfolioExperiments = () => useContext(ExperimentsContext);

export function PortfolioExperiments({ children }: { children: ReactNode }) {
  const [paletteLabOpen, setPaletteLabOpen] = useState(false);
  const [projectInteractionMode, setProjectInteractionMode] = useState<ProjectInteractionMode>("focus");
  const [skeletonPreviewEnabled, setSkeletonPreviewEnabled] = useState(false);
  const [safariEdgeTestEnabled, setSafariEdgeTestEnabled] = useState(false);
  return <ExperimentsContext.Provider value={{ paletteLabOpen, setPaletteLabOpen, projectInteractionMode, setProjectInteractionMode, skeletonPreviewEnabled, setSkeletonPreviewEnabled, safariEdgeTestEnabled, setSafariEdgeTestEnabled }}>
    {children}
  </ExperimentsContext.Provider>;
}
