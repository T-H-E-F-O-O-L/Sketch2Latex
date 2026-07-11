import type { CanvasObject, ObjectKind, Point } from "./canvas-types";

export type AopConfiguration = Extract<ObjectKind, "op-amp-inverting" | "op-amp-non-inverting" | "op-amp-summing" | "op-amp-integrator" | "op-amp-differentiator" | "op-amp-schmitt">;

const id = () => Math.random().toString(36).slice(2, 10);
export const isCompleteAopConfiguration = (kind: ObjectKind): kind is AopConfiguration => ["op-amp-inverting", "op-amp-non-inverting", "op-amp-summing", "op-amp-integrator", "op-amp-differentiator", "op-amp-schmitt"].includes(kind);

export function makeAopCircuit(kind: AopConfiguration, center: Point, style: CanvasObject["style"]): CanvasObject[] {
  const groupId = `aop-${id()}`; const x = center.x - 55; const y = center.y - 52; const w = 150; const h = 105;
  const minus = { x: x + w * .28, y: y + h * .37 }; const plus = { x: x + w * .28, y: y + h * .66 }; const output = { x: x + w * .96, y: y + h / 2 };
  const make = (object: Omit<CanvasObject, "id" | "groupId">): CanvasObject => ({ id: id(), groupId, style, ...object });
  const base = make({ kind: "op-amp", x, y, width: w, height: h });
  const resistor = (x1: number, y1: number, x2: number, y2: number, name: string) => make({ kind: "resistor", x: x1, y: y1, x2, y2, annotations: { main: name } });
  const capacitor = (x1: number, y1: number, x2: number, y2: number, name: string) => make({ kind: "capacitor", x: x1, y: y1, x2, y2, annotations: { main: name } });
  const wire = (x1: number, y1: number, x2: number, y2: number) => make({ kind: "wire", x: x1, y: y1, x2, y2 });
  const label = (px: number, py: number, text: string) => make({ kind: "text", x: px, y: py, text });
  const feedbackY = y - 34; const inputX = x - 150;
  const common = [base, label(inputX - 12, minus.y - 10, "vₑ"), label(output.x + 18, output.y - 10, "vₛ")];

  if (kind === "op-amp-inverting") return [...common, resistor(inputX, minus.y, minus.x, minus.y, "R₁"), wire(plus.x, plus.y, plus.x - 32, plus.y), make({ kind: "ground", x: plus.x - 54, y: plus.y - 5, width: 44, height: 42 }), wire(minus.x, minus.y, minus.x, feedbackY), resistor(minus.x, feedbackY, output.x, feedbackY, "R₂"), wire(output.x, feedbackY, output.x, output.y)];
  if (kind === "op-amp-non-inverting") return [...common, wire(inputX, plus.y, plus.x, plus.y), resistor(minus.x, minus.y, minus.x - 85, minus.y, "R₁"), make({ kind: "ground", x: minus.x - 107, y: minus.y - 5, width: 44, height: 42 }), wire(minus.x, minus.y, minus.x, feedbackY), resistor(minus.x, feedbackY, output.x, feedbackY, "R₂"), wire(output.x, feedbackY, output.x, output.y)];
  if (kind === "op-amp-summing") return [...common, resistor(inputX, minus.y - 32, minus.x, minus.y, "R₁"), resistor(inputX, minus.y, minus.x, minus.y, "R₂"), resistor(inputX, minus.y + 32, minus.x, minus.y, "R₃"), wire(plus.x, plus.y, plus.x - 32, plus.y), make({ kind: "ground", x: plus.x - 54, y: plus.y - 5, width: 44, height: 42 }), wire(minus.x, minus.y, minus.x, feedbackY), resistor(minus.x, feedbackY, output.x, feedbackY, "R_f"), wire(output.x, feedbackY, output.x, output.y)];
  if (kind === "op-amp-integrator") return [...common, resistor(inputX, minus.y, minus.x, minus.y, "R"), wire(plus.x, plus.y, plus.x - 32, plus.y), make({ kind: "ground", x: plus.x - 54, y: plus.y - 5, width: 44, height: 42 }), wire(minus.x, minus.y, minus.x, feedbackY), capacitor(minus.x, feedbackY, output.x, feedbackY, "C"), wire(output.x, feedbackY, output.x, output.y)];
  if (kind === "op-amp-differentiator") return [...common, capacitor(inputX, minus.y, minus.x, minus.y, "C"), wire(plus.x, plus.y, plus.x - 32, plus.y), make({ kind: "ground", x: plus.x - 54, y: plus.y - 5, width: 44, height: 42 }), wire(minus.x, minus.y, minus.x, feedbackY), resistor(minus.x, feedbackY, output.x, feedbackY, "R"), wire(output.x, feedbackY, output.x, output.y)];
  return [...common, wire(inputX, minus.y, minus.x, minus.y), resistor(plus.x - 110, plus.y, plus.x, plus.y, "R₁"), make({ kind: "ground", x: plus.x - 132, y: plus.y - 5, width: 44, height: 42 }), wire(plus.x, plus.y, plus.x, feedbackY), resistor(plus.x, feedbackY, output.x, feedbackY, "R₂"), wire(output.x, feedbackY, output.x, output.y)];
}
