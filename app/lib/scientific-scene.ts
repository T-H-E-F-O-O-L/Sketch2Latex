import { annotation, type CanvasObject, type ObjectKind, type Point } from "./canvas-types";
import { CANVAS_UNITS_PER_CM, tikzStrokeWidth } from "./concours-style";
import { scientificLabelToLatex } from "./scientific-label";

type FillRole = "none" | "paper" | "ink" | "light";

export type ScientificPrimitive =
  | { type: "line"; x1: number; y1: number; x2: number; y2: number; arrowEnd?: boolean; dashed?: boolean; strokeWidth?: number }
  | { type: "circle"; cx: number; cy: number; r: number; fill?: FillRole; strokeWidth?: number }
  | { type: "ellipse"; cx: number; cy: number; rx: number; ry: number; fill?: FillRole; strokeWidth?: number }
  | { type: "rect"; x: number; y: number; width: number; height: number; fill?: FillRole; strokeWidth?: number }
  | { type: "polyline"; points: Point[]; closed?: boolean; fill?: FillRole; strokeWidth?: number }
  | { type: "bezier"; start: Point; control1: Point; control2: Point; end: Point; arrowEnd?: boolean; dashed?: boolean; strokeWidth?: number }
  | { type: "arc"; cx: number; cy: number; r: number; start: number; end: number; arrowEnd?: boolean; strokeWidth?: number }
  | { type: "text"; x: number; y: number; value: string; latex?: string; anchor?: "start" | "middle" | "end"; fontSize?: number; vector?: boolean; math?: boolean | "raw" };

