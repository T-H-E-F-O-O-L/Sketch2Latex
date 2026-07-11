import type { CanvasObject } from "./canvas-types";

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

function pathForExpression(object: CanvasObject, expression: string): string | undefined {
  const graph = object.graph; const width = object.width ?? 0; const height = object.height ?? 0;
  if (!graph || width <= 0 || height <= 0 || !(graph.xMax > graph.xMin)) return undefined;
  const evaluate = compileExpression(expression);
  if (!evaluate) return undefined;

  const yMin = graph.yMin ?? -5; const yMax = graph.yMax ?? 5;
  if (!(yMax > yMin)) return undefined;
  const samples = 180; let drawing = false; const path: string[] = [];
  for (let index = 0; index <= samples; index += 1) {
    const ratio = index / samples; const xValue = graph.xMin + (graph.xMax - graph.xMin) * ratio; const value = evaluate(xValue);
    if (value === undefined || Math.abs(value) > 1_000_000) { drawing = false; continue; }
    const x = object.x + width * ratio; const y = object.y + height * (yMax - value) / (yMax - yMin);
    path.push(`${drawing ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`); drawing = true;
  }
  return path.length ? path.join(" ") : undefined;
}

export function graphPathsFor(object: CanvasObject): string[] {
  const expressions = object.graph?.expressions?.length ? object.graph.expressions : object.graph?.expression ? [object.graph.expression] : [];
  return expressions.map((expression) => pathForExpression(object, expression)).filter((path): path is string => Boolean(path));
}

export function graphPathFor(object: CanvasObject): string | undefined {
  return graphPathsFor(object)[0];
}
