"use client";

import { PointerEvent, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { connectorKinds, labels, stampKinds, stampSize, toolboxGroups, type CanvasObject, type ObjectKind, type Point } from "./lib/canvas-types";
import { documentFor, objectsFromLatex } from "./lib/latex";

const canvasWidth = 900;
const canvasHeight = 560;
const objectId = () => Math.random().toString(36).slice(2, 10);
const standardDrawingTools: ObjectKind[] = ["line", "arrow", "rect", "circle", "ellipse", "freehand", "text", "axes"];

type HistoryState = { objects: CanvasObject[]; past: CanvasObject[][]; future: CanvasObject[][] };
type HistoryAction =
  | { type: "commit"; objects: CanvasObject[] }
  | { type: "transient"; objects: CanvasObject[] }
  | { type: "finishTransient"; snapshot: CanvasObject[] }
  | { type: "undo" }
  | { type: "redo" };

type DragMode = "move" | "resize" | "rotate";
type CanvasBounds = { x: number; y: number; width: number; height: number };

const keepHistory = (items: CanvasObject[][]) => items.slice(-100);

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  if (action.type === "commit") return { objects: action.objects, past: keepHistory([...state.past, state.objects]), future: [] };
  if (action.type === "transient") return { ...state, objects: action.objects };
  if (action.type === "finishTransient") return { ...state, past: keepHistory([...state.past, action.snapshot]), future: [] };
  if (action.type === "undo") {
    const previous = state.past.at(-1);
    return previous ? { objects: previous, past: state.past.slice(0, -1), future: [...state.future, state.objects] } : state;
  }
  const next = state.future.at(-1);
  return next ? { objects: next, past: [...state.past, state.objects], future: state.future.slice(0, -1) } : state;
}

