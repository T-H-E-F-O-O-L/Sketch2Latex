import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDownloadFilename } from "../app/lib/project";

test("keeps or appends the required download extension", () => {
  assert.equal(normalizeDownloadFilename("lesson", "diagram.tex", ".tex"), "lesson.tex");
  assert.equal(normalizeDownloadFilename("lesson.TEX", "diagram.tex", ".tex"), "lesson.TEX");
  assert.equal(normalizeDownloadFilename("project", "diagram.sketch2latex.json", ".sketch2latex.json"), "project.sketch2latex.json");
});

test("cleans unsafe file characters and uses the suggested fallback", () => {
  assert.equal(normalizeDownloadFilename("  optics: ray/1  ", "diagram.svg", ".svg"), "optics- ray-1.svg");
  assert.equal(normalizeDownloadFilename("   ", "stem-diagram.pdf", ".pdf"), "stem-diagram.pdf");
});
