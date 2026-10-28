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
