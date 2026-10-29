"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { InspectableText } from "@/components/design-inspector";

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

function BioLink({ href, children }: { href: string; children: ReactNode }) {
  const external = href.startsWith("https:");
  return <a className="text-primary" href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
    {children}
  </a>;
}

export function HomepageBio() {
  return <div className="portfolio-bio text-bodySerif">
    <p><InspectableText>
      <strong>Liam Fennell</strong> is a designer based in Atlanta, currently at <BioLink href="https://shop.com">Shop</BioLink>. Previously at <BioLink href="https://s.engineering">OpenPurpose</BioLink>, designing interfaces for <BioLink href="https://bird.com">Bird</BioLink>, <BioLink href="https://plasticity.xyz">Plasticity</BioLink>, and others. If you’ve got something interesting in mind, <BioLink href="mailto:info@fennell.cv">get in touch</BioLink>
    </InspectableText></p>
    <p><InspectableText>
      He likes working in the margins. Between disciplines, in the balance of structure and expression, and in the details that make things feel effortless. This site is an experiment in the tools, ideas, and changing ways we design and build. <BioLink href="https://fennell.cv/process">Read about the process</BioLink>
    </InspectableText></p>
  </div>;
}
