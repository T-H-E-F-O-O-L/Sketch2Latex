import type { Point } from "./canvas-types";

export type SnapCandidate = {
  point: Point;
  objectId?: string;
  kind: "port" | "anchor" | "endpoint" | "midpoint" | "intersection" | "centre";
};

export type SmartSnapResult = {
  point: Point;
  source: "none" | "grid" | "point" | "alignment";
  target?: SnapCandidate;
  guideX?: number;
  guideY?: number;
};

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function uniqueSnapCandidates(candidates: SnapCandidate[], tolerance = .5): SnapCandidate[] {
  const result: SnapCandidate[] = [];
  for (const candidate of candidates) {
    if (!result.some((existing) => distance(existing.point, candidate.point) <= tolerance)) result.push(candidate);
  }
  return result;
}

export function segmentIntersection(a: Point, b: Point, c: Point, d: Point): Point | undefined {
  const denominator = (a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x);
  if (Math.abs(denominator) < 1e-8) return undefined;
  const first = a.x * b.y - a.y * b.x; const second = c.x * d.y - c.y * d.x;
  const x = (first * (c.x - d.x) - (a.x - b.x) * second) / denominator;
  const y = (first * (c.y - d.y) - (a.y - b.y) * second) / denominator;
  const within = (value: number, start: number, end: number) => value >= Math.min(start, end) - 1e-6 && value <= Math.max(start, end) + 1e-6;
  return within(x, a.x, b.x) && within(y, a.y, b.y) && within(x, c.x, d.x) && within(y, c.y, d.y) ? { x, y } : undefined;
}

export function snapIntersections(segments: Array<{ objectId: string; start: Point; end: Point }>): SnapCandidate[] {
  const result: SnapCandidate[] = [];
  for (let first = 0; first < segments.length; first += 1) {
    for (let second = first + 1; second < segments.length; second += 1) {
      const point = segmentIntersection(segments[first].start, segments[first].end, segments[second].start, segments[second].end);
      if (point) result.push({ point, kind: "intersection" });
    }
  }
  return uniqueSnapCandidates(result);
}

export function smartSnapPoint(point: Point, candidates: SnapCandidate[], gridSize: number, enabled: boolean, bypass = false, threshold = 12): SmartSnapResult {
  if (!enabled || bypass) return { point, source: "none" };
  const nearest = candidates
    .map((candidate) => ({ candidate, distance: distance(point, candidate.point) }))
    .filter((entry) => entry.distance <= threshold)
    .toSorted((a, b) => a.distance - b.distance)[0];
  if (nearest) return { point: nearest.candidate.point, source: "point", target: nearest.candidate, guideX: nearest.candidate.point.x, guideY: nearest.candidate.point.y };

  const xCandidate = candidates.map((candidate) => ({ candidate, delta: Math.abs(candidate.point.x - point.x) })).filter((entry) => entry.delta <= threshold * .65).toSorted((a, b) => a.delta - b.delta)[0];
  const yCandidate = candidates.map((candidate) => ({ candidate, delta: Math.abs(candidate.point.y - point.y) })).filter((entry) => entry.delta <= threshold * .65).toSorted((a, b) => a.delta - b.delta)[0];
  if (xCandidate || yCandidate) return {
    point: { x: xCandidate?.candidate.point.x ?? Math.round(point.x / gridSize) * gridSize, y: yCandidate?.candidate.point.y ?? Math.round(point.y / gridSize) * gridSize },
    source: "alignment",
    guideX: xCandidate?.candidate.point.x,
    guideY: yCandidate?.candidate.point.y,
  };
  return { point: { x: Math.round(point.x / gridSize) * gridSize, y: Math.round(point.y / gridSize) * gridSize }, source: "grid" };
}
