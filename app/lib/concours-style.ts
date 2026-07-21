import type { StrokePattern } from "./canvas-types";

/** Shared print geometry for the canvas, SVG/PDF export and generated TikZ. */
export const CANVAS_UNITS_PER_CM = 50;
export const POINTS_PER_CM = 72 / 2.54;
export const DEFAULT_CANVAS_STROKE = 2;
export const CONCOURS_INK = "#111111";
export const CONCOURS_LIGHT_FILL = "#e0e0e0";
export const CONCOURS_GRAPH_GRID_PERCENT = 14;
export const CONCOURS_DASH = { on: 7, off: 5 } as const;
export const CONCOURS_ARROW = { length: 8, width: 5.3 } as const;
export const CONCOURS_LABEL_SIZE = 14;
export const CONCOURS_CONNECTOR_LABEL_OFFSET = 9;

export const canvasUnitsToCentimeters = (value: number) => value / CANVAS_UNITS_PER_CM;
export const canvasUnitsToPoints = (value: number) => canvasUnitsToCentimeters(value) * POINTS_PER_CM;
export const tikzStrokeWidth = (value = DEFAULT_CANVAS_STROKE) => canvasUnitsToPoints(Math.max(1, value));

const pt = (value: number) => `${value.toFixed(2)}pt`;

export const TIKZ_NORMAL_STROKE = pt(tikzStrokeWidth(DEFAULT_CANVAS_STROKE));
export const TIKZ_DASH_PATTERN = `on ${pt(canvasUnitsToPoints(CONCOURS_DASH.on))} off ${pt(canvasUnitsToPoints(CONCOURS_DASH.off))}`;
export const SVG_STROKE_PATTERNS: Record<StrokePattern, string | undefined> = {
  solid: undefined,
  dashed: `${CONCOURS_DASH.on} ${CONCOURS_DASH.off}`,
  dotted: "1 4",
  "dash-dot": `${CONCOURS_DASH.on} 3 1 3`,
};
export const TIKZ_STROKE_PATTERNS: Record<StrokePattern, string | undefined> = {
  solid: undefined,
  dashed: `dash pattern=${TIKZ_DASH_PATTERN}`,
  dotted: "densely dotted",
  "dash-dot": "dash dot",
};
export const TIKZ_ARROW_TIP = `Latex[length=${pt(canvasUnitsToPoints(CONCOURS_ARROW.length))},width=${pt(canvasUnitsToPoints(CONCOURS_ARROW.width))}]`;
export const TIKZ_LABEL_SIZE = pt(canvasUnitsToPoints(CONCOURS_LABEL_SIZE));

export const EXPORTED_SVG_STYLE = `
.diagram-object { stroke-linecap: round; stroke-linejoin: round; }
text { font-family: KaTeX_Main, "Latin Modern Roman", "CMU Serif", "Times New Roman", serif; font-weight: 400; }
.diagram-label { font-size: ${CONCOURS_LABEL_SIZE}px; font-style: italic; font-weight: 400; paint-order: stroke; stroke: #fff; stroke-width: 2px; }
.diagram-text { font-style: normal; font-weight: 400; paint-order: stroke; stroke: #fff; stroke-width: 2px; }
.diagram-technical-label { font-family: "CMU Sans Serif", "Latin Modern Sans", Arial, Helvetica, sans-serif; font-style: normal; font-weight: 400; paint-order: stroke; stroke: #fff; stroke-width: 2px; }
.diagram-sign { font-size: 17px; font-weight: 400; paint-order: stroke; stroke: #fff; stroke-width: 2px; }
.diagram-output-label { font-size: 13px; font-style: italic; paint-order: stroke; stroke: #fff; stroke-width: 2px; }
`;
