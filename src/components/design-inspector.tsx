"use client";

import { Children, createContext, isValidElement, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { useScramble } from "use-scramble";
import { colorToHex, formatPixels, formatTextMetrics, gapBoxes, isLabelMode, nextInspectionMode, spacingKinds } from "@/lib/design-inspector";
import type { Box, InspectionKey, InspectionMode, SpacingKind } from "@/lib/design-inspector";
import { FILTER_SCRAMBLE } from "@/lib/text-scramble";

type Inspection = { mode: InspectionMode; previousMode: InspectionMode; revision: number };
const InspectionContext = createContext<Inspection>({ mode: "content", previousMode: "content", revision: 0 });
const MODE_LABELS: Record<InspectionMode, string> = {
  content: "Content", "type-token": "Text styles", "type-metrics": "Size / line height",
  "color-token": "Color tokens", "color-hex": "Color values",
  "padding-y": "Vertical padding", "padding-x": "Horizontal padding",
  "margin-y": "Vertical margins", "margin-x": "Horizontal margins",
  "gap-y": "Vertical gaps", "gap-x": "Horizontal gaps",
  "spacing-y": "All vertical spacing", "spacing-x": "All horizontal spacing",
};
const INSPECTION_KEYS = new Set<string>(["t", "c", "p", "m", "g", "s", "Escape"]);

export function DesignInspector({ children }: { children: ReactNode }) {
  const [inspection, setInspection] = useState<Inspection>({ mode: "content", previousMode: "content", revision: 0 });
  const cycle = useCallback((key: InspectionKey) => {
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
      if (!INSPECTION_KEYS.has(key)) return;
      if (key !== "Escape") event.preventDefault();
      cycle(key as InspectionKey);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cycle]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.inspectorMode = inspection.mode;
    if (isLabelMode(inspection.mode)) root.dataset.inspectorLabels = "";
    return () => { delete root.dataset.inspectorMode; delete root.dataset.inspectorLabels; };
  }, [inspection.mode]);

  return <InspectionContext.Provider value={inspection}>
    {children}
    {inspection.mode !== "content" && !isLabelMode(inspection.mode) && <SpacingOverlay mode={inspection.mode} />}
    {inspection.mode !== "content" && <aside className="design-inspector text-captionSans" aria-label="Design inspector">
      <span className="design-inspector-mode" role="status">{MODE_LABELS[inspection.mode]}</span>
      <div className="design-inspector-controls">
        <button type="button" aria-label="Cycle text inspection" aria-pressed={inspection.mode.startsWith("type-")} onClick={() => cycle("t")}><kbd>T</kbd> Text</button>
        <button type="button" aria-label="Cycle color inspection" aria-pressed={inspection.mode.startsWith("color-")} onClick={() => cycle("c")}><kbd>C</kbd> Color</button>
        <button type="button" aria-label="Cycle padding inspection" aria-pressed={inspection.mode.startsWith("padding-")} onClick={() => cycle("p")}><kbd>P</kbd> Padding</button>
        <button type="button" aria-label="Cycle margin inspection" aria-pressed={inspection.mode.startsWith("margin-")} onClick={() => cycle("m")}><kbd>M</kbd> Margin</button>
        <button type="button" aria-label="Cycle gap inspection" aria-pressed={inspection.mode.startsWith("gap-")} onClick={() => cycle("g")}><kbd>G</kbd> Gap</button>
        <button type="button" aria-label="Cycle all spacing inspection" aria-pressed={inspection.mode.startsWith("spacing-")} onClick={() => cycle("s")}><kbd>S</kbd> All</button>
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
  const [renderedText, setRenderedText] = useState<string | null>(null);
  const [finishedRevision, setFinishedRevision] = useState(0);
  const reducedMotion = useReducedMotion();
  const originalText = text ?? renderedText ?? textContent(children);

  useEffect(() => {
    const node = element.current;
    if (!node) return;
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      if (text === undefined) setRenderedText(node.querySelector(".inspectable-original")?.textContent ?? textContent(children));
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
    const timer = !isLabelMode(inspection.mode) ? undefined : window.setInterval(measure, 250);
    measure();
    return () => { cancelled = true; observer.disconnect(); window.removeEventListener("resize", measure); window.clearInterval(timer); };
  }, [inspection.mode, originalText, children, text]);

  const active = isLabelMode(inspection.mode);
  const returning = !active && !reducedMotion && isLabelMode(inspection.previousMode) && finishedRevision < inspection.revision;
  const showLabel = active || returning;
  const value = inspection.mode === "type-token" ? details.token
    : inspection.mode === "type-metrics" ? details.metrics
    : inspection.mode === "color-token" ? details.colorToken
    : inspection.mode === "color-hex" ? details.hex : originalText;
  const label = active ? `${originalText.match(/^\s+/)?.[0] ?? ""}${value}${originalText.match(/\s+$/)?.[0] ?? ""}` : value;
  const onEnd = useCallback(() => setFinishedRevision(inspection.revision), [inspection.revision]);

  return <span ref={element} className="inspectable-text" data-inspect-style={details.token} data-inspect-color={details.colorToken} data-inspect-metrics={details.metrics} data-inspect-hex={details.hex}>
    <span className={showLabel ? "inspectable-original is-concealed" : "inspectable-original"}>{children}</span>
    {showLabel && <span className="inspectable-label" aria-hidden="true">
      {reducedMotion ? label : <ScrambledLabel key={inspection.revision} text={label} onEnd={onEnd} />}
    </span>}
  </span>;
}

type SpacingArea = { box: Box; value: string; kind: SpacingKind };
const SKIPPED_ELEMENTS = ".spacing-overlay, .design-inspector, script, style, noscript, template";

function inFlowChildren(element: Element): HTMLElement[] {
  return Array.from(element.children).flatMap(child => {
    if (!(child instanceof HTMLElement)) return [];
    const style = getComputedStyle(child);
    if (style.display === "contents") return inFlowChildren(child);
    if (style.display === "none" || style.position === "absolute" || style.position === "fixed") return [];
    return [child];
  });
}

function isVisible(element: HTMLElement, rect: DOMRect) {
  if (rect.width < 1 || rect.height < 1) return false;
  if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) return false;
  return element.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) ?? true;
}

