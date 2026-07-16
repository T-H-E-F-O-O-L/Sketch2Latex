import type { CanvasObject, Point } from "./canvas-types";
import { canvasUnitsToPoints } from "./concours-style";

const functions = ["sin", "cos", "tan", "asin", "acos", "atan", "sinh", "cosh", "tanh", "sqrt", "abs", "exp"];
const allowedNames = new Set(["x", "pi", "e", "deg", "ln", "log", ...functions]);

type Evaluator = (x: number) => number | undefined;

function compileExpression(expression: string): Evaluator | undefined {
  const source = expression.trim().toLowerCase().replaceAll("π", "pi").replace(/\s+/g, "");
  if (!source || /[^0-9a-z+\-*/^().,]/.test(source)) return undefined;
  const names = source.match(/[a-z]+/g) ?? [];
  if (names.some((name) => !allowedNames.has(name))) return undefined;

  const normalized = source
    .replace(/\^/g, "**")
    .replace(/\bln\b/g, "Math.log")
    .replace(/\blog\b/g, "Math.log10")
    .replace(new RegExp(`\\b(${functions.join("|")})\\b`, "g"), "Math.$1")
    .replace(/\bdeg\b/g, "identity")
    .replace(/\bpi\b/g, "Math.PI")
    .replace(/\be\b/g, "Math.E");
  try {
    // The expression is limited to validated numeric tokens and whitelisted functions above.
    const formula = new Function("x", "identity", `"use strict"; return (${normalized});`) as (x: number, identity: (value: number) => number) => unknown;
    return (x) => {
      try {
        const value = formula(x, (input) => input);
        return typeof value === "number" && Number.isFinite(value) ? value : undefined;
      } catch { return undefined; }
    };
  } catch { return undefined; }
}

function segmentsForExpression(object: CanvasObject, expression: string): Point[][] | undefined {
  const graph = object.graph; const width = object.width ?? 0; const height = object.height ?? 0;
  if (!graph || width <= 0 || height <= 0 || !(graph.xMax > graph.xMin)) return undefined;
  const evaluate = compileExpression(expression);
  if (!evaluate) return undefined;

  const yMin = graph.yMin ?? -5; const yMax = graph.yMax ?? 5;
  if (!(yMax > yMin)) return undefined;
  const samples = 240; const segments: Point[][] = []; let segment: Point[] = [];
  for (let index = 0; index <= samples; index += 1) {
    const ratio = index / samples; const xValue = graph.xMin + (graph.xMax - graph.xMin) * ratio; const value = evaluate(xValue);
    if (value === undefined || value < yMin || value > yMax) { if (segment.length > 1) segments.push(segment); segment = []; continue; }
    const x = object.x + width * ratio; const y = object.y + height * (yMax - value) / (yMax - yMin);
    const previous = segment.at(-1);
    if (previous && Math.abs(previous.y - y) > height * .45) { if (segment.length > 1) segments.push(segment); segment = []; }
    segment.push({ x, y });
  }
  if (segment.length > 1) segments.push(segment);
  return segments.length ? segments : undefined;
}

const GRAPH_PATTERN_SEGMENTS = [undefined, [8, 4], [2, 3], [10, 3, 2, 3]] as const;
export const GRAPH_CANVAS_DASHES = GRAPH_PATTERN_SEGMENTS.map((pattern) => pattern?.join(" "));
export const GRAPH_TIKZ_STYLES = GRAPH_PATTERN_SEGMENTS.map((pattern) => pattern ? `dash pattern=${pattern.map((length, index) => `${index % 2 ? "off" : "on"} ${canvasUnitsToPoints(length).toFixed(2)}pt`).join(" ")}` : "solid");

export function graphPointSetsFor(object: CanvasObject): Point[][][] {
  const expressions = object.graph?.expressions?.length ? object.graph.expressions : object.graph?.expression ? [object.graph.expression] : [];
  return expressions.map((expression) => segmentsForExpression(object, expression) ?? []).filter((segments) => segments.length > 0);
}

export function graphPathsFor(object: CanvasObject): string[] {
  return graphPointSetsFor(object).map((segments) => segments.map((segment) => segment.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ")).join(" "));
}

export function graphPathFor(object: CanvasObject): string | undefined {
  return graphPathsFor(object)[0];
}
