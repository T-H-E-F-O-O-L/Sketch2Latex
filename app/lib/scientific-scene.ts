import { annotation, type CanvasObject, type ObjectKind, type Point } from "./canvas-types";
import { CANVAS_UNITS_PER_CM, canvasUnitsToPoints, tikzStrokeWidth } from "./concours-style";
import { scientificLabelToLatex } from "./scientific-label";

type FillRole = "none" | "paper" | "ink" | "light";

export type ScientificPrimitive =
  | { type: "line"; x1: number; y1: number; x2: number; y2: number; arrowEnd?: boolean; dashed?: boolean; dashArray?: number[]; strokeWidth?: number; nonScaling?: boolean }
  | { type: "circle"; cx: number; cy: number; r: number; fill?: FillRole; strokeWidth?: number }
  | { type: "ellipse"; cx: number; cy: number; rx: number; ry: number; fill?: FillRole; strokeWidth?: number }
  | { type: "rect"; x: number; y: number; width: number; height: number; rx?: number; fill?: FillRole; strokeWidth?: number }
  | { type: "polyline"; points: Point[]; closed?: boolean; fill?: FillRole; strokeWidth?: number; dashed?: boolean; dashArray?: number[] }
  | { type: "bezier"; start: Point; control1: Point; control2: Point; end: Point; arrowEnd?: boolean; dashed?: boolean; strokeWidth?: number }
  | { type: "arc"; cx: number; cy: number; r: number; start: number; end: number; arrowEnd?: boolean; strokeWidth?: number }
  | { type: "text"; x: number; y: number; value: string; latex?: string; anchor?: "start" | "middle" | "end"; fontSize?: number; vector?: boolean; math?: boolean | "raw"; technical?: boolean; roman?: boolean };

export const GPS_NARROW_STROKE = 1.25;
export const GPS_WIDE_STROKE = 2.5;
export const GPS_DASH_ARRAYS = {
  hidden: [16, 5.3],
  centre: [30, 3.5, 1.8, 3.5],
  cutting: [30, 3.5, 1.8, 3.5],
} as const;

export const sharedScientificKinds: ObjectKind[] = [
  "hidden-edge", "centre-line", "cutting-plane", "section-hatch", "datum-feature", "feature-control-frame", "surface-texture",
  "sysml-frame", "functional-block", "typed-flow", "state-node", "state-pseudostate", "state-transition", "choice-junction", "fork-join", "chronogram-lane",
  "sysml-requirement", "sysml-requirement-link", "sysml-block", "sysml-structural-link", "sysml-part", "sysml-port", "sysml-connector", "sysml-item-flow",
  "wave-source", "wavefront", "aperture-array", "wave-path", "fringe-screen", "diffraction-cone", "standing-wave", "intensity-profile",
  "chemical-atom", "bond-wedge-solid", "bond-wedge-hashed", "bond-wavy", "electron-pair-arrow", "single-electron-arrow", "mesomeric-arrow", "newman-projection", "skeletal-ring", "reaction-arrow",
  "bode-diagram", "bode-trace", "bode-break", "bode-slope", "stability-margin", "time-response-diagram", "time-response-trace", "settling-band", "performance-marker", "pole-zero-map",
  "thermo-diagram", "thermo-state", "thermo-process", "thermo-isotherm-family", "phase-diagram-pt", "liquid-vapour-dome", "vapour-quality-line", "thermo-cycle", "pressure-work-area",
  "uniform-field-region", "field-map", "oriented-current-loop", "magnetic-dipole", "charged-particle-trajectory", "rotating-rectangular-loop", "faraday-magnet-coil", "coupled-coils", "electromechanical-converter",
  "mass", "pulley", "pendulum", "reference-frame", "circular-trajectory", "gravity-field", "joint-pivot", "joint-slider", "joint-ball", "joint-cylindrical", "joint-helical", "joint-planar", "joint-line-contact", "joint-annular", "joint-point-contact", "gear-pair", "rack-pinion", "belt-drive", "screw-nut", "worm-gear", "planetary-gear", "cam-follower", "electric-motor", "gear-reducer", "clutch", "brake", "hydraulic-pump", "hydraulic-reservoir", "hydraulic-cylinder", "hydraulic-valve-4-3", "pressure-relief-valve", "pneumatic-source", "pneumatic-service-unit", "pneumatic-frl", "pneumatic-cylinder", "pneumatic-valve-5-2", "one-way-flow-control", "pneumatic-exhaust", "electric-field", "magnetic-field-in", "magnetic-field-out", "bar-magnet", "coil", "solenoid", "laplace-rails", "charged-particle", "plane-mirror", "screen", "prism", "fiber", "piston-cylinder", "thermal-reservoir", "heat-engine",
  "ion", "lone-pair", "crystal-fcc", "precipitate", "electrochemical-cell", "beaker", "flask", "round-bottom-flask", "distillation-flask", "test-tube", "graduated-cylinder", "burette", "volumetric-flask", "separatory-funnel", "pipette", "filter-funnel", "wash-bottle", "liebig-condenser", "support-stand", "magnetic-stirrer", "thermometer", "bunsen-burner",
  "ground", "transformer", "gbf", "oscilloscope", "transfer-block", "summing-junction", "takeoff-point", "op-amp", "op-amp-comparator", "op-amp-inverting", "op-amp-non-inverting", "op-amp-summing", "op-amp-integrator", "op-amp-differentiator", "op-amp-schmitt",
];

const gpsChoice = (value: string) => value.trim().toLocaleLowerCase("fr").normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[ _]+/g, "-");
const gpsEnabled = (value: string) => ["oui", "yes", "true", "1", "avec", "all-around", "tout-autour"].includes(gpsChoice(value));
const compactLines = (value: string) => value.split(/\r?\n|;/).map((line) => line.trim()).filter(Boolean);
const wrappedLines = (value: string, limit: number) => {
  const words = value.trim().split(/\s+/).filter(Boolean); const lines: string[] = [];
  for (const word of words) {
    const last = lines.at(-1);
    if (!last || last.length + word.length + 1 > limit) lines.push(word);
    else lines[lines.length - 1] = `${last} ${word}`;
  }
  return lines;
};
const boundedInt = (value: string, fallback: number, minimum: number, maximum: number) => {
  const parsed = Number.parseInt(value, 10); return Math.min(maximum, Math.max(minimum, Number.isFinite(parsed) ? parsed : fallback));
};
const finiteNumber = (value: string, fallback: number) => {
  const parsed = Number(value.trim().replace(",", ".")); return Number.isFinite(parsed) ? parsed : fallback;
};
const safeRange = (minimum: number, maximum: number, fallbackMinimum: number, fallbackMaximum: number) => maximum > minimum ? [minimum, maximum] as const : [fallbackMinimum, fallbackMaximum] as const;
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
const mapLinear = (value: number, minimum: number, maximum: number, start: number, end: number) => start + ((value - minimum) / (maximum - minimum || 1)) * (end - start);
const mapLog = (value: number, minimum: number, maximum: number, start: number, end: number) => mapLinear(Math.log10(Math.max(value, Number.MIN_VALUE)), Math.log10(minimum), Math.log10(maximum), start, end);

type BodeLayout = {
  left: number; right: number; gainTop: number; gainBottom: number; phaseTop: number; phaseBottom: number;
};
const bodeLayoutFor = (x: number, y: number, width: number, height: number): BodeLayout => {
  const left = x + Math.min(58, width * .2); const right = x + width - Math.min(14, width * .06); const top = y + Math.min(34, height * .14); const bottom = y + height - Math.min(29, height * .12); const gap = Math.min(20, height * .08); const panelHeight = Math.max(28, (bottom - top - gap) / 2);
  return { left, right, gainTop: top, gainBottom: top + panelHeight, phaseTop: top + panelHeight + gap, phaseBottom: top + panelHeight * 2 + gap };
};
type TimeLayout = { left: number; right: number; top: number; bottom: number };
const timeLayoutFor = (x: number, y: number, width: number, height: number): TimeLayout => ({
  left: x + Math.min(55, width * .2), right: x + width - Math.min(15, width * .06), top: y + Math.min(34, height * .18), bottom: y + height - Math.min(32, height * .16),
});
const thermoLayoutFor = (x: number, y: number, width: number, height: number): TimeLayout => ({
  left: x + Math.min(58, width * .2), right: x + width - Math.min(18, width * .07), top: y + Math.min(38, height * .18), bottom: y + height - Math.min(34, height * .16),
});

const parseComplex = (raw: string): { real: number; imaginary: number } | undefined => {
  const normalized = raw.trim().replace(/\s+/g, "").replace(/j/gi, "i").replace(/,/g, ".");
  if (!normalized) return undefined;
  if (!normalized.includes("i")) {
    const real = Number(normalized); return Number.isFinite(real) ? { real, imaginary: 0 } : undefined;
  }
  const withoutI = normalized.replace(/i$/i, ""); let split = -1;
  for (let index = 1; index < withoutI.length; index += 1) if (withoutI[index] === "+" || withoutI[index] === "-") split = index;
  const realPart = split >= 0 ? withoutI.slice(0, split) : "0"; const imaginaryPart = split >= 0 ? withoutI.slice(split) : withoutI;
  const real = Number(realPart || "0"); const imaginary = imaginaryPart === "+" || imaginaryPart === "" ? 1 : imaginaryPart === "-" ? -1 : Number(imaginaryPart);
  return Number.isFinite(real) && Number.isFinite(imaginary) ? { real, imaginary } : undefined;
};

function fieldGlyphScene(fieldType: string, direction: string, centerX: number, centerY: number, size = 12): ScientificPrimitive[] {
  const normalizedDirection = gpsChoice(direction); const magnetic = gpsChoice(fieldType).startsWith("mag"); const radius = Math.max(3, size * .36);
  if (magnetic && normalizedDirection.startsWith("sort")) return [
    { type: "circle", cx: centerX, cy: centerY, r: radius, fill: "paper", strokeWidth: 1.2 },
    { type: "circle", cx: centerX, cy: centerY, r: Math.max(1.5, radius * .27), fill: "ink" },
  ];
  if (magnetic && normalizedDirection.startsWith("entr")) return [
    { type: "circle", cx: centerX, cy: centerY, r: radius, fill: "paper", strokeWidth: 1.2 },
    { type: "line", x1: centerX - radius * .58, y1: centerY - radius * .58, x2: centerX + radius * .58, y2: centerY + radius * .58, strokeWidth: 1.2 },
    { type: "line", x1: centerX - radius * .58, y1: centerY + radius * .58, x2: centerX + radius * .58, y2: centerY - radius * .58, strokeWidth: 1.2 },
  ];
  const vectorLength = size * 1.45; const directionVector = normalizedDirection.startsWith("gauch") ? { x: -1, y: 0 } : normalizedDirection.startsWith("haut") ? { x: 0, y: -1 } : normalizedDirection.startsWith("bas") ? { x: 0, y: 1 } : { x: 1, y: 0 };
  return [{ type: "line", x1: centerX - directionVector.x * vectorLength / 2, y1: centerY - directionVector.y * vectorLength / 2, x2: centerX + directionVector.x * vectorLength / 2, y2: centerY + directionVector.y * vectorLength / 2, arrowEnd: true, strokeWidth: 1.3 }];
}

function gpsCharacteristicScene(characteristic: string, symbolX: number, symbolY: number, size = 18): ScientificPrimitive[] {
  const half = size / 2; const quarter = size / 4; const key = gpsChoice(characteristic);
  const line = (x1: number, y1: number, x2: number, y2: number): ScientificPrimitive => ({ type: "line", x1, y1, x2, y2, strokeWidth: GPS_NARROW_STROKE, nonScaling: true });
  if (["rectitude", "straightness"].includes(key)) return [line(symbolX - half, symbolY, symbolX + half, symbolY)];
  if (["planeite", "flatness"].includes(key)) return [{ type: "polyline", points: [{ x: symbolX - half, y: symbolY + quarter }, { x: symbolX - quarter, y: symbolY - quarter }, { x: symbolX + half, y: symbolY - quarter }, { x: symbolX + quarter, y: symbolY + quarter }], closed: true, strokeWidth: GPS_NARROW_STROKE }];
  if (["circularite", "circularity"].includes(key)) return [{ type: "circle", cx: symbolX, cy: symbolY, r: half * .72, strokeWidth: GPS_NARROW_STROKE }];
  if (["cylindricite", "cylindricity"].includes(key)) return [
    { type: "circle", cx: symbolX, cy: symbolY, r: half * .62, strokeWidth: GPS_NARROW_STROKE },
    line(symbolX - half, symbolY - half * .62, symbolX + half, symbolY - half * .62),
    line(symbolX - half, symbolY + half * .62, symbolX + half, symbolY + half * .62),
  ];
  if (["profil-de-ligne", "profil-ligne", "line-profile"].includes(key)) return [{ type: "bezier", start: { x: symbolX - half, y: symbolY + quarter }, control1: { x: symbolX - quarter, y: symbolY - half }, control2: { x: symbolX + quarter, y: symbolY - half }, end: { x: symbolX + half, y: symbolY + quarter }, strokeWidth: GPS_NARROW_STROKE }];
  if (["profil-de-surface", "profil-surface", "surface-profile"].includes(key)) return [
    { type: "bezier", start: { x: symbolX - half, y: symbolY + quarter }, control1: { x: symbolX - quarter, y: symbolY - half }, control2: { x: symbolX + quarter, y: symbolY - half }, end: { x: symbolX + half, y: symbolY + quarter }, strokeWidth: GPS_NARROW_STROKE },
    line(symbolX - half, symbolY + half, symbolX + half, symbolY + half),
  ];
  if (["parallelisme", "parallelism"].includes(key)) return [line(symbolX - half * .65, symbolY + half, symbolX - quarter, symbolY - half), line(symbolX + quarter, symbolY + half, symbolX + half * .65, symbolY - half)];
  if (["perpendicularite", "perpendicularity"].includes(key)) return [line(symbolX, symbolY - half, symbolX, symbolY + half), line(symbolX - half, symbolY + half, symbolX + half, symbolY + half)];
  if (["angularite", "angularity"].includes(key)) return [line(symbolX - half, symbolY + half, symbolX - quarter, symbolY - half), line(symbolX - half, symbolY + half, symbolX + half, symbolY + half)];
  if (["coaxialite", "coaxiality", "concentricite", "concentricity"].includes(key)) return [
    { type: "circle", cx: symbolX, cy: symbolY, r: half * .8, strokeWidth: GPS_NARROW_STROKE },
    { type: "circle", cx: symbolX, cy: symbolY, r: half * .42, strokeWidth: GPS_NARROW_STROKE },
  ];
  if (["symetrie", "symmetry"].includes(key)) return [line(symbolX - half, symbolY - quarter, symbolX + half, symbolY - quarter), line(symbolX - half, symbolY + quarter, symbolX + half, symbolY + quarter), line(symbolX - half, symbolY, symbolX + half, symbolY)];
  if (["battement-circulaire", "circular-run-out", "circular-runout"].includes(key)) return [line(symbolX - half, symbolY + half, symbolX + half, symbolY - half), line(symbolX + half, symbolY - half, symbolX + quarter, symbolY - half)];
  if (["battement-total", "total-run-out", "total-runout"].includes(key)) return [line(symbolX - half, symbolY + half, symbolX + half, symbolY - half), line(symbolX + half, symbolY - half, symbolX + quarter, symbolY - half), line(symbolX - half, symbolY + quarter, symbolX + quarter, symbolY - half * .9)];
  return [
    { type: "circle", cx: symbolX, cy: symbolY, r: half * .65, strokeWidth: GPS_NARROW_STROKE },
    line(symbolX - half, symbolY, symbolX + half, symbolY),
    line(symbolX, symbolY - half, symbolX, symbolY + half),
  ];
}

