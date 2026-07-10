import type { CanvasObject, Point } from "./canvas-types";

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
  const frame = (body: string, baseWidth = 80) => `\\begin{scope}[shift={(${x},${y})}, scale=${(Math.round((width / baseWidth) * 100) / 100).toFixed(2)}]\n${body}\n\\end{scope}`;
  switch (object.kind) {
    case "ground": return frame("\\draw (0,0) node[ground] {};", 44);
    case "gbf": return frame("\\draw (0,0) circle (0.45); \\node at (0,0) {\\scriptsize GBF}; \\draw (-0.28,0) sin (-0.14,0.16) cos (0,0) sin (0.14,-0.16) cos (0.28,0);", 70);
    case "oscilloscope": return frame("\\draw (-0.7,-0.45) rectangle (0.7,0.45); \\draw (-0.5,0) sin (-0.25,0.2) cos (0,0) sin (0.25,-0.2) cos (0.5,0); \\node[below] at (0,-0.45) {\\scriptsize oscillo};", 100);
    case "mass": return frame("\\draw (-0.45,-0.3) rectangle (0.45,0.3); \\node at (0,0) {$m$};", 70);
    case "inclined-plane": return frame("\\draw (-0.75,-0.45) -- (0.75,-0.45) -- (0.75,0.45) -- cycle; \\draw[fill=gray!10] (-0.58,-0.28) rectangle (-0.12,0.04);", 100);
    case "pulley": return frame("\\draw (0,0) circle (0.42); \\fill (0,0) circle (0.05); \\draw (-0.8,0.75) -- (0.8,0.75); \\draw (-0.42,0) -- (-0.42,-0.75);", 85);
    case "pendulum": return frame("\\draw (0,0.65) -- (0,-0.35); \\fill (0,-0.48) circle (0.17); \\draw (-0.22,0.65) -- (0.22,0.65);", 80);
    case "reference-frame": return frame("\\draw[-{Latex}] (0,0) -- (0.9,0) node[right] {$x$}; \\draw[-{Latex}] (0,0) -- (0,0.72) node[above] {$y$}; \\fill (0,0) circle (0.035) node[below left] {$O$};", 100);
    case "circular-trajectory": return frame("\\draw[-{Latex}] (0,0) circle (0.48); \\fill (0,0) circle (0.04) node[below] {$O$};", 90);
    case "gravity-field": return frame("\\foreach \\x in {-0.5,0,0.5} \\draw[-{Latex}] (\\x,0.45) -- (\\x,-0.45); \\node[right] at (0.5,0) {$\\vec g$};", 95);
    case "lens": return frame("\\draw (0,0) ellipse (0.18 and 0.72); \\draw (-0.95,0) -- (-0.18,0); \\draw (0.18,0) -- (0.95,0); \\fill (0,0) circle (0.025) node[below right] {$O$};", 60);
    case "diverging-lens": return frame("\\draw (-0.16,0.72) .. controls (0.14,0.35) and (0.14,-0.35) .. (-0.16,-0.72); \\draw (0.16,0.72) .. controls (-0.14,0.35) and (-0.14,-0.35) .. (0.16,-0.72); \\draw (-0.95,0) -- (-0.16,0); \\draw (0.16,0) -- (0.95,0);", 60);
    case "plane-mirror": return frame("\\draw[thick] (0,-0.78) -- (0,0.78); \\foreach \\y in {-0.65,-0.35,-0.05,0.25,0.55} \\draw (0,\\y) -- (0.16,\\y+0.12);", 34);
    case "screen": return frame("\\draw[very thick] (0,-0.78) -- (0,0.78); \\foreach \\y in {-0.65,-0.35,-0.05,0.25,0.55} \\draw (0,\\y) -- (0.16,\\y-0.12);", 34);
    case "prism": return frame("\\draw (-0.65,-0.48) -- (0.65,-0.48) -- (0,0.62) -- cycle;", 90);
    case "fiber": return frame("\\draw[thick] (-0.9,0.25) .. controls (-0.35,0.25) and (0.15,-0.25) .. (0.9,-0.1); \\draw[thick] (-0.9,-0.25) .. controls (-0.35,-0.25) and (0.15,-0.75) .. (0.9,-0.6); \\draw[-{Latex}] (-0.7,0) -- (-0.1,-0.15);", 140);
    case "electric-field": return frame("\\foreach \\y in {-0.35,0,0.35} \\draw[-{Latex}] (-0.62,\\y) -- (0.62,\\y); \\node[above] at (0,0.35) {$\\vec E$};", 100);
    case "magnetic-field-in": return frame("\\foreach \\x in {-0.42,0,0.42} \\foreach \\y in {-0.3,0.3} \\node at (\\x,\\y) {$\\otimes$}; \\node[below] at (0,-0.55) {$\\vec B$};", 90);
    case "magnetic-field-out": return frame("\\foreach \\x in {-0.42,0,0.42} \\foreach \\y in {-0.3,0.3} \\node at (\\x,\\y) {$\\odot$}; \\node[below] at (0,-0.55) {$\\vec B$};", 90);
    case "bar-magnet": return frame("\\draw[fill=gray!10] (-0.8,-0.22) rectangle (0.8,0.22); \\node at (-0.43,0) {N}; \\node at (0.43,0) {S};", 110);
    case "coil": return frame("\\draw (-0.7,0) .. controls (-0.55,0.42) and (-0.35,-0.42) .. (-0.2,0) .. controls (-0.05,0.42) and (0.15,-0.42) .. (0.3,0) .. controls (0.45,0.42) and (0.6,-0.2) .. (0.72,0);", 100);
    case "solenoid": return frame("\\foreach \\x in {-0.55,-0.28,0,0.28,0.55} \\draw (\\x,0) ellipse (0.18 and 0.42); \\draw (-0.92,0) -- (-0.73,0); \\draw (0.73,0) -- (0.92,0);", 130);
    case "laplace-rails": return frame("\\draw (-0.9,0.38) -- (0.9,0.38); \\draw (-0.9,-0.38) -- (0.9,-0.38); \\draw[very thick] (0.2,-0.38) -- (0.2,0.38); \\draw[-{Latex}] (0.35,0) -- (0.75,0) node[right] {$\\vec v$}; \\node at (-0.65,0) {$\\vec B$};", 140);
    case "charged-particle": return frame("\\draw (0,0) circle (0.35); \\node at (0,0) {$q$};", 50);
    case "piston-cylinder": return frame("\\draw (-0.52,-0.65) -- (-0.52,0.55) -- (0.52,0.55) -- (0.52,-0.65); \\draw[very thick] (-0.56,0.25) -- (0.56,0.25); \\draw (0,0.25) -- (0,0.72); \\node at (0,-0.22) {$P,V,T$};", 100);
    case "thermal-reservoir": return frame("\\draw (0,0) circle (0.48); \\node at (0,0) {$T$};", 78);
    case "heat-engine": return frame("\\draw[fill=gray!8] (-0.55,-0.4) rectangle (0.55,0.4); \\node at (0,0) {machine}; \\draw[-{Latex}] (0,0.95) -- (0,0.42) node[midway,right] {$Q_h$}; \\draw[-{Latex}] (0,-0.42) -- (0,-0.95) node[midway,right] {$Q_c$}; \\draw[-{Latex}] (0.58,0) -- (1.05,0) node[right] {$W$};", 120);
    case "phase-diagram": return frame("\\draw[-{Latex}] (-0.72,-0.58) -- (-0.72,0.72) node[above] {$P$}; \\draw[-{Latex}] (-0.72,-0.58) -- (0.78,-0.58) node[right] {$T$}; \\draw (-0.62,-0.48) .. controls (-0.3,-0.1) and (-0.08,0.18) .. (0.55,0.62); \\draw (-0.62,-0.48) .. controls (0.05,-0.28) and (0.48,-0.12) .. (0.68,0.24); \\node at (-0.35,0.35) {S}; \\node at (0.05,0.1) {L}; \\node at (0.42,-0.32) {V};", 150);
    case "clapeyron-diagram": return frame("\\draw[-{Latex}] (-0.72,-0.58) -- (-0.72,0.72) node[above] {$P$}; \\draw[-{Latex}] (-0.72,-0.58) -- (0.78,-0.58) node[right] {$v$}; \\draw (-0.56,0.52) .. controls (-0.32,0.46) and (-0.2,0.12) .. (0.5,-0.36); \\node at (-0.45,0.15) {L}; \\node at (0.45,-0.1) {V};", 150);
    case "energy-diagram": return frame("\\draw[-{Latex}] (-0.72,-0.55) -- (-0.72,0.7) node[above] {$E_p$}; \\draw[-{Latex}] (-0.72,-0.55) -- (0.78,-0.55) node[right] {$x$}; \\draw (-0.55,0.45) .. controls (-0.1,-0.2) and (0.08,-0.2) .. (0.55,0.42);", 150);
    case "ion": return frame("\\draw (0,0) circle (0.35); \\node at (0,0) {ion};", 52);
    case "lone-pair": return frame("\\fill (-0.12,0) circle (0.06); \\fill (0.12,0) circle (0.06);", 42);
    case "crystal-fcc": return frame("\\draw (-0.5,-0.48) rectangle (0.35,0.35); \\draw (-0.5,0.35) -- (-0.18,0.62) -- (0.67,0.62) -- (0.35,0.35); \\draw (0.35,-0.48) -- (0.67,-0.21) -- (0.67,0.62); \\foreach \\p in {(-0.5,-0.48),(0.35,-0.48),(-0.5,0.35),(0.35,0.35),(-0.18,0.62),(0.67,0.62),(0.67,-0.21)} \\fill \\p circle (0.06); \\fill (-0.08,-0.06) circle (0.07);", 110);
    case "precipitate": return frame("\\draw (-0.48,0.55) -- (-0.36,-0.55) -- (0.36,-0.55) -- (0.48,0.55); \\fill[gray!35] (-0.36,-0.55) -- (0.36,-0.55) -- (0.31,-0.35) -- (-0.31,-0.35) -- cycle;", 80);
    case "electrochemical-cell": return frame("\\draw (-0.85,0.35) -- (-0.72,-0.5) -- (-0.18,-0.5) -- (-0.05,0.35); \\draw (0.05,0.35) -- (0.18,-0.5) -- (0.72,-0.5) -- (0.85,0.35); \\draw (-0.45,0.55) -- (-0.45,-0.18); \\draw (0.45,0.55) -- (0.45,-0.18); \\draw (-0.05,0.18) .. controls (0,0.48) and (0,0.48) .. (0.05,0.18); \\node[below] at (-0.45,-0.5) {anode}; \\node[below] at (0.45,-0.5) {cathode};", 145);
    case "beaker": return frame("\\draw (-0.55,0.65) -- (-0.42,-0.65) -- (0.42,-0.65) -- (0.55,0.65); \\draw (-0.5,0.25) -- (0.5,0.25); \\fill[blue!12] (-0.46,-0.25) -- (-0.42,-0.6) -- (0.42,-0.6) -- (0.46,-0.25) -- cycle;", 80);
    case "flask": return frame("\\draw (-0.2,0.7) -- (-0.2,0.1) arc (180:360:0.55 and 0.55) -- (0.2,0.7); \\draw (-0.23,0.7) -- (0.23,0.7);", 85);
    case "test-tube": return frame("\\draw (-0.18,0.7) -- (-0.18,-0.45) arc (180:360:0.18 and 0.25) -- (0.18,0.7); \\draw (-0.21,0.7) -- (0.21,0.7);", 52);
    case "burette": return frame("\\draw (-0.12,0.9) -- (-0.12,-0.65) -- (0.12,-0.65) -- (0.12,0.9); \\draw (-0.2,0.9) -- (0.2,0.9); \\draw (-0.3,-0.65) -- (0.3,-0.65); \\draw (0,-0.65) -- (0,-0.9);", 38);
    case "volumetric-flask": return frame("\\draw (-0.16,0.78) -- (-0.16,0.18) arc (180:360:0.48 and 0.48) -- (0.16,0.78); \\draw (-0.2,0.53) -- (0.2,0.53);", 85);
    case "separatory-funnel": return frame("\\draw (0,0.85) -- (0,0.35) -- (0.38,0) -- (0,-0.25) -- (0,-0.55) -- (-0.38,0) -- (0,0.35); \\draw (-0.22,-0.28) -- (0.22,-0.28); \\draw (-0.1,-0.55) -- (0.1,-0.55);", 75);
    case "pipette": return frame("\\draw (-0.88,0) -- (-0.23,0); \\draw (0.23,0) -- (0.88,0); \\draw (-0.23,0) ellipse (0.46 and 0.17);", 135);
    case "thermometer": return frame("\\draw (-0.1,0.78) -- (-0.1,-0.5) arc (180:360:0.1 and 0.16) -- (0.1,0.78); \\fill[red!55] (0,-0.5) circle (0.16); \\draw[red!55,very thick] (0,-0.5) -- (0,0.55);", 42);
    case "bunsen-burner": return frame("\\draw (-0.38,-0.62) rectangle (0.38,-0.43); \\draw (-0.13,-0.43) -- (-0.13,0.25) -- (0.13,0.25) -- (0.13,-0.43); \\draw[fill=orange!25] (0,0.25) .. controls (-0.28,0.55) and (-0.12,0.78) .. (0,0.95) .. controls (0.12,0.78) and (0.28,0.55) .. (0,0.25);", 75);
    default: return "";
  }
}

