// A threshold moving through smooth fractal noise makes separate colonies grow and merge.
// Keeping the longest side small lets the browser animate the filter without a full-size texture.
export function createThemePoolMask(duration: number, viewportWidth: number, viewportHeight: number, seed: number) {
  const scale = 512 / Math.max(viewportWidth, viewportHeight);
  const width = Math.ceil(viewportWidth * scale), height = Math.ceil(viewportHeight * scale);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><filter id="pool" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".018" numOctaves="2" seed="${seed}"/><feGaussianBlur stdDeviation="1.2"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 .333 .333 .333 0 0"/><feComponentTransfer><feFuncA type="linear" slope="14" intercept="-14"><animate attributeName="intercept" values="-14;-10;-3;1" keyTimes="0;.06;.94;1" dur="${duration}ms" fill="freeze"/></feFuncA></feComponentTransfer></filter><rect width="${width}" height="${height}" filter="url(#pool)"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