/** Collects the mode's padding, margins, and flex/grid gaps along one axis in viewport coordinates, in paint order. */
function measureSpacing(mode: InspectionMode): SpacingArea[] {
  const kinds = spacingKinds(mode);
  const found: Record<SpacingKind, SpacingArea[]> = { margin: [], padding: [], gap: [] };
  const vertical = mode.endsWith("-y");
  for (const element of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
    if (element.closest(SKIPPED_ELEMENTS)) continue;
    const rect = element.getBoundingClientRect();
    if (!isVisible(element, rect)) continue;
    const style = getComputedStyle(element);
    const px = (property: string) => Number.parseFloat(style.getPropertyValue(property)) || 0;
    const inner = {
      left: rect.left + px("border-left-width"), right: rect.right - px("border-right-width"),
      top: rect.top + px("border-top-width"), bottom: rect.bottom - px("border-bottom-width"),
    };

    if (kinds.includes("padding")) {
      const [start, end] = vertical ? [px("padding-top"), px("padding-bottom")] : [px("padding-left"), px("padding-right")];
      if (start > 0) found.padding.push({ kind: "padding", value: formatPixels(start), box: vertical
        ? { ...inner, bottom: inner.top + start } : { ...inner, right: inner.left + start } });
      if (end > 0) found.padding.push({ kind: "padding", value: formatPixels(end), box: vertical
        ? { ...inner, top: inner.bottom - end } : { ...inner, left: inner.right - end } });
    }

    if (kinds.includes("margin")) {
      // Negative margins pull elements into each other and have no area to draw.
      const [start, end] = vertical ? [px("margin-top"), px("margin-bottom")] : [px("margin-left"), px("margin-right")];
      if (start > 0) found.margin.push({ kind: "margin", value: formatPixels(start), box: vertical
        ? { left: rect.left, right: rect.right, top: rect.top - start, bottom: rect.top }
        : { left: rect.left - start, right: rect.left, top: rect.top, bottom: rect.bottom } });
      if (end > 0) found.margin.push({ kind: "margin", value: formatPixels(end), box: vertical
        ? { left: rect.left, right: rect.right, top: rect.bottom, bottom: rect.bottom + end }
        : { left: rect.right, right: rect.right + end, top: rect.top, bottom: rect.bottom } });
    }

    if (!kinds.includes("gap") || !/flex|grid/.test(style.display) || px(vertical ? "row-gap" : "column-gap") <= 0) continue;
    const content = {
      left: inner.left + px("padding-left"), right: inner.right - px("padding-right"),
      top: inner.top + px("padding-top"), bottom: inner.bottom - px("padding-bottom"),
    };
    const items = inFlowChildren(element).map(child => child.getBoundingClientRect()).filter(box => box.width > 0 && box.height > 0);
    for (const box of gapBoxes(content, items, vertical ? "vertical" : "horizontal")) {
      found.gap.push({ kind: "gap", box, value: formatPixels(vertical ? box.bottom - box.top : box.right - box.left) });
    }
  }
  return kinds.flatMap(kind => found[kind]);
}

/** Grid-paper overlay with each spacing value centered in its area; rebuilt as the page scrolls, resizes, or animates. */
function SpacingOverlay({ mode }: { mode: InspectionMode }) {
  const [areas, setAreas] = useState<SpacingArea[]>([]);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => { frame = 0; setAreas(measureSpacing(mode)); });
    };
    schedule();
    const timer = window.setInterval(schedule, 300);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [mode]);

  return <div className="spacing-overlay" aria-hidden="true">
    {areas.map(({ box, value, kind }, index) => <div key={index} className={`spacing-area is-${kind}`} style={{
      left: box.left, top: box.top, width: box.right - box.left, height: box.bottom - box.top,
    }}>
      <span className="spacing-value text-captionSans">
        {reducedMotion ? value : <ScrambledLabel key={`${mode}-${value}`} text={value} onEnd={noop} />}
      </span>
    </div>)}
  </div>;
}

function noop() {}
