"use client";

import { Children, createContext, isValidElement, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { useScramble } from "use-scramble";
import { colorToHex, formatTextMetrics, nextInspectionMode } from "@/lib/design-inspector";
import type { InspectionMode } from "@/lib/design-inspector";
import { FILTER_SCRAMBLE } from "@/lib/text-scramble";

type Inspection = { mode: InspectionMode; previousMode: InspectionMode; revision: number };
const InspectionContext = createContext<Inspection>({ mode: "content", previousMode: "content", revision: 0 });
const MODE_LABELS: Record<InspectionMode, string> = {
  content: "Content", "type-token": "Text styles", "type-metrics": "Size / line height",
  "color-token": "Color tokens", "color-hex": "Color values",
};

export function DesignInspector({ children }: { children: ReactNode }) {
  const [inspection, setInspection] = useState<Inspection>({ mode: "content", previousMode: "content", revision: 0 });
  const cycle = useCallback((key: "t" | "c" | "Escape") => {
    setInspection(current => {
      const mode = nextInspectionMode(current.mode, key);
      return mode === current.mode ? current : { mode, previousMode: current.mode, revision: current.revision + 1 };
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]')) return;
      const key = event.key === "Escape" ? "Escape" : event.key.toLowerCase();
      if (key !== "t" && key !== "c" && key !== "Escape") return;
      if (key !== "Escape") event.preventDefault();
      cycle(key);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cycle]);

  useEffect(() => {
    document.documentElement.dataset.inspectorMode = inspection.mode;
    return () => { delete document.documentElement.dataset.inspectorMode; };
  }, [inspection.mode]);

  return <InspectionContext.Provider value={inspection}>
    {children}
    {inspection.mode !== "content" && <aside className="design-inspector text-captionSmall" aria-label="Design inspector">
      <span className="design-inspector-mode" role="status">{MODE_LABELS[inspection.mode]}</span>
      <div className="design-inspector-controls">
        <button type="button" aria-label="Cycle text inspection" aria-pressed={inspection.mode.startsWith("type-")} onClick={() => cycle("t")}><kbd>T</kbd> Text</button>
        <button type="button" aria-label="Cycle color inspection" aria-pressed={inspection.mode.startsWith("color-")} onClick={() => cycle("c")}><kbd>C</kbd> Color</button>
        <button type="button" aria-label="Close design inspector" onClick={() => cycle("Escape")}><kbd>esc</kbd></button>
      </div>
    </aside>}
  </InspectionContext.Provider>;
}

function textContent(children: ReactNode): string {
  return Children.toArray(children).map(child => {
    if (typeof child === "string" || typeof child === "number") return String(child);
    return isValidElement<{ children?: ReactNode }>(child) ? textContent(child.props.children) : "";
  }).join("");
}

function ScrambledLabel({ text, onEnd }: { text: string; onEnd: () => void }) {
  const { ref } = useScramble({
    ...FILTER_SCRAMBLE, text, playOnMount: true,
    // Keep long prose transitions as quick as the short filter labels.
    step: Math.max(1, Math.ceil(text.length / 24)),
    onAnimationEnd: onEnd,
  });
  return <span ref={ref}>{text}</span>;
}

type TextDetails = { token: string; metrics: string; colorToken: string; hex: string };
const INITIAL_DETAILS: TextDetails = { token: "unassigned", metrics: "", colorToken: "unassigned", hex: "#000000" };

/** Original React children stay mounted so clocks, filters, and media keep working. */
export function InspectableText({ children, text }: { children: ReactNode; text?: string }) {
  const inspection = useContext(InspectionContext);
  const element = useRef<HTMLSpanElement>(null);
  const [details, setDetails] = useState(INITIAL_DETAILS);
  const [finishedRevision, setFinishedRevision] = useState(0);
  const reducedMotion = useReducedMotion();
  const originalText = text ?? textContent(children);

  useEffect(() => {
    const node = element.current;
    if (!node) return;
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const style = getComputedStyle(node);
      let token = "unassigned";
      for (let ancestor: Element | null = node; ancestor; ancestor = ancestor.parentElement) {
        const name = Array.from(ancestor.classList).find(name => name.startsWith("text-") && style.getPropertyValue(`--type-${name.slice(5)}`).trim());
        if (name) { token = name.slice(5); break; }
      }
      const hex = colorToHex(style.color);
      const candidate = style.getPropertyValue("--inspect-color-token").trim();
      const colorToken = candidate && colorToHex(style.getPropertyValue(`--${candidate}`)) === hex ? candidate : "unassigned";
      const next = { token, metrics: formatTextMetrics(style.fontSize, style.lineHeight), colorToken, hex };
      setDetails(current => Object.keys(next).every(key => current[key as keyof TextDetails] === next[key as keyof TextDetails]) ? current : next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener("resize", measure);
    document.fonts.ready.then(measure);
    const timer = inspection.mode === "content" ? undefined : window.setInterval(measure, 250);
    measure();
    return () => { cancelled = true; observer.disconnect(); window.removeEventListener("resize", measure); window.clearInterval(timer); };
  }, [inspection.mode, originalText]);

  const active = inspection.mode !== "content";
  const returning = !active && !reducedMotion && inspection.previousMode !== "content" && finishedRevision < inspection.revision;
  const showLabel = active || returning;
  const colorMode = inspection.mode.startsWith("color-");
  const value = inspection.mode === "type-token" ? details.token
    : inspection.mode === "type-metrics" ? details.metrics
    : inspection.mode === "color-token" ? details.colorToken
    : inspection.mode === "color-hex" ? details.hex : originalText;
  const label = active ? `${originalText.match(/^\s+/)?.[0] ?? ""}${value}${originalText.match(/\s+$/)?.[0] ?? ""}` : value;
  const onEnd = useCallback(() => setFinishedRevision(inspection.revision), [inspection.revision]);

  return <span ref={element} className="inspectable-text" data-inspect-style={details.token} data-inspect-color={details.colorToken} data-inspect-metrics={details.metrics} data-inspect-hex={details.hex}>
    <span className={showLabel ? "inspectable-original is-concealed" : "inspectable-original"}>{children}</span>
    {showLabel && <span className="inspectable-label" aria-hidden="true">
      {colorMode && <i className="inspectable-swatch" style={{ "--inspect-swatch": details.hex } as CSSProperties} />}
      {reducedMotion ? label : <ScrambledLabel key={inspection.revision} text={label} onEnd={onEnd} />}
    </span>}
  </span>;
}
