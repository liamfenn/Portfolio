/** Runs decorative work only while its control is on screen and the page is visible. */
export function animateWhenVisible(element: Element, tick: (time: number, dt: number) => void | false) {
  let frame = 0, previous = 0, visible = false;
  const render = (time: number) => {
    const dt = previous ? Math.min(64, time - previous) : 0;
    previous = time;
    if (tick(time, dt) !== false) frame = requestAnimationFrame(render);
  };
  const update = () => {
    cancelAnimationFrame(frame); previous = 0;
    if (visible && !document.hidden) frame = requestAnimationFrame(render);
  };
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
  observer.observe(element);
  document.addEventListener("visibilitychange", update);
  return () => {
    cancelAnimationFrame(frame); observer.disconnect();
    document.removeEventListener("visibilitychange", update);
  };
}
