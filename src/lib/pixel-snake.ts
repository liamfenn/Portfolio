export type SnakeDirection = "up" | "down" | "left" | "right";
export interface SnakeCell { x: number; y: number }

const STEPS: Record<SnakeDirection, SnakeCell> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const OPPOSITE: Record<SnakeDirection, SnakeDirection> = { up: "down", down: "up", left: "right", right: "left" };
const TURNS: Record<SnakeDirection, [SnakeDirection, SnakeDirection]> = {
  up: ["left", "right"], down: ["left", "right"], left: ["up", "down"], right: ["up", "down"],
};

/** The cell one step ahead, wrapping around the grid's edges. */
export function stepCell(cell: SnakeCell, direction: SnakeDirection, columns: number, rows: number): SnakeCell {
  const step = STEPS[direction];
  return { x: (cell.x + step.x + columns) % columns, y: (cell.y + step.y + rows) % rows };
}

/**
 * Picks the next heading. A steer (arrow key or swipe) wins unless it reverses into the body. Left alone, the
 * snake mostly keeps going, sometimes turns, and avoids running into itself whenever there's a free cell.
 */
export function nextDirection({ head, direction, body, columns, rows, steer, turnChance = 0.18, random = Math.random }: {
  head: SnakeCell;
  direction: SnakeDirection;
  body: SnakeCell[];
  columns: number;
  rows: number;
  steer?: SnakeDirection;
  turnChance?: number;
  random?: () => number;
}): SnakeDirection {
  if (steer && steer !== OPPOSITE[direction]) return steer;
  const occupied = new Set(body.map(cell => `${cell.x}:${cell.y}`));
  const isFree = (heading: SnakeDirection) => {
    const cell = stepCell(head, heading, columns, rows);
    return !occupied.has(`${cell.x}:${cell.y}`);
  };
  const turns = random() < 0.5 ? TURNS[direction] : [TURNS[direction][1], TURNS[direction][0]];
  const preferred: SnakeDirection[] = random() < turnChance ? [...turns, direction] : [direction, ...turns];
  return preferred.find(isFree) ?? direction;
}

const CELL = 16;
const LENGTH = 22;
const TICK_MS = 70;
const KEYS: Record<string, SnakeDirection> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };

export interface PixelSnake {
  stop(): void;
}

/**
 * A snake of pixel blocks that wanders the viewport, distorting what's under it (difference blend plus a
 * backdrop blur). It starts at `origin` heading up. Arrow keys or swipes steer it; stop() dissolves it.
 */
export function startSnake(origin: { x: number; y: number }, colors: string[]): PixelSnake {
  const columns = Math.max(4, Math.floor(window.innerWidth / CELL));
  const rows = Math.max(4, Math.floor(window.innerHeight / CELL));
  const start = { x: Math.min(columns - 1, Math.floor(origin.x / CELL)), y: Math.min(rows - 1, Math.floor(origin.y / CELL)) };
  let body: SnakeCell[] = [start];
  let direction: SnakeDirection = "up";
  let steer: SnakeDirection | undefined;
  // Once someone steers, the snake stops wandering and goes straight between their turns.
  let isSteered = false;

  // Each block sits directly on the page (no shared wrapper), so its blend and blur act on the page itself.
  const segments = Array.from({ length: LENGTH }, (_, index) => {
    const segment = document.createElement("span");
    segment.className = "pixel-snake-segment";
    segment.setAttribute("aria-hidden", "true");
    segment.style.background = colors[index % colors.length];
    // The tail thins out so the snake reads as moving.
    segment.style.opacity = String(1 - (index / LENGTH) * 0.7);
    segment.hidden = true;
    document.body.append(segment);
    return segment;
  });

  const draw = () => {
    segments.forEach((segment, index) => {
      const cell = body[index];
      segment.hidden = !cell;
      if (cell) segment.style.transform = `translate(${cell.x * CELL}px, ${cell.y * CELL}px)`;
    });
  };
  draw();

  const timer = window.setInterval(() => {
    direction = nextDirection({ head: body[0], direction, body, columns, rows, steer, turnChance: isSteered ? 0 : undefined });
    steer = undefined;
    body = [stepCell(body[0], direction, columns, rows), ...body].slice(0, LENGTH);
    draw();
  }, TICK_MS);

  const onKey = (event: KeyboardEvent) => {
    const heading = KEYS[event.key];
    if (!heading) return;
    event.preventDefault();
    steer = heading;
    isSteered = true;
  };
  let touch: { x: number; y: number } | null = null;
  const onTouchStart = (event: TouchEvent) => { touch = { x: event.touches[0].clientX, y: event.touches[0].clientY }; };
  const onTouchEnd = (event: TouchEvent) => {
    if (!touch) return;
    const dx = event.changedTouches[0].clientX - touch.x;
    const dy = event.changedTouches[0].clientY - touch.y;
    touch = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    steer = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
    isSteered = true;
  };
  window.addEventListener("keydown", onKey);
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchend", onTouchEnd, { passive: true });

  let stopped = false;
  return {
    stop() {
      if (stopped) return;
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      // Dissolve from the tail to the head.
      const visible = segments.filter(segment => !segment.hidden).reverse();
      const fades = visible.map((segment, index) => segment.animate(
        [{ transform: `${segment.style.transform} scale(1)`, opacity: segment.style.opacity }, { transform: `${segment.style.transform} scale(0)`, opacity: 0 }],
        { duration: 220, delay: index * 18, easing: "ease-in", fill: "forwards" },
      ).finished);
      Promise.allSettled(fades).then(() => segments.forEach(segment => segment.remove()));
    },
  };
}
