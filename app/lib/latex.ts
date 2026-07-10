import type { CanvasObject, Point } from "./canvas-types";

const SCALE = 50;
const n = (value: number) => (Math.round((value / SCALE) * 100) / 100).toFixed(2);
const point = (x: number, y: number) => `(${n(x)},${n(-y)})`;
const end = (object: CanvasObject) => point(object.x2 ?? object.x, object.y2 ?? object.y);

function safeText(value = "") {
  // Math entered as $...$ remains intentionally raw; plain labels are escaped.
  if (value.includes("$")) return value;
  return value.replace(/\\/g, "\\textbackslash{} ").replace(/([#%&_{}])/g, "\\$1");
}

function simplify(points: Point[], tolerance = 1.5): Point[] {
  if (points.length < 3) return points;
  const first = points[0];
  const last = points[points.length - 1];
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const lengthSquared = dx * dx + dy * dy;
  let index = -1;
  let maximum = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const p = points[i];
    const distance = lengthSquared === 0
      ? Math.hypot(p.x - first.x, p.y - first.y)
      : Math.abs(dy * p.x - dx * p.y + last.x * first.y - last.y * first.x) / Math.sqrt(lengthSquared);
    if (distance > maximum) { maximum = distance; index = i; }
  }
  if (maximum <= tolerance || index < 0) return [first, last];
  return [...simplify(points.slice(0, index + 1), tolerance), ...simplify(points.slice(index), tolerance).slice(1)];
}

function bondLines(object: CanvasObject, count: number) {
  const x1 = object.x; const y1 = object.y; const x2 = object.x2 ?? x1; const y2 = object.y2 ?? y1;
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const px = (-(y2 - y1) / len) * 4;
  const py = ((x2 - x1) / len) * 4;
  const offsets = count === 1 ? [0] : count === 2 ? [-1, 1] : [-2, 0, 2];
  return offsets.map((offset) => `\\draw ${point(x1 + px * offset, y1 + py * offset)} -- ${point(x2 + px * offset, y2 + py * offset)};`).join("\n");
}

function stamp(object: CanvasObject) {
  const x = n(object.x); const y = n(-object.y); const scale = n((object.width ?? 70) / 70);
  const rotation = object.rotation ?? 0;
  const frame = (body: string) => `\\begin{scope}[shift={(${x},${y})}, scale=${scale}, rotate=${rotation}]\n${body}\n\\end{scope}`;
  switch (object.kind) {
    case "beaker": return frame("\\draw (-0.55,0.65) -- (-0.42,-0.65) -- (0.42,-0.65) -- (0.55,0.65);\n\\draw (-0.5,0.25) -- (0.5,0.25);\n\\fill[blue!12] (-0.46,-0.25) -- (-0.42,-0.6) -- (0.42,-0.6) -- (0.46,-0.25) -- cycle;");
    case "flask": return frame("\\draw (-0.2,0.7) -- (-0.2,0.1) arc (180:360:0.55 and 0.55) -- (0.2,0.7);\n\\draw (-0.23,0.7) -- (0.23,0.7);");
    case "test-tube": return frame("\\draw (-0.18,0.7) -- (-0.18,-0.45) arc (180:360:0.18 and 0.25) -- (0.18,0.7);\n\\draw (-0.21,0.7) -- (0.21,0.7);");
    case "pulley": return frame("\\draw (0,0) circle (0.45); \\fill (0,0) circle (0.05); \\draw (-0.8,0.85) -- (0.8,0.85); \\draw (-0.45,0) -- (-0.45,-0.8);");
    case "lens": return frame("\\draw (0,0) ellipse (0.22 and 0.62); \\draw (-1,0) -- (-0.22,0); \\draw (0.22,0) -- (1,0);");
    default: return "";
  }
}

export function objectToLatex(object: CanvasObject): string {
  const origin = point(object.x, object.y);
  const stroke = object.style?.strokeWidth && object.style.strokeWidth > 2 ? ", thick" : "";
  switch (object.kind) {
    case "line": return `\\draw${stroke} ${origin} -- ${end(object)};`;
    case "arrow": case "force": return `\\draw[-{Latex}${stroke}] ${origin} -- ${end(object)};`;
    case "wire": return `\\draw ${origin} -- ${end(object)};`;
    case "resistor": return `\\draw ${origin} to[R] ${end(object)};`;
    case "battery": return `\\draw ${origin} to[battery1] ${end(object)};`;
    case "capacitor": return `\\draw ${origin} to[C] ${end(object)};`;
    case "spring": return `\\draw[decorate, decoration={coil, aspect=0.3}] ${origin} -- ${end(object)};`;
    case "reaction-arrow": return `\\draw[<->] ${origin} -- ${end(object)};`;
    case "bond-single": return bondLines(object, 1);
    case "bond-double": return bondLines(object, 2);
    case "bond-triple": return bondLines(object, 3);
    case "rect": return `\\draw ${origin} rectangle ${point(object.x + (object.width ?? 0), object.y + (object.height ?? 0))};`;
    case "circle": return `\\draw ${point(object.x + (object.width ?? 0) / 2, object.y + (object.height ?? 0) / 2)} circle (${n(Math.abs(object.width ?? 0) / 2)});`;
    case "ellipse": return `\\draw ${point(object.x + (object.width ?? 0) / 2, object.y + (object.height ?? 0) / 2)} ellipse (${n(Math.abs(object.width ?? 0) / 2)} and ${n(Math.abs(object.height ?? 0) / 2)});`;
    case "text": return `\\node at ${origin} {${safeText(object.text)}};`;
    case "freehand": {
      const points = simplify(object.points ?? []);
      return points.length > 1 ? `\\draw[smooth, tension=0.7] plot coordinates {${points.map((p) => point(p.x, p.y)).join(" ")}};` : "";
    }
    case "axes": {
      const width = n(object.width ?? 250); const height = n(object.height ?? 180);
      const expression = object.graph?.expression?.trim();
      const domain = `${object.graph?.xMin ?? -5}:${object.graph?.xMax ?? 5}`;
      return `\\begin{axis}[at={${origin}}, anchor=north west, width=${width}cm, height=${height}cm, xmin=-5, xmax=5, ymin=-5, ymax=5, axis lines=middle, grid=both, xlabel={$x$}, ylabel={$y$}]\n${expression ? `  \\addplot[domain=${domain}, samples=100, smooth] {${expression}};` : ""}\n\\end{axis}`;
    }
    case "beaker": case "flask": case "test-tube": case "pulley": case "lens": return stamp(object);
    default: return "";
  }
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
