import type { CanvasObject, ConnectionPortName, ObjectKind, Point } from "./canvas-types";

export type ConnectionPort = Point & { name: ConnectionPortName };

export const JUNCTION_RADIUS = 3;

export const electricalTerminalKinds: ObjectKind[] = [
  "wire", "resistor", "capacitor", "inductor", "battery", "voltage-source", "current-source", "switch", "voltmeter", "ammeter",
  "transformer",
];

/** Straight segments that may carry a semantic leader attachment. Electrical junctions remain wire-only. */
export const segmentBindableKinds: ObjectKind[] = ["wire", "line", "dashed-line", "hidden-edge", "centre-line"];

const sysmlConnectorKinds: ObjectKind[] = [
  "sysml-requirement-link", "sysml-structural-link", "sysml-connector", "sysml-item-flow",
];

const waveEndpointKinds: ObjectKind[] = ["wave-path", "standing-wave"];

const chemistryConnectorKinds: ObjectKind[] = [
  "bond-wedge-solid", "bond-wedge-hashed", "bond-wavy", "electron-pair-arrow", "single-electron-arrow", "mesomeric-arrow",
];

const controlAnalysisConnectorKinds: ObjectKind[] = ["bode-break", "bode-slope", "performance-marker"];

const thermodynamicConnectorKinds: ObjectKind[] = ["thermo-process"];

const electromagneticConnectorKinds: ObjectKind[] = ["charged-particle-trajectory"];

function centerFor(object: CanvasObject): Point {
  if (object.kind === "transformer") return { x: object.x + (object.width ?? 0) / 2, y: object.y + (object.height ?? 0) / 2 };
  if (electricalTerminalKinds.includes(object.kind) || segmentBindableKinds.includes(object.kind) || sysmlConnectorKinds.includes(object.kind) || waveEndpointKinds.includes(object.kind) || chemistryConnectorKinds.includes(object.kind) || controlAnalysisConnectorKinds.includes(object.kind) || thermodynamicConnectorKinds.includes(object.kind) || electromagneticConnectorKinds.includes(object.kind)) return { x: (object.x + (object.x2 ?? object.x)) / 2, y: (object.y + (object.y2 ?? object.y)) / 2 };
  return { x: object.x + (object.width ?? 0) / 2, y: object.y + (object.height ?? 0) / 2 };
}

function transformPoint(object: CanvasObject, point: Point): Point {
  const center = centerFor(object); const angle = ((object.rotation ?? 0) * Math.PI) / 180;
  const scaleX = object.scaleX ?? object.scale ?? 1; const scaleY = object.scaleY ?? object.scale ?? 1;
  const dx = (point.x - center.x) * scaleX; const dy = (point.y - center.y) * scaleY;
  return { x: center.x + dx * Math.cos(angle) - dy * Math.sin(angle), y: center.y + dx * Math.sin(angle) + dy * Math.cos(angle) };
}

