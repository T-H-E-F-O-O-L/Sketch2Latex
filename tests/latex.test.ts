import assert from "node:assert/strict";
import test from "node:test";
import { documentFor, objectToLatex } from "../app/lib/latex";

test("converts circuit connectors using circuitikz", () => {
  const output = objectToLatex({ id: "r1", kind: "resistor", x: 0, y: 0, x2: 100, y2: 0 });
  assert.equal(output, "\\draw (0.00,0.00) to[R] (2.00,0.00);");
});

test("flips canvas y coordinates and anchors graph bounds", () => {
  const output = objectToLatex({ id: "g1", kind: "axes", x: 50, y: 350, width: 250, height: 180, graph: { expression: "x^2", xMin: -5, xMax: 5 } });
  assert.match(output, /at=\{\(1\.00,-7\.00\)\}, anchor=north west/);
  assert.match(output, /\\addplot\[domain=-5:5, samples=100, smooth\] \{x\^2\};/);
});

test("returns a self-contained document with required STEM packages", () => {
  const output = documentFor([{ id: "b1", kind: "bond-double", x: 0, y: 0, x2: 50, y2: 0 }]);
  assert.match(output, /\\usepackage\{circuitikz\}/);
  assert.match(output, /\\usepackage\{pgfplots\}/);
  assert.match(output, /\\begin\{tikzpicture\}/);
});
