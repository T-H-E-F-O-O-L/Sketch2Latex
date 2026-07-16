import type { CanvasObject, ConnectionPortName, ObjectKind, Point } from "./canvas-types";

export type ConnectionPort = Point & { name: ConnectionPortName };

export const JUNCTION_RADIUS = 3;

export const electricalTerminalKinds: ObjectKind[] = [
  "wire", "resistor", "capacitor", "inductor", "battery", "voltage-source", "current-source", "switch", "voltmeter", "ammeter",
  "transformer",
];

function centerFor(object: CanvasObject): Point {
  if (object.kind === "transformer") return { x: object.x + (object.width ?? 0) / 2, y: object.y + (object.height ?? 0) / 2 };
  if (electricalTerminalKinds.includes(object.kind)) return { x: (object.x + (object.x2 ?? object.x)) / 2, y: (object.y + (object.y2 ?? object.y)) / 2 };
  return { x: object.x + (object.width ?? 0) / 2, y: object.y + (object.height ?? 0) / 2 };
}

function transformPoint(object: CanvasObject, point: Point): Point {
  const center = centerFor(object); const angle = ((object.rotation ?? 0) * Math.PI) / 180;
  const scaleX = object.scaleX ?? object.scale ?? 1; const scaleY = object.scaleY ?? object.scale ?? 1;
  const dx = (point.x - center.x) * scaleX; const dy = (point.y - center.y) * scaleY;
  return { x: center.x + dx * Math.cos(angle) - dy * Math.sin(angle), y: center.y + dx * Math.sin(angle) + dy * Math.cos(angle) };
}

function localPorts(object: CanvasObject): ConnectionPort[] {
  if (object.kind === "transformer") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "primary-top", x: object.x, y: object.y + height * .25 },
      { name: "primary-bottom", x: object.x, y: object.y + height * .75 },
      { name: "secondary-top", x: object.x + width, y: object.y + height * .25 },
      { name: "secondary-bottom", x: object.x + width, y: object.y + height * .75 },
    ];
  }
  if (electricalTerminalKinds.includes(object.kind)) return [
    { name: "start", x: object.x, y: object.y },
    { name: "end", x: object.x2 ?? object.x, y: object.y2 ?? object.y },
  ];
  const width = object.width ?? 0; const height = object.height ?? 0;
  if (object.kind === "ground") return [{ name: "ground", x: object.x + width / 2, y: object.y }];
  if (object.kind.startsWith("op-amp")) return [
    { name: "inverting", x: object.x + width * .04, y: object.y + height * .37 },
    { name: "non-inverting", x: object.x + width * .04, y: object.y + height * .66 },
    { name: "output", x: object.x + width * .96, y: object.y + height * .5 },
  ];
  return [];
}

export function portsFor(object: CanvasObject): ConnectionPort[] {
  return localPorts(object).map((port) => ({ ...transformPoint(object, port), name: port.name }));
}

export function portFor(object: CanvasObject, name?: ConnectionPortName, toward?: Point): ConnectionPort | undefined {
  const ports = portsFor(object);
  if (name) return ports.find((port) => port.name === name);
  if (!toward) return ports[0];
  return ports.toSorted((a, b) => Math.hypot(a.x - toward.x, a.y - toward.y) - Math.hypot(b.x - toward.x, b.y - toward.y))[0];
}

export function pointOnWireAt(object: CanvasObject, ratio: number): Point | undefined {
  if (object.kind !== "wire") return undefined;
  const start = portFor(object, "start"); const end = portFor(object, "end");
  if (!start || !end) return undefined;
  const value = Math.min(1, Math.max(0, ratio));
  return { x: start.x + (end.x - start.x) * value, y: start.y + (end.y - start.y) * value };
}

export function junctionPointsFor(objects: CanvasObject[], tolerance = .75): Point[] {
  const clusters: Array<{ point: Point; count: number }> = [];
  for (const object of objects) {
    if (object.hidden || !electricalTerminalKinds.includes(object.kind)) continue;
    for (const port of portsFor(object)) {
      const cluster = clusters.find((value) => Math.hypot(value.point.x - port.x, value.point.y - port.y) <= tolerance);
      if (cluster) {
        cluster.point = { x: (cluster.point.x * cluster.count + port.x) / (cluster.count + 1), y: (cluster.point.y * cluster.count + port.y) / (cluster.count + 1) };
        cluster.count += 1;
      } else clusters.push({ point: { x: port.x, y: port.y }, count: 1 });
    }
  }
  const lookup = new Map(objects.map((object) => [object.id, object])); const forced: Point[] = [];
  for (const object of objects) {
    if (object.hidden || !object.bindings) continue;
    for (const endpoint of ["start", "end"] as const) {
      const port = object.bindings[`${endpoint}Port`]; const id = object.bindings[`${endpoint}Id`]; const ratio = object.bindings[`${endpoint}Ratio`];
      if (port !== "segment" || id === undefined || ratio === undefined) continue;
      const target = lookup.get(id); const point = target && !target.hidden ? pointOnWireAt(target, ratio) : undefined;
      if (point && !forced.some((value) => Math.hypot(value.x - point.x, value.y - point.y) <= tolerance)) forced.push(point);
    }
  }
  const junctions = clusters.filter((cluster) => cluster.count >= 3).map((cluster) => cluster.point);
  return [...junctions, ...forced.filter((point) => !junctions.some((value) => Math.hypot(value.x - point.x, value.y - point.y) <= tolerance))];
}
