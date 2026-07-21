import assert from "node:assert/strict";
import test from "node:test";
import type { CanvasObject } from "../app/lib/canvas-types";
import { friendlyPdfError, normalizePdfPageDrawing, restorePdfPageDrawing, validatePdfFile } from "../app/lib/pdf-background";

const objects: CanvasObject[] = [
  { id: "line-1", kind: "line", x: 90, y: 56, x2: 450, y2: 280, style: { stroke: "#111111", strokeWidth: 2 } },
  { id: "rect-1", kind: "rect", x: 180, y: 112, width: 270, height: 168, annotations: { main: "A" } },
  { id: "curve-1", kind: "curve", x: 0, y: 0, x2: 900, y2: 560, control: { x: 300, y: 140 } },
  { id: "free-1", kind: "freehand", x: 90, y: 56, points: [{ x: 90, y: 56 }, { x: 180, y: 112 }] },
];

const closeTo = (actual: number | undefined, expected: number) => assert.ok(actual !== undefined && Math.abs(actual - expected) < 1e-10, `${actual} ≉ ${expected}`);

test("normalizes PDF drawings and restores every geometric field", () => {
  const normalized = normalizePdfPageDrawing(objects, 900, 560);
  assert.equal(normalized.objects[0].x, 0.1);
  assert.equal(normalized.objects[1].width, 0.3);
  assert.equal(normalized.objects[2].control?.y, 0.25);
  closeTo(normalized.objects[3].points?.[0].x, 0.1); closeTo(normalized.objects[3].points?.[0].y, 0.1);
  closeTo(normalized.objects[3].points?.[1].x, 0.2); closeTo(normalized.objects[3].points?.[1].y, 0.2);
  const restored = restorePdfPageDrawing(normalized, 900, 560);
  restored.forEach((object, index) => { closeTo(object.x, objects[index].x); closeTo(object.y, objects[index].y); });
  assert.deepEqual(restored.map((object) => object.kind), objects.map((object) => object.kind));
});

test("restores a normalized drawing proportionally on a resized page", () => {
  const restored = restorePdfPageDrawing(normalizePdfPageDrawing(objects, 900, 560), 450, 280);
  closeTo(restored[0].x, 45); closeTo(restored[0].y, 28); closeTo(restored[0].x2, 225); closeTo(restored[0].y2, 140);
  closeTo(restored[3].points?.[0].x, 45); closeTo(restored[3].points?.[0].y, 28);
  closeTo(restored[3].points?.[1].x, 90); closeTo(restored[3].points?.[1].y, 56);
});

test("validates local PDF file metadata", () => {
  assert.equal(validatePdfFile({ name: "course.pdf", size: 10, type: "application/pdf" }), undefined);
  assert.equal(validatePdfFile({ name: "course.PDF", size: 10, type: "" }), undefined);
  assert.match(validatePdfFile({ name: "course.png", size: 10, type: "image/png" }) ?? "", /PDF file/);
  assert.match(validatePdfFile({ name: "empty.pdf", size: 0, type: "application/pdf" }) ?? "", /empty/);
});

test("turns PDF.js failures into useful messages", () => {
  assert.match(friendlyPdfError(new Error("PasswordException")), /password-protected/);
  assert.match(friendlyPdfError(new Error("Invalid PDF structure")), /corrupted/);
  assert.match(friendlyPdfError(new Error("unknown failure")), /could not be opened/);
});
