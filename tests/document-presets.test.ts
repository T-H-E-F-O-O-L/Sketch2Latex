import assert from "node:assert/strict";
import test from "node:test";
import { documentPresetById, documentPresets, matchingDocumentPresetId } from "../app/lib/document-presets";

test("offers common screen ratios and print sizes", () => {
  const ids = new Set(documentPresets.map((preset) => preset.id));
  for (const id of ["screen-16-9", "screen-16-10", "screen-4-3", "screen-3-2", "screen-1-1", "screen-9-16", "a4-portrait", "a4-landscape", "a3-portrait", "a3-landscape", "letter-portrait", "letter-landscape"]) assert.ok(ids.has(id), `missing ${id}`);
});

test("uses exact ratios and detects when a document becomes custom", () => {
  const widescreen = documentPresetById("screen-16-9");
  assert.ok(widescreen);
  assert.equal(widescreen.width / widescreen.height, 16 / 9);
  assert.equal(matchingDocumentPresetId(widescreen), "screen-16-9");
  assert.equal(matchingDocumentPresetId({ width: widescreen.width + 1, height: widescreen.height }), "custom");
});

test("stores print presets at their physical canvas dimensions", () => {
  const a4 = documentPresetById("a4-portrait");
  assert.ok(a4);
  assert.equal(a4.width, 1050);
  assert.equal(a4.height, 1485);
  assert.equal(a4.orientation, "portrait");
});
