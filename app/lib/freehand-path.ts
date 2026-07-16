import type { Point } from "./canvas-types";

export const FREEHAND_TOLERANCE = 1.5;

export function simplifyFreehandPoints(points: Point[], tolerance = FREEHAND_TOLERANCE): Point[] {
  if (points.length < 3) return points;
  const first = points[0]; const last = points[points.length - 1];
  const dx = last.x - first.x; const dy = last.y - first.y; const lengthSquared = dx * dx + dy * dy;
  let index = -1; let maximum = 0;
  for (let current = 1; current < points.length - 1; current += 1) {
    const candidate = points[current];
    const distance = lengthSquared === 0 ? Math.hypot(candidate.x - first.x, candidate.y - first.y) : Math.abs(dy * candidate.x - dx * candidate.y + last.x * first.y - last.y * first.x) / Math.sqrt(lengthSquared);
    if (distance > maximum) { maximum = distance; index = current; }
  }
  if (maximum <= tolerance || index < 0) return [first, last];
  return [...simplifyFreehandPoints(points.slice(0, index + 1), tolerance), ...simplifyFreehandPoints(points.slice(index), tolerance).slice(1)];
}
