import assert from "node:assert/strict";
import test from "node:test";
import { connectorKinds, stampKinds, stampSize, toolboxGroups, type CanvasObject, type ObjectKind } from "../app/lib/canvas-types";
import { graphPathFor } from "../app/lib/graph";
import { documentFor, objectsFromLatex, objectToLatex } from "../app/lib/latex";
import { parseProject } from "../app/lib/project";
import { cloneTemplateObjects, diagramTemplates } from "../app/lib/templates";

test("converts circuit connectors using circuitikz", () => {
  const output = objectToLatex({ id: "r1", kind: "resistor", x: 0, y: 0, x2: 100, y2: 0 });
  assert.equal(output, "\\draw (0.00,0.00) to[R] (2.00,0.00);");
});

test("flips canvas y coordinates and anchors graph bounds", () => {
  const output = objectToLatex({ id: "g1", kind: "axes", x: 50, y: 350, width: 250, height: 180, graph: { expression: "x^2", xMin: -5, xMax: 5 } });
  assert.match(output, /at=\{\(1\.00,-7\.00\)\}, anchor=north west/);
  assert.match(output, /\\addplot\[domain=-5:5, samples=100, smooth\] \{x\^2\};/);
});

test("creates a visible canvas path for supported graph expressions", () => {
  const graph: CanvasObject = { id: "graph-1", kind: "axes", x: 0, y: 0, width: 250, height: 180, graph: { expression: "sin(deg(x))", xMin: -5, xMax: 5 } };
  assert.match(graphPathFor(graph) ?? "", /^M/);
  assert.equal(graphPathFor({ ...graph, graph: { ...graph.graph!, expression: "window.alert(1)" } }), undefined);
});