export const sharedScientificKinds: ObjectKind[] = [
  "mass", "pulley", "pendulum", "reference-frame", "circular-trajectory", "gravity-field", "electric-field", "magnetic-field-in", "magnetic-field-out", "bar-magnet", "coil", "solenoid", "laplace-rails", "charged-particle", "plane-mirror", "screen", "prism", "fiber", "piston-cylinder", "thermal-reservoir", "heat-engine",
  "ion", "lone-pair", "crystal-fcc", "precipitate", "electrochemical-cell", "beaker", "flask", "round-bottom-flask", "distillation-flask", "test-tube", "graduated-cylinder", "burette", "volumetric-flask", "separatory-funnel", "pipette", "filter-funnel", "wash-bottle", "liebig-condenser", "support-stand", "magnetic-stirrer", "thermometer", "bunsen-burner",
  "ground", "gbf", "oscilloscope", "op-amp", "op-amp-comparator", "op-amp-inverting", "op-amp-non-inverting", "op-amp-summing", "op-amp-integrator", "op-amp-differentiator", "op-amp-schmitt",
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
  if (object.kind === "plane-mirror" || object.kind === "screen") return [
    { type: "line", x1: cx, y1: y + 4, x2: cx, y2: y + height - 4, strokeWidth: 4 },
    ...Array.from({ length: 5 }, (_, index): ScientificPrimitive => ({ type: "line", x1: cx, y1: y + 12 + index * height * .17, x2: cx + (object.kind === "plane-mirror" ? 10 : -10), y2: y + 18 + index * height * .17 })),
  ];
  if (object.kind === "prism") return [
    { type: "polyline", points: [{ x: x + 6, y: y + height - 6 }, { x: x + width - 6, y: y + height - 6 }, { x: cx, y: y + 7 }], closed: true, fill: "paper" },
  ];
  if (object.kind === "fiber") return [
    { type: "bezier", start: { x: x + 4, y: y + height * .3 }, control1: { x: x + width * .35, y: y + height * .2 }, control2: { x: x + width * .62, y: y + height * .83 }, end: { x: x + width - 5, y: y + height * .62 } },
    { type: "bezier", start: { x: x + 4, y: y + height * .52 }, control1: { x: x + width * .35, y: y + height * .42 }, control2: { x: x + width * .62, y: y + height * 1.03 }, end: { x: x + width - 5, y: y + height * .84 } },
  ];
  if (object.kind === "piston-cylinder") return [
    { type: "polyline", points: [{ x: x + width * .18, y: y + height * .9 }, { x: x + width * .18, y: y + height * .12 }, { x: x + width * .82, y: y + height * .12 }, { x: x + width * .82, y: y + height * .9 }] },
    { type: "line", x1: x + width * .14, y1: y + height * .38, x2: x + width * .86, y2: y + height * .38, strokeWidth: 4 },
    { type: "line", x1: cx, y1: y + height * .38, x2: cx, y2: y + 3 },
    { type: "text", x: cx, y: y + height * .73, value: label("main", "P, V, T"), anchor: "middle", fontSize: 12 },
  ];
  if (object.kind === "thermal-reservoir") return [
    { type: "circle", cx, cy, r: Math.min(width, height) * .4, fill: "paper" },
    { type: "text", x: cx, y: cy + 5, value: label("main", "T"), anchor: "middle", fontSize: 14 },
  ];
  if (object.kind === "heat-engine") return [
    { type: "rect", x: x + width * .2, y: y + height * .28, width: width * .6, height: height * .42, fill: "paper" },
    { type: "text", x: cx, y: cy + 5, value: label("main", "machine"), anchor: "middle", fontSize: 11, math: false },
    { type: "line", x1: cx, y1: y + 3, x2: cx, y2: y + height * .25, arrowEnd: true },
    { type: "line", x1: cx, y1: y + height * .72, x2: cx, y2: y + height - 3, arrowEnd: true },
    { type: "line", x1: x + width * .82, y1: cy, x2: x + width - 3, y2: cy, arrowEnd: true },
    { type: "text", x: cx + 10, y: y + height * .18, value: label("hot", "Qh"), latex: label("hot", "Qh") === "Qh" ? "Q_h" : undefined, anchor: "middle", fontSize: 11 },
    { type: "text", x: cx + 10, y: y + height * .94, value: label("cold", "Qc"), latex: label("cold", "Qc") === "Qc" ? "Q_c" : undefined, anchor: "middle", fontSize: 11 },
    { type: "text", x: x + width * .92, y: cy - 5, value: label("work", "W"), anchor: "middle", fontSize: 11 },
  ];
  if (object.kind === "ion") return [
    { type: "circle", cx, cy, r: Math.min(width, height) * .34, fill: "paper" },
    { type: "text", x: cx, y: cy + 5, value: label("main", "ion"), anchor: "middle", fontSize: 13, math: "raw" },
  ];
  if (object.kind === "lone-pair") return [
    { type: "circle", cx: cx - width * .17, cy, r: Math.max(2.4, Math.min(width, height) * .07), fill: "ink" },
    { type: "circle", cx: cx + width * .17, cy, r: Math.max(2.4, Math.min(width, height) * .07), fill: "ink" },
  ];
  if (object.kind === "crystal-fcc") {
    const atoms = [[.14, .28], [.72, .28], [.14, .83], [.72, .83], [.36, .1], [.94, .1], [.94, .65], [.43, .55]];
    return [
      { type: "rect", x: x + width * .14, y: y + height * .28, width: width * .58, height: height * .55 },
      { type: "polyline", points: [{ x: x + width * .14, y: y + height * .28 }, { x: x + width * .36, y: y + height * .1 }, { x: x + width * .94, y: y + height * .1 }, { x: x + width * .72, y: y + height * .28 }] },
      { type: "polyline", points: [{ x: x + width * .72, y: y + height * .28 }, { x: x + width * .94, y: y + height * .1 }, { x: x + width * .94, y: y + height * .65 }, { x: x + width * .72, y: y + height * .83 }] },
      ...atoms.map(([ax, ay]): ScientificPrimitive => ({ type: "circle", cx: x + width * ax, cy: y + height * ay, r: Math.max(3, Math.min(width, height) * .04), fill: "ink" })),
    ];
  }
  if (object.kind === "precipitate") return [
    { type: "polyline", points: [{ x: x + width * .22, y: y + height * .88 }, { x: x + width * .78, y: y + height * .88 }, { x: x + width * .73, y: y + height * .67 }, { x: x + width * .27, y: y + height * .67 }], closed: true, fill: "light" },
    { type: "polyline", points: [{ x: x + width * .12, y: y + height * .1 }, { x: x + width * .22, y: y + height * .88 }, { x: x + width * .78, y: y + height * .88 }, { x: x + width * .88, y: y + height * .1 }] },
  ];
  if (object.kind === "electrochemical-cell") return [
    { type: "polyline", points: [{ x: x + width * .1, y: y + height * .59 }, { x: x + width * .13, y: y + height * .81 }, { x: x + width * .38, y: y + height * .81 }, { x: x + width * .41, y: y + height * .59 }], closed: true, fill: "light" },
    { type: "polyline", points: [{ x: x + width * .59, y: y + height * .59 }, { x: x + width * .62, y: y + height * .81 }, { x: x + width * .87, y: y + height * .81 }, { x: x + width * .9, y: y + height * .59 }], closed: true, fill: "light" },
    { type: "polyline", points: [{ x: x + width * .06, y: y + height * .2 }, { x: x + width * .12, y: y + height * .84 }, { x: x + width * .39, y: y + height * .84 }, { x: x + width * .45, y: y + height * .2 }] },
    { type: "polyline", points: [{ x: x + width * .55, y: y + height * .2 }, { x: x + width * .61, y: y + height * .84 }, { x: x + width * .88, y: y + height * .84 }, { x: x + width * .94, y: y + height * .2 }] },
    { type: "line", x1: x + width * .25, y1: y + height * .12, x2: x + width * .25, y2: y + height * .72, strokeWidth: 4 },
    { type: "line", x1: x + width * .75, y1: y + height * .12, x2: x + width * .75, y2: y + height * .72, strokeWidth: 4 },
    { type: "line", x1: x + width * .31, y1: y + height * .66, x2: x + width * .31, y2: y + height * .35, strokeWidth: 4 },
    { type: "bezier", start: { x: x + width * .31, y: y + height * .35 }, control1: { x: x + width * .42, y: y + height * .16 }, control2: { x: x + width * .58, y: y + height * .16 }, end: { x: x + width * .69, y: y + height * .35 }, strokeWidth: 4 },
    { type: "line", x1: x + width * .69, y1: y + height * .35, x2: x + width * .69, y2: y + height * .66, strokeWidth: 4 },
    { type: "line", x1: x + width * .25, y1: y + height * .12, x2: x + width * .75, y2: y + height * .12, dashed: true },
    { type: "text", x: x + width * .25, y: y + height * .96, value: label("anode", "anode (-)"), anchor: "middle", fontSize: 11, math: false },
    { type: "text", x: x + width * .75, y: y + height * .96, value: label("cathode", "cathode (+)"), anchor: "middle", fontSize: 11, math: false },
    { type: "text", x: cx, y: y + height * .25, value: label("bridge", "pont salin"), anchor: "middle", fontSize: 11, math: false },
  ];
  if (object.kind === "beaker") return [
    { type: "polyline", points: [{ x: x + width * .18, y: y + height * .58 }, { x: x + width * .22, y: y + height * .86 }, { x: x + width * .78, y: y + height * .86 }, { x: x + width * .82, y: y + height * .58 }], closed: true, fill: "light" },
    { type: "polyline", points: [{ x: x + width * .14, y: y + height * .1 }, { x: x + width * .2, y: y + height * .9 }, { x: x + width * .8, y: y + height * .9 }, { x: x + width * .86, y: y + height * .1 }] },
    ...[.32, .44, .56].map((position): ScientificPrimitive => ({ type: "line", x1: x + width * .29, y1: y + height * position, x2: x + width * .38, y2: y + height * position })),
  ];
  if (object.kind === "flask") return [
    { type: "polyline", points: [{ x: x + width * .24, y: y + height * .7 }, { x: x + width * .16, y: y + height * .87 }, { x: x + width * .84, y: y + height * .87 }, { x: x + width * .76, y: y + height * .7 }], closed: true, fill: "light" },
    { type: "polyline", points: [{ x: x + width * .42, y: y + height * .06 }, { x: x + width * .42, y: y + height * .32 }, { x: x + width * .14, y: y + height * .9 }, { x: x + width * .86, y: y + height * .9 }, { x: x + width * .58, y: y + height * .32 }, { x: x + width * .58, y: y + height * .06 }] },
  ];
  if (object.kind === "round-bottom-flask" || object.kind === "distillation-flask") {
    const centerX = object.kind === "distillation-flask" ? x + width * .47 : cx; const radius = Math.min(width, height) * (object.kind === "distillation-flask" ? .31 : .35);
    const scene: ScientificPrimitive[] = [
      { type: "polyline", points: [{ x: centerX - radius * .72, y: y + height * .68 }, { x: centerX, y: y + height * .78 }, { x: centerX + radius * .72, y: y + height * .68 }], closed: true, fill: "light" },
      { type: "line", x1: centerX - width * .08, y1: y + height * .06, x2: centerX - width * .08, y2: y + height * .31 },
      { type: "line", x1: centerX + width * .08, y1: y + height * .06, x2: centerX + width * .08, y2: y + height * .31 },
      { type: "circle", cx: centerX, cy: y + height * .62, r: radius },
    ];
    if (object.kind === "distillation-flask") scene.push(
      { type: "line", x1: x + width * .67, y1: y + height * .48, x2: x + width * .94, y2: y + height * .34 },
      { type: "line", x1: x + width * .7, y1: y + height * .57, x2: x + width * .96, y2: y + height * .45 },
      { type: "line", x1: x + width * .94, y1: y + height * .34, x2: x + width * .96, y2: y + height * .45 },
    );
    return scene;
  }
  if (object.kind === "test-tube") return [
    { type: "polyline", points: [{ x: x + width * .38, y: y + height * .63 }, { x: x + width * .38, y: y + height * .72 }, { x: cx, y: y + height * .84 }, { x: x + width * .62, y: y + height * .72 }, { x: x + width * .62, y: y + height * .63 }], closed: true, fill: "light" },
    { type: "line", x1: x + width * .36, y1: y + height * .06, x2: x + width * .36, y2: y + height * .72 },
    { type: "bezier", start: { x: x + width * .36, y: y + height * .72 }, control1: { x: x + width * .36, y: y + height * .9 }, control2: { x: x + width * .64, y: y + height * .9 }, end: { x: x + width * .64, y: y + height * .72 } },
    { type: "line", x1: x + width * .64, y1: y + height * .72, x2: x + width * .64, y2: y + height * .06 },
  ];
  if (object.kind === "graduated-cylinder") return [
    { type: "rect", x: x + width * .34, y: y + height * .58, width: width * .32, height: height * .29, fill: "light" },
    { type: "polyline", points: [{ x: x + width * .32, y: y + height * .05 }, { x: x + width * .35, y: y + height * .87 }, { x: x + width * .65, y: y + height * .87 }, { x: x + width * .68, y: y + height * .05 }] },
    { type: "line", x1: x + width * .18, y1: y + height * .93, x2: x + width * .82, y2: y + height * .93, strokeWidth: 3 },
    ...Array.from({ length: 7 }, (_, index): ScientificPrimitive => ({ type: "line", x1: x + width * .35, y1: y + height * (.16 + index * .09), x2: x + width * (index % 2 ? .48 : .44), y2: y + height * (.16 + index * .09) })),
  ];
  if (object.kind === "burette") return [
    { type: "rect", x: x + width * .4, y: y + height * .04, width: width * .2, height: height * .7 },
    ...Array.from({ length: 8 }, (_, index): ScientificPrimitive => ({ type: "line", x1: x + width * .4, y1: y + height * (.12 + index * .07), x2: x + width * (index % 2 ? .5 : .47), y2: y + height * (.12 + index * .07) })),
    { type: "circle", cx, cy: y + height * .78, r: width * .11, fill: "paper" },
    { type: "line", x1: x + width * .25, y1: y + height * .78, x2: x + width * .75, y2: y + height * .78, strokeWidth: 3 },
    { type: "line", x1: cx, y1: y + height * .89, x2: cx, y2: y + height * .98 },
  ];
  if (object.kind === "volumetric-flask") return [
    { type: "polyline", points: [{ x: x + width * .28, y: y + height * .62 }, { x: x + width * .2, y: y + height * .86 }, { x: x + width * .8, y: y + height * .86 }, { x: x + width * .72, y: y + height * .62 }], closed: true, fill: "light" },
    { type: "line", x1: x + width * .43, y1: y + height * .05, x2: x + width * .43, y2: y + height * .34 },
    { type: "line", x1: x + width * .57, y1: y + height * .05, x2: x + width * .57, y2: y + height * .34 },
    { type: "bezier", start: { x: x + width * .43, y: y + height * .34 }, control1: { x: x + width * .38, y: y + height * .45 }, control2: { x: x + width * .15, y: y + height * .58 }, end: { x: x + width * .2, y: y + height * .82 } },
    { type: "bezier", start: { x: x + width * .2, y: y + height * .82 }, control1: { x: x + width * .25, y: y + height * .98 }, control2: { x: x + width * .75, y: y + height * .98 }, end: { x: x + width * .8, y: y + height * .82 } },
    { type: "bezier", start: { x: x + width * .8, y: y + height * .82 }, control1: { x: x + width * .85, y: y + height * .58 }, control2: { x: x + width * .62, y: y + height * .45 }, end: { x: x + width * .57, y: y + height * .34 } },
    { type: "line", x1: x + width * .35, y1: y + height * .25, x2: x + width * .65, y2: y + height * .25 },
  ];
  if (object.kind === "separatory-funnel") return [
    { type: "rect", x: x + width * .38, y: y + height * .03, width: width * .24, height: height * .1, fill: "paper" },
    { type: "polyline", points: [{ x: cx, y: y + height * .14 }, { x: x + width * .79, y: y + height * .44 }, { x: cx, y: y + height * .77 }, { x: x + width * .21, y: y + height * .44 }], closed: true },
    { type: "polyline", points: [{ x: x + width * .3, y: y + height * .56 }, { x: cx, y: y + height * .73 }, { x: x + width * .7, y: y + height * .56 }], closed: true, fill: "light" },
    { type: "line", x1: x + width * .34, y1: y + height * .78, x2: x + width * .66, y2: y + height * .78 },
    { type: "circle", cx, cy: y + height * .78, r: width * .09, fill: "paper" },
    { type: "line", x1: cx, y1: y + height * .87, x2: cx, y2: y + height * .98 },
  ];
  if (object.kind === "pipette") return [
    { type: "line", x1: cx, y1: y + height * .04, x2: cx, y2: y + height * .3 },
    { type: "ellipse", cx, cy: y + height * .48, rx: width * .18, ry: height * .2 },
    { type: "line", x1: cx, y1: y + height * .68, x2: cx, y2: y + height * .92 },
    { type: "polyline", points: [{ x: cx, y: y + height * .98 }, { x: cx - width * .06, y: y + height * .9 }, { x: cx + width * .06, y: y + height * .9 }], closed: true, fill: "ink" },
    { type: "line", x1: x + width * .36, y1: y + height * .23, x2: x + width * .64, y2: y + height * .23 },
  ];
  if (object.kind === "filter-funnel") return [
    { type: "polyline", points: [{ x: x + width * .24, y: y + height * .16 }, { x: x + width * .76, y: y + height * .16 }, { x: cx, y: y + height * .47 }], closed: true, fill: "light" },
    { type: "polyline", points: [{ x: x + width * .12, y: y + height * .1 }, { x: x + width * .88, y: y + height * .1 }, { x: cx, y: y + height * .55 }], closed: true },
    { type: "line", x1: cx, y1: y + height * .55, x2: cx, y2: y + height * .96 },
  ];
  if (object.kind === "wash-bottle") return [
    { type: "polyline", points: [{ x: x + width * .23, y: y + height * .65 }, { x: x + width * .24, y: y + height * .83 }, { x: cx, y: y + height * .9 }, { x: x + width * .76, y: y + height * .83 }, { x: x + width * .77, y: y + height * .65 }], closed: true, fill: "light" },
    { type: "bezier", start: { x: x + width * .25, y: y + height * .28 }, control1: { x: x + width * .18, y: y + height * .42 }, control2: { x: x + width * .18, y: y + height * .8 }, end: { x: x + width * .24, y: y + height * .84 } },
    { type: "bezier", start: { x: x + width * .24, y: y + height * .84 }, control1: { x: x + width * .4, y: y + height * .96 }, control2: { x: x + width * .7, y: y + height * .96 }, end: { x: x + width * .82, y: y + height * .84 } },
    { type: "bezier", start: { x: x + width * .82, y: y + height * .84 }, control1: { x: x + width * .82, y: y + height * .42 }, control2: { x: x + width * .77, y: y + height * .32 }, end: { x: x + width * .7, y: y + height * .28 } },
    { type: "polyline", points: [{ x: x + width * .43, y: y + height * .28 }, { x: x + width * .43, y: y + height * .1 }, { x: x + width * .56, y: y + height * .05 }, { x: x + width * .72, y: y + height * .14 }, { x: x + width * .88, y: y + height * .08 }] },
  ];
  if (object.kind === "liebig-condenser") return [
    { type: "rect", x: x + width * .08, y: y + height * .32, width: width * .84, height: height * .36 },
    { type: "line", x1: x + width * .02, y1: cy, x2: x + width * .98, y2: cy },
    { type: "line", x1: x + width * .22, y1: y + height * .32, x2: x + width * .14, y2: y + height * .14 },
    { type: "line", x1: x + width * .78, y1: y + height * .68, x2: x + width * .86, y2: y + height * .86 },
  ];
  if (object.kind === "support-stand") return [
    { type: "rect", x: x + width * .1, y: y + height * .88, width: width * .8, height: height * .08, fill: "light" },
    { type: "line", x1: x + width * .28, y1: y + height * .88, x2: x + width * .28, y2: y + height * .08, strokeWidth: 4 },
    { type: "rect", x: x + width * .24, y: y + height * .38, width: width * .16, height: height * .08, fill: "paper" },
    { type: "line", x1: x + width * .4, y1: y + height * .42, x2: x + width * .78, y2: y + height * .42 },
    { type: "arc", cx: x + width * .72, cy: y + height * .5, r: Math.min(width, height) * .08, start: -90, end: 90 },
  ];
  if (object.kind === "magnetic-stirrer") return [
    { type: "rect", x: x + width * .08, y: y + height * .72, width: width * .84, height: height * .18, fill: "light" },
    { type: "circle", cx: x + width * .22, cy: y + height * .81, r: width * .045, fill: "paper" },
    { type: "polyline", points: [{ x: x + width * .34, y: y + height * .57 }, { x: x + width * .36, y: y + height * .68 }, { x: x + width * .64, y: y + height * .68 }, { x: x + width * .66, y: y + height * .57 }], closed: true, fill: "light" },
    { type: "polyline", points: [{ x: x + width * .3, y: y + height * .72 }, { x: x + width * .35, y: y + height * .25 }, { x: x + width * .65, y: y + height * .25 }, { x: x + width * .7, y: y + height * .72 }] },
    { type: "ellipse", cx, cy: y + height * .62, rx: width * .1, ry: Math.max(2, height * .018), fill: "ink" },
  ];
  if (object.kind === "thermometer") return [
    { type: "rect", x: x + width * .4, y: y + 4, width: width * .2, height: height * .68, fill: "paper" },
    { type: "circle", cx, cy: y + height * .82, r: width * .18, fill: "light" },
    { type: "line", x1: cx, y1: y + height * .62, x2: cx, y2: y + height * .18, strokeWidth: 3 },
  ];
  if (object.kind === "bunsen-burner") return [
    { type: "rect", x: x + width * .15, y: y + height * .75, width: width * .7, height: height * .15, fill: "paper" },
    { type: "rect", x: x + width * .4, y: y + height * .28, width: width * .2, height: height * .47, fill: "paper" },
    { type: "bezier", start: { x: cx, y: y + height * .28 }, control1: { x: x + width * .27, y: y + height * .08 }, control2: { x: x + width * .42, y: y + 2 }, end: { x: cx, y: y + 2 } },
    { type: "bezier", start: { x: cx, y: y + 2 }, control1: { x: x + width * .58, y: y + 2 }, control2: { x: x + width * .73, y: y + height * .08 }, end: { x: cx, y: y + height * .28 } },
  ];
  if (object.kind === "ground") return [
    { type: "line", x1: cx, y1: y, x2: cx, y2: y + height * .35 },
    { type: "line", x1: x + 6, y1: y + height * .35, x2: x + width - 6, y2: y + height * .35 },
    { type: "line", x1: x + 11, y1: y + height * .53, x2: x + width - 11, y2: y + height * .53 },
    { type: "line", x1: x + 17, y1: y + height * .71, x2: x + width - 17, y2: y + height * .71 },
  ];
  if (object.kind === "gbf" || object.kind === "oscilloscope") {
    const left = x + width * .22; const right = x + width * .78; const amplitude = height * .14; const wave: ScientificPrimitive[] = Array.from({ length: 3 }, (_, index): ScientificPrimitive => {
      const startX = left + ((right - left) / 3) * index; const endX = left + ((right - left) / 3) * (index + 1); const direction = index % 2 === 0 ? -1 : 1;
      return { type: "bezier", start: { x: startX, y: cy }, control1: { x: startX + (endX - startX) * .3, y: cy + amplitude * direction }, control2: { x: startX + (endX - startX) * .7, y: cy + amplitude * direction }, end: { x: endX, y: cy } };
    });
    return [
      object.kind === "gbf" ? { type: "circle", cx, cy, r: Math.min(width, height) * .36, fill: "paper" } : { type: "rect", x, y, width, height, fill: "paper" },
      ...wave,
      { type: "text", x: cx, y: y + height * .88, value: label("main", object.kind === "gbf" ? "GBF" : "oscillo"), anchor: "middle", fontSize: 11, math: false },
    ];
  }
  if (object.kind.startsWith("op-amp")) {
    const topInput = y + height * .37; const bottomInput = y + height * .66; const boxLeft = x + width * .28; const boxRight = x + width * .8; const outputX = x + width * .96;
    const feedback = ["op-amp-inverting", "op-amp-non-inverting", "op-amp-integrator", "op-amp-differentiator", "op-amp-schmitt"].includes(object.kind);
    const variant = object.kind === "op-amp-comparator" ? "Comparateur" : object.kind === "op-amp-inverting" ? "Inverseur" : object.kind === "op-amp-non-inverting" ? "Non-inverseur" : object.kind === "op-amp-summing" ? "Sommateur" : object.kind === "op-amp-integrator" ? "Intégrateur" : object.kind === "op-amp-differentiator" ? "Dérivateur" : object.kind === "op-amp-schmitt" ? "Schmitt" : "AOP";
    const scene: ScientificPrimitive[] = [
      { type: "rect", x: boxLeft, y: y + height * .15, width: boxRight - boxLeft, height: height * .7, fill: "paper" },
      { type: "line", x1: x + width * .04, y1: topInput, x2: boxLeft, y2: topInput },
      { type: "line", x1: x + width * .04, y1: bottomInput, x2: boxLeft, y2: bottomInput },
      { type: "line", x1: boxRight, y1: cy, x2: outputX, y2: cy },
      { type: "text", x: boxLeft + 11, y: topInput + 5, value: "−", latex: "-", anchor: "middle", fontSize: 15 },
      { type: "text", x: boxLeft + 11, y: bottomInput + 5, value: "+", anchor: "middle", fontSize: 15 },
      { type: "polyline", points: [{ x: x + width * .49, y: cy - 10 }, { x: x + width * .49, y: cy + 10 }, { x: x + width * .57, y: cy }], closed: true },
      { type: "text", x: x + width * .67, y: cy + 6, value: "∞", latex: "\\infty", anchor: "middle", fontSize: 19 },
      { type: "text", x: x + width * .55, y: y + height * .96, value: variant, anchor: "middle", fontSize: 10, math: false },
    ];
    if (object.kind === "op-amp-summing") scene.push(
      { type: "line", x1: x + width * .04, y1: y + height * .2, x2: boxLeft, y2: topInput },
      { type: "line", x1: x + width * .04, y1: y + height * .5, x2: boxLeft, y2: topInput },
    );
    if (object.kind === "op-amp-inverting" || object.kind === "op-amp-differentiator") scene.push(
      { type: "line", x1: x + width * .04, y1: topInput, x2: x + width * .1, y2: topInput },
      { type: "rect", x: x + width * .1, y: topInput - 7, width: width * .12, height: 14, fill: "paper" },
      { type: "line", x1: x + width * .22, y1: topInput, x2: boxLeft, y2: topInput },
    );
    if (object.kind === "op-amp-differentiator") scene.push(
      { type: "line", x1: x + width * .11, y1: topInput - 13, x2: x + width * .11, y2: topInput + 13 },
      { type: "line", x1: x + width * .16, y1: topInput - 13, x2: x + width * .16, y2: topInput + 13 },
    );
    if (feedback) scene.push({ type: "polyline", points: [{ x: outputX, y: cy }, { x: outputX, y: y + height * .06 }, { x: x + width * .2, y: y + height * .06 }, { x: x + width * .2, y: topInput }] });
    if (object.kind === "op-amp-integrator") scene.push(
      { type: "line", x1: x + width * .44, y1: y + height * .02, x2: x + width * .44, y2: y + height * .1 },
      { type: "line", x1: x + width * .49, y1: y + height * .02, x2: x + width * .49, y2: y + height * .1 },
    );
    if (object.kind === "op-amp-schmitt") scene.push({ type: "polyline", points: [{ x: x + width * .18, y: bottomInput }, { x: x + width * .18, y: y + height * .94 }, { x: outputX, y: y + height * .94 }, { x: outputX, y: cy }] });
    if (object.kind === "op-amp-comparator") scene.push({ type: "text", x: outputX - 2, y: cy - 8, value: "Vs", latex: "V_s", anchor: "end", fontSize: 11 });
    return scene;
  }
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
  if (primitive.math === "raw") return escapeLatex(primitive.value);
  if (primitive.math === false) return `\\text{${escapeLatex(primitive.value)}}`;
  return scientificLabelToLatex(primitive.value, primitive.vector);
};
const widthOption = (strokeWidth?: number) => strokeWidth === undefined ? "" : `line width=${tikzStrokeWidth(strokeWidth).toFixed(2)}pt`;
const drawOptions = (...options: Array<string | undefined>) => { const kept = options.filter(Boolean); return kept.length ? `[${kept.join(",")}]` : ""; };

