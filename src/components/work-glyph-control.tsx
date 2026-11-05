"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { useColorScramble } from "@/hooks/use-color-scramble";
import { currentGlyphPalette } from "@/lib/palette-toy";
import { FILTER_SCRAMBLE } from "@/lib/text-scramble";
import { InspectableText } from "@/components/design-inspector";

export const WORK_OPTION_TRANSITION = {
  duration: 0.28,
  ease: [0.16, 1, 0.3, 1],
} as const;

export const WORK_OPTION_HIDDEN = {
  opacity: 0,
  scale: 0.74,
  filter: "blur(5px)",
} as const;

export const WORK_OPTION_VISIBLE = {
  opacity: 1,
  scale: 1,
  filter: "blur(0px)",
} as const;

export function MenuOptionText({ text, labelId }: { text: string; labelId: string }) {
  return <span className="work-option-text" data-swarm-label-id={labelId} data-final-text={text}><InspectableText>{Array.from(text).map((character, index) =>
    <span key={index} data-swarm-menu-char>{character}</span>
  )}</InspectableText></span>;
}

export function WorkGlyphControl({
  text,
  reserveScrambleWidth = false,
  variant = "grid",
  selection = 0,
  square = false,
}: {
  text: string;
  reserveScrambleWidth?: boolean;
  variant?: "grid" | "sort";
  selection?: number;
  square?: boolean;
}) {
  const markRef = useRef<HTMLSpanElement>(null);
  const previousSelection = useRef(selection);
  const reducedMotion = useReducedMotion();
  const [isScrambling, setIsScrambling] = useState(false);
  const shouldReserveScrambleWidth = isScrambling || reserveScrambleWidth;
  const { ref, replay } = useColorScramble({
    ...FILTER_SCRAMBLE,
    text,
    playOnMount: false,
    onAnimationFrame: (result) => {
      if (result !== text) {
        setIsScrambling(true);
        const colors = currentGlyphPalette();
        if (!reducedMotion && markRef.current && colors.length) {
          markRef.current.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        }
      }
    },
    onAnimationEnd: () => {
      setIsScrambling(false);
      markRef.current?.style.removeProperty("background-color");
    },
  });

  useEffect(() => {
    if (previousSelection.current === selection) return;
    previousSelection.current = selection;
    // Re-selecting Random still counts as a selection, even when the label stays the same.
    if (!reducedMotion) replay();
  }, [selection, replay, reducedMotion]);

  return (
    <span
      className={`work-label-group work-${variant}-label-group${
        shouldReserveScrambleWidth ? " is-scrambling" : ""
      }`}
    >
      {variant === "sort" && !square ? (
        <span ref={markRef} className="work-control-dot" data-hover-glitch-mark aria-hidden="true" />
      ) : (
        <span
          ref={markRef}
          className="work-control-square"
          data-hover-glitch-mark
          aria-hidden="true"
        />
      )}
      <InspectableText text={text}><span ref={ref} className="work-grid-label" data-hover-glitch-text data-final-text={text} aria-hidden="true">
        {text}
      </span></InspectableText>
    </span>
  );
}

