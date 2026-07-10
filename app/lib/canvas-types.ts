export type ObjectKind =
  | "freehand"
  | "line"
  | "arrow"
  | "rect"
  | "circle"
  | "ellipse"
  | "text"
  | "axes"
  | "resistor"
  | "battery"
  | "capacitor"
  | "wire"
  | "spring"
  | "force"
  | "bond-single"
  | "bond-double"
  | "bond-triple"
  | "reaction-arrow"
  | "beaker"
  | "flask"
  | "test-tube"
  | "pulley"
  | "lens";

export type Point = { x: number; y: number };

export type CanvasObject = {
  id: string;
  kind: ObjectKind;
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  width?: number;
  height?: number;
  rotation?: number;
  points?: Point[];
  text?: string;
  style?: { stroke?: string; strokeWidth?: number; fill?: string };
  graph?: { expression: string; xMin: number; xMax: number };
};

export const connectorKinds: ObjectKind[] = [
  "line", "arrow", "resistor", "battery", "capacitor", "wire", "spring",
  "force", "bond-single", "bond-double", "bond-triple", "reaction-arrow",
];

export const stampKinds: ObjectKind[] = ["beaker", "flask", "test-tube", "pulley", "lens"];

export const labels: Record<ObjectKind, string> = {
  freehand: "Pen", line: "Line", arrow: "Arrow", rect: "Rectangle", circle: "Circle",
  ellipse: "Ellipse", text: "Text", axes: "Axes", resistor: "Resistor", battery: "Battery",
  capacitor: "Capacitor", wire: "Wire", spring: "Spring", force: "Force vector",
  "bond-single": "Single bond", "bond-double": "Double bond", "bond-triple": "Triple bond",
  "reaction-arrow": "Reaction arrow", beaker: "Beaker", flask: "Flask", "test-tube": "Test tube",
  pulley: "Pulley", lens: "Lens",
};
