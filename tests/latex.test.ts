import assert from "node:assert/strict";
import test from "node:test";
import { connectorKinds, stampKinds, stampSize, toolboxGroups, type CanvasObject, type ObjectKind } from "../app/lib/canvas-types";
import { makeAopCircuit, type AopConfiguration } from "../app/lib/aop-circuits";
import { graphPathFor } from "../app/lib/graph";
import { documentFor, objectsFromLatex, objectToLatex, roundTripReport } from "../app/lib/latex";
import { parseProject } from "../app/lib/project";
import { cloneTemplateObjects, diagramTemplates } from "../app/lib/templates";
import { fromWorkingUnit, toWorkingUnit } from "../app/lib/units";

test("exports circuit connectors with the exact canvas geometry", () => {
  const output = objectToLatex({ id: "r1", kind: "resistor", x: 0, y: 0, x2: 100, y2: 0 });
  assert.match(output, /shift=\{\(1\.00,0\.00\)\}, rotate=0/);
  assert.match(output, /\(-0\.36,-0\.16\) rectangle \(0\.36,0\.16\)/);
  assert.match(output, /\\node at \(0,0\.26\) \{R\}/);
  assert.doesNotMatch(output, /to\[R\]/);
});

test("keeps resistor and inductor proportions and labels in every direction", () => {
  const resistor = objectToLatex({ id: "r", kind: "resistor", x: 50, y: 150, x2: 50, y2: 0, annotations: { main: "R₁" } });
  const inductor = objectToLatex({ id: "l", kind: "inductor", x: 50, y: 150, x2: 50, y2: 0, annotations: { main: "L" } });
  assert.match(resistor, /rotate=90/);
  assert.match(resistor, /\{R\$_\{1\}\$\}/);
  assert.match(inductor, /rotate=90/);
  assert.match(inductor, /\(-0\.40,0\).*\(0\.40,0\)/s);
  assert.match(inductor, /\\node at \(0,0\.38\) \{L\}/);
  assert.doesNotMatch(inductor, /to\[L\]/);
});

