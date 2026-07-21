import test from "node:test";
import assert from "node:assert/strict";
import { segmentIntersection, smartSnapPoint, snapIntersections, uniqueSnapCandidates, type SnapCandidate } from "../app/lib/smart-snapping";

const candidates: SnapCandidate[] = [
  { point: { x: 100, y: 100 }, objectId: "a", kind: "port" },
  { point: { x: 200, y: 160 }, objectId: "b", kind: "midpoint" },
];

test("smart snapping prefers nearby object points over the grid", () => {
  const result = smartSnapPoint({ x: 106, y: 103 }, candidates, 20, true);
  assert.deepEqual(result.point, { x: 100, y: 100 });
  assert.equal(result.source, "point");
  assert.equal(result.target?.objectId, "a");
});

test("smart snapping combines horizontal and vertical alignments", () => {
  const result = smartSnapPoint({ x: 105, y: 165 }, candidates, 20, true);
  assert.deepEqual(result.point, { x: 100, y: 160 });
  assert.equal(result.source, "alignment");
  assert.equal(result.guideX, 100);
  assert.equal(result.guideY, 160);
});

test("Alt bypasses every smart snapping target", () => {
  const point = { x: 106, y: 103 };
  assert.deepEqual(smartSnapPoint(point, candidates, 20, true, true), { point, source: "none" });
});

test("finds and deduplicates intersections for complex figures", () => {
  assert.deepEqual(segmentIntersection({ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }, { x: 100, y: 0 }), { x: 50, y: 50 });
  const intersections = snapIntersections([
    { objectId: "a", start: { x: 0, y: 0 }, end: { x: 100, y: 100 } },
    { objectId: "b", start: { x: 0, y: 100 }, end: { x: 100, y: 0 } },
    { objectId: "c", start: { x: 50, y: 0 }, end: { x: 50, y: 100 } },
  ]);
  assert.deepEqual(uniqueSnapCandidates(intersections).map((entry) => entry.point), [{ x: 50, y: 50 }]);
});
