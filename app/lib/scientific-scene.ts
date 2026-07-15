import { annotation, type CanvasObject, type ObjectKind } from "./canvas-types";
import { CANVAS_UNITS_PER_CM, tikzStrokeWidth } from "./concours-style";

type FillRole = "none" | "paper" | "ink" | "light";

export type ScientificPrimitive =
  | { type: "line"; x1: number; y1: number; x2: number; y2: number; arrowEnd?: boolean; strokeWidth?: number }
  | { type: "circle"; cx: number; cy: number; r: number; fill?: FillRole; strokeWidth?: number }
  | { type: "ellipse"; cx: number; cy: number; rx: number; ry: number; fill?: FillRole; strokeWidth?: number }
  | { type: "rect"; x: number; y: number; width: number; height: number; fill?: FillRole; strokeWidth?: number }
  | { type: "arc"; cx: number; cy: number; r: number; start: number; end: number; arrowEnd?: boolean; strokeWidth?: number }
  | { type: "text"; x: number; y: number; value: string; latex?: string; anchor?: "start" | "middle" | "end"; fontSize?: number; vector?: boolean };

export const sharedScientificKinds: ObjectKind[] = [
  "mass", "pulley", "pendulum", "reference-frame", "circular-trajectory", "gravity-field", "electric-field", "magnetic-field-in", "magnetic-field-out", "bar-magnet", "coil", "solenoid", "laplace-rails", "charged-particle",
];

export function scientificSceneFor(object: CanvasObject): ScientificPrimitive[] | undefined {
  if (!sharedScientificKinds.includes(object.kind)) return undefined;
  const x = object.x; const y = object.y; const width = object.width ?? 80; const height = object.height ?? 80; const cx = x + width / 2; const cy = y + height / 2;
  const label = (key: string, fallback: string) => annotation(object, key, fallback);
  if (object.kind === "mass") return [
    { type: "rect", x: x + 5, y: y + 8, width: width - 10, height: height - 16, fill: "paper" },
    { type: "text", x: cx, y: cy + 5, value: label("main", "m"), anchor: "middle", fontSize: 14 },
  ];
  if (object.kind === "pulley") return [
    { type: "circle", cx, cy, r: width * .32 },
    { type: "circle", cx, cy, r: 4, fill: "ink" },
  ];
  if (object.kind === "pendulum") return [
    { type: "line", x1: cx - width * .25, y1: y + 6, x2: cx + width * .25, y2: y + 6 },
    { type: "line", x1: cx, y1: y + 6, x2: cx, y2: y + height * .72 },
    { type: "circle", cx, cy: y + height * .82, r: width * .17, fill: "paper" },
  ];
  if (object.kind === "reference-frame") {
    const origin = { x: x + width * .2, y: y + height * .78 };
    return [
      { type: "line", x1: origin.x, y1: origin.y, x2: x + width * .84, y2: origin.y, arrowEnd: true },
      { type: "line", x1: origin.x, y1: origin.y, x2: origin.x, y2: y + height * .18, arrowEnd: true },
      { type: "circle", cx: origin.x, cy: origin.y, r: 2.2, fill: "ink" },
      { type: "text", x: x + width * .15, y: y + height * .92, value: label("origin", "O"), anchor: "middle", fontSize: 13 },
      { type: "text", x: x + width * .91, y: y + height * .86, value: label("x", "x"), anchor: "middle", fontSize: 13 },
      { type: "text", x: x + width * .13, y: y + height * .15, value: label("y", "y"), anchor: "middle", fontSize: 13 },
    ];
  }
  if (object.kind === "circular-trajectory") return [
    { type: "arc", cx, cy, r: Math.min(width, height) * .35, start: 28, end: 338, arrowEnd: true },
    { type: "circle", cx, cy, r: 3, fill: "ink" },
    { type: "text", x: cx, y: cy + 18, value: label("origin", "O"), anchor: "middle", fontSize: 13 },
  ];
  if (object.kind === "gravity-field") return [
    ...[.2, .5, .8].map((position): ScientificPrimitive => ({ type: "line", x1: x + width * position, y1: y + height * .15, x2: x + width * position, y2: y + height * .78, arrowEnd: true })),
    { type: "text", x: x + width * .9, y: cy, value: label("main", "g"), anchor: "middle", fontSize: 14, vector: true },
  ];
  if (object.kind === "electric-field") return [
    ...[.22, .5, .78].map((position): ScientificPrimitive => ({ type: "line", x1: x + width * .12, y1: y + height * position, x2: x + width * .86, y2: y + height * position, arrowEnd: true })),
    { type: "text", x: x + width * .92, y: cy - 7, value: label("main", "E"), anchor: "middle", fontSize: 14, vector: true },
  ];
  if (object.kind === "bar-magnet") return [
    { type: "rect", x: x + 4, y: y + height * .2, width: width - 8, height: height * .6, fill: "paper" },
    { type: "line", x1: cx, y1: y + height * .2, x2: cx, y2: y + height * .8 },
    { type: "text", x: x + width * .28, y: cy + 5, value: label("north", "N"), anchor: "middle", fontSize: 14 },
    { type: "text", x: x + width * .72, y: cy + 5, value: label("south", "S"), anchor: "middle", fontSize: 14 },
  ];
  if (object.kind === "coil" || object.kind === "solenoid") {
    const count = object.kind === "coil" ? 4 : 6; const start = object.kind === "coil" ? .16 : .16; const step = object.kind === "coil" ? .22 : .14; const rx = width * (object.kind === "coil" ? .1 : .12);
    return [
      { type: "line", x1: x + 2, y1: cy, x2: x + width * start - rx, y2: cy },
      ...Array.from({ length: count }, (_, index): ScientificPrimitive => ({ type: "ellipse", cx: x + width * (start + index * step), cy, rx, ry: height * .32 })),
      { type: "line", x1: x + width * (start + (count - 1) * step) + rx, y1: cy, x2: x + width - 2, y2: cy },
    ];
  }
  if (object.kind === "laplace-rails") return [
    { type: "line", x1: x + 5, y1: y + height * .25, x2: x + width - 5, y2: y + height * .25 },
    { type: "line", x1: x + 5, y1: y + height * .75, x2: x + width - 5, y2: y + height * .75 },
    { type: "line", x1: x + width * .55, y1: y + height * .25, x2: x + width * .55, y2: y + height * .75, strokeWidth: 4 },
    { type: "line", x1: x + width * .62, y1: cy, x2: x + width * .85, y2: cy, arrowEnd: true },
    { type: "text", x: x + width * .9, y: cy - 6, value: label("velocity", "v"), anchor: "middle", fontSize: 13, vector: true },
    { type: "text", x: x + width * .18, y: cy + 5, value: "B", anchor: "middle", fontSize: 13, vector: true },
  ];
  if (object.kind === "charged-particle") return [
    { type: "circle", cx, cy, r: Math.min(width, height) * .34, fill: "paper" },
    { type: "text", x: cx, y: cy + 5, value: label("main", "q"), anchor: "middle", fontSize: 14 },
  ];
  const glyph = object.kind === "magnetic-field-in" ? "⊗" : "⊙"; const latex = object.kind === "magnetic-field-in" ? "\\otimes" : "\\odot";
  return [
    ...[.25, .5, .75].flatMap((column) => [.3, .7].map((row): ScientificPrimitive => ({ type: "text", x: x + width * column, y: y + height * row, value: glyph, latex, anchor: "middle", fontSize: 20 }))),
    { type: "text", x: cx, y: y + height * .96, value: "B", anchor: "middle", fontSize: 13, vector: true },
  ];
}

