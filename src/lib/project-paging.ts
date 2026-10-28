export function pagingIntent(x: number, y: number, slop: number) {
  if (Math.max(Math.abs(x), Math.abs(y)) < slop) return "pending";
  return Math.abs(x) > Math.abs(y) * 1.2 ? "horizontal" : "vertical";
}

export function commitsPage(distance: number, width: number, velocity: number, slop: number) {
  return Math.abs(distance) >= width * 0.18 || (Math.abs(distance) >= slop * 3 && Math.abs(velocity) >= 0.5 && Math.sign(distance) === Math.sign(velocity));
}
