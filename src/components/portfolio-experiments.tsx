"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

// The first mode is the default. `?projects=<mode>` picks another on load, so browser checks can reach the others
// without the design inspector.
export const PROJECT_INTERACTION_MODES = ["overlay", "focus", "inline"] as const;
export type ProjectInteractionMode = typeof PROJECT_INTERACTION_MODES[number];
export const PROJECT_INTERACTION_LABELS: Record<ProjectInteractionMode, string> = {
  focus: "Focused view", inline: "Inline expansion", overlay: "Card overlay",
};
// How the card overlay enters: the WebGL wipe, or the plain fade it replaced, for comparison.
export const CARD_ENTRY_MODES = ["shader", "fade"] as const;
export type CardEntryMode = typeof CARD_ENTRY_MODES[number];
export const CARD_ENTRY_LABELS: Record<CardEntryMode, string> = { shader: "Shader", fade: "Fade" };
export const INTRO_MODES = ["long", "short", "short-resonates"] as const;
export type IntroMode = typeof INTRO_MODES[number];
export const INTRO_LABELS: Record<IntroMode, string> = {
  long: "Long", short: "Short", "short-resonates": "Short · resonates",
};

type Experiments = {
  introMode: IntroMode;
  setIntroMode: Dispatch<SetStateAction<IntroMode>>;
  paletteLabOpen: boolean;
  setPaletteLabOpen: Dispatch<SetStateAction<boolean>>;
  projectInteractionMode: ProjectInteractionMode;
  setProjectInteractionMode: Dispatch<SetStateAction<ProjectInteractionMode>>;
  cardEntryMode: CardEntryMode;
  setCardEntryMode: Dispatch<SetStateAction<CardEntryMode>>;
  skeletonPreviewEnabled: boolean;
  setSkeletonPreviewEnabled: Dispatch<SetStateAction<boolean>>;
  safariEdgeTestEnabled: boolean;
  setSafariEdgeTestEnabled: Dispatch<SetStateAction<boolean>>;
};
const ExperimentsContext = createContext<Experiments>({
  introMode: INTRO_MODES[0], setIntroMode: () => {},
  paletteLabOpen: false, setPaletteLabOpen: () => {},
  projectInteractionMode: PROJECT_INTERACTION_MODES[0], setProjectInteractionMode: () => {},
  cardEntryMode: CARD_ENTRY_MODES[0], setCardEntryMode: () => {},
  skeletonPreviewEnabled: false, setSkeletonPreviewEnabled: () => {},
  safariEdgeTestEnabled: false, setSafariEdgeTestEnabled: () => {},
});
export const usePortfolioExperiments = () => useContext(ExperimentsContext);

export function PortfolioExperiments({ children }: { children: ReactNode }) {
  const [introMode, setIntroMode] = useState<IntroMode>(INTRO_MODES[0]);
  const [paletteLabOpen, setPaletteLabOpen] = useState(false);
  const [projectInteractionMode, setProjectInteractionMode] = useState<ProjectInteractionMode>(PROJECT_INTERACTION_MODES[0]);
  const [cardEntryMode, setCardEntryMode] = useState<CardEntryMode>(CARD_ENTRY_MODES[0]);
  const [skeletonPreviewEnabled, setSkeletonPreviewEnabled] = useState(false);
  const [safariEdgeTestEnabled, setSafariEdgeTestEnabled] = useState(false);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("projects");
    const mode = PROJECT_INTERACTION_MODES.find(mode => mode === requested);
    if (!mode) return;
    const frame = requestAnimationFrame(() => setProjectInteractionMode(mode));
    return () => cancelAnimationFrame(frame);
  }, []);
  return <ExperimentsContext.Provider value={{ introMode, setIntroMode, paletteLabOpen, setPaletteLabOpen, projectInteractionMode, setProjectInteractionMode, cardEntryMode, setCardEntryMode, skeletonPreviewEnabled, setSkeletonPreviewEnabled, safariEdgeTestEnabled, setSafariEdgeTestEnabled }}>
    {children}
  </ExperimentsContext.Provider>;
}
