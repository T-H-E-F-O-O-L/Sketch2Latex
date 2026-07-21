import assert from "node:assert/strict";
import test from "node:test";
import { connectorKinds, defaultAnnotations, defaultDocumentSettings, stampKinds, stampSize, toolboxGroups, type CanvasObject, type ObjectKind } from "../app/lib/canvas-types";
import { makeAopCircuit, type AopConfiguration } from "../app/lib/aop-circuits";
import { graphPathFor, graphPointSetsFor } from "../app/lib/graph";
import { documentFor, objectsFromLatex, objectToLatex, roundTripReport } from "../app/lib/latex";
import { makeProject, parseProject } from "../app/lib/project";
import { cloneTemplateObjects, diagramTemplates } from "../app/lib/templates";
import { fromWorkingUnit, toWorkingUnit } from "../app/lib/units";
import { CONCOURS_GRAPH_GRID_PERCENT, CONCOURS_LIGHT_FILL, canvasUnitsToCentimeters, canvasUnitsToPoints } from "../app/lib/concours-style";
import { junctionPointsFor, pointOnSegmentAt, pointOnWireAt, portsFor } from "../app/lib/connection-geometry";
import { connectorLabelPointFor, springPointsFor, wavePointsFor } from "../app/lib/connector-paths";
import { simplifyFreehandPoints } from "../app/lib/freehand-path";
import { GPS_DASH_ARRAYS, GPS_NARROW_STROKE, GPS_WIDE_STROKE, scientificSceneFor, scientificSceneToTikz } from "../app/lib/scientific-scene";
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
  assert.match(output, /\\node\[anchor=base,inner sep=0pt,outer sep=0pt\] at \(0,0\.26\) \{\$R\$\}/);
  assert.doesNotMatch(output, /to\[R\]/);
});

test("keeps resistor and inductor proportions and labels in every direction", () => {
  const resistor = objectToLatex({ id: "r", kind: "resistor", x: 50, y: 150, x2: 50, y2: 0, annotations: { main: "R₁" } });
  const inductor = objectToLatex({ id: "l", kind: "inductor", x: 50, y: 150, x2: 50, y2: 0, annotations: { main: "L" } });
  assert.match(resistor, /rotate=90/);
  assert.match(resistor, /\{\$R_\{1\}\$\}/);
  assert.match(inductor, /rotate=90/);
  assert.match(inductor, /\(-0\.40,0\).*\(0\.40,0\)/s);
  assert.match(inductor, /\\node\[anchor=base,inner sep=0pt,outer sep=0pt\] at \(0,0\.38\) \{\$L\$\}/);
  assert.doesNotMatch(inductor, /to\[L\]/);
});

