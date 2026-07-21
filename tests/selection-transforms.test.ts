import assert from "node:assert/strict";
import test from "node:test";
import type { CanvasObject } from "../app/lib/canvas-types";
import { scaleObjectFromAnchor, selectionAfterPick } from "../app/lib/selection-transforms";

test("keeps an existing multi-selection when dragging one selected object", () => {
  assert.deepEqual(selectionAfterPick(["a", "b"], "b", ["b"], false), ["a", "b"]);
  assert.deepEqual(selectionAfterPick(["a"], "b", ["b", "c"], true), ["a", "b", "c"]);
});

test("scales mixed selected geometry around one shared anchor", () => {
  const rect: CanvasObject = { id: "rect", kind: "rect", x: 20, y: 30, width: 100, height: 50 };
  const line: CanvasObject = { id: "line", kind: "line", x: 140, y: 40, x2: 200, y2: 80 };
  const text: CanvasObject = { id: "text", kind: "text", x: 80, y: 120, text: "Two\nlines", style: { fontSize: 20 } };
  assert.deepEqual(scaleObjectFromAnchor(rect, { x: 0, y: 0 }, 2, 2), { ...rect, x: 40, y: 60, width: 200, height: 100, points: undefined, control: undefined });
  assert.deepEqual(scaleObjectFromAnchor(line, { x: 0, y: 0 }, 2, 2), { ...line, x: 280, y: 80, x2: 400, y2: 160, width: undefined, height: undefined, points: undefined, control: undefined });
  assert.equal(scaleObjectFromAnchor(text, { x: 0, y: 0 }, 1.5, 1.5).style?.fontSize, 30);
});