export function scientificSceneFor(object: CanvasObject): ScientificPrimitive[] | undefined {
  if (!sharedScientificKinds.includes(object.kind)) return undefined;
  const x = object.x; const y = object.y; const width = object.width ?? 80; const height = object.height ?? 80; const cx = x + width / 2; const cy = y + height / 2;
  const label = (key: string, fallback: string) => annotation(object, key, fallback);
  if (object.kind === "sysml-requirement") {
    const name = label("name", "Exigence").trim(); const reqId = label("reqId", "REQ-1").trim(); const statement = label("statement", "Le système doit satisfaire cette exigence.").trim(); const dividerY = y + Math.min(44, Math.max(38, height * .38));
    const statementWidth = Math.max(18, Math.floor((width - 18) / 5.2) - 8); const rows = wrappedLines(statement, statementWidth); const statementRows = rows.length <= 1
      ? [`text = "${rows[0] ?? ""}"`]
      : rows.map((row, index) => `${index === 0 ? "text = \"" : ""}${row}${index === rows.length - 1 ? "\"" : ""}`);
    const scene: ScientificPrimitive[] = [
      { type: "rect", x, y, width, height, fill: "paper" },
      { type: "text", x: cx, y: y + 16, value: "«requirement»", anchor: "middle", fontSize: 10, technical: true },
      { type: "text", x: cx, y: y + 34, value: name, anchor: "middle", fontSize: 12, technical: true },
      { type: "line", x1: x, y1: dividerY, x2: x + width, y2: dividerY },
      { type: "text", x: x + 9, y: dividerY + 17, value: `id = "${reqId}"`, anchor: "start", fontSize: 9, technical: true },
    ];
    statementRows.forEach((row, index) => scene.push({ type: "text", x: x + 9, y: dividerY + 34 + index * 13, value: row, anchor: "start", fontSize: 9, technical: true }));
    return scene;
  }
  if (object.kind === "sysml-requirement-link") {
    const x2 = object.x2 ?? x; const y2 = object.y2 ?? y; const dx = x2 - x; const dy = y2 - y; const length = Math.hypot(dx, dy) || 1; const tx = dx / length; const ty = dy / length; const nx = -ty; const ny = tx;
    const relationKey = gpsChoice(label("requirementRelation", "satisfy"));
    if (relationKey === "containment") return [
      { type: "line", x1: x, y1: y, x2, y2 },
      { type: "circle", cx: x2, cy: y2, r: 7, fill: "paper" },
      { type: "line", x1: x2 - 4, y1: y2, x2: x2 + 4, y2 },
      { type: "line", x1: x2, y1: y2 - 4, x2, y2: y2 + 4 },
    ];
    const stereotype = relationKey === "derivereqt" || relationKey === "derive-reqt" ? "deriveReqt"
      : (["refine", "satisfy", "verify", "trace"].includes(relationKey) ? relationKey : "satisfy");
    return [
      { type: "line", x1: x, y1: y, x2, y2, dashed: true },
      { type: "polyline", points: [
        { x: x2 - tx * 13 + nx * 6, y: y2 - ty * 13 + ny * 6 },
        { x: x2, y: y2 },
        { x: x2 - tx * 13 - nx * 6, y: y2 - ty * 13 - ny * 6 },
      ] },
      { type: "text", x: (x + x2) / 2 - nx * 12, y: (y + y2) / 2 - ny * 12 + 4, value: `«${stereotype}»`, anchor: "middle", fontSize: 10, technical: true },
    ];
  }
  if (object.kind === "sysml-block") {
    const name = label("name", "Bloc").trim(); const dividerY = y + Math.min(43, Math.max(40, height * .3));
    const compartments = [
      ["values", label("values", "")], ["parts", label("parts", "")], ["references", label("references", "")], ["operations", label("operations", "")],
    ].map(([title, content]) => ({ title, lines: compactLines(content) })).filter((compartment) => compartment.lines.length);
    const scene: ScientificPrimitive[] = [
      { type: "rect", x, y, width, height, fill: "paper" },
      { type: "text", x: cx, y: y + 16, value: "«block»", anchor: "middle", fontSize: 10, technical: true },
      { type: "text", x: cx, y: y + 35, value: name, anchor: "middle", fontSize: 12, technical: true },
    ];
    if (!compartments.length) return scene;
    const rowCount = compartments.reduce((count, compartment) => count + 1 + compartment.lines.length, 0); const rowHeight = Math.min(13, Math.max(8, (height - (dividerY - y) - 4) / Math.max(1, rowCount)));
    let cursor = dividerY;
    compartments.forEach((compartment) => {
      scene.push(
        { type: "line", x1: x, y1: cursor, x2: x + width, y2: cursor },
        { type: "text", x: x + 7, y: cursor + rowHeight * .78, value: compartment.title, anchor: "start", fontSize: 9, technical: true },
      );
      cursor += rowHeight;
      compartment.lines.forEach((line) => {
        scene.push({ type: "text", x: x + 13, y: cursor + rowHeight * .78, value: line, anchor: "start", fontSize: 9, technical: true }); cursor += rowHeight;
      });
    });
    return scene;
  }
  if (object.kind === "sysml-structural-link") {
    const x2 = object.x2 ?? x; const y2 = object.y2 ?? y; const dx = x2 - x; const dy = y2 - y; const length = Math.hypot(dx, dy) || 1; const tx = dx / length; const ty = dy / length; const nx = -ty; const ny = tx;
    const relation = gpsChoice(label("structuralRelation", "association")); const atStart = !gpsChoice(label("symbolEnd", "début")).startsWith("fin");
    const tip = atStart ? { x, y } : { x: x2, y: y2 }; const inward = atStart ? { x: tx, y: ty } : { x: -tx, y: -ty };
    const scene: ScientificPrimitive[] = [{ type: "line", x1: x, y1: y, x2, y2 }];
    if (relation === "composition" || relation === "aggregation") scene.push({
      type: "polyline", closed: true, fill: relation === "composition" ? "ink" : "paper", points: [tip,
        { x: tip.x + inward.x * 10 + nx * 6, y: tip.y + inward.y * 10 + ny * 6 },
        { x: tip.x + inward.x * 20, y: tip.y + inward.y * 20 },
        { x: tip.x + inward.x * 10 - nx * 6, y: tip.y + inward.y * 10 - ny * 6 },
      ],
    });
    if (relation === "generalization") scene.push({
      type: "polyline", closed: true, fill: "paper", points: [tip,
        { x: tip.x + inward.x * 18 + nx * 8, y: tip.y + inward.y * 18 + ny * 8 },
        { x: tip.x + inward.x * 18 - nx * 8, y: tip.y + inward.y * 18 - ny * 8 },
      ],
    });
    const endpointLabels = [
      { value: label("startRole", "").trim(), x: x + tx * 8 - nx * 9, y: y + ty * 8 - ny * 9 + 4, anchor: "start" as const },
      { value: label("startMultiplicity", "1").trim(), x: x + tx * 8 + nx * 10, y: y + ty * 8 + ny * 10 + 4, anchor: "start" as const },
      { value: label("endRole", "").trim(), x: x2 - tx * 8 - nx * 9, y: y2 - ty * 8 - ny * 9 + 4, anchor: "end" as const },
      { value: label("endMultiplicity", "1").trim(), x: x2 - tx * 8 + nx * 10, y: y2 - ty * 8 + ny * 10 + 4, anchor: "end" as const },
    ];
    endpointLabels.filter((item) => item.value).forEach((item) => scene.push({ type: "text", x: item.x, y: item.y, value: item.value, anchor: item.anchor, fontSize: 9, technical: true }));
    return scene;
  }
  if (object.kind === "sysml-part") {
    const name = label("name", "partie").trim(); const blockType = label("blockType", "Bloc").trim(); const caption = name && blockType ? `${name} : ${blockType}` : name || blockType;
    return [
      { type: "rect", x, y, width, height, fill: "paper" },
      ...(caption ? [{ type: "text", x: cx, y: cy + 4, value: caption, anchor: "middle", fontSize: 11, technical: true } as ScientificPrimitive] : []),
    ];
  }
  if (object.kind === "sysml-port") {
    const name = label("name", "p").trim(); const interfaceType = label("interfaceType", "Interface").trim(); const direction = gpsChoice(label("portDirection", "inout")); const caption = name && interfaceType ? `${name} : ${interfaceType}` : name || interfaceType;
    const scene: ScientificPrimitive[] = [{ type: "rect", x, y, width, height, fill: "paper" }];
    if (direction === "in" || direction === "inout") scene.push({ type: "line", x1: x - 6, y1: direction === "inout" ? cy - 3 : cy, x2: cx + 2, y2: direction === "inout" ? cy - 3 : cy, arrowEnd: true });
    if (direction === "out" || direction === "inout") scene.push({ type: "line", x1: cx - 2, y1: direction === "inout" ? cy + 3 : cy, x2: x + width + 6, y2: direction === "inout" ? cy + 3 : cy, arrowEnd: true });
    if (caption) scene.push({ type: "text", x: x + width + 8, y: y + height + 11, value: caption, anchor: "start", fontSize: 9, technical: true });
    return scene;
  }
  if (object.kind === "sysml-connector") {
    const x2 = object.x2 ?? x; const y2 = object.y2 ?? y; const dx = x2 - x; const dy = y2 - y; const length = Math.hypot(dx, dy) || 1; const nx = -dy / length; const ny = dx / length; const main = label("main", "").trim();
    return [
      { type: "line", x1: x, y1: y, x2, y2 },
      ...(main ? [{ type: "text", x: (x + x2) / 2 - nx * 10, y: (y + y2) / 2 - ny * 10 + 4, value: main, anchor: "middle", fontSize: 9, technical: true } as ScientificPrimitive] : []),
    ];
  }
  if (object.kind === "sysml-item-flow") {
    const x2 = object.x2 ?? x; const y2 = object.y2 ?? y; const dx = x2 - x; const dy = y2 - y; const length = Math.hypot(dx, dy) || 1; const tx = dx / length; const ty = dy / length; const nx = -ty; const ny = tx; const reverse = gpsChoice(label("flowDirection", "début vers fin")).startsWith("fin"); const direction = reverse ? { x: -tx, y: -ty } : { x: tx, y: ty }; const mid = { x: (x + x2) / 2, y: (y + y2) / 2 };
    const name = label("name", "flux").trim(); const itemType = label("itemType", "Information").trim(); const caption = name && itemType ? `${name} : ${itemType}` : name || itemType;
    return [
      { type: "line", x1: x, y1: y, x2, y2 },
      { type: "polyline", closed: true, fill: "ink", points: [
        { x: mid.x + direction.x * 7, y: mid.y + direction.y * 7 },
        { x: mid.x - direction.x * 6 + nx * 5, y: mid.y - direction.y * 6 + ny * 5 },
        { x: mid.x - direction.x * 6 - nx * 5, y: mid.y - direction.y * 6 - ny * 5 },
      ] },
      ...(caption ? [{ type: "text", x: mid.x - nx * 13, y: mid.y - ny * 13 + 4, value: caption, anchor: "middle", fontSize: 9, technical: true } as ScientificPrimitive] : []),
    ];
  }
  if (object.kind === "wave-source") {
    const name = label("name", "S").trim(); const sourceType = gpsChoice(label("sourceType", "ponctuelle")); const phase = label("phase", "0").trim(); const directionRight = !gpsChoice(label("direction", "droite")).startsWith("g");
    const scene: ScientificPrimitive[] = [];
    if (sourceType.startsWith("plan")) {
      const sourceX = directionRight ? x + width * .32 : x + width * .68;
      scene.push({ type: "line", x1: sourceX, y1: y + height * .2, x2: sourceX, y2: y + height * .8, strokeWidth: 2.4, nonScaling: true });
      [0, 1, 2].forEach((index) => {
        const offset = (index + 1) * width * .16 * (directionRight ? 1 : -1);
        scene.push({ type: "line", x1: sourceX + offset, y1: y + height * .26, x2: sourceX + offset, y2: y + height * .74 });
      });
      scene.push(directionRight
        ? { type: "line", x1: sourceX, y1: cy, x2: x + width - 3, y2: cy, arrowEnd: true }
        : { type: "line", x1: sourceX, y1: cy, x2: x + 3, y2: cy, arrowEnd: true });
    } else {
      scene.push({ type: "circle", cx, cy, r: Math.max(3, Math.min(width, height) * .065), fill: "ink" });
      const arcStart = directionRight ? -55 : 125; const arcEnd = directionRight ? 55 : 235;
      [0.2, 0.32, 0.44].forEach((ratio) => scene.push({ type: "arc", cx, cy, r: Math.min(width, height) * ratio, start: arcStart, end: arcEnd }));
    }
    if (name) scene.push({ type: "text", x: cx, y: y + 10, value: name, anchor: "middle", fontSize: 11 });
    if (phase) scene.push({ type: "text", x: cx, y: y + height - 2, value: `φ_0 = ${phase}`, anchor: "middle", fontSize: 9 });
    return scene;
  }
  if (object.kind === "wavefront") {
    const frontType = gpsChoice(label("wavefrontType", "circulaire")); const directionRight = !gpsChoice(label("direction", "droite")).startsWith("g"); const main = label("main", "φ = constante").trim(); const scene: ScientificPrimitive[] = [];
    if (frontType.startsWith("plan")) {
      const left = x + width * .18; const right = x + width * .82;
      [0, 1, 2, 3].forEach((index) => {
        const frontX = left + (right - left) * index / 3;
        scene.push({ type: "line", x1: frontX, y1: y + height * .16, x2: frontX, y2: y + height * .78 });
      });
      scene.push(directionRight
        ? { type: "line", x1: left, y1: cy, x2: right + 12, y2: cy, arrowEnd: true }
        : { type: "line", x1: right, y1: cy, x2: left - 12, y2: cy, arrowEnd: true });
    } else {
      const originX = directionRight ? x + width * .08 : x + width * .92; const radiusLimit = Math.min(width * .78, height * .72); const arcStart = directionRight ? -50 : 130; const arcEnd = directionRight ? 50 : 230;
      [0.34, 0.6, 0.86].forEach((ratio) => scene.push({ type: "arc", cx: originX, cy, r: radiusLimit * ratio, start: arcStart, end: arcEnd }));
      scene.push(directionRight
        ? { type: "line", x1: originX, y1: cy, x2: x + width - 8, y2: cy, arrowEnd: true }
        : { type: "line", x1: originX, y1: cy, x2: x + 8, y2: cy, arrowEnd: true });
    }
    if (main) scene.push({ type: "text", x: cx, y: y + height - 4, value: main, anchor: "middle", fontSize: 10 });
    return scene;
  }
  if (object.kind === "aperture-array") {
    const apertureType = gpsChoice(label("apertureType", "trous d’Young")); const requested = boundedInt(label("count", "2"), 2, 1, 9); const count = apertureType.startsWith("fente") ? 1 : apertureType.includes("young") ? 2 : requested;
    const spacing = label("spacing", "a").trim(); const opening = label("opening", "b").trim(); const plateX = cx; const top = y + 8; const bottom = y + height - 8; const gap = Math.min(15, Math.max(8, height / (count * 5 + 3)));
    const centers = Array.from({ length: count }, (_, index) => count === 1 ? cy : y + height * .25 + (height * .5 * index) / Math.max(1, count - 1)); const scene: ScientificPrimitive[] = [];
    let cursor = top;
    centers.forEach((center, index) => {
      const gapTop = center - gap / 2; const gapBottom = center + gap / 2;
      if (gapTop > cursor) scene.push({ type: "line", x1: plateX, y1: cursor, x2: plateX, y2: gapTop, strokeWidth: 3, nonScaling: true });
      scene.push(
        { type: "line", x1: plateX - 6, y1: gapTop, x2: plateX + 6, y2: gapTop },
        { type: "line", x1: plateX - 6, y1: gapBottom, x2: plateX + 6, y2: gapBottom },
      );
      if (apertureType.includes("young")) scene.push({ type: "text", x: plateX + 11, y: center + 4, value: `S_${index + 1}`, anchor: "start", fontSize: 9 });
      cursor = gapBottom;
    });
    if (cursor < bottom) scene.push({ type: "line", x1: plateX, y1: cursor, x2: plateX, y2: bottom, strokeWidth: 3, nonScaling: true });
    if (opening) scene.push({ type: "text", x: plateX - 10, y: centers[0] + 4, value: opening, anchor: "end", fontSize: 9 });
    if (spacing && centers.length > 1) {
      const dimensionX = x + width * .16; const first = centers[0]; const last = centers.at(-1)!;
      scene.push(
        { type: "line", x1: dimensionX, y1: first, x2: dimensionX, y2: last },
        { type: "line", x1: dimensionX - 4, y1: first, x2: dimensionX + 4, y2: first },
        { type: "line", x1: dimensionX - 4, y1: last, x2: dimensionX + 4, y2: last },
        { type: "text", x: dimensionX - 5, y: (first + last) / 2 + 4, value: spacing, anchor: "end", fontSize: 9 },
      );
    }
    if (apertureType.startsWith("reseau")) scene.push({ type: "text", x: plateX, y: y + height - 1, value: `N = ${count}`, anchor: "middle", fontSize: 9 });
    return scene;
  }
  if (object.kind === "wave-path") {
    const x2 = object.x2 ?? x; const y2 = object.y2 ?? y; const dx = x2 - x; const dy = y2 - y; const length = Math.hypot(dx, dy) || 1; const nx = -dy / length; const ny = dx / length; const main = label("main", "δ(M)").trim(); const medium = label("medium", "n = 1").trim(); const auxiliary = gpsChoice(label("pathStyle", "réel")).startsWith("aux");
    return [
      { type: "line", x1: x, y1: y, x2, y2, arrowEnd: true, dashed: auxiliary },
      ...(main ? [{ type: "text", x: (x + x2) / 2 - nx * 12, y: (y + y2) / 2 - ny * 12 + 4, value: main, anchor: "middle", fontSize: 10 } as ScientificPrimitive] : []),
      ...(medium ? [{ type: "text", x: (x + x2) / 2 + nx * 11, y: (y + y2) / 2 + ny * 11 + 4, value: medium, anchor: "middle", fontSize: 9 } as ScientificPrimitive] : []),
    ];
  }
  if (object.kind === "fringe-screen") {
    const screenName = label("screenName", "Écran").trim(); const pointName = label("pointName", "M").trim(); const count = boundedInt(label("fringeCount", "7"), 7, 3, 15); const spacing = label("fringeSpacing", "i").trim();
    const screenLeft = x + width * .25; const screenWidth = width * .5; const screenTop = y + 12; const screenHeight = height - 38; const bandStep = screenHeight / (count + 1); const scene: ScientificPrimitive[] = [{ type: "rect", x: screenLeft, y: screenTop, width: screenWidth, height: screenHeight, fill: "light" }];
    for (let index = 1; index <= count; index += 1) {
      const bandY = screenTop + bandStep * index; const bandWidth = screenWidth * (.62 + .3 * Math.cos((index - (count + 1) / 2) * .6) ** 2);
      scene.push({ type: "rect", x: screenLeft + (screenWidth - bandWidth) / 2, y: bandY - 1.4, width: bandWidth, height: 2.8, fill: "ink" });
    }
    const pointY = screenTop + bandStep * Math.ceil(count / 2); const pointX = screenLeft + screenWidth;
    scene.push({ type: "circle", cx: pointX, cy: pointY, r: 3, fill: "ink" });
    if (pointName) scene.push({ type: "text", x: pointX + 8, y: pointY + 4, value: pointName, anchor: "start", fontSize: 10 });
    if (spacing && count > 1) {
      const dimensionX = screenLeft - 9; const first = screenTop + bandStep; const second = first + bandStep;
      scene.push(
        { type: "line", x1: dimensionX, y1: first, x2: dimensionX, y2: second },
        { type: "line", x1: dimensionX - 3, y1: first, x2: dimensionX + 3, y2: first },
        { type: "line", x1: dimensionX - 3, y1: second, x2: dimensionX + 3, y2: second },
        { type: "text", x: dimensionX - 5, y: (first + second) / 2 + 4, value: spacing, anchor: "end", fontSize: 9 },
      );
    }
    if (screenName) scene.push({ type: "text", x: screenLeft + screenWidth / 2, y: y + height - 4, value: screenName, anchor: "middle", fontSize: 10, technical: true });
    return scene;
  }
  if (object.kind === "diffraction-cone") {
    const opening = label("opening", "a").trim(); const angle = label("angle", "θ").trim(); const wavelength = label("wavelength", "λ").trim(); const distance = label("distance", "D").trim();
    const apertureX = x + 30; const screenX = x + width - 20; const topRayY = y + height * .18; const bottomRayY = y + height * .82; const gap = Math.min(22, height * .16); const axisY = cy; const alpha = Math.atan2(axisY - topRayY, screenX - apertureX) * 180 / Math.PI;
    const scene: ScientificPrimitive[] = [
      { type: "line", x1: apertureX, y1: y + 8, x2: apertureX, y2: axisY - gap / 2, strokeWidth: 3, nonScaling: true },
      { type: "line", x1: apertureX, y1: axisY + gap / 2, x2: apertureX, y2: y + height - 8, strokeWidth: 3, nonScaling: true },
      { type: "line", x1: apertureX, y1: axisY, x2: screenX, y2: topRayY },
      { type: "line", x1: apertureX, y1: axisY, x2: screenX, y2: bottomRayY },
      { type: "line", x1: apertureX, y1: axisY, x2: screenX, y2: axisY, dashed: true },
      { type: "line", x1: screenX, y1: y + 5, x2: screenX, y2: y + height - 5, strokeWidth: 2.4, nonScaling: true },
      { type: "arc", cx: apertureX, cy: axisY, r: Math.min(34, width * .14), start: -alpha, end: 0 },
      { type: "line", x1: apertureX, y1: y + height - 12, x2: screenX, y2: y + height - 12 },
      { type: "line", x1: apertureX, y1: y + height - 16, x2: apertureX, y2: y + height - 8 },
      { type: "line", x1: screenX, y1: y + height - 16, x2: screenX, y2: y + height - 8 },
    ];
    if (opening) scene.push({ type: "text", x: apertureX - 7, y: axisY + 4, value: opening, anchor: "end", fontSize: 10 });
    if (angle) scene.push({ type: "text", x: apertureX + 39, y: axisY - 8, value: angle, anchor: "middle", fontSize: 10 });
    if (wavelength) scene.push({ type: "text", x: (apertureX + screenX) / 2, y: axisY - 9, value: wavelength, anchor: "middle", fontSize: 10 });
    if (distance) scene.push({ type: "text", x: (apertureX + screenX) / 2, y: y + height - 16, value: distance, anchor: "middle", fontSize: 10 });
    return scene;
  }
  if (object.kind === "standing-wave") {
    const x2 = object.x2 ?? x; const y2 = object.y2 ?? y; const dx = x2 - x; const dy = y2 - y; const length = Math.hypot(dx, dy) || 1; const tx = dx / length; const ty = dy / length; const nx = -ty; const ny = tx; const mode = boundedInt(label("mode", "3"), 3, 1, 8); const amplitude = Math.min(30, Math.max(10, length * .1)); const main = label("main", "y(x,t)").trim(); const antinodes = gpsEnabled(label("showAntinodes", "oui"));
    const points = Array.from({ length: mode * 32 + 1 }, (_, index) => { const ratio = index / (mode * 32); const offset = Math.sin(Math.PI * mode * ratio) * amplitude; return { x: x + tx * length * ratio + nx * offset, y: y + ty * length * ratio + ny * offset }; });
    const scene: ScientificPrimitive[] = [
      { type: "line", x1: x, y1: y, x2, y2, dashed: true },
      { type: "polyline", points },
    ];
    for (let index = 0; index <= mode; index += 1) {
      const ratio = index / mode; scene.push({ type: "circle", cx: x + tx * length * ratio, cy: y + ty * length * ratio, r: 2.7, fill: "ink" });
    }
    if (antinodes) for (let index = 0; index < mode; index += 1) {
      const ratio = (index + .5) / mode; const offset = Math.sin(Math.PI * mode * ratio) * amplitude;
      scene.push({ type: "circle", cx: x + tx * length * ratio + nx * offset, cy: y + ty * length * ratio + ny * offset, r: 3.2, fill: "paper" });
    }
    if (main) scene.push({ type: "text", x: (x + x2) / 2 - nx * (amplitude + 12), y: (y + y2) / 2 - ny * (amplitude + 12) + 4, value: main, anchor: "middle", fontSize: 10 });
    scene.push(
      { type: "text", x: x + tx * length * .16 + nx * (amplitude + 15), y: y + ty * length * .16 + ny * (amplitude + 15) + 4, value: "nœuds", anchor: "middle", fontSize: 8, technical: true },
      { type: "text", x: x + tx * length * .84 + nx * (amplitude + 15), y: y + ty * length * .84 + ny * (amplitude + 15) + 4, value: "ventres", anchor: "middle", fontSize: 8, technical: true },
    );
    return scene;
  }
  if (object.kind === "intensity-profile") {
    const profileType = gpsChoice(label("profileType", "interférence")); const main = label("main", "I(x)").trim(); const fringes = boundedInt(label("fringeCount", "7"), 7, 2, 15); const left = x + 34; const right = x + width - 10; const top = y + 14; const bottom = y + height - 26; const plotWidth = Math.max(20, right - left); const plotHeight = Math.max(20, bottom - top);
    const samples = Array.from({ length: 181 }, (_, index) => {
      const u = index / 180; let intensity: number;
      if (profileType.startsWith("diff")) { const z = (u - .5) * 7; intensity = Math.abs(z) < 1e-8 ? 1 : (Math.sin(Math.PI * z) / (Math.PI * z)) ** 2; }
      else intensity = .06 + .94 * Math.cos(Math.PI * fringes * (u - .5)) ** 2;
      return { x: left + plotWidth * u, y: bottom - plotHeight * intensity };
    });
    return [
      { type: "line", x1: left, y1: bottom, x2: right + 6, y2: bottom, arrowEnd: true },
      { type: "line", x1: left, y1: bottom, x2: left, y2: top - 5, arrowEnd: true },
      { type: "polyline", points: samples },
      { type: "text", x: right + 8, y: bottom + 14, value: "x", anchor: "middle", fontSize: 9 },
      ...(main ? [{ type: "text", x: left + 7, y: top - 2, value: main, anchor: "start", fontSize: 10 } as ScientificPrimitive] : []),
    ];
  }
  if (object.kind === "chemical-atom") {
    const element = label("element", "C").trim() || "C"; const hydrogens = boundedInt(label("hydrogens", "0"), 0, 0, 9); const charge = label("charge", "").trim(); const isotope = label("isotope", "").trim(); const lonePairs = boundedInt(label("lonePairs", "0"), 0, 0, 4); const radical = gpsEnabled(label("radical", "non")); const vacancy = gpsEnabled(label("electronVacancy", "non"));
    const scene: ScientificPrimitive[] = [{ type: "text", x: cx, y: cy + 6, value: element, anchor: "middle", fontSize: 18, roman: true }];
    if (isotope) scene.push({ type: "text", x: cx - Math.max(10, element.length * 5), y: cy - 8, value: isotope, anchor: "end", fontSize: 8, roman: true });
    if (hydrogens) {
      scene.push({ type: "text", x: cx + Math.max(11, element.length * 5), y: cy + 6, value: "H", anchor: "start", fontSize: 14, roman: true });
      if (hydrogens > 1) scene.push({ type: "text", x: cx + Math.max(22, element.length * 5 + 11), y: cy + 11, value: String(hydrogens), anchor: "start", fontSize: 8, roman: true });
    }
    if (charge) scene.push({ type: "text", x: cx + Math.max(10, element.length * 5), y: cy - 9, value: charge, anchor: "start", fontSize: 9, roman: true });
    const pairCenters = [{ x: cx, y: cy - 20, dx: 3, dy: 0 }, { x: cx + 21, y: cy, dx: 0, dy: 3 }, { x: cx, y: cy + 20, dx: 3, dy: 0 }, { x: cx - 21, y: cy, dx: 0, dy: 3 }];
    pairCenters.slice(0, lonePairs).forEach((pair) => scene.push(
      { type: "circle", cx: pair.x - pair.dx, cy: pair.y - pair.dy, r: 1.7, fill: "ink" },
      { type: "circle", cx: pair.x + pair.dx, cy: pair.y + pair.dy, r: 1.7, fill: "ink" },
    ));
    if (radical) scene.push({ type: "circle", cx: cx + 18, cy: cy - 17, r: 2, fill: "ink" });
    if (vacancy) scene.push({ type: "rect", x: cx + 14, y: cy + 13, width: 7, height: 7, fill: "paper" });
    return scene;
  }
  if (object.kind === "bond-wedge-solid" || object.kind === "bond-wedge-hashed") {
    const x2 = object.x2 ?? x; const y2 = object.y2 ?? y; const dx = x2 - x; const dy = y2 - y; const length = Math.hypot(dx, dy) || 1; const tx = dx / length; const ty = dy / length; const nx = -ty; const ny = tx; const wideAtStart = gpsChoice(label("wideEnd", "fin")).startsWith("deb");
    const narrow = wideAtStart ? { x: x2, y: y2 } : { x, y }; const wide = wideAtStart ? { x, y } : { x: x2, y: y2 }; const direction = wideAtStart ? { x: -tx, y: -ty } : { x: tx, y: ty };
    if (object.kind === "bond-wedge-solid") return [{ type: "polyline", closed: true, fill: "ink", points: [narrow, { x: wide.x + nx * 8, y: wide.y + ny * 8 }, { x: wide.x - nx * 8, y: wide.y - ny * 8 }] }];
    return Array.from({ length: 8 }, (_, index): ScientificPrimitive => {
      const ratio = (index + 1) / 8; const center = { x: narrow.x + direction.x * length * ratio, y: narrow.y + direction.y * length * ratio }; const half = 1 + ratio * 7;
      return { type: "line", x1: center.x - nx * half, y1: center.y - ny * half, x2: center.x + nx * half, y2: center.y + ny * half };
    });
  }
  if (object.kind === "bond-wavy") {
    const x2 = object.x2 ?? x; const y2 = object.y2 ?? y; const dx = x2 - x; const dy = y2 - y; const length = Math.hypot(dx, dy) || 1; const tx = dx / length; const ty = dy / length; const nx = -ty; const ny = tx; const cycles = Math.max(3, Math.round(length / 22)); const main = label("main", "").trim();
    const points = Array.from({ length: cycles * 12 + 1 }, (_, index) => { const ratio = index / (cycles * 12); const offset = Math.sin(ratio * cycles * Math.PI * 2) * 3.5; return { x: x + tx * length * ratio + nx * offset, y: y + ty * length * ratio + ny * offset }; });
    return [{ type: "polyline", points }, ...(main ? [{ type: "text", x: (x + x2) / 2 - nx * 11, y: (y + y2) / 2 - ny * 11 + 4, value: main, anchor: "middle", fontSize: 9, roman: true } as ScientificPrimitive] : [])];
  }
  if (object.kind === "electron-pair-arrow" || object.kind === "single-electron-arrow") {
    const x2 = object.x2 ?? x; const y2 = object.y2 ?? y; const dx = x2 - x; const dy = y2 - y; const length = Math.hypot(dx, dy) || 1; const tx = dx / length; const ty = dy / length; const nx = -ty; const ny = tx; const side = gpsChoice(label("curvature", "gauche")).startsWith("d") ? -1 : 1; const bend = Math.min(65, Math.max(24, length * .28)) * side;
    const control1 = { x: x + dx / 3 + nx * bend, y: y + dy / 3 + ny * bend }; const control2 = { x: x + dx * 2 / 3 + nx * bend, y: y + dy * 2 / 3 + ny * bend }; const main = label("main", "").trim();
    const scene: ScientificPrimitive[] = [{ type: "bezier", start: { x, y }, control1, control2, end: { x: x2, y: y2 }, arrowEnd: object.kind === "electron-pair-arrow" }];
    if (object.kind === "single-electron-arrow") {
      const tangentX = x2 - control2.x; const tangentY = y2 - control2.y; const tangentLength = Math.hypot(tangentX, tangentY) || 1; const hookX = tangentX / tangentLength; const hookY = tangentY / tangentLength; const hookNx = -hookY; const hookNy = hookX;
      scene.push({ type: "line", x1: x2 - hookX * 11 + hookNx * 5, y1: y2 - hookY * 11 + hookNy * 5, x2, y2 });
    }
    if (main) {
      const curveMid = { x: (x + 3 * control1.x + 3 * control2.x + x2) / 8, y: (y + 3 * control1.y + 3 * control2.y + y2) / 8 };
      scene.push({ type: "text", x: curveMid.x - nx * 10 * side, y: curveMid.y - ny * 10 * side + 4, value: main, anchor: "middle", fontSize: 9, roman: true });
    }
    return scene;
  }
  if (object.kind === "mesomeric-arrow") {
    const x2 = object.x2 ?? x; const y2 = object.y2 ?? y; const dx = x2 - x; const dy = y2 - y; const length = Math.hypot(dx, dy) || 1; const tx = dx / length; const ty = dy / length; const nx = -ty; const ny = tx; const main = label("main", "").trim(); const headLength = Math.min(13, length * .2); const headWidth = Math.min(6, headLength * .48);
    return [
      { type: "line", x1: x, y1: y, x2, y2 },
      { type: "polyline", closed: true, fill: "ink", points: [{ x, y }, { x: x + tx * headLength + nx * headWidth, y: y + ty * headLength + ny * headWidth }, { x: x + tx * headLength - nx * headWidth, y: y + ty * headLength - ny * headWidth }] },
      { type: "polyline", closed: true, fill: "ink", points: [{ x: x2, y: y2 }, { x: x2 - tx * headLength + nx * headWidth, y: y2 - ty * headLength + ny * headWidth }, { x: x2 - tx * headLength - nx * headWidth, y: y2 - ty * headLength - ny * headWidth }] },
      ...(main ? [{ type: "text", x: (x + x2) / 2 - nx * 11, y: (y + y2) / 2 - ny * 11 + 4, value: main, anchor: "middle", fontSize: 9, roman: true } as ScientificPrimitive] : []),
    ];
  }
  if (object.kind === "newman-projection") {
    const conformation = gpsChoice(label("conformation", "décalée")); const staggered = !conformation.startsWith("ecl"); const rotation = Number(label("rotation", "0").replace(",", ".")) || 0; const radius = Math.min(width, height) * .2;
    const frontAngles = [-90, 30, 150].map((angle) => angle + rotation); const rearAngles = frontAngles.map((angle) => angle + (staggered ? 60 : 0)); const frontLabels = [label("front1", "H"), label("front2", "H"), label("front3", "CH_3")]; const rearLabels = [label("rear1", "H"), label("rear2", "H"), label("rear3", "CH_3")];
    const radial = (angle: number, distance: number) => ({ x: cx + Math.cos(angle * Math.PI / 180) * distance, y: cy + Math.sin(angle * Math.PI / 180) * distance });
    const scene: ScientificPrimitive[] = [{ type: "circle", cx, cy, r: radius, fill: "paper" }];
    rearAngles.forEach((angle, index) => {
      const start = radial(angle, radius); const end = radial(angle, radius * 1.55); const labelPoint = radial(angle, radius * 2.02);
      scene.push({ type: "line", x1: start.x, y1: start.y, x2: end.x, y2: end.y }, { type: "text", x: labelPoint.x, y: labelPoint.y + 4, value: rearLabels[index], anchor: "middle", fontSize: 10, roman: true });
    });
    frontAngles.forEach((angle, index) => {
      const end = radial(angle, radius * 1.45); const labelPoint = radial(angle, radius * 1.75);
      scene.push({ type: "line", x1: cx, y1: cy, x2: end.x, y2: end.y }, { type: "text", x: labelPoint.x, y: labelPoint.y + 4, value: frontLabels[index], anchor: "middle", fontSize: 10, roman: true });
    });
    scene.push(
      { type: "circle", cx, cy, r: Math.max(3, radius * .1), fill: "ink" },
      { type: "text", x: cx, y: y + height - 5, value: staggered ? "décalée" : "éclipsée", anchor: "middle", fontSize: 9, technical: true },
    );
    return scene;
  }
  if (object.kind === "skeletal-ring") {
    const ringSize = boundedInt(label("ringSize", "6"), 6, 3, 8); const ringType = gpsChoice(label("ringType", "aromatique")); const radius = Math.min(width, height) * .34; const points = Array.from({ length: ringSize }, (_, index) => { const angle = -90 + index * 360 / ringSize; return { x: cx + Math.cos(angle * Math.PI / 180) * radius, y: cy + Math.sin(angle * Math.PI / 180) * radius }; });
    const scene: ScientificPrimitive[] = [{ type: "polyline", points, closed: true }];
    if (ringType.startsWith("arom")) scene.push({ type: "circle", cx, cy, r: radius * .57 });
    if (ringType.startsWith("altern")) for (let index = 0; index < ringSize; index += 2) {
      const first = points[index]; const second = points[(index + 1) % ringSize]; const firstInset = { x: first.x * .72 + second.x * .18 + cx * .1, y: first.y * .72 + second.y * .18 + cy * .1 }; const secondInset = { x: first.x * .18 + second.x * .72 + cx * .1, y: first.y * .18 + second.y * .72 + cy * .1 };
      scene.push({ type: "line", x1: firstInset.x, y1: firstInset.y, x2: secondInset.x, y2: secondInset.y });
    }
    [["substituent1", 0], ["substituent2", Math.floor(ringSize / 2)]].forEach(([key, rawIndex]) => {
      const substituent = label(String(key), "").trim(); if (!substituent) return; const index = Number(rawIndex); const vertex = points[index]; const vx = vertex.x - cx; const vy = vertex.y - cy; const vertexLength = Math.hypot(vx, vy) || 1; const end = { x: vertex.x + vx / vertexLength * 25, y: vertex.y + vy / vertexLength * 25 };
      scene.push({ type: "line", x1: vertex.x, y1: vertex.y, x2: end.x, y2: end.y }, { type: "text", x: end.x + vx / vertexLength * 10, y: end.y + vy / vertexLength * 10 + 4, value: substituent, anchor: "middle", fontSize: 10, roman: true });
    });
    return scene;
  }
  if (object.kind === "reaction-arrow") {
    const x2 = object.x2 ?? x; const y2 = object.y2 ?? y; const dx = x2 - x; const dy = y2 - y; const length = Math.hypot(dx, dy) || 1; const nx = -dy / length; const ny = dx / length;
    const above = [label("above", ""), label("reagent", "")].map((value) => value.trim()).filter(Boolean).join("; ");
    const below = [label("below", ""), label("solvent", ""), label("temperature", ""), label("duration", "")].map((value) => value.trim()).filter(Boolean).join("; ");
    return [
      { type: "line", x1: x, y1: y, x2, y2, arrowEnd: true },
      ...(above ? [{ type: "text", x: (x + x2) / 2 - nx * 13, y: (y + y2) / 2 - ny * 13 + 4, value: above, anchor: "middle", fontSize: 9, roman: true } as ScientificPrimitive] : []),
      ...(below ? [{ type: "text", x: (x + x2) / 2 + nx * 12, y: (y + y2) / 2 + ny * 12 + 4, value: below, anchor: "middle", fontSize: 9, roman: true } as ScientificPrimitive] : []),
    ];
  }
  if (object.kind === "bode-diagram") {
    const layout = bodeLayoutFor(x, y, width, height); const title = label("title", "Diagramme de Bode").trim(); const transferFunction = label("transferFunction", "H(p)").trim();
    const omegaFallback = [0.1, 1000] as const; const [omegaMin, omegaMax] = safeRange(Math.max(Number.MIN_VALUE, finiteNumber(label("omegaMin", "0.1"), omegaFallback[0])), Math.max(Number.MIN_VALUE, finiteNumber(label("omegaMax", "1000"), omegaFallback[1])), ...omegaFallback);
    const [gainMin, gainMax] = safeRange(finiteNumber(label("gainMin", "-60"), -60), finiteNumber(label("gainMax", "40"), 40), -60, 40);
    const [phaseMin, phaseMax] = safeRange(finiteNumber(label("phaseMin", "-180"), -180), finiteNumber(label("phaseMax", "0"), 0), -180, 0); const frequencyUnit = label("frequencyUnit", "rad/s").trim() || "rad/s";
    const scene: ScientificPrimitive[] = [
      { type: "rect", x: layout.left, y: layout.gainTop, width: layout.right - layout.left, height: layout.gainBottom - layout.gainTop },
      { type: "rect", x: layout.left, y: layout.phaseTop, width: layout.right - layout.left, height: layout.phaseBottom - layout.phaseTop },
      { type: "text", x: (layout.left + layout.right) / 2, y: y + 17, value: title, anchor: "middle", fontSize: 12, math: false },
      ...(transferFunction ? [{ type: "text", x: layout.right, y: y + 17, value: transferFunction, anchor: "end", fontSize: 10 } as ScientificPrimitive] : []),
      { type: "text", x: layout.left - 8, y: layout.gainTop + 4, value: "G_{dB}", latex: "G_{\\mathrm{dB}}", anchor: "end", fontSize: 10 },
      { type: "text", x: layout.left - 8, y: layout.phaseTop + 4, value: "φ", latex: "\\varphi", anchor: "end", fontSize: 10 },
      { type: "text", x: layout.right, y: layout.phaseBottom + 20, value: `ω (${frequencyUnit})`, latex: `\\omega\\;(\\mathrm{${frequencyUnit === "Hz" ? "Hz" : "rad\\,s^{-1}"}})`, anchor: "end", fontSize: 9 },
    ];
    for (let index = 0; index <= 4; index += 1) {
      const gainValue = gainMax - ((gainMax - gainMin) * index) / 4; const gainY = mapLinear(gainValue, gainMax, gainMin, layout.gainTop, layout.gainBottom);
      const phaseValue = phaseMax - ((phaseMax - phaseMin) * index) / 4; const phaseY = mapLinear(phaseValue, phaseMax, phaseMin, layout.phaseTop, layout.phaseBottom);
      scene.push(
        { type: "line", x1: layout.left, y1: gainY, x2: layout.right, y2: gainY, dashed: index > 0 && index < 4, strokeWidth: index > 0 && index < 4 ? .8 : undefined },
        { type: "text", x: layout.left - 7, y: gainY + 3, value: Number(gainValue.toFixed(1)).toString(), anchor: "end", fontSize: 8, technical: true },
        { type: "line", x1: layout.left, y1: phaseY, x2: layout.right, y2: phaseY, dashed: index > 0 && index < 4, strokeWidth: index > 0 && index < 4 ? .8 : undefined },
        { type: "text", x: layout.left - 7, y: phaseY + 3, value: `${Number(phaseValue.toFixed(1))}°`, anchor: "end", fontSize: 8, technical: true },
      );
    }
    const minimumDecade = Math.ceil(Math.log10(omegaMin)); const maximumDecade = Math.floor(Math.log10(omegaMax));
    for (let decade = minimumDecade; decade <= maximumDecade; decade += 1) {
      const omega = 10 ** decade; const tickX = mapLog(omega, omegaMin, omegaMax, layout.left, layout.right);
      scene.push(
        { type: "line", x1: tickX, y1: layout.gainTop, x2: tickX, y2: layout.gainBottom, dashed: true, strokeWidth: .8 },
        { type: "line", x1: tickX, y1: layout.phaseTop, x2: tickX, y2: layout.phaseBottom, dashed: true, strokeWidth: .8 },
        { type: "text", x: tickX, y: layout.phaseBottom + 12, value: `10^${decade}`, latex: `10^{${decade}}`, anchor: "middle", fontSize: 8 },
      );
    }
    return scene;
  }
  if (object.kind === "bode-trace") {
    const layout = bodeLayoutFor(x, y, width, height); const omegaMin = .1; const omegaMax = 1000; const gainMin = -60; const gainMax = 40; const phaseMin = -180; const phaseMax = 0;
    const channel = gpsChoice(label("channel", "module")); const moduleTrace = !channel.startsWith("phase"); const traceType = gpsChoice(label("traceType", "réel")); const asymptotic = traceType.startsWith("asym"); const model = gpsChoice(label("model", "premier ordre"));
    const secondOrder = model.includes("deux") || model.includes("second") || model.startsWith("2"); const piCorrector = model === "pi" || model.includes("integral"); const gain = Math.max(1e-6, Math.abs(finiteNumber(label("gain", "1"), 1))); const omega0 = Math.max(1e-6, Math.abs(finiteNumber(label("omega0", "10"), 10))); const damping = Math.max(.01, Math.abs(finiteNumber(label("damping", "0.7"), .7))); const gainDb = 20 * Math.log10(gain);
    const response = (omega: number) => {
      const ratio = omega / omega0; const logRatio = Math.log10(Math.max(ratio, Number.MIN_VALUE));
      if (piCorrector) {
        if (moduleTrace) return asymptotic ? gainDb + (ratio < 1 ? -20 * logRatio : 0) : gainDb + 10 * Math.log10(1 + ratio * ratio) - 20 * Math.log10(ratio);
        return asymptotic ? (ratio <= .1 ? -90 : ratio >= 10 ? 0 : -90 + 45 * (logRatio + 1)) : Math.atan(ratio) * 180 / Math.PI - 90;
      }
      if (secondOrder) {
        if (moduleTrace) return asymptotic ? gainDb + (ratio > 1 ? -40 * logRatio : 0) : gainDb - 10 * Math.log10((1 - ratio * ratio) ** 2 + (2 * damping * ratio) ** 2);
        return asymptotic ? (ratio <= .1 ? 0 : ratio >= 10 ? -180 : -90 * (logRatio + 1)) : -Math.atan2(2 * damping * ratio, 1 - ratio * ratio) * 180 / Math.PI;
      }
      if (moduleTrace) return asymptotic ? gainDb + (ratio > 1 ? -20 * logRatio : 0) : gainDb - 10 * Math.log10(1 + ratio * ratio);
      return asymptotic ? (ratio <= .1 ? 0 : ratio >= 10 ? -90 : -45 * (logRatio + 1)) : -Math.atan(ratio) * 180 / Math.PI;
    };
    const panelTop = moduleTrace ? layout.gainTop : layout.phaseTop; const panelBottom = moduleTrace ? layout.gainBottom : layout.phaseBottom; const minimum = moduleTrace ? gainMin : phaseMin; const maximum = moduleTrace ? gainMax : phaseMax;
    const points = Array.from({ length: 201 }, (_, index) => { const ratio = index / 200; const omega = 10 ** (Math.log10(omegaMin) + ratio * (Math.log10(omegaMax) - Math.log10(omegaMin))); const responseValue = clamp(response(omega), minimum, maximum); return { x: mapLog(omega, omegaMin, omegaMax, layout.left, layout.right), y: mapLinear(responseValue, maximum, minimum, panelTop, panelBottom) }; });
    const main = label("main", "H").trim();
    return [
      { type: "polyline", points, dashed: asymptotic, strokeWidth: 2.2 },
      ...(main ? [{ type: "text", x: layout.right - 5, y: panelTop + 13, value: moduleTrace ? `|${main}|` : `arg(${main})`, anchor: "end", fontSize: 9 } as ScientificPrimitive] : []),
    ];
  }
  if (object.kind === "bode-break") {
    const x2 = object.x2 ?? x; const y2 = object.y2 ?? y; const dx = x2 - x; const dy = y2 - y; const length = Math.hypot(dx, dy) || 1; const nx = -dy / length; const ny = dx / length; const main = label("main", "ω_0").trim();
    return [
      { type: "line", x1: x, y1: y, x2, y2, dashed: true },
      ...(main ? [{ type: "text", x: (x + x2) / 2 - nx * 9, y: (y + y2) / 2 - ny * 9 + 3, value: main, anchor: "middle", fontSize: 9 } as ScientificPrimitive] : []),
    ];
  }
  if (object.kind === "bode-slope") {
    const x2 = object.x2 ?? x; const y2 = object.y2 ?? y; const dx = x2 - x; const dy = y2 - y; const length = Math.hypot(dx, dy) || 1; const nx = -dy / length; const ny = dx / length; const slope = label("slope", "-20").trim(); const main = label("main", `${slope} dB/décade`).trim();
    return [
      { type: "line", x1: x, y1: y, x2, y2, strokeWidth: 2 },
      { type: "line", x1: x - nx * 4, y1: y - ny * 4, x2: x + nx * 4, y2: y + ny * 4 },
      { type: "line", x1: x2 - nx * 4, y1: y2 - ny * 4, x2: x2 + nx * 4, y2: y2 + ny * 4 },
      ...(main ? [{ type: "text", x: (x + x2) / 2 - nx * 10, y: (y + y2) / 2 - ny * 10 + 3, value: main, anchor: "middle", fontSize: 9 } as ScientificPrimitive] : []),
    ];
  }
  if (object.kind === "stability-margin") {
    const layout = bodeLayoutFor(x, y, width, height); const marginType = gpsChoice(label("marginType", "phase")); const phaseMargin = !marginType.startsWith("gain"); const omegaC = clamp(Math.abs(finiteNumber(label("omegaC", "10"), 10)), .1, 1000); const margin = Math.abs(finiteNumber(label("marginValue", phaseMargin ? "45" : "12"), phaseMargin ? 45 : 12)); const markerX = mapLog(omegaC, .1, 1000, layout.left, layout.right); const main = label("main", phaseMargin ? "M_φ" : "M_G").trim();
    const panelTop = phaseMargin ? layout.phaseTop : layout.gainTop; const panelBottom = phaseMargin ? layout.phaseBottom : layout.gainBottom; const referenceValue = phaseMargin ? -180 : 0; const measuredValue = phaseMargin ? -180 + margin : -margin; const rangeMinimum = phaseMargin ? -180 : -60; const rangeMaximum = phaseMargin ? 0 : 40; const referenceY = mapLinear(referenceValue, rangeMaximum, rangeMinimum, panelTop, panelBottom); const measuredY = mapLinear(clamp(measuredValue, rangeMinimum, rangeMaximum), rangeMaximum, rangeMinimum, panelTop, panelBottom);
    const bracketX = markerX + 7; const caption = `${main || (phaseMargin ? "M_φ" : "M_G")} = ${Number(margin.toFixed(1))}${phaseMargin ? "°" : " dB"}`;
    return [
      { type: "line", x1: markerX, y1: layout.gainTop, x2: markerX, y2: layout.phaseBottom, dashed: true },
      { type: "line", x1: layout.left, y1: referenceY, x2: layout.right, y2: referenceY, dashed: true },
      { type: "line", x1: bracketX, y1: referenceY, x2: bracketX, y2: measuredY, strokeWidth: 1.8 },
      { type: "line", x1: bracketX - 5, y1: referenceY, x2: bracketX + 5, y2: referenceY },
      { type: "line", x1: bracketX - 5, y1: measuredY, x2: bracketX + 5, y2: measuredY },
      { type: "text", x: bracketX + 8, y: (referenceY + measuredY) / 2 + 3, value: caption, anchor: "start", fontSize: 9 },
      { type: "text", x: markerX, y: layout.phaseBottom + 12, value: "ω_c", anchor: "middle", fontSize: 8 },
    ];
  }
  if (object.kind === "time-response-diagram") {
    const layout = timeLayoutFor(x, y, width, height); const title = label("title", "Réponse temporelle").trim(); const signal = label("signal", "y(t)").trim(); const input = label("input", "échelon").trim(); const unit = label("unit", "").trim();
    const [timeMin, timeMax] = safeRange(finiteNumber(label("timeMin", "0"), 0), finiteNumber(label("timeMax", "10"), 10), 0, 10); const [yMin, yMax] = safeRange(finiteNumber(label("yMin", "0"), 0), finiteNumber(label("yMax", "1.5"), 1.5), 0, 1.5);
    const scene: ScientificPrimitive[] = [
      { type: "line", x1: layout.left, y1: layout.bottom, x2: layout.right + 7, y2: layout.bottom, arrowEnd: true },
      { type: "line", x1: layout.left, y1: layout.bottom, x2: layout.left, y2: layout.top - 7, arrowEnd: true },
      { type: "text", x: (layout.left + layout.right) / 2, y: y + 17, value: title, anchor: "middle", fontSize: 12, math: false },
      { type: "text", x: layout.left - 7, y: layout.top, value: signal, anchor: "end", fontSize: 10 },
      { type: "text", x: layout.right, y: layout.bottom + 21, value: unit ? `t (${unit})` : "t", anchor: "end", fontSize: 9 },
      { type: "text", x: layout.right, y: y + 17, value: `entrée : ${input}`, anchor: "end", fontSize: 9, math: false },
    ];
    for (let index = 0; index <= 5; index += 1) {
      const timeValue = timeMin + ((timeMax - timeMin) * index) / 5; const tickX = mapLinear(timeValue, timeMin, timeMax, layout.left, layout.right);
      scene.push(
        { type: "line", x1: tickX, y1: layout.top, x2: tickX, y2: layout.bottom, dashed: index > 0, strokeWidth: index > 0 ? .8 : undefined },
        { type: "text", x: tickX, y: layout.bottom + 13, value: Number(timeValue.toFixed(2)).toString(), anchor: "middle", fontSize: 8, technical: true },
      );
    }
    for (let index = 0; index <= 3; index += 1) {
      const ordinate = yMin + ((yMax - yMin) * index) / 3; const tickY = mapLinear(ordinate, yMax, yMin, layout.top, layout.bottom);
      scene.push(
        { type: "line", x1: layout.left, y1: tickY, x2: layout.right, y2: tickY, dashed: index > 0, strokeWidth: index > 0 ? .8 : undefined },
        { type: "text", x: layout.left - 7, y: tickY + 3, value: Number(ordinate.toFixed(2)).toString(), anchor: "end", fontSize: 8, technical: true },
      );
    }
    return scene;
  }
  if (object.kind === "time-response-trace") {
    const layout = timeLayoutFor(x, y, width, height); const timeMin = 0; const timeMax = 10; const yMin = 0; const yMax = 1.5; const model = gpsChoice(label("model", "premier ordre")); const secondOrder = model.includes("deux") || model.includes("second") || model.startsWith("2"); const input = gpsChoice(label("input", "échelon"));
    const gain = finiteNumber(label("gain", "1"), 1); const tau = Math.max(1e-4, Math.abs(finiteNumber(label("tau", "1"), 1))); const omega0 = Math.max(1e-4, Math.abs(finiteNumber(label("omega0", "1"), 1))); const damping = Math.max(.01, Math.abs(finiteNumber(label("damping", "0.5"), .5)));
    const firstOrderResponse = (time: number) => {
      if (input.startsWith("imp")) return gain / tau * Math.exp(-time / tau);
      if (input.startsWith("ramp")) return gain * ((time / timeMax) - (tau / timeMax) * (1 - Math.exp(-time / tau)));
      return gain * (1 - Math.exp(-time / tau));
    };
    const secondOrderStep = (time: number) => {
      if (damping < 1 - 1e-4) {
        const root = Math.sqrt(1 - damping * damping); const dampedOmega = omega0 * root;
        return gain * (1 - Math.exp(-damping * omega0 * time) * Math.sin(dampedOmega * time + Math.acos(damping)) / root);
      }
      if (Math.abs(damping - 1) <= 1e-4) return gain * (1 - Math.exp(-omega0 * time) * (1 + omega0 * time));
      const root = Math.sqrt(damping * damping - 1); const firstRoot = -omega0 * (damping - root); const secondRoot = -omega0 * (damping + root);
      return gain * (1 + (secondRoot * Math.exp(firstRoot * time) - firstRoot * Math.exp(secondRoot * time)) / (firstRoot - secondRoot));
    };
    const secondOrderImpulse = (time: number) => {
      if (damping < 1 - 1e-4) { const dampedOmega = omega0 * Math.sqrt(1 - damping * damping); return gain * omega0 * omega0 * Math.exp(-damping * omega0 * time) * Math.sin(dampedOmega * time) / dampedOmega; }
      if (Math.abs(damping - 1) <= 1e-4) return gain * omega0 * omega0 * time * Math.exp(-omega0 * time);
      const root = Math.sqrt(damping * damping - 1); const firstRoot = -omega0 * (damping - root); const secondRoot = -omega0 * (damping + root);
      return gain * omega0 * omega0 * (Math.exp(firstRoot * time) - Math.exp(secondRoot * time)) / (firstRoot - secondRoot);
    };
    const responseAt = (time: number) => {
      if (!secondOrder) return firstOrderResponse(time);
      if (input.startsWith("imp")) return secondOrderImpulse(time);
      if (input.startsWith("ramp")) {
        const steps = 36; let integral = 0; const step = time / steps;
        for (let index = 1; index <= steps; index += 1) integral += (secondOrderStep(step * (index - 1)) + secondOrderStep(step * index)) * step / 2;
        return integral / timeMax;
      }
      return secondOrderStep(time);
    };
    const points = Array.from({ length: 241 }, (_, index) => { const time = timeMin + ((timeMax - timeMin) * index) / 240; const response = clamp(responseAt(time), yMin, yMax); return { x: mapLinear(time, timeMin, timeMax, layout.left, layout.right), y: mapLinear(response, yMax, yMin, layout.top, layout.bottom) }; }); const main = label("main", "y(t)").trim();
    return [
      { type: "polyline", points, strokeWidth: 2.2 },
      ...(main ? [{ type: "text", x: layout.right - 5, y: layout.top + 13, value: main, anchor: "end", fontSize: 10 } as ScientificPrimitive] : []),
    ];
  }
  if (object.kind === "settling-band") {
    const layout = timeLayoutFor(x, y, width, height); const target = finiteNumber(label("target", "1"), 1); const tolerance = Math.abs(finiteNumber(label("tolerance", "5"), 5)); const lower = target * (1 - tolerance / 100); const upper = target * (1 + tolerance / 100); const mapY = (value: number) => mapLinear(clamp(value, 0, 1.5), 1.5, 0, layout.top, layout.bottom); const main = label("main", `±${tolerance} %`).trim();
    return [
      { type: "line", x1: layout.left, y1: mapY(lower), x2: layout.right, y2: mapY(lower), dashed: true },
      { type: "line", x1: layout.left, y1: mapY(upper), x2: layout.right, y2: mapY(upper), dashed: true },
      { type: "line", x1: layout.left, y1: mapY(target), x2: layout.right, y2: mapY(target), dashArray: [2, 4], strokeWidth: .8 },
      ...(main ? [{ type: "text", x: layout.right - 4, y: mapY(upper) - 5, value: main, anchor: "end", fontSize: 9 } as ScientificPrimitive] : []),
    ];
  }
  if (object.kind === "performance-marker") {
    const x2 = object.x2 ?? x; const y2 = object.y2 ?? y; const dx = x2 - x; const dy = y2 - y; const length = Math.hypot(dx, dy) || 1; const nx = -dy / length; const ny = dx / length; const performanceType = gpsChoice(label("performanceType", "t5%"));
    const fallback = performanceType.startsWith("temps") ? "t_r" : performanceType.startsWith("d1") ? "D_1%" : performanceType.startsWith("erreur") ? "ε_s" : performanceType.startsWith("retard") ? "e_v" : "t_5%"; const main = label("main", fallback).trim();
    return [
      { type: "line", x1: x, y1: y, x2, y2, dashed: true },
      { type: "line", x1: x - nx * 5, y1: y - ny * 5, x2: x + nx * 5, y2: y + ny * 5 },
      { type: "line", x1: x2 - nx * 5, y1: y2 - ny * 5, x2: x2 + nx * 5, y2: y2 + ny * 5 },
      ...(main ? [{ type: "text", x: (x + x2) / 2 - nx * 10, y: (y + y2) / 2 - ny * 10 + 3, value: main, anchor: "middle", fontSize: 9 } as ScientificPrimitive] : []),
    ];
  }
  if (object.kind === "pole-zero-map") {
    const title = label("main", "Pôles et zéros").trim(); const [realMin, realMax] = safeRange(finiteNumber(label("realMin", "-5"), -5), finiteNumber(label("realMax", "1"), 1), -5, 1); const [imagMin, imagMax] = safeRange(finiteNumber(label("imagMin", "-4"), -4), finiteNumber(label("imagMax", "4"), 4), -4, 4);
    const left = x + Math.min(42, width * .18); const right = x + width - Math.min(20, width * .08); const top = y + Math.min(34, height * .16); const bottom = y + height - Math.min(30, height * .15); const axisX = mapLinear(clamp(0, realMin, realMax), realMin, realMax, left, right); const axisY = mapLinear(clamp(0, imagMin, imagMax), imagMax, imagMin, top, bottom); const toPoint = (entry: { real: number; imaginary: number }) => ({ x: mapLinear(clamp(entry.real, realMin, realMax), realMin, realMax, left, right), y: mapLinear(clamp(entry.imaginary, imagMin, imagMax), imagMax, imagMin, top, bottom) });
    const poles = label("poles", "-1+2i;-1-2i").split(/[;\n]+/).map(parseComplex).filter((entry): entry is { real: number; imaginary: number } => Boolean(entry)); const zeros = label("zeros", "").split(/[;\n]+/).map(parseComplex).filter((entry): entry is { real: number; imaginary: number } => Boolean(entry)); const scene: ScientificPrimitive[] = [
      { type: "rect", x: left, y: top, width: right - left, height: bottom - top },
      { type: "line", x1: left, y1: axisY, x2: right + 7, y2: axisY, arrowEnd: true },
      { type: "line", x1: axisX, y1: bottom, x2: axisX, y2: top - 7, arrowEnd: true },
      { type: "text", x: (left + right) / 2, y: y + 17, value: title, anchor: "middle", fontSize: 12, math: false },
      { type: "text", x: right, y: axisY + 17, value: "Re(p)", latex: "\\operatorname{Re}(p)", anchor: "end", fontSize: 9 },
      { type: "text", x: axisX + 7, y: top, value: "Im(p)", latex: "\\operatorname{Im}(p)", anchor: "start", fontSize: 9 },
    ];
    for (let index = 1; index < 4; index += 1) {
      const gridX = left + ((right - left) * index) / 4; const gridY = top + ((bottom - top) * index) / 4;
      scene.push({ type: "line", x1: gridX, y1: top, x2: gridX, y2: bottom, dashed: true, strokeWidth: .8 }, { type: "line", x1: left, y1: gridY, x2: right, y2: gridY, dashed: true, strokeWidth: .8 });
    }
    poles.forEach((pole) => { const marker = toPoint(pole); scene.push({ type: "line", x1: marker.x - 5, y1: marker.y - 5, x2: marker.x + 5, y2: marker.y + 5, strokeWidth: 2 }, { type: "line", x1: marker.x - 5, y1: marker.y + 5, x2: marker.x + 5, y2: marker.y - 5, strokeWidth: 2 }); });
    zeros.forEach((zero) => { const marker = toPoint(zero); scene.push({ type: "circle", cx: marker.x, cy: marker.y, r: 5, fill: "paper", strokeWidth: 2 }); });
    return scene;
  }
  if (object.kind === "thermo-diagram") {
    const layout = thermoLayoutFor(x, y, width, height); const diagramType = label("diagramType", "P-V").trim(); const normalizedType = gpsChoice(diagramType); const title = label("title", "Diagramme de Clapeyron").trim(); const xUnit = label("xUnit", "m^3").trim(); const yUnit = label("yUnit", "Pa").trim();
    const [xMin, xMax] = safeRange(finiteNumber(label("xMin", "0"), 0), finiteNumber(label("xMax", "10"), 10), 0, 10); const [yMin, yMax] = safeRange(finiteNumber(label("yMin", "0"), 0), finiteNumber(label("yMax", "10"), 10), 0, 10);
    const isSpecificVolume = diagramType === "P-v"; const xQuantity = normalizedType === "p-t" ? "T" : normalizedType === "t-s" ? "s" : normalizedType.startsWith("amagat") ? "P" : isSpecificVolume ? "v" : "V"; const yQuantity = normalizedType === "t-s" ? "T" : normalizedType.startsWith("amagat") ? "PV" : "P";
    const scene: ScientificPrimitive[] = [
      { type: "line", x1: layout.left, y1: layout.bottom, x2: layout.right + 7, y2: layout.bottom, arrowEnd: true },
      { type: "line", x1: layout.left, y1: layout.bottom, x2: layout.left, y2: layout.top - 7, arrowEnd: true },
      { type: "text", x: (layout.left + layout.right) / 2, y: y + 18, value: title, anchor: "middle", fontSize: 12, math: false },
      { type: "text", x: layout.right, y: layout.bottom + 22, value: xUnit ? `${xQuantity} (${xUnit})` : xQuantity, anchor: "end", fontSize: 10 },
      { type: "text", x: layout.left - 8, y: layout.top + 3, value: yUnit ? `${yQuantity} (${yUnit})` : yQuantity, anchor: "end", fontSize: 10 },
    ];
    for (let index = 0; index <= 5; index += 1) {
      const xValue = xMin + ((xMax - xMin) * index) / 5; const tickX = mapLinear(xValue, xMin, xMax, layout.left, layout.right);
      scene.push(
        { type: "line", x1: tickX, y1: layout.top, x2: tickX, y2: layout.bottom, dashed: index > 0, strokeWidth: index > 0 ? .8 : undefined },
        { type: "text", x: tickX, y: layout.bottom + 13, value: Number(xValue.toFixed(2)).toString(), anchor: "middle", fontSize: 8, technical: true },
      );
    }
    for (let index = 0; index <= 4; index += 1) {
      const yValue = yMin + ((yMax - yMin) * index) / 4; const tickY = mapLinear(yValue, yMax, yMin, layout.top, layout.bottom);
      scene.push(
        { type: "line", x1: layout.left, y1: tickY, x2: layout.right, y2: tickY, dashed: index > 0, strokeWidth: index > 0 ? .8 : undefined },
        { type: "text", x: layout.left - 7, y: tickY + 3, value: Number(yValue.toFixed(2)).toString(), anchor: "end", fontSize: 8, technical: true },
      );
    }
    return scene;
  }
  if (object.kind === "thermo-state") {
    const main = label("main", "1").trim(); const pressure = label("pressure", "P_1").trim(); const volume = label("volume", "V_1").trim(); const temperature = label("temperature", "T_1").trim(); const showCoordinates = gpsEnabled(label("showCoordinates", "oui")); const coordinates = [pressure, volume, temperature].filter(Boolean).join("; ");
    return [
      { type: "circle", cx, cy, r: Math.min(4.5, Math.min(width, height) * .12), fill: "ink" },
      ...(main ? [{ type: "text", x: cx + 9, y: cy - 7, value: main, anchor: "start", fontSize: 10 } as ScientificPrimitive] : []),
      ...(showCoordinates && coordinates ? [{ type: "text", x: cx + 9, y: cy + 13, value: `(${coordinates})`, anchor: "start", fontSize: 8 } as ScientificPrimitive] : []),
    ];
  }
  if (object.kind === "thermo-process") {
    const x2 = object.x2 ?? x; const y2 = object.y2 ?? y; const processType = gpsChoice(label("processType", "isotherme")); const reverse = gpsChoice(label("direction", "directe")).startsWith("indirect") || gpsChoice(label("direction", "directe")).startsWith("inverse"); const start = reverse ? { x: x2, y: y2 } : { x, y }; const end = reverse ? { x, y } : { x: x2, y: y2 }; const dx = end.x - start.x; const dy = end.y - start.y; const length = Math.hypot(dx, dy) || 1; const nx = -dy / length; const ny = dx / length; const main = label("main", "T = cste").trim(); const heat = label("heat", "").trim(); const work = label("work", "").trim(); const exponent = label("exponent", "1.4").trim();
    const caption = processType.startsWith("poly") && main === "T = cste" ? `PV^${exponent} = cste` : main; const scene: ScientificPrimitive[] = [];
    if (processType.startsWith("isob") || processType.startsWith("isoc")) scene.push({ type: "line", x1: start.x, y1: start.y, x2: end.x, y2: end.y, arrowEnd: true, strokeWidth: 2 });
    else {
      const curvature = Math.min(58, Math.max(18, length * .18)) * (processType.startsWith("adia") ? 1.3 : processType.startsWith("poly") ? 1.12 : 1); const control1 = { x: start.x + dx * .3 + nx * curvature, y: start.y + dy * .3 + ny * curvature }; const control2 = { x: start.x + dx * .7 + nx * curvature, y: start.y + dy * .7 + ny * curvature };
      scene.push({ type: "bezier", start, control1, control2, end, arrowEnd: true, strokeWidth: 2 });
    }
    const labelX = (start.x + end.x) / 2 - nx * 13; const labelY = (start.y + end.y) / 2 - ny * 13 + 4;
    if (caption) scene.push({ type: "text", x: labelX, y: labelY, value: caption, anchor: "middle", fontSize: 9 });
    if (heat) scene.push({ type: "text", x: labelX + nx * 17, y: labelY + ny * 17, value: heat, anchor: "middle", fontSize: 8 });
    if (work) scene.push({ type: "text", x: labelX + nx * 29, y: labelY + ny * 29, value: work, anchor: "middle", fontSize: 8 });
    return scene;
  }
  if (object.kind === "thermo-isotherm-family") {
    const layout = thermoLayoutFor(x, y, width, height); const count = boundedInt(label("count", "4"), 4, 1, 7); const main = label("main", "T_1 < T_2 < T_3 < T_4").trim(); const rawLabels = main.split(/\s*(?:<|;|,)\s*/).filter(Boolean); const plotWidth = layout.right - layout.left; const plotHeight = layout.bottom - layout.top; const scene: ScientificPrimitive[] = main ? [{ type: "text", x: (layout.left + layout.right) / 2, y: y + 17, value: main, anchor: "middle", fontSize: 9 }] : [];
    for (let curveIndex = 0; curveIndex < count; curveIndex += 1) {
      const level = (curveIndex + 1) / (count + 1); const points = Array.from({ length: 101 }, (_, index) => { const u = .04 + .96 * index / 100; const elevation = clamp(.1 + (.42 * level) / (.35 + .9 * u), .04, .94); return { x: layout.left + plotWidth * u, y: layout.bottom - plotHeight * elevation }; }); const curveLabel = rawLabels[curveIndex] ?? `T_${curveIndex + 1}`;
      scene.push(
        { type: "polyline", points, strokeWidth: 1.6 },
        { type: "text", x: points.at(-1)!.x - 3, y: points.at(-1)!.y - 5, value: curveLabel, anchor: "end", fontSize: 8 },
      );
    }
    return scene;
  }
  if (object.kind === "phase-diagram-pt") {
    const layout = thermoLayoutFor(x, y, width, height); const plotWidth = layout.right - layout.left; const plotHeight = layout.bottom - layout.top; const title = label("title", "Diagramme de phases (P,T)").trim(); const substance = label("substance", "corps pur").trim(); const negativeFusionSlope = gpsChoice(label("fusionSlope", "positive")).startsWith("neg");
    const triple = { x: layout.left + plotWidth * .38, y: layout.bottom - plotHeight * .25 }; const critical = { x: layout.left + plotWidth * .78, y: layout.top + plotHeight * .29 }; const fusionEnd = { x: layout.left + plotWidth * (negativeFusionSlope ? .22 : .58), y: layout.top + 4 };
    const scene: ScientificPrimitive[] = [
      { type: "line", x1: layout.left, y1: layout.bottom, x2: layout.right + 7, y2: layout.bottom, arrowEnd: true },
      { type: "line", x1: layout.left, y1: layout.bottom, x2: layout.left, y2: layout.top - 7, arrowEnd: true },
      { type: "bezier", start: { x: layout.left + 5, y: layout.bottom - 7 }, control1: { x: layout.left + plotWidth * .15, y: layout.bottom - plotHeight * .03 }, control2: { x: layout.left + plotWidth * .28, y: layout.bottom - plotHeight * .13 }, end: triple, strokeWidth: 1.8 },
      { type: "bezier", start: triple, control1: { x: layout.left + plotWidth * .52, y: layout.bottom - plotHeight * .34 }, control2: { x: layout.left + plotWidth * .67, y: layout.top + plotHeight * .42 }, end: critical, strokeWidth: 1.8 },
      { type: "bezier", start: triple, control1: { x: triple.x + (fusionEnd.x - triple.x) * .35, y: triple.y + (fusionEnd.y - triple.y) * .3 }, control2: { x: triple.x + (fusionEnd.x - triple.x) * .72, y: triple.y + (fusionEnd.y - triple.y) * .72 }, end: fusionEnd, strokeWidth: 1.8 },
      { type: "circle", cx: triple.x, cy: triple.y, r: 3.5, fill: "ink" },
      { type: "circle", cx: critical.x, cy: critical.y, r: 3.5, fill: "ink" },
      { type: "text", x: (layout.left + layout.right) / 2, y: y + 17, value: title, anchor: "middle", fontSize: 12, math: false },
      ...(substance ? [{ type: "text", x: layout.right, y: y + 17, value: substance, anchor: "end", fontSize: 8, math: false } as ScientificPrimitive] : []),
      { type: "text", x: layout.right, y: layout.bottom + 21, value: "T", anchor: "end", fontSize: 10 },
      { type: "text", x: layout.left - 7, y: layout.top + 3, value: "P", anchor: "end", fontSize: 10 },
      { type: "text", x: layout.left + plotWidth * .18, y: layout.top + plotHeight * .35, value: "solide", anchor: "middle", fontSize: 10, math: false },
      { type: "text", x: layout.left + plotWidth * .58, y: layout.top + plotHeight * .25, value: "liquide", anchor: "middle", fontSize: 10, math: false },
      { type: "text", x: layout.left + plotWidth * .68, y: layout.bottom - plotHeight * .15, value: "vapeur", anchor: "middle", fontSize: 10, math: false },
      { type: "text", x: triple.x + 7, y: triple.y + 13, value: "T", anchor: "start", fontSize: 9 },
      { type: "text", x: triple.x + 7, y: triple.y + 25, value: "point triple", anchor: "start", fontSize: 8, math: false },
      { type: "text", x: critical.x + 7, y: critical.y - 7, value: "C", anchor: "start", fontSize: 9 },
      { type: "text", x: critical.x + 7, y: critical.y + 7, value: "point critique", anchor: "start", fontSize: 8, math: false },
    ];
    return scene;
  }
  if (object.kind === "liquid-vapour-dome") {
    const layout = thermoLayoutFor(x, y, width, height); const plotWidth = layout.right - layout.left; const plotHeight = layout.bottom - layout.top; const title = label("title", "Équilibre liquide-vapeur").trim(); const criticalLabel = label("criticalPoint", "C").trim(); const critical = { x: layout.left + plotWidth * .52, y: layout.top + plotHeight * .18 }; const saturatedLiquid = { x: layout.left + plotWidth * .18, y: layout.bottom - 7 }; const saturatedVapour = { x: layout.left + plotWidth * .86, y: layout.bottom - 7 };
    return [
      { type: "line", x1: layout.left, y1: layout.bottom, x2: layout.right + 7, y2: layout.bottom, arrowEnd: true },
      { type: "line", x1: layout.left, y1: layout.bottom, x2: layout.left, y2: layout.top - 7, arrowEnd: true },
      { type: "bezier", start: saturatedLiquid, control1: { x: layout.left + plotWidth * .25, y: layout.bottom - plotHeight * .35 }, control2: { x: layout.left + plotWidth * .38, y: layout.top + plotHeight * .23 }, end: critical, strokeWidth: 2 },
      { type: "bezier", start: critical, control1: { x: layout.left + plotWidth * .66, y: layout.top + plotHeight * .23 }, control2: { x: layout.left + plotWidth * .79, y: layout.bottom - plotHeight * .35 }, end: saturatedVapour, strokeWidth: 2 },
      { type: "circle", cx: critical.x, cy: critical.y, r: 3.8, fill: "ink" },
      { type: "text", x: (layout.left + layout.right) / 2, y: y + 17, value: title, anchor: "middle", fontSize: 12, math: false },
      { type: "text", x: layout.right, y: layout.bottom + 21, value: "v", anchor: "end", fontSize: 10 },
      { type: "text", x: layout.left - 7, y: layout.top + 3, value: "P", anchor: "end", fontSize: 10 },
      { type: "text", x: critical.x + 7, y: critical.y - 6, value: criticalLabel, anchor: "start", fontSize: 10 },
      { type: "text", x: layout.left + plotWidth * .12, y: layout.top + plotHeight * .46, value: "liquide", anchor: "middle", fontSize: 9, math: false },
      { type: "text", x: layout.left + plotWidth * .52, y: layout.bottom - plotHeight * .24, value: "liquide + vapeur", anchor: "middle", fontSize: 9, math: false },
      { type: "text", x: layout.left + plotWidth * .91, y: layout.top + plotHeight * .5, value: "vapeur", anchor: "middle", fontSize: 9, math: false },
      { type: "text", x: saturatedLiquid.x + 8, y: saturatedLiquid.y - 8, value: "liquide saturé", anchor: "start", fontSize: 8, math: false },
      { type: "text", x: saturatedVapour.x - 8, y: saturatedVapour.y - 8, value: "vapeur saturée", anchor: "end", fontSize: 8, math: false },
    ];
  }
  if (object.kind === "vapour-quality-line") {
    const layout = thermoLayoutFor(x, y, width, height); const plotWidth = layout.right - layout.left; const plotHeight = layout.bottom - layout.top; const quality = clamp(finiteNumber(label("quality", "0.5"), .5), 0, 1); const main = label("main", "x = 0,5").trim(); const centerX = layout.left + plotWidth * .52;
    const points = Array.from({ length: 81 }, (_, index) => { const ratio = index / 80; const halfWidth = plotWidth * .34 * (1 - ratio) ** .66; return { x: centerX - halfWidth + 2 * halfWidth * quality, y: layout.bottom - 7 - ratio * plotHeight * .75 }; }); const labelPoint = points[Math.min(points.length - 1, 24)];
    return [
      { type: "polyline", points, dashed: true, strokeWidth: 1.7 },
      ...(main ? [{ type: "text", x: labelPoint.x + 7, y: labelPoint.y - 5, value: main, anchor: "start", fontSize: 9 } as ScientificPrimitive] : []),
    ];
  }
  if (object.kind === "thermo-cycle") {
    const layout = thermoLayoutFor(x, y, width, height); const plotWidth = layout.right - layout.left; const plotHeight = layout.bottom - layout.top; const cycleType = gpsChoice(label("cycleType", "Carnot")); const receiver = gpsChoice(label("direction", "moteur")).startsWith("recep"); const main = label("main", "Cycle de Carnot").trim(); const at = (rx: number, ry: number): Point => ({ x: layout.left + plotWidth * rx, y: layout.top + plotHeight * ry });
    let states: Point[];
    if (cycleType.startsWith("stirl")) states = [at(.28, .75), at(.28, .27), at(.73, .27), at(.73, .75)];
    else if (cycleType.startsWith("joule") || cycleType.startsWith("bray")) states = [at(.24, .72), at(.35, .31), at(.76, .31), at(.86, .72)];
    else if (cycleType.startsWith("rank")) states = [at(.24, .76), at(.30, .36), at(.65, .23), at(.82, .69)];
    else states = [at(.27, .75), at(.37, .29), at(.70, .21), at(.80, .67)];
    const order = receiver ? [0, 3, 2, 1] : [0, 1, 2, 3]; const edgeCurvatures = cycleType.startsWith("stirl") ? [0, 10, 0, -10] : cycleType.startsWith("joule") || cycleType.startsWith("bray") ? [8, 0, -8, 0] : cycleType.startsWith("rank") ? [5, 13, -9, -6] : [8, 13, -8, -13]; const scene: ScientificPrimitive[] = [];
    order.forEach((stateIndex, edgeIndex) => {
      const nextIndex = order[(edgeIndex + 1) % order.length]; const start = states[stateIndex]; const end = states[nextIndex]; const dx = end.x - start.x; const dy = end.y - start.y; const length = Math.hypot(dx, dy) || 1; const nx = -dy / length; const ny = dx / length; const signedCurvature = edgeCurvatures[stateIndex] * (receiver ? -1 : 1);
      if (cycleType.startsWith("stirl") && (stateIndex === 0 || stateIndex === 2)) scene.push({ type: "line", x1: start.x, y1: start.y, x2: end.x, y2: end.y, arrowEnd: true, strokeWidth: 2 });
      else scene.push({ type: "bezier", start, control1: { x: start.x + dx * .34 + nx * signedCurvature, y: start.y + dy * .34 + ny * signedCurvature }, control2: { x: start.x + dx * .68 + nx * signedCurvature, y: start.y + dy * .68 + ny * signedCurvature }, end, arrowEnd: true, strokeWidth: 2 });
    });
    states.forEach((state, index) => scene.push(
      { type: "circle", cx: state.x, cy: state.y, r: 3.2, fill: "paper" },
      { type: "text", x: state.x + (index < 2 ? -8 : 8), y: state.y + (index === 0 || index === 3 ? 14 : -7), value: String(index + 1), anchor: index < 2 ? "end" : "start", fontSize: 9 },
    ));
    if (main) scene.push({ type: "text", x: (layout.left + layout.right) / 2, y: y + 17, value: main, anchor: "middle", fontSize: 12, math: false });
    return scene;
  }
  if (object.kind === "pressure-work-area") {
    const layout = thermoLayoutFor(x, y, width, height); const plotWidth = layout.right - layout.left; const plotHeight = layout.bottom - layout.top; const main = label("main", "W = -∫P dV").trim(); const received = gpsChoice(label("areaType", "travail reçu")).startsWith("travail-recu");
    const processPoints = Array.from({ length: 81 }, (_, index) => { const ratio = index / 80; const u = .18 + .66 * ratio; const elevation = .16 + .48 / (.42 + .9 * u); return { x: layout.left + plotWidth * u, y: layout.bottom - plotHeight * clamp(elevation, .08, .82) }; }); const first = processPoints[0]; const last = processPoints.at(-1)!; const region = [{ x: first.x, y: layout.bottom }, ...processPoints, { x: last.x, y: layout.bottom }]; const arrowStart = received ? processPoints[52] : processPoints[28]; const arrowEnd = received ? processPoints[28] : processPoints[52];
    return [
      { type: "polyline", points: region, closed: true, fill: "light", strokeWidth: .8 },
      { type: "polyline", points: processPoints, strokeWidth: 1.8 },
      { type: "line", x1: arrowStart.x, y1: arrowStart.y, x2: arrowEnd.x, y2: arrowEnd.y, arrowEnd: true, strokeWidth: 1.8 },
      ...(main ? [{ type: "text", x: (first.x + last.x) / 2, y: layout.bottom - plotHeight * .18, value: main, anchor: "middle", fontSize: 10 } as ScientificPrimitive] : []),
    ];
  }
  if (object.kind === "uniform-field-region") {
    const fieldType = label("fieldType", "magnétique"); const direction = label("direction", "sortant"); const main = label("main", gpsChoice(fieldType).startsWith("elec") ? "E" : "B").trim(); const density = boundedInt(label("density", "5"), 5, 2, 8); const columns = density; const rows = Math.max(2, Math.round(density * height / Math.max(width, 1))); const scene: ScientificPrimitive[] = [{ type: "rect", x, y, width, height, dashed: undefined } as ScientificPrimitive];
    for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
      const glyphX = x + width * (column + .5) / columns; const glyphY = y + height * (row + .5) / rows; scene.push(...fieldGlyphScene(fieldType, direction, glyphX, glyphY, Math.min(14, width / (columns * 2.5))));
    }
    if (main) scene.push({ type: "text", x: x + width - 7, y: y + 16, value: main, anchor: "end", fontSize: 12, vector: true });
    return scene;
  }
  if (object.kind === "field-map") {
    const fieldType = label("fieldType", "magnétique"); const sourceType = gpsChoice(label("sourceType", "uniforme")); const representation = gpsChoice(label("representation", "vecteurs")); const main = label("main", gpsChoice(fieldType).startsWith("elec") ? "E" : "B").trim(); const density = boundedInt(label("density", "5"), 5, 3, 8); const scene: ScientificPrimitive[] = [];
    if (sourceType.startsWith("fil")) {
      const radius = Math.min(width, height) * .38; scene.push(...fieldGlyphScene("magnétique", "sortant", cx, cy, 17));
      for (let index = 1; index <= Math.max(3, density - 1); index += 1) {
        const ringRadius = radius * index / Math.max(3, density - 1); scene.push({ type: "circle", cx, cy, r: ringRadius, strokeWidth: representation.startsWith("vect") ? 1.1 : 1.5 });
        const markerAngle = -38 + index * 29; scene.push({ type: "arc", cx, cy, r: ringRadius, start: markerAngle - 10, end: markerAngle + 7, arrowEnd: true, strokeWidth: 1.2 });
      }
      scene.push({ type: "text", x: cx + 12, y: cy - 10, value: "i", anchor: "start", fontSize: 10 });
    } else if (sourceType.startsWith("sol")) {
      const coilLeft = x + width * .23; const coilRight = x + width * .77; const coilTop = y + height * .34; const coilBottom = y + height * .66; scene.push({ type: "rect", x: coilLeft, y: coilTop, width: coilRight - coilLeft, height: coilBottom - coilTop, fill: "paper" });
      for (let index = 0; index < 6; index += 1) scene.push({ type: "ellipse", cx: coilLeft + (coilRight - coilLeft) * index / 5, cy, rx: width * .055, ry: height * .22 });
      for (let index = 0; index < Math.max(3, density - 1); index += 1) { const lineY = coilTop + (coilBottom - coilTop) * (index + .5) / Math.max(3, density - 1); scene.push({ type: "line", x1: coilLeft + 4, y1: lineY, x2: coilRight - 4, y2: lineY, arrowEnd: true }); }
      scene.push(
        { type: "bezier", start: { x: coilRight, y: coilTop }, control1: { x: x + width * .92, y: y + height * .08 }, control2: { x: x + width * .08, y: y + height * .08 }, end: { x: coilLeft, y: coilTop }, arrowEnd: true },
        { type: "bezier", start: { x: coilLeft, y: coilBottom }, control1: { x: x + width * .08, y: y + height * .92 }, control2: { x: x + width * .92, y: y + height * .92 }, end: { x: coilRight, y: coilBottom }, arrowEnd: true },
      );
    } else if (sourceType.startsWith("spir")) {
      const loopRx = width * .16; const loopRy = height * .31; scene.push(
        { type: "ellipse", cx, cy, rx: loopRx, ry: loopRy, strokeWidth: 2 },
        { type: "arc", cx, cy, r: loopRy * .72, start: 25, end: 155, arrowEnd: true, strokeWidth: 1.6 },
        { type: "text", x: cx + loopRx + 9, y: cy + 4, value: "i", anchor: "start", fontSize: 9 },
        { type: "line", x1: cx - width * .38, y1: cy, x2: cx + width * .38, y2: cy, arrowEnd: true, dashed: representation.startsWith("vect") },
      );
      for (let index = 1; index <= Math.max(2, density - 2); index += 1) {
        const spread = index / Math.max(2, density - 2); scene.push(
          { type: "bezier", start: { x: cx + loopRx * .25, y: cy - loopRy }, control1: { x: x + width * (.78 + .16 * spread), y: y + height * (.08 - .08 * spread) }, control2: { x: x + width * (.78 + .16 * spread), y: y + height * (.92 + .08 * spread) }, end: { x: cx + loopRx * .25, y: cy + loopRy }, arrowEnd: index === 1 },
          { type: "bezier", start: { x: cx - loopRx * .25, y: cy + loopRy }, control1: { x: x + width * (.22 - .16 * spread), y: y + height * (.92 + .08 * spread) }, control2: { x: x + width * (.22 - .16 * spread), y: y + height * (.08 - .08 * spread) }, end: { x: cx - loopRx * .25, y: cy - loopRy }, arrowEnd: index === 1 },
        );
      }
    } else if (sourceType.startsWith("dip")) {
      const magnetLeft = x + width * .39; const magnetTop = y + height * .39; const magnetWidth = width * .22; const magnetHeight = height * .22; scene.push(
        { type: "rect", x: magnetLeft, y: magnetTop, width: magnetWidth, height: magnetHeight, fill: "paper" },
        { type: "line", x1: cx, y1: magnetTop, x2: cx, y2: magnetTop + magnetHeight },
        { type: "text", x: magnetLeft + magnetWidth * .25, y: cy + 4, value: "S", anchor: "middle", fontSize: 10 },
        { type: "text", x: magnetLeft + magnetWidth * .75, y: cy + 4, value: "N", anchor: "middle", fontSize: 10 },
      );
      for (let index = 0; index < Math.max(3, density - 1); index += 1) {
        const spread = (index + 1) / Math.max(3, density - 1); scene.push(
          { type: "bezier", start: { x: magnetLeft + magnetWidth, y: cy - magnetHeight * .18 }, control1: { x: x + width * (.72 + .2 * spread), y: y + height * (.25 - .18 * spread) }, control2: { x: x + width * (.28 - .2 * spread), y: y + height * (.25 - .18 * spread) }, end: { x: magnetLeft, y: cy - magnetHeight * .18 }, arrowEnd: index === 0 },
          { type: "bezier", start: { x: magnetLeft + magnetWidth, y: cy + magnetHeight * .18 }, control1: { x: x + width * (.72 + .2 * spread), y: y + height * (.75 + .18 * spread) }, control2: { x: x + width * (.28 - .2 * spread), y: y + height * (.75 + .18 * spread) }, end: { x: magnetLeft, y: cy + magnetHeight * .18 }, arrowEnd: index === 0 },
        );
      }
    } else {
      const columns = density; const rows = Math.max(3, Math.round(density * height / Math.max(width, 1)));
      for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) scene.push(...fieldGlyphScene(fieldType, label("direction", "droite"), x + width * (column + .5) / columns, y + height * (row + .5) / rows, 12));
    }
    if (main) scene.push({ type: "text", x: x + width - 7, y: y + 16, value: main, anchor: "end", fontSize: 12, vector: true });
    return scene;
  }
  if (object.kind === "oriented-current-loop") {
    const loopShape = gpsChoice(label("loopShape", "circulaire")); const current = label("current", "i").trim(); const normal = label("normal", "n").trim(); const trigonometric = gpsChoice(label("orientation", "trigonométrique")).startsWith("trig"); const showMoment = gpsEnabled(label("showMoment", "oui")); const rx = width * .33; const ry = height * .25; const scene: ScientificPrimitive[] = [];
    if (loopShape.startsWith("rect")) scene.push({ type: "polyline", points: [{ x: cx - rx, y: cy - ry }, { x: cx + rx, y: cy - ry }, { x: cx + rx, y: cy + ry }, { x: cx - rx, y: cy + ry }], closed: true, strokeWidth: 2 });
    else scene.push({ type: "ellipse", cx, cy, rx, ry, strokeWidth: 2 });
    scene.push(
      { type: "arc", cx, cy, r: Math.min(rx, ry) * 1.1, start: trigonometric ? 25 : 155, end: trigonometric ? 155 : 25, arrowEnd: true, strokeWidth: 1.8 },
      { type: "line", x1: cx, y1: cy, x2: cx, y2: y + 10, arrowEnd: true, strokeWidth: 1.6 },
      { type: "text", x: cx + 8, y: y + 17, value: normal, anchor: "start", fontSize: 10, vector: true },
      ...(current ? [{ type: "text", x: cx + rx + 8, y: cy + 4, value: current, anchor: "start", fontSize: 10 } as ScientificPrimitive] : []),
    );
    if (showMoment) scene.push(
      { type: "line", x1: cx - 11, y1: cy, x2: cx - 11, y2: y + 21, arrowEnd: true, strokeWidth: 1.8 },
      { type: "text", x: cx - 17, y: y + 25, value: "m", anchor: "end", fontSize: 10, vector: true },
    );
    return scene;
  }
  if (object.kind === "magnetic-dipole") {
    const moment = label("main", "m").trim(); const field = label("field", "B").trim(); const angle = label("angle", "θ").trim(); const torque = label("torque", "Γ").trim(); const momentLength = Math.min(width, height) * .34; const momentAngle = -52; const momentEnd = { x: cx + Math.cos(momentAngle * Math.PI / 180) * momentLength, y: cy + Math.sin(momentAngle * Math.PI / 180) * momentLength };
    return [
      { type: "line", x1: x + 10, y1: y + 20, x2: x + width - 10, y2: y + 20, arrowEnd: true, strokeWidth: 1.8 },
      { type: "text", x: x + width - 8, y: y + 13, value: field, anchor: "end", fontSize: 10, vector: true },
      { type: "line", x1: cx, y1: cy, x2: cx + momentLength, y2: cy, dashed: true },
      { type: "line", x1: cx, y1: cy, x2: momentEnd.x, y2: momentEnd.y, arrowEnd: true, strokeWidth: 2 },
      { type: "text", x: momentEnd.x + 7, y: momentEnd.y - 3, value: moment, anchor: "start", fontSize: 10, vector: true },
      { type: "arc", cx, cy, r: momentLength * .48, start: momentAngle, end: 0, arrowEnd: true },
      { type: "text", x: cx + momentLength * .36, y: cy - momentLength * .23, value: angle, anchor: "middle", fontSize: 9 },
      { type: "arc", cx, cy, r: Math.min(width, height) * .28, start: 75, end: 250, arrowEnd: true, strokeWidth: 1.6 },
      { type: "text", x: cx - Math.min(width, height) * .31, y: cy - 5, value: torque, anchor: "end", fontSize: 10, vector: true },
      { type: "circle", cx, cy, r: 3, fill: "ink" },
    ];
  }
  if (object.kind === "charged-particle-trajectory") {
    const x2 = object.x2 ?? x; const y2 = object.y2 ?? y; const dx = x2 - x; const dy = y2 - y; const length = Math.hypot(dx, dy) || 1; const tx = dx / length; const ty = dy / length; const nx = -ty; const ny = tx; const charge = label("charge", "q > 0").trim(); const velocity = label("velocity", "v_0").trim(); const field = label("field", "B").trim(); const trajectoryType = gpsChoice(label("trajectoryType", "circulaire")); const main = label("main", "q").trim(); const negativeCharge = /(?:^|[^>])-|<\s*0/.test(charge); const curvatureSign = negativeCharge ? -1 : 1; const bend = Math.min(80, Math.max(25, length * .27)) * curvatureSign; const scene: ScientificPrimitive[] = [];
    if (trajectoryType.startsWith("heli")) {
      const turns = Math.max(3, Math.round(length / 55)); const amplitude = Math.min(22, Math.max(10, length * .08)); const points = Array.from({ length: turns * 28 + 1 }, (_, index) => { const ratio = index / (turns * 28); const offset = Math.sin(ratio * turns * Math.PI * 2) * amplitude * curvatureSign; return { x: x + dx * ratio + nx * offset, y: y + dy * ratio + ny * offset }; }); scene.push({ type: "polyline", points, strokeWidth: 1.8 }); const arrowStart = points.at(-5)!; const arrowEnd = points.at(-1)!; scene.push({ type: "line", x1: arrowStart.x, y1: arrowStart.y, x2: arrowEnd.x, y2: arrowEnd.y, arrowEnd: true, strokeWidth: 1.8 });
    } else if (trajectoryType.startsWith("rect")) scene.push({ type: "line", x1: x, y1: y, x2, y2, arrowEnd: true, strokeWidth: 2 });
    else if (trajectoryType.startsWith("para")) scene.push({ type: "bezier", start: { x, y }, control1: { x: x + dx * .3 + nx * bend * 1.15, y: y + dy * .3 + ny * bend * 1.15 }, control2: { x: x + dx * .72 + nx * bend * .7, y: y + dy * .72 + ny * bend * .7 }, end: { x: x2, y: y2 }, arrowEnd: true, strokeWidth: 2 });
    else scene.push({ type: "bezier", start: { x, y }, control1: { x: x + dx * .31 + nx * bend, y: y + dy * .31 + ny * bend }, control2: { x: x + dx * .69 + nx * bend, y: y + dy * .69 + ny * bend }, end: { x: x2, y: y2 }, arrowEnd: true, strokeWidth: 2 });
    scene.push(
      { type: "circle", cx: x, cy: y, r: 5, fill: "paper", strokeWidth: 1.5 },
      { type: "text", x: x - nx * 11, y: y - ny * 11 + 3, value: charge || main, anchor: "middle", fontSize: 9 },
      { type: "line", x1: x + tx * 8, y1: y + ty * 8, x2: x + tx * 39, y2: y + ty * 39, arrowEnd: true, strokeWidth: 1.5 },
      { type: "text", x: x + tx * 42 - nx * 7, y: y + ty * 42 - ny * 7 + 3, value: velocity, anchor: "middle", fontSize: 9, vector: true },
    );
    const fieldCenter = { x: (x + x2) / 2 - nx * 31 * curvatureSign, y: (y + y2) / 2 - ny * 31 * curvatureSign }; scene.push(...fieldGlyphScene("magnétique", "entrant", fieldCenter.x, fieldCenter.y, 13));
    if (field) scene.push({ type: "text", x: fieldCenter.x + 12, y: fieldCenter.y - 8, value: field, anchor: "start", fontSize: 9, vector: true });
    if (main && main !== charge) scene.push({ type: "text", x: (x + x2) / 2 + nx * (Math.abs(bend) + 12) * curvatureSign, y: (y + y2) / 2 + ny * (Math.abs(bend) + 12) * curvatureSign + 3, value: main, anchor: "middle", fontSize: 9 });
    return scene;
  }
  if (object.kind === "rotating-rectangular-loop") {
    const current = label("current", "i").trim(); const field = label("field", "B").trim(); const flux = label("flux", "Φ").trim(); const angle = label("angle", "θ").trim(); const angularSpeed = label("angularSpeed", "ω").trim(); const loopTop = y + height * .28; const loopBottom = y + height * .72; const loopLeft = x + width * .24; const loopRight = x + width * .76; const skew = width * .1; const scene: ScientificPrimitive[] = [];
    for (let row = 0; row < 3; row += 1) for (let column = 0; column < 4; column += 1) scene.push(...fieldGlyphScene("magnétique", "entrant", x + width * (.12 + column * .25), y + height * (.16 + row * .28), 10));
    scene.push(
      { type: "polyline", points: [{ x: loopLeft + skew, y: loopTop }, { x: loopRight + skew, y: loopTop }, { x: loopRight - skew, y: loopBottom }, { x: loopLeft - skew, y: loopBottom }], closed: true, strokeWidth: 2.5 },
      { type: "line", x1: cx, y1: y + height * .1, x2: cx, y2: y + height * .88, dashed: true },
      { type: "line", x1: cx, y1: cy, x2: cx + width * .19, y2: cy - height * .22, arrowEnd: true, strokeWidth: 1.7 },
      { type: "arc", cx, cy, r: Math.min(width, height) * .19, start: -50, end: -4, arrowEnd: true },
      { type: "text", x: cx + width * .12, y: cy - height * .08, value: angle, anchor: "middle", fontSize: 9 },
      { type: "arc", cx, cy: y + height * .14, r: width * .13, start: 200, end: 340, arrowEnd: true, strokeWidth: 1.6 },
      { type: "text", x: cx, y: y + height * .08, value: angularSpeed, anchor: "middle", fontSize: 10, vector: true },
      { type: "line", x1: loopLeft + skew, y1: loopTop, x2: loopRight + skew, y2: loopTop, arrowEnd: true, strokeWidth: 1.8 },
      ...(current ? [{ type: "text", x: cx + skew, y: loopTop - 8, value: current, anchor: "middle", fontSize: 9 } as ScientificPrimitive] : []),
      { type: "text", x: x + width - 8, y: y + 14, value: field, anchor: "end", fontSize: 10, vector: true },
      { type: "text", x: cx + width * .2, y: cy + 5, value: flux, anchor: "start", fontSize: 10 },
      { type: "line", x1: x, y1: y + height * .82, x2: x + width * .34, y2: y + height * .82 },
      { type: "line", x1: x + width * .66, y1: y + height * .82, x2: x + width, y2: y + height * .82 },
      { type: "circle", cx: x, cy: y + height * .82, r: 3.2, fill: "paper" },
      { type: "circle", cx: x + width, cy: y + height * .82, r: 3.2, fill: "paper" },
    );
    return scene;
  }
  if (object.kind === "faraday-magnet-coil") {
    const motion = gpsChoice(label("motion", "approche")); const approaching = !motion.startsWith("eloign") && !motion.startsWith("recul"); const emf = label("emf", "e").trim(); const current = label("current", "i").trim(); const flux = label("flux", "Φ").trim(); const law = label("law", "Lenz").trim(); const magnetLeft = x + width * .06; const magnetRight = x + width * .34; const magnetTop = y + height * .36; const magnetBottom = y + height * .64; const coilCenterX = x + width * .67; const coilTop = y + height * .23; const coilBottom = y + height * .77; const scene: ScientificPrimitive[] = [
      { type: "rect", x: magnetLeft, y: magnetTop, width: magnetRight - magnetLeft, height: magnetBottom - magnetTop, fill: "paper" },
      { type: "line", x1: (magnetLeft + magnetRight) / 2, y1: magnetTop, x2: (magnetLeft + magnetRight) / 2, y2: magnetBottom },
      { type: "text", x: magnetLeft + (magnetRight - magnetLeft) * .25, y: cy + 5, value: "S", anchor: "middle", fontSize: 12 },
      { type: "text", x: magnetLeft + (magnetRight - magnetLeft) * .75, y: cy + 5, value: "N", anchor: "middle", fontSize: 12 },
    ];
    for (let index = 0; index < 6; index += 1) scene.push({ type: "ellipse", cx: coilCenterX + (index - 2.5) * width * .032, cy, rx: width * .052, ry: height * .3, strokeWidth: 1.6 });
    const motionStart = approaching ? magnetRight + 9 : magnetRight + width * .18; const motionEnd = approaching ? magnetRight + width * .18 : magnetRight + 9; scene.push(
      { type: "line", x1: motionStart, y1: y + height * .2, x2: motionEnd, y2: y + height * .2, arrowEnd: true, strokeWidth: 1.8 },
      { type: "text", x: (motionStart + motionEnd) / 2, y: y + height * .14, value: approaching ? "approche" : "éloignement", anchor: "middle", fontSize: 8, math: false },
      { type: "line", x1: magnetRight + 5, y1: cy - 13, x2: coilCenterX - width * .08, y2: cy - 13, arrowEnd: true, dashed: true },
      { type: "line", x1: magnetRight + 5, y1: cy + 13, x2: coilCenterX - width * .08, y2: cy + 13, arrowEnd: true, dashed: true },
      { type: "text", x: (magnetRight + coilCenterX) / 2, y: cy - 20, value: flux, anchor: "middle", fontSize: 10 },
      { type: "arc", cx: coilCenterX, cy, r: height * .22, start: approaching ? 35 : 145, end: approaching ? 145 : 35, arrowEnd: true, strokeWidth: 1.7 },
      ...(current ? [{ type: "text", x: coilCenterX + width * .09, y: cy - height * .2, value: current, anchor: "start", fontSize: 9 } as ScientificPrimitive] : []),
      ...(emf ? [{ type: "text", x: coilCenterX + width * .11, y: cy + height * .25, value: emf, anchor: "start", fontSize: 10 } as ScientificPrimitive] : []),
      ...(law ? [{ type: "text", x: x + width * .5, y: y + height - 7, value: `loi de ${law}`, anchor: "middle", fontSize: 9, math: false } as ScientificPrimitive] : []),
      { type: "line", x1: coilCenterX + width * .08, y1: coilTop, x2: x + width, y2: y + height * .3 },
      { type: "line", x1: coilCenterX + width * .08, y1: coilBottom, x2: x + width, y2: y + height * .7 },
      { type: "circle", cx: x + width, cy: y + height * .3, r: 3.2, fill: "paper" },
      { type: "circle", cx: x + width, cy: y + height * .7, r: 3.2, fill: "paper" },
    );
    return scene;
  }
  if (object.kind === "coupled-coils") {
    const primary = label("primary", "N_1").trim(); const secondary = label("secondary", "N_2").trim(); const current1 = label("current1", "i_1").trim(); const current2 = label("current2", "i_2").trim(); const mutual = label("mutual", "M").trim(); const dots = gpsEnabled(label("dotConvention", "oui")); const primaryX = x + width * .34; const secondaryX = x + width * .66; const topY = y + height * .25; const bottomY = y + height * .75; const coilHeight = bottomY - topY; const scene: ScientificPrimitive[] = [
      { type: "line", x1: x, y1: topY, x2: primaryX, y2: topY }, { type: "line", x1: x, y1: bottomY, x2: primaryX, y2: bottomY },
      { type: "line", x1: secondaryX, y1: topY, x2: x + width, y2: topY }, { type: "line", x1: secondaryX, y1: bottomY, x2: x + width, y2: bottomY },
      { type: "line", x1: cx - 6, y1: y + height * .16, x2: cx - 6, y2: y + height * .84, strokeWidth: 2.4 },
      { type: "line", x1: cx + 6, y1: y + height * .16, x2: cx + 6, y2: y + height * .84, strokeWidth: 2.4 },
    ];
    for (let index = 0; index < 5; index += 1) {
      const loopY = topY + coilHeight * (index + .5) / 5; scene.push(
        { type: "ellipse", cx: primaryX, cy: loopY, rx: width * .055, ry: height * .065 },
        { type: "ellipse", cx: secondaryX, cy: loopY, rx: width * .055, ry: height * .065 },
      );
    }
    if (dots) scene.push({ type: "circle", cx: primaryX - width * .075, cy: topY + 8, r: 3, fill: "ink" }, { type: "circle", cx: secondaryX + width * .075, cy: topY + 8, r: 3, fill: "ink" });
    scene.push(
      { type: "line", x1: x + width * .04, y1: topY - 10, x2: x + width * .23, y2: topY - 10, arrowEnd: true },
      { type: "line", x1: x + width * .96, y1: topY - 10, x2: x + width * .77, y2: topY - 10, arrowEnd: true },
      { type: "text", x: x + width * .14, y: topY - 17, value: current1, anchor: "middle", fontSize: 9 },
      { type: "text", x: x + width * .86, y: topY - 17, value: current2, anchor: "middle", fontSize: 9 },
      { type: "text", x: primaryX - width * .1, y: cy + 4, value: primary, anchor: "end", fontSize: 10 },
      { type: "text", x: secondaryX + width * .1, y: cy + 4, value: secondary, anchor: "start", fontSize: 10 },
      { type: "text", x: cx, y: y + 14, value: mutual, anchor: "middle", fontSize: 11 },
      { type: "circle", cx: x, cy: topY, r: 3.2, fill: "paper" }, { type: "circle", cx: x, cy: bottomY, r: 3.2, fill: "paper" },
      { type: "circle", cx: x + width, cy: topY, r: 3.2, fill: "paper" }, { type: "circle", cx: x + width, cy: bottomY, r: 3.2, fill: "paper" },
    );
    return scene;
  }
  if (object.kind === "electromechanical-converter") {
    const mode = gpsChoice(label("mode", "moteur")); const motor = !mode.startsWith("gen"); const voltage = label("voltage", "u").trim(); const current = label("current", "i").trim(); const torque = label("torque", "C_m").trim(); const angularSpeed = label("angularSpeed", "ω").trim(); const power = label("power", "P_em").trim(); const blockLeft = x + width * .3; const blockRight = x + width * .7; const blockTop = y + height * .22; const blockBottom = y + height * .78; const electricalTop = y + height * .35; const electricalBottom = y + height * .65;
    const powerStart = motor ? x + width * .12 : x + width * .88; const powerEnd = motor ? x + width * .88 : x + width * .12;
    return [
      { type: "rect", x: blockLeft, y: blockTop, width: blockRight - blockLeft, height: blockBottom - blockTop, rx: 6, fill: "paper", strokeWidth: 2 },
      { type: "circle", cx, cy, r: Math.min(width, height) * .19, fill: "paper", strokeWidth: 1.8 },
      { type: "text", x: cx, y: cy + 5, value: motor ? "M" : "G", anchor: "middle", fontSize: 18, technical: true },
      { type: "line", x1: x, y1: electricalTop, x2: blockLeft, y2: electricalTop },
      { type: "line", x1: x, y1: electricalBottom, x2: blockLeft, y2: electricalBottom },
      { type: "text", x: x + 8, y: electricalTop - 7, value: "+", anchor: "start", fontSize: 10, technical: true },
      { type: "text", x: x + 8, y: electricalBottom + 13, value: "−", anchor: "start", fontSize: 10, technical: true },
      { type: "line", x1: x + width * .03, y1: electricalTop - 13, x2: blockLeft - 5, y2: electricalTop - 13, arrowEnd: motor },
      { type: "text", x: x + width * .16, y: electricalTop - 20, value: current, anchor: "middle", fontSize: 9 },
      { type: "text", x: x + width * .13, y: cy + 4, value: voltage, anchor: "middle", fontSize: 10 },
      { type: "line", x1: blockRight, y1: cy, x2: x + width, y2: cy, strokeWidth: 3 },
      { type: "arc", cx: x + width * .83, cy, r: height * .17, start: motor ? 200 : 340, end: motor ? 340 : 200, arrowEnd: true, strokeWidth: 1.7 },
      { type: "text", x: x + width * .84, y: cy - height * .2, value: angularSpeed, anchor: "middle", fontSize: 9, vector: true },
      { type: "text", x: x + width * .84, y: cy + height * .24, value: torque, anchor: "middle", fontSize: 9, vector: true },
      { type: "line", x1: powerStart, y1: y + 12, x2: powerEnd, y2: y + 12, arrowEnd: true, dashed: true },
      { type: "text", x: cx, y: y + 8, value: power, anchor: "middle", fontSize: 9 },
      { type: "text", x: cx, y: blockBottom + 17, value: motor ? "conversion électrique → mécanique" : "conversion mécanique → électrique", anchor: "middle", fontSize: 8, math: false },
      { type: "circle", cx: x, cy: electricalTop, r: 3.2, fill: "paper" }, { type: "circle", cx: x, cy: electricalBottom, r: 3.2, fill: "paper" }, { type: "circle", cx: x + width, cy, r: 3.2, fill: "paper" },
    ];
  }
  if (object.kind === "sysml-frame") {
    const diagram = label("diagram", "stm").trim() || "stm"; const name = label("name", "Système").trim();
    const tabWidth = Math.min(width * .62, Math.max(120, 52 + name.length * 7)); const tabHeight = Math.min(28, height * .18); const bevel = Math.min(16, tabHeight * .55);
    return [
      { type: "rect", x, y, width, height },
      { type: "polyline", points: [{ x, y }, { x: x + tabWidth, y }, { x: x + tabWidth + bevel, y: y + tabHeight }, { x, y: y + tabHeight }] },
      { type: "text", x: x + 9, y: y + tabHeight * .7, value: `[${diagram}] ${name}`, anchor: "start", fontSize: 12, technical: true },
    ];
  }
  if (object.kind === "functional-block") {
    const dividerY = y + height * .64; const functionName = label("function", "Traiter l’information").trim(); const constituent = label("constituent", "Carte de commande").trim();
    return [
      { type: "rect", x, y, width, height, fill: "paper" },
      { type: "line", x1: x, y1: dividerY, x2: x + width, y2: dividerY },
      { type: "text", x: cx, y: y + height * .36, value: functionName, anchor: "middle", fontSize: 12, math: false },
      { type: "text", x: cx, y: y + height * .84, value: constituent, anchor: "middle", fontSize: 10, technical: true },
    ];
  }
  if (object.kind === "typed-flow") {
    const x2 = object.x2 ?? x; const y2 = object.y2 ?? y; const dx = x2 - x; const dy = y2 - y; const length = Math.hypot(dx, dy) || 1; const nx = -dy / length; const ny = dx / length;
    const flow = label("flow", "information").trim(); const main = label("main", "signal").trim(); const caption = !main || main.toLocaleLowerCase("fr") === flow.toLocaleLowerCase("fr") ? flow : `${flow} : ${main}`;
    return [
      { type: "line", x1: x, y1: y, x2, y2, arrowEnd: true },
      { type: "text", x: (x + x2) / 2 - nx * 11, y: (y + y2) / 2 - ny * 11 + 4, value: caption, anchor: "middle", fontSize: 10, technical: true },
    ];
  }
  if (object.kind === "state-node") {
    const name = label("name", "État").trim(); const activities = [["entry", "entry / "], ["do", "do / "], ["exit", "exit / "]] as const;
    const populated = activities.map(([key, prefix]) => ({ prefix, value: label(key, "").trim() })).filter((activity) => activity.value);
    const scene: ScientificPrimitive[] = [{ type: "rect", x, y, width, height, rx: Math.min(12, height * .15), fill: "paper" }];
    if (!populated.length) return [...scene, { type: "text", x: cx, y: cy + 5, value: name, anchor: "middle", fontSize: 13, technical: true }];
    const dividerY = y + Math.min(30, height * .34); scene.push(
      { type: "text", x: cx, y: y + Math.min(21, height * .24), value: name, anchor: "middle", fontSize: 12, technical: true },
      { type: "line", x1: x, y1: dividerY, x2: x + width, y2: dividerY },
    );
    const available = Math.max(12, height - (dividerY - y) - 8); const step = available / Math.max(populated.length, 1);
    populated.forEach((activity, index) => scene.push({ type: "text", x: x + 9, y: dividerY + step * (index + .72), value: `${activity.prefix}${activity.value}`, anchor: "start", fontSize: 10, math: false }));
    return scene;
  }
  if (object.kind === "state-pseudostate") {
    const radius = Math.min(width, height) * .3; const mode = gpsChoice(label("pseudostate", "initial"));
    if (["final", "fin", "terminal"].includes(mode)) return [
      { type: "circle", cx, cy, r: radius, fill: "paper" },
      { type: "circle", cx, cy, r: radius * .52, fill: "ink" },
    ];
    return [{ type: "circle", cx, cy, r: radius * .72, fill: "ink" }];
  }
  if (object.kind === "state-transition") {
    const x2 = object.x2 ?? x; const y2 = object.y2 ?? y; const dx = x2 - x; const dy = y2 - y; const length = Math.hypot(dx, dy) || 1; const nx = -dy / length; const ny = dx / length;
    const event = label("event", "événement").trim(); const guard = label("guard", "").trim(); const action = label("action", "").trim(); const caption = `${event}${guard ? ` [${guard}]` : ""}${action ? ` / ${action}` : ""}`.trim();
    return [
      { type: "line", x1: x, y1: y, x2, y2, arrowEnd: true },
      ...(caption ? [{ type: "text", x: (x + x2) / 2 - nx * 12, y: (y + y2) / 2 - ny * 12 + 4, value: caption, anchor: "middle", fontSize: 10, math: false } as ScientificPrimitive] : []),
    ];
  }
  if (object.kind === "choice-junction") return [{ type: "polyline", points: [{ x: cx, y }, { x: x + width, y: cy }, { x: cx, y: y + height }, { x, y: cy }], closed: true, fill: "paper" }];
  if (object.kind === "fork-join") {
    const orientation = gpsChoice(label("orientation", "horizontal"));
    return orientation.startsWith("v")
      ? [{ type: "rect", x: cx - Math.max(3, width * .08), y, width: Math.max(6, width * .16), height, fill: "ink" }]
      : [{ type: "rect", x, y: cy - Math.max(3, height * .08), width, height: Math.max(6, height * .16), fill: "ink" }];
  }
  if (object.kind === "chronogram-lane") {
    const signal = label("signal", "signal").trim(); const rawValues = label("waveform", "0,1,0,1").split(/[;,\s]+/).map((value) => Number(value.replace(",", "."))).filter(Number.isFinite); const values = rawValues.length ? rawValues : [0, 1]; const times = label("times", "").split(/[;,]+/).map((value) => value.trim()).filter(Boolean);
    const mode = gpsChoice(label("chronogram", "binaire")); const labelWidth = Math.min(82, width * .26); const plotLeft = x + labelWidth; const plotRight = x + width - 10; const plotTop = y + 10; const plotBottom = y + height - 18; const plotHeight = Math.max(12, plotBottom - plotTop); const plotWidth = Math.max(20, plotRight - plotLeft); const minimum = Math.min(...values); const maximum = Math.max(...values); const span = maximum - minimum || 1;
    const levelY = (value: number) => mode.startsWith("b") ? (value > 0 ? plotTop : plotBottom) : plotBottom - ((value - minimum) / span) * plotHeight;
    const scene: ScientificPrimitive[] = [
      { type: "text", x: x + labelWidth - 8, y: (plotTop + plotBottom) / 2 + 4, value: signal, anchor: "end", fontSize: 10, technical: true },
      { type: "line", x1: plotLeft, y1: plotBottom, x2: plotRight + 5, y2: plotBottom, arrowEnd: true },
      { type: "text", x: plotRight + 14, y: plotBottom + 14, value: "t", anchor: "middle", fontSize: 10 },
    ];
    if (mode.startsWith("b")) {
      const segment = plotWidth / values.length;
      values.forEach((value, index) => {
        const startX = plotLeft + segment * index; const endX = plotLeft + segment * (index + 1); const currentY = levelY(value);
        scene.push({ type: "line", x1: startX, y1: currentY, x2: endX, y2: currentY });
        if (index < values.length - 1 && levelY(values[index + 1]) !== currentY) scene.push({ type: "line", x1: endX, y1: currentY, x2: endX, y2: levelY(values[index + 1]) });
      });
    } else {
      scene.push({ type: "polyline", points: values.map((value, index) => ({ x: plotLeft + (plotWidth * index) / Math.max(1, values.length - 1), y: levelY(value) })) });
    }
    times.forEach((time, index) => {
      const timeX = plotLeft + (plotWidth * index) / Math.max(1, times.length - 1);
      scene.push(
        { type: "line", x1: timeX, y1: plotBottom - 3, x2: timeX, y2: plotBottom + 3 },
        { type: "text", x: timeX, y: plotBottom + 14, value: time, anchor: "middle", fontSize: 8 },
      );
    });
    return scene;
  }
  if (object.kind === "hidden-edge") return [{ type: "line", x1: x, y1: y, x2: object.x2 ?? x, y2: object.y2 ?? y, dashArray: [...GPS_DASH_ARRAYS.hidden], strokeWidth: GPS_NARROW_STROKE, nonScaling: true }];
  if (object.kind === "centre-line") return [{ type: "line", x1: x, y1: y, x2: object.x2 ?? x, y2: object.y2 ?? y, dashArray: [...GPS_DASH_ARRAYS.centre], strokeWidth: GPS_NARROW_STROKE, nonScaling: true }];
  if (object.kind === "cutting-plane") {
    const x2 = object.x2 ?? x; const y2 = object.y2 ?? y; const dx = x2 - x; const dy = y2 - y; const length = Math.hypot(dx, dy) || 1; const tx = dx / length; const ty = dy / length; const nx = -ty; const ny = tx; const section = label("main", "A");
    return [
      { type: "line", x1: x, y1: y, x2, y2, dashArray: [...GPS_DASH_ARRAYS.cutting], strokeWidth: GPS_WIDE_STROKE, nonScaling: true },
      { type: "line", x1: x, y1: y, x2: x + nx * 26, y2: y + ny * 26, arrowEnd: true, strokeWidth: GPS_WIDE_STROKE, nonScaling: true },
      { type: "line", x1: x2, y1: y2, x2: x2 + nx * 26, y2: y2 + ny * 26, arrowEnd: true, strokeWidth: GPS_WIDE_STROKE, nonScaling: true },
      { type: "text", x: x + nx * 42 - tx * 3, y: y + ny * 42 + 5, value: section, anchor: "middle", fontSize: 14, technical: true },
      { type: "text", x: x2 + nx * 42 + tx * 3, y: y2 + ny * 42 + 5, value: section, anchor: "middle", fontSize: 14, technical: true },
    ];
  }
  if (object.kind === "section-hatch") {
    const spacing = 12; const lines: ScientificPrimitive[] = [];
    for (let offset = spacing; offset < width + height; offset += spacing) {
      const intersections: Point[] = [];
      const add = (px: number, py: number) => { if (px >= 0 && px <= width && py >= 0 && py <= height && !intersections.some((point) => Math.abs(point.x - px) < .001 && Math.abs(point.y - py) < .001)) intersections.push({ x: px, y: py }); };
      add(0, offset); add(width, offset - width); add(offset, 0); add(offset - height, height);
      if (intersections.length >= 2) lines.push({ type: "line", x1: x + intersections[0].x, y1: y + intersections[0].y, x2: x + intersections[1].x, y2: y + intersections[1].y, strokeWidth: GPS_NARROW_STROKE, nonScaling: true });
    }
    return lines;
  }
  if (object.kind === "datum-feature") {
    const x2 = object.x2 ?? x; const y2 = object.y2 ?? y; const dx = x2 - x; const dy = y2 - y; const length = Math.hypot(dx, dy) || 1; const tx = dx / length; const ty = dy / length; const nx = -ty; const ny = tx; const frame = 25; const half = frame / 2; const base = { x: x + tx * 14, y: y + ty * 14 }; const entryDistance = half / Math.max(Math.abs(tx), Math.abs(ty), .0001); const entry = { x: x2 - tx * entryDistance, y: y2 - ty * entryDistance };
    return [
      { type: "polyline", points: [{ x, y }, { x: base.x + nx * 7, y: base.y + ny * 7 }, { x: base.x - nx * 7, y: base.y - ny * 7 }], closed: true, fill: "ink", strokeWidth: GPS_NARROW_STROKE },
      { type: "line", x1: base.x, y1: base.y, x2: entry.x, y2: entry.y, strokeWidth: GPS_NARROW_STROKE, nonScaling: true },
      { type: "rect", x: x2 - half, y: y2 - half, width: frame, height: frame, fill: "paper", strokeWidth: GPS_NARROW_STROKE },
      { type: "text", x: x2, y: y2 + 5, value: label("datum", "A").toUpperCase(), anchor: "middle", fontSize: 14, technical: true },
    ];
  }
  if (object.kind === "feature-control-frame") {
    const x2 = object.x2 ?? x; const y2 = object.y2 ?? y; const frameHeight = 25; const characteristicWidth = 25; const toleranceWidth = 65; const datumWidth = 25;
    const datums = [label("datum1", "A"), label("datum2", "B"), label("datum3", "C")].map((value) => value.trim().toUpperCase()).filter(Boolean);
    const totalWidth = characteristicWidth + toleranceWidth + datums.length * datumWidth; const top = y2 - frameHeight / 2; const toleranceX = x2 + characteristicWidth; const diameter = gpsEnabled(label("diameter", "oui")); const tolerance = label("tolerance", "0,02").trim(); const rawModifier = label("modifier", "").trim(); const modifierKey = gpsChoice(rawModifier); const modifier = !rawModifier || ["aucun", "none", "non"].includes(modifierKey) ? "" : modifierKey.includes("maximum") ? "M" : modifierKey.includes("minimum") ? "L" : modifierKey.includes("enveloppe") ? "E" : rawModifier.slice(0, 1).toUpperCase();
    const scene: ScientificPrimitive[] = [
      { type: "line", x1: x2, y1: y2, x2: x, y2: y, arrowEnd: true, strokeWidth: GPS_NARROW_STROKE, nonScaling: true },
      { type: "rect", x: x2, y: top, width: totalWidth, height: frameHeight, fill: "paper", strokeWidth: GPS_NARROW_STROKE },
      { type: "line", x1: toleranceX, y1: top, x2: toleranceX, y2: top + frameHeight, strokeWidth: GPS_NARROW_STROKE, nonScaling: true },
      ...gpsCharacteristicScene(label("characteristic", "position"), x2 + characteristicWidth / 2, y2, 17),
    ];
    if (diameter) scene.push(
      { type: "circle", cx: toleranceX + 11, cy: y2, r: 4.6, strokeWidth: GPS_NARROW_STROKE },
      { type: "line", x1: toleranceX + 7, y1: y2 + 5, x2: toleranceX + 15, y2: y2 - 5, strokeWidth: GPS_NARROW_STROKE, nonScaling: true },
    );
    scene.push({ type: "text", x: toleranceX + (diameter ? 38 : toleranceWidth / 2), y: y2 + 4.5, value: tolerance, anchor: "middle", fontSize: 12, technical: true });
    if (modifier) scene.push(
      { type: "circle", cx: toleranceX + toleranceWidth - 10, cy: y2, r: 6.2, strokeWidth: GPS_NARROW_STROKE },
      { type: "text", x: toleranceX + toleranceWidth - 10, y: y2 + 4, value: modifier, anchor: "middle", fontSize: 9.5, technical: true },
    );
    let divider = toleranceX + toleranceWidth;
    for (const datum of datums) {
      scene.push(
        { type: "line", x1: divider, y1: top, x2: divider, y2: top + frameHeight, strokeWidth: GPS_NARROW_STROKE, nonScaling: true },
        { type: "text", x: divider + datumWidth / 2, y: y2 + 5, value: datum, anchor: "middle", fontSize: 13, technical: true },
      );
      divider += datumWidth;
    }
    return scene;
  }
  if (object.kind === "surface-texture") {
    const x2 = object.x2 ?? x; const y2 = object.y2 ?? y; const requirement = gpsChoice(label("requirement", "enlèvement")); const prohibited = ["interdit", "sans-enlevement", "enlevement-interdit", "prohibited"].includes(requirement); const basic = ["basic", "de-base", "base", "indifferent"].includes(requirement); const longPoint = { x: x2 + 16, y: y2 - 42 }; const requirementText = [label("parameter", "Ra").trim(), label("value", "3,2").trim()].filter(Boolean).join(" "); const process = label("process", "").trim(); const lay = label("lay", "").trim();
    const scene: ScientificPrimitive[] = [
      { type: "line", x1: x2, y1: y2, x2: x, y2: y, arrowEnd: true, strokeWidth: GPS_NARROW_STROKE, nonScaling: true },
      { type: "line", x1: x2 - 12, y1: y2 - 20, x2, y2, strokeWidth: GPS_WIDE_STROKE, nonScaling: true },
      { type: "line", x1: x2, y1: y2, x2: longPoint.x, y2: longPoint.y, strokeWidth: GPS_WIDE_STROKE, nonScaling: true },
    ];
    if (!basic && !prohibited) scene.push({ type: "line", x1: longPoint.x - 7, y1: longPoint.y + 7, x2: longPoint.x + 58, y2: longPoint.y + 7, strokeWidth: GPS_WIDE_STROKE, nonScaling: true });
    if (prohibited) scene.push({ type: "circle", cx: x2 - 1, cy: y2 - 12, r: 7, strokeWidth: GPS_WIDE_STROKE });
    if (gpsEnabled(label("allAround", "non"))) scene.push({ type: "circle", cx: x2, cy: y2, r: 5.5, fill: "paper", strokeWidth: GPS_NARROW_STROKE });
    if (requirementText) scene.push({ type: "text", x: longPoint.x + 25, y: longPoint.y + 2, value: requirementText, anchor: "middle", fontSize: 12, technical: true });
    if (process) scene.push({ type: "text", x: longPoint.x + 25, y: longPoint.y + 22, value: process, anchor: "middle", fontSize: 10, technical: true });
    if (lay) scene.push({ type: "text", x: longPoint.x + 63, y: longPoint.y + 22, value: lay, anchor: "middle", fontSize: 10, technical: true });
    return scene;
  }
  const gear = (gearX: number, gearY: number, radius: number, teeth: number): ScientificPrimitive => ({
    type: "polyline",
    points: Array.from({ length: teeth * 4 }, (_, index) => {
      const angle = (index / (teeth * 4)) * Math.PI * 2; const phase = index % 4; const localRadius = phase === 1 || phase === 2 ? radius : radius * .82;
      return { x: gearX + Math.cos(angle) * localRadius, y: gearY + Math.sin(angle) * localRadius };
    }),
    closed: true,
    fill: "paper",
  });
  if (object.kind === "transfer-block") return [
    { type: "rect", x, y, width, height, fill: "paper" },
    { type: "text", x: cx, y: cy + 5, value: label("main", "H(p)"), anchor: "middle", fontSize: 15 },
  ];
  if (object.kind === "summing-junction") {
    const radius = Math.min(width, height) * .32;
    const sign = (key: string, fallback: string, signX: number, signY: number): ScientificPrimitive[] => {
      const value = label(key, fallback).trim();
      const latex = value === "−" ? "-" : value === "+" || value === "-" ? value : undefined;
      return value ? [{ type: "text", x: signX, y: signY, value, ...(latex ? { latex } : {}), anchor: "middle", fontSize: 12 }] : [];
    };
    return [
      { type: "line", x1: x, y1: cy, x2: cx - radius, y2: cy },
      { type: "line", x1: cx + radius, y1: cy, x2: x + width, y2: cy },
      { type: "line", x1: cx, y1: y, x2: cx, y2: cy - radius },
      { type: "line", x1: cx, y1: cy + radius, x2: cx, y2: y + height },
      { type: "circle", cx, cy, r: radius, fill: "paper" },
      ...sign("left", "+", cx - radius * .45, cy + 4),
      ...sign("top", "+", cx, cy - radius * .42 + 4),
      ...sign("bottom", "−", cx, cy + radius * .5 + 4),
    ];
  }
  if (object.kind === "takeoff-point") return [{ type: "circle", cx, cy, r: Math.min(width, height) * .22, fill: "ink" }];
  if (object.kind === "joint-pivot") {
    const radius = Math.min(width, height) * .24;
    return [
      { type: "line", x1: cx, y1: cy, x2: x + width, y2: cy },
      { type: "line", x1: x, y1: cy, x2: cx - radius, y2: cy },
      { type: "circle", cx, cy, r: radius, fill: "paper" },
    ];
  }
  if (object.kind === "joint-slider") {
    const axisY = y + height * .4; const bodyWidth = width * .5; const bodyHeight = height * .35;
    return [
      { type: "line", x1: x, y1: axisY, x2: x + width, y2: axisY },
      { type: "rect", x: cx - bodyWidth / 2, y: axisY - bodyHeight / 2, width: bodyWidth, height: bodyHeight, fill: "paper" },
      { type: "line", x1: cx, y1: axisY + bodyHeight / 2, x2: cx, y2: y + height },
    ];
  }
  if (object.kind === "joint-ball") {
    const radius = Math.min(width, height) * .18; const cupRadius = radius * 1.45;
    return [
      { type: "line", x1: cx + radius, y1: cy, x2: x + width, y2: cy },
      { type: "line", x1: x, y1: cy, x2: cx - cupRadius, y2: cy },
      { type: "arc", cx, cy, r: cupRadius, start: 45, end: 315 },
      { type: "circle", cx, cy, r: radius, fill: "paper" },
    ];
  }
  if (object.kind === "joint-cylindrical" || object.kind === "joint-helical") {
    const axisY = y + height * .4; const bodyWidth = width * .5; const bodyHeight = height * .35; const left = cx - bodyWidth / 2; const right = cx + bodyWidth / 2;
    const male: ScientificPrimitive[] = object.kind === "joint-cylindrical" ? [
      { type: "line", x1: x, y1: axisY, x2: x + width, y2: axisY },
    ] : [
      { type: "line", x1: x, y1: axisY, x2: left, y2: axisY },
      { type: "polyline", points: Array.from({ length: 33 }, (_, index) => ({ x: left + (bodyWidth * index) / 32, y: axisY + Math.sin((index / 32) * Math.PI * 6) * bodyHeight * .16 })) },
      { type: "line", x1: right, y1: axisY, x2: x + width, y2: axisY },
    ];
    return [
      { type: "rect", x: left, y: axisY - bodyHeight / 2, width: bodyWidth, height: bodyHeight, fill: "paper" },
      ...male,
      { type: "rect", x: left, y: axisY - bodyHeight / 2, width: bodyWidth, height: bodyHeight },
      { type: "line", x1: cx, y1: axisY + bodyHeight / 2, x2: cx, y2: y + height },
    ];
  }
  if (object.kind === "joint-planar") {
    const half = width * .42; const upperY = cy - height * .1; const lowerY = cy + height * .1;
    return [
      { type: "line", x1: cx - half, y1: upperY, x2: cx + half, y2: upperY },
      { type: "line", x1: cx, y1: y, x2: cx, y2: upperY },
      { type: "line", x1: cx - half, y1: lowerY, x2: cx + half, y2: lowerY },
      { type: "line", x1: cx, y1: lowerY, x2: cx, y2: y + height },
    ];
  }
  if (object.kind === "joint-line-contact") {
    const contactY = cy; const top = y + height * .42; const half = width * .42;
    return [
      { type: "polyline", points: [{ x: cx - half * .78, y: top }, { x: cx + half * .78, y: top }, { x: cx + half, y: contactY - 3 }, { x: cx - half, y: contactY - 3 }], closed: true, fill: "paper" },
      { type: "line", x1: cx, y1: y, x2: cx, y2: top },
      { type: "line", x1: cx - half, y1: contactY + 3, x2: cx + half, y2: contactY + 3 },
      { type: "line", x1: cx, y1: contactY + 3, x2: cx, y2: y + height },
    ];
  }
  if (object.kind === "joint-annular") {
    const radius = Math.min(width, height) * .14; const grooveTop = cy; const grooveHeight = height * .22;
    return [
      { type: "rect", x: x + width * .18, y: grooveTop, width: width * .64, height: grooveHeight, fill: "paper" },
      { type: "line", x1: cx, y1: grooveTop + grooveHeight, x2: cx, y2: y + height },
      { type: "circle", cx, cy: grooveTop, r: radius, fill: "paper" },
      { type: "line", x1: cx, y1: y, x2: cx, y2: grooveTop - radius },
    ];
  }
  if (object.kind === "joint-point-contact") {
    const planeY = cy + height * .08; const radius = Math.min(width, height) * .12; const ballY = planeY - radius;
    return [
      { type: "circle", cx, cy: ballY, r: radius, fill: "paper" },
      { type: "line", x1: cx + radius * .7, y1: ballY - radius * .7, x2: x + width * .83, y2: y },
      { type: "line", x1: x + width * .08, y1: planeY, x2: x + width * .92, y2: planeY },
      { type: "line", x1: cx, y1: planeY, x2: cx, y2: y + height },
    ];
  }
  if (object.kind === "gear-pair") {
    const r1 = height * .22; const r2 = height * .3; const firstX = x + width * .27; const secondX = firstX + r1 + r2; const gearY = y + height * .48;
    return [
      gear(firstX, gearY, r1, 12),
      gear(secondX, gearY, r2, 16),
      { type: "circle", cx: firstX, cy: gearY, r: r1 * .18, fill: "paper" },
      { type: "circle", cx: secondX, cy: gearY, r: r2 * .18, fill: "paper" },
      { type: "arc", cx: firstX, cy: gearY, r: r1 * .62, start: 205, end: 500, arrowEnd: true },
      { type: "arc", cx: secondX, cy: gearY, r: r2 * .62, start: -25, end: -320, arrowEnd: true },
      { type: "text", x: firstX, y: y + height * .96, value: label("driver", "Z_1"), anchor: "middle", fontSize: 12 },
      { type: "text", x: secondX, y: y + height * .96, value: label("driven", "Z_2"), anchor: "middle", fontSize: 12 },
    ];
  }
  if (object.kind === "rack-pinion") {
    const gearX = x + width * .35; const gearY = y + height * .42; const radius = height * .23; const left = x + width * .08; const right = x + width * .94; const baseY = y + height * .84; const rootY = y + height * .72; const tipY = y + height * .66; const teeth = 11;
    const top = Array.from({ length: teeth * 2 + 1 }, (_, index) => ({ x: left + ((right - left) * index) / (teeth * 2), y: index % 2 ? tipY : rootY }));
    return [
      gear(gearX, gearY, radius, 14),
      { type: "circle", cx: gearX, cy: gearY, r: radius * .18, fill: "paper" },
      { type: "polyline", points: [{ x: left, y: baseY }, { x: right, y: baseY }, ...top.toReversed()], closed: true, fill: "paper" },
      { type: "arc", cx: gearX, cy: gearY, r: radius * .62, start: 205, end: 500, arrowEnd: true },
      { type: "line", x1: x + width * .64, y1: y + height * .92, x2: x + width * .9, y2: y + height * .92, arrowEnd: true },
      { type: "text", x: gearX, y: gearY + 4, value: label("pinion", "Z"), anchor: "middle", fontSize: 12 },
      { type: "text", x: x + width * .54, y: y + height * .98, value: label("rack", "x"), anchor: "middle", fontSize: 12 },
    ];
  }
  if (object.kind === "belt-drive") {
    const firstX = x + width * .25; const secondX = x + width * .75; const pulleyY = y + height * .5; const r1 = height * .22; const r2 = height * .3; const distance = secondX - firstX; const normalX = (r2 - r1) / distance; const normalY = Math.sqrt(1 - normalX * normalX);
    const tangent = (pulleyX: number, radius: number, side: -1 | 1) => ({ x: pulleyX + side * radius * normalX, y: pulleyY + side * radius * normalY });
    const firstTop = tangent(firstX, r1, -1); const secondTop = tangent(secondX, r2, -1); const firstBottom = tangent(firstX, r1, 1); const secondBottom = tangent(secondX, r2, 1);
    return [
      { type: "line", x1: firstTop.x, y1: firstTop.y, x2: secondTop.x, y2: secondTop.y, strokeWidth: 2.4 },
      { type: "line", x1: firstBottom.x, y1: firstBottom.y, x2: secondBottom.x, y2: secondBottom.y, strokeWidth: 2.4 },
      { type: "circle", cx: firstX, cy: pulleyY, r: r1, fill: "paper", strokeWidth: 2.4 },
      { type: "circle", cx: secondX, cy: pulleyY, r: r2, fill: "paper", strokeWidth: 2.4 },
      { type: "circle", cx: firstX, cy: pulleyY, r: r1 * .18, fill: "paper" },
      { type: "circle", cx: secondX, cy: pulleyY, r: r2 * .18, fill: "paper" },
      { type: "arc", cx: firstX, cy: pulleyY, r: r1 * .62, start: 205, end: 500, arrowEnd: true },
      { type: "arc", cx: secondX, cy: pulleyY, r: r2 * .62, start: 205, end: 500, arrowEnd: true },
      { type: "text", x: firstX, y: y + height * .96, value: label("driver", "D_1"), anchor: "middle", fontSize: 12 },
      { type: "text", x: secondX, y: y + height * .96, value: label("driven", "D_2"), anchor: "middle", fontSize: 12 },
    ];
  }
  if (object.kind === "screw-nut") {
    const axisY = y + height * .5; const nutX = x + width * .62; const nutWidth = width * .24; const nutHeight = height * .36; const helixLeft = x + width * .06; const helixRight = x + width * .94;
    return [
      { type: "line", x1: x, y1: axisY, x2: x + width, y2: axisY },
      { type: "polyline", points: Array.from({ length: 65 }, (_, index) => ({ x: helixLeft + ((helixRight - helixLeft) * index) / 64, y: axisY + Math.sin((index / 64) * Math.PI * 16) * height * .07 })) },
      { type: "rect", x: nutX - nutWidth / 2, y: axisY - nutHeight / 2, width: nutWidth, height: nutHeight, fill: "paper" },
      { type: "line", x1: nutX, y1: axisY + nutHeight / 2, x2: nutX, y2: y + height },
      { type: "arc", cx: x + width * .1, cy: axisY, r: height * .22, start: 40, end: 320, arrowEnd: true },
      { type: "line", x1: nutX + nutWidth * .65, y1: y + height * .18, x2: x + width * .92, y2: y + height * .18, arrowEnd: true },
      { type: "text", x: x + width * .5, y: y + height * .14, value: label("pitch", "p"), anchor: "middle", fontSize: 12 },
    ];
  }
  if (object.kind === "worm-gear") {
    const wormY = y + height * .26; const wheelX = x + width * .66; const wheelY = y + height * .58; const wheelRadius = height * .28; const wormRight = x + width * .62;
    return [
      gear(wheelX, wheelY, wheelRadius, 18),
      { type: "circle", cx: wheelX, cy: wheelY, r: wheelRadius * .17, fill: "paper" },
      { type: "line", x1: wheelX, y1: wheelY + wheelRadius, x2: wheelX, y2: y + height },
      { type: "line", x1: x, y1: wormY, x2: wormRight, y2: wormY, strokeWidth: 2.4 },
      { type: "polyline", points: Array.from({ length: 49 }, (_, index) => ({ x: x + width * .04 + ((wormRight - x - width * .08) * index) / 48, y: wormY + Math.sin((index / 48) * Math.PI * 12) * height * .055 })) },
      { type: "arc", cx: x + width * .12, cy: wormY, r: height * .16, start: 35, end: 325, arrowEnd: true },
      { type: "arc", cx: wheelX, cy: wheelY, r: wheelRadius * .62, start: 205, end: 500, arrowEnd: true },
      { type: "text", x: x + width * .2, y: y + height * .12, value: label("worm", "Z_v"), anchor: "middle", fontSize: 12 },
      { type: "text", x: wheelX + wheelRadius * .75, y: y + height * .93, value: label("wheel", "Z_r"), anchor: "middle", fontSize: 12 },
    ];
  }
  if (object.kind === "planetary-gear") {
    const radius = Math.min(width, height) * .38; const sunRadius = radius * .23; const satelliteRadius = radius * .21; const orbit = radius * .53;
    const satellites = [0, 120, 240].map((angle) => ({ x: cx + Math.cos((angle * Math.PI) / 180) * orbit, y: cy + Math.sin((angle * Math.PI) / 180) * orbit }));
    return [
      { type: "circle", cx, cy, r: radius, fill: "paper", strokeWidth: 2.4 },
      gear(cx, cy, radius * .82, 28),
      ...satellites.map((satellite): ScientificPrimitive => ({ type: "line", x1: cx, y1: cy, x2: satellite.x, y2: satellite.y, strokeWidth: 2.4 })),
      gear(cx, cy, sunRadius, 12),
      ...satellites.map((satellite): ScientificPrimitive => gear(satellite.x, satellite.y, satelliteRadius, 11)),
      { type: "circle", cx, cy, r: sunRadius * .17, fill: "paper" },
      ...satellites.map((satellite): ScientificPrimitive => ({ type: "circle", cx: satellite.x, cy: satellite.y, r: satelliteRadius * .16, fill: "paper" })),
      { type: "line", x1: x, y1: cy, x2: cx - sunRadius, y2: cy },
      { type: "line", x1: cx + radius * .53, y1: cy, x2: x + width, y2: cy, strokeWidth: 2.4 },
      { type: "line", x1: cx, y1: y, x2: cx, y2: cy - radius },
      { type: "text", x: cx, y: cy + 4, value: label("sun", "Z_s"), anchor: "middle", fontSize: 11 },
      { type: "text", x: cx + radius * .77, y: cy - radius * .55, value: label("ring", "Z_c"), anchor: "middle", fontSize: 11 },
      { type: "text", x: cx + radius * .7, y: cy + radius * .72, value: label("carrier", "PS"), anchor: "middle", fontSize: 11 },
    ];
  }
  if (object.kind === "cam-follower") {
    const camX = x + width * .43; const camY = y + height * .68; const followerX = x + width * .62; const rollerY = y + height * .33; const rollerRadius = height * .08; const baseRadius = Math.min(width, height) * .23;
    const camPoints = Array.from({ length: 64 }, (_, index) => {
      const angle = (index / 64) * Math.PI * 2; const radius = baseRadius * (1 + .3 * Math.cos(angle + Math.PI / 2));
      return { x: camX + Math.cos(angle) * radius, y: camY + Math.sin(angle) * radius };
    });
    return [
      { type: "line", x1: x, y1: camY, x2: camX, y2: camY },
      { type: "polyline", points: camPoints, closed: true, fill: "paper" },
      { type: "circle", cx: camX, cy: camY, r: baseRadius * .16, fill: "paper" },
      { type: "rect", x: followerX - width * .09, y: y + height * .06, width: width * .18, height: height * .42, fill: "paper" },
      { type: "line", x1: followerX, y1: y, x2: followerX, y2: rollerY - rollerRadius },
      { type: "circle", cx: followerX, cy: rollerY, r: rollerRadius, fill: "paper" },
      { type: "arc", cx: camX, cy: camY, r: baseRadius * .62, start: 205, end: 500, arrowEnd: true },
      { type: "line", x1: followerX + width * .14, y1: y + height * .18, x2: followerX + width * .14, y2: y + height * .04, arrowEnd: true },
      { type: "text", x: camX - baseRadius * .55, y: camY + baseRadius * .85, value: label("cam", "C"), anchor: "middle", fontSize: 11 },
      { type: "text", x: followerX + width * .16, y: y + height * .3, value: label("follower", "S"), anchor: "middle", fontSize: 11 },
    ];
  }
  if (object.kind === "electric-motor") {
    const axisY = cy; const motorX = x + width * .48; const radius = height * .29;
    return [
      { type: "line", x1: x, y1: axisY, x2: motorX - radius, y2: axisY },
      { type: "circle", cx: motorX, cy: axisY, r: radius, fill: "paper", strokeWidth: 2.4 },
      { type: "line", x1: motorX + radius, y1: axisY, x2: x + width, y2: axisY, strokeWidth: 2.4 },
      { type: "text", x: motorX, y: axisY + 5, value: label("main", "M"), anchor: "middle", fontSize: 16 },
    ];
  }
  if (object.kind === "gear-reducer") {
    const axisY = cy; const boxX = x + width * .18; const boxWidth = width * .64; const boxY = y + height * .14; const boxHeight = height * .72;
    const firstX = boxX + boxWidth * .36; const secondX = boxX + boxWidth * .64; const firstR = height * .2; const secondR = height * .13;
    return [
      { type: "line", x1: x, y1: axisY, x2: boxX, y2: axisY },
      { type: "rect", x: boxX, y: boxY, width: boxWidth, height: boxHeight, fill: "paper", strokeWidth: 2.4 },
      { type: "circle", cx: firstX, cy: axisY - height * .05, r: firstR, fill: "paper" },
      { type: "circle", cx: secondX, cy: axisY + height * .13, r: secondR, fill: "paper" },
      { type: "line", x1: boxX + boxWidth, y1: axisY, x2: x + width, y2: axisY, strokeWidth: 2.4 },
      { type: "text", x: boxX + boxWidth * .78, y: boxY + boxHeight * .28, value: label("main", "r"), anchor: "middle", fontSize: 12 },
    ];
  }
  if (object.kind === "clutch") {
    const axisY = cy; const leftPlate = x + width * .43; const rightPlate = x + width * .57; const top = y + height * .22; const bottom = y + height * .78;
    return [
      { type: "line", x1: x, y1: axisY, x2: leftPlate, y2: axisY, strokeWidth: 2.4 },
      { type: "line", x1: leftPlate, y1: top, x2: leftPlate, y2: bottom, strokeWidth: 2.4 },
      { type: "line", x1: rightPlate, y1: top, x2: rightPlate, y2: bottom, strokeWidth: 2.4 },
      { type: "line", x1: rightPlate, y1: axisY, x2: x + width, y2: axisY, strokeWidth: 2.4 },
      { type: "line", x1: x + width * .68, y1: y + height * .08, x2: rightPlate, y2: top, arrowEnd: true },
      { type: "text", x: cx, y: y + height * .96, value: label("main", "E"), anchor: "middle", fontSize: 12 },
    ];
  }
  if (object.kind === "brake") {
    const shaftY = y + height * .45; const discX = x + width * .48; const discRadius = height * .25; const supportX = x + width * .7;
    return [
      { type: "line", x1: x, y1: shaftY, x2: discX, y2: shaftY, strokeWidth: 2.4 },
      { type: "circle", cx: discX, cy: shaftY, r: discRadius, fill: "paper", strokeWidth: 2.4 },
      { type: "circle", cx: discX, cy: shaftY, r: discRadius * .16, fill: "paper" },
      { type: "polyline", points: [{ x: discX + discRadius * .45, y: shaftY - discRadius * .65 }, { x: supportX, y: shaftY - discRadius * .65 }, { x: supportX, y: shaftY + discRadius * .65 }, { x: discX + discRadius * .45, y: shaftY + discRadius * .65 }] },
      { type: "line", x1: supportX, y1: shaftY + discRadius * .65, x2: supportX, y2: y + height },
      { type: "line", x1: supportX - width * .14, y1: y + height, x2: supportX + width * .14, y2: y + height, strokeWidth: 2.4 },
      { type: "line", x1: supportX - width * .12, y1: y + height, x2: supportX - width * .18, y2: y + height * .93 },
      { type: "line", x1: supportX, y1: y + height, x2: supportX - width * .06, y2: y + height * .93 },
      { type: "line", x1: supportX + width * .12, y1: y + height, x2: supportX + width * .06, y2: y + height * .93 },
      { type: "text", x: x + width * .88, y: y + height * .22, value: label("main", "F"), anchor: "middle", fontSize: 12 },
    ];
  }
  if (object.kind === "hydraulic-pump") {
    const radius = Math.min(width, height) * .33;
    return [
      { type: "line", x1: cx, y1: y, x2: cx, y2: cy - radius },
      { type: "line", x1: cx, y1: cy + radius, x2: cx, y2: y + height },
      { type: "line", x1: x, y1: cy, x2: cx - radius, y2: cy },
      { type: "circle", cx, cy, r: radius, fill: "paper", strokeWidth: 2.4 },
      { type: "polyline", points: [{ x: cx, y: cy - radius * .78 }, { x: cx - radius * .46, y: cy + radius * .08 }, { x: cx + radius * .46, y: cy + radius * .08 }], closed: true, fill: "ink" },
      { type: "text", x: x + width * .86, y: y + height * .2, value: label("main", "P"), anchor: "middle", fontSize: 11 },
    ];
  }
  if (object.kind === "hydraulic-reservoir") {
    const left = x + width * .12; const right = x + width * .88; const top = y + height * .14; const bottom = y + height * .82;
    return [
      { type: "line", x1: cx, y1: y, x2: cx, y2: top },
      { type: "polyline", points: [{ x: left, y: top }, { x: left, y: bottom }, { x: right, y: bottom }, { x: right, y: top }] },
      { type: "line", x1: left, y1: top, x2: right, y2: top, dashed: true },
      { type: "text", x: x + width * .84, y: y + height * .72, value: label("main", "T"), anchor: "middle", fontSize: 11 },
    ];
  }
  if (object.kind === "hydraulic-cylinder" || object.kind === "pneumatic-cylinder") {
    const bodyX = x + width * .05; const bodyY = y + height * .2; const bodyWidth = width * .7; const bodyHeight = height * .56; const pistonX = x + width * .4;
    return [
      { type: "rect", x: bodyX, y: bodyY, width: bodyWidth, height: bodyHeight, fill: "paper", strokeWidth: 2.4 },
      { type: "line", x1: pistonX, y1: bodyY, x2: pistonX, y2: bodyY + bodyHeight, strokeWidth: 2.4 },
      { type: "line", x1: pistonX, y1: cy, x2: x + width, y2: cy, strokeWidth: 2.4 },
      { type: "line", x1: x + width * .3, y1: bodyY + bodyHeight, x2: x + width * .3, y2: y + height },
      { type: "line", x1: x + width * .7, y1: bodyY + bodyHeight, x2: x + width * .7, y2: y + height },
      { type: "text", x: x + width * .12, y: y + height * .16, value: label("main", "1A"), anchor: "start", fontSize: 11 },
    ];
  }
  if (object.kind === "hydraulic-valve-4-3") {
    const bodyX = x + width * .05; const bodyY = y + height * .2; const bodyWidth = width * .9; const bodyHeight = height * .6; const cell = bodyWidth / 3;
    const centerLeft = bodyX + cell; const centerRight = bodyX + cell * 2; const portA = cx - width * .075; const portB = cx + width * .075; const top = bodyY; const bottom = bodyY + bodyHeight;
    const cap = width * .035;
    return [
      { type: "rect", x: bodyX, y: bodyY, width: bodyWidth, height: bodyHeight, fill: "paper", strokeWidth: 2.4 },
      { type: "line", x1: centerLeft, y1: top, x2: centerLeft, y2: bottom },
      { type: "line", x1: centerRight, y1: top, x2: centerRight, y2: bottom },
      { type: "line", x1: portA, y1: y, x2: portA, y2: top },
      { type: "line", x1: portB, y1: y, x2: portB, y2: top },
      { type: "line", x1: portA, y1: bottom, x2: portA, y2: y + height },
      { type: "line", x1: portB, y1: bottom, x2: portB, y2: y + height },
      { type: "line", x1: bodyX + cell * .2, y1: bottom - bodyHeight * .12, x2: bodyX + cell * .2, y2: top + bodyHeight * .12, arrowEnd: true },
      { type: "line", x1: bodyX + cell * .8, y1: top + bodyHeight * .12, x2: bodyX + cell * .8, y2: bottom - bodyHeight * .12, arrowEnd: true },
      { type: "line", x1: centerRight + cell * .2, y1: bottom - bodyHeight * .12, x2: centerRight + cell * .8, y2: top + bodyHeight * .12, arrowEnd: true },
      { type: "line", x1: centerRight + cell * .2, y1: top + bodyHeight * .12, x2: centerRight + cell * .8, y2: bottom - bodyHeight * .12, arrowEnd: true },
      { type: "line", x1: portA, y1: top, x2: portA, y2: top + bodyHeight * .22 },
      { type: "line", x1: portA - cap, y1: top + bodyHeight * .22, x2: portA + cap, y2: top + bodyHeight * .22 },
      { type: "line", x1: portB, y1: top, x2: portB, y2: top + bodyHeight * .22 },
      { type: "line", x1: portB - cap, y1: top + bodyHeight * .22, x2: portB + cap, y2: top + bodyHeight * .22 },
      { type: "line", x1: portA, y1: bottom, x2: portA, y2: bottom - bodyHeight * .22 },
      { type: "line", x1: portA - cap, y1: bottom - bodyHeight * .22, x2: portA + cap, y2: bottom - bodyHeight * .22 },
      { type: "line", x1: portB, y1: bottom, x2: portB, y2: bottom - bodyHeight * .22 },
      { type: "line", x1: portB - cap, y1: bottom - bodyHeight * .22, x2: portB + cap, y2: bottom - bodyHeight * .22 },
      { type: "text", x: portA, y: y + height * .13, value: "A", anchor: "middle", fontSize: 10 },
      { type: "text", x: portB, y: y + height * .13, value: "B", anchor: "middle", fontSize: 10 },
      { type: "text", x: portA, y: y + height * .98, value: "P", anchor: "middle", fontSize: 10 },
      { type: "text", x: portB, y: y + height * .98, value: "T", anchor: "middle", fontSize: 10 },
      { type: "text", x: bodyX, y: y + height * .12, value: label("main", "1V"), anchor: "start", fontSize: 10 },
    ];
  }
  if (object.kind === "pressure-relief-valve") {
    const portX = x + width * .4; const boxX = x + width * .2; const boxY = y + height * .2; const boxWidth = width * .4; const boxHeight = height * .6; const springX = x + width * .72;
    const springPoints = Array.from({ length: 9 }, (_, index) => ({ x: springX + (index % 2 ? width * .055 : -width * .055), y: boxY + (boxHeight * index) / 8 }));
    return [
      { type: "line", x1: portX, y1: y, x2: portX, y2: boxY },
      { type: "rect", x: boxX, y: boxY, width: boxWidth, height: boxHeight, fill: "paper", strokeWidth: 2.4 },
      { type: "line", x1: portX, y1: boxY + boxHeight * .82, x2: portX, y2: boxY + boxHeight * .18, arrowEnd: true },
      { type: "line", x1: portX, y1: boxY + boxHeight, x2: portX, y2: y + height },
      { type: "polyline", points: springPoints },
      { type: "line", x1: springX - width * .12, y1: boxY + boxHeight * .82, x2: springX + width * .12, y2: boxY + boxHeight * .18, arrowEnd: true },
      { type: "text", x: x + width * .9, y: y + height * .92, value: label("main", "p_0"), anchor: "end", fontSize: 11 },
    ];
  }
  if (object.kind === "pneumatic-source") {
    const radius = Math.min(width, height) * .33;
    return [
      { type: "line", x1: cx, y1: y, x2: cx, y2: cy - radius },
      { type: "line", x1: x, y1: cy, x2: cx - radius, y2: cy },
      { type: "circle", cx, cy, r: radius, fill: "paper", strokeWidth: 2.4 },
      { type: "polyline", points: [{ x: cx, y: cy - radius * .78 }, { x: cx - radius * .46, y: cy + radius * .08 }, { x: cx + radius * .46, y: cy + radius * .08 }], closed: true, fill: "paper" },
      { type: "text", x: x + width * .88, y: y + height * .22, value: label("main", "0P1"), anchor: "end", fontSize: 11 },
    ];
  }
  if (object.kind === "pneumatic-service-unit" || object.kind === "pneumatic-frl") {
    const axisY = cy; const bodyX = x + width * .1; const bodyY = y + height * .18; const bodyWidth = width * .8; const bodyHeight = height * .58; const cellCount = object.kind === "pneumatic-frl" ? 3 : 2; const cell = bodyWidth / cellCount;
    const filterX = bodyX + cell * .5; const regulatorX = bodyX + cell * 1.5; const lubricatorX = bodyX + cell * 2.5; const gaugeY = y + height * .08;
    const springPoints = Array.from({ length: 7 }, (_, index) => ({ x: regulatorX + (index % 2 ? width * .025 : -width * .025), y: bodyY + (bodyHeight * index) / 6 }));
    return [
      { type: "line", x1: x, y1: axisY, x2: bodyX, y2: axisY },
      ...Array.from({ length: cellCount }, (_, index): ScientificPrimitive => ({ type: "rect", x: bodyX + cell * index, y: bodyY, width: cell, height: bodyHeight, fill: "paper" })),
      { type: "polyline", points: [{ x: filterX, y: bodyY + bodyHeight * .12 }, { x: bodyX + cell * .84, y: bodyY + bodyHeight * .5 }, { x: filterX, y: bodyY + bodyHeight * .88 }, { x: bodyX + cell * .16, y: bodyY + bodyHeight * .5 }], closed: true },
      { type: "line", x1: filterX, y1: bodyY + bodyHeight * .88, x2: filterX, y2: bodyY + bodyHeight },
      { type: "polyline", points: springPoints },
      { type: "line", x1: bodyX + cell * 1.2, y1: bodyY + bodyHeight * .8, x2: bodyX + cell * 1.8, y2: bodyY + bodyHeight * .2, arrowEnd: true },
      { type: "line", x1: regulatorX, y1: bodyY, x2: regulatorX, y2: gaugeY + height * .07 },
      { type: "circle", cx: regulatorX, cy: gaugeY, r: height * .07, fill: "paper" },
      ...(object.kind === "pneumatic-frl" ? [{ type: "polyline" as const, points: [{ x: lubricatorX, y: bodyY + bodyHeight * .24 }, { x: lubricatorX - cell * .13, y: bodyY + bodyHeight * .58 }, { x: lubricatorX + cell * .13, y: bodyY + bodyHeight * .58 }], closed: true, fill: "ink" as const }] : []),
      { type: "line", x1: bodyX + bodyWidth, y1: axisY, x2: x + width, y2: axisY },
      { type: "text", x: cx, y: y + height * .96, value: label("main", object.kind === "pneumatic-frl" ? "0Z2" : "0Z1"), anchor: "middle", fontSize: 11 },
    ];
  }
  if (object.kind === "pneumatic-valve-5-2") {
    const bodyX = x + width * .2; const bodyY = y + height * .2; const bodyWidth = width * .6; const bodyHeight = height * .58; const cell = bodyWidth / 2;
    const leftTopB = bodyX + cell * .25; const leftTopA = bodyX + cell * .75; const leftS = bodyX + cell * .17; const leftP = bodyX + cell * .5; const leftR = bodyX + cell * .83;
    const rightX = bodyX + cell; const rightTopB = rightX + cell * .25; const rightTopA = rightX + cell * .75; const rightS = rightX + cell * .17; const rightP = rightX + cell * .5; const rightR = rightX + cell * .83;
    const top = bodyY; const bottom = bodyY + bodyHeight; const springStart = bodyX + bodyWidth; const springEnd = x + width * .95;
    const springPoints = Array.from({ length: 9 }, (_, index) => ({ x: springStart + ((springEnd - springStart) * index) / 8, y: cy + (index % 2 ? -height * .07 : height * .07) }));
    return [
      { type: "rect", x: bodyX, y: bodyY, width: bodyWidth, height: bodyHeight, fill: "paper", strokeWidth: 2.4 },
      { type: "line", x1: bodyX + cell, y1: top, x2: bodyX + cell, y2: bottom },
      { type: "line", x1: x, y1: cy, x2: x + width * .05, y2: cy },
      { type: "rect", x: x + width * .05, y: cy - height * .12, width: bodyX - x - width * .05, height: height * .24, fill: "paper" },
      { type: "line", x1: x + width * .05, y1: cy + height * .12, x2: bodyX, y2: cy - height * .12 },
      { type: "polyline", points: springPoints },
      { type: "line", x1: rightTopA, y1: y, x2: rightTopA, y2: top },
      { type: "line", x1: rightTopB, y1: y, x2: rightTopB, y2: top },
      { type: "line", x1: rightR, y1: bottom, x2: rightR, y2: y + height },
      { type: "line", x1: rightP, y1: bottom, x2: rightP, y2: y + height },
      { type: "line", x1: rightS, y1: bottom, x2: rightS, y2: y + height },
      { type: "line", x1: leftP, y1: bottom - bodyHeight * .12, x2: leftTopB, y2: top + bodyHeight * .12, arrowEnd: true },
      { type: "line", x1: leftTopA, y1: top + bodyHeight * .12, x2: leftR, y2: bottom - bodyHeight * .12, arrowEnd: true },
      { type: "line", x1: rightP, y1: bottom - bodyHeight * .12, x2: rightTopA, y2: top + bodyHeight * .12, arrowEnd: true },
      { type: "line", x1: rightTopB, y1: top + bodyHeight * .12, x2: rightS, y2: bottom - bodyHeight * .12, arrowEnd: true },
      { type: "line", x1: leftS - width * .025, y1: bottom - bodyHeight * .12, x2: leftS + width * .025, y2: bottom - bodyHeight * .12 },
      { type: "line", x1: rightR - width * .025, y1: bottom - bodyHeight * .12, x2: rightR + width * .025, y2: bottom - bodyHeight * .12 },
      { type: "text", x: rightTopB, y: y + height * .13, value: "4 (B)", anchor: "middle", fontSize: 9 },
      { type: "text", x: rightTopA, y: y + height * .13, value: "2 (A)", anchor: "middle", fontSize: 9 },
      { type: "text", x: rightS, y: y + height * .98, value: "5 (S)", anchor: "middle", fontSize: 9 },
      { type: "text", x: rightP, y: y + height * .98, value: "1 (P)", anchor: "middle", fontSize: 9 },
      { type: "text", x: rightR, y: y + height * .98, value: "3 (R)", anchor: "middle", fontSize: 9 },
      { type: "text", x: bodyX, y: y + height * .12, value: label("main", "1V1"), anchor: "start", fontSize: 10 },
      { type: "text", x: x + width * .03, y: y + height * .18, value: label("actuator", "1M1"), anchor: "start", fontSize: 9 },
    ];
  }
  if (object.kind === "one-way-flow-control") {
    const left = x + width * .12; const right = x + width * .88; const topY = y + height * .32; const bottomY = y + height * .68;
    return [
      { type: "line", x1: x, y1: cy, x2: left, y2: cy },
      { type: "line", x1: left, y1: topY, x2: left, y2: bottomY },
      { type: "line", x1: right, y1: topY, x2: right, y2: bottomY },
      { type: "line", x1: right, y1: cy, x2: x + width, y2: cy },
      { type: "line", x1: left, y1: topY, x2: x + width * .42, y2: topY },
      { type: "polyline", points: [{ x: x + width * .42, y: y + height * .2 }, { x: x + width * .48, y: topY }, { x: x + width * .42, y: y + height * .44 }] },
      { type: "polyline", points: [{ x: x + width * .58, y: y + height * .2 }, { x: x + width * .52, y: topY }, { x: x + width * .58, y: y + height * .44 }] },
      { type: "line", x1: x + width * .58, y1: topY, x2: right, y2: topY },
      { type: "line", x1: x + width * .38, y1: y + height * .48, x2: x + width * .62, y2: y + height * .16, arrowEnd: true },
      { type: "line", x1: left, y1: bottomY, x2: x + width * .42, y2: bottomY },
      { type: "circle", cx: x + width * .46, cy: bottomY, r: Math.min(width, height) * .045, fill: "paper" },
      { type: "polyline", points: [{ x: x + width * .56, y: y + height * .57 }, { x: x + width * .5, y: bottomY }, { x: x + width * .56, y: y + height * .79 }] },
      { type: "line", x1: x + width * .56, y1: bottomY, x2: right, y2: bottomY },
      { type: "text", x: cx, y: y + height * .98, value: label("main", "1V2"), anchor: "middle", fontSize: 10 },
    ];
  }
  if (object.kind === "pneumatic-exhaust") {
    const apexY = y + height * .78; const shoulderY = y + height * .38;
    return [
      { type: "line", x1: cx, y1: y, x2: cx, y2: shoulderY },
      { type: "polyline", points: [{ x: x + width * .2, y: shoulderY }, { x: cx, y: apexY }, { x: x + width * .8, y: shoulderY }] },
      { type: "line", x1: x + width * .28, y1: y + height * .88, x2: x + width * .4, y2: y + height * .72 },
      { type: "line", x1: x + width * .48, y1: y + height * .92, x2: x + width * .6, y2: y + height * .76 },
      { type: "line", x1: x + width * .68, y1: y + height * .88, x2: x + width * .8, y2: y + height * .72 },
    ];
  }
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
  if (object.kind === "laplace-rails") {
    const velocity = label("velocity", "v").trim(); const current = label("current", "i").trim(); const field = label("field", "B").trim(); const force = label("force", "F_L").trim(); const barX = x + width * .55; const topY = y + height * .25; const bottomY = y + height * .75; const scene: ScientificPrimitive[] = [
      { type: "line", x1: x + 5, y1: topY, x2: x + width - 5, y2: topY, strokeWidth: 2 },
      { type: "line", x1: x + 5, y1: bottomY, x2: x + width - 5, y2: bottomY, strokeWidth: 2 },
      { type: "line", x1: barX, y1: topY, x2: barX, y2: bottomY, strokeWidth: 4 },
      { type: "line", x1: x + width * .18, y1: topY - 10, x2: x + width * .42, y2: topY - 10, arrowEnd: true },
      { type: "line", x1: barX + 9, y1: topY + 8, x2: barX + 9, y2: bottomY - 8, arrowEnd: true },
      { type: "text", x: x + width * .3, y: topY - 17, value: current, anchor: "middle", fontSize: 9 },
      { type: "line", x1: barX + width * .06, y1: cy - 12, x2: x + width * .86, y2: cy - 12, arrowEnd: true, strokeWidth: 1.8 },
      { type: "text", x: x + width * .88, y: cy - 18, value: force, anchor: "end", fontSize: 10, vector: true },
      { type: "line", x1: barX + width * .06, y1: cy + 14, x2: x + width * .83, y2: cy + 14, arrowEnd: true, dashed: true },
      { type: "text", x: x + width * .87, y: cy + 20, value: velocity, anchor: "end", fontSize: 10, vector: true },
    ];
    for (let row = 0; row < 2; row += 1) for (let column = 0; column < 4; column += 1) scene.push(...fieldGlyphScene("magnétique", "entrant", x + width * (.14 + column * .2), y + height * (.39 + row * .22), 9));
    scene.push({ type: "text", x: x + width * .12, y: cy + 5, value: field, anchor: "middle", fontSize: 11, vector: true });
    return scene;
  }
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
  if (object.kind === "transformer") {
    const top = y + height * .25; const bottom = y + height * .75; const turns = 4; const step = (bottom - top) / turns;
    const leftCoilX = x + width * .39; const rightCoilX = x + width * .61; const bulge = width * .055;
    const winding = (coilX: number, direction: -1 | 1): ScientificPrimitive[] => Array.from({ length: turns }, (_, index) => {
      const startY = top + index * step; const endY = startY + step;
      return { type: "bezier", start: { x: coilX, y: startY }, control1: { x: coilX + direction * bulge, y: startY + step * .22 }, control2: { x: coilX + direction * bulge, y: endY - step * .22 }, end: { x: coilX, y: endY } };
    });
    return [
      { type: "line", x1: x, y1: top, x2: leftCoilX, y2: top },
      ...winding(leftCoilX, 1),
      { type: "line", x1: leftCoilX, y1: bottom, x2: x, y2: bottom },
      { type: "line", x1: x + width, y1: top, x2: rightCoilX, y2: top },
      ...winding(rightCoilX, -1),
      { type: "line", x1: rightCoilX, y1: bottom, x2: x + width, y2: bottom },
      { type: "line", x1: x + width * .47, y1: y + height * .2, x2: x + width * .47, y2: y + height * .8, strokeWidth: 2.4 },
      { type: "line", x1: x + width * .53, y1: y + height * .2, x2: x + width * .53, y2: y + height * .8, strokeWidth: 2.4 },
      { type: "text", x: x + width * .25, y: y + height * .91, value: label("primary", "N_1"), anchor: "middle", fontSize: 13 },
      { type: "text", x: x + width * .75, y: y + height * .91, value: label("secondary", "N_2"), anchor: "middle", fontSize: 13 },
    ];
  }
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
  if (primitive.technical) return `{\\sffamily ${escapeLatex(primitive.value)}}`;
  if (primitive.latex) return `$${primitive.latex}$`;
  if (primitive.math === "raw") return escapeLatex(primitive.value);
  if (primitive.math === false) return `\\text{${escapeLatex(primitive.value)}}`;
  const scientific = scientificLabelToLatex(primitive.value, primitive.vector);
  return primitive.roman && scientific.startsWith("$") && scientific.endsWith("$") ? `$\\mathrm{${scientific.slice(1, -1)}}$` : scientific;
};
const labelNodeOptions = (primitive: Extract<ScientificPrimitive, { type: "text" }>) => {
  const anchor = primitive.anchor === "start" ? "base west" : primitive.anchor === "end" ? "base east" : "base";
  const options = [`anchor=${anchor}`, "inner sep=0pt", "outer sep=0pt"];
  if (primitive.fontSize !== undefined && primitive.fontSize !== 14) {
    const size = canvasUnitsToPoints(primitive.fontSize); const leading = size * 1.2;
    options.push(`font=\\fontsize{${size.toFixed(2)}pt}{${leading.toFixed(2)}pt}\\selectfont`);
  }
  return options.join(",");
};
const widthOption = (strokeWidth?: number) => strokeWidth === undefined ? "" : `line width=${tikzStrokeWidth(strokeWidth).toFixed(2)}pt`;
const drawOptions = (...options: Array<string | undefined>) => { const kept = options.filter(Boolean); return kept.length ? `[${kept.join(",")}]` : ""; };
const dashOption = (primitive: { dashed?: boolean; dashArray?: number[] }) => primitive.dashArray?.length
  ? `dash pattern=${primitive.dashArray.map((length, index) => `${index % 2 ? "off" : "on"} ${canvasUnitsToPoints(length).toFixed(2)}pt`).join(" ")}`
  : primitive.dashed ? "dashed" : undefined;

