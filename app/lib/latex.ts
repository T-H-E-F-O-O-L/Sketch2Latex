import { annotation, connectorKinds, defaultAnnotations, labels, type CanvasObject, type Point } from "./canvas-types";

const SCALE = 50;
const n = (value: number) => (Math.round((value / SCALE) * 100) / 100).toFixed(2);
const point = (x: number, y: number) => `(${n(x)},${n(-y)})`;
const end = (object: CanvasObject) => point(object.x2 ?? object.x, object.y2 ?? object.y);

function safeText(value = "") {
  if (value.includes("$")) return value;
  return value.replace(/\\/g, "\\textbackslash{} ").replace(/([#%&_{}])/g, "\\$1");
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

function stamp(object: CanvasObject) {
  const width = object.width ?? 80; const height = object.height ?? 80;
  const x = n(object.x + width / 2); const y = n(-(object.y + height / 2));
  const a = (key: string, fallback: string) => safeText(annotation(object, key, fallback));
  const frame = (body: string, baseWidth = 80) => `\\begin{scope}[shift={(${x},${y})}, scale=${(Math.round((width / baseWidth) * 100) / 100).toFixed(2)}]\n${body}\n\\end{scope}`;
  switch (object.kind) {
    case "ground": return frame("\\draw (0,0) node[ground] {};", 44);
    case "gbf": return frame(`\\draw (0,0) circle (0.45); \\node at (0,0) {\\scriptsize ${a("main", "GBF")}}; \\draw (-0.28,0) sin (-0.14,0.16) cos (0,0) sin (0.14,-0.16) cos (0.28,0);`, 70);
    case "oscilloscope": return frame(`\\draw (-0.7,-0.45) rectangle (0.7,0.45); \\draw (-0.5,0) sin (-0.25,0.2) cos (0,0) sin (0.25,-0.2) cos (0.5,0); \\node[below] at (0,-0.45) {\\scriptsize ${a("main", "oscillo")}};`, 100);
    case "mass": return frame(`\\draw (-0.45,-0.3) rectangle (0.45,0.3); \\node at (0,0) {${a("main", "m")}};`, 70);
    case "pulley": return frame("\\draw (0,0) circle (0.42); \\fill (0,0) circle (0.05);", 85);
    case "pendulum": return frame("\\draw (0,0.65) -- (0,-0.35); \\fill (0,-0.48) circle (0.17); \\draw (-0.22,0.65) -- (0.22,0.65);", 80);
    case "reference-frame": return frame(`\\draw[-{Latex}] (0,0) -- (0.9,0) node[right] {${a("x", "x")}}; \\draw[-{Latex}] (0,0) -- (0,0.72) node[above] {${a("y", "y")}}; \\fill (0,0) circle (0.035) node[below left] {${a("origin", "O")}};`, 100);
    case "circular-trajectory": return frame(`\\draw[-{Latex}] (0,0) circle (0.48); \\fill (0,0) circle (0.04) node[below] {${a("origin", "O")}};`, 90);
    case "gravity-field": return frame(`\\foreach \\x in {-0.5,0,0.5} \\draw[-{Latex}] (\\x,0.45) -- (\\x,-0.45); \\node[right] at (0.5,0) {${a("main", "g")}};`, 95);
    case "lens": return frame(`\\draw (-0.95,0) -- (0.95,0); \\draw[{Latex}-{Latex}] (0,-0.72) -- (0,0.72); \\fill (0,0) circle (0.025) node[below right] {${a("origin", "O")}};`, 60);
    case "diverging-lens": return frame(`\\draw (-0.95,0) -- (0.95,0); \\draw[-{Latex}] (0,0.72) -- (0,0.18); \\draw[-{Latex}] (0,-0.72) -- (0,-0.18); \\fill (0,0) circle (0.025) node[below right] {${a("origin", "O")}};`, 60);
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
  const origin = point(object.x, object.y); const stroke = object.style?.strokeWidth && object.style.strokeWidth > 2 ? ", thick" : "";
  switch (object.kind) {
    case "line": return `\\draw${stroke} ${origin} -- ${end(object)};`;
    case "curve": { const control = object.control ?? { x: (object.x + (object.x2 ?? object.x)) / 2, y: (object.y + (object.y2 ?? object.y)) / 2 }; return `\\draw${stroke} ${origin} .. controls ${point(control.x, control.y)} and ${point(control.x, control.y)} .. ${end(object)};`; }
    case "arrow": case "force": case "light-ray": return `\\draw[-{Latex}${stroke}] ${origin} -- ${end(object)};`;
    case "wire": return `\\draw ${origin} -- ${end(object)};`;
    case "resistor": return `\\draw ${origin} to[R] ${end(object)};`;
    case "capacitor": return `\\draw ${origin} to[C] ${end(object)};`;
    case "inductor": return `\\draw ${origin} to[L] ${end(object)};`;
    case "battery": return `\\draw ${origin} to[battery1] ${end(object)};`;
    case "switch": return `\\draw ${origin} to[opening switch] ${end(object)};`;
    case "voltmeter": return `\\draw ${origin} -- ${end(object)}; \\node[draw,circle,fill=white,inner sep=1pt] at ($${origin}!0.5!${end(object)}$) {${safeText(annotation(object, "main", "V"))}};`;
    case "ammeter": return `\\draw ${origin} -- ${end(object)}; \\node[draw,circle,fill=white,inner sep=1pt] at ($${origin}!0.5!${end(object)}$) {${safeText(annotation(object, "main", "A"))}};`;
    case "spring": return `\\draw[decorate, decoration={coil, aspect=0.3}] ${origin} -- ${end(object)};`;
    case "wave": return `\\draw[decorate, decoration={snake, amplitude=0.08cm, segment length=0.25cm}] ${origin} -- ${end(object)};`;
    case "heat-arrow": return `\\draw[-{Latex}] ${origin} -- ${end(object)} node[midway,above] {${safeText(annotation(object, "main", "Q"))}};`;
    case "work-arrow": return `\\draw[-{Latex}] ${origin} -- ${end(object)} node[midway,above] {${safeText(annotation(object, "main", "W"))}};`;
    case "reaction-arrow": return `\\draw[-{Latex}] ${origin} -- ${end(object)};`;
    case "equilibrium-arrow": return `\\draw[<->] ${origin} -- ${end(object)};`;
    case "hydrogen-bond": return `\\draw[dashed] ${origin} -- ${end(object)};`;
    case "dipole": return `\\draw[-{Latex}] ${origin} -- ${end(object)} node[midway,above] {${safeText(annotation(object, "main", "μ"))}};`;
    case "bond-single": return bondLines(object, 1);
    case "bond-double": return bondLines(object, 2);
    case "bond-triple": return bondLines(object, 3);
    case "rect": return `\\draw ${origin} rectangle ${point(object.x + (object.width ?? 0), object.y + (object.height ?? 0))};`;
    case "circle": return `\\draw ${point(object.x + (object.width ?? 0) / 2, object.y + (object.height ?? 0) / 2)} circle (${n(Math.abs(object.width ?? 0) / 2)});`;
    case "ellipse": return `\\draw ${point(object.x + (object.width ?? 0) / 2, object.y + (object.height ?? 0) / 2)} ellipse (${n(Math.abs(object.width ?? 0) / 2)} and ${n(Math.abs(object.height ?? 0) / 2)});`;
    case "text": return `\\node at ${origin} {${safeText(object.text)}};`;
    case "freehand": { const points = simplify(object.points ?? []); return points.length > 1 ? `\\draw[smooth, tension=0.7] plot coordinates {${points.map((p) => point(p.x, p.y)).join(" ")}};` : ""; }
    case "axes": {
      const width = n(object.width ?? 250); const height = n(object.height ?? 180); const expression = object.graph?.expression?.trim(); const domain = `${object.graph?.xMin ?? -5}:${object.graph?.xMax ?? 5}`;
      return `\\begin{axis}[at={${origin}}, anchor=north west, width=${width}cm, height=${height}cm, xmin=-5, xmax=5, ymin=-5, ymax=5, axis lines=middle, grid=both, xlabel={$x$}, ylabel={$y$}]\n${expression ? `  \\addplot[domain=${domain}, samples=100, smooth] {${expression}};` : ""}\n\\end{axis}`;
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
  const body = objectToLatexBase(object);
  const scaleX = object.scaleX ?? object.scale ?? 1; const scaleY = object.scaleY ?? object.scale ?? 1; const rotation = object.rotation ?? 0;
  if (!body || (scaleX === 1 && scaleY === 1 && rotation === 0)) return body;
  const center = objectCenter(object); const cx = center.x / SCALE; const cy = -center.y / SCALE;
  const angle = (-rotation * Math.PI) / 180;
  const a = scaleX * Math.cos(angle); const b = scaleX * Math.sin(angle); const c = -scaleY * Math.sin(angle); const d = scaleY * Math.cos(angle);
  const tx = cx - a * cx - c * cy; const ty = cy - b * cx - d * cy;
  return `\\begin{scope}[cm={${matrixNumber(a)},${matrixNumber(b)},${matrixNumber(c)},${matrixNumber(d)},(${matrixNumber(tx)},${matrixNumber(ty)})}]\n${body}\n\\end{scope}`;
}

export function documentFor(objects: CanvasObject[], snippetOnly = false): string {
  const body = objects.flatMap((object) => {
    const rendered = objectToLatex(object);
    return rendered ? [`% sketch2latex id=${object.id}\n% @sketch2latex ${JSON.stringify(object)}\n  ${rendered}`] : [];
  }).join("\n\n  ");
  const picture = `\\begin{tikzpicture}[x=1cm,y=1cm]\n  ${body}\n\\end{tikzpicture}`;
  if (snippetOnly) return picture;
  return `\\documentclass[tikz,border=5pt]{standalone}
\\usepackage{tikz}
\\usepackage{circuitikz}
\\usepackage{pgfplots}
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
  if (object.annotations !== undefined && (!object.annotations || typeof object.annotations !== "object" || Object.values(object.annotations as Record<string, unknown>).some((annotation) => typeof annotation !== "string"))) return false;
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
  const values = [...block.matchAll(/(?:\\node|\bnode)(?:\[[^\]]*\])?(?:\s+at\s+[^{};]+)?\s*\{([^{}]*)\}/g)].map((match) => textFromLatex(match[1]));
  if (values.length < keys.length) return original;
  const annotations = { ...defaults }; let changed = false;
  keys.forEach((key, index) => { if (annotations[key] !== values[index]) { annotations[key] = values[index]; changed = true; } });
  return changed ? { ...original, annotations } : original;
}

function objectFromLatexBlock(original: CanvasObject, block: string): CanvasObject {
  const withAnnotations = annotationsFromLatexBlock(original, block);
  if (block.includes("\\begin{scope}[cm=")) return withAnnotations;
  const points = pointsFromLatex(block);
  if (original.kind === "curve" && points.length >= 4) return { ...withAnnotations, x: points[0].x, y: points[0].y, control: points[1], x2: points[3].x, y2: points[3].y };
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
  if (original.kind === "axes" && points.length) {
    const width = block.match(/width\s*=\s*(-?\d+(?:\.\d+)?)cm/); const height = block.match(/height\s*=\s*(-?\d+(?:\.\d+)?)cm/); const expression = block.match(/\\addplot\[[^\]]*\]\s*\{([\s\S]*?)\};/);
    return { ...original, x: points[0].x, y: points[0].y, width: width ? Number(width[1]) * SCALE : original.width, height: height ? Number(height[1]) * SCALE : original.height, graph: original.graph ? { ...original.graph, expression: expression?.[1].trim() || original.graph.expression } : original.graph };
  }
  return withAnnotations;
}

function mergeTikzEdits(metadata: CanvasObject, visual: CanvasObject, original: CanvasObject): CanvasObject {
  const next = { ...metadata } as Record<string, unknown>;
  for (const key of ["x", "y", "x2", "y2", "width", "height", "control", "text", "annotations", "graph"] as const) {
    if (JSON.stringify(visual[key]) !== JSON.stringify(original[key])) next[key] = visual[key];
  }
  return next as CanvasObject;
}

export function objectsFromLatex(source: string, currentObjects: CanvasObject[]): LatexSyncResult {
  const markers = [...source.matchAll(/^\s*%+\s*sketch2latex\s+id=([^\s]+)\s*$/gim)];
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