function objectToLatexBase(object: CanvasObject): string {
  const origin = point(object.x, object.y); const stroke = object.style?.strokeWidth && object.style.strokeWidth > 2 ? ", thick" : "";
  switch (object.kind) {
    case "line": return `\\draw${stroke} ${origin} -- ${end(object)};`;
    case "arrow": case "force": case "light-ray": return `\\draw[-{Latex}${stroke}] ${origin} -- ${end(object)};`;
    case "wire": return `\\draw ${origin} -- ${end(object)};`;
    case "resistor": return `\\draw ${origin} to[R] ${end(object)};`;
    case "capacitor": return `\\draw ${origin} to[C] ${end(object)};`;
    case "inductor": return `\\draw ${origin} to[L] ${end(object)};`;
    case "battery": return `\\draw ${origin} to[battery1] ${end(object)};`;
    case "switch": return `\\draw ${origin} to[opening switch] ${end(object)};`;
    case "voltmeter": return `\\draw ${origin} -- ${end(object)}; \\node[draw,circle,fill=white,inner sep=1pt] at ($${origin}!0.5!${end(object)}$) {V};`;
    case "ammeter": return `\\draw ${origin} -- ${end(object)}; \\node[draw,circle,fill=white,inner sep=1pt] at ($${origin}!0.5!${end(object)}$) {A};`;
    case "spring": return `\\draw[decorate, decoration={coil, aspect=0.3}] ${origin} -- ${end(object)};`;
    case "wave": return `\\draw[decorate, decoration={snake, amplitude=0.08cm, segment length=0.25cm}] ${origin} -- ${end(object)};`;
    case "heat-arrow": return `\\draw[-{Latex}] ${origin} -- ${end(object)} node[midway,above] {$Q$};`;
    case "work-arrow": return `\\draw[-{Latex}] ${origin} -- ${end(object)} node[midway,above] {$W$};`;
    case "reaction-arrow": return `\\draw[-{Latex}] ${origin} -- ${end(object)};`;
    case "equilibrium-arrow": return `\\draw[<->] ${origin} -- ${end(object)};`;
    case "hydrogen-bond": return `\\draw[dashed] ${origin} -- ${end(object)};`;
    case "dipole": return `\\draw[-{Latex}] ${origin} -- ${end(object)} node[midway,above] {$\\vec{\\mu}$};`;
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
  const scale = object.scale ?? 1; const rotation = object.rotation ?? 0;
  if (!body || (scale === 1 && rotation === 0)) return body;
  const center = objectCenter(object); const cx = center.x / SCALE; const cy = -center.y / SCALE;
  const angle = (-rotation * Math.PI) / 180;
  const a = scale * Math.cos(angle); const b = scale * Math.sin(angle); const c = -scale * Math.sin(angle); const d = scale * Math.cos(angle);
  const tx = cx - a * cx - c * cy; const ty = cy - b * cx - d * cy;
  return `\\begin{scope}[cm={${matrixNumber(a)},${matrixNumber(b)},${matrixNumber(c)},${matrixNumber(d)},(${matrixNumber(tx)},${matrixNumber(ty)})}]\n${body}\n\\end{scope}`;
}

export function documentFor(objects: CanvasObject[], snippetOnly = false): string {
  const body = objects.map(objectToLatex).filter(Boolean).join("\n\n  ");
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
