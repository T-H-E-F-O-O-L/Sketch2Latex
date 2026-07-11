import type { DocumentSettings } from "./canvas-types";

export type WorkingUnit = DocumentSettings["unit"];

const PIXELS_PER_CM = 50;

export function pixelsPerUnit(unit: WorkingUnit): number {
  if (unit === "mm") return PIXELS_PER_CM / 10;
  if (unit === "pt") return PIXELS_PER_CM / 28.3464567;
  return PIXELS_PER_CM;
}

export function toWorkingUnit(pixels: number, unit: WorkingUnit): number {
  return Math.round((pixels / pixelsPerUnit(unit)) * 1000) / 1000;
}

export function fromWorkingUnit(value: number, unit: WorkingUnit): number {
  return Math.round(value * pixelsPerUnit(unit) * 1000) / 1000;
}

export function unitLabel(unit: WorkingUnit): string {
  return unit === "tikz" ? "u TikZ" : unit;
}
