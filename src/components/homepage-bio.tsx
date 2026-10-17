"use client";

import { useEffect, useId, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { InspectableText } from "@/components/design-inspector";

/** Add final expansion copy here; the collapsed biography stays verbatim. */
const BIO_EXPANSIONS: Partial<Record<"designer" | "Shop", string>> = {};

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

export function HomepageBio() {
  return <div className="portfolio-bio text-body"><p><InspectableText>
    <strong>Liam Fennell</strong> is a <InlineBioExpansion word="designer">{BIO_EXPANSIONS.designer}</InlineBioExpansion> based in Atlanta. Currently at <a href="https://shop.app" target="_blank" rel="noreferrer">Shop</a>, pushing pixels and code. Previously at OpenPurpose where he designed interfaces for Bird, Plasticity and more. Available in limited capacities.
  </InspectableText></p></div>;
}
