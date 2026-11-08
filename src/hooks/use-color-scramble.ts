"use client";

import { useLayoutEffect, useRef } from "react";
import { useScramble } from "use-scramble";
import type { UseScrambleProps } from "use-scramble";
import { currentGlyphPalette } from "@/lib/palette-toy";

const escapeHtml = (char: string) => char === "&" ? "&amp;" : char === "<" ? "&lt;" : char === ">" ? "&gt;" : char;

/**
 * Keep use-scramble's uncoloured HTML writes off the live page. Commit each coloured frame once, then leave
 * plain text at rest so the inspector and swarm keep their ordinary text anchors.
 */
export function useColorScramble(props: UseScrambleProps) {
  const { onAnimationFrame, text = "" } = props;
  const ref = useRef<HTMLElement | null>(null);
  const { ref: inputRef, replay } = useScramble({
    ...props,
    onAnimationFrame: frame => {
      const element = ref.current;
      if (element && frame === text) {
        if (element.childNodes.length !== 1 || element.firstChild?.nodeType !== Node.TEXT_NODE || element.textContent !== frame) element.textContent = frame;
      } else if (element) {
        const colors = currentGlyphPalette();
        let html = "";
        for (let index = 0; index < frame.length; index++) {
          const char = frame[index];
          html += char === text[index] || !char.trim() || !colors.length ? escapeHtml(char)
            : `<span style="color:${colors[Math.floor(Math.random() * colors.length)]}">${escapeHtml(char)}</span>`;
        }
        element.innerHTML = html;
      }
      onAnimationFrame?.(frame);
    },
  });
  useLayoutEffect(() => {
    inputRef.current = document.createElement("span");
    return () => { inputRef.current = null; };
  }, [inputRef]);
  return { ref, replay };
}
