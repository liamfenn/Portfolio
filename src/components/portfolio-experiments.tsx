"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { CARD_WIPE_STYLES } from "@/lib/card-overlay-wipe";
import type { CardWipeStyle } from "@/lib/card-overlay-wipe";

// The first mode is the default. `?projects=<mode>` picks another on load, so browser checks can reach the others
// without the design inspector.
export const PROJECT_INTERACTION_MODES = ["overlay", "focus", "inline"] as const;
export type ProjectInteractionMode = typeof PROJECT_INTERACTION_MODES[number];
export const PROJECT_INTERACTION_LABELS: Record<ProjectInteractionMode, string> = {
  focus: "Focused view", inline: "Inline expansion", overlay: "Card overlay",
};

type Experiments = {
  paletteLabOpen: boolean;
  setPaletteLabOpen: Dispatch<SetStateAction<boolean>>;
  projectInteractionMode: ProjectInteractionMode;
  setProjectInteractionMode: Dispatch<SetStateAction<ProjectInteractionMode>>;
  cardWipeStyle: CardWipeStyle;
  setCardWipeStyle: Dispatch<SetStateAction<CardWipeStyle>>;
  skeletonPreviewEnabled: boolean;
  setSkeletonPreviewEnabled: Dispatch<SetStateAction<boolean>>;
  safariEdgeTestEnabled: boolean;
  setSafariEdgeTestEnabled: Dispatch<SetStateAction<boolean>>;
};
const ExperimentsContext = createContext<Experiments>({
  paletteLabOpen: false, setPaletteLabOpen: () => {},
  projectInteractionMode: PROJECT_INTERACTION_MODES[0], setProjectInteractionMode: () => {},
  cardWipeStyle: CARD_WIPE_STYLES[0], setCardWipeStyle: () => {},
  skeletonPreviewEnabled: false, setSkeletonPreviewEnabled: () => {},
  safariEdgeTestEnabled: false, setSafariEdgeTestEnabled: () => {},
});
export const usePortfolioExperiments = () => useContext(ExperimentsContext);

export function PortfolioExperiments({ children }: { children: ReactNode }) {
  const [paletteLabOpen, setPaletteLabOpen] = useState(false);
  const [projectInteractionMode, setProjectInteractionMode] = useState<ProjectInteractionMode>(PROJECT_INTERACTION_MODES[0]);
  const [cardWipeStyle, setCardWipeStyle] = useState<CardWipeStyle>(CARD_WIPE_STYLES[0]);
  const [skeletonPreviewEnabled, setSkeletonPreviewEnabled] = useState(false);
  const [safariEdgeTestEnabled, setSafariEdgeTestEnabled] = useState(false);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("projects");
    const mode = PROJECT_INTERACTION_MODES.find(mode => mode === requested);
    if (!mode) return;
    const frame = requestAnimationFrame(() => setProjectInteractionMode(mode));
    return () => cancelAnimationFrame(frame);
  }, []);
  return <ExperimentsContext.Provider value={{ paletteLabOpen, setPaletteLabOpen, projectInteractionMode, setProjectInteractionMode, cardWipeStyle, setCardWipeStyle, skeletonPreviewEnabled, setSkeletonPreviewEnabled, safariEdgeTestEnabled, setSafariEdgeTestEnabled }}>
    {children}
  </ExperimentsContext.Provider>;
}