export function scientificSceneToTikz(scene: ScientificPrimitive[]): string {
  return scene.map((primitive) => {
    if (primitive.type === "line") return `\\draw${drawOptions(primitive.arrowEnd ? "-{Latex}" : undefined, primitive.dashed ? "dashed" : undefined, widthOption(primitive.strokeWidth))} ${point(primitive.x1, primitive.y1)} -- ${point(primitive.x2, primitive.y2)};`;
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
    if (primitive.type === "polyline") {
      const fill = primitive.fill === "paper" ? "fill=white" : primitive.fill === "light" ? "fill=gray!12" : primitive.fill === "ink" ? "fill=black" : undefined; const path = primitive.points.map((value) => point(value.x, value.y)).join(" -- ");
      return `\\draw${drawOptions(fill, widthOption(primitive.strokeWidth))} ${path}${primitive.closed ? " -- cycle" : ""};`;
    }
    if (primitive.type === "bezier") return `\\draw${drawOptions(primitive.arrowEnd ? "-{Latex}" : undefined, primitive.dashed ? "dashed" : undefined, widthOption(primitive.strokeWidth))} ${point(primitive.start.x, primitive.start.y)} .. controls ${point(primitive.control1.x, primitive.control1.y)} and ${point(primitive.control2.x, primitive.control2.y)} .. ${point(primitive.end.x, primitive.end.y)};`;
    if (primitive.type === "arc") {
      const startX = primitive.cx + Math.cos((primitive.start * Math.PI) / 180) * primitive.r; const startY = primitive.cy + Math.sin((primitive.start * Math.PI) / 180) * primitive.r;
      return `\\draw${drawOptions(primitive.arrowEnd ? "-{Latex}" : undefined, widthOption(primitive.strokeWidth))} ${point(startX, startY)} arc[start angle=${-primitive.start},end angle=${-primitive.end},radius=${value(primitive.r)}cm];`;
    }
    return `\\node at ${point(primitive.x, primitive.y)} {${labelLatex(primitive)}};`;
  }).join("\n");
}
