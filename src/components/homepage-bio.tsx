"use client";

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { InspectableText } from "@/components/design-inspector";
import { DEFAULT_PALETTE, glyphColors, type PaletteColor } from "@/lib/palette-toy";

export function InlineBioExpansion({ word, children }: { word: string; children?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [visibleWords, setVisibleWords] = useState(0);
  const reducedMotion = useReducedMotion();
  const id = useId();
  const words = children?.split(/\s+/).filter(Boolean) ?? [];
  const wordCount = words.length;

  useEffect(() => {
    if (reducedMotion || !wordCount || visibleWords === (expanded ? wordCount : 0)) return;
    const timer = window.setTimeout(() => {
      setVisibleWords(count => Math.max(0, Math.min(wordCount, count + (expanded ? 1 : -1))));
    }, 35);
    return () => window.clearTimeout(timer);
  }, [expanded, reducedMotion, wordCount, visibleWords]);

  if (!children) return <>{word}</>;
  const visibleCount = reducedMotion ? (expanded ? wordCount : 0) : visibleWords;
  return <>
    <button type="button" className="bio-expand-word" aria-expanded={expanded} aria-controls={id}
      onClick={() => setExpanded(value => !value)}>{word}</button>
    <span id={id}>
      {words.slice(0, visibleCount).map((word, index) => <motion.span className="bio-expanded-word" key={`${index}-${word}`}
        initial={{ opacity: 0, filter: "blur(3px)" }} animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: reducedMotion ? 0 : 0.16 }}> {word}</motion.span>)}
    </span>
  </>;
}

const BIO_LINK_PALETTE = glyphColors(DEFAULT_PALETTE);
const BIO_LINK_COUNT = 3;

function BioLink({ href, number, color, children }: {
  href: string;
  number: number;
  color: PaletteColor;
  children: ReactNode;
}) {
  const external = href.startsWith("https:");
  return <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
    {children}<sup className="bio-reference text-captionSerif" style={{
      "--bio-reference-color": color.hex,
      "--inspect-color-token": `palette-${color.name.toLowerCase().replaceAll(" ", "-")}`,
    } as CSSProperties} aria-hidden="true">{number}</sup>
  </a>;
}

export function HomepageBio() {
  // Match server markup first; choose fresh colors once after hydration, never on re-renders.
  const [colors, setColors] = useState<PaletteColor[]>(BIO_LINK_PALETTE.slice(0, BIO_LINK_COUNT));
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setColors(Array.from({ length: BIO_LINK_COUNT }, () => BIO_LINK_PALETTE[Math.floor(Math.random() * BIO_LINK_PALETTE.length)]));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return <div className="portfolio-bio text-bodySerif">
    <p><InspectableText>
      <strong>Liam Fennell</strong> is a designer based in Atlanta. Currently at <BioLink href="https://shop.app" number={1} color={colors[0]}>Shop</BioLink>, pushing pixels and code. Previously at OpenPurpose where he designed interfaces for Bird, Plasticity and more. Available in limited capacities.
    </InspectableText></p>
    <p><InspectableText>
      The work moves between interfaces, identities, and small experiments on the web. An interest in typography, everyday objects, and unexpected details leaves room for things to feel a little playful. This space is a collection of projects, ideas in progress, and <BioLink href="https://cosmos.so/notliam" number={2} color={colors[1]}>visual references</BioLink>. For a new project, a collaboration, or a conversation, <BioLink href="mailto:info@fennell.cv" number={3} color={colors[2]}>get in touch</BioLink>.
    </InspectableText></p>
  </div>;
}
