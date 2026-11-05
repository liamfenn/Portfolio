type Box = { left: number; top: number; height: number };

/** CSS minification can rewrite a token's 360ms as .36s, so both units have to parse. */
export function cssDurationMs(value: string) {
  return parseFloat(value) * (value.trim().endsWith("ms") ? 1 : 1000);
}

/** Viewport line the toolbar's bottom edge crosses when its center meets the bar's center. */
export function handoffLine(barTop: number, barHeight: number, toolbarHeight: number) {
  return Math.round(barTop + barHeight / 2 + toolbarHeight / 2);
}

/** Moves linearly toward the target, so a reversed scroll continues from the current position. */
export function advanceHandoff(progress: number, target: 0 | 1, elapsedFraction: number) {
  return target > progress ? Math.min(target, progress + elapsedFraction) : Math.max(target, progress - elapsedFraction);
}

/** Offset from the docked filter to the page filter, eased out as progress reaches the dock. */
export function handoffOffset(page: Box, dock: Box, progress: number) {
  const remaining = 1 - progress * progress * (3 - 2 * progress);
  return {
    x: (page.left - dock.left) * remaining,
    y: (page.top + page.height / 2 - dock.top - dock.height / 2) * remaining,
  };
}
