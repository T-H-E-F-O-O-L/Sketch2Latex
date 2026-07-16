import type { CanvasObject, Point } from "./canvas-types";

const connectorBasis = (object: CanvasObject) => {
  const x2 = object.x2 ?? object.x; const y2 = object.y2 ?? object.y;
  const dx = x2 - object.x; const dy = y2 - object.y; const length = Math.hypot(dx, dy) || 1;
  return { x2, y2, length, ux: dx / length, uy: dy / length, px: -dy / length, py: dx / length };
};

const pointAt = (object: CanvasObject, basis: ReturnType<typeof connectorBasis>, along: number, across = 0): Point => ({
  x: object.x + basis.ux * along + basis.px * across,
  y: object.y + basis.uy * along + basis.py * across,
});

export function springPointsFor(object: CanvasObject): Point[] {
  const basis = connectorBasis(object);
  const lead = Math.min(18, basis.length * .14); const activeLength = Math.max(0, basis.length - lead * 2);
  const teeth = Math.max(6, Math.min(14, Math.round(activeLength / 14))); const amplitude = Math.min(9, basis.length * .09);
  const points: Point[] = [pointAt(object, basis, 0), pointAt(object, basis, lead)];
  for (let index = 1; index < teeth; index += 1) points.push(pointAt(object, basis, lead + activeLength * index / teeth, (index % 2 ? 1 : -1) * amplitude));
  points.push(pointAt(object, basis, basis.length - lead), { x: basis.x2, y: basis.y2 });
  return points;
}

export function wavePointsFor(object: CanvasObject): Point[] {
  const basis = connectorBasis(object);
  const cycles = Math.max(1, Math.min(8, Math.round(basis.length / 45))); const samples = cycles * 16; const amplitude = Math.min(9, basis.length * .08);
  return Array.from({ length: samples + 1 }, (_, index) => {
    const ratio = index / samples;
    return pointAt(object, basis, basis.length * ratio, Math.sin(ratio * cycles * Math.PI * 2) * amplitude);
  });
}
