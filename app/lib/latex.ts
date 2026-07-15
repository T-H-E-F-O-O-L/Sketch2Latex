import { annotation, connectorKinds, defaultAnnotations, labels, type CanvasObject, type DocumentSettings, type Point } from "./canvas-types";
import { circuitGeometry } from "./circuit-geometry";
import { CANVAS_UNITS_PER_CM, TIKZ_ARROW_TIP, TIKZ_DASH_PATTERN, TIKZ_LABEL_SIZE, TIKZ_NORMAL_STROKE, tikzStrokeWidth } from "./concours-style";
import { JUNCTION_RADIUS, junctionPointsFor } from "./connection-geometry";
import { scientificSceneFor, scientificSceneToTikz } from "./scientific-scene";
import { GRAPH_TIKZ_STYLES, graphPointSetsFor } from "./graph";

const SCALE = CANVAS_UNITS_PER_CM;
const n = (value: number) => (Math.round((value / SCALE) * 100) / 100).toFixed(2);
const isPlainTextFormula = (value: string) => /\p{L}/u.test(value) && /^[\p{L}\p{N}\s.,;:!?'’"()-]+$/u.test(value);
const latexFormula = (value: string) => {
  const source = value.trim();
  return isPlainTextFormula(source) ? `\\text{${source.replace(/[{}]/g, "\\$&")}}` : source;
};
const point = (x: number, y: number) => `(${n(x)},${n(-y)})`;
const end = (object: CanvasObject) => point(object.x2 ?? object.x, object.y2 ?? object.y);

function safeText(value = "") {
  if (value.includes("$")) return value;
  return value.replace(/\\/g, "\\textbackslash{} ").replace(/([#%&_{}])/g, "\\$1");
}

function componentLabel(value: string) {
  if (value.includes("$")) return value;
  const unicodeSubscripts: Record<string, string> = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9", "₊": "+", "₋": "-" };
  const unicode = value.match(/^(.*?)([₀-₉₊₋]+)$/u);
  if (unicode) return `$${safeText(unicode[1])}_{${[...unicode[2]].map((character) => unicodeSubscripts[character]).join("")}}$`;
  const underscore = value.match(/^(.*?)_([^_]+)$/);
  return underscore ? `$${safeText(underscore[1])}_{${safeText(underscore[2])}}$` : `$${safeText(value)}$`;
}

function simplify(points: Point[], tolerance = 1.5): Point[] {
  if (points.length < 3) return points;
  const first = points[0]; const last = points[points.length - 1];
  const dx = last.x - first.x; const dy = last.y - first.y; const lengthSquared = dx * dx + dy * dy;
  let index = -1; let maximum = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const p = points[i];
    const distance = lengthSquared === 0 ? Math.hypot(p.x - first.x, p.y - first.y) : Math.abs(dy * p.x - dx * p.y + last.x * first.y - last.y * first.x) / Math.sqrt(lengthSquared);
    if (distance > maximum) { maximum = distance; index = i; }
  }
  if (maximum <= tolerance || index < 0) return [first, last];
  return [...simplify(points.slice(0, index + 1), tolerance), ...simplify(points.slice(index), tolerance).slice(1)];
}

function bondLines(object: CanvasObject, count: number) {
  const x1 = object.x; const y1 = object.y; const x2 = object.x2 ?? x1; const y2 = object.y2 ?? y1;
  const length = Math.hypot(x2 - x1, y2 - y1) || 1; const px = (-(y2 - y1) / length) * 4; const py = ((x2 - x1) / length) * 4;
  const offsets = count === 1 ? [0] : count === 2 ? [-1, 1] : [-2, 0, 2];
  return offsets.map((offset) => `\\draw ${point(x1 + px * offset, y1 + py * offset)} -- ${point(x2 + px * offset, y2 + py * offset)};`).join("\n");
}

function connectorScope(object: CanvasObject, body: string) {
  const x2 = object.x2 ?? object.x; const y2 = object.y2 ?? object.y;
  const midpoint = point((object.x + x2) / 2, (object.y + y2) / 2);
  const rotation = (Math.atan2(-(y2 - object.y), x2 - object.x) * 180) / Math.PI;
  return `\\begin{scope}[shift={${midpoint}}, rotate=${matrixNumber(rotation)}]\n${body}\n\\end{scope}`;
}

function lensConnector(object: CanvasObject) {
  const x2 = object.x2 ?? object.x; const y2 = object.y2 ?? object.y; const dx = x2 - object.x; const dy = y2 - object.y; const length = Math.hypot(dx, dy) || 1; const ux = dx / length; const uy = dy / length; const px = -uy; const py = ux;
  const arrowLength = Math.min(18, Math.max(8, length * .25)); const arrowWidth = Math.min(9, Math.max(5, arrowLength * .55));
  const pointAt = (base: Point, along: number, across: number) => ({ x: base.x + ux * along + px * across, y: base.y + uy * along + py * across });
  const startTip = pointAt({ x: object.x, y: object.y }, object.kind === "lens" ? 0 : arrowLength, 0); const startBase = pointAt({ x: object.x, y: object.y }, object.kind === "lens" ? arrowLength : 0, 0);
  const endTip = pointAt({ x: x2, y: y2 }, object.kind === "lens" ? 0 : -arrowLength, 0); const endBase = pointAt({ x: x2, y: y2 }, object.kind === "lens" ? -arrowLength : 0, 0);
  const triangle = (tip: Point, base: Point) => `\\fill ${point(base.x + px * arrowWidth, base.y + py * arrowWidth)} -- ${point(tip.x, tip.y)} -- ${point(base.x - px * arrowWidth, base.y - py * arrowWidth)} -- cycle;`;
  return `\\draw ${point(object.x, object.y)} -- ${point(x2, y2)}; ${triangle(startTip, startBase)} ${triangle(endTip, endBase)}`;
}

function electricalConnector(object: CanvasObject) {
  const x2 = object.x2 ?? object.x; const y2 = object.y2 ?? object.y; const length = Math.hypot(x2 - object.x, y2 - object.y);
  const halfLength = n(length / 2); const label = (fallback: string) => componentLabel(annotation(object, "main", fallback));
  if (object.kind === "resistor") {
    const g = circuitGeometry.resistor;
    return connectorScope(object, `\\draw (-${halfLength},0) -- (${halfLength},0);\n\\draw[fill=white,rounded corners=${n(1.5)}] (-${n(g.halfBody)},-${n(g.halfHeight)}) rectangle (${n(g.halfBody)},${n(g.halfHeight)});\n\\node at (0,${n(g.labelOffset)}) {${label("R")}};`);
  }
  if (object.kind === "inductor") {
    const g = circuitGeometry.inductor; const turnWidth = (g.halfBody * 2) / g.turns;
    const turns = Array.from({ length: g.turns }, (_, index) => { const start = -g.halfBody + index * turnWidth; const end = start + turnWidth; return `.. controls (${n(start + turnWidth / 3)},${n((g.halfHeight * 2) / 3)}) and (${n(end - turnWidth / 3)},${n((g.halfHeight * 2) / 3)}) .. (${n(end)},0)`; }).join(" ");
    return connectorScope(object, `\\draw (-${halfLength},0) -- (-${n(g.halfBody)},0);\n\\draw (-${n(g.halfBody)},0) ${turns};\n\\draw (${n(g.halfBody)},0) -- (${halfLength},0);\n\\node at (0,${n(g.labelOffset)}) {${label("L")}};`);
  }
  if (object.kind === "capacitor" || object.kind === "battery") {
    const g = object.kind === "battery" ? circuitGeometry.battery : circuitGeometry.capacitor;
    const negativeHalfPlate = "negativeHalfPlate" in g ? g.negativeHalfPlate : g.halfPlate; const positiveHalfPlate = "positiveHalfPlate" in g ? g.positiveHalfPlate : g.halfPlate;
    const capacitorLabel = object.kind === "capacitor" ? `\n\\node at (0,-${n(g.labelOffset)}) {${label("C")}};` : "";
    return connectorScope(object, `\\draw (-${halfLength},0) -- (${halfLength},0);\n\\draw (-${n(g.negativePlateOffset)},-${n(negativeHalfPlate)}) -- (-${n(g.negativePlateOffset)},${n(negativeHalfPlate)});\n\\draw (${n(g.positivePlateOffset)},-${n(positiveHalfPlate)}) -- (${n(g.positivePlateOffset)},${n(positiveHalfPlate)});${capacitorLabel}`);
  }
  if (object.kind === "switch") {
    const g = circuitGeometry.switch;
    return connectorScope(object, `\\draw (-${halfLength},0) -- (-${n(g.leftGap)},0);\n\\draw (${n(g.rightGap)},0) -- (${halfLength},0);\n\\fill (-${n(g.leftGap)},0) circle (${n(3)});\n\\draw (-${n(g.leftGap)},0) -- (${n(g.bladeLength)},${n(g.bladeLift)});`);
  }
  return "";
}

function tikzStyle(object: CanvasObject) {
  const options: string[] = []; const color = object.style?.stroke?.trim();
  const match = color?.match(/^#([0-9a-f]{6})$/i);
  if (match && match[1].toLowerCase() !== "111111") {
    const value = Number.parseInt(match[1], 16); const red = (value >> 16) & 255; const green = (value >> 8) & 255; const blue = value & 255;
    options.push(`color={rgb,255:red,${red};green,${green};blue,${blue}}`);
  }
  const strokeWidth = object.style?.strokeWidth;
  if (strokeWidth !== undefined && strokeWidth !== 2) options.push(`line width=${tikzStrokeWidth(strokeWidth).toFixed(2)}pt`);
  return options.join(",");
}

function stamp(object: CanvasObject) {
  const width = object.width ?? 80; const height = object.height ?? 80;
  const x = n(object.x + width / 2); const y = n(-(object.y + height / 2));
  const a = (key: string, fallback: string) => safeText(annotation(object, key, fallback));
  const frame = (body: string, baseWidth = 80) => `\\begin{scope}[shift={(${x},${y})}, scale=${(Math.round((width / baseWidth) * 100) / 100).toFixed(2)}]\n${body}\n\\end{scope}`;
  switch (object.kind) {
    case "ground": return frame("\\draw (0,0) node[ground] {};", 44);
    case "op-amp": case "op-amp-comparator": case "op-amp-inverting": case "op-amp-non-inverting": case "op-amp-summing": case "op-amp-integrator": case "op-amp-differentiator": case "op-amp-schmitt": {
      const feedback = ["op-amp-inverting", "op-amp-non-inverting", "op-amp-integrator", "op-amp-differentiator", "op-amp-schmitt"].includes(object.kind) ? " \\draw (0.9,0) -- (0.9,0.65) -- (-0.42,0.65) -- (-0.42,0.18);" : "";
      const summing = object.kind === "op-amp-summing" ? " \\draw (-0.9,0.48) -- (-0.42,0.18); \\draw (-0.9,-0.12) -- (-0.42,0.18);" : "";
      return frame(`\\draw (-0.42,-0.55) rectangle (0.55,0.55); \\draw (-1,0.18) -- (-0.42,0.18); \\draw (-1,-0.25) -- (-0.42,-0.25); \\draw (0.55,0) -- (0.95,0); \\node at (-0.3,0.18) {$-$}; \\node at (-0.3,-0.25) {$+$}; \\draw (-0.05,-0.14) -- (-0.05,0.14) -- (0.12,0) -- cycle; \\node at (0.32,0) {$\\infty$};${feedback}${summing}`, 150);
    }
    case "gbf": return frame(`\\draw (0,0) circle (0.45); \\node at (0,0) {\\scriptsize ${a("main", "GBF")}}; \\draw (-0.28,0) sin (-0.14,0.16) cos (0,0) sin (0.14,-0.16) cos (0.28,0);`, 70);
    case "oscilloscope": return frame(`\\draw (-0.7,-0.45) rectangle (0.7,0.45); \\draw (-0.5,0) sin (-0.25,0.2) cos (0,0) sin (0.25,-0.2) cos (0.5,0); \\node[below] at (0,-0.45) {\\scriptsize ${a("main", "oscillo")}};`, 100);
    case "mass": return frame(`\\draw (-0.45,-0.3) rectangle (0.45,0.3); \\node at (0,0) {${a("main", "m")}};`, 70);
    case "pulley": return frame("\\draw (0,0) circle (0.42); \\fill (0,0) circle (0.05);", 85);
    case "pendulum": return frame("\\draw (0,0.65) -- (0,-0.35); \\fill (0,-0.48) circle (0.17); \\draw (-0.22,0.65) -- (0.22,0.65);", 80);
    case "reference-frame": return frame(`\\draw[-{Latex}] (0,0) -- (0.9,0) node[right] {${a("x", "x")}}; \\draw[-{Latex}] (0,0) -- (0,0.72) node[above] {${a("y", "y")}}; \\fill (0,0) circle (0.035) node[below left] {${a("origin", "O")}};`, 100);
    case "circular-trajectory": return frame(`\\draw[-{Latex}] (0,0) circle (0.48); \\fill (0,0) circle (0.04) node[below] {${a("origin", "O")}};`, 90);
    case "gravity-field": return frame(`\\foreach \\x in {-0.5,0,0.5} \\draw[-{Latex}] (\\x,0.45) -- (\\x,-0.45); \\node[right] at (0.5,0) {${a("main", "g")}};`, 95);
    case "lens": return frame("\\draw (0,-0.72) -- (0,0.72); \\fill (-0.12,0.60) -- (0,0.82) -- (0.12,0.60) -- cycle; \\fill (-0.12,-0.60) -- (0,-0.82) -- (0.12,-0.60) -- cycle;", 60);
    case "diverging-lens": return frame("\\draw (0,-0.72) -- (0,0.72); \\fill (-0.12,0.82) -- (0,0.60) -- (0.12,0.82) -- cycle; \\fill (-0.12,-0.82) -- (0,-0.60) -- (0.12,-0.82) -- cycle;", 60);
    case "plane-mirror": return frame("\\draw[thick] (0,-0.78) -- (0,0.78); \\foreach \\y in {-0.65,-0.35,-0.05,0.25,0.55} \\draw (0,\\y) -- (0.16,\\y+0.12);", 34);
    case "screen": return frame("\\draw[very thick] (0,-0.78) -- (0,0.78); \\foreach \\y in {-0.65,-0.35,-0.05,0.25,0.55} \\draw (0,\\y) -- (0.16,\\y-0.12);", 34);
    case "prism": return frame("\\draw (-0.65,-0.48) -- (0.65,-0.48) -- (0,0.62) -- cycle;", 90);
    case "fiber": return frame("\\draw[thick] (-0.9,0.25) .. controls (-0.35,0.25) and (0.15,-0.25) .. (0.9,-0.1); \\draw[thick] (-0.9,-0.25) .. controls (-0.35,-0.25) and (0.15,-0.75) .. (0.9,-0.6); \\draw[-{Latex}] (-0.7,0) -- (-0.1,-0.15);", 140);
    case "electric-field": return frame(`\\foreach \\y in {-0.35,0,0.35} \\draw[-{Latex}] (-0.62,\\y) -- (0.62,\\y); \\node[above] at (0,0.35) {${a("main", "E")}};`, 100);
    case "magnetic-field-in": return frame("\\foreach \\x in {-0.42,0,0.42} \\foreach \\y in {-0.3,0.3} \\node at (\\x,\\y) {$\\otimes$}; \\node[below] at (0,-0.55) {$\\vec B$};", 90);
    case "magnetic-field-out": return frame("\\foreach \\x in {-0.42,0,0.42} \\foreach \\y in {-0.3,0.3} \\node at (\\x,\\y) {$\\odot$}; \\node[below] at (0,-0.55) {$\\vec B$};", 90);
    case "bar-magnet": return frame(`\\draw[fill=gray!10] (-0.8,-0.22) rectangle (0.8,0.22); \\node at (-0.43,0) {${a("north", "N")}}; \\node at (0.43,0) {${a("south", "S")}};`, 110);
    case "coil": return frame("\\draw (-0.7,0) .. controls (-0.55,0.42) and (-0.35,-0.42) .. (-0.2,0) .. controls (-0.05,0.42) and (0.15,-0.42) .. (0.3,0) .. controls (0.45,0.42) and (0.6,-0.2) .. (0.72,0);", 100);
    case "solenoid": return frame("\\foreach \\x in {-0.55,-0.28,0,0.28,0.55} \\draw (\\x,0) ellipse (0.18 and 0.42); \\draw (-0.92,0) -- (-0.73,0); \\draw (0.73,0) -- (0.92,0);", 130);
    case "laplace-rails": return frame(`\\draw (-0.9,0.38) -- (0.9,0.38); \\draw (-0.9,-0.38) -- (0.9,-0.38); \\draw[very thick] (0.2,-0.38) -- (0.2,0.38); \\draw[-{Latex}] (0.35,0) -- (0.75,0) node[right] {${a("velocity", "v")}}; \\node at (-0.65,0) {$\\vec B$};`, 140);
    case "charged-particle": return frame(`\\draw (0,0) circle (0.35); \\node at (0,0) {${a("main", "q")}};`, 50);
    case "piston-cylinder": return frame(`\\draw (-0.52,-0.65) -- (-0.52,0.55) -- (0.52,0.55) -- (0.52,-0.65); \\draw[very thick] (-0.56,0.25) -- (0.56,0.25); \\draw (0,0.25) -- (0,0.72); \\node at (0,-0.22) {${a("main", "P,V,T")}};`, 100);
    case "thermal-reservoir": return frame(`\\draw (0,0) circle (0.48); \\node at (0,0) {${a("main", "T")}};`, 78);
    case "heat-engine": return frame(`\\draw[fill=gray!8] (-0.55,-0.4) rectangle (0.55,0.4); \\node at (0,0) {${a("main", "machine")}}; \\draw[-{Latex}] (0,0.95) -- (0,0.42) node[midway,right] {${a("hot", "Qh")}}; \\draw[-{Latex}] (0,-0.42) -- (0,-0.95) node[midway,right] {${a("cold", "Qc")}}; \\draw[-{Latex}] (0.58,0) -- (1.05,0) node[right] {${a("work", "W")}};`, 120);
    case "ion": return frame(`\\draw (0,0) circle (0.35); \\node at (0,0) {${a("main", "ion")}};`, 52);
    case "lone-pair": return frame("\\fill (-0.12,0) circle (0.06); \\fill (0.12,0) circle (0.06);", 42);
    case "crystal-fcc": return frame("\\draw (-0.5,-0.48) rectangle (0.35,0.35); \\draw (-0.5,0.35) -- (-0.18,0.62) -- (0.67,0.62) -- (0.35,0.35); \\draw (0.35,-0.48) -- (0.67,-0.21) -- (0.67,0.62); \\foreach \\p in {(-0.5,-0.48),(0.35,-0.48),(-0.5,0.35),(0.35,0.35),(-0.18,0.62),(0.67,0.62),(0.67,-0.21)} \\fill \\p circle (0.06); \\fill (-0.08,-0.06) circle (0.07);", 110);
    case "precipitate": return frame("\\draw (-0.48,0.55) -- (-0.36,-0.55) -- (0.36,-0.55) -- (0.48,0.55); \\fill[gray!35] (-0.36,-0.55) -- (0.36,-0.55) -- (0.31,-0.35) -- (-0.31,-0.35) -- cycle;", 80);
    case "electrochemical-cell": return frame(`\\draw (-1.12,0.55) -- (-0.98,-0.62) -- (-0.3,-0.62) -- (-0.16,0.55); \\draw (0.16,0.55) -- (0.3,-0.62) -- (0.98,-0.62) -- (1.12,0.55); \\fill[blue!12] (-0.94,-0.12) -- (-0.98,-0.58) -- (-0.3,-0.58) -- (-0.34,-0.12) -- cycle; \\fill[blue!12] (0.34,-0.12) -- (0.3,-0.58) -- (0.98,-0.58) -- (0.94,-0.12) -- cycle; \\draw[very thick] (-0.63,0.72) -- (-0.63,-0.38); \\draw[very thick] (0.63,0.72) -- (0.63,-0.38); \\draw[very thick,rounded corners] (-0.82,-0.23) -- (-0.82,0.35) -- (0,0.78) -- (0.82,0.35) -- (0.82,-0.23); \\draw[dashed] (-0.63,0.72) -- (0.63,0.72); \\node[below] at (-0.63,-0.62) {${a("anode", "anode (-)")}}; \\node[below] at (0.63,-0.62) {${a("cathode", "cathode (+)")}}; \\node at (0,0.37) {\\scriptsize ${a("bridge", "pont salin")}};`, 240);
    case "beaker": return frame("\\draw (-0.55,0.65) -- (-0.42,-0.65) -- (0.42,-0.65) -- (0.55,0.65); \\fill[blue!12] (-0.47,-0.2) -- (-0.42,-0.6) -- (0.42,-0.6) -- (0.47,-0.2) -- cycle; \\foreach \\y in {0.12,0.25,0.38} \\draw (-0.24,\\y) -- (-0.08,\\y);", 80);
    case "flask": return frame("\\draw (-0.16,0.7) -- (-0.16,0.15) -- (-0.62,-0.65) -- (0.62,-0.65) -- (0.16,0.15) -- (0.16,0.7) -- cycle; \\fill[blue!12] (-0.48,-0.42) -- (-0.6,-0.62) -- (0.6,-0.62) -- (0.48,-0.42) -- cycle;", 85);
    case "round-bottom-flask": return frame("\\draw (-0.14,0.8) -- (-0.14,0.32); \\draw (0.14,0.8) -- (0.14,0.32); \\draw (0,-0.12) circle (0.48); \\fill[blue!12] (-0.38,-0.25) arc (210:330:0.44) -- cycle;", 92);
    case "distillation-flask": return frame("\\draw (-0.18,0.75) -- (-0.18,0.32); \\draw (0.1,0.75) -- (0.1,0.32); \\draw (-0.04,-0.1) circle (0.42); \\draw (0.35,0.12) -- (0.85,0.38) -- (0.9,0.22) -- (0.42,-0.04); \\fill[blue!12] (-0.37,-0.22) arc (210:330:0.39) -- cycle;", 115);
    case "test-tube": return frame("\\draw (-0.18,0.7) -- (-0.18,-0.45) arc (180:360:0.18 and 0.25) -- (0.18,0.7); \\draw (-0.21,0.7) -- (0.21,0.7); \\fill[blue!12] (-0.16,-0.18) -- (-0.16,-0.43) arc (180:360:0.16 and 0.22) -- (0.16,-0.18) -- cycle;", 52);
    case "graduated-cylinder": return frame("\\draw (-0.18,0.78) -- (-0.18,-0.62) arc (180:360:0.18 and 0.08) -- (0.18,0.78); \\draw (-0.52,-0.76) -- (0.52,-0.76); \\foreach \\y in {-0.45,-0.28,-0.11,0.06,0.23,0.4} \\draw (-0.16,\\y) -- (-0.04,\\y); \\fill[blue!12] (-0.16,-0.28) -- (-0.16,-0.58) arc (180:360:0.16 and 0.06) -- (0.16,-0.28) -- cycle;", 54);
    case "burette": return frame("\\draw (-0.12,0.9) -- (-0.12,-0.62) -- (0.12,-0.62) -- (0.12,0.9); \\draw (-0.22,0.9) -- (0.22,0.9); \\foreach \\y in {-0.42,-0.22,0,0.2,0.4,0.6} \\draw (-0.1,\\y) -- (0,\\y); \\draw (-0.3,-0.62) -- (0.3,-0.62); \\draw (0,-0.62) -- (0,-0.92);", 38);
    case "volumetric-flask": return frame("\\draw (-0.14,0.9) -- (-0.14,0.25) .. controls (-0.58,0.05) and (-0.55,-0.65) .. (0,-0.68) .. controls (0.55,-0.65) and (0.58,0.05) .. (0.14,0.25) -- (0.14,0.9); \\draw (-0.2,0.48) -- (0.2,0.48); \\fill[blue!12] (-0.42,-0.15) .. controls (-0.25,-0.6) and (0.25,-0.6) .. (0.42,-0.15) -- cycle;", 90);
    case "separatory-funnel": return frame("\\draw (0,0.88) -- (0,0.45) -- (0.44,0.05) .. controls (0.32,-0.45) and (-0.32,-0.45) .. (-0.44,0.05) -- (0,0.45); \\fill[blue!12] (-0.34,-0.05) .. controls (-0.18,-0.32) and (0.18,-0.32) .. (0.34,-0.05) .. controls (0.2,-0.38) and (-0.2,-0.38) .. (-0.34,-0.05); \\draw (-0.25,-0.48) -- (0.25,-0.48); \\draw (0,-0.48) -- (0,-0.86);", 78);
    case "pipette": return frame("\\draw (0,0.92) -- (0,0.32); \\draw (0,-0.32) -- (0,-0.9); \\draw (0,0) ellipse (0.18 and 0.32); \\draw (-0.14,0.62) -- (0.14,0.62);", 42);
    case "filter-funnel": return frame("\\draw (-0.62,0.65) -- (0.62,0.65) -- (0,0.02) -- cycle; \\draw (0,0.02) -- (0,-0.9); \\draw (-0.45,0.5) -- (0.45,0.5) -- (0,0.1) -- cycle;", 82);
    case "wash-bottle": return frame("\\draw (-0.45,-0.65) .. controls (-0.55,-0.2) and (-0.42,0.15) .. (-0.25,0.32) -- (0.25,0.32) .. controls (0.42,0.15) and (0.55,-0.2) .. (0.45,-0.65) -- cycle; \\draw (-0.12,0.32) -- (-0.12,0.65) .. controls (0.18,0.82) and (0.45,0.65) .. (0.68,0.75); \\fill[blue!12] (-0.4,-0.25) .. controls (-0.2,-0.48) and (0.2,-0.48) .. (0.4,-0.25) -- (0.36,-0.55) .. controls (0,-0.67) and (-0.36,-0.55) .. (-0.4,-0.25);", 82);
    case "liebig-condenser": return frame("\\draw (-0.95,-0.2) rectangle (0.95,0.2); \\draw (-1.08,0) -- (1.08,0); \\draw (-0.5,0.2) -- (-0.65,0.48); \\draw (0.5,-0.2) -- (0.65,-0.48);", 165);
    case "support-stand": return frame("\\draw[very thick] (-0.72,-0.8) -- (0.72,-0.8); \\draw[very thick] (-0.42,-0.8) -- (-0.42,0.85); \\draw (-0.48,0.15) rectangle (-0.22,0.32); \\draw (-0.22,0.23) -- (0.55,0.23); \\draw (0.55,0.23) .. controls (0.72,0.18) and (0.72,0.02) .. (0.56,-0.04);", 130);
    case "magnetic-stirrer": return frame("\\draw[rounded corners] (-0.7,-0.65) rectangle (0.7,-0.35); \\draw (-0.5,-0.35) -- (-0.4,0.35) -- (0.4,0.35) -- (0.5,-0.35); \\fill[blue!12] (-0.46,-0.05) -- (-0.44,-0.3) -- (0.44,-0.3) -- (0.46,-0.05) -- cycle; \\fill (0,-0.15) ellipse (0.15 and 0.025); \\draw (-0.48,-0.5) circle (0.05);", 120);
    case "thermometer": return frame("\\draw (-0.1,0.78) -- (-0.1,-0.5) arc (180:360:0.1 and 0.16) -- (0.1,0.78); \\fill[red!55] (0,-0.5) circle (0.16); \\draw[red!55,very thick] (0,-0.5) -- (0,0.55);", 42);
    case "bunsen-burner": return frame("\\draw (-0.38,-0.62) rectangle (0.38,-0.43); \\draw (-0.13,-0.43) -- (-0.13,0.25) -- (0.13,0.25) -- (0.13,-0.43); \\draw[fill=orange!25] (0,0.25) .. controls (-0.28,0.55) and (-0.12,0.78) .. (0,0.95) .. controls (0.12,0.78) and (0.28,0.55) .. (0,0.25);", 75);
    default: return "";
  }
}

function objectToLatexBase(object: CanvasObject): string {
  const scientificScene = scientificSceneFor(object);
  if (scientificScene) return scientificSceneToTikz(scientificScene);
  const origin = point(object.x, object.y);
  switch (object.kind) {
    case "line": return `\\draw ${origin} -- ${end(object)};`;
    case "dashed-line": return `\\draw[dash pattern=${TIKZ_DASH_PATTERN}] ${origin} -- ${end(object)};`;
    case "curve": {
      const x2 = object.x2 ?? object.x; const y2 = object.y2 ?? object.y;
      const control = object.control ?? { x: (object.x + x2) / 2, y: (object.y + y2) / 2 };
      const control1 = { x: object.x + (2 / 3) * (control.x - object.x), y: object.y + (2 / 3) * (control.y - object.y) };
      const control2 = { x: x2 + (2 / 3) * (control.x - x2), y: y2 + (2 / 3) * (control.y - y2) };
      return `\\draw ${origin} .. controls ${point(control1.x, control1.y)} and ${point(control2.x, control2.y)} .. ${end(object)};`;
    }
    case "arrow": case "force": case "light-ray": {
      const label = annotation(object, "main", object.kind === "force" ? "F" : "").trim();
      return `\\draw[-{Latex}] ${origin} -- ${end(object)}${label ? ` node[midway,above] {${componentLabel(label)}}` : ""};`;
    }
    case "double-arrow": return `\\draw[<->] ${origin} -- ${end(object)};`;
    case "dimension": return `\\draw[|<->|] ${origin} -- ${end(object)} node[midway,above,fill=white,inner sep=1pt] {${componentLabel(annotation(object, "main", "d"))}};`;
    case "point": return `\\fill ${point(object.x + (object.width ?? 18) / 2, object.y + (object.height ?? 18) / 2)} circle (0.06);`;
    case "wire": return `\\draw ${origin} -- ${end(object)};`;
    case "resistor": case "capacitor": case "inductor": case "battery": case "switch": return electricalConnector(object);
    case "lens": case "diverging-lens": return lensConnector(object);
    case "voltmeter": return `\\draw ${origin} -- ${end(object)}; \\node[draw,circle,fill=white,inner sep=1pt] at ($${origin}!0.5!${end(object)}$) {${safeText(annotation(object, "main", "V"))}};`;
    case "ammeter": return `\\draw ${origin} -- ${end(object)}; \\node[draw,circle,fill=white,inner sep=1pt] at ($${origin}!0.5!${end(object)}$) {${safeText(annotation(object, "main", "A"))}};`;
    case "spring": return `\\draw[decorate, decoration={coil, aspect=0.3}] ${origin} -- ${end(object)};`;
    case "wave": return `\\draw[decorate, decoration={snake, amplitude=0.08cm, segment length=0.25cm}] ${origin} -- ${end(object)};`;
    case "heat-arrow": return `\\draw[-{Latex}] ${origin} -- ${end(object)} node[midway,above] {${componentLabel(annotation(object, "main", "Q"))}};`;
    case "work-arrow": return `\\draw[-{Latex}] ${origin} -- ${end(object)} node[midway,above] {${componentLabel(annotation(object, "main", "W"))}};`;
    case "reaction-arrow": return `\\draw[-{Latex}] ${origin} -- ${end(object)};`;
    case "equilibrium-arrow": {
      const x2 = object.x2 ?? object.x; const y2 = object.y2 ?? object.y; const halfLength = n(Math.hypot(x2 - object.x, y2 - object.y) / 2);
      return connectorScope(object, `\\draw[-{Latex}] (-${halfLength},0.06) -- (${halfLength},0.06);\n\\draw[-{Latex}] (${halfLength},-0.06) -- (-${halfLength},-0.06);`);
    }
    case "hydrogen-bond": return `\\draw[dashed] ${origin} -- ${end(object)};`;
    case "dipole": {
      const x2 = object.x2 ?? object.x; const y2 = object.y2 ?? object.y; const halfLength = n(Math.hypot(x2 - object.x, y2 - object.y) / 2);
      return connectorScope(object, `\\draw[-{Latex}] (-${halfLength},0) -- (${halfLength},0) node[midway,above] {${componentLabel(annotation(object, "main", "μ"))}};\n\\draw (-${halfLength},-0.10) -- (-${halfLength},0.10);`);
    }
    case "bond-single": return bondLines(object, 1);
    case "bond-double": return bondLines(object, 2);
    case "bond-triple": return bondLines(object, 3);
    case "rect": return `\\draw ${origin} rectangle ${point(object.x + (object.width ?? 0), object.y + (object.height ?? 0))};`;
    case "circle": return `\\draw ${point(object.x + (object.width ?? 0) / 2, object.y + (object.height ?? 0) / 2)} circle (${n(Math.abs(object.width ?? 0) / 2)});`;
    case "ellipse": return `\\draw ${point(object.x + (object.width ?? 0) / 2, object.y + (object.height ?? 0) / 2)} ellipse (${n(Math.abs(object.width ?? 0) / 2)} and ${n(Math.abs(object.height ?? 0) / 2)});`;
    case "text": return `\\node at ${origin} {${safeText(object.text)}};`;
    case "equation": { const formula = latexFormula((object.text ?? "").trim().replace(/^\$|\$$/g, "")); return `\\node at ${point(object.x + (object.width ?? 220) / 2, object.y + (object.height ?? 70) / 2)} {$${formula}$};`; }
    case "raw-tikz": return object.rawTikz?.trim() ?? "";
    case "freehand": { const points = simplify(object.points ?? []); return points.length > 1 ? `\\draw[smooth, tension=0.7] plot coordinates {${points.map((p) => point(p.x, p.y)).join(" ")}};` : ""; }
    case "axes": {
      const width = object.width ?? 250; const height = object.height ?? 180; const graph = object.graph; const xMin = graph?.xMin ?? -5; const xMax = graph?.xMax ?? 5; const yMin = graph?.yMin ?? -5; const yMax = graph?.yMax ?? 5;
      const clampRatio = (ratio: number) => Math.max(0, Math.min(1, ratio)); const verticalAxis = object.x + clampRatio((0 - xMin) / Math.max(.0001, xMax - xMin)) * width; const horizontalAxis = object.y + clampRatio((yMax - 0) / Math.max(.0001, yMax - yMin)) * height;
      const grid = graph?.showGrid === true ? Array.from({ length: 9 }, (_, index) => {
        const gridX = object.x + width * index / 8; const gridY = object.y + height * index / 8;
        return `\\draw[gray!30] ${point(gridX, object.y)} -- ${point(gridX, object.y + height)};\n\\draw[gray!30] ${point(object.x, gridY)} -- ${point(object.x + width, gridY)};`;
      }).join("\n") : "";
      const plots = graphPointSetsFor(object).flatMap((segments, index) => segments.map((segment) => `\\draw[${GRAPH_TIKZ_STYLES[index % GRAPH_TIKZ_STYLES.length]}] plot coordinates {${segment.map((coordinate) => point(coordinate.x, coordinate.y)).join(" ")}};`)).join("\n");
      return `\\begin{scope}\n\\clip ${point(object.x, object.y)} rectangle ${point(object.x + width, object.y + height)};\n${grid}\n${plots}\n\\end{scope}\n\\draw[-{Latex}] ${point(object.x, horizontalAxis)} -- ${point(object.x + width, horizontalAxis)};\n\\draw[-{Latex}] ${point(verticalAxis, object.y + height)} -- ${point(verticalAxis, object.y)};\n\\node[anchor=south east] at ${point(object.x + width - 4, horizontalAxis - 8)} {${componentLabel(graph?.xLabel ?? "x")}};\n\\node[anchor=west] at ${point(verticalAxis + 9, object.y + 15)} {${componentLabel(graph?.yLabel ?? "y")}};`;
    }
    default: return stamp(object);
  }
}

function objectCenter(object: CanvasObject) {
  if (object.kind === "curve" && object.control) {
    const xs = [object.x, object.x2 ?? object.x, object.control.x]; const ys = [object.y, object.y2 ?? object.y, object.control.y];
    return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
  }
  if (object.x2 !== undefined || object.y2 !== undefined) return { x: ((object.x2 ?? object.x) + object.x) / 2, y: ((object.y2 ?? object.y) + object.y) / 2 };
  if (object.kind === "freehand" && object.points?.length) {
    const xs = object.points.map((point) => point.x); const ys = object.points.map((point) => point.y);
    return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
  }
  if (object.kind === "text") return { x: object.x, y: object.y };
  return { x: object.x + (object.width ?? 0) / 2, y: object.y + (object.height ?? 0) / 2 };
}

const matrixNumber = (value: number) => (Math.round(value * 100000) / 100000).toString();

export function objectToLatex(object: CanvasObject): string {
  const rawBody = objectToLatexBase(object); const style = tikzStyle(object); const body = rawBody && style ? `\\begin{scope}[${style}]\n${rawBody}\n\\end{scope}` : rawBody;
  const scaleX = object.scaleX ?? object.scale ?? 1; const scaleY = object.scaleY ?? object.scale ?? 1; const rotation = object.rotation ?? 0;
  if (!body || (scaleX === 1 && scaleY === 1 && rotation === 0)) return body;
  const center = objectCenter(object); const cx = center.x / SCALE; const cy = -center.y / SCALE;
  const angle = (-rotation * Math.PI) / 180;
  const a = scaleX * Math.cos(angle); const b = scaleX * Math.sin(angle); const c = -scaleY * Math.sin(angle); const d = scaleY * Math.cos(angle);
  const tx = cx - a * cx - c * cy; const ty = cy - b * cx - d * cy;
  return `\\begin{scope}[cm={${matrixNumber(a)},${matrixNumber(b)},${matrixNumber(c)},${matrixNumber(d)},(${matrixNumber(tx)},${matrixNumber(ty)})}]\n${body}\n\\end{scope}`;
}

export function documentFor(objects: CanvasObject[], snippetOnly = false, settings?: DocumentSettings): string {
  const objectBody = objects.flatMap((object) => {
    const rendered = objectToLatex(object);
    return rendered ? [`% sketch2latex id=${object.id}\n% @sketch2latex ${JSON.stringify(object)}\n  ${rendered}`] : [];
  }).join("\n\n  ");
  const junctionBody = junctionPointsFor(objects).map((junction) => `\\fill ${point(junction.x, junction.y)} circle (${n(JUNCTION_RADIUS)});`).join("\n");
  const body = [objectBody, junctionBody].filter(Boolean).join("\n\n  ");
  const unit = settings?.unit ?? "cm";
  const axisUnit = unit === "tikz" ? "cm" : unit;
  const unitScale = unit === "mm" ? 10 : unit === "pt" ? 28.3464567 : 1;
  const width = settings?.width ?? 900; const height = settings?.height ?? 560;
  const page = `\\path[use as bounding box] (0,0) rectangle (${n(width)},${n(-height)});\n\\fill[white] (0,0) rectangle (${n(width)},${n(-height)});\n\\clip (0,0) rectangle (${n(width)},${n(-height)});\n${body}`;
  const scaledBody = unitScale === 1 ? page : `\\begin{scope}[scale=${matrixNumber(unitScale)}]\n${page}\n\\end{scope}`;
  const picture = `\\begin{tikzpicture}[x=1${axisUnit},y=1${axisUnit},line width=${TIKZ_NORMAL_STROKE},line cap=round,line join=round,>={${TIKZ_ARROW_TIP}},every node/.style={font=\\fontsize{${TIKZ_LABEL_SIZE}}{9.5pt}\\selectfont}]\n  ${scaledBody}\n\\end{tikzpicture}`;
  if (snippetOnly) return picture;
  return `\\documentclass[tikz,border=0pt]{standalone}
% Sketch2LaTeX document: ${settings?.width ?? 900} x ${settings?.height ?? 560}px, ${settings?.orientation ?? "landscape"}, unit ${settings?.unit ?? "cm"}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage{tikz}
\\usepackage[european]{circuitikz}
\\usepackage{pgfplots}
\\usepackage{amsmath,amssymb}
\\pgfplotsset{compat=1.18}
\\usetikzlibrary{arrows.meta,decorations.pathmorphing,calc}
\\begin{document}
${picture}
\\end{document}
`;
}

type LatexSyncResult = { objects: CanvasObject[]; applied: number; preserved: number };

const numericCoordinate = /\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/g;

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

function isCanvasObject(value: unknown): value is CanvasObject {
  if (!value || typeof value !== "object") return false;
  const object = value as Record<string, unknown>;
  if (typeof object.id !== "string" || typeof object.kind !== "string" || !Object.hasOwn(labels, object.kind) || !isFiniteNumber(object.x) || !isFiniteNumber(object.y)) return false;
  for (const key of ["x2", "y2", "width", "height", "scale", "scaleX", "scaleY", "rotation"] as const) if (object[key] !== undefined && !isFiniteNumber(object[key])) return false;
  if (object.text !== undefined && typeof object.text !== "string") return false;
  if (object.rawTikz !== undefined && typeof object.rawTikz !== "string") return false;
  if (object.annotations !== undefined && (!object.annotations || typeof object.annotations !== "object" || Object.values(object.annotations as Record<string, unknown>).some((annotation) => typeof annotation !== "string"))) return false;
  if (object.style !== undefined) {
    if (!object.style || typeof object.style !== "object") return false;
    const style = object.style as { stroke?: unknown; strokeWidth?: unknown; fill?: unknown };
    if (style.stroke !== undefined && typeof style.stroke !== "string") return false;
    if (style.fill !== undefined && typeof style.fill !== "string") return false;
    if (style.strokeWidth !== undefined && !isFiniteNumber(style.strokeWidth)) return false;
  }
  if (object.points !== undefined && (!Array.isArray(object.points) || object.points.some((point) => !point || typeof point !== "object" || !isFiniteNumber((point as Point).x) || !isFiniteNumber((point as Point).y)))) return false;
  if (object.control !== undefined && (!object.control || typeof object.control !== "object" || !isFiniteNumber((object.control as Point).x) || !isFiniteNumber((object.control as Point).y))) return false;
  if (object.graph !== undefined) {
    if (!object.graph || typeof object.graph !== "object") return false;
    const graph = object.graph as { expression?: unknown; xMin?: unknown; xMax?: unknown };
    if (typeof graph.expression !== "string" || !isFiniteNumber(graph.xMin) || !isFiniteNumber(graph.xMax)) return false;
  }
  return true;
}

function metadataFromLatexBlock(block: string): CanvasObject | undefined {
  const metadata = block.match(/^\s*%+\s*@sketch2latex\s+(.+)$/m);
  if (!metadata) return undefined;
  try {
    const object: unknown = JSON.parse(metadata[1]);
    if (!isCanvasObject(object)) throw new Error("invalid");
    return object;
  } catch { throw new Error("Le bloc @sketch2latex contient des données invalides. Corrigez son JSON puis réessayez."); }
}

function pointsFromLatex(source: string) {
  return [...source.matchAll(numericCoordinate)].map((match) => {
    const x = Number(match[1]) * SCALE; const y = -Number(match[2]) * SCALE;
    return { x: Object.is(x, -0) ? 0 : x, y: Object.is(y, -0) ? 0 : y };
  });
}

function textFromLatex(value: string) {
  return value.trim().replace(/\\textbackslash\{\}\s?/g, "\\").replace(/\\([#%&_{}])/g, "$1");
}

function annotationsFromLatexBlock(original: CanvasObject, block: string): CanvasObject {
  const defaults = original.annotations ?? defaultAnnotations(original.kind); const keys = Object.keys(defaults ?? {});
  if (!keys.length) return original;
  const values = [...block.matchAll(/(?:\\node|\bnode)(?:\[[^\]]*\])?(?:\s+at\s+[^{};]+)?\s*\{([^{}]*)\}/g)].map((match) => {
    const text = textFromLatex(match[1]); const math = text.match(/^\$([\s\S]*)\$$/)?.[1] ?? text;
    return math.match(/^\\vec\{([^{}]+)\}$/)?.[1] ?? math;
  });
  if (values.length < keys.length) return original;
  const annotations = { ...defaults }; let changed = false;
  keys.forEach((key, index) => { if (annotations[key] !== values[index]) { annotations[key] = values[index]; changed = true; } });
  return changed ? { ...original, annotations } : original;
}

function objectFromLatexBlock(original: CanvasObject, block: string): CanvasObject {
  const withAnnotations = annotationsFromLatexBlock(original, block);
  if (block.includes("\\begin{scope}[cm=")) return withAnnotations;
  const connectorScopeMatch = connectorKinds.includes(original.kind) ? block.match(/\\begin\{scope\}\[shift=\{\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)\},\s*rotate=\s*(-?\d+(?:\.\d+)?)/) : undefined;
  if (connectorScopeMatch) {
    const localSource = block.slice((connectorScopeMatch.index ?? 0) + connectorScopeMatch[0].length);
    const localPoints = pointsFromLatex(localSource); const halfLength = Math.max(0, ...localPoints.map((value) => Math.abs(value.x)));
    if (halfLength > 0) {
      const center = { x: Number(connectorScopeMatch[1]) * SCALE, y: -Number(connectorScopeMatch[2]) * SCALE };
      const angle = (-Number(connectorScopeMatch[3]) * Math.PI) / 180; const dx = Math.cos(angle) * halfLength; const dy = Math.sin(angle) * halfLength;
      return { ...withAnnotations, x: center.x - dx, y: center.y - dy, x2: center.x + dx, y2: center.y + dy };
    }
  }
  const points = pointsFromLatex(block);
  if (original.kind === "curve" && points.length >= 4) {
    const start = points[0]; const control1 = points[1]; const finish = points[3];
    const control = { x: start.x + 1.5 * (control1.x - start.x), y: start.y + 1.5 * (control1.y - start.y) };
    return { ...withAnnotations, x: start.x, y: start.y, control, x2: finish.x, y2: finish.y };
  }
  if (connectorKinds.includes(original.kind) && points.length >= 2) return { ...withAnnotations, x: points[0].x, y: points[0].y, x2: points[1].x, y2: points[1].y };
  if (original.kind === "rect" && points.length >= 2) return { ...original, x: points[0].x, y: points[0].y, width: points[1].x - points[0].x, height: points[1].y - points[0].y };
  if (original.kind === "circle" && points.length) {
    const radius = block.match(/circle\s*\(\s*(-?\d+(?:\.\d+)?)\s*\)/);
    if (radius) { const value = Number(radius[1]) * SCALE; return { ...original, x: points[0].x - value, y: points[0].y - value, width: value * 2, height: value * 2 }; }
  }
  if (original.kind === "ellipse" && points.length) {
    const radii = block.match(/ellipse\s*\(\s*(-?\d+(?:\.\d+)?)\s+and\s+(-?\d+(?:\.\d+)?)\s*\)/);
    if (radii) { const rx = Number(radii[1]) * SCALE; const ry = Number(radii[2]) * SCALE; return { ...original, x: points[0].x - rx, y: points[0].y - ry, width: rx * 2, height: ry * 2 }; }
  }
  if (original.kind === "text") {
    const node = block.match(/\\node\s+at\s+\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)\s*\{([\s\S]*?)\};/);
    if (node) return { ...original, x: Number(node[1]) * SCALE, y: -Number(node[2]) * SCALE, text: textFromLatex(node[3]) };
  }
  if (original.kind === "equation") {
    const node = block.match(/\\node\s+at\s+\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)\s*\{\$([\s\S]*?)\$\};/);
    if (node) { const width = original.width ?? 220; const height = original.height ?? 70; return { ...original, x: Number(node[1]) * SCALE - width / 2, y: -Number(node[2]) * SCALE - height / 2, text: node[3] }; }
  }
  if (original.kind === "axes" && points.length) {
    const width = block.match(/width\s*=\s*(-?\d+(?:\.\d+)?)cm/); const height = block.match(/height\s*=\s*(-?\d+(?:\.\d+)?)cm/); const expression = block.match(/\\addplot\[[^\]]*\]\s*\{([\s\S]*?)\};/);
    return { ...original, x: points[0].x, y: points[0].y, width: width ? Number(width[1]) * SCALE : original.width, height: height ? Number(height[1]) * SCALE : original.height, graph: original.graph ? { ...original.graph, expression: expression?.[1].trim() || original.graph.expression } : original.graph };
  }
  return withAnnotations;
}

function mergeTikzEdits(metadata: CanvasObject, visual: CanvasObject, original: CanvasObject): CanvasObject {
  const next = { ...metadata } as Record<string, unknown>;
  for (const key of ["x", "y", "x2", "y2", "width", "height", "control", "text", "rawTikz", "annotations", "style", "graph"] as const) {
    if (JSON.stringify(visual[key]) !== JSON.stringify(original[key])) next[key] = visual[key];
  }
  return next as CanvasObject;
}

type ImportedCandidate = { index: number; object: CanvasObject };

function ordinaryTikzObjects(source: string): CanvasObject[] {
  const picture = source.match(/\\begin\{tikzpicture\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{tikzpicture\}/)?.[1] ?? source;
  const candidates: ImportedCandidate[] = []; const protectedRanges: Array<[number, number]> = [];
  const pointAt = (x: string, y: string) => { const rawY = -Number(y) * SCALE; return { x: Number(x) * SCALE, y: Object.is(rawY, -0) ? 0 : rawY }; };
  const rawObject = (raw: string, index: number): ImportedCandidate => { const coordinate = raw.match(/\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/); const position = coordinate ? pointAt(coordinate[1], coordinate[2]) : { x: 40 + (candidates.length % 5) * 28, y: 50 + (candidates.length % 5) * 24 }; return { index, object: { id: `tikz-raw-${index}`, kind: "raw-tikz", ...position, width: 180, height: 70, rawTikz: raw.trim() } }; };
  for (const block of picture.matchAll(/\\begin\{(?:scope|axis)\}(?:\[[^\]]*\])?[\s\S]*?\\end\{(?:scope|axis)\}/g)) { const index = block.index ?? 0; protectedRanges.push([index, index + block[0].length]); candidates.push(rawObject(block[0], index)); }
  const isProtected = (start: number, end: number) => protectedRanges.some(([from, to]) => start >= from && end <= to);

  for (const match of picture.matchAll(/\\(?:draw|path|fill|filldraw|node|coordinate|clip|shade)\b[\s\S]*?;/g)) {
    const raw = match[0]; const index = match.index ?? 0; if (isProtected(index, index + raw.length)) continue;
    const node = raw.match(/^\\node(?:\[[^\]]*\])?\s+at\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)\s*\{([\s\S]*?)\}\s*;/);
    if (node) { const position = pointAt(node[1], node[2]); const content = textFromLatex(node[3]); const equation = /^\$[\s\S]*\$$/.test(content); candidates.push({ index, object: { id: `tikz-${equation ? "equation" : "text"}-${index}`, kind: equation ? "equation" : "text", x: equation ? position.x - 110 : position.x, y: equation ? position.y - 35 : position.y, text: equation ? content.slice(1, -1) : content, ...(equation ? { width: 220, height: 70 } : {}) } }); continue; }
    const curve = raw.match(/^\\draw(?:\[([^\]]*)\])?\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)\s*\.\.\s*controls\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)(?:\s*and\s*\([^)]*\))?\s*\.\.\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)\s*;/);
    if (curve) { const start = pointAt(curve[2], curve[3]); const control = pointAt(curve[4], curve[5]); const end = pointAt(curve[6], curve[7]); candidates.push({ index, object: { id: `tikz-curve-${index}`, kind: "curve", ...start, x2: end.x, y2: end.y, control } }); continue; }
    const shape = raw.match(/^\\draw(?:\[([^\]]*)\])?\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)\s*(--|rectangle)\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)\s*;/);
    if (shape) { const options = shape[1] ?? ""; const start = pointAt(shape[2], shape[3]); const end = pointAt(shape[5], shape[6]); const kind: CanvasObject["kind"] = shape[4] === "rectangle" ? "rect" : options.includes("<->") ? "double-arrow" : options.includes("->") || options.includes("Latex") ? "arrow" : options.includes("dashed") ? "dashed-line" : "line"; candidates.push({ index, object: kind === "rect" ? { id: `tikz-rect-${index}`, kind, ...start, width: end.x - start.x, height: end.y - start.y } : { id: `tikz-line-${index}`, kind, ...start, x2: end.x, y2: end.y } }); continue; }
    const circle = raw.match(/^\\draw(?:\[[^\]]*\])?\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)\s*circle\s*\(\s*(-?\d+(?:\.\d+)?)\s*\)\s*;/);
    if (circle) { const center = pointAt(circle[1], circle[2]); const radius = Number(circle[3]) * SCALE; candidates.push({ index, object: { id: `tikz-circle-${index}`, kind: "circle", x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2 } }); continue; }
    const ellipse = raw.match(/^\\draw(?:\[[^\]]*\])?\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)\s*ellipse\s*\(\s*(-?\d+(?:\.\d+)?)\s+and\s+(-?\d+(?:\.\d+)?)\s*\)\s*;/);
    if (ellipse) { const center = pointAt(ellipse[1], ellipse[2]); const rx = Number(ellipse[3]) * SCALE; const ry = Number(ellipse[4]) * SCALE; candidates.push({ index, object: { id: `tikz-ellipse-${index}`, kind: "ellipse", x: center.x - rx, y: center.y - ry, width: rx * 2, height: ry * 2 } }); continue; }
    const coordinates = [...raw.matchAll(/\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/g)].map((entry) => pointAt(entry[1], entry[2]));
    if (/^\\draw/.test(raw) && coordinates.length > 2 && raw.includes("--")) { candidates.push({ index, object: { id: `tikz-path-${index}`, kind: "freehand", x: coordinates[0].x, y: coordinates[0].y, points: coordinates } }); continue; }
    candidates.push(rawObject(raw, index));
  }
  if (!candidates.length && picture.trim()) candidates.push(rawObject(picture, 0));
  return candidates.sort((a, b) => a.index - b.index).map((candidate, sequence) => ({ ...candidate.object, id: candidate.object.id.replace(/-\d+$/, `-${sequence}`) }));
}