export function scientificSceneToTikz(scene: ScientificPrimitive[]): string {
  return scene.map((primitive) => {
    if (primitive.type === "line") return `\\draw${drawOptions(primitive.arrowEnd ? "-{Latex}" : undefined, dashOption(primitive), widthOption(primitive.strokeWidth))} ${point(primitive.x1, primitive.y1)} -- ${point(primitive.x2, primitive.y2)};`;
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
      const rounded = primitive.rx ? `rounded corners=${value(primitive.rx)}cm` : undefined;
      return `\\draw${drawOptions(fill, rounded, widthOption(primitive.strokeWidth))} ${point(primitive.x, primitive.y)} rectangle ${point(primitive.x + primitive.width, primitive.y + primitive.height)};`;
    }
    if (primitive.type === "polyline") {
      const fill = primitive.fill === "paper" ? "fill=white" : primitive.fill === "light" ? "fill=gray!12" : primitive.fill === "ink" ? "fill=black" : undefined; const path = primitive.points.map((value) => point(value.x, value.y)).join(" -- ");
      return `\\draw${drawOptions(fill, dashOption(primitive), widthOption(primitive.strokeWidth))} ${path}${primitive.closed ? " -- cycle" : ""};`;
    }
    if (primitive.type === "bezier") return `\\draw${drawOptions(primitive.arrowEnd ? "-{Latex}" : undefined, primitive.dashed ? "dashed" : undefined, widthOption(primitive.strokeWidth))} ${point(primitive.start.x, primitive.start.y)} .. controls ${point(primitive.control1.x, primitive.control1.y)} and ${point(primitive.control2.x, primitive.control2.y)} .. ${point(primitive.end.x, primitive.end.y)};`;
    if (primitive.type === "arc") {
      const startX = primitive.cx + Math.cos((primitive.start * Math.PI) / 180) * primitive.r; const startY = primitive.cy + Math.sin((primitive.start * Math.PI) / 180) * primitive.r;
      return `\\draw${drawOptions(primitive.arrowEnd ? "-{Latex}" : undefined, widthOption(primitive.strokeWidth))} ${point(startX, startY)} arc[start angle=${-primitive.start},end angle=${-primitive.end},radius=${value(primitive.r)}cm];`;
    }
    return `\\node[${labelNodeOptions(primitive)}] at ${point(primitive.x, primitive.y)} {${labelLatex(primitive)}};`;
  }).join("\n");
}
