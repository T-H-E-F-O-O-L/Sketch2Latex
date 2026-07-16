import assert from "node:assert/strict";
import test from "node:test";
import { connectorKinds, defaultDocumentSettings, stampKinds, stampSize, toolboxGroups, type CanvasObject, type ObjectKind } from "../app/lib/canvas-types";
import { makeAopCircuit, type AopConfiguration } from "../app/lib/aop-circuits";
import { graphPathFor, graphPointSetsFor } from "../app/lib/graph";
import { documentFor, objectsFromLatex, objectToLatex, roundTripReport } from "../app/lib/latex";
import { makeProject, parseProject } from "../app/lib/project";
import { cloneTemplateObjects, diagramTemplates } from "../app/lib/templates";
import { fromWorkingUnit, toWorkingUnit } from "../app/lib/units";
import { canvasUnitsToCentimeters, canvasUnitsToPoints } from "../app/lib/concours-style";
import { junctionPointsFor, pointOnWireAt, portsFor } from "../app/lib/connection-geometry";
import { scientificSceneFor, scientificSceneToTikz } from "../app/lib/scientific-scene";
import { parseScientificLabel, scientificLabelToLatex } from "../app/lib/scientific-label";

test("parses concours scientific labels without changing prose", () => {
assert.deepEqual(parseScientificLabel("R_1"), { parts: [{ text: "R" }, { text: "1", script: "sub" }], vector: false });
assert.deepEqual(parseScientificLabel("u_C(t)"), { parts: [{ text: "u" }, { text: "C", script: "sub" }, { text: "(t)" }], vector: false });
assert.deepEqual(parseScientificLabel("$\\vec{F}_{1}$"), { parts: [{ text: "F" }, { text: "1", script: "sub" }], vector: true });
assert.deepEqual(parseScientificLabel("x^2"), { parts: [{ text: "x" }, { text: "2", script: "super" }], vector: false });
assert.deepEqual(parseScientificLabel("\\mu"), { parts: [{ text: "μ" }], vector: false });
assert.deepEqual(parseScientificLabel("Q_h"), { parts: [{ text: "Q" }, { text: "h", script: "sub" }], vector: false });
assert.deepEqual(parseScientificLabel("V_s"), { parts: [{ text: "V" }, { text: "s", script: "sub" }], vector: false });
assert.deepEqual(parseScientificLabel("solution à doser"), { parts: [{ text: "solution à doser" }], vector: false });
assert.equal(scientificLabelToLatex("u_C(t)"), "$u_{C}(t)$");
assert.equal(scientificLabelToLatex("x^2"), "$x^{2}$");
assert.equal(scientificLabelToLatex("F₁", true), "$\\vec{F}_{1}$");
assert.equal(scientificLabelToLatex("$F_1$", true), "$\\vec{F}_{1}$");
});

test("uses the shared label grammar in component and scientific-scene TikZ", () => {
const resistor = objectToLatex({ id: "r-scientific", kind: "resistor", x: 0, y: 0, x2: 100, y2: 0, annotations: { main: "u_C(t)" } });
const voltmeter = objectToLatex({ id: "v-scientific", kind: "voltmeter", x: 0, y: 0, x2: 100, y2: 0, annotations: { main: "V_s" } });
const mass = { id: "m-scientific", kind: "mass" as const, x: 0, y: 0, width: 80, height: 60, annotations: { main: "m_1" } };
assert.match(resistor, /\$u_\{C\}\(t\)\$/);
assert.match(voltmeter, /\$V_\{s\}\$/);
assert.match(scientificSceneToTikz(scientificSceneFor(mass) ?? []), /\$m_\{1\}\$/);
});

test("exports circuit connectors with the exact canvas geometry", () => {
  const output = objectToLatex({ id: "r1", kind: "resistor", x: 0, y: 0, x2: 100, y2: 0 });
  assert.match(output, /shift=\{\(1\.00,0\.00\)\}, rotate=0/);
  assert.match(output, /\(-0\.36,-0\.16\) rectangle \(0\.36,0\.16\)/);
  assert.match(output, /\\node at \(0,0\.26\) \{\$R\$\}/);
  assert.doesNotMatch(output, /to\[R\]/);
});