test("exports the other electrical symbols without Circuitikz substitutions", () => {
  const capacitor = objectToLatex({ id: "c", kind: "capacitor", x: 0, y: 0, x2: 100, y2: 0, annotations: { main: "C₁" } });
  const battery = objectToLatex({ id: "b", kind: "battery", x: 0, y: 0, x2: 100, y2: 0 });
  const circuitSwitch = objectToLatex({ id: "s", kind: "switch", x: 0, y: 0, x2: 100, y2: 0 });
  assert.match(capacitor, /\\node at \(0,-0\.42\) \{C\$_\{1\}\$\}/);
  assert.match(battery, /\(-0\.10,-0\.30\) -- \(-0\.10,0\.30\)/);
  assert.match(circuitSwitch, /\(-0\.24,0\) -- \(0\.24,0\.24\)/);
  for (const output of [capacitor, battery, circuitSwitch]) assert.doesNotMatch(output, /to\[/);
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
  const objects: CanvasObject[] = [{ id: "lens-1", kind: "lens", x: 60, y: 160, x2: 60, y2: 40 }];
  const result = objectsFromLatex(documentFor(objects), objects);
  assert.equal(result.applied, 1);
  assert.deepEqual(result.objects, objects);
});

test("uses draggable double-sided French CPGE arrows for converging and diverging lenses", () => {
  const converging = objectToLatex({ id: "lens-1", kind: "lens", x: 50, y: 150, x2: 50, y2: 0 });
  const diverging = objectToLatex({ id: "lens-2", kind: "diverging-lens", x: 50, y: 150, x2: 50, y2: 0 });
  assert.match(converging, /\\draw \(1\.00,-3\.00\) -- \(1\.00,0\.00\)/);
  assert.match(converging, /\\fill \(1\.18,-2\.64\) -- \(1\.00,-3\.00\)/);
  assert.match(diverging, /\\fill \(1\.18,-3\.00\) -- \(1\.00,-2\.64\)/);
  assert.doesNotMatch(converging, /Latex|node\[below right\]/);
});

test("applies editable metadata for every generated canvas property", () => {
  const objects: CanvasObject[] = [{ id: "lens-1", kind: "lens", x: 30, y: 40, x2: 30, y2: 160, rotation: 0 }];
  const edited = documentFor(objects).replace('"x":30', '"x":180').replace('"rotation":0', '"rotation":35');
  const result = objectsFromLatex(edited, objects);
  assert.equal(result.applied, 1);
  assert.deepEqual(result.objects[0], { id: "lens-1", kind: "lens", x: 180, y: 40, x2: 30, y2: 160, rotation: 35 });
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
  assert.deepEqual(result.objects[2], { id: "tikz-text-2", kind: "text", x: 50, y: 150, text: "hello" });
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
  assert.match(documentFor([], true, project.settings), /scale=10/);
});

test("imports richer ordinary TikZ and protects unsupported commands", () => {
  const source = String.raw`\begin{tikzpicture}
\draw (0,0) circle (1);
\draw (0,0) .. controls (1,2) .. (3,0);
\node at (2,-1) {$E=mc^2$};
\shade[ball color=blue] (4,0) circle (.5);
\end{tikzpicture}`;
  const result = objectsFromLatex(source, []);
  assert.deepEqual(result.objects.map((object) => object.kind), ["circle", "curve", "equation", "raw-tikz"]);
  assert.match(result.objects[3].rawTikz ?? "", /\\shade/);
});

test("round-trips equations and protected TikZ without losing source", () => {
  const objects: CanvasObject[] = [
    { id: "eq", kind: "equation", x: 80, y: 40, width: 220, height: 70, text: "\\int_0^1 x^2\\,dx" },
    { id: "raw", kind: "raw-tikz", x: 20, y: 30, width: 180, height: 70, rawTikz: "\\shade[ball color=red] (1,1) circle (.4);" },
  ];
  const source = documentFor(objects);
  assert.match(source, /\$\\int_0\^1/);
  assert.match(source, /\\shade\[ball color=red\]/);
  assert.deepEqual(roundTripReport(source, objects), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
});

test("keeps spaces when a plain-text formula is exported", () => {
  const output = objectToLatex({ id: "words", kind: "equation", x: 40, y: 50, width: 220, height: 70, text: "Texte avec espaces" });
  assert.match(output, /\\text\{Texte avec espaces\}/);
});

test("exports complex multi-line mathematical demonstrations", () => {
  const text = String.raw`\begin{aligned}E&=u_R+u_C\\&=RC\frac{du_C}{dt}+u_C\\\Rightarrow u_C(t)&=E\left(1-e^{-t/(RC)}\right)\end{aligned}`;
  const equation: CanvasObject = { id: "proof", kind: "equation", x: 40, y: 50, width: 520, height: 220, text };
  const output = objectToLatex(equation);
  assert.match(output, /\\begin\{aligned\}E&=u_R\+u_C/);
  assert.match(output, /\\frac\{du_C\}\{dt\}/);
  assert.deepEqual(roundTripReport(documentFor([equation]), [equation]), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
});

test("builds every AOP configuration from editable grouped components", () => {
  const kinds: AopConfiguration[] = ["op-amp-inverting", "op-amp-non-inverting", "op-amp-summing", "op-amp-integrator", "op-amp-differentiator", "op-amp-schmitt"];
  for (const kind of kinds) {
    const circuit = makeAopCircuit(kind, { x: 300, y: 220 }, { stroke: "#111", strokeWidth: 2 });
    assert.ok(circuit.length >= 8, kind);
    assert.ok(circuit.some((object) => object.kind === "op-amp"), kind);
    assert.ok(circuit.some((object) => object.kind === "resistor" || object.kind === "capacitor"), kind);
    assert.equal(new Set(circuit.map((object) => object.groupId)).size, 1, kind);
  }
});

test("converts editable dimensions between cm, mm, pt and TikZ units", () => {
  assert.equal(toWorkingUnit(50, "cm"), 1);
  assert.equal(toWorkingUnit(50, "mm"), 10);
  assert.equal(toWorkingUnit(50, "tikz"), 1);
  assert.ok(Math.abs(fromWorkingUnit(toWorkingUnit(50, "pt"), "pt") - 50) < .01);
});