function localPorts(object: CanvasObject): ConnectionPort[] {
  if (segmentBindableKinds.includes(object.kind) || sysmlConnectorKinds.includes(object.kind) || waveEndpointKinds.includes(object.kind) || chemistryConnectorKinds.includes(object.kind) || controlAnalysisConnectorKinds.includes(object.kind) || thermodynamicConnectorKinds.includes(object.kind) || electromagneticConnectorKinds.includes(object.kind)) return [
    { name: "start", x: object.x, y: object.y },
    { name: "end", x: object.x2 ?? object.x, y: object.y2 ?? object.y },
  ];
  if (object.kind === "transfer-block" || object.kind === "functional-block") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "input", x: object.x, y: object.y + height / 2 },
      { name: "output", x: object.x + width, y: object.y + height / 2 },
    ];
  }
  if (["state-node", "state-pseudostate", "choice-junction", "fork-join", "sysml-requirement", "sysml-block", "sysml-part", "aperture-array", "fringe-screen", "chemical-atom", "bode-diagram", "time-response-diagram", "thermo-diagram", "phase-diagram-pt", "liquid-vapour-dome"].includes(object.kind)) {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "top", x: object.x + width / 2, y: object.y },
      { name: "right", x: object.x + width, y: object.y + height / 2 },
      { name: "bottom", x: object.x + width / 2, y: object.y + height },
      { name: "left", x: object.x, y: object.y + height / 2 },
    ];
  }
  if (object.kind === "sysml-port" || object.kind === "wave-source") return [{ name: "branch", x: object.x + (object.width ?? 0) / 2, y: object.y + (object.height ?? 0) / 2 }];
  if (object.kind === "summing-junction") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "input-left", x: object.x, y: object.y + height / 2 },
      { name: "input-top", x: object.x + width / 2, y: object.y },
      { name: "input-bottom", x: object.x + width / 2, y: object.y + height },
      { name: "output", x: object.x + width, y: object.y + height / 2 },
    ];
  }
  if (object.kind === "takeoff-point") return [{ name: "branch", x: object.x + (object.width ?? 0) / 2, y: object.y + (object.height ?? 0) / 2 }];
  if (object.kind === "transformer") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "primary-top", x: object.x, y: object.y + height * .25 },
      { name: "primary-bottom", x: object.x, y: object.y + height * .75 },
      { name: "secondary-top", x: object.x + width, y: object.y + height * .25 },
      { name: "secondary-bottom", x: object.x + width, y: object.y + height * .75 },
    ];
  }
  if (object.kind === "coupled-coils") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "primary-top", x: object.x, y: object.y + height * .25 },
      { name: "primary-bottom", x: object.x, y: object.y + height * .75 },
      { name: "secondary-top", x: object.x + width, y: object.y + height * .25 },
      { name: "secondary-bottom", x: object.x + width, y: object.y + height * .75 },
    ];
  }
  if (object.kind === "faraday-magnet-coil") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "coil-start", x: object.x + width, y: object.y + height * .3 },
      { name: "coil-end", x: object.x + width, y: object.y + height * .7 },
    ];
  }
  if (object.kind === "rotating-rectangular-loop") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "coil-start", x: object.x, y: object.y + height * .82 },
      { name: "coil-end", x: object.x + width, y: object.y + height * .82 },
    ];
  }
  if (object.kind === "electromechanical-converter") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "electrical-plus", x: object.x, y: object.y + height * .35 },
      { name: "electrical-minus", x: object.x, y: object.y + height * .65 },
      { name: "mechanical", x: object.x + width, y: object.y + height / 2 },
    ];
  }
  if (object.kind === "joint-pivot") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "solid-1", x: object.x + width, y: object.y + height / 2 },
      { name: "solid-2", x: object.x, y: object.y + height / 2 },
    ];
  }
  if (object.kind === "joint-slider") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "solid-1", x: object.x, y: object.y + height * .4 },
      { name: "solid-2", x: object.x + width / 2, y: object.y + height },
    ];
  }
  if (object.kind === "joint-ball") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "solid-1", x: object.x + width, y: object.y + height / 2 },
      { name: "solid-2", x: object.x, y: object.y + height / 2 },
    ];
  }
  if (object.kind === "joint-cylindrical" || object.kind === "joint-helical") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "solid-1", x: object.x, y: object.y + height * .4 },
      { name: "solid-2", x: object.x + width / 2, y: object.y + height },
    ];
  }
  if (object.kind === "joint-planar" || object.kind === "joint-line-contact" || object.kind === "joint-annular") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "solid-1", x: object.x + width / 2, y: object.y },
      { name: "solid-2", x: object.x + width / 2, y: object.y + height },
    ];
  }
  if (object.kind === "joint-point-contact") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "solid-1", x: object.x + width * .83, y: object.y },
      { name: "solid-2", x: object.x + width / 2, y: object.y + height },
    ];
  }
  if (object.kind === "gear-pair") {
    const width = object.width ?? 0; const height = object.height ?? 0; const r1 = height * .22; const r2 = height * .3; const firstX = object.x + width * .27;
    return [
      { name: "input", x: firstX, y: object.y + height * .48 },
      { name: "output", x: firstX + r1 + r2, y: object.y + height * .48 },
    ];
  }
  if (object.kind === "rack-pinion") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "input", x: object.x + width * .35, y: object.y + height * .38 },
      { name: "output", x: object.x + width, y: object.y + height * .76 },
    ];
  }
  if (object.kind === "belt-drive") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "input", x: object.x + width * .25, y: object.y + height * .5 },
      { name: "output", x: object.x + width * .75, y: object.y + height * .5 },
    ];
  }
  if (object.kind === "screw-nut") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "input", x: object.x, y: object.y + height * .5 },
      { name: "output", x: object.x + width * .62, y: object.y + height },
    ];
  }
  if (object.kind === "worm-gear") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "worm", x: object.x, y: object.y + height * .26 },
      { name: "wheel", x: object.x + width * .66, y: object.y + height },
    ];
  }
  if (object.kind === "planetary-gear") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "sun", x: object.x, y: object.y + height / 2 },
      { name: "carrier", x: object.x + width, y: object.y + height / 2 },
      { name: "ring", x: object.x + width / 2, y: object.y },
    ];
  }
  if (object.kind === "cam-follower") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "cam", x: object.x, y: object.y + height * .68 },
      { name: "follower", x: object.x + width * .62, y: object.y },
    ];
  }
  if (object.kind === "electric-motor") {
    const height = object.height ?? 0; const width = object.width ?? 0;
    return [
      { name: "electrical", x: object.x, y: object.y + height / 2 },
      { name: "shaft", x: object.x + width, y: object.y + height / 2 },
    ];
  }
  if (["gear-reducer", "clutch"].includes(object.kind)) {
    const height = object.height ?? 0; const width = object.width ?? 0;
    return [
      { name: "input", x: object.x, y: object.y + height / 2 },
      { name: "output", x: object.x + width, y: object.y + height / 2 },
    ];
  }
  if (object.kind === "brake") {
    const height = object.height ?? 0; const width = object.width ?? 0;
    return [
      { name: "shaft", x: object.x, y: object.y + height * .45 },
      { name: "frame", x: object.x + width * .7, y: object.y + height },
    ];
  }
  if (object.kind === "hydraulic-pump") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "P", x: object.x + width / 2, y: object.y },
      { name: "T", x: object.x + width / 2, y: object.y + height },
      { name: "shaft", x: object.x, y: object.y + height / 2 },
    ];
  }
  if (object.kind === "hydraulic-reservoir") return [{ name: "T", x: object.x + (object.width ?? 0) / 2, y: object.y }];
  if (object.kind === "hydraulic-cylinder") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "A", x: object.x + width * .3, y: object.y + height },
      { name: "B", x: object.x + width * .7, y: object.y + height },
      { name: "shaft", x: object.x + width, y: object.y + height / 2 },
      { name: "frame", x: object.x + width * .05, y: object.y + height / 2 },
    ];
  }
  if (object.kind === "hydraulic-valve-4-3") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "A", x: object.x + width * .425, y: object.y },
      { name: "B", x: object.x + width * .575, y: object.y },
      { name: "P", x: object.x + width * .425, y: object.y + height },
      { name: "T", x: object.x + width * .575, y: object.y + height },
    ];
  }
  if (object.kind === "pressure-relief-valve") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "T", x: object.x + width * .4, y: object.y },
      { name: "P", x: object.x + width * .4, y: object.y + height },
    ];
  }
  if (object.kind === "pneumatic-source") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "P", x: object.x + width / 2, y: object.y },
      { name: "shaft", x: object.x, y: object.y + height / 2 },
    ];
  }
  if (object.kind === "pneumatic-service-unit" || object.kind === "pneumatic-frl") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "input", x: object.x, y: object.y + height / 2 },
      { name: "output", x: object.x + width, y: object.y + height / 2 },
    ];
  }
  if (object.kind === "pneumatic-cylinder") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "cap", x: object.x + width * .3, y: object.y + height },
      { name: "rod-side", x: object.x + width * .7, y: object.y + height },
      { name: "rod", x: object.x + width, y: object.y + height / 2 },
      { name: "frame", x: object.x + width * .05, y: object.y + height / 2 },
    ];
  }
  if (object.kind === "pneumatic-valve-5-2") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "4", x: object.x + width * .575, y: object.y },
      { name: "2", x: object.x + width * .725, y: object.y },
      { name: "5", x: object.x + width * .55, y: object.y + height },
      { name: "1", x: object.x + width * .65, y: object.y + height },
      { name: "3", x: object.x + width * .75, y: object.y + height },
      { name: "14", x: object.x, y: object.y + height / 2 },
    ];
  }
  if (object.kind === "one-way-flow-control") {
    const width = object.width ?? 0; const height = object.height ?? 0;
    return [
      { name: "1", x: object.x, y: object.y + height / 2 },
      { name: "2", x: object.x + width, y: object.y + height / 2 },
    ];
  }
  if (object.kind === "pneumatic-exhaust") return [{ name: "input", x: object.x + (object.width ?? 0) / 2, y: object.y }];
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

export function pointOnSegmentAt(object: CanvasObject, ratio: number): Point | undefined {
  if (!segmentBindableKinds.includes(object.kind)) return undefined;
  const start = portFor(object, "start"); const end = portFor(object, "end");
  if (!start || !end) return undefined;
  const value = Math.min(1, Math.max(0, ratio));
  return { x: start.x + (end.x - start.x) * value, y: start.y + (end.y - start.y) * value };
}

export function pointOnWireAt(object: CanvasObject, ratio: number): Point | undefined {
  return object.kind === "wire" ? pointOnSegmentAt(object, ratio) : undefined;
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
