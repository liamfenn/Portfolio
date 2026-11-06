export function pagingIntent(x: number, y: number, slop: number) {
  if (Math.max(Math.abs(x), Math.abs(y)) < slop) return "pending";
  return Math.abs(x) > Math.abs(y) * 1.2 ? "horizontal" : "vertical";
}

export function commitsPage(distance: number, width: number, velocity: number, slop: number) {
  return Math.abs(distance) >= width * 0.18 || (Math.abs(distance) >= slop * 3 && Math.abs(velocity) >= 0.5 && Math.sign(distance) === Math.sign(velocity));
}

/** A fresh finger stroke can interrupt a decaying momentum tail without an idle gap. */
export function restartsWheelGesture(x: number, committedX: number, lastX: number, previousX: number, peak: number, slop: number) {
  if (Math.abs(x) < slop) return false;
  if (Math.sign(x) !== Math.sign(committedX)) return true;
  return Math.abs(lastX) <= peak / 2 && Math.abs(x) > Math.abs(lastX) + slop && Math.abs(x) > Math.abs(previousX) + slop;
}

type Box = { left: number; top: number; width: number; height: number };

/** Whether enough of a tile shows for a flight back to it to read as a return rather than a snap off screen. */
export function tileOnScreen(tile: Box, width: number, height: number, minVisible = 0.25) {
  const shownX = Math.min(tile.left + tile.width, width) - Math.max(tile.left, 0);
  const shownY = Math.min(tile.top + tile.height, height) - Math.max(tile.top, 0);
  return shownX > 0 && shownY > 0 && shownX * shownY >= tile.width * tile.height * minVisible;
}

/** The same box scaled about its center. */
export function scaledBox(box: Box, scale: number) {
  const width = box.width * scale, height = box.height * scale;
  return { left: box.left + (box.width - width) / 2, top: box.top + (box.height - height) / 2, width, height };
}

/** A deliberate downward swipe that began at the top of the view, so scrolling back up never closes it. */
export function swipesToDismiss(x: number, y: number, startScrollTop: number, distance: number) {
  return startScrollTop <= 0 && y >= distance && y > Math.abs(x) * 1.5;
}

/**
 * Stretches a tween with the distance its box travels, up to a limit. A fixed duration made far tiles
 * move several times faster than near ones, which read as abrupt.
 */
export function focusTweenDuration(from: Box, to: Box, nearDuration: number, farDuration: number, farDistance: number) {
  const travel = Math.max(
    Math.abs(to.left - from.left), Math.abs(to.top - from.top),
    Math.abs(to.left + to.width - from.left - from.width), Math.abs(to.top + to.height - from.top - from.height),
  );
  return nearDuration + (farDuration - nearDuration) * Math.min(travel / farDistance, 1);
}