export function objectsFromLatex(source: string, currentObjects: CanvasObject[]): LatexSyncResult {
  const markers = [...source.matchAll(/^\s*%+\s*sketch2latex\s+id=([^\s]+)\s*$/gim)];
  if (!markers.length) {
    const imported = ordinaryTikzObjects(source);
    if (imported.length) return { objects: imported, applied: imported.length, preserved: 0 };
  }
  if (!markers.length) throw new Error("Conservez les commentaires % sketch2latex id=… pour appliquer le LaTeX au canevas.");
  const originals = new Map(currentObjects.map((object) => [object.id, object])); const seen = new Set<string>(); const resultIds = new Set<string>(); const objects: CanvasObject[] = [];
  let applied = 0; let preserved = 0;
  markers.forEach((marker, index) => {
    const id = marker[1]; const original = originals.get(id); if (seen.has(id)) throw new Error(`L’identifiant ${id} est présent plusieurs fois dans le LaTeX.`);
    seen.add(id); const blockStart = (marker.index ?? 0) + marker[0].length; const blockEnd = markers[index + 1]?.index ?? source.length; const block = source.slice(blockStart, blockEnd); const metadata = metadataFromLatexBlock(block);
    if (!original) {
      if (!metadata) throw new Error(`Le nouvel objet ${id} doit inclure un bloc @sketch2latex valide.`);
      if (resultIds.has(metadata.id)) throw new Error(`L’identifiant ${metadata.id} est présent plusieurs fois dans le LaTeX.`);
      resultIds.add(metadata.id); objects.push(metadata); applied += 1; return;
    }
    const visual = objectFromLatexBlock(original, block);
    const next = metadata && JSON.stringify(metadata) !== JSON.stringify(original) ? mergeTikzEdits(metadata, visual, original) : visual;
    if (resultIds.has(next.id)) throw new Error(`L’identifiant ${next.id} est présent plusieurs fois dans le LaTeX.`);
    resultIds.add(next.id);
    if (next === original) preserved += 1; else applied += 1;
    objects.push(next);
  });
  return { objects, applied, preserved };
}

export type RoundTripReport = {
  ok: boolean;
  mismatchedIds: string[];
  message: string;
};

function stableValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableValue(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function roundTripReport(source: string, currentObjects: CanvasObject[]): RoundTripReport {
  if (!currentObjects.length) return { ok: true, mismatchedIds: [], message: "Canevas vide : aucune donnée à perdre." };
  try {
    const restored = objectsFromLatex(source, currentObjects).objects;
    const restoredById = new Map(restored.map((object) => [object.id, object]));
    const mismatchedIds = currentObjects
      .filter((object) => stableValue(restoredById.get(object.id)) !== stableValue(object))
      .map((object) => object.id);
    for (const object of restored) if (!currentObjects.some((current) => current.id === object.id)) mismatchedIds.push(object.id);
    return mismatchedIds.length
      ? { ok: false, mismatchedIds, message: `${mismatchedIds.length} objet(s) diffèrent après le retour TikZ → canevas.` }
      : { ok: true, mismatchedIds: [], message: "Aller-retour canevas ↔ TikZ vérifié sans perte." };
  } catch (error) {
    return { ok: false, mismatchedIds: [], message: error instanceof Error ? error.message : "Aller-retour TikZ impossible à vérifier." };
  }
}
