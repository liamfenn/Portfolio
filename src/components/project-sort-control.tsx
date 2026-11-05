"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useEffectEvent, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { useProjectDisplayState } from "@/components/project-display-state";
import { WORK_OPTION_TRANSITION as OPTION_TRANSITION, WORK_OPTION_HIDDEN as OPTION_HIDDEN, WORK_OPTION_VISIBLE as OPTION_VISIBLE, MenuOptionText, WorkGlyphControl } from "@/components/work-glyph-control";

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "recent", label: "Recent" },
  { value: "random", label: "Random" },
] as const;

export function ProjectSortControl({ menuDirection = "up" }: { menuDirection?: "up" | "down" }) {
  const { sortMode, setSortMode, editingOrder, reshuffle } = useProjectDisplayState();
  const control = useRef<HTMLDivElement>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const validationFrame = useRef(0);
  const pointerOpened = useRef(false);
  const [isMobile, setIsMobile] = useState(false);
  const [open, setOpen] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [changed, setChanged] = useState(false);
  const [selection, setSelection] = useState(0);

  useEffect(() => {
    const media = matchMedia("(max-width: 767px)");
    const update = () => {
      setIsMobile(media.matches);
      if (media.matches) {
        if (exitTimer.current) clearTimeout(exitTimer.current);
        setOpen(false);
        setRendered(false);
      }
    };
    update();
    media.addEventListener("change", update);
    return () => {
      media.removeEventListener("change", update);
      if (exitTimer.current) clearTimeout(exitTimer.current);
      cancelAnimationFrame(validationFrame.current);
    };
  }, []);

  const show = () => {
    if (isMobile) return;
    if (exitTimer.current) clearTimeout(exitTimer.current);
    if (!open) setChanged(false);
    setRendered(true);
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    setChanged(false);
    if (exitTimer.current) clearTimeout(exitTimer.current);
    const duration = getComputedStyle(control.current!).getPropertyValue("--work-menu-exit-duration").trim();
    exitTimer.current = setTimeout(() => { setRendered(false); exitTimer.current = null; }, parseFloat(duration) * (duration.endsWith("ms") ? 1 : 1000));
  };
  const inside = (x: number, y: number) => {
    const menu = control.current?.querySelector<HTMLElement>(".work-sort-menu");
    return [control.current, menu].some(element => {
      if (!element) return false;
      const bounds = element.getBoundingClientRect();
      return x >= bounds.left - 1 && x <= bounds.right + 1 && y >= bounds.top - 1 && y <= bounds.bottom + 1;
    });
  };
  const move = useEffectEvent((event: globalThis.PointerEvent) => {
    // Option handoffs can change the hovered DOM without delivering a leave event in Safari.
    if (pointerOpened.current && !inside(event.clientX, event.clientY)) { pointerOpened.current = false; close(); }
  });
  useEffect(() => {
    if (!open) return;
    const onMove = (event: globalThis.PointerEvent) => move(event);
    document.addEventListener("pointermove", onMove, true);
    return () => document.removeEventListener("pointermove", onMove, true);
  }, [open]);
  const enter = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || isMobile) return;
    pointerOpened.current = true;
    show();
    cancelAnimationFrame(validationFrame.current);
    validationFrame.current = requestAnimationFrame(() => {
      validationFrame.current = requestAnimationFrame(() => {
        if (!control.current?.matches(":hover")) { pointerOpened.current = false; close(); }
      });
    });
  };
  const leave = (event: PointerEvent<HTMLDivElement>) => {
    if (!inside(event.clientX, event.clientY)) {
      cancelAnimationFrame(validationFrame.current);
      pointerOpened.current = false;
      close();
    }
  };
  const select = (value: typeof sortMode) => {
    if (editingOrder) return;
    setSelection(count => count + 1);
    setChanged(true);
    if (value === "random") reshuffle();
    setSortMode(value);
  };
  const selected = SORT_OPTIONS.find(option => option.value === sortMode)!;
  const options = SORT_OPTIONS.filter(option => option.value !== sortMode);

  return <div ref={control} className="work-density-control feed-sort-control"
    onPointerEnter={enter} onPointerLeave={leave}
    onFocus={show} onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) close(); }}
    onKeyDown={event => {
      if (event.key === "Escape") {
        event.preventDefault(); event.stopPropagation();
        control.current?.querySelector<HTMLButtonElement>(".work-sort-control")?.focus();
        close();
      }
    }}>
    {rendered && <div className={`work-density-menu work-sort-menu${open ? "" : " is-closing"}`} role="menu" aria-label="Project sort order" aria-hidden={!open} inert={!open}>
      <AnimatePresence initial={false} mode="popLayout">
        {options.map((option, index) => <motion.button layout="position" key={option.value} type="button" role="menuitemradio"
          aria-checked="false" tabIndex={open ? 0 : -1} data-hover-glitch
          className={`work-density-option${open ? (changed ? "" : " is-opening") : " is-closing"}`}
          // The option nearest the label enters first and leaves last, whichever way the menu opens.
          style={{ "--density-option-index": menuDirection === "up" ? options.length - 1 - index : index, "--density-option-exit-index": menuDirection === "up" ? index : options.length - 1 - index } as CSSProperties}
          initial={changed ? OPTION_HIDDEN : false} animate={OPTION_VISIBLE} exit={OPTION_HIDDEN} transition={OPTION_TRANSITION}
          onClick={() => select(option.value)}>
          <MenuOptionText labelId={`sort:${option.value}`} text={option.label} />
        </motion.button>)}
      </AnimatePresence>
    </div>}
    <button type="button" className="work-control work-sort-control" data-hover-glitch
      aria-haspopup={isMobile ? undefined : "menu"} aria-expanded={isMobile ? undefined : open}
      aria-label={isMobile ? `Sort projects: ${selected.label}` : "Project sort order"}
      onClick={() => {
        if (isMobile) select(SORT_OPTIONS[(SORT_OPTIONS.findIndex(option => option.value === sortMode) + 1) % SORT_OPTIONS.length].value);
      }}>
      <WorkGlyphControl text={selected.label} variant="sort" square selection={selection} />
    </button>
  </div>;
}