test("exports the other electrical symbols without Circuitikz substitutions", () => {
  const capacitor = objectToLatex({ id: "c", kind: "capacitor", x: 0, y: 0, x2: 100, y2: 0, annotations: { main: "C₁" } });
  const battery = objectToLatex({ id: "b", kind: "battery", x: 0, y: 0, x2: 100, y2: 0 });
  const circuitSwitch = objectToLatex({ id: "s", kind: "switch", x: 0, y: 0, x2: 100, y2: 0 });
  assert.match(capacitor, /\\node\[anchor=base,inner sep=0pt,outer sep=0pt\] at \(0,-0\.42\) \{\$C_\{1\}\$\}/);
  assert.match(battery, /\(0\.12,-0\.30\) -- \(0\.12,0\.30\)/);
  assert.match(battery, /\(-0\.10,-0\.18\) -- \(-0\.10,0\.18\)/);
  assert.match(circuitSwitch, /\(-0\.24,0\) -- \(0\.24,0\.24\)/);
  for (const output of [capacitor, battery, circuitSwitch]) assert.doesNotMatch(output, /to\[/);
});

test("matches exact French meter and connector label geometry", () => {
  const meter = objectToLatex({ id: "v", kind: "voltmeter", x: 0, y: 0, x2: 100, y2: 0, annotations: { main: "V_s" } });
  const heat = objectToLatex({ id: "q", kind: "heat-arrow", x: 50, y: 150, x2: 50, y2: 0, annotations: { main: "Q_h" } });
  assert.match(meter, /shift=\{\(1\.00,0\.00\)\}, rotate=0/);
  assert.match(meter, /\\draw\[fill=white\] \(0,0\) circle \(0\.30\)/);
  assert.match(meter, /\\node\[anchor=base,inner sep=0pt,outer sep=0pt\] at \(0,-0\.10\) \{\$V_\{s\}\$\}/);
  assert.match(heat, /shift=\{\(1\.00,-1\.50\)\}, rotate=90/);
  assert.match(heat, /\\node\[anchor=base,inner sep=0pt,outer sep=0pt\] at \(0,0\.18\) \{\$Q_\{h\}\$\}/);
});

test("adds French ideal voltage and current generators with exact source geometry", () => {
  const voltage: CanvasObject = { id: "source-e", kind: "voltage-source", x: 0, y: 0, x2: 120, y2: 0, annotations: { main: "E_0" } };
  const current: CanvasObject = { id: "source-i", kind: "current-source", x: 50, y: 150, x2: 50, y2: 0, annotations: { main: "I" } };
  const voltageTikz = objectToLatex(voltage); const currentTikz = objectToLatex(current);
  assert.deepEqual(defaultAnnotations("voltage-source"), { main: "E" });
  assert.deepEqual(defaultAnnotations("current-source"), { main: "I" });
  assert.match(voltageTikz, /shift=\{\(1\.20,0\.00\)\}, rotate=0/);
  assert.match(voltageTikz, /\\draw\[fill=white\] \(0,0\) circle \(0\.32\)/);
  assert.match(voltageTikz, /at \(-0\.16,0\) \{\$-\$\}/);
  assert.match(voltageTikz, /at \(0\.16,0\) \{\$\+\$\}/);
  assert.match(voltageTikz, /at \(0,0\.56\) \{\$E_\{0\}\$\}/);
  assert.match(currentTikz, /shift=\{\(1\.00,-1\.50\)\}, rotate=90/);
  assert.match(currentTikz, /\\draw\[-\{Latex\}\] \(-0\.16,0\) -- \(0\.16,0\)/);
  assert.deepEqual(portsFor(voltage).map((port) => port.name), ["start", "end"]);
  assert.deepEqual(portsFor(current).map((port) => port.name), ["start", "end"]);
  assert.ok(toolboxGroups.find((group) => group.title === "Electricity & signals")?.kinds.includes("voltage-source"));
  assert.ok(toolboxGroups.find((group) => group.title === "Electricity & signals")?.kinds.includes("current-source"));
  assert.deepEqual(roundTripReport(documentFor([voltage, current]), [voltage, current]), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
  const edited = documentFor([voltage]).replace("{$E_{0}$}", "{$E_{1}$}");
  assert.deepEqual(objectsFromLatex(edited, [voltage]).objects[0].annotations, { main: "E_1" });
});

test("adds a four-terminal European transformer with shared exact geometry", () => {
  const transformer: CanvasObject = { id: "transformer", kind: "transformer", x: 20, y: 30, width: 140, height: 160, annotations: { primary: "N_1", secondary: "N_2" } };
  const output = objectToLatex(transformer);
  assert.deepEqual(defaultAnnotations("transformer"), { primary: "N_1", secondary: "N_2" });
  assert.deepEqual(stampSize("transformer"), { width: 140, height: 160 });
  assert.ok(toolboxGroups.find((group) => group.title === "Electricity & signals")?.kinds.includes("transformer"));
  assert.deepEqual(portsFor(transformer), [
    { name: "primary-top", x: 20, y: 70 },
    { name: "primary-bottom", x: 20, y: 150 },
    { name: "secondary-top", x: 160, y: 70 },
    { name: "secondary-bottom", x: 160, y: 150 },
  ]);
  assert.equal((output.match(/\.\. controls/g) ?? []).length, 8);
  assert.match(output, /\\draw \(1\.49,-1\.40\) \.\. controls \(1\.65,-1\.49\) and \(1\.65,-1\.71\) \.\. \(1\.49,-1\.80\);/);
  assert.match(output, /\\draw \(2\.11,-1\.40\) \.\. controls \(1\.95,-1\.49\) and \(1\.95,-1\.71\) \.\. \(2\.11,-1\.80\);/);
  assert.match(output, /\\draw\[line width=1\.36pt\] \(1\.72,-1\.24\) -- \(1\.72,-3\.16\);/);
  assert.match(output, /\\draw\[line width=1\.36pt\] \(1\.88,-1\.24\) -- \(1\.88,-3\.16\);/);
  assert.match(output, /\{\$N_\{1\}\$\}/);
  assert.match(output, /\{\$N_\{2\}\$\}/);
  assert.deepEqual(roundTripReport(documentFor([transformer]), [transformer]), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
});

test("adds semantic French control-system blocks with exact named ports", () => {
  const transfer: CanvasObject = { id: "transfer", kind: "transfer-block", x: 100, y: 80, width: 120, height: 70, annotations: { main: "C(p)" } };
  const sum: CanvasObject = { id: "sum", kind: "summing-junction", x: 20, y: 30, width: 70, height: 70, annotations: { left: "+", top: "+", bottom: "−" } };
  const takeoff: CanvasObject = { id: "takeoff", kind: "takeoff-point", x: 0, y: 0, width: 18, height: 18 };
  const signal: CanvasObject = { id: "signal", kind: "signal-arrow", x: 0, y: 0, x2: 100, y2: 0, annotations: { main: "E(p)" } };
  assert.deepEqual(defaultAnnotations("signal-arrow"), { main: "x(p)" });
  assert.deepEqual(defaultAnnotations("transfer-block"), { main: "H(p)" });
  assert.deepEqual(defaultAnnotations("summing-junction"), { left: "+", top: "+", bottom: "−" });
  assert.deepEqual(stampSize("transfer-block"), { width: 120, height: 70 });
  assert.ok(toolboxGroups.find((group) => group.title === "Control systems & block diagrams")?.kinds.includes("summing-junction"));
  assert.deepEqual(portsFor(transfer), [{ name: "input", x: 100, y: 115 }, { name: "output", x: 220, y: 115 }]);
  assert.deepEqual(portsFor(sum), [
    { name: "input-left", x: 20, y: 65 },
    { name: "input-top", x: 55, y: 30 },
    { name: "input-bottom", x: 55, y: 100 },
    { name: "output", x: 90, y: 65 },
  ]);
  assert.deepEqual(portsFor(takeoff), [{ name: "branch", x: 9, y: 9 }]);
  const transferOutput = objectToLatex(transfer); const sumOutput = objectToLatex(sum); const takeoffOutput = objectToLatex(takeoff); const signalOutput = objectToLatex(signal);
  assert.match(transferOutput, /\\draw\[fill=white\] \(2\.00,-1\.60\) rectangle \(4\.40,-3\.00\);/);
  assert.match(transferOutput, /\{\$C\(p\)\$\}/);
  assert.match(sumOutput, /circle \(0\.45\)/);
  assert.equal((sumOutput.match(/\{\$\+\$\}/g) ?? []).length, 2);
  assert.match(sumOutput, /\{\$-\$\}/);
  assert.match(takeoffOutput, /\\fill \(0\.18,-0\.18\) circle \(0\.08\);/);
  assert.match(signalOutput, /\\draw\[-\{Latex\}\] \(-1\.00,0\) -- \(1\.00,0\);/);
  assert.match(signalOutput, /\{\$E\(p\)\$\}/);
  assert.deepEqual(roundTripReport(documentFor([transfer, sum, takeoff, signal]), [transfer, sum, takeoff, signal]), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
});

test("adds normalized French mechanical joints with exact shared geometry", () => {
  const pivot: CanvasObject = { id: "pivot-a", kind: "joint-pivot", x: 10, y: 20, width: 90, height: 50 };
  const slider: CanvasObject = { id: "slider-a", kind: "joint-slider", x: 200, y: 40, width: 110, height: 70 };
  const ball: CanvasObject = { id: "ball-a", kind: "joint-ball", x: 350, y: 60, width: 100, height: 70 };
  assert.deepEqual(stampSize("joint-pivot"), { width: 90, height: 50 });
  assert.deepEqual(stampSize("joint-slider"), { width: 110, height: 70 });
  assert.deepEqual(stampSize("joint-ball"), { width: 100, height: 70 });
  const group = toolboxGroups.find((candidate) => candidate.title === "Standardized mechanical joints");
  assert.deepEqual(group?.kinds.slice(0, 3), ["joint-pivot", "joint-slider", "joint-cylindrical"]);
  assert.ok(group?.kinds.includes("joint-ball"));
  assert.deepEqual(portsFor(pivot), [{ name: "solid-1", x: 100, y: 45 }, { name: "solid-2", x: 10, y: 45 }]);
  assert.deepEqual(portsFor(slider), [{ name: "solid-1", x: 200, y: 68 }, { name: "solid-2", x: 255, y: 110 }]);
  assert.deepEqual(portsFor(ball), [{ name: "solid-1", x: 450, y: 95 }, { name: "solid-2", x: 350, y: 95 }]);
  assert.deepEqual(portsFor({ ...pivot, rotation: 90 }), [{ name: "solid-1", x: 55, y: 90 }, { name: "solid-2", x: 55, y: 0 }]);
  const pivotScene = scientificSceneFor(pivot) ?? []; const sliderScene = scientificSceneFor(slider) ?? []; const ballScene = scientificSceneFor(ball) ?? [];
  assert.deepEqual(pivotScene, [
    { type: "line", x1: 55, y1: 45, x2: 100, y2: 45 },
    { type: "line", x1: 10, y1: 45, x2: 43, y2: 45 },
    { type: "circle", cx: 55, cy: 45, r: 12, fill: "paper" },
  ]);
  assert.deepEqual(sliderScene, [
    { type: "line", x1: 200, y1: 68, x2: 310, y2: 68 },
    { type: "rect", x: 227.5, y: 55.75, width: 55, height: 24.5, fill: "paper" },
    { type: "line", x1: 255, y1: 80.25, x2: 255, y2: 110 },
  ]);
  assert.equal(ballScene[2]?.type, "arc");
  assert.match(scientificSceneToTikz(pivotScene), /\\draw\[fill=white\] \(1\.10,-0\.90\) circle \(0\.24\);/);
  assert.match(scientificSceneToTikz(sliderScene), /\\draw\[fill=white\] \(4\.55,-1\.11\) rectangle \(5\.65,-1\.60\);/);
  assert.match(scientificSceneToTikz(ballScene), /arc\[start angle=-45,end angle=-315,radius=0\.37cm\]/);
  assert.deepEqual(roundTripReport(documentFor([pivot, slider, ball]), [pivot, slider, ball]), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
});

test("completes the French normalized mechanical-joint family", () => {
  const cylindrical: CanvasObject = { id: "cylindrical", kind: "joint-cylindrical", x: 0, y: 0, width: 110, height: 70 };
  const helical: CanvasObject = { id: "helical", kind: "joint-helical", x: 120, y: 0, width: 110, height: 70 };
  const planar: CanvasObject = { id: "planar", kind: "joint-planar", x: 240, y: 0, width: 90, height: 80 };
  const lineContact: CanvasObject = { id: "line-contact", kind: "joint-line-contact", x: 340, y: 0, width: 90, height: 90 };
  const annular: CanvasObject = { id: "annular", kind: "joint-annular", x: 440, y: 0, width: 90, height: 90 };
  const pointContact: CanvasObject = { id: "point-contact", kind: "joint-point-contact", x: 540, y: 0, width: 90, height: 90 };
  const objects = [cylindrical, helical, planar, lineContact, annular, pointContact];
  assert.deepEqual(stampSize("joint-cylindrical"), { width: 110, height: 70 });
  assert.deepEqual(stampSize("joint-helical"), { width: 110, height: 70 });
  assert.deepEqual(stampSize("joint-planar"), { width: 90, height: 80 });
  assert.deepEqual(portsFor(cylindrical), [{ name: "solid-1", x: 0, y: 28 }, { name: "solid-2", x: 55, y: 70 }]);
  assert.deepEqual(portsFor(planar), [{ name: "solid-1", x: 285, y: 0 }, { name: "solid-2", x: 285, y: 80 }]);
  assert.deepEqual(portsFor(pointContact), [{ name: "solid-1", x: 614.7, y: 0 }, { name: "solid-2", x: 585, y: 90 }]);
  const cylindricalScene = scientificSceneFor(cylindrical) ?? []; const helicalScene = scientificSceneFor(helical) ?? [];
  assert.deepEqual(cylindricalScene.map((primitive) => primitive.type), ["rect", "line", "rect", "line"]);
  assert.deepEqual(helicalScene.map((primitive) => primitive.type), ["rect", "line", "polyline", "line", "rect", "line"]);
  const helix = helicalScene.find((primitive) => primitive.type === "polyline");
  assert.equal(helix?.type === "polyline" ? helix.points.length : 0, 33);
  assert.deepEqual((scientificSceneFor(planar) ?? []).map((primitive) => primitive.type), ["line", "line", "line", "line"]);
  assert.deepEqual((scientificSceneFor(lineContact) ?? []).map((primitive) => primitive.type), ["polyline", "line", "line", "line"]);
  assert.deepEqual((scientificSceneFor(annular) ?? []).map((primitive) => primitive.type), ["rect", "line", "circle", "line"]);
  assert.deepEqual((scientificSceneFor(pointContact) ?? []).map((primitive) => primitive.type), ["circle", "line", "line", "line"]);
  assert.match(scientificSceneToTikz(helicalScene), / -- /);
  assert.deepEqual(roundTripReport(documentFor(objects), objects), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
});

test("adds the core French CPGE mechanical-transmission components", () => {
  const gears: CanvasObject = { id: "gears", kind: "gear-pair", x: 0, y: 0, width: 170, height: 110, annotations: { driver: "Z_1", driven: "Z_2" } };
  const rack: CanvasObject = { id: "rack", kind: "rack-pinion", x: 200, y: 0, width: 180, height: 120, annotations: { pinion: "Z", rack: "x" } };
  const belt: CanvasObject = { id: "belt", kind: "belt-drive", x: 400, y: 0, width: 190, height: 120, annotations: { driver: "D_1", driven: "D_2" } };
  const screw: CanvasObject = { id: "screw", kind: "screw-nut", x: 620, y: 0, width: 180, height: 105, annotations: { pitch: "p" } };
  const objects = [gears, rack, belt, screw];
  assert.deepEqual(defaultAnnotations("gear-pair"), { driver: "Z_1", driven: "Z_2" });
  assert.deepEqual(defaultAnnotations("rack-pinion"), { pinion: "Z", rack: "x" });
  assert.deepEqual(stampSize("belt-drive"), { width: 190, height: 120 });
  assert.deepEqual(toolboxGroups.find((group) => group.title === "Mechanical transmissions")?.kinds, ["gear-pair", "rack-pinion", "belt-drive", "screw-nut", "worm-gear", "planetary-gear", "cam-follower"]);
  assert.deepEqual(portsFor(gears).map((port) => port.name), ["input", "output"]);
  assert.deepEqual(portsFor(rack).map((port) => port.name), ["input", "output"]);
  assert.deepEqual(portsFor(belt), [{ name: "input", x: 447.5, y: 60 }, { name: "output", x: 542.5, y: 60 }]);
  assert.deepEqual(portsFor(screw), [{ name: "input", x: 620, y: 52.5 }, { name: "output", x: 731.6, y: 105 }]);
  const gearScene = scientificSceneFor(gears) ?? []; const rackScene = scientificSceneFor(rack) ?? []; const beltScene = scientificSceneFor(belt) ?? []; const screwScene = scientificSceneFor(screw) ?? [];
  const gearPolygons = gearScene.filter((primitive) => primitive.type === "polyline");
  assert.deepEqual(gearPolygons.map((primitive) => primitive.type === "polyline" ? primitive.points.length : 0), [48, 64]);
  assert.equal(rackScene.filter((primitive) => primitive.type === "polyline").length, 2);
  assert.deepEqual(beltScene.slice(0, 4).map((primitive) => primitive.type), ["line", "line", "circle", "circle"]);
  const screwHelix = screwScene.find((primitive) => primitive.type === "polyline");
  assert.equal(screwHelix?.type === "polyline" ? screwHelix.points.length : 0, 65);
  const output = documentFor(objects);
  for (const label of ["Z_1", "Z_2", "D_1", "D_2"]) assert.match(output, new RegExp(`\\$${label.replace("_", "_\\{")}\\}?\\$`));
  assert.deepEqual(roundTripReport(output, objects), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
});

test("adds advanced French CPGE transmission components with functional ports", () => {
  const worm: CanvasObject = { id: "worm", kind: "worm-gear", x: 0, y: 0, width: 180, height: 125, annotations: { worm: "Z_v", wheel: "Z_r" } };
  const planetary: CanvasObject = { id: "planetary", kind: "planetary-gear", x: 200, y: 0, width: 180, height: 180, annotations: { sun: "Z_s", ring: "Z_c", carrier: "PS" } };
  const cam: CanvasObject = { id: "cam", kind: "cam-follower", x: 400, y: 0, width: 150, height: 160, annotations: { cam: "C", follower: "S" } };
  const objects = [worm, planetary, cam];
  assert.deepEqual(defaultAnnotations("worm-gear"), { worm: "Z_v", wheel: "Z_r" });
  assert.deepEqual(defaultAnnotations("planetary-gear"), { sun: "Z_s", ring: "Z_c", carrier: "PS" });
  assert.deepEqual(defaultAnnotations("cam-follower"), { cam: "C", follower: "S" });
  assert.deepEqual(stampSize("worm-gear"), { width: 180, height: 125 });
  assert.deepEqual(stampSize("planetary-gear"), { width: 180, height: 180 });
  assert.deepEqual(stampSize("cam-follower"), { width: 150, height: 160 });
  assert.deepEqual(portsFor(worm), [{ name: "worm", x: 0, y: 125 * .26 }, { name: "wheel", x: 180 * .66, y: 125 }]);
  assert.deepEqual(portsFor(planetary), [{ name: "sun", x: 200, y: 90 }, { name: "carrier", x: 380, y: 90 }, { name: "ring", x: 290, y: 0 }]);
  assert.deepEqual(portsFor(cam), [{ name: "cam", x: 400, y: 160 * .68 }, { name: "follower", x: 400 + 150 * .62, y: 0 }]);
  const wormScene = scientificSceneFor(worm) ?? []; const planetaryScene = scientificSceneFor(planetary) ?? []; const camScene = scientificSceneFor(cam) ?? [];
  const wormHelix = wormScene.find((primitive) => primitive.type === "polyline" && !primitive.closed);
  assert.equal(wormHelix?.type === "polyline" ? wormHelix.points.length : 0, 49);
  assert.equal(planetaryScene.filter((primitive) => primitive.type === "polyline" && primitive.closed).length, 5);
  const camProfile = camScene.find((primitive) => primitive.type === "polyline" && primitive.closed);
  assert.equal(camProfile?.type === "polyline" ? camProfile.points.length : 0, 64);
  const output = documentFor(objects);
  for (const label of ["Z_v", "Z_r", "Z_s", "Z_c", "PS", "C", "S"]) assert.match(output, new RegExp(label));
  assert.deepEqual(roundTripReport(output, objects), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
});

test("adds French electromechanical power-chain components with semantic ports", () => {
  const motor: CanvasObject = { id: "motor", kind: "electric-motor", x: 0, y: 0, width: 130, height: 90, annotations: { main: "M" } };
  const reducer: CanvasObject = { id: "reducer", kind: "gear-reducer", x: 150, y: 0, width: 140, height: 90, annotations: { main: "r" } };
  const clutch: CanvasObject = { id: "clutch", kind: "clutch", x: 320, y: 0, width: 130, height: 90, annotations: { main: "E" } };
  const brake: CanvasObject = { id: "brake", kind: "brake", x: 480, y: 0, width: 130, height: 110, annotations: { main: "F" } };
  const objects = [motor, reducer, clutch, brake];
  assert.deepEqual(toolboxGroups.find((group) => group.title === "Actuators & power chain")?.kinds, ["electric-motor", "gear-reducer", "clutch", "brake"]);
  assert.deepEqual(defaultAnnotations("electric-motor"), { main: "M" });
  assert.deepEqual(defaultAnnotations("gear-reducer"), { main: "r" });
  assert.deepEqual(stampSize("brake"), { width: 130, height: 110 });
  assert.deepEqual(portsFor(motor), [{ name: "electrical", x: 0, y: 45 }, { name: "shaft", x: 130, y: 45 }]);
  assert.deepEqual(portsFor(reducer), [{ name: "input", x: 150, y: 45 }, { name: "output", x: 290, y: 45 }]);
  assert.deepEqual(portsFor(clutch), [{ name: "input", x: 320, y: 45 }, { name: "output", x: 450, y: 45 }]);
  assert.deepEqual(portsFor(brake), [{ name: "shaft", x: 480, y: 49.5 }, { name: "frame", x: 571, y: 110 }]);
  assert.deepEqual((scientificSceneFor(motor) ?? []).map((primitive) => primitive.type), ["line", "circle", "line", "text"]);
  assert.deepEqual((scientificSceneFor(reducer) ?? []).map((primitive) => primitive.type), ["line", "rect", "circle", "circle", "line", "text"]);
  assert.deepEqual((scientificSceneFor(clutch) ?? []).map((primitive) => primitive.type), ["line", "line", "line", "line", "line", "text"]);
  assert.deepEqual((scientificSceneFor(brake) ?? []).map((primitive) => primitive.type), ["line", "circle", "circle", "polyline", "line", "line", "line", "line", "line", "text"]);
  const output = documentFor(objects);
  for (const label of ["M", "r", "E", "F"]) assert.match(output, new RegExp(`\\{\\$?${label}`));
  assert.deepEqual(roundTripReport(output, objects), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
});

test("adds the core ISO 1219 hydraulic library with A/B/P/T ports", () => {
  const pump: CanvasObject = { id: "pump", kind: "hydraulic-pump", x: 0, y: 0, width: 90, height: 110, annotations: { main: "0P" } };
  const reservoir: CanvasObject = { id: "reservoir", kind: "hydraulic-reservoir", x: 110, y: 0, width: 100, height: 70, annotations: { main: "0T" } };
  const cylinder: CanvasObject = { id: "cylinder", kind: "hydraulic-cylinder", x: 230, y: 0, width: 180, height: 100, annotations: { main: "1A" } };
  const valve: CanvasObject = { id: "valve", kind: "hydraulic-valve-4-3", x: 430, y: 0, width: 200, height: 130, annotations: { main: "1V" } };
  const relief: CanvasObject = { id: "relief", kind: "pressure-relief-valve", x: 650, y: 0, width: 140, height: 110, annotations: { main: "p_0" } };
  const objects = [pump, reservoir, cylinder, valve, relief];
  assert.deepEqual(toolboxGroups.find((group) => group.title === "Hydraulics — ISO 1219")?.kinds, ["hydraulic-pump", "hydraulic-reservoir", "hydraulic-cylinder", "hydraulic-valve-4-3", "pressure-relief-valve"]);
  assert.deepEqual(defaultAnnotations("hydraulic-cylinder"), { main: "1A" });
  assert.deepEqual(stampSize("hydraulic-valve-4-3"), { width: 200, height: 130 });
  assert.deepEqual(portsFor(pump), [{ name: "P", x: 45, y: 0 }, { name: "T", x: 45, y: 110 }, { name: "shaft", x: 0, y: 55 }]);
  assert.deepEqual(portsFor(reservoir), [{ name: "T", x: 160, y: 0 }]);
  assert.deepEqual(portsFor(cylinder), [{ name: "A", x: 284, y: 100 }, { name: "B", x: 356, y: 100 }, { name: "shaft", x: 410, y: 50 }, { name: "frame", x: 239, y: 50 }]);
  assert.deepEqual(portsFor(valve), [{ name: "A", x: 515, y: 0 }, { name: "B", x: 545, y: 0 }, { name: "P", x: 515, y: 130 }, { name: "T", x: 545, y: 130 }]);
  assert.deepEqual(portsFor(relief), [{ name: "T", x: 706, y: 0 }, { name: "P", x: 706, y: 110 }]);
  const pumpScene = scientificSceneFor(pump) ?? []; const valveScene = scientificSceneFor(valve) ?? []; const reliefScene = scientificSceneFor(relief) ?? [];
  const pumpTriangle = pumpScene.find((primitive) => primitive.type === "polyline" && primitive.closed);
  assert.equal(pumpTriangle?.type === "polyline" ? pumpTriangle.fill : undefined, "ink");
  assert.equal(valveScene.filter((primitive) => primitive.type === "rect").length, 1);
  assert.equal(valveScene.filter((primitive) => primitive.type === "line" && primitive.arrowEnd).length, 4);
  const reliefSpring = reliefScene.find((primitive) => primitive.type === "polyline");
  assert.equal(reliefSpring?.type === "polyline" ? reliefSpring.points.length : 0, 9);
  const output = documentFor(objects);
  for (const label of ["0P", "0T", "1A", "1V", "p_0"]) assert.match(output, new RegExp(label));
  assert.deepEqual(roundTripReport(output, objects), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
});

test("adds a concours-ready ISO 1219 pneumatic library with numeric 5/2 ports", () => {
  const source: CanvasObject = { id: "source", kind: "pneumatic-source", x: 0, y: 0, width: 90, height: 100, annotations: { main: "0P1" } };
  const service: CanvasObject = { id: "service", kind: "pneumatic-service-unit", x: 110, y: 0, width: 170, height: 90, annotations: { main: "0Z1" } };
  const frl: CanvasObject = { id: "frl", kind: "pneumatic-frl", x: 300, y: 0, width: 200, height: 90, annotations: { main: "0Z2" } };
  const cylinder: CanvasObject = { id: "cylinder", kind: "pneumatic-cylinder", x: 520, y: 0, width: 180, height: 100, annotations: { main: "1A1" } };
  const valve: CanvasObject = { id: "valve", kind: "pneumatic-valve-5-2", x: 720, y: 0, width: 180, height: 125, annotations: { main: "1V1", actuator: "1M1" } };
  const control: CanvasObject = { id: "control", kind: "one-way-flow-control", x: 0, y: 130, width: 140, height: 90, annotations: { main: "1V2" } };
  const exhaust: CanvasObject = { id: "exhaust", kind: "pneumatic-exhaust", x: 160, y: 130, width: 60, height: 60 };
  const objects = [source, service, frl, cylinder, valve, control, exhaust];
  assert.deepEqual(toolboxGroups.find((group) => group.title === "Pneumatics — ISO 1219")?.kinds, ["pneumatic-source", "pneumatic-service-unit", "pneumatic-frl", "pneumatic-cylinder", "pneumatic-valve-5-2", "one-way-flow-control", "pneumatic-exhaust"]);
  assert.deepEqual(defaultAnnotations("pneumatic-valve-5-2"), { main: "1V1", actuator: "1M1" });
  assert.deepEqual(stampSize("pneumatic-service-unit"), { width: 170, height: 90 });
  assert.deepEqual(portsFor(source), [{ name: "P", x: 45, y: 0 }, { name: "shaft", x: 0, y: 50 }]);
  assert.deepEqual(portsFor(service), [{ name: "input", x: 110, y: 45 }, { name: "output", x: 280, y: 45 }]);
  assert.deepEqual(portsFor(frl), [{ name: "input", x: 300, y: 45 }, { name: "output", x: 500, y: 45 }]);
  assert.deepEqual(portsFor(cylinder), [{ name: "cap", x: 574, y: 100 }, { name: "rod-side", x: 646, y: 100 }, { name: "rod", x: 700, y: 50 }, { name: "frame", x: 529, y: 50 }]);
  assert.deepEqual(portsFor(valve), [{ name: "4", x: 823.5, y: 0 }, { name: "2", x: 850.5, y: 0 }, { name: "5", x: 819, y: 125 }, { name: "1", x: 837, y: 125 }, { name: "3", x: 855, y: 125 }, { name: "14", x: 720, y: 62.5 }]);
  const rotatedValve: CanvasObject = { id: "rotated-valve", kind: "pneumatic-valve-5-2", x: 0, y: 250, width: 200, height: 130, rotation: 90 };
  assert.deepEqual(portsFor(rotatedValve), [{ name: "4", x: 165, y: 330 }, { name: "2", x: 165, y: 360 }, { name: "5", x: 35, y: 325 }, { name: "1", x: 35, y: 345 }, { name: "3", x: 35, y: 365 }, { name: "14", x: 100, y: 215 }]);
  assert.deepEqual(portsFor(control), [{ name: "1", x: 0, y: 175 }, { name: "2", x: 140, y: 175 }]);
  assert.deepEqual(portsFor(exhaust), [{ name: "input", x: 190, y: 130 }]);
  const sourceScene = scientificSceneFor(source) ?? []; const serviceScene = scientificSceneFor(service) ?? []; const frlScene = scientificSceneFor(frl) ?? []; const valveScene = scientificSceneFor(valve) ?? []; const controlScene = scientificSceneFor(control) ?? [];
  const pneumaticTriangle = sourceScene.find((primitive) => primitive.type === "polyline" && primitive.closed);
  assert.equal(pneumaticTriangle?.type === "polyline" ? pneumaticTriangle.fill : undefined, "paper");
  assert.equal(serviceScene.filter((primitive) => primitive.type === "rect").length, 2);
  assert.equal(frlScene.filter((primitive) => primitive.type === "rect").length, 3);
  assert.equal(frlScene.filter((primitive) => primitive.type === "polyline" && primitive.closed && primitive.fill === "ink").length, 1);
  assert.equal(valveScene.filter((primitive) => primitive.type === "rect").length, 2);
  assert.equal(valveScene.filter((primitive) => primitive.type === "line" && primitive.arrowEnd).length, 4);
  const valveSpring = valveScene.find((primitive) => primitive.type === "polyline");
  assert.equal(valveSpring?.type === "polyline" ? valveSpring.points.length : 0, 9);
  assert.equal(controlScene.filter((primitive) => primitive.type === "polyline").length, 3);
  assert.equal(controlScene.filter((primitive) => primitive.type === "line" && primitive.arrowEnd).length, 1);
  const output = documentFor(objects);
  for (const label of ["0P1", "0Z1", "0Z2", "1A1", "1V1", "1M1", "4 (B)", "2 (A)", "5 (S)", "1 (P)", "3 (R)"]) assert.match(output, new RegExp(label.replace(/[()]/g, "\\$&")));
  assert.deepEqual(roundTripReport(output, objects), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
});

test("adds French ISO technical-drawing lines, sections and semantic GPS callouts", () => {
  const group = toolboxGroups.find((candidate) => candidate.title === "Technical drawing & GPS");
  assert.deepEqual(group?.kinds, ["hidden-edge", "centre-line", "cutting-plane", "section-hatch", "datum-feature", "feature-control-frame", "surface-texture"]);
  assert.deepEqual(stampSize("section-hatch"), { width: 160, height: 100 });
  assert.deepEqual(defaultAnnotations("cutting-plane"), { main: "A" });
  assert.deepEqual(defaultAnnotations("datum-feature"), { datum: "A" });
  assert.deepEqual(defaultAnnotations("feature-control-frame"), { characteristic: "position", tolerance: "0,02", diameter: "oui", modifier: "", datum1: "A", datum2: "B", datum3: "C" });
  assert.deepEqual(defaultAnnotations("surface-texture"), { requirement: "material removal", parameter: "Ra", value: "3.2", process: "", lay: "", allAround: "no" });

  const hidden: CanvasObject = { id: "hidden", kind: "hidden-edge", x: 0, y: 0, x2: 160, y2: 0 };
  const centre: CanvasObject = { id: "centre", kind: "centre-line", x: 0, y: 25, x2: 160, y2: 25 };
  const cutting: CanvasObject = { id: "cutting", kind: "cutting-plane", x: 0, y: 55, x2: 160, y2: 55, annotations: { main: "B" } };
  const hatch: CanvasObject = { id: "hatch", kind: "section-hatch", x: 0, y: 90, width: 160, height: 100 };
  const datum: CanvasObject = { id: "datum", kind: "datum-feature", x: 20, y: 220, x2: 110, y2: 250, annotations: { datum: "A" } };
  const frame: CanvasObject = { id: "frame", kind: "feature-control-frame", x: 20, y: 290, x2: 110, y2: 320, annotations: { characteristic: "position", tolerance: "0,02", diameter: "oui", modifier: "", datum1: "A", datum2: "B", datum3: "C" } };
  const surface: CanvasObject = { id: "surface", kind: "surface-texture", x: 20, y: 380, x2: 110, y2: 400, annotations: { requirement: "enlèvement", parameter: "Ra", value: "3,2", process: "rectifié", lay: "", allAround: "non" } };

  const hiddenLine = scientificSceneFor(hidden)?.[0]; const centreLine = scientificSceneFor(centre)?.[0]; const cuttingScene = scientificSceneFor(cutting) ?? []; const hatchScene = scientificSceneFor(hatch) ?? []; const datumScene = scientificSceneFor(datum) ?? []; const frameScene = scientificSceneFor(frame) ?? [];
  assert.deepEqual(hiddenLine?.type === "line" ? hiddenLine.dashArray : undefined, [...GPS_DASH_ARRAYS.hidden]);
  assert.equal(hiddenLine?.type === "line" ? hiddenLine.strokeWidth : undefined, GPS_NARROW_STROKE);
  assert.deepEqual(centreLine?.type === "line" ? centreLine.dashArray : undefined, [...GPS_DASH_ARRAYS.centre]);
  assert.equal(centreLine?.type === "line" ? centreLine.strokeWidth : undefined, GPS_NARROW_STROKE);
  assert.equal(cuttingScene[0]?.type === "line" ? cuttingScene[0].strokeWidth : undefined, GPS_WIDE_STROKE);
  assert.equal(cuttingScene.filter((primitive) => primitive.type === "line" && primitive.arrowEnd).length, 2);
  assert.deepEqual(cuttingScene.filter((primitive) => primitive.type === "text").map((primitive) => primitive.value), ["B", "B"]);
  assert.equal(hatchScene.length, 21);
  assert.ok(hatchScene.every((primitive) => primitive.type === "line" && primitive.strokeWidth === GPS_NARROW_STROKE));
  assert.equal(datumScene.find((primitive) => primitive.type === "polyline")?.type === "polyline" ? datumScene.find((primitive) => primitive.type === "polyline")?.fill : undefined, "ink");
  assert.ok(datumScene.some((primitive) => primitive.type === "rect" && primitive.width === 25 && primitive.height === 25));
  assert.ok(frameScene.filter((primitive) => primitive.type === "circle").length >= 2, "position and diameter symbols are drawn as geometry");

  const objects = [hidden, centre, cutting, hatch, datum, frame, surface]; const output = documentFor(objects);
  assert.match(output, /dash pattern=on 9\.07pt off 3\.00pt,line width=0\.71pt/);
  assert.match(output, /dash pattern=on 17\.01pt off 1\.98pt on 1\.02pt off 1\.98pt,line width=1\.42pt/);
  assert.match(output, /\\sffamily Ra 3,2/);
  assert.doesNotMatch(output, /[⌀⌖]/u, "fragile GPS font glyphs must not leak into pdfLaTeX");
  assert.deepEqual(roundTripReport(output, objects), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });

  const outline: CanvasObject = { id: "outline", kind: "line", x: 10, y: 10, x2: 210, y2: 10 };
  assert.deepEqual(pointOnSegmentAt(outline, .25), { x: 60, y: 10 });
  assert.equal(pointOnWireAt(outline, .25), undefined, "ordinary outlines must not become electrical wires");
  assert.deepEqual(portsFor(outline), [{ name: "start", x: 10, y: 10 }, { name: "end", x: 210, y: 10 }]);
  assert.deepEqual(junctionPointsFor([outline, datum]), []);
});

test("uses canvas baselines for prose and graph labels", () => {
  const prose = objectToLatex({ id: "txt", kind: "text", x: 50, y: 70, text: "Légende" });
  const graph = objectToLatex({ id: "axes-labels", kind: "axes", x: 0, y: 0, width: 200, height: 120, graph: { expression: "x", xMin: -1, xMax: 1, yMin: -1, yMax: 1, xLabel: "t", yLabel: "u_C" } });
  assert.match(prose, /\\node\[anchor=base west,inner sep=0pt,outer sep=0pt,font=\\fontsize\{9\.64pt\}\{11\.57pt\}\\selectfont\] at \(1\.00,-1\.40\) \{Légende\}/);
  assert.match(graph, /\\node\[anchor=base east,inner sep=0pt,outer sep=0pt\].*\{\$t\$\}/);
  assert.match(graph, /\\node\[anchor=base west,inner sep=0pt,outer sep=0pt\].*\{\$u_\{C\}\$\}/);
});

test("shares exact spring and progressive-wave paths across renderers", () => {
  const spring: CanvasObject = { id: "spring-path", kind: "spring", x: 0, y: 0, x2: 140, y2: 0 };
  const wave: CanvasObject = { id: "wave-path", kind: "wave", x: 10, y: 20, x2: 130, y2: 100 };
  const springPoints = springPointsFor(spring); const wavePoints = wavePointsFor(wave);
  assert.deepEqual(springPoints[0], { x: 0, y: 0 });
  assert.deepEqual(springPoints.at(-1), { x: 140, y: 0 });
  assert.deepEqual(wavePoints[0], { x: 10, y: 20 });
  assert.deepEqual(wavePoints.at(-1), { x: 130, y: 100 });
  assert.ok(springPoints.some((point) => point.y > 0) && springPoints.some((point) => point.y < 0));
  assert.ok(wavePoints.some((point) => Math.abs(point.y - (20 + (point.x - 10) * 2 / 3)) > 3));
  const springTikz = objectToLatex(spring); const waveTikz = objectToLatex(wave);
  assert.equal((springTikz.match(/\(-?\d+\.\d+,-?\d+\.\d+\)/g) ?? []).length, springPoints.length);
  assert.equal((waveTikz.match(/\(-?\d+\.\d+,-?\d+\.\d+\)/g) ?? []).length, wavePoints.length);
  assert.doesNotMatch(`${springTikz}\n${waveTikz}`, /decorate|decoration=\{(?:coil|snake)/);
  assert.deepEqual(roundTripReport(documentFor([spring, wave]), [spring, wave]), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
});

test("keeps concours component labels upright at the connector-normal position", () => {
  assert.deepEqual(connectorLabelPointFor({ id: "r-h", kind: "resistor", x: 0, y: 0, x2: 100, y2: 0 }, -13), { x: 50, y: -13 });
  assert.deepEqual(connectorLabelPointFor({ id: "l-v", kind: "inductor", x: 50, y: 150, x2: 50, y2: 0 }, -19), { x: 31, y: 75 });
  const diagonal = connectorLabelPointFor({ id: "r-d", kind: "resistor", x: 0, y: 0, x2: 100, y2: 100 }, -10);
  assert.ok(Math.abs(diagonal.x - 57.0710678119) < 1e-9);
  assert.ok(Math.abs(diagonal.y - 42.9289321881) < 1e-9);
});

test("shares sub-millimetre freehand simplification without smoothing drift", () => {
  const freehand: CanvasObject = { id: "stroke", kind: "freehand", x: 0, y: 0, points: [{ x: 0, y: 0 }, { x: 10, y: .2 }, { x: 25, y: -.3 }, { x: 50, y: 20 }, { x: 75, y: .4 }, { x: 90, y: -.2 }, { x: 100, y: 0 }] };
  const simplified = simplifyFreehandPoints(freehand.points ?? []); const tikz = objectToLatex(freehand);
  assert.ok(simplified.length < (freehand.points?.length ?? 0));
  assert.deepEqual(simplified[0], { x: 0, y: 0 });
  assert.deepEqual(simplified.at(-1), { x: 100, y: 0 });
  assert.ok(simplified.some((point) => point.x === 50 && point.y === 20));
  assert.equal((tikz.match(/\(-?\d+\.\d+,-?\d+\.\d+\)/g) ?? []).length, simplified.length);
  assert.doesNotMatch(tikz, /smooth|tension|plot coordinates/);
  assert.deepEqual(roundTripReport(documentFor([freehand]), [freehand]), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
  const edited = documentFor([freehand]).replace("(1.00,-0.40)", "(1.00,-0.80)");
  assert.ok(objectsFromLatex(edited, [freehand]).objects[0].points?.some((point) => point.x === 50 && point.y === 40));
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
  const object: CanvasObject = { id: "box", kind: "rect", x: 0, y: 0, width: 100, height: 50, scale: 1.5, rotation: 90 };
  const output = objectToLatex(object);
  assert.match(output, /\\begin\{scope\}\[transform canvas=\{cm=\{/);
  assert.match(output, /\\draw \(0\.00,0\.00\) rectangle \(2\.00,-1\.00\);/);
  assert.match(output, /\\end\{scope\}$/);
  assert.deepEqual(roundTripReport(documentFor([object]), [object]), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
});

test("keeps independent selected-object width and height in the exported LaTeX", () => {
  const output = objectToLatex({ id: "box", kind: "rect", x: 0, y: 0, width: 100, height: 50, scaleX: 2, scaleY: 0.5 });
  assert.match(output, /transform canvas=\{cm=\{2,0,0,0\.5,/);
});

test("transforms scientific labels with their resized and rotated stamp", () => {
  const transformer: CanvasObject = { id: "scaled-transformer", kind: "transformer", x: 0, y: 0, width: 140, height: 160, scaleX: 1.25, scaleY: .75, rotation: 30, annotations: { primary: "N_1", secondary: "N_2" } };
  const output = objectToLatex(transformer);
  assert.match(output, /\\begin\{scope\}\[transform canvas=\{cm=\{1\.08253,-0\.625,0\.375,0\.64952,\(0\.48446,0\.31423\)\}\}\]/);
  assert.match(output, /\{\$N_\{1\}\$\}/);
  assert.match(output, /\{\$N_\{2\}\$\}/);
  assert.deepEqual(roundTripReport(documentFor([transformer]), [transformer]), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
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

test("provides French Thévenin and Norton equivalents with exact circuit semantics", () => {
  const thevenin = diagramTemplates.find((template) => template.id === "thevenin-equivalent");
  const norton = diagramTemplates.find((template) => template.id === "norton-equivalent");
  assert.ok(thevenin);
  assert.ok(norton);
  assert.ok(thevenin.objects.some((object) => object.kind === "voltage-source"));
  assert.ok(norton.objects.some((object) => object.kind === "current-source"));

  const theveninLatex = documentFor(thevenin.objects);
  const nortonLatex = documentFor(norton.objects);
  assert.match(theveninLatex, /\{\$E_\{Th\}\$\}/);
  assert.match(theveninLatex, /\{\$R_\{Th\}\$\}/);
  assert.match(nortonLatex, /\{\$I_\{N\}\$\}/);
  assert.match(nortonLatex, /\{\$R_\{N\}\$\}/);
  assert.deepEqual(junctionPointsFor(norton.objects), [{ x: 450, y: 180 }, { x: 450, y: 360 }]);
  assert.deepEqual(roundTripReport(theveninLatex, thevenin.objects), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
  assert.deepEqual(roundTripReport(nortonLatex, norton.objects), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
});

test("provides a classroom-ready ideal transformer model with remapped terminal bindings", () => {
  const template = diagramTemplates.find((candidate) => candidate.id === "ideal-transformer");
  assert.ok(template);
  const transformer = template.objects.find((object) => object.kind === "transformer");
  assert.ok(transformer);
  assert.equal(transformer.annotations?.primary, "N_1");
  assert.equal(transformer.annotations?.secondary, "N_2");
  assert.equal(template.objects.filter((object) => object.kind === "wire").length, 4);
  assert.deepEqual(junctionPointsFor(template.objects), []);
  const output = documentFor(template.objects);
  assert.match(output, /\{\$N_\{1\}\$\}/);
  assert.match(output, /\{\$N_\{2\}\$\}/);
  assert.match(output, /\{\$i_\{1\}\$\}/);
  assert.match(output, /\{\$i_\{2\}\$\}/);
  assert.deepEqual(roundTripReport(output, template.objects), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });

  const cloned = cloneTemplateObjects(template);
  const clonedTransformer = cloned.find((object) => object.kind === "transformer");
  assert.ok(clonedTransformer);
  assert.ok(cloned.filter((object) => object.kind === "wire").every((wire) => !wire.bindings?.startId || wire.bindings.startId === clonedTransformer.id) && cloned.filter((object) => object.kind === "wire").every((wire) => !wire.bindings?.endId || wire.bindings.endId === clonedTransformer.id));
});

test("provides a French concours slider-crank kinematic model with semantic solid bindings", () => {
  const template = diagramTemplates.find((candidate) => candidate.id === "slider-crank-kinematic");
  assert.ok(template);
  assert.equal(template.category, "Mechanics");
  assert.equal(template.objects.filter((object) => object.kind === "joint-pivot").length, 2);
  assert.equal(template.objects.filter((object) => object.kind === "joint-slider").length, 1);
  const crank = template.objects.find((object) => object.id === "sc-crank");
  const rod = template.objects.find((object) => object.id === "sc-rod");
  assert.deepEqual(crank?.bindings, { startId: "sc-pivot-a", startPort: "solid-1", endId: "sc-pivot-b", endPort: "solid-2" });
  assert.deepEqual(rod?.bindings, { startId: "sc-pivot-b", startPort: "solid-1", endId: "sc-slider", endPort: "solid-1" });
  const output = documentFor(template.objects);
  assert.match(output, /Planar slider-crank kinematic diagram/);
  assert.match(output, /1: crank/);
  assert.match(output, /2: connecting rod/);
  assert.match(output, /3: slider/);
  assert.deepEqual(roundTripReport(output, template.objects), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
  const cloned = cloneTemplateObjects(template); const clonedIds = new Set(cloned.map((object) => object.id));
  assert.ok(cloned.every((object) => !object.bindings?.startId || clonedIds.has(object.bindings.startId)));
  assert.ok(cloned.every((object) => !object.bindings?.endId || clonedIds.has(object.bindings.endId)));
});

test("provides a complete French normalized-joint reference model", () => {
  const template = diagramTemplates.find((candidate) => candidate.id === "normalized-kinematic-joints");
  assert.ok(template);
  const jointKinds = template.objects.filter((object) => object.kind.startsWith("joint-")).map((object) => object.kind);
  assert.deepEqual(jointKinds, ["joint-pivot", "joint-slider", "joint-cylindrical", "joint-helical", "joint-ball", "joint-planar", "joint-line-contact", "joint-annular", "joint-point-contact"]);
  assert.match(template.sourceName, /Éduscol/);
  assert.ok(template.objects.some((object) => object.kind === "text" && object.text?.startsWith("Fixed joint:")));
  const output = documentFor(template.objects);
  for (const label of ["Pivot", "Prismatic", "Cylindrical", "Helical", "Spherical", "Planar", "Linear contact", "Annular contact", "Sphere–plane"]) assert.match(output, new RegExp(label));
  assert.deepEqual(roundTripReport(output, template.objects), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
});

test("provides a French CPGE mechanical-transmission reference model", () => {
  const template = diagramTemplates.find((candidate) => candidate.id === "mechanical-transmissions");
  assert.ok(template);
  assert.deepEqual(template.objects.filter((object) => ["gear-pair", "rack-pinion", "belt-drive", "screw-nut"].includes(object.kind)).map((object) => object.kind), ["gear-pair", "rack-pinion", "belt-drive", "screw-nut"]);
  assert.match(template.sourceName, /STEM mechanical/);
  const output = documentFor(template.objects);
  assert.match(output, /External gear pair/);
  assert.match(output, /Rack and pinion/);
  assert.match(output, /Pulley and belt drive/);
  assert.match(output, /Lead screw and nut/);
  assert.deepEqual(roundTripReport(output, template.objects), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
});

test("provides an advanced French CPGE transmission reference model", () => {
  const template = diagramTemplates.find((candidate) => candidate.id === "advanced-mechanical-transmissions");
  assert.ok(template);
  assert.deepEqual(template.objects.filter((object) => ["worm-gear", "planetary-gear", "cam-follower"].includes(object.kind)).map((object) => object.kind), ["worm-gear", "planetary-gear", "cam-follower"]);
  assert.match(template.sourceUrl, /eduscol\.education\.fr/);
  const output = documentFor(template.objects);
  assert.match(output, /Worm gear/);
  assert.match(output, /Planetary gear train/);
  assert.match(output, /Cam and follower/);
  assert.match(output, /rotation → translation/);
  assert.deepEqual(roundTripReport(output, template.objects), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
});

test("provides a French concours electromechanical power-chain model", () => {
  const template = diagramTemplates.find((candidate) => candidate.id === "electromechanical-power-chain");
  assert.ok(template);
  assert.deepEqual(template.objects.filter((object) => ["electric-motor", "gear-reducer", "clutch", "brake"].includes(object.kind)).map((object) => object.kind), ["electric-motor", "gear-reducer", "clutch", "brake"]);
  assert.match(template.sourceUrl, /eduscol\.education\.fr/);
  const brake = template.objects.find((object) => object.id === "pc-brake");
  const brakeBranch = template.objects.find((object) => object.id === "pc-brake-branch");
  assert.equal(brake?.rotation, 90);
  assert.deepEqual(brakeBranch?.bindings, { endId: "pc-brake", endPort: "shaft" });
  const output = documentFor(template.objects);
  for (const label of ["Convert", "Adapt", "Distribute / couple", "Act"]) assert.match(output, new RegExp(label));
  assert.match(output, /The brake is attached to the frame/);
  assert.deepEqual(roundTripReport(output, template.objects), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
});

test("provides a connected French ISO 1219 hydraulic reference circuit", () => {
  const template = diagramTemplates.find((candidate) => candidate.id === "hydraulic-double-acting-cylinder");
  assert.ok(template);
  assert.deepEqual(template.objects.filter((object) => ["hydraulic-pump", "hydraulic-reservoir", "hydraulic-cylinder", "hydraulic-valve-4-3", "pressure-relief-valve"].includes(object.kind)).map((object) => object.kind), ["hydraulic-cylinder", "hydraulic-valve-4-3", "hydraulic-pump", "hydraulic-reservoir", "pressure-relief-valve"]);
  assert.match(template.sourceUrl, /eduscol\.education\.fr/);
  const pressure = template.objects.find((object) => object.id === "hc-pressure");
  const workLineA = template.objects.find((object) => object.id === "hc-a-cylinder");
  const relief = template.objects.find((object) => object.id === "hc-relief");
  assert.deepEqual(pressure?.bindings, { startId: "hc-valve", startPort: "P", endId: "hc-pump", endPort: "P" });
  assert.deepEqual(workLineA?.bindings, { endId: "hc-cylinder", endPort: "A" });
  assert.equal(relief?.rotation, 90);
  const output = documentFor(template.objects);
  assert.match(output, /Hydraulic circuit/);
  assert.match(output, /A\/B: working lines/);
  assert.deepEqual(roundTripReport(output, template.objects), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
});

test("provides a meter-out French electropneumatic 5/2 reference circuit", () => {
  const template = diagramTemplates.find((candidate) => candidate.id === "electropneumatic-double-acting-cylinder");
  assert.ok(template);
  assert.deepEqual(template.objects.filter((object) => ["pneumatic-source", "pneumatic-service-unit", "pneumatic-cylinder", "pneumatic-valve-5-2", "one-way-flow-control", "pneumatic-exhaust"].includes(object.kind)).map((object) => object.kind), ["pneumatic-cylinder", "one-way-flow-control", "one-way-flow-control", "pneumatic-valve-5-2", "pneumatic-source", "pneumatic-service-unit", "pneumatic-exhaust", "pneumatic-exhaust"]);
  assert.match(template.sourceUrl, /eduscol\.education\.fr/);
  const capControl = template.objects.find((object) => object.id === "pn-cap-control");
  const rodControl = template.objects.find((object) => object.id === "pn-rod-control");
  const signal = template.objects.find((object) => object.id === "pn-control-signal");
  const supply = template.objects.find((object) => object.id === "pn-supply-up");
  assert.equal(capControl?.rotation, 90);
  assert.equal(rodControl?.rotation, 90);
  assert.equal(rodControl?.scaleX, -1);
  assert.deepEqual(portsFor(capControl!), [{ name: "1", x: 654, y: 155 }, { name: "2", x: 654, y: 295 }]);
  assert.deepEqual(portsFor(rodControl!), [{ name: "1", x: 726, y: 295 }, { name: "2", x: 726, y: 155 }]);
  assert.deepEqual(signal?.bindings, { endId: "pn-valve", endPort: "14" });
  assert.deepEqual(supply?.bindings, { endId: "pn-valve", endPort: "1" });
  assert.deepEqual(template.objects.find((object) => object.id === "pn-s-down")?.bindings, { startId: "pn-valve", startPort: "5" });
  assert.deepEqual(template.objects.find((object) => object.id === "pn-r-down")?.bindings, { startId: "pn-valve", startPort: "3" });
  const output = documentFor(template.objects);
  assert.match(output, /Electropneumatic circuit/);
  assert.match(output, /Meter-out control/);
  assert.deepEqual(roundTripReport(output, template.objects), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
});

test("provides a French concours technical-drawing and GPS reference sheet", () => {
  const template = diagramTemplates.find((candidate) => candidate.id === "gps-technical-drawing-reference");
  assert.ok(template);
  assert.equal(template.category, "Technical drawing");
  assert.match(template.sourceUrl, /eduscol\.education\.fr/);
  assert.deepEqual(template.objects.filter((object) => ["hidden-edge", "centre-line", "cutting-plane", "section-hatch", "datum-feature", "feature-control-frame", "surface-texture"].includes(object.kind)).map((object) => object.kind), ["cutting-plane", "hidden-edge", "hidden-edge", "centre-line", "section-hatch", "centre-line", "datum-feature", "feature-control-frame", "feature-control-frame", "feature-control-frame", "surface-texture"]);
  const datum = template.objects.find((object) => object.id === "gps-datum-a"); const flatness = template.objects.find((object) => object.id === "gps-flatness"); const position = template.objects.find((object) => object.id === "gps-position");
  assert.deepEqual(datum?.bindings, { startId: "gps-part-bottom", startPort: "segment", startRatio: .867 });
  assert.equal(flatness?.annotations?.characteristic, "planéité");
  assert.equal(position?.annotations?.diameter, "oui");
  assert.deepEqual([position?.annotations?.datum1, position?.annotations?.datum2, position?.annotations?.datum3], ["A", "B", "C"]);
  const output = documentFor(template.objects);
  assert.match(output, /SECTION A–A/);
  assert.match(output, /ISO 128.*ISO 1101.*ISO 5459.*ISO 21920/s);
  assert.deepEqual(roundTripReport(output, template.objects), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
});

test("provides a French concours negative-feedback block-diagram model", () => {
  const template = diagramTemplates.find((candidate) => candidate.id === "closed-loop-control");
  assert.ok(template);
  assert.equal(template.category, "Control systems");
  assert.equal(template.objects.filter((object) => object.kind === "transfer-block").length, 3);
  assert.equal(template.objects.filter((object) => object.kind === "summing-junction").length, 1);
  assert.equal(template.objects.filter((object) => object.kind === "takeoff-point").length, 1);
  assert.equal(template.objects.filter((object) => object.kind === "signal-arrow").length, 7);
  assert.deepEqual(junctionPointsFor(template.objects), []);
  const output = documentFor(template.objects);
  for (const label of ["E\\(p\\)", "ε\\(p\\)", "C\\(p\\)", "U\\(p\\)", "H\\(p\\)", "S\\(p\\)", "H_\\{m\\}\\(p\\)"]) assert.match(output, new RegExp(`\\{\\$${label}\\$\\}`));
  assert.match(output, /\{\$-\$\}/);
  assert.deepEqual(roundTripReport(output, template.objects), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });

  const cloned = cloneTemplateObjects(template); const clonedIds = new Set(cloned.map((object) => object.id));
  assert.ok(cloned.every((object) => !object.bindings?.startId || clonedIds.has(object.bindings.startId)));
  assert.ok(cloned.every((object) => !object.bindings?.endId || clonedIds.has(object.bindings.endId)));
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
  assert.match(output, /\\draw\[dash pattern=on 4\.54pt off 2\.27pt\] plot coordinates/);
  assert.match(output, /\\draw\[dash pattern=on 1\.13pt off 1\.70pt\] plot coordinates/);
  assert.equal((output.match(/\\draw\[gray!14\]/g) ?? []).length, 18);
  assert.doesNotMatch(output, /color=blue|color=red|green!|orange|violet/);
  assert.match(output, /\{\$t\$\}/);
  assert.match(output, /\{\$u\$\}/);
  assert.equal(CONCOURS_GRAPH_GRID_PERCENT, 14);
  assert.equal(CONCOURS_LIGHT_FILL, "#e0e0e0");
});

test("accepts the French concours π glyph in graph expressions", () => {
  const graph: CanvasObject = { id: "pi-graph", kind: "axes", x: 0, y: 0, width: 240, height: 160, graph: { expression: "sin(π*x)", xMin: -2, xMax: 2, yMin: -1.2, yMax: 1.2 } };
  assert.match(graphPathFor(graph) ?? "", /^M/);
  assert.ok(graphPointSetsFor(graph)[0].flat().length > 150);
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
  assert.match(force, /shift=\{\(1\.00,0\.00\)\}, rotate=0/);
  assert.match(force, /\\node\[anchor=base,inner sep=0pt,outer sep=0pt\] at \(0,0\.18\) \{\$\\vec\{F\}\$\}/);
  assert.match(indexedForce, /\\node\[anchor=base,inner sep=0pt,outer sep=0pt\] at \(0,0\.18\) \{\$\\vec\{F\}_\{1\}\$\}/);
  assert.equal((equilibrium.match(/\\draw\[-\{Latex\}\]/g) ?? []).length, 2);
  assert.match(dipole, /\\node\[anchor=base,inner sep=0pt,outer sep=0pt\] at \(0,0\.18\) \{\$\\vec\{μ\}\$\}/);
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
  assert.match(output, /\\node\[anchor=base,fill=white,inner sep=1pt,outer sep=0pt\] at \(0,0\.20\) \{\$d_\{1\}\$\};/);
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

test("removes hidden layers and their derived junctions from every export", () => {
  const hiddenMain: CanvasObject = { id: "hidden-main", kind: "wire", x: 0, y: 0, x2: 200, y2: 0, hidden: true };
  const branch: CanvasObject = { id: "visible-branch", kind: "wire", x: 100, y: 0, x2: 100, y2: 100, bindings: { startId: "hidden-main", startPort: "segment", startRatio: .5 } };
  assert.deepEqual(junctionPointsFor([hiddenMain, branch]), []);
  const source = documentFor([hiddenMain, branch]);
  assert.doesNotMatch(source, /sketch2latex id=hidden-main/);
  assert.match(source, /sketch2latex id=visible-branch/);
  assert.doesNotMatch(source, /\\fill \(2\.00,0\.00\) circle/);
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
  assert.match(objectToLatex(frame), /\\node\[anchor=base,inner sep=0pt,outer sep=0pt,font=\\fontsize\{7\.37pt\}\{8\.84pt\}\\selectfont\] at \(2\.60,-3\.81\) \{\$O\$\};/);
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
  assert.match(engineOutput, /\\node\[anchor=base,inner sep=0pt,outer sep=0pt,font=\\fontsize\{6\.24pt\}\{7\.48pt\}\\selectfont\].*\{\$Q_h\$\}/);
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
  assert.match(inverting, /\{\\text\{Inverting\}\}/);
  assert.doesNotMatch(inverting, /zigzag|to\[R\]/);
  assert.match(comparator, /\{\$V_s\$\}/);
  assert.match(comparator, /\\node\[anchor=base east,inner sep=0pt,outer sep=0pt,font=\\fontsize\{6\.24pt\}\{7\.48pt\}\\selectfont\].*\{\$V_s\$\}/);
  assert.match(comparator, /\{\\text\{Comparator\}\}/);
});

test("preserves concours magnetic glyph scale in TikZ", () => {
  const field = objectToLatex({ id: "field", kind: "magnetic-field-in", x: 0, y: 0, width: 120, height: 90 });
  assert.equal((field.match(/font=\\fontsize\{11\.34pt\}\{13\.61pt\}\\selectfont/g) ?? []).length, 6);
  assert.equal((field.match(/\{\$\\otimes\$\}/g) ?? []).length, 6);
  assert.match(field, /anchor=base,inner sep=0pt,outer sep=0pt,font=\\fontsize\{7\.37pt\}\{8\.84pt\}\\selectfont.*\{\$\\vec\{B\}\$\}/);
});

test("exposes the current CPGE SysML and sequential-system toolset with semantic defaults", () => {
  const group = toolboxGroups.find((candidate) => candidate.title === "Sequential systems & SysML");
  const kinds: ObjectKind[] = ["sysml-frame", "functional-block", "typed-flow", "state-node", "state-pseudostate", "state-transition", "choice-junction", "fork-join", "chronogram-lane"];
  assert.ok(group);
  assert.deepEqual(group.kinds, kinds);
  assert.ok(connectorKinds.includes("typed-flow") && connectorKinds.includes("state-transition"));
  assert.ok(kinds.filter((kind) => !connectorKinds.includes(kind)).every((kind) => stampKinds.includes(kind)));
  assert.deepEqual(defaultAnnotations("sysml-frame"), { diagram: "stm", name: "System" });
  assert.deepEqual(defaultAnnotations("state-transition"), { event: "event", guard: "", action: "" });
  assert.deepEqual(defaultAnnotations("chronogram-lane"), { signal: "signal", waveform: "0,1,0,1", chronogram: "binary", times: "t_0,t_1,t_2,t_3,t_4" });
  assert.deepEqual(stampSize("state-node"), { width: 150, height: 90 });
  assert.deepEqual(stampSize("chronogram-lane"), { width: 320, height: 70 });
});

test("shares exact concours SysML state and functional-chain geometry across SVG and TikZ", () => {
  const frame = scientificSceneFor({ id: "frame", kind: "sysml-frame", x: 0, y: 0, width: 420, height: 260, annotations: { diagram: "stm", name: "Portail" } }) ?? [];
  const block = scientificSceneFor({ id: "block", kind: "functional-block", x: 0, y: 0, width: 150, height: 80, annotations: { function: "Traiter", constituent: "Automate" } }) ?? [];
  const flow = scientificSceneFor({ id: "flow", kind: "typed-flow", x: 0, y: 0, x2: 100, y2: 0, annotations: { flow: "information", main: "position" } }) ?? [];
  const state = scientificSceneFor({ id: "state", kind: "state-node", x: 0, y: 0, width: 150, height: 90, annotations: { name: "Ouverture", entry: "initialiser", do: "ouvrir", exit: "arrêter" } }) ?? [];
  const transition = scientificSceneFor({ id: "transition", kind: "state-transition", x: 0, y: 120, x2: 180, y2: 120, annotations: { event: "demande", guard: "sécurité", action: "ouvrir" } }) ?? [];
  assert.equal(frame.length, 3);
  assert.deepEqual(frame[2], { type: "text", x: 9, y: 19.599999999999998, value: "[stm] Portail", anchor: "start", fontSize: 12, technical: true });
  assert.equal(block.length, 4);
  assert.deepEqual(flow[0], { type: "line", x1: 0, y1: 0, x2: 100, y2: 0, arrowEnd: true });
  assert.equal(flow[1].type, "text");
  if (flow[1].type === "text") assert.equal(flow[1].value, "information : position");
  assert.equal(state[0].type, "rect");
  if (state[0].type === "rect") assert.equal(state[0].rx, 12);
  assert.deepEqual(state.filter((primitive) => primitive.type === "text").map((primitive) => primitive.type === "text" ? primitive.value : ""), ["Ouverture", "entry / initialiser", "do / ouvrir", "exit / arrêter"]);
  assert.equal(transition[0].type, "line");
  if (transition[0].type === "line") assert.equal(transition[0].arrowEnd, true);
  assert.equal(transition[1].type, "text");
  if (transition[1].type === "text") assert.equal(transition[1].value, "demande [sécurité] / ouvrir");
  const output = scientificSceneToTikz([...frame, ...block, ...flow, ...state, ...transition]);
  assert.match(output, /\{\\sffamily \[stm\] Portail\}/);
  assert.match(output, /rounded corners=0\.24cm/);
  assert.match(output, /\\text\{demande \[sécurité\] \/ ouvrir\}/);
});

test("adds precise pseudostates, junctions, parallel bars, chronograms and named state ports", () => {
  const initial = scientificSceneFor({ id: "initial", kind: "state-pseudostate", x: 0, y: 0, width: 32, height: 32, annotations: { pseudostate: "initial" } }) ?? [];
  const final = scientificSceneFor({ id: "final", kind: "state-pseudostate", x: 0, y: 0, width: 32, height: 32, annotations: { pseudostate: "final" } }) ?? [];
  const choice = scientificSceneFor({ id: "choice", kind: "choice-junction", x: 0, y: 0, width: 38, height: 38 }) ?? [];
  const horizontal = scientificSceneFor({ id: "fork-h", kind: "fork-join", x: 0, y: 0, width: 150, height: 28, annotations: { orientation: "horizontal", forkRole: "fourche" } }) ?? [];
  const vertical = scientificSceneFor({ id: "fork-v", kind: "fork-join", x: 0, y: 0, width: 28, height: 150, annotations: { orientation: "vertical", forkRole: "jonction" } }) ?? [];
  const binary = scientificSceneFor({ id: "binary", kind: "chronogram-lane", x: 0, y: 0, width: 320, height: 70, annotations: { signal: "capteur", waveform: "0,1,1,0", chronogram: "binaire", times: "" } }) ?? [];
  const analogue = scientificSceneFor({ id: "analogue", kind: "chronogram-lane", x: 0, y: 0, width: 320, height: 70, annotations: { signal: "vitesse", waveform: "0;2;1;3", chronogram: "analogique", times: "t₀;t₁;t₂;t₃" } }) ?? [];
  assert.equal(initial.length, 1);
  assert.equal(initial[0].type === "circle" && initial[0].fill, "ink");
  assert.equal(final.length, 2);
  assert.deepEqual(final.map((primitive) => primitive.type === "circle" ? primitive.fill : undefined), ["paper", "ink"]);
  assert.equal(choice[0].type === "polyline" && choice[0].closed, true);
  assert.deepEqual(horizontal[0], { type: "rect", x: 0, y: 11, width: 150, height: 6, fill: "ink" });
  assert.deepEqual(vertical[0], { type: "rect", x: 11, y: 0, width: 6, height: 150, fill: "ink" });
  assert.equal(binary.filter((primitive) => primitive.type === "line").length, 7);
  assert.equal(analogue.filter((primitive) => primitive.type === "polyline").length, 1);
  assert.equal(analogue.filter((primitive) => primitive.type === "text").length, 6);
  const state: CanvasObject = { id: "ports", kind: "state-node", x: 100, y: 80, width: 150, height: 90 };
  assert.deepEqual(portsFor(state), [
    { name: "top", x: 175, y: 80 }, { name: "right", x: 250, y: 125 }, { name: "bottom", x: 175, y: 170 }, { name: "left", x: 100, y: 125 },
  ]);
  assert.deepEqual(portsFor({ id: "function", kind: "functional-block", x: 20, y: 30, width: 150, height: 80 }), [{ name: "input", x: 20, y: 70 }, { name: "output", x: 170, y: 70 }]);
  assert.deepEqual(junctionPointsFor([state, { id: "tr", kind: "state-transition", x: 250, y: 125, x2: 350, y2: 125, bindings: { startId: "ports", startPort: "right" } }]), []);
});

test("provides a lossless concours motorized-gate functional-chain, stm and chronogram model", () => {
  const template = diagramTemplates.find((candidate) => candidate.id === "motorized-gate-systems");
  assert.ok(template);
  assert.equal(template.category, "Systems & SysML");
  assert.match(template.sourceUrl, /eduscol\.education\.fr/);
  assert.equal(template.objects.filter((object) => object.kind === "sysml-frame").length, 2);
  assert.equal(template.objects.filter((object) => object.kind === "functional-block").length, 5);
  assert.equal(template.objects.filter((object) => object.kind === "typed-flow").length, 4);
  assert.equal(template.objects.filter((object) => object.kind === "state-node").length, 4);
  assert.equal(template.objects.filter((object) => object.kind === "state-transition").length, 7);
  assert.equal(template.objects.filter((object) => object.kind === "chronogram-lane").length, 4);
  assert.deepEqual(new Set(template.objects.filter((object) => object.kind === "typed-flow").map((object) => object.annotations?.flow)), new Set(["information", "énergie"]));
  const ids = new Set(template.objects.map((object) => object.id));
  assert.ok(template.objects.every((object) => !object.bindings?.startId || ids.has(object.bindings.startId)));
  assert.ok(template.objects.every((object) => !object.bindings?.endId || ids.has(object.bindings.endId)));
  const output = documentFor(template.objects);
  assert.match(output, /\[ibd\] Portail motorisé/);
  assert.match(output, /\[stm\] Portail motorisé/);
  assert.match(output, /information : position/);
  assert.match(output, /demande \[sécurité\]/);
  assert.deepEqual(roundTripReport(output, template.objects), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
  const cloned = cloneTemplateObjects(template); const clonedIds = new Set(cloned.map((object) => object.id));
  assert.ok(cloned.every((object) => !object.bindings?.startId || clonedIds.has(object.bindings.startId)));
  assert.ok(cloned.every((object) => !object.bindings?.endId || clonedIds.has(object.bindings.endId)));
});

test("exposes the French SysML requirements, BDD and IBD tool family with exact semantic defaults", () => {
  const group = toolboxGroups.find((candidate) => candidate.title === "SysML requirements & architecture");
  const kinds: ObjectKind[] = ["sysml-requirement", "sysml-requirement-link", "sysml-block", "sysml-structural-link", "sysml-part", "sysml-port", "sysml-connector", "sysml-item-flow"];
  const connectors: ObjectKind[] = ["sysml-requirement-link", "sysml-structural-link", "sysml-connector", "sysml-item-flow"];
  const stamps: ObjectKind[] = ["sysml-requirement", "sysml-block", "sysml-part", "sysml-port"];
  assert.ok(group);
  assert.deepEqual(group.kinds, kinds);
  assert.ok(connectors.every((kind) => connectorKinds.includes(kind)));
  assert.ok(stamps.every((kind) => stampKinds.includes(kind)));
  assert.deepEqual(defaultAnnotations("sysml-requirement"), { name: "Requirement", reqId: "REQ-1", statement: "The system must satisfy this requirement." });
  assert.deepEqual(defaultAnnotations("sysml-requirement-link"), { requirementRelation: "satisfy" });
  assert.deepEqual(defaultAnnotations("sysml-block"), { name: "Block", values: "", parts: "", references: "", operations: "" });
  assert.deepEqual(defaultAnnotations("sysml-structural-link"), { structuralRelation: "association", symbolEnd: "start", startRole: "", startMultiplicity: "1", endRole: "", endMultiplicity: "1" });
  assert.deepEqual(defaultAnnotations("sysml-part"), { name: "part", blockType: "Block" });
  assert.deepEqual(defaultAnnotations("sysml-port"), { name: "p", interfaceType: "Interface", portDirection: "inout" });
  assert.deepEqual(defaultAnnotations("sysml-connector"), { main: "" });
  assert.deepEqual(defaultAnnotations("sysml-item-flow"), { name: "flow", itemType: "Information", flowDirection: "start to end" });
  assert.deepEqual(stampSize("sysml-requirement"), { width: 220, height: 125 });
  assert.deepEqual(stampSize("sysml-block"), { width: 220, height: 160 });
  assert.deepEqual(stampSize("sysml-part"), { width: 190, height: 75 });
  assert.deepEqual(stampSize("sysml-port"), { width: 18, height: 18 });
});

test("shares exact requirement, block and dependency geometry between the canvas scene and TikZ", () => {
  const requirement = scientificSceneFor({ id: "req", kind: "sysml-requirement", x: 10, y: 20, width: 220, height: 125, annotations: { name: "Vitesse sûre", reqId: "REQ-SEC-01", statement: "La vitesse doit rester inférieure à 0,3 m/s." } }) ?? [];
  const block = scientificSceneFor({ id: "block", kind: "sysml-block", x: 300, y: 20, width: 220, height: 160, annotations: { name: "Motorisation", values: "vitesse : Real", parts: "moteur : Moteur", references: "commande : Commande", operations: "arrêter()" } }) ?? [];
  const satisfy = scientificSceneFor({ id: "satisfy", kind: "sysml-requirement-link", x: 230, y: 82.5, x2: 300, y2: 100, annotations: { requirementRelation: "satisfy" } }) ?? [];
  assert.deepEqual(requirement[0], { type: "rect", x: 10, y: 20, width: 220, height: 125, fill: "paper" });
  assert.deepEqual(block[0], { type: "rect", x: 300, y: 20, width: 220, height: 160, fill: "paper" });
  const requirementText = requirement.filter((primitive) => primitive.type === "text").map((primitive) => primitive.type === "text" ? primitive.value : "");
  const blockText = block.filter((primitive) => primitive.type === "text").map((primitive) => primitive.type === "text" ? primitive.value : "");
  for (const value of ["«requirement»", "Vitesse sûre", "id = \"REQ-SEC-01\""]) assert.ok(requirementText.includes(value), value);
  assert.equal(requirementText.slice(3).join(" "), "text = \"La vitesse doit rester inférieure à 0,3 m/s.\"");
  for (const value of ["«block»", "Motorisation", "values", "vitesse : Real", "parts", "moteur : Moteur", "references", "commande : Commande", "operations", "arrêter()"] ) assert.ok(blockText.includes(value), value);
  assert.deepEqual(satisfy[0], { type: "line", x1: 230, y1: 82.5, x2: 300, y2: 100, dashed: true });
  assert.ok(satisfy.some((primitive) => primitive.type === "polyline" && primitive.points.length === 3 && !primitive.closed));
  assert.ok(satisfy.some((primitive) => primitive.type === "text" && primitive.value === "«satisfy»"));
  const output = scientificSceneToTikz([...requirement, ...block, ...satisfy]);
  assert.match(output, /\\draw\[fill=white\] \(0\.20,-0\.40\) rectangle \(4\.60,-2\.90\);/);
  assert.match(output, /\\draw\[fill=white\] \(6\.00,-0\.40\) rectangle \(10\.40,-3\.60\);/);
  assert.match(output, /\\draw\[dashed\] \(4\.60,-1\.65\) -- \(6\.00,-2\.00\);/);
  assert.doesNotMatch(output, /-\{Latex\}/);
  assert.match(output, /\{\\sffamily «requirement»\}/);
  assert.match(output, /\{\\sffamily «satisfy»\}/);
});

test("draws SysML aggregation, composition, generalization and item-flow symbols without electrical semantics", () => {
  const structural = (relation: string) => scientificSceneFor({ id: relation, kind: "sysml-structural-link", x: 20, y: 40, x2: 180, y2: 40, annotations: { structuralRelation: relation, symbolEnd: "début", startRole: "ensemble", startMultiplicity: "1", endRole: "élément", endMultiplicity: "0..*" } }) ?? [];
  const association = structural("association");
  const aggregation = structural("aggregation");
  const composition = structural("composition");
  const generalization = structural("generalization");
  const aggregationSymbol = aggregation.find((primitive) => primitive.type === "polyline" && primitive.closed);
  const compositionSymbol = composition.find((primitive) => primitive.type === "polyline" && primitive.closed);
  const generalizationSymbol = generalization.find((primitive) => primitive.type === "polyline" && primitive.closed);
  assert.equal(association.filter((primitive) => primitive.type === "polyline").length, 0);
  assert.ok(aggregationSymbol?.type === "polyline" && aggregationSymbol.points.length === 4 && aggregationSymbol.fill === "paper");
  assert.ok(compositionSymbol?.type === "polyline" && compositionSymbol.points.length === 4 && compositionSymbol.fill === "ink");
  assert.ok(generalizationSymbol?.type === "polyline" && generalizationSymbol.points.length === 3 && generalizationSymbol.fill === "paper");
  for (const scene of [association, aggregation, composition, generalization]) {
    assert.ok(scene.some((primitive) => primitive.type === "line"));
    assert.deepEqual(scene.filter((primitive) => primitive.type === "text").map((primitive) => primitive.type === "text" ? primitive.value : ""), ["ensemble", "1", "élément", "0..*"]);
  }
  const itemFlow = scientificSceneFor({ id: "flow", kind: "sysml-item-flow", x: 20, y: 100, x2: 180, y2: 100, annotations: { name: "consigne", itemType: "Information", flowDirection: "début vers fin" } }) ?? [];
  const itemArrow = itemFlow.find((primitive) => primitive.type === "polyline" && primitive.closed);
  assert.ok(itemArrow?.type === "polyline" && itemArrow.points.length === 3 && itemArrow.fill === "ink");
  assert.ok(itemFlow.some((primitive) => primitive.type === "text" && primitive.value === "consigne : Information"));
  const structuralTikz = scientificSceneToTikz([...aggregation, ...composition, ...generalization, ...itemFlow]);
  assert.match(structuralTikz, /\\draw\[fill=white\].*-- cycle/);
  assert.match(structuralTikz, /\\draw\[fill=black\].*-- cycle/);
  assert.match(structuralTikz, /\{\\sffamily consigne : Information\}/);

  const requirement: CanvasObject = { id: "req-ports", kind: "sysml-requirement", x: 10, y: 20, width: 220, height: 125 };
  const block: CanvasObject = { id: "block-ports", kind: "sysml-block", x: 300, y: 20, width: 220, height: 160 };
  const part: CanvasObject = { id: "part-ports", kind: "sysml-part", x: 300, y: 220, width: 190, height: 75 };
  const port: CanvasObject = { id: "port", kind: "sysml-port", x: 490, y: 250, width: 18, height: 18 };
  assert.deepEqual(portsFor(requirement), [{ name: "top", x: 120, y: 20 }, { name: "right", x: 230, y: 82.5 }, { name: "bottom", x: 120, y: 145 }, { name: "left", x: 10, y: 82.5 }]);
  assert.deepEqual(portsFor(block), [{ name: "top", x: 410, y: 20 }, { name: "right", x: 520, y: 100 }, { name: "bottom", x: 410, y: 180 }, { name: "left", x: 300, y: 100 }]);
  assert.deepEqual(portsFor(part), [{ name: "top", x: 395, y: 220 }, { name: "right", x: 490, y: 257.5 }, { name: "bottom", x: 395, y: 295 }, { name: "left", x: 300, y: 257.5 }]);
  assert.deepEqual(portsFor(port), [{ name: "branch", x: 499, y: 259 }]);
  assert.deepEqual(portsFor({ id: "connector-ports", kind: "sysml-connector", x: 499, y: 259, x2: 600, y2: 259 }), [{ name: "start", x: 499, y: 259 }, { name: "end", x: 600, y: 259 }]);
  const converging: CanvasObject[] = [requirement,
    { id: "req-link", kind: "sysml-requirement-link", x: 230, y: 82.5, x2: 600, y2: 82.5, bindings: { startId: requirement.id, startPort: "right" } },
    { id: "structural-link", kind: "sysml-structural-link", x: 230, y: 82.5, x2: 600, y2: 150, bindings: { startId: requirement.id, startPort: "right" } },
    { id: "item-link", kind: "sysml-item-flow", x: 230, y: 82.5, x2: 600, y2: 220, bindings: { startId: requirement.id, startPort: "right" } },
  ];
  assert.deepEqual(junctionPointsFor(converging), []);
});

test("provides a bound concours SysML req-BDD-IBD reference whose clone remaps every endpoint", () => {
  const template = diagramTemplates.find((candidate) => candidate.id === "sysml-requirements-architecture");
  assert.ok(template);
  assert.equal(template.category, "Systems & SysML");
  assert.deepEqual(new Set(template.objects.filter((object) => object.kind === "sysml-frame").map((object) => object.annotations?.diagram)), new Set(["req", "bdd", "ibd"]));
  const requiredKinds: ObjectKind[] = ["sysml-requirement", "sysml-requirement-link", "sysml-block", "sysml-structural-link", "sysml-part", "sysml-port", "sysml-connector", "sysml-item-flow"];
  assert.ok(requiredKinds.every((kind) => template.objects.some((object) => object.kind === kind)), requiredKinds.filter((kind) => !template.objects.some((object) => object.kind === kind)).join(", "));
  const originalIds = new Set(template.objects.map((object) => object.id));
  assert.equal(originalIds.size, template.objects.length);
  assert.ok(template.objects.every((object) => !object.bindings?.startId || originalIds.has(object.bindings.startId)));
  assert.ok(template.objects.every((object) => !object.bindings?.endId || originalIds.has(object.bindings.endId)));
  assert.deepEqual(junctionPointsFor(template.objects), []);

  const cloned = cloneTemplateObjects(template);
  assert.equal(cloned.length, template.objects.length);
  const clonedIds = new Set(cloned.map((object) => object.id));
  assert.equal(clonedIds.size, cloned.length);
  assert.ok([...clonedIds].every((id) => !originalIds.has(id)));
  const remappedIds = new Map(template.objects.map((object, index) => [object.id, cloned[index].id]));
  template.objects.forEach((object, index) => {
    const copy = cloned[index];
    assert.equal(copy.bindings?.startId, object.bindings?.startId ? remappedIds.get(object.bindings.startId) : undefined, `${object.id} start`);
    assert.equal(copy.bindings?.endId, object.bindings?.endId ? remappedIds.get(object.bindings.endId) : undefined, `${object.id} end`);
    assert.equal(copy.bindings?.startPort, object.bindings?.startPort, `${object.id} start port`);
    assert.equal(copy.bindings?.endPort, object.bindings?.endPort, `${object.id} end port`);
  });
  const output = documentFor(template.objects);
  assert.match(output, /\[req\]/);
  assert.match(output, /\[bdd\]/);
  assert.match(output, /\[ibd\]/);
  assert.deepEqual(roundTripReport(output, template.objects), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });
});

test("exposes the exact French CPGE wave, interference and diffraction tool family", () => {
  const kinds: ObjectKind[] = ["wave-source", "wavefront", "aperture-array", "wave-path", "fringe-screen", "diffraction-cone", "standing-wave", "intensity-profile"];
  const group = toolboxGroups.find((candidate) => candidate.title === "Waves, interference & diffraction");
  assert.ok(group);
  assert.deepEqual(group.kinds, kinds);
  assert.deepEqual(kinds.filter((kind) => connectorKinds.includes(kind)), ["wave-path", "standing-wave"]);
  assert.deepEqual(kinds.filter((kind) => stampKinds.includes(kind)), ["wave-source", "wavefront", "aperture-array", "fringe-screen", "diffraction-cone", "intensity-profile"]);
  assert.deepEqual(defaultAnnotations("wave-source"), { name: "S", sourceType: "point", phase: "0" });
  assert.deepEqual(defaultAnnotations("wavefront"), { wavefrontType: "circular", direction: "right", main: "φ = constant" });
  assert.deepEqual(defaultAnnotations("aperture-array"), { apertureType: "Young double slit", count: "2", spacing: "a", opening: "b" });
  assert.deepEqual(defaultAnnotations("wave-path"), { main: "δ(M)", medium: "n = 1", pathStyle: "actual" });
  assert.deepEqual(defaultAnnotations("fringe-screen"), { screenName: "Screen", pointName: "M", fringeCount: "7", fringeSpacing: "i" });
  assert.deepEqual(defaultAnnotations("diffraction-cone"), { opening: "a", angle: "θ", wavelength: "λ", distance: "D" });
  assert.deepEqual(defaultAnnotations("standing-wave"), { main: "y(x,t)", mode: "3", showAntinodes: "yes" });
  assert.deepEqual(defaultAnnotations("intensity-profile"), { profileType: "interference", main: "I(x)", fringeCount: "7" });
  assert.deepEqual(stampSize("wave-source"), { width: 70, height: 70 });
  assert.deepEqual(stampSize("wavefront"), { width: 180, height: 130 });
  assert.deepEqual(stampSize("aperture-array"), { width: 70, height: 160 });
  assert.deepEqual(stampSize("fringe-screen"), { width: 150, height: 190 });
  assert.deepEqual(stampSize("diffraction-cone"), { width: 260, height: 150 });
  assert.deepEqual(stampSize("intensity-profile"), { width: 260, height: 150 });
});

test("shares all eight wave scenes and their French concours notation exactly with TikZ", () => {
  const source: CanvasObject = { id: "source-wave", kind: "wave-source", x: 10, y: 20, width: 70, height: 70, annotations: { name: "S", sourceType: "ponctuelle", phase: "0" } };
  const planeSource: CanvasObject = { ...source, id: "source-plane", annotations: { ...source.annotations, sourceType: "plane" } };
  const circularFront: CanvasObject = { id: "front-circular", kind: "wavefront", x: 100, y: 10, width: 180, height: 130, annotations: { wavefrontType: "circulaire", direction: "droite", main: "φ = constante" } };
  const planarFront: CanvasObject = { ...circularFront, id: "front-planar", annotations: { ...circularFront.annotations, wavefrontType: "plan", direction: "gauche" } };
  const aperture: CanvasObject = { id: "young-aperture", kind: "aperture-array", x: 320, y: 10, width: 70, height: 160, annotations: { apertureType: "trous d’Young", count: "2", spacing: "a", opening: "b" } };
  const path: CanvasObject = { id: "optical-path", kind: "wave-path", x: 390, y: 65, x2: 610, y2: 95, annotations: { main: "δ(M)", medium: "n = 1", pathStyle: "réel" } };
  const auxiliaryPath: CanvasObject = { ...path, id: "auxiliary-path", y: 115, y2: 145, annotations: { ...path.annotations, pathStyle: "auxiliaire" } };
  const screen: CanvasObject = { id: "fringes", kind: "fringe-screen", x: 610, y: 5, width: 150, height: 190, annotations: { screenName: "Écran", pointName: "M", fringeCount: "7", fringeSpacing: "i" } };
  const cone: CanvasObject = { id: "cone", kind: "diffraction-cone", x: 40, y: 230, width: 260, height: 150, annotations: { opening: "a", angle: "θ", wavelength: "λ", distance: "D" } };
  const standing: CanvasObject = { id: "standing", kind: "standing-wave", x: 350, y: 305, x2: 650, y2: 305, annotations: { main: "y(x,t)", mode: "3", showAntinodes: "oui" } };
  const interference: CanvasObject = { id: "interference-profile", kind: "intensity-profile", x: 30, y: 430, width: 260, height: 150, annotations: { profileType: "interférence", main: "I(x)", fringeCount: "7" } };
  const diffraction: CanvasObject = { ...interference, id: "diffraction-profile", x: 340, annotations: { ...interference.annotations, profileType: "diffraction" } };
  const objects = [source, planeSource, circularFront, planarFront, aperture, path, auxiliaryPath, screen, cone, standing, interference, diffraction];
  const scenes = new Map<string, NonNullable<ReturnType<typeof scientificSceneFor>>>();
  for (const object of objects) {
    const scene = scientificSceneFor(object);
    assert.ok(scene?.length, object.kind);
    assert.equal(objectToLatex(object), scientificSceneToTikz(scene), `${object.kind} must export the canvas scene without substitute geometry`);
    scenes.set(object.id, scene);
  }
  const scene = (id: string) => scenes.get(id)!;
  const texts = (id: string) => scene(id).flatMap((primitive) => primitive.type === "text" ? [primitive.value] : []);

  assert.ok(scene(source.id).some((primitive) => primitive.type === "circle" && primitive.cx === 45 && primitive.cy === 55 && primitive.fill === "ink"));
  assert.ok(scene(source.id).some((primitive) => primitive.type === "arc"));
  assert.ok(scene(planeSource.id).some((primitive) => primitive.type === "line" && primitive.arrowEnd));
  assert.ok(scene(circularFront.id).filter((primitive) => primitive.type === "arc").length >= 3);
  assert.ok(scene(planarFront.id).filter((primitive) => primitive.type === "line").length >= 3);
  assert.ok(scene(planarFront.id).some((primitive) => primitive.type === "line" && primitive.arrowEnd && primitive.x2 < primitive.x1));
  assert.ok(scene(aperture.id).filter((primitive) => primitive.type === "line").length >= 3);
  assert.ok(scene(path.id).some((primitive) => primitive.type === "line" && primitive.x1 === 390 && primitive.y1 === 65 && primitive.x2 === 610 && primitive.y2 === 95 && primitive.arrowEnd));
  assert.ok(scene(auxiliaryPath.id).some((primitive) => primitive.type === "line" && primitive.dashed));
  assert.equal(scene(screen.id).filter((primitive) => primitive.type === "rect" && primitive.fill === "ink").length, 7);
  assert.ok(scene(cone.id).filter((primitive) => primitive.type === "line").length >= 4);
  assert.ok(scene(cone.id).some((primitive) => primitive.type === "arc"));
  const standingWave = scene(standing.id).find((primitive) => primitive.type === "polyline");
  assert.ok(standingWave?.type === "polyline" && standingWave.points.length >= 49);
  assert.deepEqual(standingWave.points[0], { x: 350, y: 305 });
  assert.deepEqual(standingWave.points.at(-1), { x: 650, y: 305 });
  const interferenceCurve = scene(interference.id).find((primitive) => primitive.type === "polyline");
  const diffractionCurve = scene(diffraction.id).find((primitive) => primitive.type === "polyline");
  assert.ok(interferenceCurve?.type === "polyline" && interferenceCurve.points.length >= 49);
  assert.ok(diffractionCurve?.type === "polyline" && diffractionCurve.points.length >= 49);
  assert.notDeepEqual(interferenceCurve.points, diffractionCurve.points);

  for (const value of ["S", "φ_0 = 0"]) assert.ok(texts(source.id).includes(value), value);
  assert.ok(texts(circularFront.id).includes("φ = constante"));
  for (const value of ["S_1", "S_2", "a", "b"]) assert.ok(texts(aperture.id).includes(value), value);
  for (const value of ["δ(M)", "n = 1"]) assert.ok(texts(path.id).includes(value), value);
  for (const value of ["Écran", "M", "i"]) assert.ok(texts(screen.id).includes(value), value);
  for (const value of ["a", "θ", "λ", "D"]) assert.ok(texts(cone.id).includes(value), value);
  for (const value of ["y(x,t)", "nœuds", "ventres"]) assert.ok(texts(standing.id).includes(value), value);
  assert.ok(texts(interference.id).includes("I(x)"));
  assert.ok(texts(diffraction.id).includes("I(x)"));
});

test("keeps wave ports semantic and excludes every optical convergence from electrical junctions", () => {
  const source: CanvasObject = { id: "source", kind: "wave-source", x: 20, y: 30, width: 70, height: 70 };
  const aperture: CanvasObject = { id: "aperture", kind: "aperture-array", x: 180, y: 20, width: 70, height: 160 };
  const screen: CanvasObject = { id: "screen", kind: "fringe-screen", x: 600, y: 20, width: 150, height: 190 };
  const firstPath: CanvasObject = { id: "path-1", kind: "wave-path", x: 55, y: 65, x2: 180, y2: 100, bindings: { startId: source.id, startPort: "branch", endId: aperture.id, endPort: "left" } };
  const secondPath: CanvasObject = { id: "path-2", kind: "wave-path", x: 250, y: 100, x2: 600, y2: 115, bindings: { startId: aperture.id, startPort: "right", endId: screen.id, endPort: "left" } };
  const standing: CanvasObject = { id: "standing-port", kind: "standing-wave", x: 250, y: 180, x2: 600, y2: 180, bindings: { startId: aperture.id, startPort: "right", endId: screen.id, endPort: "left" } };
  assert.deepEqual(portsFor(source), [{ name: "branch", x: 55, y: 65 }]);
  assert.deepEqual(portsFor(aperture), [
    { name: "top", x: 215, y: 20 }, { name: "right", x: 250, y: 100 }, { name: "bottom", x: 215, y: 180 }, { name: "left", x: 180, y: 100 },
  ]);
  assert.deepEqual(portsFor(screen), [
    { name: "top", x: 675, y: 20 }, { name: "right", x: 750, y: 115 }, { name: "bottom", x: 675, y: 210 }, { name: "left", x: 600, y: 115 },
  ]);
  assert.deepEqual(portsFor(firstPath), [{ name: "start", x: 55, y: 65 }, { name: "end", x: 180, y: 100 }]);
  assert.deepEqual(portsFor(standing), [{ name: "start", x: 250, y: 180 }, { name: "end", x: 600, y: 180 }]);
  for (const object of [
    { id: "front", kind: "wavefront" as const, x: 0, y: 0, width: 180, height: 130 },
    { id: "cone", kind: "diffraction-cone" as const, x: 0, y: 0, width: 260, height: 150 },
    { id: "profile", kind: "intensity-profile" as const, x: 0, y: 0, width: 260, height: 150 },
  ]) assert.deepEqual(portsFor(object), []);
  assert.deepEqual(junctionPointsFor([source, aperture, screen, firstPath, secondPath, standing]), []);
});

test("provides three bound and lossless CPGE wave teaching templates whose clones remap every endpoint", () => {
  const expectations: Array<{ id: string; kinds: ObjectKind[]; aperture?: string; profile?: string }> = [
    { id: "young-double-slit-interference", kinds: ["wave-source", "wavefront", "aperture-array", "wave-path", "fringe-screen", "intensity-profile"], aperture: "trous d’Young", profile: "interférence" },
    { id: "fraunhofer-single-slit-diffraction", kinds: ["wave-source", "wavefront", "aperture-array", "wave-path", "fringe-screen", "diffraction-cone", "intensity-profile"], aperture: "fente simple", profile: "diffraction" },
    { id: "progressive-standing-waves", kinds: ["wave-source", "wavefront", "wave-path", "standing-wave"] },
  ];
  for (const expected of expectations) {
    const template = diagramTemplates.find((candidate) => candidate.id === expected.id);
    assert.ok(template, expected.id);
    assert.ok(expected.kinds.every((kind) => template.objects.some((object) => object.kind === kind)), expected.kinds.filter((kind) => !template.objects.some((object) => object.kind === kind)).join(", "));
    if (expected.aperture) assert.ok(template.objects.some((object) => object.kind === "aperture-array" && object.annotations?.apertureType === expected.aperture));
    if (expected.profile) assert.ok(template.objects.some((object) => object.kind === "intensity-profile" && object.annotations?.profileType === expected.profile));
    const originalIds = new Set(template.objects.map((object) => object.id));
    assert.equal(originalIds.size, template.objects.length);
    const bound = template.objects.filter((object) => object.bindings?.startId || object.bindings?.endId);
    assert.ok(bound.length > 0, `${expected.id} requires semantic wave bindings`);
    for (const object of bound) {
      for (const endpoint of [[object.bindings?.startId, object.bindings?.startPort], [object.bindings?.endId, object.bindings?.endPort]] as const) {
        const [endpointId, endpointPort] = endpoint;
        if (!endpointId) continue;
        const target = template.objects.find((candidate) => candidate.id === endpointId);
        assert.ok(target, `${object.id} endpoint ${endpointId}`);
        assert.ok(endpointPort && portsFor(target).some((port) => port.name === endpointPort), `${object.id} port ${endpointPort ?? "missing"}`);
      }
    }
    assert.deepEqual(junctionPointsFor(template.objects), []);
    const output = documentFor(template.objects);
    assert.deepEqual(roundTripReport(output, template.objects), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });

    const cloned = cloneTemplateObjects(template);
    assert.equal(cloned.length, template.objects.length);
    const clonedIds = new Set(cloned.map((object) => object.id));
    assert.equal(clonedIds.size, cloned.length);
    assert.ok([...clonedIds].every((id) => !originalIds.has(id)));
    const remappedIds = new Map(template.objects.map((object, index) => [object.id, cloned[index].id]));
    template.objects.forEach((object, index) => {
      const copy = cloned[index];
      assert.equal(copy.bindings?.startId, object.bindings?.startId ? remappedIds.get(object.bindings.startId) : undefined, `${expected.id}/${object.id} start`);
      assert.equal(copy.bindings?.endId, object.bindings?.endId ? remappedIds.get(object.bindings.endId) : undefined, `${expected.id}/${object.id} end`);
      assert.equal(copy.bindings?.startPort, object.bindings?.startPort, `${expected.id}/${object.id} start port`);
      assert.equal(copy.bindings?.endPort, object.bindings?.endPort, `${expected.id}/${object.id} end port`);
    });
  }
});

test("exposes the exact semantic molecular-structure family and extended reaction annotations", () => {
  const newKinds: ObjectKind[] = ["chemical-atom", "bond-wedge-solid", "bond-wedge-hashed", "bond-wavy", "electron-pair-arrow", "single-electron-arrow", "mesomeric-arrow", "newman-projection", "skeletal-ring"];
  const group = toolboxGroups.find((candidate) => candidate.title === "Molecular structures & mechanisms");
  assert.ok(group);
  assert.deepEqual(group.kinds, ["chemical-atom", "bond-wedge-solid", "bond-wedge-hashed", "bond-wavy", "electron-pair-arrow", "single-electron-arrow", "reaction-arrow", "mesomeric-arrow", "newman-projection", "skeletal-ring"]);
  assert.deepEqual(newKinds.filter((kind) => connectorKinds.includes(kind)), ["bond-wedge-solid", "bond-wedge-hashed", "bond-wavy", "electron-pair-arrow", "single-electron-arrow", "mesomeric-arrow"]);
  assert.deepEqual(newKinds.filter((kind) => stampKinds.includes(kind)), ["chemical-atom", "newman-projection", "skeletal-ring"]);
  assert.deepEqual(defaultAnnotations("chemical-atom"), { element: "C", hydrogens: "0", charge: "", isotope: "", radical: "no", electronVacancy: "no", lonePairs: "0" });
  assert.deepEqual(defaultAnnotations("bond-wedge-solid"), { wideEnd: "end" });
  assert.deepEqual(defaultAnnotations("bond-wedge-hashed"), { wideEnd: "end" });
  assert.deepEqual(defaultAnnotations("bond-wavy"), { main: "" });
  assert.deepEqual(defaultAnnotations("electron-pair-arrow"), { main: "", curvature: "left" });
  assert.deepEqual(defaultAnnotations("single-electron-arrow"), { main: "", curvature: "left" });
  assert.deepEqual(defaultAnnotations("mesomeric-arrow"), { main: "" });
  assert.deepEqual(defaultAnnotations("newman-projection"), { conformation: "staggered", front1: "H", front2: "H", front3: "CH_3", rear1: "H", rear2: "H", rear3: "CH_3", rotation: "0" });
  assert.deepEqual(defaultAnnotations("skeletal-ring"), { ringSize: "6", ringType: "aromatic", substituent1: "", substituent2: "" });
  assert.deepEqual(defaultAnnotations("reaction-arrow"), { above: "", below: "", reagent: "", solvent: "", temperature: "", duration: "" });
  assert.deepEqual(stampSize("chemical-atom"), { width: 70, height: 60 });
  assert.deepEqual(stampSize("newman-projection"), { width: 190, height: 190 });
  assert.deepEqual(stampSize("skeletal-ring"), { width: 180, height: 160 });
});

test("shares exact Lewis, Cram, mechanism, Newman and skeletal geometry with TikZ", () => {
  const atom: CanvasObject = { id: "nitrogen", kind: "chemical-atom", x: 10, y: 20, width: 70, height: 60, annotations: { element: "N", hydrogens: "2", charge: "+", isotope: "15", radical: "oui", electronVacancy: "oui", lonePairs: "2" } };
  const solid: CanvasObject = { id: "solid-wedge", kind: "bond-wedge-solid", x: 0, y: 120, x2: 120, y2: 120, annotations: { wideEnd: "fin" } };
  const hashed: CanvasObject = { id: "hashed-wedge", kind: "bond-wedge-hashed", x: 0, y: 160, x2: 120, y2: 160, annotations: { wideEnd: "fin" } };
  const wavy: CanvasObject = { id: "wavy-bond", kind: "bond-wavy", x: 0, y: 200, x2: 120, y2: 200, annotations: { main: "liaison" } };
  const pairArrow: CanvasObject = { id: "pair-arrow", kind: "electron-pair-arrow", x: 170, y: 100, x2: 290, y2: 100, annotations: { main: "2 e^-", curvature: "gauche" } };
  const fishhook: CanvasObject = { id: "fishhook", kind: "single-electron-arrow", x: 170, y: 190, x2: 290, y2: 190, annotations: { main: "e^-", curvature: "gauche" } };
  const mesomeric: CanvasObject = { id: "mesomeric", kind: "mesomeric-arrow", x: 340, y: 145, x2: 480, y2: 145, annotations: { main: "mésomérie" } };
  const newman: CanvasObject = { id: "newman-staggered", kind: "newman-projection", x: 520, y: 20, width: 190, height: 190, annotations: { conformation: "décalée", front1: "H", front2: "Cl", front3: "CH_3", rear1: "Br", rear2: "H", rear3: "CH_3", rotation: "0" } };
  const aromatic: CanvasObject = { id: "benzene", kind: "skeletal-ring", x: 20, y: 270, width: 180, height: 160, annotations: { ringSize: "6", ringType: "aromatique", substituent1: "CH_3", substituent2: "Br" } };
  const reaction: CanvasObject = { id: "reaction", kind: "reaction-arrow", x: 250, y: 350, x2: 500, y2: 350, annotations: { above: "Δ", reagent: "H_2SO_4", below: "reflux", solvent: "éthanol", temperature: "80 °C", duration: "2 h" } };
  const objects = [atom, solid, hashed, wavy, pairArrow, fishhook, mesomeric, newman, aromatic, reaction];
  const scenes = new Map<string, NonNullable<ReturnType<typeof scientificSceneFor>>>();
  for (const object of objects) {
    const scene = scientificSceneFor(object);
    assert.ok(scene?.length, object.kind);
    assert.equal(objectToLatex(object), scientificSceneToTikz(scene), `${object.kind} must export the exact canvas scene`);
    scenes.set(object.id, scene);
  }
  const scene = (id: string) => scenes.get(id)!;
  const texts = (id: string) => scene(id).flatMap((primitive) => primitive.type === "text" ? [primitive.value] : []);

  assert.deepEqual(texts(atom.id), ["N", "15", "H", "2", "+"]);
  assert.ok(scene(atom.id).filter((primitive) => primitive.type === "text").every((primitive) => primitive.type === "text" && primitive.roman));
  assert.equal(scene(atom.id).filter((primitive) => primitive.type === "circle" && primitive.fill === "ink").length, 5, "two lone pairs plus one radical");
  assert.equal(scene(atom.id).filter((primitive) => primitive.type === "rect" && primitive.fill === "paper").length, 1, "one electron vacancy");
  const atomTikz = objectToLatex(atom);
  for (const value of ["$\\mathrm{N}$", "$\\mathrm{15}$", "$\\mathrm{H}$", "$\\mathrm{2}$", "$\\mathrm{+}$"]) assert.ok(atomTikz.includes(value), value);
  const rotatedAtom = objectToLatex({ ...atom, id: "upright-nitrogen", rotation: 90 });
  assert.doesNotMatch(rotatedAtom, /transform canvas|rotate=/, "chemical symbols and isotope/charge labels must stay upright");

  assert.deepEqual(scene(solid.id), [{ type: "polyline", closed: true, fill: "ink", points: [{ x: 0, y: 120 }, { x: 120, y: 128 }, { x: 120, y: 112 }] }]);
  assert.equal(scene(hashed.id).length, 8);
  assert.deepEqual(scene(hashed.id)[0], { type: "line", x1: 15, y1: 158.125, x2: 15, y2: 161.875 });
  assert.deepEqual(scene(hashed.id).at(-1), { type: "line", x1: 120, y1: 152, x2: 120, y2: 168 });
  const wavyPath = scene(wavy.id).find((primitive) => primitive.type === "polyline");
  assert.ok(wavyPath?.type === "polyline" && wavyPath.points.length === 61);
  assert.deepEqual(wavyPath.points[0], { x: 0, y: 200 });
  assert.deepEqual(wavyPath.points.at(-1), { x: 120, y: 200 });

  const fullArrow = scene(pairArrow.id).find((primitive) => primitive.type === "bezier");
  const halfArrow = scene(fishhook.id).find((primitive) => primitive.type === "bezier");
  assert.deepEqual(fullArrow, { type: "bezier", start: { x: 170, y: 100 }, control1: { x: 210, y: 133.6 }, control2: { x: 250, y: 133.6 }, end: { x: 290, y: 100 }, arrowEnd: true });
  assert.ok(halfArrow?.type === "bezier" && halfArrow.arrowEnd === false);
  assert.equal(scene(fishhook.id).filter((primitive) => primitive.type === "line").length, 1, "a fishhook has one terminal barb");
  assert.equal(scene(pairArrow.id).filter((primitive) => primitive.type === "line").length, 0, "a pair arrow uses the complete arrowhead");
  const rightCurve = scientificSceneFor({ ...pairArrow, id: "right-curve", annotations: { ...pairArrow.annotations, curvature: "droite" } }) ?? [];
  assert.ok(rightCurve.some((primitive) => primitive.type === "bezier" && primitive.control1.y < pairArrow.y));

  assert.equal(scene(mesomeric.id).filter((primitive) => primitive.type === "line").length, 1);
  assert.equal(scene(mesomeric.id).filter((primitive) => primitive.type === "polyline" && primitive.closed && primitive.fill === "ink").length, 2);
  const equilibrium = objectToLatex({ id: "equilibrium", kind: "equilibrium-arrow", x: 340, y: 175, x2: 480, y2: 175 });
  assert.equal((equilibrium.match(/\\draw\[-\{Latex\}\]/g) ?? []).length, 2);
  assert.notEqual(scientificSceneToTikz(scene(mesomeric.id)), equilibrium, "mésomérie ↔ is not a chemical equilibrium harpoon pair");

  assert.equal(scene(newman.id).filter((primitive) => primitive.type === "line").length, 6);
  assert.deepEqual(scene(newman.id).filter((primitive) => primitive.type === "circle").map((primitive) => primitive.type === "circle" ? primitive.fill : undefined), ["paper", "ink"]);
  for (const value of ["H", "Cl", "CH_3", "Br", "staggered"]) assert.ok(texts(newman.id).includes(value), value);
  const eclipsed = scientificSceneFor({ ...newman, id: "newman-eclipsed", annotations: { ...newman.annotations, conformation: "éclipsée" } }) ?? [];
  assert.ok(eclipsed.some((primitive) => primitive.type === "text" && primitive.value === "eclipsed"));
  assert.notDeepEqual(scene(newman.id).filter((primitive) => primitive.type === "line"), eclipsed.filter((primitive) => primitive.type === "line"));

  const aromaticOutline = scene(aromatic.id).find((primitive) => primitive.type === "polyline");
  assert.ok(aromaticOutline?.type === "polyline" && aromaticOutline.closed && aromaticOutline.points.length === 6);
  assert.equal(scene(aromatic.id).filter((primitive) => primitive.type === "circle").length, 1);
  assert.ok(texts(aromatic.id).includes("CH_3") && texts(aromatic.id).includes("Br"));
  const alternating = scientificSceneFor({ ...aromatic, id: "alternating-ring", annotations: { ...aromatic.annotations, ringType: "alterné", substituent1: "", substituent2: "" } }) ?? [];
  const saturated = scientificSceneFor({ ...aromatic, id: "saturated-ring", annotations: { ...aromatic.annotations, ringType: "saturé", substituent1: "", substituent2: "" } }) ?? [];
  assert.equal(alternating.filter((primitive) => primitive.type === "line").length, 3);
  assert.equal(alternating.filter((primitive) => primitive.type === "circle").length, 0);
  assert.deepEqual(saturated.map((primitive) => primitive.type), ["polyline"]);

  assert.deepEqual(texts(reaction.id), ["Δ; H_2SO_4", "reflux; éthanol; 80 °C; 2 h"]);
  const reactionLine = scene(reaction.id)[0];
  assert.equal(reactionLine.type === "line" && reactionLine.arrowEnd, true);
});

test("provides semantic molecular ports without creating electrical junctions", () => {
  const left: CanvasObject = { id: "left-atom", kind: "chemical-atom", x: 20, y: 30, width: 70, height: 60 };
  const right: CanvasObject = { id: "right-atom", kind: "chemical-atom", x: 250, y: 30, width: 70, height: 60 };
  const connectorKindsUnderTest: ObjectKind[] = ["bond-wedge-solid", "bond-wedge-hashed", "bond-wavy", "electron-pair-arrow", "single-electron-arrow", "mesomeric-arrow"];
  const connectors = connectorKindsUnderTest.map((kind, index): CanvasObject => ({ id: `chem-${index}`, kind, x: 90, y: 60, x2: 250, y2: 60 + index * 8, bindings: { startId: left.id, startPort: "right", endId: right.id, endPort: "left" } }));
  assert.deepEqual(portsFor(left), [
    { name: "top", x: 55, y: 30 }, { name: "right", x: 90, y: 60 }, { name: "bottom", x: 55, y: 90 }, { name: "left", x: 20, y: 60 },
  ]);
  for (const connector of connectors) assert.deepEqual(portsFor(connector), [{ name: "start", x: connector.x, y: connector.y }, { name: "end", x: connector.x2, y: connector.y2 }], connector.kind);
  assert.deepEqual(portsFor({ id: "newman", kind: "newman-projection", x: 0, y: 0, width: 190, height: 190 }), []);
  assert.deepEqual(portsFor({ id: "ring", kind: "skeletal-ring", x: 0, y: 0, width: 180, height: 160 }), []);
  assert.deepEqual(junctionPointsFor([left, right, ...connectors]), []);
});

test("provides three lossless chemistry references whose semantic bindings survive cloning", () => {
  const expectations: Array<{ id: string; kinds: ObjectKind[] }> = [
    { id: "lewis-vsepr-cram", kinds: ["chemical-atom", "bond-wedge-solid", "bond-wedge-hashed", "bond-wavy"] },
    { id: "newman-conformations", kinds: ["newman-projection"] },
    { id: "mesomerism-sn2-mechanism", kinds: ["chemical-atom", "electron-pair-arrow", "single-electron-arrow", "mesomeric-arrow", "skeletal-ring", "reaction-arrow"] },
  ];
  const templates = expectations.map((expected) => {
    const template = diagramTemplates.find((candidate) => candidate.id === expected.id);
    assert.ok(template, expected.id);
    assert.ok(expected.kinds.every((kind) => template.objects.some((object) => object.kind === kind)), expected.kinds.filter((kind) => !template.objects.some((object) => object.kind === kind)).join(", "));
    return template;
  });
  const coveredKinds = new Set(templates.flatMap((template) => template.objects.map((object) => object.kind)));
  for (const kind of ["chemical-atom", "bond-wedge-solid", "bond-wedge-hashed", "bond-wavy", "electron-pair-arrow", "single-electron-arrow", "mesomeric-arrow", "newman-projection", "skeletal-ring"] satisfies ObjectKind[]) assert.ok(coveredKinds.has(kind), kind);
  const newmanTemplate = templates[1];
  assert.deepEqual(new Set(newmanTemplate.objects.filter((object) => object.kind === "newman-projection").map((object) => object.annotations?.conformation)), new Set(["staggered", "eclipsed"]));
  const mechanismTemplate = templates[2];
  assert.ok(mechanismTemplate.objects.some((object) => object.kind === "reaction-arrow" && ["above", "reagent", "below", "solvent", "temperature", "duration"].some((key) => object.annotations?.[key]?.trim())));

  let semanticBindingCount = 0;
  for (const template of templates) {
    const originalIds = new Set(template.objects.map((object) => object.id));
    assert.equal(originalIds.size, template.objects.length);
    for (const object of template.objects) {
      for (const [endpointId, endpointPort] of [[object.bindings?.startId, object.bindings?.startPort], [object.bindings?.endId, object.bindings?.endPort]] as const) {
        if (!endpointId) continue;
        semanticBindingCount += 1;
        const target = template.objects.find((candidate) => candidate.id === endpointId);
        assert.ok(target, `${template.id}/${object.id} endpoint ${endpointId}`);
        assert.ok(endpointPort && portsFor(target).some((port) => port.name === endpointPort), `${template.id}/${object.id} port ${endpointPort ?? "missing"}`);
      }
    }
    assert.deepEqual(junctionPointsFor(template.objects), []);
    const output = documentFor(template.objects);
    assert.deepEqual(roundTripReport(output, template.objects), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });

    const cloned = cloneTemplateObjects(template);
    assert.equal(cloned.length, template.objects.length);
    const clonedIds = new Set(cloned.map((object) => object.id));
    assert.equal(clonedIds.size, cloned.length);
    assert.ok([...clonedIds].every((id) => !originalIds.has(id)));
    const remappedIds = new Map(template.objects.map((object, index) => [object.id, cloned[index].id]));
    template.objects.forEach((object, index) => {
      const copy = cloned[index];
      assert.equal(copy.bindings?.startId, object.bindings?.startId ? remappedIds.get(object.bindings.startId) : undefined, `${template.id}/${object.id} start`);
      assert.equal(copy.bindings?.endId, object.bindings?.endId ? remappedIds.get(object.bindings.endId) : undefined, `${template.id}/${object.id} end`);
      assert.equal(copy.bindings?.startPort, object.bindings?.startPort, `${template.id}/${object.id} start port`);
      assert.equal(copy.bindings?.endPort, object.bindings?.endPort, `${template.id}/${object.id} end port`);
    });
  }
  assert.ok(semanticBindingCount > 0, "the chemistry references must demonstrate semantic atom connections");
});

const controlAnalysisKinds = [
  "bode-diagram", "bode-trace", "bode-break", "bode-slope", "stability-margin",
  "time-response-diagram", "time-response-trace", "settling-band", "performance-marker", "pole-zero-map",
] satisfies ObjectKind[];

const finiteControlScene = (object: CanvasObject) => {
  const scene = scientificSceneFor(object);
  assert.ok(scene?.length, `${object.kind} must have a non-empty shared scientific scene`);
  const inspect = (value: unknown, path: string): void => {
    if (typeof value === "number") {
      assert.ok(Number.isFinite(value), `${object.kind} has a non-finite value at ${path}`);
      return;
    }
    if (Array.isArray(value)) value.forEach((entry, index) => inspect(entry, `${path}[${index}]`));
    else if (value && typeof value === "object") Object.entries(value).forEach(([key, entry]) => inspect(entry, `${path}.${key}`));
  };
  inspect(scene, "scene");
  return scene;
};

const longestControlPolyline = (scene: NonNullable<ReturnType<typeof scientificSceneFor>>) => {
  const paths = scene.filter((primitive) => primitive.type === "polyline");
  return paths.toSorted((left, right) => right.points.length - left.points.length)[0];
};

const hasDashedControlPrimitive = (scene: NonNullable<ReturnType<typeof scientificSceneFor>>) => scene.some((primitive) =>
  (primitive.type === "line" || primitive.type === "polyline" || primitive.type === "bezier")
  && (primitive.dashed === true || ("dashArray" in primitive && Boolean(primitive.dashArray?.length))),
);

const controlCanvasPoint = (point: { x: number; y: number }) => `(${canvasUnitsToCentimeters(point.x).toFixed(2)},${(-canvasUnitsToCentimeters(point.y)).toFixed(2)})`;

test("registers exactly ten French CPGE control-analysis tools with stable defaults and sizes", () => {
  const group = toolboxGroups.find((candidate) => candidate.title === "Time & frequency responses");
  assert.ok(group);
  assert.deepEqual(group.kinds, controlAnalysisKinds);
  assert.deepEqual(connectorKinds.filter((kind) => controlAnalysisKinds.includes(kind)), ["bode-break", "bode-slope", "performance-marker"]);
  assert.deepEqual(stampKinds.filter((kind) => controlAnalysisKinds.includes(kind)), [
    "bode-diagram", "bode-trace", "stability-margin", "time-response-diagram", "time-response-trace", "settling-band", "pole-zero-map",
  ]);
  assert.deepEqual(defaultAnnotations("bode-diagram"), { title: "Bode diagram", transferFunction: "H(p)", omegaMin: "0.1", omegaMax: "1000", gainMin: "-60", gainMax: "40", phaseMin: "-180", phaseMax: "0", frequencyUnit: "rad/s" });
  assert.deepEqual(defaultAnnotations("bode-trace"), { channel: "magnitude", traceType: "exact", model: "first order", gain: "1", omega0: "10", damping: "0.7", main: "H" });
  assert.deepEqual(defaultAnnotations("bode-break"), { main: "ω_0" });
  assert.deepEqual(defaultAnnotations("bode-slope"), { main: "-20 dB/decade", slope: "-20" });
  assert.deepEqual(defaultAnnotations("stability-margin"), { marginType: "phase", omegaC: "10", marginValue: "45", main: "M_φ" });
  assert.deepEqual(defaultAnnotations("time-response-diagram"), { title: "Time response", input: "step", signal: "y(t)", unit: "", timeMin: "0", timeMax: "10", yMin: "0", yMax: "1.5" });
  assert.deepEqual(defaultAnnotations("time-response-trace"), { model: "first order", input: "step", gain: "1", tau: "1", omega0: "1", damping: "0.5", main: "y(t)" });
  assert.deepEqual(defaultAnnotations("settling-band"), { target: "1", tolerance: "5", main: "±5 %" });
  assert.deepEqual(defaultAnnotations("performance-marker"), { performanceType: "t5%", main: "t_5%" });
  assert.deepEqual(defaultAnnotations("pole-zero-map"), { main: "Poles and zeros", poles: "-1+2i;-1-2i", zeros: "", realMin: "-5", realMax: "1", imagMin: "-4", imagMax: "4" });
  assert.deepEqual(Object.fromEntries(controlAnalysisKinds.map((kind) => [kind, stampSize(kind)])), {
    "bode-diagram": { width: 420, height: 300 }, "bode-trace": { width: 420, height: 300 }, "bode-break": { width: 70, height: 80 }, "bode-slope": { width: 70, height: 80 }, "stability-margin": { width: 420, height: 300 },
    "time-response-diagram": { width: 420, height: 240 }, "time-response-trace": { width: 420, height: 240 }, "settling-band": { width: 420, height: 240 }, "performance-marker": { width: 70, height: 80 }, "pole-zero-map": { width: 320, height: 260 },
  });
  const exposedKinds = toolboxGroups.flatMap((candidate) => candidate.kinds.map(String));
  assert.equal(exposedKinds.some((kind) => /nyquist/i.test(kind)), false, "Nyquist is intentionally outside this bounded first implementation");
});

test("gives control frames compass ports, marker endpoints, and never creates electrical junctions", () => {
  const objects: CanvasObject[] = [
    { id: "bode-frame-ports", kind: "bode-diagram", x: 40, y: 30, width: 420, height: 300, annotations: defaultAnnotations("bode-diagram") },
    { id: "bode-trace-ports", kind: "bode-trace", x: 40, y: 30, width: 420, height: 300, annotations: defaultAnnotations("bode-trace") },
    { id: "bode-break-ports", kind: "bode-break", x: 100, y: 70, x2: 100, y2: 260, annotations: defaultAnnotations("bode-break") },
    { id: "bode-slope-ports", kind: "bode-slope", x: 120, y: 100, x2: 220, y2: 160, annotations: defaultAnnotations("bode-slope") },
    { id: "margin-ports", kind: "stability-margin", x: 40, y: 30, width: 420, height: 300, annotations: defaultAnnotations("stability-margin") },
    { id: "time-frame-ports", kind: "time-response-diagram", x: 50, y: 380, width: 420, height: 240, annotations: defaultAnnotations("time-response-diagram") },
    { id: "time-trace-ports", kind: "time-response-trace", x: 50, y: 380, width: 420, height: 240, annotations: defaultAnnotations("time-response-trace") },
    { id: "band-ports", kind: "settling-band", x: 50, y: 380, width: 420, height: 240, annotations: defaultAnnotations("settling-band") },
    { id: "performance-ports", kind: "performance-marker", x: 180, y: 410, x2: 180, y2: 590, annotations: defaultAnnotations("performance-marker") },
    { id: "pz-ports", kind: "pole-zero-map", x: 500, y: 30, width: 320, height: 260, annotations: defaultAnnotations("pole-zero-map") },
  ];
  objects.forEach(finiteControlScene);
  assert.deepEqual(portsFor(objects[0]), [
    { name: "top", x: 250, y: 30 }, { name: "right", x: 460, y: 180 }, { name: "bottom", x: 250, y: 330 }, { name: "left", x: 40, y: 180 },
  ]);
  assert.deepEqual(portsFor(objects[5]), [
    { name: "top", x: 260, y: 380 }, { name: "right", x: 470, y: 500 }, { name: "bottom", x: 260, y: 620 }, { name: "left", x: 50, y: 500 },
  ]);
  assert.deepEqual(portsFor(objects[2]), [{ name: "start", x: 100, y: 70 }, { name: "end", x: 100, y: 260 }]);
  assert.deepEqual(portsFor(objects[3]), [{ name: "start", x: 120, y: 100 }, { name: "end", x: 220, y: 160 }]);
  assert.deepEqual(portsFor(objects[8]), [{ name: "start", x: 180, y: 410 }, { name: "end", x: 180, y: 590 }]);
  for (const index of [1, 4, 6, 7, 9]) assert.deepEqual(portsFor(objects[index]), [], objects[index].kind);
  assert.deepEqual(junctionPointsFor(objects), []);
});

test("shares aligned logarithmic Bode geometry and real/asymptotic first- and second-order traces with TikZ", () => {
  const frame: CanvasObject = { id: "bode-frame", kind: "bode-diagram", x: 40, y: 30, width: 420, height: 300, annotations: defaultAnnotations("bode-diagram") };
  const frameScene = finiteControlScene(frame);
  const texts = frameScene.filter((primitive) => primitive.type === "text").map((primitive) => primitive.value);
  assert.ok(texts.some((value) => value.includes("G_dB") || value.includes("G_{dB}")), "French concours Bode module notation G_dB is required");
  assert.ok(texts.some((value) => value.includes("φ") || value.includes("varphi")), "the lower panel must be the phase φ panel");
  assert.ok(texts.some((value) => value.includes("ω")), "the shared logarithmic abscissa must use pulsation ω");
  assert.ok(texts.some((value) => value.includes("rad/s")), "the default frequency unit must remain rad/s");

  const verticals = frameScene.filter((primitive) => primitive.type === "line" && Math.abs(primitive.x1 - primitive.x2) < 1e-7);
  const byX = new Map<string, typeof verticals>();
  for (const line of verticals) {
    const key = line.x1.toFixed(5); const entries = byX.get(key) ?? []; entries.push(line); byX.set(key, entries);
  }
  const alignedDecadeXs = [...byX.entries()].filter(([, lines]) => {
    const ys = lines.flatMap((line) => [line.y1, line.y2]);
    return lines.length >= 2 || Math.max(...ys) - Math.min(...ys) > (frame.height ?? 0) * .55;
  }).map(([value]) => Number(value)).toSorted((left, right) => left - right);
  assert.ok(alignedDecadeXs.length >= 5, "0.1–1000 rad/s needs at least five aligned decade lines across module and phase");
  assert.ok(alignedDecadeXs.some((_, start) => {
    if (start + 4 >= alignedDecadeXs.length) return false;
    const step = alignedDecadeXs[start + 1] - alignedDecadeXs[start];
    return step > 5 && [2, 3, 4].every((offset) => Math.abs((alignedDecadeXs[start + offset] - alignedDecadeXs[start + offset - 1]) - step) < step * .03);
  }), "major logarithmic decades must be equally spaced");

  const traceScene = (model: "premier ordre" | "deuxième ordre", channel: "module" | "phase", traceType: "réel" | "asymptotique") => finiteControlScene({
    id: `${model}-${channel}-${traceType}`, kind: "bode-trace", x: frame.x, y: frame.y, width: frame.width, height: frame.height,
    annotations: { ...defaultAnnotations("bode-trace"), model, channel, traceType, gain: "1", omega0: "10", damping: "0.45", main: "H(p)" },
  });
  const traces = new Map<string, ReturnType<typeof traceScene>>();
  for (const model of ["premier ordre", "deuxième ordre"] as const) for (const channel of ["module", "phase"] as const) for (const traceType of ["réel", "asymptotique"] as const) {
    const scene = traceScene(model, channel, traceType); const path = longestControlPolyline(scene);
    assert.ok(path && path.points.length > 3, `${model}/${channel}/${traceType} must contain a sampled trace`);
    if (traceType === "asymptotique") assert.ok(hasDashedControlPrimitive(scene), `${model}/${channel} asymptote must be dashed`);
    traces.set(`${model}/${channel}/${traceType}`, scene);
  }
  for (const model of ["premier ordre", "deuxième ordre"] as const) for (const channel of ["module", "phase"] as const) {
    const real = longestControlPolyline(traces.get(`${model}/${channel}/réel`)!); const asymptotic = longestControlPolyline(traces.get(`${model}/${channel}/asymptotique`)!);
    assert.ok(real && asymptotic);
    assert.equal(real.points[0].x, asymptotic.points[0].x);
    assert.equal(real.points.at(-1)?.x, asymptotic.points.at(-1)?.x);
    assert.notDeepEqual(real.points, asymptotic.points, `${model}/${channel} real and asymptotic traces must remain distinct`);
  }
  const firstModule = longestControlPolyline(traces.get("premier ordre/module/réel")!)!;
  const secondModule = longestControlPolyline(traces.get("deuxième ordre/module/réel")!)!;
  const firstPhase = longestControlPolyline(traces.get("premier ordre/phase/réel")!)!;
  assert.ok(firstPhase.points.reduce((sum, point) => sum + point.y, 0) / firstPhase.points.length > firstModule.points.reduce((sum, point) => sum + point.y, 0) / firstModule.points.length, "phase samples belong in the aligned lower panel");
  assert.notDeepEqual(firstModule.points, secondModule.points, "first- and second-order module laws must differ");
  const firstTikz = scientificSceneToTikz(traces.get("premier ordre/module/réel")!);
  assert.ok(firstTikz.includes(controlCanvasPoint(firstModule.points[0])));
  assert.ok(firstTikz.includes(controlCanvasPoint(firstModule.points.at(-1)!)));

  const breakScene = finiteControlScene({ id: "break", kind: "bode-break", x: 185, y: 55, x2: 185, y2: 310, annotations: { main: "ω_0" } });
  const slopeScene = finiteControlScene({ id: "slope", kind: "bode-slope", x: 220, y: 125, x2: 320, y2: 185, annotations: { main: "-20 dB/décade", slope: "-20" } });
  assert.ok(hasDashedControlPrimitive(breakScene));
  assert.ok(breakScene.some((primitive) => primitive.type === "text" && primitive.value.includes("ω")));
  assert.ok(slopeScene.some((primitive) => primitive.type === "text" && primitive.value.includes("dB/décade")));
  const phaseMargin = finiteControlScene({ id: "phase-margin", kind: "stability-margin", x: 40, y: 30, width: 420, height: 300, annotations: { marginType: "phase", omegaC: "10", marginValue: "45", main: "M_φ" } });
  const gainMargin = finiteControlScene({ id: "gain-margin", kind: "stability-margin", x: 40, y: 30, width: 420, height: 300, annotations: { marginType: "gain", omegaC: "100", marginValue: "12", main: "M_G" } });
  assert.ok(hasDashedControlPrimitive(phaseMargin) && hasDashedControlPrimitive(gainMargin));
  assert.ok(phaseMargin.some((primitive) => primitive.type === "text" && primitive.value.includes("M_φ")));
  assert.ok(gainMargin.some((primitive) => primitive.type === "text" && primitive.value.includes("M_G")));
  assert.notDeepEqual(phaseMargin, gainMargin);
});

test("shares finite first- and second-order time responses, the ±5 % band, and French performance marks", () => {
  const frame: CanvasObject = { id: "time-frame", kind: "time-response-diagram", x: 30, y: 40, width: 420, height: 240, annotations: defaultAnnotations("time-response-diagram") };
  const frameScene = finiteControlScene(frame); const frameTexts = frameScene.filter((primitive) => primitive.type === "text").map((primitive) => primitive.value);
  assert.ok(frameTexts.includes("Time response"));
  assert.ok(frameTexts.some((value) => value.includes("y(t)")));
  assert.ok(frameTexts.some((value) => value === "t" || value.startsWith("t ")));
  const firstScene = finiteControlScene({ id: "time-first", kind: "time-response-trace", x: frame.x, y: frame.y, width: frame.width, height: frame.height, annotations: { ...defaultAnnotations("time-response-trace"), model: "premier ordre", input: "échelon", gain: "1", tau: "1", main: "y(t)" } });
  const secondScene = finiteControlScene({ id: "time-second", kind: "time-response-trace", x: frame.x, y: frame.y, width: frame.width, height: frame.height, annotations: { ...defaultAnnotations("time-response-trace"), model: "deuxième ordre", input: "échelon", gain: "1", omega0: "2", damping: "0.35", main: "y(t)" } });
  const first = longestControlPolyline(firstScene); const second = longestControlPolyline(secondScene);
  assert.ok(first && first.points.length > 8);
  assert.ok(second && second.points.length > 8);
  assert.ok(first.points.slice(1).every((point, index) => point.y <= first.points[index].y + 1e-6), "first-order step response is monotone");
  assert.ok(second.points.some((point) => point.y < second.points.at(-1)!.y - 1), "underdamped second-order response must overshoot its final value");
  assert.notDeepEqual(first.points, second.points);
  assert.equal(first.points[0].x, second.points[0].x);
  assert.equal(first.points.at(-1)?.x, second.points.at(-1)?.x);
  const timeTikz = scientificSceneToTikz(secondScene);
  assert.ok(timeTikz.includes(controlCanvasPoint(second.points[0])));
  assert.ok(timeTikz.includes(controlCanvasPoint(second.points.at(-1)!)));

  const bandScene = finiteControlScene({ id: "band", kind: "settling-band", x: frame.x, y: frame.y, width: frame.width, height: frame.height, annotations: { target: "1", tolerance: "5", main: "±5 %" } });
  const bandLines = bandScene.filter((primitive) => primitive.type === "line" && Math.abs(primitive.y1 - primitive.y2) < 1e-7 && (primitive.dashed || Boolean(primitive.dashArray?.length)));
  assert.ok(new Set(bandLines.map((line) => line.y1.toFixed(5))).size >= 2, "the settling band needs distinct +5 % and -5 % boundaries");
  assert.ok(bandScene.some((primitive) => primitive.type === "text" && primitive.value.includes("±5")));

  const markers = [
    ["t5%", "t_5%"], ["temps de montée", "t_m"], ["D1%", "D_1"], ["erreur statique", "ε_s"], ["retard de traînage", "e_v"],
  ] as const;
  for (const [performanceType, main] of markers) {
    const scene = finiteControlScene({ id: `mark-${performanceType}`, kind: "performance-marker", x: 180, y: 70, x2: 180, y2: 250, annotations: { performanceType, main } });
    assert.ok(scene.some((primitive) => primitive.type === "text" && primitive.value.includes(main)), `${performanceType} must retain French concours notation ${main}`);
  }
});

test("draws poles as crosses and zeros as open circles on a French complex-p map", () => {
  const map = { id: "pole-zero", kind: "pole-zero-map" as const, x: 50, y: 40, width: 320, height: 260, annotations: { main: "Pôles et zéros", poles: "-1+2i;-1-2i;-3", zeros: "0;-2", realMin: "-5", realMax: "1", imagMin: "-4", imagMax: "4" } };
  const scene = finiteControlScene(map); const texts = scene.filter((primitive) => primitive.type === "text").map((primitive) => primitive.value);
  assert.ok(texts.some((value) => value.includes("Re(p)")));
  assert.ok(texts.some((value) => value.includes("Im(p)")));
  const zeroCircles = scene.filter((primitive) => primitive.type === "circle" && primitive.fill !== "ink");
  assert.ok(zeroCircles.length >= 2, "each zero is represented by an open circle ○");
  const diagonals = scene.filter((primitive) => primitive.type === "line" && Math.abs(primitive.x2 - primitive.x1) > 1e-7 && Math.abs(primitive.y2 - primitive.y1) > 1e-7);
  const crossMidpoints = new Map<string, number>();
  for (const line of diagonals) {
    const key = `${((line.x1 + line.x2) / 2).toFixed(4)},${((line.y1 + line.y2) / 2).toFixed(4)}`;
    crossMidpoints.set(key, (crossMidpoints.get(key) ?? 0) + 1);
  }
  assert.ok([...crossMidpoints.values()].filter((count) => count >= 2).length >= 3, "each pole is represented by a two-stroke cross ×");
  const tikz = scientificSceneToTikz(scene);
  assert.match(tikz, /circle/);
  assert.match(tikz, / -- /);
  assert.deepEqual(portsFor(map), []);
  assert.deepEqual(junctionPointsFor([map]), []);
});

test("provides three lossless French concours control templates with valid clone remapping", () => {
  const expectations: Array<{ id: string; kinds: ObjectKind[] }> = [
    { id: "first-order-identification-performance", kinds: ["time-response-diagram", "time-response-trace", "settling-band", "performance-marker"] },
    { id: "second-order-underdamped-performance", kinds: ["time-response-diagram", "time-response-trace", "settling-band", "performance-marker", "pole-zero-map"] },
    { id: "pi-stability-margins", kinds: ["bode-diagram", "bode-trace", "bode-break", "bode-slope", "stability-margin"] },
  ];
  const templates = expectations.map((expected) => {
    const template = diagramTemplates.find((candidate) => candidate.id === expected.id);
    assert.ok(template, expected.id);
    assert.ok(expected.kinds.every((kind) => template.objects.some((object) => object.kind === kind)), `${expected.id}: ${expected.kinds.filter((kind) => !template.objects.some((object) => object.kind === kind)).join(", ")}`);
    return template;
  });
  const coveredKinds = new Set(templates.flatMap((template) => template.objects.map((object) => object.kind)));
  assert.ok(controlAnalysisKinds.every((kind) => coveredKinds.has(kind)), controlAnalysisKinds.filter((kind) => !coveredKinds.has(kind)).join(", "));
  assert.ok(templates[0].objects.some((object) => object.kind === "time-response-trace" && object.annotations?.model === "premier ordre"));
  assert.ok(templates[1].objects.some((object) => object.kind === "time-response-trace" && object.annotations?.model === "deuxième ordre" && Number(object.annotations?.damping) > 0 && Number(object.annotations?.damping) < 1));
  assert.ok(templates[2].objects.some((object) => object.kind === "bode-trace" && object.annotations?.model === "PI"));
  assert.deepEqual(new Set(templates[2].objects.filter((object) => object.kind === "bode-trace").map((object) => object.annotations?.traceType)), new Set(["réel", "asymptotique"]));
  assert.deepEqual(new Set(templates[2].objects.filter((object) => object.kind === "stability-margin").map((object) => object.annotations?.marginType)), new Set(["phase", "gain"]));

  for (const template of templates) {
    const originalIds = new Set(template.objects.map((object) => object.id));
    assert.equal(originalIds.size, template.objects.length, `${template.id} ids`);
    for (const object of template.objects.filter((candidate) => controlAnalysisKinds.includes(candidate.kind))) finiteControlScene(object);
    for (const object of template.objects) for (const [targetId, targetPort] of [[object.bindings?.startId, object.bindings?.startPort], [object.bindings?.endId, object.bindings?.endPort]] as const) {
      if (!targetId) continue;
      const target = template.objects.find((candidate) => candidate.id === targetId);
      assert.ok(target, `${template.id}/${object.id} target ${targetId}`);
      assert.ok(targetPort && portsFor(target).some((port) => port.name === targetPort), `${template.id}/${object.id} port ${targetPort ?? "missing"}`);
    }
    assert.deepEqual(junctionPointsFor(template.objects), []);
    const output = documentFor(template.objects);
    assert.deepEqual(roundTripReport(output, template.objects), { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." });

    const cloned = cloneTemplateObjects(template); const clonedIds = new Set(cloned.map((object) => object.id));
    assert.equal(cloned.length, template.objects.length);
    assert.equal(clonedIds.size, cloned.length);
    assert.ok([...clonedIds].every((id) => !originalIds.has(id)));
    const remappedIds = new Map(template.objects.map((object, index) => [object.id, cloned[index].id]));
    template.objects.forEach((object, index) => {
      assert.equal(cloned[index].bindings?.startId, object.bindings?.startId ? remappedIds.get(object.bindings.startId) : undefined, `${template.id}/${object.id} start`);
      assert.equal(cloned[index].bindings?.endId, object.bindings?.endId ? remappedIds.get(object.bindings.endId) : undefined, `${template.id}/${object.id} end`);
      assert.equal(cloned[index].bindings?.startPort, object.bindings?.startPort, `${template.id}/${object.id} start port`);
      assert.equal(cloned[index].bindings?.endPort, object.bindings?.endPort, `${template.id}/${object.id} end port`);
    });
  }
  assert.equal(templates.some((template) => /nyquist/i.test(`${template.id} ${template.title}`) || template.objects.some((object) => /nyquist/i.test(object.kind))), false);
});

const thermodynamicDiagramKinds = [
  "thermo-diagram", "thermo-state", "thermo-process", "thermo-isotherm-family", "phase-diagram-pt",
  "liquid-vapour-dome", "vapour-quality-line", "thermo-cycle", "pressure-work-area",
] satisfies ObjectKind[];

const finiteThermodynamicScene = (object: CanvasObject) => {
  const scene = scientificSceneFor(object);
  assert.ok(scene?.length, `${object.kind} must have a non-empty shared scientific scene`);
  const inspect = (value: unknown, path: string): void => {
    if (typeof value === "number") {
      assert.ok(Number.isFinite(value), `${object.kind} has a non-finite value at ${path}`);
      return;
    }
    if (Array.isArray(value)) value.forEach((entry, index) => inspect(entry, `${path}[${index}]`));
    else if (value && typeof value === "object") Object.entries(value).forEach(([key, entry]) => inspect(entry, `${path}.${key}`));
  };
  inspect(scene, "scene");
  return scene;
};

const thermodynamicTexts = (scene: NonNullable<ReturnType<typeof scientificSceneFor>>) => scene
  .filter((primitive) => primitive.type === "text")
  .map((primitive) => primitive.value);

const foldedThermodynamicText = (values: string[]) => values.join(" ").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("fr");

const thermodynamicCurves = (scene: NonNullable<ReturnType<typeof scientificSceneFor>>) => scene.filter((primitive) =>
  primitive.type === "bezier" || primitive.type === "arc" || (primitive.type === "polyline" && !primitive.closed && primitive.points.length > 2),
);

const thermodynamicArrowCount = (scene: NonNullable<ReturnType<typeof scientificSceneFor>>) => scene.filter((primitive) =>
  ((primitive.type === "line" || primitive.type === "bezier" || primitive.type === "arc") && primitive.arrowEnd === true)
  || (primitive.type === "polyline" && primitive.closed === true && primitive.fill === "ink" && primitive.points.length <= 5),
).length;

const thermodynamicRepresentativePoint = (scene: NonNullable<ReturnType<typeof scientificSceneFor>>) => {
  const primitive = scene[0];
  if (primitive.type === "line") return { x: primitive.x1, y: primitive.y1 };
  if (primitive.type === "circle" || primitive.type === "ellipse" || primitive.type === "arc") return { x: primitive.cx, y: primitive.cy };
  if (primitive.type === "rect" || primitive.type === "text") return { x: primitive.x, y: primitive.y };
  if (primitive.type === "polyline") return primitive.points[0];
  return primitive.start;
};

test("registers the nine French CPGE thermodynamic-diagram tools with exact defaults and sizes", () => {
  const group = toolboxGroups.find((candidate) => candidate.title === "Thermodynamic diagrams");
  assert.ok(group);
  assert.deepEqual(group.kinds, thermodynamicDiagramKinds);
  assert.deepEqual(connectorKinds.filter((kind) => thermodynamicDiagramKinds.includes(kind)), ["thermo-process"]);
  assert.deepEqual(stampKinds.filter((kind) => thermodynamicDiagramKinds.includes(kind)), [
    "thermo-diagram", "thermo-state", "thermo-isotherm-family", "phase-diagram-pt", "liquid-vapour-dome", "vapour-quality-line", "thermo-cycle", "pressure-work-area",
  ]);
  assert.deepEqual(defaultAnnotations("thermo-diagram"), { diagramType: "P-V", title: "Clapeyron diagram", xMin: "0", xMax: "10", yMin: "0", yMax: "10", xUnit: "m^3", yUnit: "Pa" });
  assert.deepEqual(defaultAnnotations("thermo-state"), { main: "1", pressure: "P_1", volume: "V_1", temperature: "T_1", showCoordinates: "yes" });
  assert.deepEqual(defaultAnnotations("thermo-process"), { processType: "isothermal", direction: "forward", main: "T = const.", exponent: "1.4", heat: "", work: "" });
  assert.deepEqual(defaultAnnotations("thermo-isotherm-family"), { count: "4", main: "T_1 < T_2 < T_3 < T_4" });
  assert.deepEqual(defaultAnnotations("phase-diagram-pt"), { title: "Phase diagram (P,T)", substance: "pure substance", fusionSlope: "positive" });
  assert.deepEqual(defaultAnnotations("liquid-vapour-dome"), { title: "Liquid–vapour equilibrium", criticalPoint: "C" });
  assert.deepEqual(defaultAnnotations("vapour-quality-line"), { quality: "0.5", main: "x = 0.5" });
  assert.deepEqual(defaultAnnotations("thermo-cycle"), { cycleType: "Carnot", direction: "engine", main: "Carnot cycle" });
  assert.deepEqual(defaultAnnotations("pressure-work-area"), { main: "W = -∫P dV", areaType: "work received" });
  assert.deepEqual(Object.fromEntries(thermodynamicDiagramKinds.filter((kind) => kind !== "thermo-process").map((kind) => [kind, stampSize(kind)])), {
    "thermo-diagram": { width: 420, height: 280 }, "thermo-state": { width: 50, height: 50 }, "thermo-isotherm-family": { width: 420, height: 280 },
    "phase-diagram-pt": { width: 420, height: 280 }, "liquid-vapour-dome": { width: 420, height: 280 }, "vapour-quality-line": { width: 420, height: 280 },
    "thermo-cycle": { width: 420, height: 280 }, "pressure-work-area": { width: 420, height: 280 },
  });
});

test("uses one finite shared canvas-SVG-PDF-TikZ scene for every thermodynamic kind", () => {
  const objects: CanvasObject[] = thermodynamicDiagramKinds.map((kind, index) => kind === "thermo-process"
    ? { id: `thermo-shared-${kind}`, kind, x: 80, y: 80 + index * 12, x2: 310, y2: 150 + index * 12, annotations: defaultAnnotations(kind) }
    : { id: `thermo-shared-${kind}`, kind, x: 40 + index * 8, y: 30 + index * 6, ...stampSize(kind), annotations: defaultAnnotations(kind) });
  for (const object of objects) {
    const scene = finiteThermodynamicScene(object);
    const tikz = scientificSceneToTikz(scene);
    assert.ok(tikz.trim(), `${object.kind} TikZ must be generated from the shared scene`);
    const point = thermodynamicRepresentativePoint(scene);
    const coordinate = `(${canvasUnitsToCentimeters(point.x).toFixed(2)},${(-canvasUnitsToCentimeters(point.y)).toFixed(2)})`;
    assert.ok(tikz.includes(coordinate), `${object.kind} shared geometry must preserve representative coordinate ${coordinate}`);
  }
});

test("labels the five programme thermodynamic axes including the Amagat representation", () => {
  const variants = [
    ["P-V", ["P", "V"]], ["P-v", ["P", "v"]], ["P-T", ["P", "T"]], ["T-s", ["T", "s"]],
  ] as const;
  const scenes: Array<NonNullable<ReturnType<typeof scientificSceneFor>>> = [];
  for (const [diagramType, labels] of variants) {
    const scene = finiteThermodynamicScene({ id: `axes-${diagramType}`, kind: "thermo-diagram", x: 30, y: 40, width: 420, height: 280, annotations: { ...defaultAnnotations("thermo-diagram"), diagramType } });
    scenes.push(scene);
    const shortLabels = thermodynamicTexts(scene).filter((value) => value.length <= 18);
    for (const label of labels) assert.ok(shortLabels.some((value) => value === label || value.startsWith(`${label} `) || value.startsWith(`${label}(`)), `${diagramType} must expose the ${label} axis`);
  }
  const amagat = finiteThermodynamicScene({ id: "axes-Amagat", kind: "thermo-diagram", x: 30, y: 40, width: 420, height: 280, annotations: { ...defaultAnnotations("thermo-diagram"), diagramType: "Amagat" } });
  scenes.push(amagat);
  const amagatLabels = thermodynamicTexts(amagat).filter((value) => value.length <= 18).map((value) => value.replace(/[\s_{}$\\]/g, ""));
  assert.ok(amagatLabels.some((value) => value === "P" || value.startsWith("P(")), "an Amagat diagram uses pressure P on one axis");
  assert.ok(amagatLabels.some((value) => value.includes("PV") || (value.includes("P") && value.includes("V"))), "an Amagat diagram exposes the pressure-volume product PV");
  for (let index = 1; index < scenes.length; index += 1) assert.notDeepEqual(scenes[index], scenes[index - 1], "changing the diagram representation must change its shared scene");
});

test("draws the five oriented transformation families with French labels and semantic endpoints", () => {
  const families = [
    ["isobare", "P = cste"], ["isochore", "V = cste"], ["isotherme", "T = cste"], ["adiabatique", "Q = 0"], ["polytropique", "PV^n = cste"],
  ] as const;
  const processes = families.map(([processType, main], index): CanvasObject => ({
    id: `process-${processType}`, kind: "thermo-process", x: 80, y: 80 + index * 20, x2: 330, y2: 150 + index * 20,
    annotations: { ...defaultAnnotations("thermo-process"), processType, main, exponent: "1.35", direction: "directe" },
  }));
  for (const [index, process] of processes.entries()) {
    const scene = finiteThermodynamicScene(process);
    assert.ok(thermodynamicArrowCount(scene) >= 1, `${families[index][0]} must show its thermodynamic direction`);
    assert.ok(thermodynamicTexts(scene).some((value) => value.includes(families[index][1])), `${families[index][0]} must retain its French invariant label`);
    assert.deepEqual(portsFor(process), [{ name: "start", x: process.x, y: process.y }, { name: "end", x: process.x2, y: process.y2 }]);
  }
  assert.equal(new Set(processes.map((process) => JSON.stringify(finiteThermodynamicScene(process)))).size, families.length, "the five thermodynamic laws must not collapse to one generic segment");
  const forward = finiteThermodynamicScene(processes[2]);
  const reverse = finiteThermodynamicScene({ ...processes[2], id: "process-isotherme-reverse", annotations: { ...processes[2].annotations, direction: "inverse" } });
  assert.notDeepEqual(forward, reverse, "inverse direction must move the process arrowhead");
  assert.deepEqual(junctionPointsFor(processes), [], "thermodynamic paths never create electrical junction dots");
});

test("provides thermodynamic state markers and a configurable family of ordered isotherms", () => {
  const state: CanvasObject = { id: "state-1", kind: "thermo-state", x: 170, y: 110, width: 50, height: 50, annotations: defaultAnnotations("thermo-state") };
  const stateScene = finiteThermodynamicScene(state); const stateText = thermodynamicTexts(stateScene).join(" ");
  assert.ok(stateScene.some((primitive) => (primitive.type === "circle" && primitive.fill === "ink") || (primitive.type === "polyline" && primitive.closed && primitive.fill === "ink")), "a state is marked by a visible point");
  for (const label of ["1", "P_1", "V_1", "T_1"]) assert.ok(stateText.includes(label), `default state must expose ${label}`);
  const hiddenCoordinates = finiteThermodynamicScene({ ...state, id: "state-no-coordinates", annotations: { ...state.annotations, showCoordinates: "non" } });
  assert.ok(thermodynamicTexts(hiddenCoordinates).includes("1"));
  assert.ok(!thermodynamicTexts(hiddenCoordinates).join(" ").includes("P_1"));

  const four = finiteThermodynamicScene({ id: "four-isotherms", kind: "thermo-isotherm-family", x: 30, y: 40, width: 420, height: 280, annotations: defaultAnnotations("thermo-isotherm-family") });
  const three = finiteThermodynamicScene({ id: "three-isotherms", kind: "thermo-isotherm-family", x: 30, y: 40, width: 420, height: 280, annotations: { count: "3", main: "T_1 < T_2 < T_3" } });
  assert.ok(thermodynamicCurves(four).length >= 4, "the default isotherm network contains four distinct curved isotherms");
  for (const label of ["T_1", "T_2", "T_3", "T_4"]) assert.ok(thermodynamicTexts(four).includes(label), `the ordered isotherm network must identify ${label}`);
  assert.ok(thermodynamicCurves(three).length >= 3);
  assert.notDeepEqual(four, three, "the count property must change the isotherm network");
  assert.deepEqual(portsFor(state), []);
  assert.deepEqual(junctionPointsFor([state]), []);
});

test("draws the French pure-substance P-T diagram with triple and critical points and three regions", () => {
  const positive = finiteThermodynamicScene({ id: "phase-positive", kind: "phase-diagram-pt", x: 30, y: 40, width: 420, height: 280, annotations: defaultAnnotations("phase-diagram-pt") });
  const negative = finiteThermodynamicScene({ id: "phase-negative", kind: "phase-diagram-pt", x: 30, y: 40, width: 420, height: 280, annotations: { ...defaultAnnotations("phase-diagram-pt"), fusionSlope: "negative" } });
  const text = foldedThermodynamicText(thermodynamicTexts(positive));
  assert.ok(text.includes("solide"));
  assert.ok(text.includes("liquide"));
  assert.ok(text.includes("vapeur") || text.includes("gaz"));
  assert.ok(text.includes("triple") || /(^|\s)t(_|\s|$)/.test(text), "the triple point must be identified in French notation");
  assert.ok(text.includes("critique") || /(^|\s)c(_|\s|$)/.test(text), "the critical point must be identified in French notation");
  assert.ok(positive.filter((primitive) => primitive.type === "circle" || (primitive.type === "polyline" && primitive.closed && primitive.fill === "ink")).length >= 2, "triple and critical points need visible markers");
  assert.notDeepEqual(positive, negative, "positive and negative fusion slopes must have different geometry");
});

test("shares the liquid-vapour dome, vapour-quality line, Carnot cycle, and pressure-work area", () => {
  const dome = finiteThermodynamicScene({ id: "dome", kind: "liquid-vapour-dome", x: 30, y: 40, width: 420, height: 280, annotations: defaultAnnotations("liquid-vapour-dome") });
  const domeText = foldedThermodynamicText(thermodynamicTexts(dome));
  assert.ok(domeText.includes("liquide") && domeText.includes("vapeur"));
  assert.ok(domeText.includes("two-phase") || domeText.includes("equilibrium"));
  assert.ok(thermodynamicTexts(dome).some((value) => value === "C" || value.includes("critique")), "the two saturation branches meet at critical point C");
  assert.ok(thermodynamicCurves(dome).length >= 2 || dome.some((primitive) => primitive.type === "polyline" && primitive.closed), "the saturation branches must visibly form a dome");

  const quality20 = finiteThermodynamicScene({ id: "quality-20", kind: "vapour-quality-line", x: 30, y: 40, width: 420, height: 280, annotations: { quality: "0.2", main: "x = 0,2" } });
  const quality80 = finiteThermodynamicScene({ id: "quality-80", kind: "vapour-quality-line", x: 30, y: 40, width: 420, height: 280, annotations: { quality: "0.8", main: "x = 0,8" } });
  assert.ok(thermodynamicTexts(quality20).some((value) => value.includes("0,2")));
  assert.ok(thermodynamicTexts(quality80).some((value) => value.includes("0,8")));
  assert.notDeepEqual(quality20, quality80, "vapour quality changes the isotitre position inside the dome");

  const motor = finiteThermodynamicScene({ id: "carnot-motor", kind: "thermo-cycle", x: 30, y: 40, width: 420, height: 280, annotations: defaultAnnotations("thermo-cycle") });
  const receiver = finiteThermodynamicScene({ id: "carnot-receiver", kind: "thermo-cycle", x: 30, y: 40, width: 420, height: 280, annotations: { ...defaultAnnotations("thermo-cycle"), direction: "récepteur" } });
  const cycleText = thermodynamicTexts(motor).join(" ");
  for (const label of ["1", "2", "3", "4"]) assert.ok(cycleText.includes(label), `Carnot cycle must label state ${label}`);
  assert.ok(cycleText.includes("Carnot"));
  assert.ok(thermodynamicArrowCount(motor) >= 4, "all four Carnot transformations must expose their direction");
  assert.notDeepEqual(motor, receiver, "motor and receiver conventions reverse the cycle arrows");

  const work = finiteThermodynamicScene({ id: "work-area", kind: "pressure-work-area", x: 30, y: 40, width: 420, height: 280, annotations: defaultAnnotations("pressure-work-area") });
  assert.ok(work.some((primitive) => (primitive.type === "polyline" || primitive.type === "rect" || primitive.type === "circle" || primitive.type === "ellipse") && primitive.fill === "light"), "pressure work must be shown as a lightly shaded signed area");
  assert.ok(thermodynamicTexts(work).some((value) => value.includes("W") && value.includes("P") && value.includes("dV")));
  for (const scene of [dome, quality20, motor, work]) assert.ok(scientificSceneToTikz(scene).trim());
});

test("provides four lossless French concours thermodynamics templates covering all nine tools", () => {
  const expectations: Array<{ id: string; kinds: ObjectKind[] }> = [
    { id: "clapeyron-gas-transformations", kinds: ["thermo-diagram", "thermo-state", "thermo-process", "thermo-isotherm-family", "pressure-work-area"] },
    { id: "pure-substance-phase-diagram", kinds: ["phase-diagram-pt"] },
    { id: "liquid-vapour-equilibrium-dome", kinds: ["liquid-vapour-dome", "vapour-quality-line", "thermo-state"] },
    { id: "carnot-cycle-clapeyron", kinds: ["thermo-diagram", "thermo-cycle", "thermo-state", "pressure-work-area"] },
  ];
  const templates = expectations.map((expected) => {
    const template = diagramTemplates.find((candidate) => candidate.id === expected.id);
    assert.ok(template, expected.id);
    assert.ok(expected.kinds.every((kind) => template.objects.some((object) => object.kind === kind)), `${expected.id}: ${expected.kinds.filter((kind) => !template.objects.some((object) => object.kind === kind)).join(", ")}`);
    return template;
  });
  const coveredKinds = new Set(templates.flatMap((template) => template.objects.map((object) => object.kind)));
  assert.ok(thermodynamicDiagramKinds.every((kind) => coveredKinds.has(kind)), thermodynamicDiagramKinds.filter((kind) => !coveredKinds.has(kind)).join(", "));
  assert.ok(templates.every((template) => template.category === "Thermodynamics"));
  assert.ok(templates[0].objects.some((object) => object.kind === "thermo-process" && object.annotations?.processType));
  assert.ok(templates[3].objects.some((object) => object.kind === "thermo-cycle" && object.annotations?.cycleType === "Carnot"));

  for (const template of templates) {
    const originalIds = new Set(template.objects.map((object) => object.id));
    assert.equal(originalIds.size, template.objects.length, `${template.id} ids`);
    for (const object of template.objects.filter((candidate) => thermodynamicDiagramKinds.includes(candidate.kind))) finiteThermodynamicScene(object);
    for (const object of template.objects) for (const [targetId, targetPort] of [[object.bindings?.startId, object.bindings?.startPort], [object.bindings?.endId, object.bindings?.endPort]] as const) {
      if (!targetId) continue;
      const target = template.objects.find((candidate) => candidate.id === targetId);
      assert.ok(target, `${template.id}/${object.id} target ${targetId}`);
      assert.ok(targetPort && portsFor(target).some((port) => port.name === targetPort), `${template.id}/${object.id} port ${targetPort ?? "missing"}`);
    }
    assert.deepEqual(junctionPointsFor(template.objects), []);
    const roundTrip = roundTripReport(documentFor(template.objects), template.objects);
    assert.equal(roundTrip.ok, true, `${template.id}: ${roundTrip.message}`);

    const cloned = cloneTemplateObjects(template); const clonedIds = new Set(cloned.map((object) => object.id));
    assert.equal(cloned.length, template.objects.length);
    assert.equal(clonedIds.size, cloned.length);
    assert.ok([...clonedIds].every((id) => !originalIds.has(id)));
    const remappedIds = new Map(template.objects.map((object, index) => [object.id, cloned[index].id]));
    template.objects.forEach((object, index) => {
      assert.equal(cloned[index].bindings?.startId, object.bindings?.startId ? remappedIds.get(object.bindings.startId) : undefined, `${template.id}/${object.id} start`);
      assert.equal(cloned[index].bindings?.endId, object.bindings?.endId ? remappedIds.get(object.bindings.endId) : undefined, `${template.id}/${object.id} end`);
      assert.equal(cloned[index].bindings?.startPort, object.bindings?.startPort, `${template.id}/${object.id} start port`);
      assert.equal(cloned[index].bindings?.endPort, object.bindings?.endPort, `${template.id}/${object.id} end port`);
    });
  }
});

const electromagneticInductionKinds = [
  "uniform-field-region", "field-map", "oriented-current-loop", "magnetic-dipole", "charged-particle-trajectory",
  "laplace-rails", "rotating-rectangular-loop", "faraday-magnet-coil", "coupled-coils", "electromechanical-converter",
] satisfies ObjectKind[];

const electromagneticObject = (kind: ObjectKind, index = 0): CanvasObject => kind === "charged-particle-trajectory"
  ? { id: `em-${kind}-${index}`, kind, x: 70, y: 130, x2: 330, y2: 130, annotations: defaultAnnotations(kind) }
  : { id: `em-${kind}-${index}`, kind, x: 45 + index * 7, y: 35 + index * 5, ...stampSize(kind), annotations: defaultAnnotations(kind) };

const finiteElectromagneticScene = (object: CanvasObject) => {
  const scene = scientificSceneFor(object);
  assert.ok(scene?.length, `${object.kind} must have a non-empty shared scientific scene`);
  const inspect = (value: unknown, path: string): void => {
    if (typeof value === "number") {
      assert.ok(Number.isFinite(value), `${object.kind} has a non-finite value at ${path}`);
      return;
    }
    if (Array.isArray(value)) value.forEach((entry, index) => inspect(entry, `${path}[${index}]`));
    else if (value && typeof value === "object") Object.entries(value).forEach(([key, entry]) => inspect(entry, `${path}.${key}`));
  };
  inspect(scene, "scene");
  return scene;
};

const electromagneticTexts = (scene: NonNullable<ReturnType<typeof scientificSceneFor>>) => scene
  .filter((primitive) => primitive.type === "text")
  .map((primitive) => primitive.value);

const electromagneticRepresentativePoint = (scene: NonNullable<ReturnType<typeof scientificSceneFor>>) => {
  const primitive = scene[0];
  if (primitive.type === "line") return { x: primitive.x1, y: primitive.y1 };
  if (primitive.type === "circle" || primitive.type === "ellipse" || primitive.type === "arc") return { x: primitive.cx, y: primitive.cy };
  if (primitive.type === "rect" || primitive.type === "text") return { x: primitive.x, y: primitive.y };
  if (primitive.type === "polyline") return primitive.points[0];
  return primitive.start;
};

const electromagneticArrowCount = (scene: NonNullable<ReturnType<typeof scientificSceneFor>>) => scene.filter((primitive) =>
  ((primitive.type === "line" || primitive.type === "bezier" || primitive.type === "arc") && primitive.arrowEnd === true)
  || (primitive.type === "polyline" && primitive.closed === true && primitive.fill === "ink" && primitive.points.length <= 5),
).length;

const electromagneticLargestCurveBend = (scene: NonNullable<ReturnType<typeof scientificSceneFor>>) => {
  const candidates: Array<{ span: number; bend: number }> = [];
  for (const primitive of scene) {
    if (primitive.type === "bezier") {
      const chord = { x: primitive.end.x - primitive.start.x, y: primitive.end.y - primitive.start.y };
      const middle = { x: (primitive.control1.x + primitive.control2.x) / 2, y: (primitive.control1.y + primitive.control2.y) / 2 };
      candidates.push({ span: Math.hypot(chord.x, chord.y), bend: chord.x * (middle.y - primitive.start.y) - chord.y * (middle.x - primitive.start.x) });
    } else if (primitive.type === "polyline" && !primitive.closed && primitive.points.length >= 3) {
      const start = primitive.points[0]; const end = primitive.points.at(-1)!; const middle = primitive.points[Math.floor(primitive.points.length / 2)];
      const chord = { x: end.x - start.x, y: end.y - start.y };
      candidates.push({ span: Math.hypot(chord.x, chord.y), bend: chord.x * (middle.y - start.y) - chord.y * (middle.x - start.x) });
    } else if (primitive.type === "arc") {
      const startAngle = primitive.start * Math.PI / 180; const endAngle = primitive.end * Math.PI / 180; const middleAngle = (primitive.start + primitive.end) * Math.PI / 360;
      const start = { x: primitive.cx + Math.cos(startAngle) * primitive.r, y: primitive.cy + Math.sin(startAngle) * primitive.r };
      const end = { x: primitive.cx + Math.cos(endAngle) * primitive.r, y: primitive.cy + Math.sin(endAngle) * primitive.r };
      const middle = { x: primitive.cx + Math.cos(middleAngle) * primitive.r, y: primitive.cy + Math.sin(middleAngle) * primitive.r };
      const chord = { x: end.x - start.x, y: end.y - start.y };
      candidates.push({ span: primitive.r * Math.abs(endAngle - startAngle), bend: chord.x * (middle.y - start.y) - chord.y * (middle.x - start.x) });
    }
  }
  return candidates.toSorted((left, right) => right.span - left.span)[0]?.bend;
};

const horizontalArrowDirections = (scene: NonNullable<ReturnType<typeof scientificSceneFor>>) => scene
  .filter((primitive) => primitive.type === "line" && primitive.arrowEnd && Math.abs(primitive.x2 - primitive.x1) > Math.abs(primitive.y2 - primitive.y1) * 1.5)
  .map((primitive) => Math.sign(primitive.x2 - primitive.x1))
  .filter((direction) => direction !== 0);

const directedArcSigns = (scene: NonNullable<ReturnType<typeof scientificSceneFor>>) => scene
  .filter((primitive) => primitive.type === "arc" && primitive.arrowEnd)
  .map((primitive) => Math.sign(primitive.end - primitive.start))
  .filter((direction) => direction !== 0);

test("registers the ten French CPGE induction and electromechanical tools with exact defaults and sizes", () => {
  const group = toolboxGroups.find((candidate) => candidate.title === "Induction & electromechanical conversion");
  assert.ok(group);
  assert.deepEqual(group.kinds, electromagneticInductionKinds);
  assert.equal(toolboxGroups.flatMap((candidate) => candidate.kinds).filter((kind) => kind === "laplace-rails").length, 1, "Laplace rails must not be duplicated across toolbox groups");
  assert.deepEqual(connectorKinds.filter((kind) => electromagneticInductionKinds.includes(kind)), ["charged-particle-trajectory"]);
  assert.deepEqual(stampKinds.filter((kind) => electromagneticInductionKinds.includes(kind)), [
    "uniform-field-region", "field-map", "oriented-current-loop", "magnetic-dipole", "laplace-rails",
    "rotating-rectangular-loop", "faraday-magnet-coil", "coupled-coils", "electromechanical-converter",
  ]);
  assert.deepEqual(defaultAnnotations("uniform-field-region"), { fieldType: "magnetic", direction: "outward", main: "B", density: "5" });
  assert.deepEqual(defaultAnnotations("field-map"), { fieldType: "magnetic", sourceType: "uniform", representation: "vectors", main: "B", density: "5" });
  assert.deepEqual(defaultAnnotations("oriented-current-loop"), { loopShape: "circular", current: "i", normal: "n", orientation: "counterclockwise", showMoment: "yes" });
  assert.deepEqual(defaultAnnotations("magnetic-dipole"), { main: "m", field: "B", angle: "θ", torque: "Γ" });
  assert.deepEqual(defaultAnnotations("charged-particle-trajectory"), { charge: "q > 0", velocity: "v_0", field: "B", trajectoryType: "circular", main: "q" });
  assert.deepEqual(defaultAnnotations("laplace-rails"), { velocity: "v", current: "i", field: "B", force: "F_L" });
  assert.deepEqual(defaultAnnotations("rotating-rectangular-loop"), { current: "i", field: "B", flux: "Φ", angle: "θ", angularSpeed: "ω" });
  assert.deepEqual(defaultAnnotations("faraday-magnet-coil"), { motion: "approach", emf: "e", current: "i", flux: "Φ", law: "Lenz" });
  assert.deepEqual(defaultAnnotations("coupled-coils"), { primary: "N_1", secondary: "N_2", current1: "i_1", current2: "i_2", mutual: "M", dotConvention: "yes" });
  assert.deepEqual(defaultAnnotations("electromechanical-converter"), { mode: "motor", voltage: "u", current: "i", torque: "C_m", angularSpeed: "ω", power: "P_em" });
  assert.deepEqual(Object.fromEntries(electromagneticInductionKinds.filter((kind) => kind !== "charged-particle-trajectory").map((kind) => [kind, stampSize(kind)])), {
    "uniform-field-region": { width: 260, height: 180 }, "field-map": { width: 320, height: 240 }, "oriented-current-loop": { width: 220, height: 180 },
    "magnetic-dipole": { width: 180, height: 140 }, "laplace-rails": { width: 140, height: 90 }, "rotating-rectangular-loop": { width: 280, height: 220 },
    "faraday-magnet-coil": { width: 340, height: 200 }, "coupled-coils": { width: 320, height: 200 }, "electromechanical-converter": { width: 300, height: 180 },
  });
});

test("uses one finite shared canvas-SVG-PDF-TikZ scene for all ten electromagnetic kinds", () => {
  const objects = electromagneticInductionKinds.map(electromagneticObject);
  for (const object of objects) {
    const scene = finiteElectromagneticScene(object);
    const tikz = scientificSceneToTikz(scene);
    assert.ok(tikz.trim(), `${object.kind} TikZ must be generated from the shared scene`);
    const point = electromagneticRepresentativePoint(scene);
    const coordinate = `(${canvasUnitsToCentimeters(point.x).toFixed(2)},${(-canvasUnitsToCentimeters(point.y)).toFixed(2)})`;
    assert.ok(tikz.includes(coordinate), `${object.kind} must preserve shared representative coordinate ${coordinate}`);
  }
  assert.deepEqual(junctionPointsFor(objects), [], "field and induction diagrams never create electrical junction dots");
});

test("uses the French dot and cross conventions for outgoing and incoming magnetic fields", () => {
  const outgoing = finiteElectromagneticScene(electromagneticObject("uniform-field-region"));
  const incoming = finiteElectromagneticScene({ ...electromagneticObject("uniform-field-region", 1), annotations: { ...defaultAnnotations("uniform-field-region"), direction: "entrant" } });
  const outgoingDots = outgoing.filter((primitive) => primitive.type === "circle" && primitive.fill === "ink");
  const incomingCrossStrokes = incoming.filter((primitive) => primitive.type === "line"
    && Math.abs(primitive.x2 - primitive.x1) > 1 && Math.abs(primitive.y2 - primitive.y1) > 1);
  assert.ok(outgoingDots.length >= 3, "a French outgoing magnetic field is represented by repeated ⊙ dots");
  assert.ok(incomingCrossStrokes.length >= 6 && incomingCrossStrokes.length % 2 === 0, "a French incoming magnetic field is represented by paired ⊗ strokes");
  assert.notDeepEqual(outgoing, incoming);
  assert.ok(electromagneticTexts(outgoing).includes("B"));
  assert.ok(electromagneticTexts(incoming).includes("B"));
});

test("draws distinct finite field maps for the four programme source models", () => {
  const sourceTypes = ["uniforme", "fil rectiligne", "spire", "dipôle"];
  const scenes = sourceTypes.map((sourceType, index) => finiteElectromagneticScene({
    ...electromagneticObject("field-map", index),
    annotations: { ...defaultAnnotations("field-map"), sourceType, representation: "lignes de champ" },
  }));
  assert.equal(new Set(scenes.map((scene) => JSON.stringify(scene))).size, sourceTypes.length, "each source type needs its own field topology");
  for (const [index, scene] of scenes.entries()) {
    assert.ok(scene.filter((primitive) => primitive.type !== "text").length >= 4, `${sourceTypes[index]} needs a visible source and field`);
    assert.ok(electromagneticTexts(scene).some((value) => value.includes("B")), `${sourceTypes[index]} retains the magnetic-field label`);
    assert.ok(scientificSceneToTikz(scene).trim());
  }
});

test("orients a current loop and exposes its current, normal, and magnetic moment", () => {
  const anticlockwise = finiteElectromagneticScene(electromagneticObject("oriented-current-loop"));
  const clockwise = finiteElectromagneticScene({
    ...electromagneticObject("oriented-current-loop", 1),
    annotations: { ...defaultAnnotations("oriented-current-loop"), orientation: "horaire" },
  });
  const labels = electromagneticTexts(anticlockwise);
  for (const value of ["i", "n", "m"]) assert.ok(labels.some((label) => label === value || label.includes(value)), `the oriented loop must show ${value}`);
  assert.ok(electromagneticArrowCount(anticlockwise) >= 2, "current and oriented normal/moment need arrowheads");
  assert.notDeepEqual(anticlockwise, clockwise, "clockwise and trigonometric current conventions must reverse the current arrow");
  const anticlockwiseArcs = directedArcSigns(anticlockwise); const clockwiseArcs = directedArcSigns(clockwise);
  assert.ok(anticlockwiseArcs.length && clockwiseArcs.length);
  assert.ok(anticlockwiseArcs.some((left) => clockwiseArcs.some((right) => left * right < 0)), "current-loop orientation reverses a directed arc");
});

test("draws the applied field, moment, angle, and torque of a magnetic dipole", () => {
  const scene = finiteElectromagneticScene(electromagneticObject("magnetic-dipole"));
  const labels = electromagneticTexts(scene);
  for (const value of ["B", "m", "θ", "Γ"]) assert.ok(labels.some((label) => label.includes(value)), `magnetic dipole must expose ${value}`);
  assert.ok(scene.some((primitive) => primitive.type === "arc" && primitive.arrowEnd), "the electromagnetic torque must be an oriented arc");
  assert.ok(electromagneticArrowCount(scene) >= 3, "B, m, and Γ must remain directed quantities");
});

test("keeps charged-particle trajectories endpoint-driven and reverses curvature with charge sign", () => {
  const positive = electromagneticObject("charged-particle-trajectory");
  const negative: CanvasObject = { ...positive, id: "em-negative-charge", annotations: { ...positive.annotations, charge: "q < 0" } };
  assert.deepEqual(portsFor(positive), [{ name: "start", x: 70, y: 130 }, { name: "end", x: 330, y: 130 }]);
  assert.deepEqual(connectorKinds.filter((kind) => electromagneticInductionKinds.includes(kind)), ["charged-particle-trajectory"]);
  const positiveScene = finiteElectromagneticScene(positive); const negativeScene = finiteElectromagneticScene(negative);
  assert.ok(electromagneticArrowCount(positiveScene) >= 2, "the initial velocity and trajectory direction must be visible");
  const positiveBend = electromagneticLargestCurveBend(positiveScene); const negativeBend = electromagneticLargestCurveBend(negativeScene);
  assert.notEqual(positiveBend, undefined); assert.notEqual(negativeBend, undefined);
  assert.ok(Math.abs(positiveBend!) > 1 && Math.abs(negativeBend!) > 1, "a circular trajectory must visibly depart from its endpoint chord");
  assert.ok(positiveBend! * negativeBend! < 0, "positive and negative charges bend to opposite sides in the same magnetic field");
  assert.notDeepEqual(positiveScene, negativeScene);
  assert.deepEqual(junctionPointsFor([positive, negative]), [], "trajectory endpoints are semantic ports, never circuit junctions");
});

test("labels the complete French Laplace-rails construction", () => {
  const rails = electromagneticObject("laplace-rails"); const scene = finiteElectromagneticScene(rails); const labels = electromagneticTexts(scene);
  for (const value of ["i", "B", "v", "F_L"]) assert.ok(labels.some((label) => label.includes(value)), `Laplace rails must expose ${value}`);
  assert.ok(electromagneticArrowCount(scene) >= 3, "current, velocity, and Laplace force must be oriented");
  assert.deepEqual(portsFor(rails), []);
});

test("draws a rotating loop with flux, angle, angular speed, and semantic coil ports", () => {
  const loop = electromagneticObject("rotating-rectangular-loop"); const scene = finiteElectromagneticScene(loop); const labels = electromagneticTexts(scene);
  for (const value of ["Φ", "θ", "ω"]) assert.ok(labels.some((label) => label.includes(value)), `rotating loop must expose ${value}`);
  assert.ok(electromagneticArrowCount(scene) >= 3, "current, field, and rotation remain oriented");
  assert.deepEqual(portsFor(loop), [
    { name: "coil-start", x: loop.x, y: loop.y + loop.height! * .82 },
    { name: "coil-end", x: loop.x + loop.width!, y: loop.y + loop.height! * .82 },
  ]);
});

test("reverses Faraday-Lenz motion and induced current between approach and recession", () => {
  const approaching = electromagneticObject("faraday-magnet-coil");
  const receding: CanvasObject = { ...approaching, id: "em-faraday-receding", annotations: { ...approaching.annotations, motion: "éloignement" } };
  const approachScene = finiteElectromagneticScene(approaching); const recessionScene = finiteElectromagneticScene(receding);
  for (const value of ["e", "i", "Φ", "Lenz"]) assert.ok(electromagneticTexts(approachScene).some((label) => label.includes(value)), `Faraday-Lenz scene must expose ${value}`);
  const approachMotion = horizontalArrowDirections(approachScene); const recessionMotion = horizontalArrowDirections(recessionScene);
  assert.ok(approachMotion.some((left) => recessionMotion.some((right) => left * right < 0)), "approach and recession reverse the relative-motion arrow");
  const approachCurrent = directedArcSigns(approachScene); const recessionCurrent = directedArcSigns(recessionScene);
  assert.ok(approachCurrent.some((left) => recessionCurrent.some((right) => left * right < 0)), "Lenz's law reverses the induced-current arrow");
  assert.notDeepEqual(approachScene, recessionScene);
  assert.deepEqual(portsFor(approaching), [
    { name: "coil-start", x: approaching.x + approaching.width!, y: approaching.y + approaching.height! * .3 },
    { name: "coil-end", x: approaching.x + approaching.width!, y: approaching.y + approaching.height! * .7 },
  ]);
});

test("uses four winding ports and the French dot convention for mutually coupled coils", () => {
  const coupled = electromagneticObject("coupled-coils"); const withDots = finiteElectromagneticScene(coupled);
  const withoutDots = finiteElectromagneticScene({ ...coupled, id: "em-coupled-no-dots", annotations: { ...coupled.annotations, dotConvention: "non" } });
  assert.deepEqual(portsFor(coupled), [
    { name: "primary-top", x: coupled.x, y: coupled.y + coupled.height! * .25 },
    { name: "primary-bottom", x: coupled.x, y: coupled.y + coupled.height! * .75 },
    { name: "secondary-top", x: coupled.x + coupled.width!, y: coupled.y + coupled.height! * .25 },
    { name: "secondary-bottom", x: coupled.x + coupled.width!, y: coupled.y + coupled.height! * .75 },
  ]);
  for (const value of ["N_1", "N_2", "i_1", "i_2", "M"]) assert.ok(electromagneticTexts(withDots).some((label) => label.includes(value)), `coupled coils must expose ${value}`);
  const dotCount = (scene: NonNullable<ReturnType<typeof scientificSceneFor>>) => scene.filter((primitive) => primitive.type === "circle" && primitive.fill === "ink").length;
  assert.ok(dotCount(withDots) >= dotCount(withoutDots) + 2, "the enabled convention adds one polarity dot to each winding");
  assert.notDeepEqual(withDots, withoutDots);
});

test("reverses electromechanical power flow between motor and generator modes", () => {
  const motor = electromagneticObject("electromechanical-converter");
  const generator: CanvasObject = { ...motor, id: "em-generator", annotations: { ...motor.annotations, mode: "génératrice" } };
  const motorScene = finiteElectromagneticScene(motor); const generatorScene = finiteElectromagneticScene(generator);
  for (const value of ["u", "i", "C_m", "ω", "P_em"]) assert.ok(electromagneticTexts(motorScene).some((label) => label.includes(value)), `converter must expose ${value}`);
  assert.deepEqual(portsFor(motor), [
    { name: "electrical-plus", x: motor.x, y: motor.y + motor.height! * .35 },
    { name: "electrical-minus", x: motor.x, y: motor.y + motor.height! * .65 },
    { name: "mechanical", x: motor.x + motor.width!, y: motor.y + motor.height! / 2 },
  ]);
  const motorFlow = horizontalArrowDirections(motorScene); const generatorFlow = horizontalArrowDirections(generatorScene);
  assert.ok(motorFlow.some((left) => generatorFlow.some((right) => left * right < 0)), "generator mode reverses electrical/mechanical power-flow arrows");
  assert.notDeepEqual(motorScene, generatorScene);
});

test("provides five lossless French induction templates covering all ten electromagnetic tools", () => {
  const expectations: Array<{ id: string; requiredKinds: ObjectKind[] }> = [
    { id: "lorentz-circular-motion", requiredKinds: ["uniform-field-region", "charged-particle-trajectory"] },
    { id: "laplace-rails-induction", requiredKinds: ["uniform-field-region", "laplace-rails"] },
    { id: "faraday-lenz-magnet-coil", requiredKinds: ["faraday-magnet-coil"] },
    { id: "mutual-induction-coupled-coils", requiredKinds: ["coupled-coils"] },
    { id: "rotating-loop-electromechanical-conversion", requiredKinds: ["rotating-rectangular-loop", "electromechanical-converter"] },
  ];
  const templates = expectations.map((expected) => {
    const template = diagramTemplates.find((candidate) => candidate.id === expected.id);
    assert.ok(template, expected.id);
    assert.ok(expected.requiredKinds.every((kind) => template.objects.some((object) => object.kind === kind)), `${expected.id}: ${expected.requiredKinds.filter((kind) => !template.objects.some((object) => object.kind === kind)).join(", ")}`);
    return template;
  });
  const coveredKinds = new Set(templates.flatMap((template) => template.objects.map((object) => object.kind)));
  assert.ok(electromagneticInductionKinds.every((kind) => coveredKinds.has(kind)), electromagneticInductionKinds.filter((kind) => !coveredKinds.has(kind)).join(", "));

  for (const template of templates) {
    const originalIds = new Set(template.objects.map((object) => object.id));
    assert.equal(originalIds.size, template.objects.length, `${template.id} ids`);
    for (const object of template.objects.filter((candidate) => electromagneticInductionKinds.includes(candidate.kind))) finiteElectromagneticScene(object);
    for (const object of template.objects) for (const [targetId, targetPort] of [[object.bindings?.startId, object.bindings?.startPort], [object.bindings?.endId, object.bindings?.endPort]] as const) {
      if (!targetId) continue;
      const target = template.objects.find((candidate) => candidate.id === targetId);
      assert.ok(target, `${template.id}/${object.id} target ${targetId}`);
      assert.ok(targetPort && portsFor(target).some((port) => port.name === targetPort), `${template.id}/${object.id} port ${targetPort ?? "missing"}`);
    }
    assert.deepEqual(junctionPointsFor(template.objects), [], `${template.id} must not invent electrical junctions`);
    const roundTrip = roundTripReport(documentFor(template.objects), template.objects);
    assert.equal(roundTrip.ok, true, `${template.id}: ${roundTrip.message}`);

    const cloned = cloneTemplateObjects(template); const clonedIds = new Set(cloned.map((object) => object.id));
    assert.equal(cloned.length, template.objects.length);
    assert.equal(clonedIds.size, cloned.length);
    assert.ok([...clonedIds].every((id) => !originalIds.has(id)));
    const remappedIds = new Map(template.objects.map((object, index) => [object.id, cloned[index].id]));
    template.objects.forEach((object, index) => {
      assert.equal(cloned[index].bindings?.startId, object.bindings?.startId ? remappedIds.get(object.bindings.startId) : undefined, `${template.id}/${object.id} start`);
      assert.equal(cloned[index].bindings?.endId, object.bindings?.endId ? remappedIds.get(object.bindings.endId) : undefined, `${template.id}/${object.id} end`);
      assert.equal(cloned[index].bindings?.startPort, object.bindings?.startPort, `${template.id}/${object.id} start port`);
      assert.equal(cloned[index].bindings?.endPort, object.bindings?.endPort, `${template.id}/${object.id} end port`);
    });
  }
});