const canvasPoint = (event: PointerEvent<SVGSVGElement>, svg: SVGSVGElement): Point => {
  const rect = svg.getBoundingClientRect();
  return { x: ((event.clientX - rect.left) / rect.width) * canvasWidth, y: ((event.clientY - rect.top) / rect.height) * canvasHeight };
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const scaleXFor = (object: CanvasObject) => object.scaleX ?? object.scale ?? 1;
const scaleYFor = (object: CanvasObject) => object.scaleY ?? object.scale ?? 1;

function boundsFor(object: CanvasObject): CanvasBounds {
  if (connectorKinds.includes(object.kind)) {
    const x2 = object.x2 ?? object.x; const y2 = object.y2 ?? object.y;
    const x = Math.min(object.x, x2); const y = Math.min(object.y, y2);
    return { x: x - 8, y: y - 8, width: Math.max(16, Math.abs(x2 - object.x) + 16), height: Math.max(16, Math.abs(y2 - object.y) + 16) };
  }
  if (object.kind === "freehand" && object.points?.length) {
    const xs = object.points.map((point) => point.x); const ys = object.points.map((point) => point.y);
    const x = Math.min(...xs); const y = Math.min(...ys);
    return { x: x - 8, y: y - 8, width: Math.max(16, Math.max(...xs) - x + 16), height: Math.max(16, Math.max(...ys) - y + 16) };
  }
  if (object.kind === "text") return { x: object.x - 6, y: object.y - 23, width: Math.max(58, (object.text?.length ?? 8) * 9), height: 29 };
  const width = object.width ?? 0; const height = object.height ?? 0;
  return { x: Math.min(object.x, object.x + width) - 5, y: Math.min(object.y, object.y + height) - 5, width: Math.max(16, Math.abs(width) + 10), height: Math.max(16, Math.abs(height) + 10) };
}

function objectCenter(object: CanvasObject): Point {
  if (object.kind === "text") return { x: object.x, y: object.y };
  const bounds = boundsFor(object);
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

function transformFor(object: CanvasObject) {
  const rotation = object.rotation ?? 0; const scaleX = scaleXFor(object); const scaleY = scaleYFor(object);
  if (rotation === 0 && scaleX === 1 && scaleY === 1) return undefined;
  const center = objectCenter(object);
  return `translate(${center.x} ${center.y}) rotate(${rotation}) scale(${scaleX} ${scaleY}) translate(${-center.x} ${-center.y})`;
}

function transformedPoint(object: CanvasObject, point: Point): Point {
  const center = objectCenter(object); const rotation = ((object.rotation ?? 0) * Math.PI) / 180;
  const dx = (point.x - center.x) * scaleXFor(object); const dy = (point.y - center.y) * scaleYFor(object);
  return { x: center.x + dx * Math.cos(rotation) - dy * Math.sin(rotation), y: center.y + dx * Math.sin(rotation) + dy * Math.cos(rotation) };
}

function cornerObjectAt(objects: CanvasObject[], point: Point) {
  for (const object of [...objects].reverse()) {
    const bounds = boundsFor(object);
    const corners = [[bounds.x, bounds.y], [bounds.x + bounds.width, bounds.y], [bounds.x, bounds.y + bounds.height], [bounds.x + bounds.width, bounds.y + bounds.height]];
    if (corners.some(([x, y]) => Math.hypot(transformedPoint(object, { x, y }).x - point.x, transformedPoint(object, { x, y }).y - point.y) <= 12)) return object;
  }
}

function localOffset(point: Point, center: Point, rotation: number): Point {
  const dx = point.x - center.x; const dy = point.y - center.y; const angle = (-rotation * Math.PI) / 180;
  return { x: dx * Math.cos(angle) - dy * Math.sin(angle), y: dx * Math.sin(angle) + dy * Math.cos(angle) };
}

async function canvasPdfImage(svg: SVGSVGElement) {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copy.setAttribute("width", String(canvasWidth));
  copy.setAttribute("height", String(canvasHeight));
  const source = new Blob([new XMLSerializer().serializeToString(copy)], { type: "image/svg+xml;charset=utf-8" });
  const objectUrl = URL.createObjectURL(source);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const next = new Image();
      next.onload = () => resolve(next);
      next.onerror = () => reject(new Error("Impossible de préparer le dessin pour le PDF."));
      next.src = objectUrl;
    });
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth * scale;
    canvas.height = canvasHeight * scale;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Le navigateur ne peut pas créer le PDF.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function connectorPreview(object: CanvasObject, selected: boolean) {
  const common = { stroke: "#111", strokeWidth: selected ? 3 : 2, fill: "none", pointerEvents: "stroke" as const };
  const x2 = object.x2 ?? object.x; const y2 = object.y2 ?? object.y;
  const midX = (object.x + x2) / 2; const midY = (object.y + y2) / 2;
  const dx = x2 - object.x; const dy = y2 - object.y; const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length; const uy = dy / length; const px = -uy; const py = ux;
  const rotation = Math.atan2(dy, dx) * 180 / Math.PI;
  if (object.kind === "resistor") return <g><line {...common} x1={object.x} y1={object.y} x2={x2} y2={y2} /><rect x={midX - 18 * ux - 8 * px} y={midY - 18 * uy - 8 * py} width="36" height="16" transform={`rotate(${rotation} ${midX} ${midY})`} fill="white" stroke="#111" /></g>;
  if (object.kind === "battery" || object.kind === "capacitor") {
    const wide = object.kind === "battery" ? 15 : 12; const narrow = object.kind === "battery" ? 9 : 12;
    return <g><line {...common} x1={object.x} y1={object.y} x2={x2} y2={y2} /><line stroke="#111" strokeWidth="2" x1={midX - 5 * ux - wide * px} y1={midY - 5 * uy - wide * py} x2={midX - 5 * ux + wide * px} y2={midY - 5 * uy + wide * py} /><line stroke="#111" strokeWidth="2" x1={midX + 6 * ux - narrow * px} y1={midY + 6 * uy - narrow * py} x2={midX + 6 * ux + narrow * px} y2={midY + 6 * uy + narrow * py} /></g>;
  }
  if (object.kind === "inductor") return <g transform={`rotate(${rotation} ${midX} ${midY})`}><line {...common} x1={object.x} y1={object.y} x2={midX - 22} y2={midY} /><path {...common} d={`M ${midX - 22} ${midY} q 5 -15 10 0 q 5 -15 10 0 q 5 -15 10 0 q 5 -15 10 0`} /><line {...common} x1={midX + 18} y1={midY} x2={x2} y2={y2} /></g>;
  if (object.kind === "switch") return <g><line {...common} x1={object.x} y1={object.y} x2={midX - 12 * ux} y2={midY - 12 * uy} /><line {...common} x1={midX + 14 * ux} y1={midY + 14 * uy} x2={x2} y2={y2} /><line stroke="#111" strokeWidth="2" x1={midX - 12 * ux} y1={midY - 12 * uy} x2={midX + 12 * ux - 12 * px} y2={midY + 12 * uy - 12 * py} /><circle cx={midX - 12 * ux} cy={midY - 12 * uy} r="3" fill="#111" /></g>;
  if (object.kind === "voltmeter" || object.kind === "ammeter") return <g><line {...common} x1={object.x} y1={object.y} x2={x2} y2={y2} /><circle cx={midX} cy={midY} r="15" fill="white" stroke="#111" strokeWidth="2" /><text x={midX} y={midY + 5} textAnchor="middle" fontSize="14">{object.kind === "voltmeter" ? "V" : "A"}</text></g>;
  if (object.kind === "spring") return <polyline {...common} points={Array.from({ length: 11 }, (_, i) => `${object.x + dx * i / 10 + (i === 0 || i === 10 ? 0 : (i % 2 ? 9 : -9) * px)},${object.y + dy * i / 10 + (i === 0 || i === 10 ? 0 : (i % 2 ? 9 : -9) * py)}`).join(" ")} />;
  if (object.kind === "wave") return <polyline {...common} points={Array.from({ length: 17 }, (_, i) => `${object.x + dx * i / 16 + Math.sin(i * Math.PI / 2) * 7 * px},${object.y + dy * i / 16 + Math.sin(i * Math.PI / 2) * 7 * py}`).join(" ")} />;
  if (object.kind.startsWith("bond-")) {
    const offsets = object.kind === "bond-single" ? [0] : object.kind === "bond-double" ? [-1, 1] : [-2, 0, 2];
    return <g>{offsets.map((offset) => <line key={offset} {...common} x1={object.x + px * offset * 4} y1={object.y + py * offset * 4} x2={x2 + px * offset * 4} y2={y2 + py * offset * 4} />)}</g>;
  }
  const markerEnd = ["arrow", "force", "light-ray", "heat-arrow", "work-arrow", "reaction-arrow", "dipole"].includes(object.kind) ? "url(#arrowhead)" : undefined;
  const markerStart = object.kind === "equilibrium-arrow" ? "url(#arrowhead)" : undefined;
  const dashed = object.kind === "hydrogen-bond" ? "5 4" : undefined;
  const label = object.kind === "heat-arrow" ? "Q" : object.kind === "work-arrow" ? "W" : object.kind === "dipole" ? "μ" : undefined;
  return <g><line {...common} x1={object.x} y1={object.y} x2={x2} y2={y2} markerEnd={markerEnd} markerStart={markerStart} strokeDasharray={dashed} />{label && <text x={midX + 8 * px} y={midY + 8 * py} fontSize="14">{label}</text>}</g>;
}

function stampPreview(object: CanvasObject, selected: boolean) {
  const common = { stroke: "#111", strokeWidth: selected ? 3 : 2, fill: "none", pointerEvents: "stroke" as const };
  const x = object.x; const y = object.y; const w = object.width ?? 80; const h = object.height ?? 80; const cx = x + w / 2; const cy = y + h / 2;
  const text = (value: string, tx = cx, ty = cy + 5, fontSize = 13) => <text x={tx} y={ty} textAnchor="middle" fontSize={fontSize} fill="#111" stroke="#fff" strokeWidth="3" strokeLinejoin="round" paintOrder="stroke" pointerEvents="all">{value}</text>;
  if (object.kind === "ground") return <g {...common}><line x1={cx} y1={y} x2={cx} y2={y + h * .35} /><path d={`M ${x + 6} ${y + h*.35} L ${x + w - 6} ${y + h*.35} M ${x + 11} ${y + h*.53} L ${x + w - 11} ${y + h*.53} M ${x + 17} ${y + h*.71} L ${x + w - 17} ${y + h*.71}`} /></g>;
  if (object.kind === "gbf") return <g {...common}><circle cx={cx} cy={cy} r={w*.36} /><path d={`M ${x+w*.22} ${cy} q ${w*.07} ${-h*.16} ${w*.14} 0 q ${w*.07} ${h*.16} ${w*.14} 0 q ${w*.07} ${-h*.16} ${w*.14} 0`} />{text("GBF", cx, y+h*.78)}</g>;
  if (object.kind === "oscilloscope") return <g {...common}><rect x={x} y={y} width={w} height={h} rx="4" /><path d={`M ${x+w*.15} ${cy} q ${w*.12} ${-h*.2} ${w*.24} 0 q ${w*.12} ${h*.2} ${w*.24} 0 q ${w*.12} ${-h*.2} ${w*.24} 0`} />{text("oscillo", cx, y+h*.88)}</g>;
  if (object.kind === "mass") return <g {...common}><rect x={x+5} y={y+8} width={w-10} height={h-16} fill="white" />{text("m")}</g>;
  if (object.kind === "pulley") return <g {...common}><circle cx={cx} cy={cy} r={w*.32} /><circle cx={cx} cy={cy} r="4" fill="#111" /></g>;
  if (object.kind === "pendulum") return <g {...common}><line x1={cx} y1={y+6} x2={cx} y2={y+h*.72} /><circle cx={cx} cy={y+h*.82} r={w*.17} fill="white" /><line x1={cx-w*.25} y1={y+6} x2={cx+w*.25} y2={y+6} /></g>;
  if (object.kind === "reference-frame") return <g {...common}><line x1={x+w*.2} y1={y+h*.78} x2={x+w*.84} y2={y+h*.78} markerEnd="url(#arrowhead)" /><line x1={x+w*.2} y1={y+h*.78} x2={x+w*.2} y2={y+h*.18} markerEnd="url(#arrowhead)" />{text("O", x+w*.15, y+h*.92)}{text("x", x+w*.91, y+h*.86)}{text("y", x+w*.13, y+h*.15)}</g>;
  if (object.kind === "circular-trajectory") return <g {...common}><circle cx={cx} cy={cy} r={Math.min(w,h)*.35} markerEnd="url(#arrowhead)" /><circle cx={cx} cy={cy} r="3" fill="#111" />{text("O", cx, cy+18)}</g>;
  if (object.kind === "gravity-field") return <g {...common}>{[.2,.5,.8].map((p) => <line key={p} x1={x+w*p} y1={y+h*.15} x2={x+w*p} y2={y+h*.78} markerEnd="url(#arrowhead)" />)}{text("g", x+w*.9, cy)}</g>;
  if (object.kind === "lens") return <g {...common}><line x1={x} y1={cy} x2={x+w} y2={cy} strokeWidth="1.5" /><line x1={cx} y1={y+h*.1} x2={cx} y2={y+h*.9} markerStart="url(#arrowhead)" markerEnd="url(#arrowhead)" /><circle cx={cx} cy={cy} r="2.5" fill="#111" />{text("O", cx + 9, cy + 16)}</g>;
  if (object.kind === "diverging-lens") return <g {...common}><line x1={x} y1={cy} x2={x+w} y2={cy} strokeWidth="1.5" /><line x1={cx} y1={y+h*.1} x2={cx} y2={y+h*.43} markerEnd="url(#arrowhead)" /><line x1={cx} y1={y+h*.9} x2={cx} y2={y+h*.57} markerEnd="url(#arrowhead)" /><circle cx={cx} cy={cy} r="2.5" fill="#111" />{text("O", cx + 9, cy + 16)}</g>;
  if (object.kind === "plane-mirror" || object.kind === "screen") return <g {...common}><line x1={cx} y1={y+4} x2={cx} y2={y+h-4} strokeWidth="4" />{Array.from({length:5},(_,i)=><line key={i} x1={cx} y1={y+12+i*h*.17} x2={cx+(object.kind === "plane-mirror" ? 10 : -10)} y2={y+18+i*h*.17} />)}</g>;
  if (object.kind === "prism") return <path {...common} d={`M ${x+6} ${y+h-6} L ${x+w-6} ${y+h-6} L ${cx} ${y+7} Z`} />;
  if (object.kind === "fiber") return <g {...common}><path d={`M ${x+4} ${y+h*.3} C ${x+w*.35} ${y+h*.2}, ${x+w*.62} ${y+h*.83}, ${x+w-5} ${y+h*.62}`} /><path d={`M ${x+4} ${y+h*.52} C ${x+w*.35} ${y+h*.42}, ${x+w*.62} ${y+h*1.03}, ${x+w-5} ${y+h*.84}`} /></g>;
  if (object.kind === "electric-field") return <g {...common}>{[.22,.5,.78].map((p) => <line key={p} x1={x+w*.12} y1={y+h*p} x2={x+w*.86} y2={y+h*p} markerEnd="url(#arrowhead)" />)}{text("E", x+w*.9, cy-7)}</g>;
  if (object.kind === "magnetic-field-in" || object.kind === "magnetic-field-out") return <g {...common}>{[.25,.5,.75].flatMap((a) => [.3,.7].map((b) => <text key={`${a}${b}`} x={x+w*a} y={y+h*b} textAnchor="middle" fontSize="20">{object.kind === "magnetic-field-in" ? "⊗" : "⊙"}</text>))}</g>;
  if (object.kind === "bar-magnet") return <g {...common}><rect x={x+4} y={y+h*.2} width={w-8} height={h*.6} fill="white" />{text("N", x+w*.28, cy+5)}{text("S", x+w*.72, cy+5)}</g>;
  if (object.kind === "coil" || object.kind === "solenoid") return <g {...common}>{Array.from({length: object.kind === "coil" ? 4 : 6},(_,i)=><ellipse key={i} cx={x+w*(.16+i*(object.kind === "coil" ? .22 : .14))} cy={cy} rx={w*(object.kind === "coil" ? .1 : .12)} ry={h*.32} />)}</g>;
  if (object.kind === "laplace-rails") return <g {...common}><line x1={x+5} y1={y+h*.25} x2={x+w-5} y2={y+h*.25} /><line x1={x+5} y1={y+h*.75} x2={x+w-5} y2={y+h*.75} /><line x1={x+w*.55} y1={y+h*.25} x2={x+w*.55} y2={y+h*.75} strokeWidth="4" /><line x1={x+w*.62} y1={cy} x2={x+w*.85} y2={cy} markerEnd="url(#arrowhead)" />{text("v", x+w*.88, cy-6)}</g>;
  if (object.kind === "charged-particle") return <g {...common}><circle cx={cx} cy={cy} r={Math.min(w,h)*.34} fill="white" />{text("q")}</g>;
  if (object.kind === "piston-cylinder") return <g {...common}><path d={`M ${x+w*.18} ${y+h*.9} L ${x+w*.18} ${y+h*.12} L ${x+w*.82} ${y+h*.12} L ${x+w*.82} ${y+h*.9}`} /><line x1={x+w*.14} y1={y+h*.38} x2={x+w*.86} y2={y+h*.38} strokeWidth="4" /><line x1={cx} y1={y+h*.38} x2={cx} y2={y+3} />{text("P, V, T", cx, y+h*.73, 11)}</g>;
  if (object.kind === "thermal-reservoir") return <g {...common}><circle cx={cx} cy={cy} r={Math.min(w,h)*.4} />{text("T")}</g>;
  if (object.kind === "heat-engine") return <g {...common}><rect x={x+w*.2} y={y+h*.28} width={w*.6} height={h*.42} fill="white" />{text("machine", cx, cy+5, 11)}<line x1={cx} y1={y+3} x2={cx} y2={y+h*.25} markerEnd="url(#arrowhead)" /><line x1={cx} y1={y+h*.72} x2={cx} y2={y+h-3} markerEnd="url(#arrowhead)" /><line x1={x+w*.82} y1={cy} x2={x+w-3} y2={cy} markerEnd="url(#arrowhead)" />{text("Qh", cx+10, y+h*.18, 11)}{text("Qc", cx+10, y+h*.94, 11)}{text("W", x+w*.92, cy-5, 11)}</g>;
  if (object.kind === "ion") return <g {...common}><circle cx={cx} cy={cy} r={Math.min(w,h)*.34} />{text("ion")}</g>;
  if (object.kind === "lone-pair") return <g><circle cx={cx-7} cy={cy} r="3" fill="#111" /><circle cx={cx+7} cy={cy} r="3" fill="#111" /></g>;
  if (object.kind === "crystal-fcc") return <g {...common}><rect x={x+w*.14} y={y+h*.28} width={w*.58} height={h*.55} /><path d={`M ${x+w*.14} ${y+h*.28} L ${x+w*.36} ${y+h*.1} L ${x+w*.94} ${y+h*.1} L ${x+w*.72} ${y+h*.28} M ${x+w*.72} ${y+h*.28} L ${x+w*.94} ${y+h*.1} L ${x+w*.94} ${y+h*.65} L ${x+w*.72} ${y+h*.83}`} />{[[.14,.28],[.72,.28],[.14,.83],[.72,.83],[.36,.1],[.94,.1],[.94,.65],[.43,.55]].map(([a,b],i)=><circle key={i} cx={x+w*a} cy={y+h*b} r="4" fill="#111" />)}</g>;
  if (object.kind === "precipitate") return <g {...common}><path d={`M ${x+w*.12} ${y+h*.1} L ${x+w*.22} ${y+h*.88} L ${x+w*.78} ${y+h*.88} L ${x+w*.88} ${y+h*.1}`} /><path d={`M ${x+w*.22} ${y+h*.88} L ${x+w*.78} ${y+h*.88} L ${x+w*.73} ${y+h*.67} L ${x+w*.27} ${y+h*.67} Z`} fill="#c7c7c7" stroke="#111" /></g>;
  if (object.kind === "electrochemical-cell") return <g {...common}><path d={`M ${x+w*.06} ${y+h*.2} L ${x+w*.12} ${y+h*.84} L ${x+w*.39} ${y+h*.84} L ${x+w*.45} ${y+h*.2} M ${x+w*.55} ${y+h*.2} L ${x+w*.61} ${y+h*.84} L ${x+w*.88} ${y+h*.84} L ${x+w*.94} ${y+h*.2}`} /><path d={`M ${x+w*.1} ${y+h*.59} L ${x+w*.13} ${y+h*.81} L ${x+w*.38} ${y+h*.81} L ${x+w*.41} ${y+h*.59} Z M ${x+w*.59} ${y+h*.59} L ${x+w*.62} ${y+h*.81} L ${x+w*.87} ${y+h*.81} L ${x+w*.9} ${y+h*.59} Z`} fill="#dcecff" stroke="none" /><line x1={x+w*.25} y1={y+h*.12} x2={x+w*.25} y2={y+h*.72} strokeWidth="4" /><line x1={x+w*.75} y1={y+h*.12} x2={x+w*.75} y2={y+h*.72} strokeWidth="4" /><path d={`M ${x+w*.31} ${y+h*.66} L ${x+w*.31} ${y+h*.35} Q ${cx} ${y+h*.08} ${x+w*.69} ${y+h*.35} L ${x+w*.69} ${y+h*.66}`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /><path d={`M ${x+w*.25} ${y+h*.12} L ${x+w*.75} ${y+h*.12}`} strokeDasharray="4 3" />{text("anode (−)", x+w*.25, y+h*.96, 11)}{text("cathode (+)", x+w*.75, y+h*.96, 11)}{text("pont salin", cx, y+h*.25, 11)}</g>;
  if (object.kind === "beaker") return <g {...common}><path d={`M ${x+w*.14} ${y+h*.1} L ${x+w*.2} ${y+h*.9} L ${x+w*.8} ${y+h*.9} L ${x+w*.86} ${y+h*.1}`} /><path d={`M ${x+w*.18} ${y+h*.58} L ${x+w*.22} ${y+h*.86} L ${x+w*.78} ${y+h*.86} L ${x+w*.82} ${y+h*.58} Z`} fill="#dcecff" stroke="none" />{[.32,.44,.56].map((p) => <line key={p} x1={x+w*.29} y1={y+h*p} x2={x+w*.38} y2={y+h*p} />)}</g>;
  if (object.kind === "flask") return <g {...common}><path d={`M ${x+w*.42} ${y+h*.06} L ${x+w*.42} ${y+h*.32} L ${x+w*.14} ${y+h*.9} L ${x+w*.86} ${y+h*.9} L ${x+w*.58} ${y+h*.32} L ${x+w*.58} ${y+h*.06} Z`} /><path d={`M ${x+w*.24} ${y+h*.7} L ${x+w*.16} ${y+h*.87} L ${x+w*.84} ${y+h*.87} L ${x+w*.76} ${y+h*.7} Z`} fill="#dcecff" stroke="none" /></g>;
  if (object.kind === "round-bottom-flask") return <g {...common}><line x1={x+w*.42} y1={y+h*.06} x2={x+w*.42} y2={y+h*.31} /><line x1={x+w*.58} y1={y+h*.06} x2={x+w*.58} y2={y+h*.31} /><circle cx={cx} cy={y+h*.61} r={Math.min(w,h)*.35} /><path d={`M ${x+w*.2} ${y+h*.68} Q ${cx} ${y+h*.84} ${x+w*.8} ${y+h*.68} Z`} fill="#dcecff" stroke="none" /></g>;
  if (object.kind === "distillation-flask") return <g {...common}><line x1={x+w*.39} y1={y+h*.07} x2={x+w*.39} y2={y+h*.31} /><line x1={x+w*.55} y1={y+h*.07} x2={x+w*.55} y2={y+h*.31} /><circle cx={x+w*.47} cy={y+h*.62} r={Math.min(w,h)*.31} /><path d={`M ${x+w*.67} ${y+h*.48} L ${x+w*.94} ${y+h*.34} L ${x+w*.96} ${y+h*.45} L ${x+w*.7} ${y+h*.57}`} /><path d={`M ${x+w*.24} ${y+h*.68} Q ${x+w*.47} ${y+h*.81} ${x+w*.7} ${y+h*.68} Z`} fill="#dcecff" stroke="none" /></g>;
  if (object.kind === "test-tube") return <g {...common}><path d={`M ${x+w*.36} ${y+h*.06} L ${x+w*.36} ${y+h*.72} A ${w*.14} ${h*.16} 0 0 0 ${x+w*.64} ${y+h*.72} L ${x+w*.64} ${y+h*.06}`} /><path d={`M ${x+w*.38} ${y+h*.63} L ${x+w*.38} ${y+h*.72} A ${w*.12} ${h*.13} 0 0 0 ${x+w*.62} ${y+h*.72} L ${x+w*.62} ${y+h*.63} Z`} fill="#dcecff" stroke="none" /></g>;
  if (object.kind === "graduated-cylinder") return <g {...common}><path d={`M ${x+w*.32} ${y+h*.05} L ${x+w*.32} ${y+h*.82} Q ${cx} ${y+h*.9} ${x+w*.68} ${y+h*.82} L ${x+w*.68} ${y+h*.05} M ${x+w*.12} ${y+h*.91} L ${x+w*.88} ${y+h*.91} M ${x+w*.36} ${y+h*.91} L ${x+w*.26} ${y+h*.99} M ${x+w*.64} ${y+h*.91} L ${x+w*.74} ${y+h*.99}`} />{[.2,.3,.4,.5,.6,.7].map((p, index) => <line key={p} x1={x+w*.34} y1={y+h*p} x2={x+w*(index % 2 ? .44 : .51)} y2={y+h*p} />)}<path d={`M ${x+w*.34} ${y+h*.62} L ${x+w*.34} ${y+h*.8} Q ${cx} ${y+h*.85} ${x+w*.66} ${y+h*.8} L ${x+w*.66} ${y+h*.62} Z`} fill="#dcecff" stroke="none" /></g>;
  if (object.kind === "burette") return <g {...common}><rect x={x+w*.34} y={y+h*.04} width={w*.32} height={h*.68} /><line x1={x+w*.18} y1={y+h*.73} x2={x+w*.82} y2={y+h*.73} /><circle cx={cx} cy={y+h*.73} r={w*.11} fill="white" /><line x1={cx} y1={y+h*.73} x2={cx} y2={y+h*.94} /><path d={`M ${cx} ${y+h*.94} L ${cx-w*.05} ${y+h*.88} L ${cx+w*.05} ${y+h*.88} Z`} fill="#111" />{[.12,.2,.28,.36,.44,.52,.6].map((p) => <line key={p} x1={x+w*.36} y1={y+h*p} x2={x+w*.47} y2={y+h*p} />)}</g>;
  if (object.kind === "volumetric-flask") return <g {...common}><path d={`M ${x+w*.43} ${y+h*.05} L ${x+w*.43} ${y+h*.37} C ${x+w*.13} ${y+h*.57}, ${x+w*.18} ${y+h*.9}, ${cx} ${y+h*.92} C ${x+w*.82} ${y+h*.9}, ${x+w*.87} ${y+h*.57}, ${x+w*.57} ${y+h*.37} L ${x+w*.57} ${y+h*.05}`} /><line x1={x+w*.39} y1={y+h*.27} x2={x+w*.61} y2={y+h*.27} strokeWidth="3" /><path d={`M ${x+w*.23} ${y+h*.67} Q ${cx} ${y+h*.82} ${x+w*.77} ${y+h*.67} L ${x+w*.73} ${y+h*.82} Q ${cx} ${y+h*.9} ${x+w*.27} ${y+h*.82} Z`} fill="#dcecff" stroke="none" /></g>;
  if (object.kind === "separatory-funnel") return <g {...common}><rect x={x+w*.41} y={y+h*.03} width={w*.18} height={h*.11} /><path d={`M ${cx} ${y+h*.14} L ${x+w*.79} ${y+h*.44} Q ${x+w*.68} ${y+h*.72} ${cx} ${y+h*.77} Q ${x+w*.32} ${y+h*.72} ${x+w*.21} ${y+h*.44} Z`} /><path d={`M ${x+w*.3} ${y+h*.56} Q ${cx} ${y+h*.7} ${x+w*.7} ${y+h*.56} Q ${x+w*.64} ${y+h*.7} ${cx} ${y+h*.73} Q ${x+w*.36} ${y+h*.7} ${x+w*.3} ${y+h*.56} Z`} fill="#dcecff" stroke="none" /><line x1={x+w*.34} y1={y+h*.78} x2={x+w*.66} y2={y+h*.78} /><circle cx={cx} cy={y+h*.78} r={w*.09} fill="white" /><line x1={cx} y1={y+h*.78} x2={cx} y2={y+h*.96} /></g>;
  if (object.kind === "pipette") return <g {...common}><line x1={cx} y1={y+h*.04} x2={cx} y2={y+h*.3} /><ellipse cx={cx} cy={y+h*.48} rx={w*.18} ry={h*.2} /><line x1={cx} y1={y+h*.68} x2={cx} y2={y+h*.92} /><path d={`M ${cx} ${y+h*.97} L ${cx-w*.06} ${y+h*.9} L ${cx+w*.06} ${y+h*.9} Z`} fill="#111" /><line x1={x+w*.36} y1={y+h*.23} x2={x+w*.64} y2={y+h*.23} /></g>;
  if (object.kind === "filter-funnel") return <g {...common}><path d={`M ${x+w*.12} ${y+h*.1} L ${x+w*.88} ${y+h*.1} L ${cx} ${y+h*.55} Z`} /><path d={`M ${x+w*.24} ${y+h*.16} L ${x+w*.76} ${y+h*.16} L ${cx} ${y+h*.47} Z`} fill="#f1f1f1" /><line x1={cx} y1={y+h*.55} x2={cx} y2={y+h*.96} /></g>;
  if (object.kind === "wash-bottle") return <g {...common}><path d={`M ${x+w*.25} ${y+h*.28} Q ${x+w*.18} ${y+h*.42} ${x+w*.18} ${y+h*.84} Q ${cx} ${y+h*.95} ${x+w*.82} ${y+h*.84} Q ${x+w*.82} ${y+h*.42} ${x+w*.7} ${y+h*.28} Z`} /><path d={`M ${x+w*.43} ${y+h*.28} L ${x+w*.43} ${y+h*.1} Q ${x+w*.56} ${y+h*.03} ${x+w*.72} ${y+h*.14} L ${x+w*.88} ${y+h*.08}`} /><path d={`M ${x+w*.23} ${y+h*.65} Q ${cx} ${y+h*.78} ${x+w*.77} ${y+h*.65} L ${x+w*.76} ${y+h*.83} Q ${cx} ${y+h*.9} ${x+w*.24} ${y+h*.83} Z`} fill="#dcecff" stroke="none" /></g>;
  if (object.kind === "liebig-condenser") return <g {...common}><rect x={x+w*.08} y={y+h*.32} width={w*.84} height={h*.36} rx={h*.1} /><line x1={x+w*.02} y1={cy} x2={x+w*.98} y2={cy} /><line x1={x+w*.22} y1={y+h*.32} x2={x+w*.14} y2={y+h*.14} /><line x1={x+w*.78} y1={y+h*.68} x2={x+w*.86} y2={y+h*.86} /></g>;
  if (object.kind === "support-stand") return <g {...common}><rect x={x+w*.1} y={y+h*.88} width={w*.8} height={h*.08} rx="3" fill="#f1f1f1" /><line x1={x+w*.28} y1={y+h*.88} x2={x+w*.28} y2={y+h*.08} strokeWidth="4" /><rect x={x+w*.24} y={y+h*.38} width={w*.16} height={h*.08} fill="white" /><line x1={x+w*.4} y1={y+h*.42} x2={x+w*.78} y2={y+h*.42} /><path d={`M ${x+w*.72} ${y+h*.42} q ${w*.08} ${h*.03} 0 ${h*.12}`} /></g>;
  if (object.kind === "magnetic-stirrer") return <g {...common}><rect x={x+w*.08} y={y+h*.72} width={w*.84} height={h*.18} rx="6" fill="#f1f1f1" /><circle cx={x+w*.22} cy={y+h*.81} r={w*.045} fill="white" /><path d={`M ${x+w*.3} ${y+h*.72} L ${x+w*.35} ${y+h*.25} L ${x+w*.65} ${y+h*.25} L ${x+w*.7} ${y+h*.72}`} /><path d={`M ${x+w*.34} ${y+h*.57} L ${x+w*.36} ${y+h*.68} L ${x+w*.64} ${y+h*.68} L ${x+w*.66} ${y+h*.57} Z`} fill="#dcecff" stroke="none" /><ellipse cx={cx} cy={y+h*.62} rx={w*.1} ry={h*.018} fill="#111" stroke="none" /></g>;
  if (object.kind === "thermometer") return <g {...common}><rect x={x+w*.4} y={y+4} width={w*.2} height={h*.68} rx="4" /><circle cx={cx} cy={y+h*.82} r={w*.18} fill="#f8a4a4" /><line x1={cx} y1={y+h*.62} x2={cx} y2={y+h*.18} stroke="#d11" strokeWidth="3" /></g>;
  if (object.kind === "bunsen-burner") return <g {...common}><rect x={x+w*.15} y={y+h*.75} width={w*.7} height={h*.15} /><rect x={x+w*.4} y={y+h*.28} width={w*.2} height={h*.47} /><path d={`M ${cx} ${y+h*.28} Q ${x+w*.27} ${y+h*.08} ${cx} ${y+2} Q ${x+w*.73} ${y+h*.08} ${cx} ${y+h*.28}`} fill="#ffe09a" /></g>;
  return <g {...common}><rect x={x} y={y} width={w} height={h} />{text(labels[object.kind])}</g>;
}

function preview(object: CanvasObject, selected: boolean) {
  const common = { stroke: "#111", strokeWidth: selected ? 3 : 2, fill: "none", pointerEvents: "stroke" as const };
  if (connectorKinds.includes(object.kind)) return connectorPreview(object, selected);
  if (object.kind === "rect") return <rect {...common} x={object.x} y={object.y} width={object.width} height={object.height} />;
  if (object.kind === "circle") return <circle {...common} cx={object.x + (object.width ?? 0) / 2} cy={object.y + (object.height ?? 0) / 2} r={Math.abs(object.width ?? 0) / 2} />;
  if (object.kind === "ellipse") return <ellipse {...common} cx={object.x + (object.width ?? 0) / 2} cy={object.y + (object.height ?? 0) / 2} rx={Math.abs(object.width ?? 0) / 2} ry={Math.abs(object.height ?? 0) / 2} />;
  if (object.kind === "freehand") return <polyline {...common} points={(object.points ?? []).map((p) => `${p.x},${p.y}`).join(" ")} />;
  if (object.kind === "text") return <text x={object.x} y={object.y} fill="#111" fontSize="17" pointerEvents="all">{object.text}</text>;
  if (object.kind === "axes") return <g><rect {...common} x={object.x} y={object.y} width={object.width} height={object.height} strokeDasharray="3 3" /><line {...common} x1={object.x} y1={object.y + (object.height ?? 0) / 2} x2={object.x + (object.width ?? 0)} y2={object.y + (object.height ?? 0) / 2} markerEnd="url(#arrowhead)" /><line {...common} x1={object.x + (object.width ?? 0) / 2} y1={object.y + (object.height ?? 0)} x2={object.x + (object.width ?? 0) / 2} y2={object.y} markerEnd="url(#arrowhead)" /><text x={object.x + 8} y={object.y + 20} fontSize="14">{object.graph?.expression ? `y = ${object.graph.expression}` : "repère"}</text></g>;
  return stampPreview(object, selected);
}

function selectionOverlay(object: CanvasObject) {
  const bounds = boundsFor(object); const rotateY = bounds.y - 28;
  return <g data-id={object.id} transform={transformFor(object)} className="selection-overlay">
    <rect className="selection-frame" x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} />
    <line className="selection-stem" x1={bounds.x + bounds.width / 2} y1={bounds.y} x2={bounds.x + bounds.width / 2} y2={rotateY + 7} />
    <circle className="rotation-handle" data-handle="rotate" cx={bounds.x + bounds.width / 2} cy={rotateY} r="7" aria-label="Tourner l’objet" />
    {[[bounds.x, bounds.y], [bounds.x + bounds.width, bounds.y], [bounds.x, bounds.y + bounds.height], [bounds.x + bounds.width, bounds.y + bounds.height]].map(([x, y], index) => <rect key={index} className="resize-handle" data-handle="resize" x={x - 6} y={y - 6} width="12" height="12" rx="2" aria-label="Redimensionner l’objet" />)}
  </g>;
}

export default function Home() {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragChangedRef = useRef(false);
  const [tool, setTool] = useState<ObjectKind | "select">("select");
  const [{ objects, past, future }, dispatchHistory] = useReducer(historyReducer, { objects: [], past: [], future: [] });
  const [selectedId, setSelectedId] = useState<string>();
  const [draft, setDraft] = useState<CanvasObject>();
  const [drag, setDrag] = useState<{ id: string; start: Point; original: CanvasObject; snapshot: CanvasObject[]; mode: DragMode }>();
  const [snippetOnly, setSnippetOnly] = useState(false);
  const [notice, setNotice] = useState("Choisissez un outil puis dessinez sur le canevas.");
  const [expression, setExpression] = useState("sin(deg(x))");
  const [range, setRange] = useState("-5:5");
  const latex = useMemo(() => documentFor(objects, snippetOnly), [objects, snippetOnly]);
  const [latexDraft, setLatexDraft] = useState<string>();
  const latexSource = latexDraft ?? latex;
  const latexDirty = latexDraft !== undefined;
  const selected = objects.find((object) => object.id === selectedId);
  const selectedBounds = selected ? boundsFor(selected) : undefined;
  const selectedScaleX = selected ? scaleXFor(selected) : 1;
  const selectedScaleY = selected ? scaleYFor(selected) : 1;
  const selectedWidth = selectedBounds ? Math.round(selectedBounds.width * selectedScaleX) : 0;
  const selectedHeight = selectedBounds ? Math.round(selectedBounds.height * selectedScaleY) : 0;
  const commitObjects = useCallback((next: CanvasObject[]) => dispatchHistory({ type: "commit", objects: next }), []);
  const undo = useCallback(() => { dispatchHistory({ type: "undo" }); setSelectedId(undefined); }, []);
  const redo = useCallback(() => { dispatchHistory({ type: "redo" }); setSelectedId(undefined); }, []);
  const updateSelected = useCallback((change: Partial<CanvasObject>) => {
    if (!selectedId) return;
    commitObjects(objects.map((object) => object.id === selectedId ? { ...object, ...change } : object));
  }, [commitObjects, objects, selectedId]);
  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    commitObjects(objects.filter((object) => object.id !== selectedId)); setSelectedId(undefined); setNotice("Objet supprimé.");
  }, [commitObjects, objects, selectedId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.("input, textarea")) return;
      if (event.key === "Delete" || event.key === "Del" || event.code === "Delete") { if (selectedId) { event.preventDefault(); event.stopPropagation(); deleteSelected(); } return; }
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
      if (key === "y") { event.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [deleteSelected, redo, selectedId, undo]);

  const makeObject = (p: Point): CanvasObject => {
    const kind = tool as ObjectKind;
    if (stampKinds.includes(kind)) { const size = stampSize(kind); return { id: objectId(), kind, x: p.x - size.width / 2, y: p.y - size.height / 2, ...size }; }
    if (kind === "text") return { id: objectId(), kind, x: p.x, y: p.y, text: "Étiquette" };
    if (kind === "axes") return { id: objectId(), kind, x: p.x, y: p.y, width: 250, height: 180 };
    if (kind === "freehand") return { id: objectId(), kind, x: p.x, y: p.y, points: [p] };
    if (connectorKinds.includes(kind)) return { id: objectId(), kind, x: p.x, y: p.y, x2: p.x, y2: p.y };
    return { id: objectId(), kind, x: p.x, y: p.y, width: 0, height: 0 };
  };

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current; if (!svg) return;
    const p = canvasPoint(event, svg); const element = event.target as Element; const target = element.closest("[data-id]")?.getAttribute("data-id");
    const handle = element.closest("[data-handle]")?.getAttribute("data-handle");
    const cornerObject = handle ? undefined : cornerObjectAt(objects, p);
    if (cornerObject) {
      dragChangedRef.current = false; setTool("select"); setSelectedId(cornerObject.id); setDrag({ id: cornerObject.id, start: p, original: cornerObject, snapshot: objects, mode: "resize" }); event.currentTarget.setPointerCapture(event.pointerId); return;
    }
    if (tool === "select" && target) {
      const original = objects.find((o) => o.id === target); if (!original) return;
      const mode: DragMode = handle === "resize" ? "resize" : handle === "rotate" ? "rotate" : "move";
      dragChangedRef.current = false; setSelectedId(target); setDrag({ id: target, start: p, original, snapshot: objects, mode }); event.currentTarget.setPointerCapture(event.pointerId); return;
    }
    if (tool === "select") { setSelectedId(undefined); return; }
    const created = makeObject(p);
    if (stampKinds.includes(created.kind) || created.kind === "text" || created.kind === "axes") { commitObjects([...objects, created]); setSelectedId(created.id); if (!standardDrawingTools.includes(created.kind)) setTool("select"); return; }
    setDraft(created); event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current; if (!svg) return; const p = canvasPoint(event, svg);
    if (drag) {
      dragChangedRef.current = true;
      const dx = p.x - drag.start.x; const dy = p.y - drag.start.y; const o = drag.original;
      const center = objectCenter(o);
      const startOffset = localOffset(drag.start, center, o.rotation ?? 0); const currentOffset = localOffset(p, center, o.rotation ?? 0);
      const proportionalScale = Math.hypot(currentOffset.x, currentOffset.y) / Math.max(1, Math.hypot(startOffset.x, startOffset.y));
      const next = drag.mode === "resize"
        ? event.shiftKey
          ? { ...o, scale: undefined, scaleX: clamp(scaleXFor(o) * proportionalScale, 0.25, 3), scaleY: clamp(scaleYFor(o) * proportionalScale, 0.25, 3) }
          : { ...o, scale: undefined, scaleX: clamp(scaleXFor(o) * Math.abs(currentOffset.x / (startOffset.x || 1)), 0.25, 3), scaleY: clamp(scaleYFor(o) * Math.abs(currentOffset.y / (startOffset.y || 1)), 0.25, 3) }
        : drag.mode === "rotate"
          ? { ...o, rotation: Math.round(((o.rotation ?? 0) + (Math.atan2(p.y - center.y, p.x - center.x) - Math.atan2(drag.start.y - center.y, drag.start.x - center.x)) * 180 / Math.PI) * 10) / 10 }
          : connectorKinds.includes(o.kind)
            ? { ...o, x: o.x + dx, y: o.y + dy, x2: (o.x2 ?? o.x) + dx, y2: (o.y2 ?? o.y) + dy }
            : { ...o, x: o.x + dx, y: o.y + dy, points: o.points?.map((point) => ({ x: point.x + dx, y: point.y + dy })) };
      dispatchHistory({ type: "transient", objects: objects.map((item) => item.id !== o.id ? item : next) });
      return;
    }
    if (!draft) return;
    if (draft.kind === "freehand") setDraft({ ...draft, points: [...(draft.points ?? []), p] });
    else if (connectorKinds.includes(draft.kind)) setDraft({ ...draft, x2: p.x, y2: p.y });
    else setDraft({ ...draft, width: p.x - draft.x, height: p.y - draft.y });
  };
  const onPointerUp = (event: PointerEvent<SVGSVGElement>) => {
    if (draft) { commitObjects([...objects, draft]); setSelectedId(draft.id); if (!standardDrawingTools.includes(draft.kind)) setTool("select"); setDraft(undefined); }
    else if (drag && dragChangedRef.current) dispatchHistory({ type: "finishTransient", snapshot: drag.snapshot });
    setDrag(undefined); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const addFunction = () => {
    const [xMin, xMax] = range.split(":").map(Number);
    if (!expression.trim() || !Number.isFinite(xMin) || !Number.isFinite(xMax)) { setNotice("Utilisez une expression et un intervalle, par exemple -5:5."); return; }
    const next = { id: objectId(), kind: "axes" as const, x: 40, y: 350, width: 250, height: 180, graph: { expression, xMin, xMax } };
    commitObjects([...objects, next]); setSelectedId(next.id); setNotice("Graphe ajouté au canevas.");
  };
  const applyLatexToCanvas = () => {
    try {
      const result = objectsFromLatex(latexSource, objects);
      commitObjects(result.objects); setSelectedId(undefined); setLatexDraft(undefined);
      setNotice(`${result.applied} objet${result.applied > 1 ? "s" : ""} mis à jour depuis le LaTeX${result.preserved ? ` ; ${result.preserved} conservé${result.preserved > 1 ? "s" : ""}` : ""}.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Impossible d’appliquer le LaTeX au canevas."); }
  };
  const resetLatexDraft = () => { setLatexDraft(undefined); setNotice("Modifications LaTeX annulées."); };
  const copy = async () => { await navigator.clipboard.writeText(latexSource); setNotice("LaTeX copié dans le presse-papiers."); };
  const exportPdf = async () => {
    const svg = svgRef.current;
    if (!svg) { setNotice("Le canevas n’est pas disponible."); return; }
    setNotice("Création du PDF du schéma…");
    try {
      const [{ jsPDF }, image] = await Promise.all([import("jspdf"), canvasPdfImage(svg)]);
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: [canvasWidth, canvasHeight] });
      pdf.addImage(image, "PNG", 0, 0, canvasWidth, canvasHeight, undefined, "FAST");
      pdf.save("schema-mpsi.pdf");
      setNotice("PDF téléchargé.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Impossible de compiler le PDF."); }
  };

  return <main>
    <header><div><p className="eyebrow">Représentations scientifiques CPGE</p><h1>Sketch2LaTeX — MPSI</h1></div><p className="status" aria-live="polite">{notice}</p></header>
    <section className="programme-note">Bibliothèque structurée à partir du programme de physique-chimie MPSI : optique géométrique, RLC et signaux, mécanique, champs et induction, thermodynamique, chimie des solutions et verrerie de TP.</section>
    <section className="toolbox" aria-label="Outils de représentation MPSI">
      {toolboxGroups.map((group) => <div key={group.title}><strong>{group.title}</strong>{group.kinds.map((kind) => <button key={kind} className={tool === kind ? "active" : ""} onClick={() => setTool(kind)}>{kind === "select" ? "Sélectionner / déplacer" : labels[kind]}</button>)}</div>)}
    </section>
    <section className="graph-controls"><label>Fonction <input value={expression} onChange={(e) => setExpression(e.target.value)} aria-label="Expression de la fonction" /></label><label>Intervalle en x <input value={range} onChange={(e) => setRange(e.target.value)} aria-label="Intervalle des x" /></label><button onClick={addFunction}>Ajouter le graphe</button><button onClick={undo} disabled={!past.length} title="Ctrl/Cmd + Z">↶ Retour</button><button onClick={redo} disabled={!future.length} title="Ctrl/Cmd + Y ou Ctrl/Cmd + Maj + Z">↷ Avancer</button><button onClick={deleteSelected} disabled={!selectedId} title="Touche Suppr">Supprimer la sélection</button><button onClick={() => { if (!objects.length) return; commitObjects([]); setSelectedId(undefined); setNotice("Canevas effacé."); }}>Effacer le canevas</button>
      {selected && <div className="selection-controls" aria-label="Transformation de l’objet sélectionné"><strong>Objet sélectionné · Maj = proportions</strong><label>Taille <input type="range" min="25" max="300" step="5" value={Math.round(((selectedScaleX + selectedScaleY) / 2) * 100)} onChange={(e) => { const scale = Number(e.target.value) / 100; updateSelected({ scale: undefined, scaleX: scale, scaleY: scale }); }} aria-label="Taille proportionnelle de l’objet" /><output>{Math.round(((selectedScaleX + selectedScaleY) / 2) * 100)}%</output></label><label>Largeur <input className="dimension-input" type="number" min="8" step="1" value={selectedWidth} onChange={(e) => updateSelected({ scale: undefined, scaleX: clamp(Number(e.target.value) / Math.max(1, selectedBounds?.width ?? 1), .25, 3) })} aria-label="Largeur de l’objet" /><span>px</span></label><label>Hauteur <input className="dimension-input" type="number" min="8" step="1" value={selectedHeight} onChange={(e) => updateSelected({ scale: undefined, scaleY: clamp(Number(e.target.value) / Math.max(1, selectedBounds?.height ?? 1), .25, 3) })} aria-label="Hauteur de l’objet" /><span>px</span></label><label>Rotation <input type="range" min="-180" max="180" step="1" value={selected.rotation ?? 0} onChange={(e) => updateSelected({ rotation: Number(e.target.value) })} aria-label="Rotation de l’objet" /><input className="angle-input" type="number" min="-180" max="180" value={selected.rotation ?? 0} onChange={(e) => updateSelected({ rotation: Number(e.target.value) || 0 })} aria-label="Angle de rotation en degrés" /><span>°</span></label><button onClick={() => updateSelected({ scale: 1, scaleX: 1, scaleY: 1, rotation: 0 })}>Réinitialiser</button></div>}
    </section>
    <section className="workspace">
      <div className="canvas-wrap"><svg ref={svgRef} viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} aria-label="Canevas de schémas scientifiques">
        <defs><marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#111" /></marker></defs>
        <rect width={canvasWidth} height={canvasHeight} fill="white" />
        {objects.map((object) => <g key={object.id} data-id={object.id} transform={transformFor(object)}>{preview(object, object.id === selectedId)}</g>)}
        {selected && selectionOverlay(selected)}
        {draft && <g opacity=".65" transform={transformFor(draft)}>{preview(draft, true)}</g>}
      </svg></div>
      <aside><div className="code-actions"><label><input type="checkbox" checked={snippetOnly} onChange={(e) => setSnippetOnly(e.target.checked)} /> Extrait TikZ seul</label><button onClick={applyLatexToCanvas} disabled={!latexDirty}>Appliquer au canevas</button><button onClick={resetLatexDraft} disabled={!latexDirty}>Annuler l’édition</button><button onClick={copy}>Copier le LaTeX</button><button onClick={exportPdf}>Exporter le PDF</button></div><p className="latex-help">Le LaTeX est éditable : modifiez les coordonnées, formes ou textes, puis choisissez « Appliquer au canevas ». Conservez les lignes <code>% sketch2latex</code>.</p><textarea value={latexSource} onChange={(event) => setLatexDraft(event.target.value === latex ? undefined : event.target.value)} aria-label="LaTeX éditable synchronisé avec le canevas" spellCheck="false" /></aside>
    </section>
    <footer>Chaque objet est vectoriel, typé et converti de façon déterministe. Les coordonnées du canevas utilisent 50 px = 1 unité TikZ et l’axe vertical est retourné à l’export.</footer>
  </main>;
}