test("keeps selected-object rotation and size in the exported LaTeX", () => {
  const output = objectToLatex({ id: "box", kind: "rect", x: 0, y: 0, width: 100, height: 50, scale: 1.5, rotation: 90 });
  assert.match(output, /\\begin\{scope\}\[cm=\{/);
  assert.match(output, /\\draw \(0\.00,0\.00\) rectangle \(2\.00,-1\.00\);/);
  assert.match(output, /\\end\{scope\}$/);
});

test("keeps independent selected-object width and height in the exported LaTeX", () => {
  const output = objectToLatex({ id: "box", kind: "rect", x: 0, y: 0, width: 100, height: 50, scaleX: 2, scaleY: 0.5 });
  assert.match(output, /cm=\{2,0,0,0\.5,/);
});

test("exports editable drawing color and line width", () => {
  const objects: CanvasObject[] = [{ id: "colored-line", kind: "line", x: 0, y: 0, x2: 100, y2: 0, style: { stroke: "#c62828", strokeWidth: 4 } }];
  const output = documentFor(objects);
  assert.match(output, /color=\{rgb,255:red,198;green,40;blue,40\}/);
  assert.match(output, /line width=1\.60pt/);
  const edited = output.replace('"stroke":"#c62828"', '"stroke":"#1769aa"');
  assert.deepEqual(objectsFromLatex(edited, objects).objects[0].style, { stroke: "#1769aa", strokeWidth: 4 });
});

test("applies editable generated LaTeX coordinates back to the canvas", () => {
  const objects: CanvasObject[] = [{ id: "line-1", kind: "line", x: 0, y: 0, x2: 100, y2: 0 }];
  const edited = documentFor(objects).replace("(2.00,0.00);", "(4.00,-1.00);");
  const result = objectsFromLatex(edited, objects);
  assert.equal(result.applied, 1);
  assert.deepEqual(result.objects[0], { id: "line-1", kind: "line", x: 0, y: 0, x2: 200, y2: 50 });
});

test("exports and applies editable Bézier curves", () => {
  const objects: CanvasObject[] = [{ id: "curve-1", kind: "curve", x: 0, y: 0, x2: 100, y2: 100, control: { x: 80, y: 0 } }];
  assert.match(objectToLatex(objects[0]), /controls \(1\.60,0\.00\) and \(1\.60,0\.00\)/);
  const edited = documentFor(objects).replace("(1.60,0.00) and (1.60,0.00)", "(2.00,-1.00) and (2.00,-1.00)");
  const result = objectsFromLatex(edited, objects);
  assert.deepEqual(result.objects[0], { id: "curve-1", kind: "curve", x: 0, y: 0, x2: 100, y2: 100, control: { x: 100, y: 50 } });
});

test("applies editable generated LaTeX text back to the canvas", () => {
  const objects: CanvasObject[] = [{ id: "text-1", kind: "text", x: 50, y: 50, text: "Avant" }];
  const edited = documentFor(objects).replace("Avant", "Après").replace("(1.00,-1.00)", "(2.00,-2.00)");
  const result = objectsFromLatex(edited, objects);
  assert.deepEqual(result.objects[0], { id: "text-1", kind: "text", x: 100, y: 100, text: "Après" });
});

test("keeps complex generated symbols while applying editable LaTeX", () => {
  const objects: CanvasObject[] = [{ id: "lens-1", kind: "lens", x: 30, y: 40, width: 60, height: 120 }];
  const result = objectsFromLatex(documentFor(objects), objects);
  assert.equal(result.applied, 0);
  assert.deepEqual(result.objects, objects);
});

test("uses the CPGE chevron notation for converging and diverging lenses", () => {
  const converging = objectToLatex({ id: "lens-1", kind: "lens", x: 30, y: 40, width: 60, height: 120 });
  const diverging = objectToLatex({ id: "lens-2", kind: "diverging-lens", x: 30, y: 40, width: 60, height: 120 });
  assert.match(converging, /\(-0\.08,0\.62\) -- \(0,0\.72\) -- \(0\.08,0\.62\)/);
  assert.match(diverging, /\(-0\.08,0\.72\) -- \(0,0\.62\) -- \(0\.08,0\.72\)/);
  assert.doesNotMatch(converging, /Latex|node\[below right\]/);
});

test("applies editable metadata for every generated canvas property", () => {
  const objects: CanvasObject[] = [{ id: "lens-1", kind: "lens", x: 30, y: 40, width: 60, height: 120, rotation: 0 }];
  const edited = documentFor(objects).replace('"x":30', '"x":180').replace('"rotation":0', '"rotation":35');
  const result = objectsFromLatex(edited, objects);
  assert.equal(result.applied, 1);
  assert.deepEqual(result.objects[0], { id: "lens-1", kind: "lens", x: 180, y: 40, width: 60, height: 120, rotation: 35 });
});

test("adds a complete object written in a generated LaTeX semantic block", () => {
  const source = "\\begin{tikzpicture}\n% sketch2latex id=new-arrow\n% @sketch2latex {\"id\":\"new-arrow\",\"kind\":\"arrow\",\"x\":20,\"y\":30,\"x2\":180,\"y2\":90}\n\\draw[-{Latex}] (0.40,-0.60) -- (3.60,-1.80);\n\\end{tikzpicture}";
  const result = objectsFromLatex(source, []);
  assert.deepEqual(result.objects, [{ id: "new-arrow", kind: "arrow", x: 20, y: 30, x2: 180, y2: 90 }]);
});

test("applies an edited ion label from the generated LaTeX metadata", () => {
  const objects: CanvasObject[] = [{ id: "ion-1", kind: "ion", x: 40, y: 40, width: 52, height: 52, annotations: { main: "ion" } }];
  const edited = documentFor(objects).replace('"main":"ion"', '"main":"Na+"');
  const result = objectsFromLatex(edited, objects);
  assert.deepEqual(result.objects[0].annotations, { main: "Na+" });
});

test("applies an edited ion label from the visible generated TikZ node", () => {
  const objects: CanvasObject[] = [{ id: "ion-1", kind: "ion", x: 40, y: 40, width: 52, height: 52, annotations: { main: "ion" } }];
  const edited = documentFor(objects).replace("{ion};", "{Cl−};");
  const result = objectsFromLatex(edited, objects);
  assert.deepEqual(result.objects[0].annotations, { main: "Cl−" });
});

test("returns a self-contained document with required STEM packages", () => {
  const output = documentFor([{ id: "b1", kind: "bond-double", x: 0, y: 0, x2: 50, y2: 0 }]);
  assert.match(output, /\\usepackage\{circuitikz\}/);
  assert.match(output, /\\usepackage\{pgfplots\}/);
  assert.match(output, /\\begin\{tikzpicture\}/);
});

test("emits LaTeX for every MPSI component exposed in the toolbar", () => {
  const exposedKinds = toolboxGroups.flatMap((group) => group.kinds).filter((kind): kind is ObjectKind => kind !== "select");
  assert.equal(new Set(exposedKinds).size, exposedKinds.length);
  const objects: CanvasObject[] = exposedKinds.map((kind, index) => {
    const x = 20 + index * 3;
    if (connectorKinds.includes(kind)) return { id: kind, kind, x, y: 30, x2: x + 60, y2: 30 };
    if (kind === "freehand") return { id: kind, kind, x, y: 30, points: [{ x, y: 30 }, { x: x + 20, y: 20 }, { x: x + 50, y: 40 }] };
    if (kind === "axes") return { id: kind, kind, x, y: 30, width: 180, height: 120, graph: { expression: "x", xMin: -2, xMax: 2 } };
    if (kind === "text") return { id: kind, kind, x, y: 30, text: "MPSI" };
    if (stampKinds.includes(kind)) return { id: kind, kind, x, y: 30, ...stampSize(kind) };
    return { id: kind, kind, x, y: 30, width: 40, height: 40 };
  });
  for (const object of objects) assert.notEqual(objectToLatex(object).trim(), "", object.kind);
});

test("imports ordinary TikZ lines, rectangles and labels when metadata is absent", () => {
  const source = "\\begin{tikzpicture}\\draw (0,0) -- (2,-1);\\draw[dashed] (1,-1) rectangle (3,-2);\\node at (1,-3) {hello};\\end{tikzpicture}";
  const result = objectsFromLatex(source, []);
  assert.equal(result.applied, 3);
  assert.deepEqual(result.objects[0], { id: "tikz-line-0", kind: "line", x: 0, y: 0, x2: 100, y2: 50 });
  assert.deepEqual(result.objects[1], { id: "tikz-rect-1", kind: "rect", x: 50, y: 50, width: 100, height: 50 });
  assert.deepEqual(result.objects[2], { id: "tikz-text-0", kind: "text", x: 50, y: 150, text: "hello" });
});

test("keeps document settings and structured template projects portable", () => {
  const template = diagramTemplates.find((item) => item.id === "rlc-series");
  assert.ok(template);
  const cloned = cloneTemplateObjects(template);
  assert.equal(cloned.length, template.objects.length);
  assert.notEqual(cloned[0].id, template.objects[0].id);
  const project = parseProject({ name: "Essai", objects: cloned, settings: { width: 1000, height: 700, unit: "mm", orientation: "portrait", gridSize: 10, showGrid: false, snapToGrid: true } });
  assert.equal(project.settings.width, 1000);
  assert.equal(project.settings.orientation, "portrait");
  assert.equal(project.objects.length, cloned.length);
  assert.match(documentFor([], true, project.settings), /x=1mm,y=1mm/);
});
