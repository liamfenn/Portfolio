// The same Shop mark as public/images/icons/shop-swirl.svg, extruded into a shallow sculpture.
export const SHOP_MARK_PATH = "M9.50358 1C6.91583 1 4.49208 1.79173 2.75173 2.93382C2.63327 3.01117 2.59227 3.17042 2.66516 3.29328L4.76544 6.87425C4.84289 7.00165 5.0069 7.04716 5.13446 6.9698C6.45568 6.17353 7.96824 5.75946 9.51269 5.76856C13.6722 5.76856 16.7292 8.69886 16.7292 12.571C16.7292 15.8699 14.2827 18.3133 11.1802 18.3133C8.65163 18.3133 6.8976 16.8436 6.8976 14.7688C6.8976 13.5812 7.40331 12.6074 8.71996 11.9204C8.85664 11.8476 8.90676 11.6792 8.82475 11.5473L6.84293 8.19835C6.77915 8.08914 6.64247 8.03909 6.51946 8.08459C3.86337 9.06743 2 11.4335 2 14.6095C2 19.4145 5.83152 23 11.1756 23C17.4172 23 21.9048 18.6819 21.9048 12.4891C21.9048 5.85047 16.6837 1 9.50358 1Z";

export interface ShopPoint { x: number; y: number; z: number }

/** Sample both faces and the rim; interleave them so the shape reads before every letter arrives. */
export function shopPoints(count: number, contains: (x: number, y: number) => boolean): ShopPoint[] {
  const face: { x: number; y: number }[] = [], rim: typeof face = [];
  const step = 0.3;
  for (let y = 1; y <= 23; y += step) for (let x = 2; x <= 22; x += step) {
    if (!contains(x, y)) continue;
    const point = { x: (x - 12) / 11, y: (y - 12) / 11 };
    face.push(point);
    if (!contains(x - step, y) || !contains(x + step, y) || !contains(x, y - step) || !contains(x, y + step)) rim.push(point);
  }
  if (!face.length) return [];
  return Array.from({ length: count }, (_, index) => {
    // Irrational strides cover the mark without bands or random clumps.
    const pool = index % 5 === 4 && rim.length ? rim : face;
    const point = pool[Math.floor(((index * 0.61803398875) % 1) * pool.length)];
    const z = index % 5 === 4 ? (((index * 0.754877666) % 1) - 0.5) * 0.34 : (index % 2 ? -0.17 : 0.17);
    return { ...point, z };
  });
}

/** Perspective with a slight rocking tilt; coordinates stay independent of viewport size. */
export function projectShopPoint(point: ShopPoint, angle: number, tilt: number) {
  const x = point.x * Math.cos(angle) + point.z * Math.sin(angle);
  const depth = point.z * Math.cos(angle) - point.x * Math.sin(angle);
  const y = point.y * Math.cos(tilt) - depth * Math.sin(tilt);
  const z = point.y * Math.sin(tilt) + depth * Math.cos(tilt);
  const perspective = 4 / (4 - z);
  return { x: x * perspective, y: y * perspective, depth: (z + 1.2) / 2.4, scale: perspective };
}