const value = (number: number) => (Math.round((number / CANVAS_UNITS_PER_CM) * 100) / 100).toFixed(2);
const point = (x: number, y: number) => `(${value(x)},${value(-y)})`;
const escapeLatex = (text: string) => text.replace(/\\/g, "\\textbackslash{} ").replace(/([#%&_{}])/g, "\\$1");
const labelLatex = (primitive: Extract<ScientificPrimitive, { type: "text" }>) => {
  if (primitive.latex) return `$${primitive.latex}$`;
  if (primitive.value.includes("$")) return primitive.value;
  return primitive.vector ? `$\\vec{${escapeLatex(primitive.value)}}$` : `$${escapeLatex(primitive.value)}$`;
};
const widthOption = (strokeWidth?: number) => strokeWidth === undefined ? "" : `line width=${tikzStrokeWidth(strokeWidth).toFixed(2)}pt`;
const drawOptions = (...options: Array<string | undefined>) => { const kept = options.filter(Boolean); return kept.length ? `[${kept.join(",")}]` : ""; };

export function scientificSceneToTikz(scene: ScientificPrimitive[]): string {
  return scene.map((primitive) => {
    if (primitive.type === "line") return `\\draw${drawOptions(primitive.arrowEnd ? "-{Latex}" : undefined, widthOption(primitive.strokeWidth))} ${point(primitive.x1, primitive.y1)} -- ${point(primitive.x2, primitive.y2)};`;
    if (primitive.type === "circle") {
      const command = primitive.fill === "ink" ? "\\fill" : "\\draw"; const fill = primitive.fill === "paper" ? "fill=white" : primitive.fill === "light" ? "fill=gray!12" : undefined;
      return `${command}${drawOptions(fill, widthOption(primitive.strokeWidth))} ${point(primitive.cx, primitive.cy)} circle (${value(primitive.r)});`;
    }
    if (primitive.type === "ellipse") {
      const fill = primitive.fill === "paper" ? "fill=white" : primitive.fill === "light" ? "fill=gray!12" : primitive.fill === "ink" ? "fill=black" : undefined;
      return `\\draw${drawOptions(fill, widthOption(primitive.strokeWidth))} ${point(primitive.cx, primitive.cy)} ellipse (${value(primitive.rx)} and ${value(primitive.ry)});`;
    }
    if (primitive.type === "rect") {
      const fill = primitive.fill === "paper" ? "fill=white" : primitive.fill === "light" ? "fill=gray!12" : primitive.fill === "ink" ? "fill=black" : undefined;
      return `\\draw${drawOptions(fill, widthOption(primitive.strokeWidth))} ${point(primitive.x, primitive.y)} rectangle ${point(primitive.x + primitive.width, primitive.y + primitive.height)};`;
    }
    if (primitive.type === "arc") {
      const startX = primitive.cx + Math.cos((primitive.start * Math.PI) / 180) * primitive.r; const startY = primitive.cy + Math.sin((primitive.start * Math.PI) / 180) * primitive.r;
      return `\\draw${drawOptions(primitive.arrowEnd ? "-{Latex}" : undefined, widthOption(primitive.strokeWidth))} ${point(startX, startY)} arc[start angle=${-primitive.start},end angle=${-primitive.end},radius=${value(primitive.r)}cm];`;
    }
    return `\\node at ${point(primitive.x, primitive.y)} {${labelLatex(primitive)}};`;
  }).join("\n");
}