test("keeps resistor and inductor proportions and labels in every direction", () => {
  const resistor = objectToLatex({ id: "r", kind: "resistor", x: 50, y: 150, x2: 50, y2: 0, annotations: { main: "R₁" } });
  const inductor = objectToLatex({ id: "l", kind: "inductor", x: 50, y: 150, x2: 50, y2: 0, annotations: { main: "L" } });
  assert.match(resistor, /rotate=90/);
  assert.match(resistor, /\{\$R_\{1\}\$\}/);
  assert.match(inductor, /rotate=90/);
  assert.match(inductor, /\(-0\.40,0\).*\(0\.40,0\)/s);
  assert.match(inductor, /\\node at \(0,0\.38\) \{\$L\$\}/);
  assert.doesNotMatch(inductor, /to\[L\]/);
});

test("exports the other electrical symbols without Circuitikz substitutions", () => {
  const capacitor = objectToLatex({ id: "c", kind: "capacitor", x: 0, y: 0, x2: 100, y2: 0, annotations: { main: "C₁" } });
  const battery = objectToLatex({ id: "b", kind: "battery", x: 0, y: 0, x2: 100, y2: 0 });
  const circuitSwitch = objectToLatex({ id: "s", kind: "switch", x: 0, y: 0, x2: 100, y2: 0 });
  assert.match(capacitor, /\\node at \(0,-0\.42\) \{\$C_\{1\}\$\}/);
  assert.match(battery, /\(0\.12,-0\.30\) -- \(0\.12,0\.30\)/);
  assert.match(battery, /\(-0\.10,-0\.18\) -- \(-0\.10,0\.18\)/);
  assert.match(circuitSwitch, /\(-0\.24,0\) -- \(0\.24,0\.24\)/);
  for (const output of [capacitor, battery, circuitSwitch]) assert.doesNotMatch(output, /to\[/);
});

test("flips canvas y coordinates and clips shared graph geometry", () => {
  const output = objectToLatex({ id: "g1", kind: "axes", x: 50, y: 350, width: 250, height: 180, graph: { expression: "x^2", xMin: -5, xMax: 5 } });
  assert.match(output, /\\clip \(1\.00,-7\.00\) rectangle \(6\.00,-10\.60\);/);
  assert.match(output, /\\draw\[solid\] plot coordinates/);
  assert.doesNotMatch(output, /\\addplot|\\begin\{axis\}/);
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
  const objects: CanvasObject[] = [{ id: "colored-line", kind: "line", x: 0, y: 0, x2: 100, y2: 0, style: { stroke: "#c62828", strokeWidth: 4, strokePattern: "dash-dot" } }];
  const output = documentFor(objects);
  assert.match(output, /color=\{rgb,255:red,198;green,40;blue,40\}/);
  assert.match(output, /line width=2\.27pt/);
  assert.match(output, /dash dot/);
  const edited = output.replace('"stroke":"#c62828"', '"stroke":"#1769aa"');
  assert.deepEqual(objectsFromLatex(edited, objects).objects[0].style, { stroke: "#1769aa", strokeWidth: 4, strokePattern: "dash-dot" });
});

test("exports and persists every French engineering stroke pattern", () => {
  const objects: CanvasObject[] = [
    { id: "solid", kind: "line", x: 0, y: 0, x2: 80, y2: 0, style: { strokePattern: "solid" } },
    { id: "dash", kind: "force", x: 0, y: 30, x2: 80, y2: 30, annotations: { main: "F" }, style: { strokePattern: "dashed" } },
    { id: "dot", kind: "circle", x: 0, y: 50, width: 60, height: 60, style: { strokePattern: "dotted" } },
    { id: "mixed", kind: "mass", x: 100, y: 50, width: 80, height: 60, style: { strokePattern: "dash-dot" } },
  ];
  assert.doesNotMatch(objectToLatex(objects[0]), /dash pattern|dotted|dash dot/);
  assert.match(objectToLatex(objects[1]), /dash pattern=on 3\.97pt off 2\.83pt/);
  assert.match(objectToLatex(objects[2]), /densely dotted/);
  assert.match(objectToLatex(objects[3]), /dash dot/);
  const project = parseProject(makeProject("Traits normalisés", objects, defaultDocumentSettings));
  assert.deepEqual(project.objects.map((object) => object.style?.strokePattern), ["solid", "dashed", "dotted", "dash-dot"]);
  assert.deepEqual(roundTripReport(documentFor(objects), objects), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
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
  assert.match(objectToLatex(objects[0]), /controls \(1\.07,0\.00\) and \(1\.73,-0\.67\)/);
  const edited = documentFor(objects).replace("(1.07,0.00) and (1.73,-0.67)", "(2.00,-1.00) and (2.00,-1.00)");
  const result = objectsFromLatex(edited, objects);
  assert.deepEqual(result.objects[0], { id: "curve-1", kind: "curve", x: 0, y: 0, x2: 100, y2: 100, control: { x: 150, y: 75 } });
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
  assert.match(output, /\\usepackage\[european\]\{circuitikz\}/);
  assert.match(output, /\\usepackage\{pgfplots\}/);
  assert.match(output, /\\begin\{tikzpicture\}/);
  assert.match(output, /border=0pt/);
  assert.match(output, /use as bounding box.*\(18\.00,-11\.20\)/);
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

test("keeps every built-in concours template print-safe and self-explanatory", () => {
  const styled = diagramTemplates.flatMap((template) => template.objects.filter((object) => object.style?.stroke));
  assert.ok(styled.length > 10);
  assert.ok(styled.every((object) => object.style?.stroke === "#111111"));
  for (const template of diagramTemplates) assert.doesNotMatch(documentFor(template.objects), /color=\{rgb/);
  const prism = diagramTemplates.find((template) => template.id === "prism-dispersion");
  assert.ok(prism);
  assert.deepEqual(prism.objects.filter((object) => object.id.endsWith("-label")).map((object) => object.text), ["rouge", "orange", "bleu", "violet"]);
  assert.deepEqual(prism.objects.filter((object) => ["red", "orange", "blue", "violet"].includes(object.id)).map((object) => object.style?.strokePattern), ["solid", "dashed", "dotted", "dash-dot"]);
  const pendulum = documentFor(diagramTemplates.find((template) => template.id === "pendulum-forces")!.objects);
  assert.match(pendulum, /\$\\vec\{P\}\$/);
  assert.match(pendulum, /\$\\vec\{T\}\$/);
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

test("uses monochrome concours line styles and identical sampled graph points", () => {
  const graph: CanvasObject = { id: "multi", kind: "axes", x: 100, y: 80, width: 320, height: 220, graph: { expression: "sin(x)", expressions: ["sin(x)", "cos(x)", "0.2*x^2-1"], xMin: -5, xMax: 5, yMin: -3, yMax: 3, xLabel: "t", yLabel: "u", showGrid: true } };
  const sets = graphPointSetsFor(graph); const output = objectToLatex(graph);
  assert.equal(sets.length, 3);
  assert.ok(sets.every((segments) => segments.flat().length > 100));
  assert.match(output, /\\draw\[solid\] plot coordinates/);
  assert.match(output, /\\draw\[dash pattern=on 4pt off 2pt\] plot coordinates/);
  assert.match(output, /\\draw\[densely dotted\] plot coordinates/);
  assert.equal((output.match(/\\draw\[gray!30\]/g) ?? []).length, 18);
  assert.doesNotMatch(output, /color=blue|color=red|green!|orange|violet/);
  assert.match(output, /\{\$t\$\}/);
  assert.match(output, /\{\$u\$\}/);
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

test("uses one physical page scale for SVG, PDF and TikZ", () => {
  assert.equal(canvasUnitsToCentimeters(900), 18);
  assert.ok(Math.abs(canvasUnitsToPoints(900) - 510.23622047) < .0001);
  const source = documentFor([], false, { width: 900, height: 560, unit: "cm", orientation: "landscape", gridSize: 20, showGrid: true, snapToGrid: true });
  assert.match(source, /line width=1\.13pt/);
  assert.match(source, />=\{Latex\[length=4\.54pt,width=3\.00pt\]\}/);
});

test("exports semantic French scientific arrows", () => {
  const force = objectToLatex({ id: "f", kind: "force", x: 0, y: 0, x2: 100, y2: 0, annotations: { main: "F" } });
  const indexedForce = objectToLatex({ id: "f1", kind: "force", x: 0, y: 0, x2: 100, y2: 0, annotations: { main: "F₁" } });
  const equilibrium = objectToLatex({ id: "eq", kind: "equilibrium-arrow", x: 0, y: 0, x2: 100, y2: 0 });
  const dipole = objectToLatex({ id: "mu", kind: "dipole", x: 0, y: 0, x2: 100, y2: 0 });
  assert.match(force, /node\[midway,above\] \{\$\\vec\{F\}\$\}/);
  assert.match(indexedForce, /node\[midway,above\] \{\$\\vec\{F\}_\{1\}\$\}/);
  assert.equal((equilibrium.match(/\\draw\[-\{Latex\}\]/g) ?? []).length, 2);
  assert.match(dipole, /node\[midway,above\] \{\$\\vec\{μ\}\$\}/);
  assert.match(dipole, /\\draw \(-1\.00,-0\.10\) -- \(-1\.00,0\.10\)/);
});

test("exports explicit French dimension lines with matching construction marks", () => {
  const horizontal: CanvasObject = { id: "d1", kind: "dimension", x: 0, y: 0, x2: 100, y2: 0, annotations: { main: "d₁" } };
  const vertical: CanvasObject = { id: "d2", kind: "dimension", x: 50, y: 50, x2: 50, y2: 200, annotations: { main: "h" } };
  const output = objectToLatex(horizontal); const rotated = objectToLatex(vertical);
  assert.match(output, /shift=\{\(1\.00,0\.00\)\}, rotate=0/);
  assert.match(output, /\\draw\[<->\] \(-1\.00,0\) -- \(1\.00,0\);/);
  assert.match(output, /\\draw \(-1\.00,-0\.10\) -- \(-1\.00,0\.10\);/);
  assert.match(output, /\\draw \(1\.00,-0\.10\) -- \(1\.00,0\.10\);/);
  assert.match(output, /\\node\[fill=white,inner sep=1pt\] at \(0,0\.20\) \{\$d_\{1\}\$\};/);
  assert.match(rotated, /shift=\{\(1\.00,-2\.50\)\}, rotate=-90/);
  assert.doesNotMatch(output, /\|<->\|/);
  assert.deepEqual(roundTripReport(documentFor([horizontal, vertical]), [horizontal, vertical]), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
});

test("defines precise named terminals for French circuit symbols", () => {
  const resistor: CanvasObject = { id: "r", kind: "resistor", x: 20, y: 40, x2: 180, y2: 40 };
  const ground: CanvasObject = { id: "g", kind: "ground", x: 100, y: 200, width: 44, height: 42 };
  assert.deepEqual(portsFor(resistor), [{ name: "start", x: 20, y: 40 }, { name: "end", x: 180, y: 40 }]);
  assert.deepEqual(portsFor(ground), [{ name: "ground", x: 122, y: 200 }]);
  assert.deepEqual(portsFor({ id: "aop", kind: "op-amp", x: 0, y: 0, width: 150, height: 105 }).map((port) => port.name), ["inverting", "non-inverting", "output"]);
  assert.deepEqual(portsFor({ id: "rotated", kind: "resistor", x: 0, y: 0, x2: 100, y2: 0, rotation: 90 }).map(({ name, x, y }) => ({ name, x: Math.round(x), y: Math.round(y) })), [{ name: "start", x: 50, y: -50 }, { name: "end", x: 50, y: 50 }]);
});

test("renders the same automatic circuit junctions in TikZ", () => {
  const objects: CanvasObject[] = [
    { id: "w1", kind: "wire", x: 0, y: 0, x2: 100, y2: 0 },
    { id: "w2", kind: "wire", x: 100, y: 0, x2: 180, y2: 0 },
    { id: "w3", kind: "wire", x: 100, y: 0, x2: 100, y2: 80 },
  ];
  assert.deepEqual(junctionPointsFor(objects), [{ x: 100, y: 0 }]);
  assert.match(documentFor(objects), /\\fill \(2\.00,0\.00\) circle \(0\.06\);/);
});

test("supports precise T-junctions on the middle of a wire", () => {
  const main: CanvasObject = { id: "main", kind: "wire", x: 0, y: 0, x2: 200, y2: 0 };
  const branch: CanvasObject = { id: "branch", kind: "wire", x: 100, y: 0, x2: 100, y2: 100, bindings: { startId: "main", startPort: "segment", startRatio: .5 } };
  assert.deepEqual(pointOnWireAt(main, .5), { x: 100, y: 0 });
  assert.deepEqual(junctionPointsFor([main, branch]), [{ x: 100, y: 0 }]);
  assert.match(documentFor([main, branch]), /"startPort":"segment","startRatio":0\.5/);
});

test("preserves named terminal bindings in generated metadata", () => {
  const objects: CanvasObject[] = [
    { id: "r", kind: "resistor", x: 100, y: 100, x2: 220, y2: 100 },
    { id: "w", kind: "wire", x: 20, y: 100, x2: 100, y2: 100, bindings: { endId: "r", endPort: "start" } },
  ];
  assert.deepEqual(objectsFromLatex(documentFor(objects), objects).objects, objects);
  assert.match(documentFor(objects), /"endPort":"start"/);
});

test("uses one scientific scene for concours mechanics geometry", () => {
  const frame: CanvasObject = { id: "frame", kind: "reference-frame", x: 100, y: 80, width: 200, height: 120, annotations: { origin: "O", x: "x", y: "y" } };
  const scene = scientificSceneFor(frame);
  assert.ok(scene);
  assert.equal(scene.length, 6);
  const tikz = scientificSceneToTikz(scene);
  assert.match(tikz, /\\draw\[-\{Latex\}\] \(2\.80,-3\.47\) -- \(5\.36,-3\.47\);/);
  assert.match(tikz, /\\fill \(2\.80,-3\.47\) circle \(0\.04\);/);
  assert.match(objectToLatex(frame), /\\node\[anchor=base,font=\\fontsize\{7\.37pt\}\{8\.84pt\}\\selectfont\] at \(2\.60,-3\.81\) \{\$O\$\};/);
});

test("keeps shared mechanics geometry faithful to independent width and height", () => {
  const pendulum: CanvasObject = { id: "p", kind: "pendulum", x: 20, y: 30, width: 80, height: 200 };
  const output = objectToLatex(pendulum);
  assert.match(output, /\\draw \(1\.20,-0\.72\) -- \(1\.20,-3\.48\);/);
  assert.match(output, /circle \(0\.27\)/);
  assert.deepEqual(roundTripReport(documentFor([pendulum]), [pendulum]), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
});

test("uses French vector notation for concours field diagrams", () => {
  const gravity = objectToLatex({ id: "g", kind: "gravity-field", x: 0, y: 0, width: 100, height: 80, annotations: { main: "g" } });
  const electric = objectToLatex({ id: "e", kind: "electric-field", x: 0, y: 0, width: 100, height: 80, annotations: { main: "E" } });
  const magnetic = objectToLatex({ id: "b", kind: "magnetic-field-in", x: 0, y: 0, width: 90, height: 75 });
  assert.match(gravity, /\{\$\\vec\{g\}\$\}/);
  assert.match(electric, /\{\$\\vec\{E\}\$\}/);
  assert.equal((magnetic.match(/\$\\otimes\$/g) ?? []).length, 6);
  assert.match(magnetic, /\{\$\\vec\{B\}\$\}/);
});

test("shares exact electromagnetic apparatus geometry across renderers", () => {
  const solenoid = objectToLatex({ id: "s", kind: "solenoid", x: 0, y: 0, width: 130, height: 80 });
  const rails = objectToLatex({ id: "rails", kind: "laplace-rails", x: 0, y: 0, width: 140, height: 90, annotations: { velocity: "v" } });
  const magnet = objectToLatex({ id: "magnet", kind: "bar-magnet", x: 0, y: 0, width: 110, height: 48, annotations: { north: "N", south: "S" } });
  assert.equal((solenoid.match(/ellipse/g) ?? []).length, 6);
  assert.match(solenoid, /\\draw \(0\.04,-0\.80\) -- \(0\.10,-0\.80\);/);
  assert.match(rails, /line width=2\.27pt/);
  assert.match(rails, /\{\$\\vec\{v\}\$\}/);
  assert.match(rails, /\{\$\\vec\{B\}\$\}/);
  assert.match(magnet, /\\draw \(1\.10,-0\.19\) -- \(1\.10,-0\.77\);/);
});

test("shares exact French concours optics geometry across renderers", () => {
  const mirror = objectToLatex({ id: "mirror", kind: "plane-mirror", x: 20, y: 30, width: 34, height: 120 });
  const screen = objectToLatex({ id: "screen", kind: "screen", x: 20, y: 30, width: 34, height: 120 });
  const prism = objectToLatex({ id: "prism", kind: "prism", x: 0, y: 0, width: 90, height: 80 });
  const fiber = objectToLatex({ id: "fiber", kind: "fiber", x: 0, y: 0, width: 140, height: 65 });
  assert.match(mirror, /line width=2\.27pt/);
  assert.match(mirror, /\\draw \(0\.74,-0\.84\) -- \(0\.94,-0\.96\);/);
  assert.match(screen, /\\draw \(0\.74,-0\.84\) -- \(0\.54,-0\.96\);/);
  assert.match(prism, /\(0\.12,-1\.48\) -- \(1\.68,-1\.48\) -- \(0\.90,-0\.14\) -- cycle/);
  assert.equal((fiber.match(/\.\. controls/g) ?? []).length, 2);
  assert.match(fiber, /\(0\.08,-0\.39\).*\(2\.70,-0\.81\)/s);
});

test("shares French chemistry symbols and electrochemical-cell geometry", () => {
  const ion: CanvasObject = { id: "ion", kind: "ion", x: 20, y: 30, width: 60, height: 44, annotations: { main: "Cl−" } };
  const cell: CanvasObject = { id: "cell", kind: "electrochemical-cell", x: 0, y: 0, width: 240, height: 160, annotations: { anode: "anode (-)", cathode: "cathode (+)", bridge: "pont salin" } };
  const crystal = objectToLatex({ id: "cfc", kind: "crystal-fcc", x: 0, y: 0, width: 110, height: 100 });
  const ionOutput = objectToLatex(ion); const cellOutput = objectToLatex(cell);
  assert.match(ionOutput, /circle \(0\.30\)/);
  assert.match(ionOutput, /\{Cl−\};/);
  assert.equal((crystal.match(/\\fill /g) ?? []).length, 8);
  assert.equal((cellOutput.match(/fill=gray!12/g) ?? []).length, 2);
  assert.match(cellOutput, /\\draw\[dashed\]/);
  assert.equal((cellOutput.match(/line width=2\.27pt/g) ?? []).length, 5);
  assert.match(cellOutput, /\{\\text\{pont salin\}\}/);
  assert.deepEqual(roundTripReport(documentFor([ion, cell]), [ion, cell]), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
});

test("uses one print-safe scene for all French CPGE laboratory apparatus", () => {
  const kinds: ObjectKind[] = ["beaker", "flask", "round-bottom-flask", "distillation-flask", "test-tube", "graduated-cylinder", "burette", "volumetric-flask", "separatory-funnel", "pipette", "filter-funnel", "wash-bottle", "liebig-condenser", "support-stand", "magnetic-stirrer", "thermometer", "bunsen-burner"];
  const objects = kinds.map((kind, index): CanvasObject => ({ id: `lab-${index}`, kind, x: 10 + index * 5, y: 20, ...stampSize(kind) }));
  for (const object of objects) {
    const scene = scientificSceneFor(object);
    assert.ok(scene?.length, object.kind);
    assert.doesNotMatch(scientificSceneToTikz(scene), /blue|red|orange/i, object.kind);
  }
  const beaker = objectToLatex({ id: "beaker", kind: "beaker", x: 0, y: 0, width: 100, height: 180 });
  assert.match(beaker, /fill=gray!12/);
  assert.match(beaker, /\(0\.28,-0\.36\).*\(1\.72,-0\.36\)/s);
  assert.equal(scientificSceneFor({ id: "cylinder", kind: "graduated-cylinder", x: 0, y: 0, width: 54, height: 200 })?.length, 10);
  assert.deepEqual(roundTripReport(documentFor(objects), objects), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
});

test("shares thermodynamic apparatus and uses correct quantity notation", () => {
  const piston: CanvasObject = { id: "piston", kind: "piston-cylinder", x: 0, y: 0, width: 120, height: 180, annotations: { main: "P, V, T" } };
  const engine: CanvasObject = { id: "engine", kind: "heat-engine", x: 0, y: 0, width: 120, height: 100, annotations: { main: "machine", hot: "Qh", cold: "Qc", work: "W" } };
  const pistonOutput = objectToLatex(piston); const engineOutput = objectToLatex(engine);
  assert.match(pistonOutput, /\(0\.43,-3\.24\) -- \(0\.43,-0\.43\) -- \(1\.97,-0\.43\) -- \(1\.97,-3\.24\)/);
  assert.match(engineOutput, /\{\\text\{machine\}\}/);
  assert.match(engineOutput, /\{\$Q_h\$\}/);
  assert.match(engineOutput, /\{\$Q_c\$\}/);
  assert.match(engineOutput, /\\node\[anchor=base,font=\\fontsize\{6\.24pt\}\{7\.48pt\}\\selectfont\].*\{\$Q_h\$\}/);
  assert.equal((engineOutput.match(/\\draw\[-\{Latex\}\]/g) ?? []).length, 3);
  assert.deepEqual(roundTripReport(documentFor([piston, engine]), [piston, engine]), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
});

test("shares French instruments, ground and every AOP stamp across renderers", () => {
  const omitted = stampKinds.filter((kind) => !["point", "equation"].includes(kind) && !scientificSceneFor({ id: kind, kind, x: 0, y: 0, ...stampSize(kind) }));
  assert.deepEqual(omitted, []);
  const ground = objectToLatex({ id: "ground", kind: "ground", x: 0, y: 0, width: 44, height: 42 });
  const inverting = objectToLatex({ id: "aop", kind: "op-amp-inverting", x: 0, y: 0, width: 150, height: 105 });
  const comparator = objectToLatex({ id: "cmp", kind: "op-amp-comparator", x: 0, y: 0, width: 150, height: 105 });
  assert.equal((ground.match(/\\draw /g) ?? []).length, 4);
  assert.match(inverting, /rectangle/);
  assert.match(inverting, /\{\\text\{Inverseur\}\}/);
  assert.doesNotMatch(inverting, /zigzag|to\[R\]/);
  assert.match(comparator, /\{\$V_s\$\}/);
  assert.match(comparator, /\\node\[anchor=base east,font=\\fontsize\{6\.24pt\}\{7\.48pt\}\\selectfont\].*\{\$V_s\$\}/);
  assert.match(comparator, /\{\\text\{Comparateur\}\}/);
});

test("preserves concours magnetic glyph scale in TikZ", () => {
  const field = objectToLatex({ id: "field", kind: "magnetic-field-in", x: 0, y: 0, width: 120, height: 90 });
  assert.equal((field.match(/font=\\fontsize\{11\.34pt\}\{13\.61pt\}\\selectfont/g) ?? []).length, 6);
  assert.equal((field.match(/\{\$\\otimes\$\}/g) ?? []).length, 6);
  assert.match(field, /anchor=base,font=\\fontsize\{7\.37pt\}\{8\.84pt\}\\selectfont.*\{\$\\vec\{B\}\$\}/);
});
