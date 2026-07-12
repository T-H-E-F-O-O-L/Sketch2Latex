"use client";

/* Autosave hydration intentionally restores client-only state after mount. */
/* eslint-disable react-hooks/set-state-in-effect */

import { PointerEvent, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { annotation, connectorKinds, defaultAnnotations, defaultDocumentSettings, labels, stampKinds, stampSize, toolboxGroups, type CanvasObject, type DocumentSettings, type ObjectKind, type Point } from "./lib/canvas-types";
import { isCompleteAopConfiguration, makeAopCircuit } from "./lib/aop-circuits";
import { circuitGeometry } from "./lib/circuit-geometry";
import { graphPathFor, graphPathsFor } from "./lib/graph";
import { documentFor, objectsFromLatex, roundTripReport } from "./lib/latex";
import { AUTOSAVE_KEY, FAVORITES_KEY, MODE_KEY, downloadText, makeProject, parseProject, saveNamedProject, storedProjects, type ProjectFile } from "./lib/project";
import { cloneTemplateObjects, diagramTemplates } from "./lib/templates";
import { fromWorkingUnit, toWorkingUnit, unitLabel } from "./lib/units";

const canvasWidth = 900;
const canvasHeight = 560;
const objectId = () => Math.random().toString(36).slice(2, 10);
const standardDrawingTools: ObjectKind[] = ["line", "dashed-line", "curve", "arrow", "double-arrow", "dimension", "point", "rect", "circle", "ellipse", "freehand", "text", "axes"];

type HistoryState = { objects: CanvasObject[]; past: CanvasObject[][]; future: CanvasObject[][] };
type HistoryAction =
  | { type: "commit"; objects: CanvasObject[] }
  | { type: "transient"; objects: CanvasObject[] }
  | { type: "finishTransient"; snapshot: CanvasObject[] }
  | { type: "undo" }
  | { type: "redo" };

type DragMode = "move" | "resize" | "rotate" | "endpoint-start" | "endpoint-end" | "control" | "free-point";
type ResizeCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";
type CanvasBounds = { x: number; y: number; width: number; height: number };
type DragState = { id: string; start: Point; original: CanvasObject; snapshot: CanvasObject[]; mode: DragMode; corner?: ResizeCorner; pointIndex?: number };

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

const canvasPoint = (event: PointerEvent<SVGSVGElement>, svg: SVGSVGElement, width = canvasWidth, height = canvasHeight): Point => {
  const matrix = svg.getScreenCTM();
  if (matrix) {
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  }
  const rect = svg.getBoundingClientRect();
  return { x: ((event.clientX - rect.left) / rect.width) * width, y: ((event.clientY - rect.top) / rect.height) * height };
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const scaleXFor = (object: CanvasObject) => object.scaleX ?? object.scale ?? 1;
const scaleYFor = (object: CanvasObject) => object.scaleY ?? object.scale ?? 1;
const strokeFor = (object: CanvasObject) => object.style?.stroke ?? "#111111";
const strokeWidthFor = (object: CanvasObject, selected = false) => Math.max(1, object.style?.strokeWidth ?? 2) + (selected ? .75 : 0);

function boundsFor(object: CanvasObject): CanvasBounds {
  if (connectorKinds.includes(object.kind)) {
    const x2 = object.x2 ?? object.x; const y2 = object.y2 ?? object.y;
    const control = object.kind === "curve" ? object.control ?? { x: (object.x + x2) / 2, y: (object.y + y2) / 2 } : undefined;
    const xs = control ? [object.x, x2, control.x] : [object.x, x2]; const ys = control ? [object.y, y2, control.y] : [object.y, y2];
    const x = Math.min(...xs); const y = Math.min(...ys);
    return { x: x - 8, y: y - 8, width: Math.max(16, Math.max(...xs) - x + 16), height: Math.max(16, Math.max(...ys) - y + 16) };
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

function cornersFor(bounds: CanvasBounds): Array<[ResizeCorner, Point]> {
  return [
    ["top-left", { x: bounds.x, y: bounds.y }], ["top-right", { x: bounds.x + bounds.width, y: bounds.y }],
    ["bottom-left", { x: bounds.x, y: bounds.y + bounds.height }], ["bottom-right", { x: bounds.x + bounds.width, y: bounds.y + bounds.height }],
  ];
}

function cornerObjectAt(objects: CanvasObject[], point: Point) {
  for (const object of [...objects].reverse()) {
    const bounds = boundsFor(object);
    const corner = cornersFor(bounds).find(([, localPoint]) => {
      const transformed = transformedPoint(object, localPoint);
      return Math.hypot(transformed.x - point.x, transformed.y - point.y) <= 12;
    });
    if (corner) return { object, corner: corner[0] };
  }
}

function translateObject(object: CanvasObject, dx: number, dy: number): CanvasObject {
  const translated = { ...object, x: object.x + dx, y: object.y + dy };
  if (connectorKinds.includes(object.kind)) return { ...translated, x2: (object.x2 ?? object.x) + dx, y2: (object.y2 ?? object.y) + dy, control: object.control ? { x: object.control.x + dx, y: object.control.y + dy } : undefined };
  return { ...translated, points: object.points?.map((point) => ({ x: point.x + dx, y: point.y + dy })) };
}

function anchoredResizeTranslation(object: CanvasObject, corner: ResizeCorner, scaleX: number, scaleY: number): Point {
  const oppositeCorner: Record<ResizeCorner, ResizeCorner> = { "top-left": "bottom-right", "top-right": "bottom-left", "bottom-left": "top-right", "bottom-right": "top-left" };
  const opposite = cornersFor(boundsFor(object)).find(([name]) => name === oppositeCorner[corner])?.[1];
  if (!opposite) return { x: 0, y: 0 };
  const center = objectCenter(object); const localX = opposite.x - center.x; const localY = opposite.y - center.y;
  const scaledX = (scaleXFor(object) - scaleX) * localX; const scaledY = (scaleYFor(object) - scaleY) * localY; const angle = ((object.rotation ?? 0) * Math.PI) / 180;
  return { x: scaledX * Math.cos(angle) - scaledY * Math.sin(angle), y: scaledX * Math.sin(angle) + scaledY * Math.cos(angle) };
}

function resizeFromCorner(object: CanvasObject, corner: ResizeCorner, pointer: Point, proportional: boolean): CanvasObject {
  const oppositeCorner: Record<ResizeCorner, ResizeCorner> = { "top-left": "bottom-right", "top-right": "bottom-left", "bottom-left": "top-right", "bottom-right": "top-left" };
  const signs: Record<ResizeCorner, Point> = { "top-left": { x: -1, y: -1 }, "top-right": { x: 1, y: -1 }, "bottom-left": { x: -1, y: 1 }, "bottom-right": { x: 1, y: 1 } };
  const bounds = boundsFor(object); const opposite = cornersFor(bounds).find(([name]) => name === oppositeCorner[corner])?.[1];
  if (!opposite) return object;
  const fixedPoint = transformedPoint(object, opposite); const pointerOffset = localOffset(pointer, fixedPoint, object.rotation ?? 0); const sign = signs[corner];
  let scaleX: number; let scaleY: number;
  if (proportional) {
    const currentDiagonal = Math.hypot(bounds.width * scaleXFor(object), bounds.height * scaleYFor(object));
    const factor = Math.hypot(pointerOffset.x, pointerOffset.y) / Math.max(1, currentDiagonal);
    scaleX = clamp(scaleXFor(object) * factor, 0.25, 3); scaleY = clamp(scaleYFor(object) * factor, 0.25, 3);
  } else {
    scaleX = clamp((pointerOffset.x * sign.x) / Math.max(1, bounds.width), 0.25, 3);
    scaleY = clamp((pointerOffset.y * sign.y) / Math.max(1, bounds.height), 0.25, 3);
  }
  const resized = { ...object, scale: undefined, scaleX, scaleY };
  const translation = anchoredResizeTranslation(object, corner, scaleX, scaleY);
  return translateObject(resized, translation.x, translation.y);
}

function localOffset(point: Point, center: Point, rotation: number): Point {
  const dx = point.x - center.x; const dy = point.y - center.y; const angle = (-rotation * Math.PI) / 180;
  return { x: dx * Math.cos(angle) - dy * Math.sin(angle), y: dx * Math.sin(angle) + dy * Math.cos(angle) };
}

function straightEndpoint(start: Point, end: Point): Point {
  const dx = end.x - start.x; const dy = end.y - start.y; const length = Math.hypot(dx, dy);
  if (!length) return end;
  const step = Math.PI / 4; const angle = Math.round(Math.atan2(dy, dx) / step) * step;
  return { x: start.x + Math.cos(angle) * length, y: start.y + Math.sin(angle) * length };
}

const straightCurveControl = (start: Point, end: Point): Point => ({ x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 });

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
  const color = strokeFor(object); const common = { stroke: color, strokeWidth: strokeWidthFor(object, selected), fill: "none", pointerEvents: "stroke" as const };
  const a = (key: string, fallback: string) => annotation(object, key, fallback);
  const x2 = object.x2 ?? object.x; const y2 = object.y2 ?? object.y;
  const midX = (object.x + x2) / 2; const midY = (object.y + y2) / 2;
  const dx = x2 - object.x; const dy = y2 - object.y; const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length; const uy = dy / length; const px = -uy; const py = ux;
  const rotation = Math.atan2(dy, dx) * 180 / Math.PI;
  if (object.kind === "curve") {
    const control = object.control ?? { x: midX, y: midY };
    return <path {...common} d={`M ${object.x} ${object.y} Q ${control.x} ${control.y} ${x2} ${y2}`} />;
  }
  if (object.kind === "dashed-line") return <line {...common} x1={object.x} y1={object.y} x2={x2} y2={y2} strokeDasharray="7 5" />;
  if (object.kind === "double-arrow") return <line {...common} x1={object.x} y1={object.y} x2={x2} y2={y2} markerStart="url(#arrowhead)" markerEnd="url(#arrowhead)" />;
  if (object.kind === "dimension") return <g><line {...common} x1={object.x} y1={object.y} x2={x2} y2={y2} markerStart="url(#arrowhead)" markerEnd="url(#arrowhead)" /><text x={midX + 9 * px} y={midY + 9 * py} textAnchor="middle" fontSize="14" fill={color} stroke="white" strokeWidth="4" paintOrder="stroke">{a("main", "d")}</text></g>;
  if (object.kind === "resistor") { const g = circuitGeometry.resistor; return <g transform={`translate(${midX} ${midY}) rotate(${rotation})`}><line {...common} x1={-length / 2} y1="0" x2={length / 2} y2="0" /><rect x={-g.halfBody} y={-g.halfHeight} width={g.halfBody * 2} height={g.halfHeight * 2} rx="1.5" fill="white" stroke={color} strokeWidth={strokeWidthFor(object, selected)} /><text className="diagram-label" x="0" y={-g.labelOffset} textAnchor="middle" fill={color}>{a("main", "R")}</text></g>; }
  if (object.kind === "battery" || object.kind === "capacitor") {
    const g = object.kind === "battery" ? circuitGeometry.battery : circuitGeometry.capacitor;
    const negativeHalfPlate = "negativeHalfPlate" in g ? g.negativeHalfPlate : g.halfPlate; const positiveHalfPlate = "positiveHalfPlate" in g ? g.positiveHalfPlate : g.halfPlate;
    return <g><line {...common} x1={object.x} y1={object.y} x2={x2} y2={y2} /><line {...common} x1={midX - g.negativePlateOffset * ux - negativeHalfPlate * px} y1={midY - g.negativePlateOffset * uy - negativeHalfPlate * py} x2={midX - g.negativePlateOffset * ux + negativeHalfPlate * px} y2={midY - g.negativePlateOffset * uy + negativeHalfPlate * py} /><line {...common} x1={midX + g.positivePlateOffset * ux - positiveHalfPlate * px} y1={midY + g.positivePlateOffset * uy - positiveHalfPlate * py} x2={midX + g.positivePlateOffset * ux + positiveHalfPlate * px} y2={midY + g.positivePlateOffset * uy + positiveHalfPlate * py} />{object.kind === "capacitor" && <text className="diagram-label" x={midX + g.labelOffset * px} y={midY + g.labelOffset * py} textAnchor="middle" fill={color}>{a("main", "C")}</text>}</g>;
  }
  if (object.kind === "inductor") { const g = circuitGeometry.inductor; const turnWidth = (g.halfBody * 2) / g.turns; const path = `M ${-g.halfBody} 0 ${Array.from({ length: g.turns }, () => `q ${turnWidth / 2} ${-g.halfHeight} ${turnWidth} 0`).join(" ")}`; return <g transform={`translate(${midX} ${midY}) rotate(${rotation})`}><line {...common} x1={-length / 2} y1="0" x2={-g.halfBody} y2="0" /><path {...common} d={path} /><line {...common} x1={g.halfBody} y1="0" x2={length / 2} y2="0" /><text className="diagram-label" x="0" y={-g.labelOffset} textAnchor="middle" fill={color}>{a("main", "L")}</text></g>; }
  if (object.kind === "switch") return <g><line {...common} x1={object.x} y1={object.y} x2={midX - 12 * ux} y2={midY - 12 * uy} /><line {...common} x1={midX + 14 * ux} y1={midY + 14 * uy} x2={x2} y2={y2} /><line {...common} x1={midX - 12 * ux} y1={midY - 12 * uy} x2={midX + 12 * ux - 12 * px} y2={midY + 12 * uy - 12 * py} /><circle cx={midX - 12 * ux} cy={midY - 12 * uy} r="3" fill={color} /></g>;
  if (object.kind === "voltmeter" || object.kind === "ammeter") return <g><line {...common} x1={object.x} y1={object.y} x2={x2} y2={y2} /><circle cx={midX} cy={midY} r="15" fill="white" stroke={color} strokeWidth={strokeWidthFor(object, selected)} /><text x={midX} y={midY + 5} textAnchor="middle" fontSize="14" fill={color}>{a("main", object.kind === "voltmeter" ? "V" : "A")}</text></g>;
  if (object.kind === "spring") return <polyline {...common} points={Array.from({ length: 11 }, (_, i) => `${object.x + dx * i / 10 + (i === 0 || i === 10 ? 0 : (i % 2 ? 9 : -9) * px)},${object.y + dy * i / 10 + (i === 0 || i === 10 ? 0 : (i % 2 ? 9 : -9) * py)}`).join(" ")} />;
  if (object.kind === "wave") return <polyline {...common} points={Array.from({ length: 17 }, (_, i) => `${object.x + dx * i / 16 + Math.sin(i * Math.PI / 2) * 7 * px},${object.y + dy * i / 16 + Math.sin(i * Math.PI / 2) * 7 * py}`).join(" ")} />;
  if (object.kind.startsWith("bond-")) {
    const offsets = object.kind === "bond-single" ? [0] : object.kind === "bond-double" ? [-1, 1] : [-2, 0, 2];
    return <g>{offsets.map((offset) => <line key={offset} {...common} x1={object.x + px * offset * 4} y1={object.y + py * offset * 4} x2={x2 + px * offset * 4} y2={y2 + py * offset * 4} />)}</g>;
  }
  const markerEnd = ["arrow", "force", "light-ray", "heat-arrow", "work-arrow", "reaction-arrow", "dipole"].includes(object.kind) ? "url(#arrowhead)" : undefined;
  const markerStart = object.kind === "equilibrium-arrow" ? "url(#arrowhead)" : undefined;
  const dashed = object.kind === "hydrogen-bond" ? "5 4" : undefined;
  const label = object.kind === "heat-arrow" ? a("main", "Q") : object.kind === "work-arrow" ? a("main", "W") : object.kind === "dipole" ? a("main", "μ") : undefined;
  return <g><line {...common} x1={object.x} y1={object.y} x2={x2} y2={y2} markerEnd={markerEnd} markerStart={markerStart} strokeDasharray={dashed} />{label && <text x={midX + 8 * px} y={midY + 8 * py} fontSize="14">{label}</text>}</g>;
}

function stampPreview(object: CanvasObject, selected: boolean) {
  const color = strokeFor(object); const common = { stroke: color, strokeWidth: strokeWidthFor(object, selected), fill: "none", pointerEvents: "stroke" as const };
  const x = object.x; const y = object.y; const w = object.width ?? 80; const h = object.height ?? 80; const cx = x + w / 2; const cy = y + h / 2;
  const text = (value: string, tx = cx, ty = cy + 5, fontSize = 13) => <text x={tx} y={ty} textAnchor="middle" fontSize={fontSize} fill={color} stroke="#fff" strokeWidth="3" strokeLinejoin="round" paintOrder="stroke" pointerEvents="all">{value}</text>;
  const a = (key: string, fallback: string) => annotation(object, key, fallback);
  if (object.kind === "equation") {
    let html: string;
    try { html = katex.renderToString(object.text || "x", { throwOnError: false, displayMode: true, output: "html" }); }
    catch { html = `<span>${object.text || "x"}</span>`; }
    return <g><rect {...common} x={x} y={y} width={w} height={h} rx="5" strokeDasharray={selected ? "5 3" : undefined} fill="white" /><foreignObject x={x + 4} y={y + 4} width={Math.max(10, w - 8)} height={Math.max(10, h - 8)} pointerEvents="all"><div className="equation-render" dangerouslySetInnerHTML={{ __html: html }} /></foreignObject></g>;
  }
  if (object.kind === "raw-tikz") {
    const summary = (object.rawTikz ?? "TikZ").replace(/\s+/g, " ").slice(0, 58);
    return <g><rect {...common} x={x} y={y} width={w} height={h} rx="5" strokeDasharray="7 4" fill="#fffdf3" />{text("TikZ protégé", cx, y + 23, 12)}{text(summary, cx, y + 46, 9)}</g>;
  }
  const opAmp = () => {
    const kind = object.kind; const topInput = y + h * .37; const bottomInput = y + h * .66; const boxLeft = x + w * .28; const boxRight = x + w * .8; const inputEnd = boxLeft; const outputX = x + w * .96;
    const inputLine = (fromY: number, toY: number, key: string) => <line key={key} x1={x + w * .04} y1={fromY} x2={inputEnd} y2={toY} />;
    const feedback = ["op-amp-inverting", "op-amp-non-inverting", "op-amp-integrator", "op-amp-differentiator", "op-amp-schmitt"].includes(kind);
    const variantLabel = kind === "op-amp-comparator" ? "Comparateur" : kind === "op-amp-inverting" ? "Inverseur" : kind === "op-amp-non-inverting" ? "Non-inverseur" : kind === "op-amp-summing" ? "Sommateur" : kind === "op-amp-integrator" ? "Intégrateur" : kind === "op-amp-differentiator" ? "Dérivateur" : kind === "op-amp-schmitt" ? "Schmitt" : "AOP";
    return <g {...common} strokeLinecap="round" strokeLinejoin="round">
      <rect x={boxLeft} y={y + h * .15} width={boxRight - boxLeft} height={h * .7} rx="1" fill="white" />
      {inputLine(topInput, topInput, "minus-input")}{inputLine(bottomInput, bottomInput, "plus-input")}
      <line x1={boxRight} y1={cy} x2={outputX} y2={cy} />
      <text className="diagram-sign" x={boxLeft + 11} y={topInput + 5} textAnchor="middle" fill={color}>−</text>
      <text className="diagram-sign" x={boxLeft + 11} y={bottomInput + 5} textAnchor="middle" fill={color}>+</text>
      <path d={`M ${x + w * .49} ${cy - 10} L ${x + w * .49} ${cy + 10} L ${x + w * .57} ${cy} Z`} />
      <text className="diagram-label" x={x + w * .67} y={cy + 6} textAnchor="middle" fontSize="19" fill={color}>∞</text>
      <text className="diagram-output-label" x={x + w * .55} y={y + h * .96} textAnchor="middle" fill={color}>{variantLabel}</text>
      {kind === "op-amp-summing" && <>{inputLine(y + h * .2, topInput, "sum-1")}{inputLine(y + h * .5, topInput, "sum-2")}</>}
      {(kind === "op-amp-inverting" || kind === "op-amp-differentiator") && <polyline points={`${x + w * .04},${topInput} ${x + w * .1},${topInput - 7} ${x + w * .16},${topInput + 7} ${x + w * .22},${topInput - 7} ${inputEnd},${topInput}`} fill="white" />}
      {kind === "op-amp-differentiator" && <><line x1={x + w * .11} y1={topInput - 13} x2={x + w * .11} y2={topInput + 13} /><line x1={x + w * .16} y1={topInput - 13} x2={x + w * .16} y2={topInput + 13} /></>}
      {feedback && <path d={`M ${outputX} ${cy} L ${outputX} ${y + h * .06} L ${x + w * .2} ${y + h * .06} L ${x + w * .2} ${topInput}`} />}
      {kind === "op-amp-integrator" && <><line x1={x + w * .44} y1={y + h * .02} x2={x + w * .44} y2={y + h * .1} /><line x1={x + w * .49} y1={y + h * .02} x2={x + w * .49} y2={y + h * .1} /></>}
      {kind === "op-amp-schmitt" && <path d={`M ${x + w * .18} ${bottomInput} L ${x + w * .18} ${y + h * .94} L ${outputX} ${y + h * .94} L ${outputX} ${cy}`} />}
      {kind === "op-amp-comparator" && <text className="diagram-output-label" x={outputX - 2} y={cy - 8} textAnchor="end" fill={color}>Vₛ</text>}
    </g>;
  };
  if (object.kind.startsWith("op-amp")) return opAmp();
  if (object.kind === "point") return <circle cx={cx} cy={cy} r={Math.min(w, h) * .28} fill={color} stroke="none" pointerEvents="all" />;
  if (object.kind === "ground") return <g {...common}><line x1={cx} y1={y} x2={cx} y2={y + h * .35} /><path d={`M ${x + 6} ${y + h*.35} L ${x + w - 6} ${y + h*.35} M ${x + 11} ${y + h*.53} L ${x + w - 11} ${y + h*.53} M ${x + 17} ${y + h*.71} L ${x + w - 17} ${y + h*.71}`} /></g>;
  if (object.kind === "gbf") return <g {...common}><circle cx={cx} cy={cy} r={w*.36} /><path d={`M ${x+w*.22} ${cy} q ${w*.07} ${-h*.16} ${w*.14} 0 q ${w*.07} ${h*.16} ${w*.14} 0 q ${w*.07} ${-h*.16} ${w*.14} 0`} />{text(a("main", "GBF"), cx, y+h*.78)}</g>;
  if (object.kind === "oscilloscope") return <g {...common}><rect x={x} y={y} width={w} height={h} rx="4" /><path d={`M ${x+w*.15} ${cy} q ${w*.12} ${-h*.2} ${w*.24} 0 q ${w*.12} ${h*.2} ${w*.24} 0 q ${w*.12} ${-h*.2} ${w*.24} 0`} />{text(a("main", "oscillo"), cx, y+h*.88)}</g>;
  if (object.kind === "mass") return <g {...common}><rect x={x+5} y={y+8} width={w-10} height={h-16} fill="white" />{text(a("main", "m"))}</g>;
  if (object.kind === "pulley") return <g {...common}><circle cx={cx} cy={cy} r={w*.32} /><circle cx={cx} cy={cy} r="4" fill={color} /></g>;
  if (object.kind === "pendulum") return <g {...common}><line x1={cx} y1={y+6} x2={cx} y2={y+h*.72} /><circle cx={cx} cy={y+h*.82} r={w*.17} fill="white" /><line x1={cx-w*.25} y1={y+6} x2={cx+w*.25} y2={y+6} /></g>;
  if (object.kind === "reference-frame") return <g {...common}><line x1={x+w*.2} y1={y+h*.78} x2={x+w*.84} y2={y+h*.78} markerEnd="url(#arrowhead)" /><line x1={x+w*.2} y1={y+h*.78} x2={x+w*.2} y2={y+h*.18} markerEnd="url(#arrowhead)" />{text(a("origin", "O"), x+w*.15, y+h*.92)}{text(a("x", "x"), x+w*.91, y+h*.86)}{text(a("y", "y"), x+w*.13, y+h*.15)}</g>;
  if (object.kind === "circular-trajectory") return <g {...common}><circle cx={cx} cy={cy} r={Math.min(w,h)*.35} markerEnd="url(#arrowhead)" /><circle cx={cx} cy={cy} r="3" fill={color} />{text(a("origin", "O"), cx, cy+18)}</g>;
  if (object.kind === "gravity-field") return <g {...common}>{[.2,.5,.8].map((p) => <line key={p} x1={x+w*p} y1={y+h*.15} x2={x+w*p} y2={y+h*.78} markerEnd="url(#arrowhead)" />)}{text(a("main", "g"), x+w*.9, cy)}</g>;
  if (object.kind === "lens") return <g {...common}><line x1={cx} y1={y+h*.1} x2={cx} y2={y+h*.9} /><path d={`M ${cx-w*.08} ${y+h*.16} L ${cx} ${y+h*.1} L ${cx+w*.08} ${y+h*.16} M ${cx-w*.08} ${y+h*.84} L ${cx} ${y+h*.9} L ${cx+w*.08} ${y+h*.84}`} /></g>;
  if (object.kind === "diverging-lens") return <g {...common}><line x1={cx} y1={y+h*.1} x2={cx} y2={y+h*.9} /><path d={`M ${cx-w*.08} ${y+h*.1} L ${cx} ${y+h*.16} L ${cx+w*.08} ${y+h*.1} M ${cx-w*.08} ${y+h*.9} L ${cx} ${y+h*.84} L ${cx+w*.08} ${y+h*.9}`} /></g>;
  if (object.kind === "plane-mirror" || object.kind === "screen") return <g {...common}><line x1={cx} y1={y+4} x2={cx} y2={y+h-4} strokeWidth="4" />{Array.from({length:5},(_,i)=><line key={i} x1={cx} y1={y+12+i*h*.17} x2={cx+(object.kind === "plane-mirror" ? 10 : -10)} y2={y+18+i*h*.17} />)}</g>;
  if (object.kind === "prism") return <path {...common} d={`M ${x+6} ${y+h-6} L ${x+w-6} ${y+h-6} L ${cx} ${y+7} Z`} />;
  if (object.kind === "fiber") return <g {...common}><path d={`M ${x+4} ${y+h*.3} C ${x+w*.35} ${y+h*.2}, ${x+w*.62} ${y+h*.83}, ${x+w-5} ${y+h*.62}`} /><path d={`M ${x+4} ${y+h*.52} C ${x+w*.35} ${y+h*.42}, ${x+w*.62} ${y+h*1.03}, ${x+w-5} ${y+h*.84}`} /></g>;
  if (object.kind === "electric-field") return <g {...common}>{[.22,.5,.78].map((p) => <line key={p} x1={x+w*.12} y1={y+h*p} x2={x+w*.86} y2={y+h*p} markerEnd="url(#arrowhead)" />)}{text(a("main", "E"), x+w*.9, cy-7)}</g>;
  if (object.kind === "magnetic-field-in" || object.kind === "magnetic-field-out") return <g {...common}>{[.25,.5,.75].flatMap((a) => [.3,.7].map((b) => <text key={`${a}${b}`} x={x+w*a} y={y+h*b} textAnchor="middle" fontSize="20">{object.kind === "magnetic-field-in" ? "⊗" : "⊙"}</text>))}</g>;
  if (object.kind === "bar-magnet") return <g {...common}><rect x={x+4} y={y+h*.2} width={w-8} height={h*.6} fill="white" />{text(a("north", "N"), x+w*.28, cy+5)}{text(a("south", "S"), x+w*.72, cy+5)}</g>;
  if (object.kind === "coil" || object.kind === "solenoid") return <g {...common}>{Array.from({length: object.kind === "coil" ? 4 : 6},(_,i)=><ellipse key={i} cx={x+w*(.16+i*(object.kind === "coil" ? .22 : .14))} cy={cy} rx={w*(object.kind === "coil" ? .1 : .12)} ry={h*.32} />)}</g>;
  if (object.kind === "laplace-rails") return <g {...common}><line x1={x+5} y1={y+h*.25} x2={x+w-5} y2={y+h*.25} /><line x1={x+5} y1={y+h*.75} x2={x+w-5} y2={y+h*.75} /><line x1={x+w*.55} y1={y+h*.25} x2={x+w*.55} y2={y+h*.75} strokeWidth="4" /><line x1={x+w*.62} y1={cy} x2={x+w*.85} y2={cy} markerEnd="url(#arrowhead)" />{text(a("velocity", "v"), x+w*.88, cy-6)}</g>;
  if (object.kind === "charged-particle") return <g {...common}><circle cx={cx} cy={cy} r={Math.min(w,h)*.34} fill="white" />{text(a("main", "q"))}</g>;
  if (object.kind === "piston-cylinder") return <g {...common}><path d={`M ${x+w*.18} ${y+h*.9} L ${x+w*.18} ${y+h*.12} L ${x+w*.82} ${y+h*.12} L ${x+w*.82} ${y+h*.9}`} /><line x1={x+w*.14} y1={y+h*.38} x2={x+w*.86} y2={y+h*.38} strokeWidth="4" /><line x1={cx} y1={y+h*.38} x2={cx} y2={y+3} />{text(a("main", "P, V, T"), cx, y+h*.73, 11)}</g>;
  if (object.kind === "thermal-reservoir") return <g {...common}><circle cx={cx} cy={cy} r={Math.min(w,h)*.4} />{text(a("main", "T"))}</g>;
  if (object.kind === "heat-engine") return <g {...common}><rect x={x+w*.2} y={y+h*.28} width={w*.6} height={h*.42} fill="white" />{text(a("main", "machine"), cx, cy+5, 11)}<line x1={cx} y1={y+3} x2={cx} y2={y+h*.25} markerEnd="url(#arrowhead)" /><line x1={cx} y1={y+h*.72} x2={cx} y2={y+h-3} markerEnd="url(#arrowhead)" /><line x1={x+w*.82} y1={cy} x2={x+w-3} y2={cy} markerEnd="url(#arrowhead)" />{text(a("hot", "Qh"), cx+10, y+h*.18, 11)}{text(a("cold", "Qc"), cx+10, y+h*.94, 11)}{text(a("work", "W"), x+w*.92, cy-5, 11)}</g>;
  if (object.kind === "ion") return <g {...common}><circle cx={cx} cy={cy} r={Math.min(w,h)*.34} />{text(a("main", "ion"))}</g>;
  if (object.kind === "lone-pair") return <g><circle cx={cx-7} cy={cy} r="3" fill={color} /><circle cx={cx+7} cy={cy} r="3" fill={color} /></g>;
  if (object.kind === "crystal-fcc") return <g {...common}><rect x={x+w*.14} y={y+h*.28} width={w*.58} height={h*.55} /><path d={`M ${x+w*.14} ${y+h*.28} L ${x+w*.36} ${y+h*.1} L ${x+w*.94} ${y+h*.1} L ${x+w*.72} ${y+h*.28} M ${x+w*.72} ${y+h*.28} L ${x+w*.94} ${y+h*.1} L ${x+w*.94} ${y+h*.65} L ${x+w*.72} ${y+h*.83}`} />{[[.14,.28],[.72,.28],[.14,.83],[.72,.83],[.36,.1],[.94,.1],[.94,.65],[.43,.55]].map(([a,b],i)=><circle key={i} cx={x+w*a} cy={y+h*b} r="4" fill="#111" />)}</g>;
  if (object.kind === "precipitate") return <g {...common}><path d={`M ${x+w*.12} ${y+h*.1} L ${x+w*.22} ${y+h*.88} L ${x+w*.78} ${y+h*.88} L ${x+w*.88} ${y+h*.1}`} /><path d={`M ${x+w*.22} ${y+h*.88} L ${x+w*.78} ${y+h*.88} L ${x+w*.73} ${y+h*.67} L ${x+w*.27} ${y+h*.67} Z`} fill="#c7c7c7" stroke="#111" /></g>;
  if (object.kind === "electrochemical-cell") return <g {...common}><path d={`M ${x+w*.06} ${y+h*.2} L ${x+w*.12} ${y+h*.84} L ${x+w*.39} ${y+h*.84} L ${x+w*.45} ${y+h*.2} M ${x+w*.55} ${y+h*.2} L ${x+w*.61} ${y+h*.84} L ${x+w*.88} ${y+h*.84} L ${x+w*.94} ${y+h*.2}`} /><path d={`M ${x+w*.1} ${y+h*.59} L ${x+w*.13} ${y+h*.81} L ${x+w*.38} ${y+h*.81} L ${x+w*.41} ${y+h*.59} Z M ${x+w*.59} ${y+h*.59} L ${x+w*.62} ${y+h*.81} L ${x+w*.87} ${y+h*.81} L ${x+w*.9} ${y+h*.59} Z`} fill="#dcecff" stroke="none" /><line x1={x+w*.25} y1={y+h*.12} x2={x+w*.25} y2={y+h*.72} strokeWidth="4" /><line x1={x+w*.75} y1={y+h*.12} x2={x+w*.75} y2={y+h*.72} strokeWidth="4" /><path d={`M ${x+w*.31} ${y+h*.66} L ${x+w*.31} ${y+h*.35} Q ${cx} ${y+h*.08} ${x+w*.69} ${y+h*.35} L ${x+w*.69} ${y+h*.66}`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /><path d={`M ${x+w*.25} ${y+h*.12} L ${x+w*.75} ${y+h*.12}`} strokeDasharray="4 3" />{text(a("anode", "anode (−)"), x+w*.25, y+h*.96, 11)}{text(a("cathode", "cathode (+)"), x+w*.75, y+h*.96, 11)}{text(a("bridge", "pont salin"), cx, y+h*.25, 11)}</g>;
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
  return <g {...common}><rect x={x} y={y} width={w} height={h} />{text(a("main", labels[object.kind]))}</g>;
}

function preview(object: CanvasObject, selected: boolean) {
  const color = strokeFor(object); const common = { stroke: color, strokeWidth: strokeWidthFor(object, selected), fill: "none", pointerEvents: "stroke" as const };
  if (connectorKinds.includes(object.kind)) return connectorPreview(object, selected);
  if (object.kind === "rect") return <rect {...common} x={object.x} y={object.y} width={object.width} height={object.height} />;
  if (object.kind === "circle") return <circle {...common} cx={object.x + (object.width ?? 0) / 2} cy={object.y + (object.height ?? 0) / 2} r={Math.abs(object.width ?? 0) / 2} />;
  if (object.kind === "ellipse") return <ellipse {...common} cx={object.x + (object.width ?? 0) / 2} cy={object.y + (object.height ?? 0) / 2} rx={Math.abs(object.width ?? 0) / 2} ry={Math.abs(object.height ?? 0) / 2} />;
  if (object.kind === "freehand") return <polyline {...common} points={(object.points ?? []).map((p) => `${p.x},${p.y}`).join(" ")} />;
  if (object.kind === "text") return <text x={object.x} y={object.y} fill={color} fontSize="17" pointerEvents="all">{object.text}</text>;
  if (object.kind === "axes") {
    const width = object.width ?? 0; const height = object.height ?? 0; const xMin = object.graph?.xMin ?? -5; const xMax = object.graph?.xMax ?? 5;
    const verticalAxis = object.x + clamp((0 - xMin) / Math.max(0.0001, xMax - xMin), 0, 1) * width; const graphPath = graphPathFor(object); const graphPaths = graphPathsFor(object); const clipId = `graph-clip-${object.id}`;
    if (graphPaths.length > 1) {
      const yMin = object.graph?.yMin ?? -5; const yMax = object.graph?.yMax ?? 5; const horizontalAxis = object.y + clamp((yMax - 0) / Math.max(.0001, yMax - yMin), 0, 1) * height; const colors = [color, "#c62828", "#2e7d32", "#ef6c00", "#6a1b9a"];
      return <g><defs><clipPath id={clipId}><rect x={object.x} y={object.y} width={width} height={height} /></clipPath></defs><rect {...common} x={object.x} y={object.y} width={width} height={height} strokeDasharray="3 3" />{object.graph?.showGrid !== false && Array.from({ length: 9 }, (_, index) => <g key={index} opacity=".12"><line x1={object.x + width * index / 8} y1={object.y} x2={object.x + width * index / 8} y2={object.y + height} stroke={color} /><line x1={object.x} y1={object.y + height * index / 8} x2={object.x + width} y2={object.y + height * index / 8} stroke={color} /></g>)}{graphPaths.map((path, index) => <path key={path} d={path} fill="none" stroke={colors[index % colors.length]} strokeWidth={strokeWidthFor(object)} clipPath={`url(#${clipId})`} pointerEvents="stroke" />)}<line {...common} x1={object.x} y1={horizontalAxis} x2={object.x + width} y2={horizontalAxis} markerEnd="url(#arrowhead)" /><line {...common} x1={verticalAxis} y1={object.y + height} x2={verticalAxis} y2={object.y} markerEnd="url(#arrowhead)" /></g>;
    }
    return <g><defs><clipPath id={clipId}><rect x={object.x} y={object.y} width={width} height={height} /></clipPath></defs><rect {...common} x={object.x} y={object.y} width={width} height={height} strokeDasharray="3 3" />{graphPath && <path d={graphPath} fill="none" stroke={color} strokeWidth={strokeWidthFor(object)} clipPath={`url(#${clipId})`} pointerEvents="stroke" />}<line {...common} x1={object.x} y1={object.y + height / 2} x2={object.x + width} y2={object.y + height / 2} markerEnd="url(#arrowhead)" /><line {...common} x1={verticalAxis} y1={object.y + height} x2={verticalAxis} y2={object.y} markerEnd="url(#arrowhead)" /><text x={object.x + 8} y={object.y + 20} fontSize="14" fill={color}>{object.graph?.expression ? `y = ${object.graph.expression}` : "repère"}</text></g>;
  }
  return stampPreview(object, selected);
}

function selectionOverlay(object: CanvasObject) {
  const bounds = boundsFor(object); const rotateY = bounds.y - 28;
  return <g data-id={object.id} transform={transformFor(object)} className="selection-overlay">
    <rect className="selection-frame" x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} />
    <line className="selection-stem" x1={bounds.x + bounds.width / 2} y1={bounds.y} x2={bounds.x + bounds.width / 2} y2={rotateY + 7} />
    <circle className="rotation-handle" data-handle="rotate" cx={bounds.x + bounds.width / 2} cy={rotateY} r="7" aria-label="Tourner l’objet" />
    {cornersFor(bounds).map(([corner, point]) => <rect key={corner} className="resize-handle" data-handle="resize" data-corner={corner} x={point.x - 6} y={point.y - 6} width="12" height="12" rx="2" aria-label="Redimensionner l’objet" />)}
  </g>;
}

const deepCloneObjects = (objects: CanvasObject[]) => objects.map((object) => ({ ...object, style: object.style ? { ...object.style } : undefined, annotations: object.annotations ? { ...object.annotations } : undefined, graph: object.graph ? { ...object.graph, expressions: object.graph.expressions ? [...object.graph.expressions] : undefined } : undefined, points: object.points?.map((point) => ({ ...point })), control: object.control ? { ...object.control } : undefined, bindings: object.bindings ? { ...object.bindings } : undefined }));

function connectionPoint(object: CanvasObject, toward: Point): Point {
  const bounds = boundsFor(object); const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const dx = toward.x - center.x; const dy = toward.y - center.y;
  if (!dx && !dy) return center;
  const factor = Math.min(Math.abs((bounds.width / 2) / (dx || .0001)), Math.abs((bounds.height / 2) / (dy || .0001)));
  return { x: center.x + dx * factor, y: center.y + dy * factor };
}

function bindableAt(objects: CanvasObject[], point: Point, excludeId?: string) {
  return [...objects].reverse().find((object) => object.id !== excludeId && !connectorKinds.includes(object.kind) && !object.hidden && !object.locked && (() => {
    const bounds = boundsFor(object); const dx = Math.max(bounds.x - point.x, 0, point.x - bounds.x - bounds.width); const dy = Math.max(bounds.y - point.y, 0, point.y - bounds.y - bounds.height);
    return Math.hypot(dx, dy) <= 28;
  })());
}

function resolveConnections(objects: CanvasObject[]): CanvasObject[] {
  const lookup = new Map(objects.map((object) => [object.id, object]));
  return objects.map((object) => {
    if (!connectorKinds.includes(object.kind) || !object.bindings) return object;
    let next = object; const start = object.bindings.startId ? lookup.get(object.bindings.startId) : undefined; const end = object.bindings.endId ? lookup.get(object.bindings.endId) : undefined;
    if (start) { const point = connectionPoint(start, { x: object.x2 ?? object.x, y: object.y2 ?? object.y }); next = { ...next, x: point.x, y: point.y }; }
    if (end) { const point = connectionPoint(end, { x: next.x, y: next.y }); next = { ...next, x2: point.x, y2: point.y }; }
    return next;
  });
}

const snapPoint = (point: Point, settings: DocumentSettings, bypass = false): Point => !settings.snapToGrid || bypass ? point : ({ x: Math.round(point.x / settings.gridSize) * settings.gridSize, y: Math.round(point.y / settings.gridSize) * settings.gridSize });

function cleanSvg(svg: SVGSVGElement, width: number, height: number) {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.querySelectorAll("[data-export-ignore]").forEach((element) => element.remove());
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg"); copy.setAttribute("width", String(width)); copy.setAttribute("height", String(height)); copy.setAttribute("viewBox", `0 0 ${width} ${height}`);
  return copy;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyHome() {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragChangedRef = useRef(false);
  const [tool, setTool] = useState<ObjectKind | "select">("select");
  const [{ objects, past, future }, dispatchHistory] = useReducer(historyReducer, { objects: [], past: [], future: [] });
  const [selectedId, setSelectedId] = useState<string>();
  const [draft, setDraft] = useState<CanvasObject>();
  const [curveAnchor, setCurveAnchor] = useState<{ start: Point; end?: Point }>();
  const [drag, setDrag] = useState<DragState>();
  const [snippetOnly, setSnippetOnly] = useState(false);
  const [notice, setNotice] = useState("Choisissez un outil puis dessinez sur le canevas.");
  const [drawingColor, setDrawingColor] = useState("#111111");
  const [drawingWidth, setDrawingWidth] = useState(2);
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
  const activeColor = selected?.style?.stroke ?? drawingColor; const activeStrokeWidth = selected?.style?.strokeWidth ?? drawingWidth;
  const drawingStyle = { stroke: drawingColor, strokeWidth: drawingWidth };
  const commitObjects = useCallback((next: CanvasObject[]) => dispatchHistory({ type: "commit", objects: next }), []);
  const undo = useCallback(() => { dispatchHistory({ type: "undo" }); setSelectedId(undefined); }, []);
  const redo = useCallback(() => { dispatchHistory({ type: "redo" }); setSelectedId(undefined); }, []);
  const updateSelected = useCallback((change: Partial<CanvasObject>) => {
    if (!selectedId) return;
    commitObjects(objects.map((object) => object.id === selectedId ? { ...object, ...change } : object));
  }, [commitObjects, objects, selectedId]);
  const applyDrawingColor = (color: string) => { setDrawingColor(color); if (selected) updateSelected({ style: { ...selected.style, stroke: color, strokeWidth: selected.style?.strokeWidth ?? drawingWidth } }); };
  const applyDrawingWidth = (strokeWidth: number) => { setDrawingWidth(strokeWidth); if (selected) updateSelected({ style: { ...selected.style, stroke: selected.style?.stroke ?? drawingColor, strokeWidth } }); };
  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    commitObjects(objects.filter((object) => object.id !== selectedId)); setSelectedId(undefined); setNotice("Objet supprimé.");
  }, [commitObjects, objects, selectedId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.("input, textarea")) return;
      if (event.key === "Escape" && tool === "curve") { setCurveAnchor(undefined); setDraft(undefined); setNotice("Création de courbe annulée."); return; }
      if (event.key === "Delete" || event.key === "Del" || event.code === "Delete") { if (selectedId) { event.preventDefault(); event.stopPropagation(); deleteSelected(); } return; }
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
      if (key === "y") { event.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [deleteSelected, redo, selectedId, tool, undo]);

  const makeObject = (p: Point): CanvasObject => {
    const kind = tool as ObjectKind;
    if (stampKinds.includes(kind)) { const size = stampSize(kind); return { id: objectId(), kind, x: p.x - size.width / 2, y: p.y - size.height / 2, annotations: defaultAnnotations(kind), style: drawingStyle, ...size }; }
    if (kind === "text") return { id: objectId(), kind, x: p.x, y: p.y, text: "Étiquette", style: drawingStyle };
    if (kind === "axes") return { id: objectId(), kind, x: p.x, y: p.y, width: 250, height: 180, style: drawingStyle };
    if (kind === "freehand") return { id: objectId(), kind, x: p.x, y: p.y, points: [p], style: drawingStyle };
    if (connectorKinds.includes(kind)) return { id: objectId(), kind, x: p.x, y: p.y, x2: p.x, y2: p.y, annotations: defaultAnnotations(kind), style: drawingStyle };
    return { id: objectId(), kind, x: p.x, y: p.y, width: 0, height: 0, style: drawingStyle };
  };

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current; if (!svg) return;
    event.currentTarget.focus({ preventScroll: true });
    const p = canvasPoint(event, svg); const element = event.target as Element; const target = element.closest("[data-id]")?.getAttribute("data-id");
    const handle = element.closest("[data-handle]")?.getAttribute("data-handle");
    const resizeCorner = element.closest("[data-corner]")?.getAttribute("data-corner") as ResizeCorner | null;
    if (tool === "curve") {
      if (!curveAnchor) { setCurveAnchor({ start: p }); setDraft(undefined); setNotice("Cliquez le point d’arrivée de la courbe."); return; }
      if (!curveAnchor.end) {
        const end = event.shiftKey ? straightEndpoint(curveAnchor.start, p) : p;
        const control = straightCurveControl(curveAnchor.start, end);
        setCurveAnchor({ ...curveAnchor, end });
        setDraft({ id: objectId(), kind: "curve", x: curveAnchor.start.x, y: curveAnchor.start.y, x2: end.x, y2: end.y, control, style: drawingStyle });
        setNotice("Placez le point de courbure, puis cliquez pour terminer.");
        return;
      }
      const completed: CanvasObject = { id: draft?.id ?? objectId(), kind: "curve", x: curveAnchor.start.x, y: curveAnchor.start.y, x2: curveAnchor.end.x, y2: curveAnchor.end.y, control: event.shiftKey ? straightCurveControl(curveAnchor.start, curveAnchor.end) : p, style: draft?.style ?? drawingStyle };
      commitObjects([...objects, completed]); setSelectedId(completed.id); setDraft(undefined); setCurveAnchor(undefined); setTool("select"); setNotice("Courbe ajoutée au canevas.");
      return;
    }
    const cornerObject = handle ? undefined : cornerObjectAt(objects, p);
    if (cornerObject) {
      dragChangedRef.current = false; setTool("select"); setSelectedId(cornerObject.object.id); setDrag({ id: cornerObject.object.id, start: p, original: cornerObject.object, snapshot: objects, mode: "resize", corner: cornerObject.corner }); event.currentTarget.setPointerCapture(event.pointerId); return;
    }
    if (tool === "select" && target) {
      const original = objects.find((o) => o.id === target); if (!original) return;
      const mode: DragMode = handle === "resize" ? "resize" : handle === "rotate" ? "rotate" : "move";
      const corner = mode === "resize" ? resizeCorner ?? cornerObjectAt([original], p)?.corner : undefined;
      dragChangedRef.current = false; setSelectedId(target); setDrag({ id: target, start: p, original, snapshot: objects, mode, corner }); event.currentTarget.setPointerCapture(event.pointerId); return;
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
      const next = drag.mode === "resize"
        ? drag.corner ? resizeFromCorner(o, drag.corner, p, event.shiftKey) : o
        : drag.mode === "rotate"
          ? { ...o, rotation: Math.round(((o.rotation ?? 0) + (Math.atan2(p.y - center.y, p.x - center.x) - Math.atan2(drag.start.y - center.y, drag.start.x - center.x)) * 180 / Math.PI) * 10) / 10 }
          : translateObject(o, dx, dy);
      dispatchHistory({ type: "transient", objects: objects.map((item) => item.id !== o.id ? item : next) });
      return;
    }
    if (tool === "curve" && curveAnchor) {
      if (!curveAnchor.end) {
        const end = event.shiftKey ? straightEndpoint(curveAnchor.start, p) : p;
        setDraft({ id: draft?.id ?? objectId(), kind: "curve", x: curveAnchor.start.x, y: curveAnchor.start.y, x2: end.x, y2: end.y, control: straightCurveControl(curveAnchor.start, end), style: draft?.style ?? drawingStyle });
      } else setDraft({ id: draft?.id ?? objectId(), kind: "curve", x: curveAnchor.start.x, y: curveAnchor.start.y, x2: curveAnchor.end.x, y2: curveAnchor.end.y, control: event.shiftKey ? straightCurveControl(curveAnchor.start, curveAnchor.end) : p, style: draft?.style ?? drawingStyle });
      return;
    }
    if (!draft) return;
    if (draft.kind === "freehand") {
      const endpoint = event.shiftKey ? straightEndpoint({ x: draft.x, y: draft.y }, p) : p;
      setDraft({ ...draft, points: event.shiftKey ? [{ x: draft.x, y: draft.y }, endpoint] : [...(draft.points ?? []), endpoint] });
    }
    else if (connectorKinds.includes(draft.kind)) {
      const endpoint = event.shiftKey ? straightEndpoint({ x: draft.x, y: draft.y }, p) : p;
      setDraft({ ...draft, x2: endpoint.x, y2: endpoint.y });
    }
    else setDraft({ ...draft, width: p.x - draft.x, height: p.y - draft.y });
  };
  const onPointerUp = (event: PointerEvent<SVGSVGElement>) => {
    if (tool === "curve") { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); return; }
    if (draft) {
      const releasePoint = canvasPoint(event, svgRef.current ?? event.currentTarget);
      const finalDraft = event.shiftKey && connectorKinds.includes(draft.kind)
        ? { ...draft, ...(() => { const endpoint = straightEndpoint({ x: draft.x, y: draft.y }, releasePoint); return { x2: endpoint.x, y2: endpoint.y }; })() }
        : event.shiftKey && draft.kind === "freehand"
          ? { ...draft, points: [{ x: draft.x, y: draft.y }, straightEndpoint({ x: draft.x, y: draft.y }, releasePoint)] }
          : draft;
      commitObjects([...objects, finalDraft]); setSelectedId(finalDraft.id); if (!standardDrawingTools.includes(finalDraft.kind)) setTool("select"); setDraft(undefined);
    }
    else if (drag && dragChangedRef.current) dispatchHistory({ type: "finishTransient", snapshot: drag.snapshot });
    setDrag(undefined); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const addFunction = () => {
    const [xMin, xMax] = range.split(":").map(Number);
    if (!expression.trim() || !Number.isFinite(xMin) || !Number.isFinite(xMax)) { setNotice("Utilisez une expression et un intervalle, par exemple -5:5."); return; }
    const next = { id: objectId(), kind: "axes" as const, x: 40, y: 350, width: 250, height: 180, graph: { expression, xMin, xMax }, style: drawingStyle };
    if (!graphPathFor(next)) { setNotice("Expression non reconnue. Utilisez par exemple sin(deg(x)), x^2, exp(x), sqrt(x) ou abs(x)."); return; }
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
      {toolboxGroups.map((group) => <div key={group.title}><strong>{group.title}</strong>{group.kinds.map((kind) => <button key={kind} className={tool === kind ? "active" : ""} onClick={() => setTool(kind)}>{kind === "select" ? "Sélectionner / déplacer" : labels[kind]}</button>)}{group.title === "Outils" && <div className="tool-style-controls"><label>Couleur <input type="color" value={activeColor} onChange={(event) => applyDrawingColor(event.target.value)} aria-label="Couleur du tracé ou de l’objet sélectionné" /></label><div className="color-swatches" aria-label="Couleurs rapides">{["#111111", "#1769aa", "#c62828", "#2e7d32", "#ef6c00", "#6a1b9a"].map((color) => <button key={color} className="color-swatch" style={{ backgroundColor: color }} onClick={() => applyDrawingColor(color)} aria-label={`Choisir la couleur ${color}`} title={color} />)}</div><label>Épaisseur <input type="range" min="1" max="8" step="1" value={activeStrokeWidth} onChange={(event) => applyDrawingWidth(Number(event.target.value))} aria-label="Épaisseur du tracé" /><output>{activeStrokeWidth}px</output></label></div>}</div>)}
    </section>
    <section className="graph-controls"><label>Fonction <input value={expression} onChange={(e) => setExpression(e.target.value)} aria-label="Expression de la fonction" /></label><label>Intervalle en x <input value={range} onChange={(e) => setRange(e.target.value)} aria-label="Intervalle des x" /></label><button onClick={addFunction}>Ajouter le graphe</button><button onClick={undo} disabled={!past.length} title="Ctrl/Cmd + Z">↶ Retour</button><button onClick={redo} disabled={!future.length} title="Ctrl/Cmd + Y ou Ctrl/Cmd + Maj + Z">↷ Avancer</button><button onClick={deleteSelected} disabled={!selectedId} title="Touche Suppr">Supprimer la sélection</button><button onClick={() => { if (!objects.length) return; commitObjects([]); setSelectedId(undefined); setNotice("Canevas effacé."); }}>Effacer le canevas</button>
      {selected && <div className="selection-controls" aria-label="Transformation de l’objet sélectionné"><strong>Coins : côté opposé fixe · Maj = proportions</strong><label>Taille <input type="range" min="25" max="300" step="5" value={Math.round(((selectedScaleX + selectedScaleY) / 2) * 100)} onChange={(e) => { const scale = Number(e.target.value) / 100; updateSelected({ scale: undefined, scaleX: scale, scaleY: scale }); }} aria-label="Taille proportionnelle de l’objet" /><output>{Math.round(((selectedScaleX + selectedScaleY) / 2) * 100)}%</output></label><label>Largeur <input className="dimension-input" type="number" min="8" step="1" value={selectedWidth} onChange={(e) => updateSelected({ scale: undefined, scaleX: clamp(Number(e.target.value) / Math.max(1, selectedBounds?.width ?? 1), .25, 3) })} aria-label="Largeur de l’objet" /><span>px</span></label><label>Hauteur <input className="dimension-input" type="number" min="8" step="1" value={selectedHeight} onChange={(e) => updateSelected({ scale: undefined, scaleY: clamp(Number(e.target.value) / Math.max(1, selectedBounds?.height ?? 1), .25, 3) })} aria-label="Hauteur de l’objet" /><span>px</span></label><label>Rotation <input type="range" min="-180" max="180" step="1" value={selected.rotation ?? 0} onChange={(e) => updateSelected({ rotation: Number(e.target.value) })} aria-label="Rotation de l’objet" /><input className="angle-input" type="number" min="-180" max="180" value={selected.rotation ?? 0} onChange={(e) => updateSelected({ rotation: Number(e.target.value) || 0 })} aria-label="Angle de rotation en degrés" /><span>°</span></label><button onClick={() => updateSelected({ scale: 1, scaleX: 1, scaleY: 1, rotation: 0 })}>Réinitialiser</button></div>}
    </section>
    <section className="workspace">
      <div className="canvas-wrap"><svg ref={svgRef} tabIndex={0} viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} aria-label="Canevas de schémas scientifiques">
        <defs><marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" /></marker></defs>
        <rect width={canvasWidth} height={canvasHeight} fill="white" />
        {objects.map((object) => <g key={object.id} data-id={object.id} transform={transformFor(object)}>{preview(object, object.id === selectedId)}</g>)}
        {selected && selectionOverlay(selected)}
        {draft && <g opacity=".65" transform={transformFor(draft)}>{preview(draft, true)}</g>}
        {draft?.kind === "curve" && draft.control && <g pointerEvents="none" opacity=".75"><line x1={draft.x} y1={draft.y} x2={draft.control.x} y2={draft.control.y} stroke="#2176ae" strokeDasharray="4 4" /><line x1={draft.control.x} y1={draft.control.y} x2={draft.x2} y2={draft.y2} stroke="#2176ae" strokeDasharray="4 4" /><circle cx={draft.control.x} cy={draft.control.y} r="5" fill="#2176ae" /></g>}
      </svg></div>
      <aside><div className="code-actions"><label><input type="checkbox" checked={snippetOnly} onChange={(e) => setSnippetOnly(e.target.checked)} /> Extrait TikZ seul</label><button onClick={applyLatexToCanvas} disabled={!latexDirty}>Appliquer au canevas</button><button onClick={resetLatexDraft} disabled={!latexDirty}>Annuler l’édition</button><button onClick={copy}>Copier le LaTeX</button><button onClick={exportPdf}>Exporter le PDF</button></div><p className="latex-help">Chaque objet comporte un bloc <code>% @sketch2latex &#123;…&#125;</code> éditable. Exemple pour un ion : remplacez <code>&quot;main&quot;:&quot;ion&quot;</code> par <code>&quot;main&quot;:&quot;Na+&quot;</code>, puis choisissez « Appliquer au canevas ». La couleur et l’épaisseur sont enregistrées dans <code>&quot;style&quot;</code> ; les libellés visibles et les coordonnées TikZ des formes simples restent aussi synchronisés.</p><textarea value={latexSource} onChange={(event) => setLatexDraft(event.target.value === latex ? undefined : event.target.value)} aria-label="LaTeX éditable synchronisé avec le canevas" spellCheck="false" /></aside>
    </section>
    <footer>Chaque objet est vectoriel, typé et converti de façon déterministe. Les coordonnées du canevas utilisent 50 px = 1 unité TikZ et l’axe vertical est retourné à l’export.</footer>
  </main>;
}

type ActiveTool = ObjectKind | "select" | "eraser" | "pan";
type PanelName = "library" | "templates" | "project" | "document";
type TemplateMode = "replace" | "insert" | "cursor";

export default function Home() {
  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragChangedRef = useRef(false);
  const clipboardRef = useRef<CanvasObject[]>([]);
  const hydratedRef = useRef(false);
  const panDragRef = useRef<{ client: Point; origin: Point } | undefined>(undefined);
  const lastCanvasPointRef = useRef<Point>({ x: canvasWidth / 2, y: canvasHeight / 2 });
  const [{ objects, past, future }, dispatchHistory] = useReducer(historyReducer, { objects: [], past: [], future: [] });
  const [tool, setTool] = useState<ActiveTool>("select");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<CanvasObject>();
  const [curveAnchor, setCurveAnchor] = useState<{ start: Point; end?: Point }>();
  const [drag, setDrag] = useState<DragState>();
  const [marquee, setMarquee] = useState<{ start: Point; end: Point }>();
  const [settings, setSettings] = useState<DocumentSettings>(defaultDocumentSettings);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const [mode, setMode] = useState<"beginner" | "advanced">("beginner");
  const [panel, setPanel] = useState<PanelName>("library");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [templateCategory, setTemplateCategory] = useState("Toutes");
  const [templateMode, setTemplateMode] = useState<TemplateMode>("replace");
  const [projectName, setProjectName] = useState("Mon schéma");
  const [savedProjects, setSavedProjects] = useState<ProjectFile[]>([]);
  const [notice, setNotice] = useState("Prêt. Le projet est enregistré automatiquement sur cet appareil.");
  const [lastSaved, setLastSaved] = useState<string>();
  const [snippetOnly, setSnippetOnly] = useState(false);
  const [latexDraft, setLatexDraft] = useState<string>();
  const [drawingStyle, setDrawingStyle] = useState({ stroke: "#111111", strokeWidth: 2 });
  const [expression, setExpression] = useState("sin(x); cos(x)");
  const [xRange, setXRange] = useState("-5:5");
  const [yRange, setYRange] = useState("-5:5");
  const [marqueeEnabled, setMarqueeEnabled] = useState(true);
  const [clipboardCount, setClipboardCount] = useState(0);

  const selected = selectedIds.length === 1 ? objects.find((object) => object.id === selectedIds[0]) : undefined;
  const selectedObjects = useMemo(() => objects.filter((object) => selectedIds.includes(object.id)), [objects, selectedIds]);
  const latex = useMemo(() => documentFor(objects.filter((object) => !object.hidden), snippetOnly, settings), [objects, settings, snippetOnly]);
  const latexSource = latexDraft ?? latex;
  const latexDirty = latexDraft !== undefined;
  const roundTrip = useMemo(() => roundTripReport(latexSource, objects.filter((object) => !object.hidden)), [latexSource, objects]);
  const filteredGroups = useMemo(() => toolboxGroups.map((group) => ({ ...group, kinds: group.kinds.filter((kind) => kind === "select" || labels[kind].toLocaleLowerCase("fr").includes(search.toLocaleLowerCase("fr"))) })).filter((group) => group.kinds.length), [search]);
  const categories = useMemo(() => ["Toutes", ...new Set(diagramTemplates.map((template) => template.category))], []);
  const filteredTemplates = diagramTemplates.filter((template) => (templateCategory === "Toutes" || template.category === templateCategory) && `${template.title} ${template.description}`.toLocaleLowerCase("fr").includes(search.toLocaleLowerCase("fr")));

  const commitObjects = useCallback((next: CanvasObject[], message?: string) => {
    dispatchHistory({ type: "commit", objects: resolveConnections(next) });
    if (message) setNotice(message);
  }, []);
  const undo = useCallback(() => dispatchHistory({ type: "undo" }), []);
  const redo = useCallback(() => dispatchHistory({ type: "redo" }), []);

  useEffect(() => {
    try {
      const autosave = localStorage.getItem(AUTOSAVE_KEY);
      if (autosave) {
        const project = parseProject(autosave); dispatchHistory({ type: "transient", objects: project.objects }); setSettings(project.settings); setProjectName(project.name); setNotice("Dernière sauvegarde automatique restaurée.");
      }
      setFavorites(JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]"));
      setMode(localStorage.getItem(MODE_KEY) === "advanced" ? "advanced" : "beginner");
      setSavedProjects(storedProjects());
    } catch { setNotice("Le brouillon local était illisible ; un projet vide a été ouvert."); }
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const timer = window.setTimeout(() => {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(makeProject(projectName, objects, settings)));
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); setLastSaved(time);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [objects, projectName, settings]);

  useEffect(() => { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem(MODE_KEY, mode); }, [mode]);
  useEffect(() => { if (!latexDirty) setLatexDraft(undefined); }, [latex, latexDirty]);
  useEffect(() => { setSelectedIds((ids) => ids.filter((id) => objects.some((object) => object.id === id))); }, [objects]);

  const updateSelected = useCallback((patch: Partial<CanvasObject>, message?: string) => {
    if (!selectedIds.length) return;
    commitObjects(objects.map((object) => selectedIds.includes(object.id) ? { ...object, ...patch } : object), message);
  }, [commitObjects, objects, selectedIds]);

  const updateOne = useCallback((id: string, patch: Partial<CanvasObject>) => commitObjects(objects.map((object) => object.id === id ? { ...object, ...patch } : object)), [commitObjects, objects]);

  const deleteSelected = useCallback(() => {
    if (!selectedIds.length) return;
    const ids = new Set(selectedIds); commitObjects(objects.filter((object) => !ids.has(object.id)).map((object) => object.bindings ? { ...object, bindings: { startId: ids.has(object.bindings.startId ?? "") ? undefined : object.bindings.startId, endId: ids.has(object.bindings.endId ?? "") ? undefined : object.bindings.endId } } : object), "Sélection supprimée. Utilisez Annuler pour la restaurer."); setSelectedIds([]);
  }, [commitObjects, objects, selectedIds]);

  const copySelection = useCallback(() => {
    setClipboardCount(selectedObjects.length);
    clipboardRef.current = deepCloneObjects(selectedObjects); setNotice(`${selectedObjects.length} objet${selectedObjects.length > 1 ? "s" : ""} copié${selectedObjects.length > 1 ? "s" : ""}.`);
  }, [selectedObjects]);
  const pasteSelection = useCallback(() => {
    if (!clipboardRef.current.length) return;
    const idMap = new Map(clipboardRef.current.map((object) => [object.id, objectId()]));
    const pasted = clipboardRef.current.map((object) => ({ ...translateObject(object, 24, 24), id: idMap.get(object.id)!, groupId: object.groupId ? `group-${objectId()}` : undefined, bindings: object.bindings ? { startId: idMap.get(object.bindings.startId ?? ""), endId: idMap.get(object.bindings.endId ?? "") } : undefined }));
    commitObjects([...objects, ...pasted], "Copie collée avec un décalage de 24 px."); setSelectedIds(pasted.map((object) => object.id));
  }, [commitObjects, objects]);
  const duplicateSelection = useCallback(() => { copySelection(); window.setTimeout(pasteSelection, 0); }, [copySelection, pasteSelection]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const input = event.target as HTMLElement; if (["INPUT", "TEXTAREA", "SELECT"].includes(input.tagName)) return;
      const command = event.ctrlKey || event.metaKey; const key = event.key.toLowerCase();
      if ((event.key === "Delete" || event.key === "Backspace") && selectedIds.length) { event.preventDefault(); deleteSelected(); }
      else if (command && key === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
      else if (command && key === "y") { event.preventDefault(); redo(); }
      else if (command && key === "c") { event.preventDefault(); copySelection(); }
      else if (command && key === "v") { event.preventDefault(); pasteSelection(); }
      else if (command && key === "d") { event.preventDefault(); duplicateSelection(); }
      else if (command && key === "a") { event.preventDefault(); setSelectedIds(objects.filter((object) => !object.hidden && !object.locked).map((object) => object.id)); }
      else if (event.key === "Escape") { setDraft(undefined); setCurveAnchor(undefined); setMarquee(undefined); setTool("select"); }
      else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) && selectedIds.length) {
        event.preventDefault(); const step = event.shiftKey ? 10 : 1; const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0; const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
        commitObjects(objects.map((object) => selectedIds.includes(object.id) && !object.locked ? translateObject(object, dx, dy) : object));
      }
    };
    window.addEventListener("keydown", onKeyDown, true); return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [copySelection, deleteSelected, duplicateSelection, objects, pasteSelection, redo, selectedIds, undo, commitObjects]);

  const makeObject = (point: Point): CanvasObject => {
    const kind = tool as ObjectKind;
    if (kind === "equation") return { id: objectId(), kind, x: point.x - 110, y: point.y - 35, width: 220, height: 70, text: "\\vec{F}=m\\vec{a}", style: drawingStyle };
    if (stampKinds.includes(kind)) { const size = stampSize(kind); return { id: objectId(), kind, x: point.x - size.width / 2, y: point.y - size.height / 2, annotations: defaultAnnotations(kind), style: drawingStyle, ...size }; }
    if (kind === "text") return { id: objectId(), kind, x: point.x, y: point.y, text: "Étiquette", style: drawingStyle };
    if (kind === "axes") return { id: objectId(), kind, x: point.x, y: point.y, width: 300, height: 210, graph: { expression: "", expressions: [], xMin: -5, xMax: 5, yMin: -5, yMax: 5, xLabel: "x", yLabel: "y", showGrid: true }, style: drawingStyle };
    if (kind === "freehand") return { id: objectId(), kind, x: point.x, y: point.y, points: [point], style: drawingStyle };
    if (connectorKinds.includes(kind)) { const startTarget = bindableAt(objects, point); const start = startTarget ? connectionPoint(startTarget, point) : point; return { id: objectId(), kind, x: start.x, y: start.y, x2: start.x, y2: start.y, annotations: defaultAnnotations(kind), bindings: startTarget ? { startId: startTarget.id } : undefined, style: drawingStyle }; }
    return { id: objectId(), kind, x: point.x, y: point.y, width: 0, height: 0, style: drawingStyle };
  };

  const chooseObject = (id: string, additive: boolean) => {
    const object = objects.find((item) => item.id === id); if (!object || object.hidden || object.locked) return;
    const groupIds = object.groupId ? objects.filter((item) => item.groupId === object.groupId).map((item) => item.id) : [id];
    setSelectedIds((current) => additive ? (current.includes(id) ? current.filter((value) => !groupIds.includes(value)) : [...new Set([...current, ...groupIds])]) : groupIds);
  };

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current; if (!svg) return; svg.focus({ preventScroll: true });
    const raw = canvasPoint(event, svg, settings.width, settings.height); const point = snapPoint(raw, settings, event.altKey); lastCanvasPointRef.current = point; const element = event.target as Element; const targetId = element.closest("[data-id]")?.getAttribute("data-id"); const handle = element.closest("[data-handle]")?.getAttribute("data-handle"); const corner = element.closest("[data-corner]")?.getAttribute("data-corner") as ResizeCorner | undefined; const pointIndex = Number(element.closest("[data-point-index]")?.getAttribute("data-point-index"));
    if (tool === "pan" || event.button === 1 || event.buttons === 4) { panDragRef.current = { client: { x: event.clientX, y: event.clientY }, origin: { x: view.x, y: view.y } }; event.currentTarget.setPointerCapture(event.pointerId); return; }
    if (tool === "eraser" && targetId) { commitObjects(objects.filter((object) => object.id !== targetId), "Objet effacé. Utilisez Annuler pour le récupérer."); return; }
    if (tool === "curve") {
      if (!curveAnchor) { setCurveAnchor({ start: point }); setNotice("Cliquez l’arrivée de la courbe."); return; }
      if (!curveAnchor.end) { const end = event.shiftKey ? straightEndpoint(curveAnchor.start, point) : point; setCurveAnchor({ ...curveAnchor, end }); setDraft({ id: objectId(), kind: "curve", x: curveAnchor.start.x, y: curveAnchor.start.y, x2: end.x, y2: end.y, control: straightCurveControl(curveAnchor.start, end), style: drawingStyle }); setNotice("Placez le point de contrôle."); return; }
      const complete = { ...(draft ?? makeObject(curveAnchor.start)), kind: "curve" as const, x2: curveAnchor.end.x, y2: curveAnchor.end.y, control: event.shiftKey ? straightCurveControl(curveAnchor.start, curveAnchor.end) : point };
      commitObjects([...objects, complete], "Courbe ajoutée."); setSelectedIds([complete.id]); setDraft(undefined); setCurveAnchor(undefined); setTool("select"); return;
    }
    if (tool === "select" && targetId) {
      const original = objects.find((object) => object.id === targetId); if (!original) return;
      chooseObject(targetId, event.shiftKey);
      const mode: DragMode = handle === "rotate" ? "rotate" : handle === "resize" ? "resize" : handle === "endpoint-start" ? "endpoint-start" : handle === "endpoint-end" ? "endpoint-end" : handle === "control" ? "control" : handle === "free-point" ? "free-point" : "move";
      dragChangedRef.current = false; setDrag({ id: targetId, start: point, original, snapshot: deepCloneObjects(objects), mode, corner, pointIndex: Number.isFinite(pointIndex) ? pointIndex : undefined }); event.currentTarget.setPointerCapture(event.pointerId); return;
    }
    if (tool === "select") { setSelectedIds([]); if (marqueeEnabled) { setMarquee({ start: raw, end: raw }); event.currentTarget.setPointerCapture(event.pointerId); } return; }
    const activeKind = tool as ObjectKind;
    if (isCompleteAopConfiguration(activeKind)) { const circuit = makeAopCircuit(activeKind, point, drawingStyle); commitObjects([...objects, ...circuit], `${labels[activeKind]} complet ajouté. Utilisez « Dissocier » pour modifier un composant séparément.`); setSelectedIds(circuit.map((object) => object.id)); setTool("select"); return; }
    const created = makeObject(point);
    if (stampKinds.includes(created.kind) || created.kind === "text" || created.kind === "axes" || created.kind === "point") { commitObjects([...objects, created], `${labels[created.kind]} ajouté.`); setSelectedIds([created.id]); if (!standardDrawingTools.includes(created.kind)) setTool("select"); return; }
    setDraft(created); event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current; if (!svg) return;
    if (panDragRef.current) { const rect = svg.getBoundingClientRect(); const factorX = (settings.width / view.zoom) / rect.width; const factorY = (settings.height / view.zoom) / rect.height; setView((current) => ({ ...current, x: panDragRef.current!.origin.x - (event.clientX - panDragRef.current!.client.x) * factorX, y: panDragRef.current!.origin.y - (event.clientY - panDragRef.current!.client.y) * factorY })); return; }
    const raw = canvasPoint(event, svg, settings.width, settings.height); const point = snapPoint(raw, settings, event.altKey); lastCanvasPointRef.current = point;
    if (marquee) { setMarquee({ ...marquee, end: raw }); return; }
    if (drag) {
      dragChangedRef.current = true; const original = drag.original; const dx = point.x - drag.start.x; const dy = point.y - drag.start.y; const center = objectCenter(original);
      let nextObjects = drag.snapshot.map((object) => {
        if (drag.mode === "move" && selectedIds.includes(object.id) && !object.locked) return translateObject(object, dx, dy);
        if (object.id !== drag.id) return object;
        if (drag.mode === "resize" && drag.corner) return resizeFromCorner(original, drag.corner, point, event.shiftKey);
        if (drag.mode === "rotate") return { ...original, rotation: Math.round(((original.rotation ?? 0) + (Math.atan2(point.y - center.y, point.x - center.x) - Math.atan2(drag.start.y - center.y, drag.start.x - center.x)) * 180 / Math.PI) * 10) / 10 };
        if (drag.mode === "endpoint-start") return { ...original, x: point.x, y: point.y, bindings: { ...original.bindings, startId: undefined } };
        if (drag.mode === "endpoint-end") return { ...original, x2: point.x, y2: point.y, bindings: { ...original.bindings, endId: undefined } };
        if (drag.mode === "control") return { ...original, control: point };
        if (drag.mode === "free-point" && original.points && drag.pointIndex !== undefined) return { ...original, points: original.points.map((value, index) => index === drag.pointIndex ? point : value) };
        return object;
      });
      nextObjects = resolveConnections(nextObjects); dispatchHistory({ type: "transient", objects: nextObjects }); return;
    }
    if (tool === "curve" && curveAnchor) { if (!curveAnchor.end) { const end = event.shiftKey ? straightEndpoint(curveAnchor.start, point) : point; setDraft({ id: draft?.id ?? objectId(), kind: "curve", x: curveAnchor.start.x, y: curveAnchor.start.y, x2: end.x, y2: end.y, control: straightCurveControl(curveAnchor.start, end), style: drawingStyle }); } else setDraft({ ...(draft!), control: event.shiftKey ? straightCurveControl(curveAnchor.start, curveAnchor.end) : point }); return; }
    if (!draft) return;
    if (draft.kind === "freehand") setDraft({ ...draft, points: [...(draft.points ?? []), raw] });
    else if (connectorKinds.includes(draft.kind)) { const end = event.shiftKey ? straightEndpoint({ x: draft.x, y: draft.y }, point) : point; setDraft({ ...draft, x2: end.x, y2: end.y }); }
    else setDraft({ ...draft, width: point.x - draft.x, height: point.y - draft.y });
  };

  const onPointerUp = (event: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current; const point = svg ? canvasPoint(event, svg, settings.width, settings.height) : { x: 0, y: 0 };
    if (panDragRef.current) panDragRef.current = undefined;
    if (marquee) { const x = Math.min(marquee.start.x, marquee.end.x); const y = Math.min(marquee.start.y, marquee.end.y); const width = Math.abs(marquee.end.x - marquee.start.x); const height = Math.abs(marquee.end.y - marquee.start.y); if (width > 4 || height > 4) setSelectedIds(objects.filter((object) => { const bounds = boundsFor(object); return !object.hidden && !object.locked && bounds.x >= x && bounds.y >= y && bounds.x + bounds.width <= x + width && bounds.y + bounds.height <= y + height; }).map((object) => object.id)); setMarquee(undefined); }
    if (draft && tool !== "curve") { let complete = draft; if (connectorKinds.includes(draft.kind)) { const target = bindableAt(objects, point); if (target) { const end = connectionPoint(target, { x: draft.x, y: draft.y }); complete = { ...draft, x2: end.x, y2: end.y, bindings: { ...draft.bindings, endId: target.id } }; } } commitObjects([...objects, complete], `${labels[complete.kind]} ajouté.`); setSelectedIds([complete.id]); setDraft(undefined); if (!standardDrawingTools.includes(complete.kind)) setTool("select"); }
    else if (drag && dragChangedRef.current) {
      let finalObjects = objects;
      if (drag.mode === "endpoint-start" || drag.mode === "endpoint-end") { const target = bindableAt(objects, point, drag.id); if (target) finalObjects = objects.map((object) => object.id !== drag.id ? object : drag.mode === "endpoint-start" ? { ...object, bindings: { ...object.bindings, startId: target.id } } : { ...object, bindings: { ...object.bindings, endId: target.id } }); }
      dispatchHistory({ type: "transient", objects: resolveConnections(finalObjects) }); dispatchHistory({ type: "finishTransient", snapshot: drag.snapshot });
    }
    setDrag(undefined); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onDoubleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    const id = (event.target as Element).closest("[data-id]")?.getAttribute("data-id"); const object = objects.find((item) => item.id === id); if (!object) return;
    if (object.kind === "text" || object.kind === "equation") { const value = window.prompt(object.kind === "equation" ? "Modifier la formule LaTeX" : "Modifier le texte", object.text ?? ""); if (value !== null) updateOne(object.id, { text: value }); }
    else if (object.kind === "raw-tikz") { const value = window.prompt("Modifier le bloc TikZ protégé", object.rawTikz ?? ""); if (value !== null) updateOne(object.id, { rawTikz: value }); }
    else if (object.annotations) { const key = Object.keys(object.annotations)[0]; const value = window.prompt(`Modifier ${key}`, object.annotations[key]); if (value !== null) updateOne(object.id, { annotations: { ...object.annotations, [key]: value } }); }
  };

  const onWheel = (event: React.WheelEvent<SVGSVGElement>) => { event.preventDefault(); const factor = event.deltaY > 0 ? .9 : 1.1; setView((current) => ({ ...current, zoom: clamp(current.zoom * factor, .25, 4) })); };
  const fitView = () => setView({ x: 0, y: 0, zoom: 1 });

  const groupSelection = () => { if (selectedIds.length < 2) return; const groupId = `group-${objectId()}`; commitObjects(objects.map((object) => selectedIds.includes(object.id) ? { ...object, groupId } : object), "Sélection groupée."); };
  const ungroupSelection = () => { updateSelected({ groupId: undefined }, "Groupe dissocié."); };
  const alignSelection = (mode: "left" | "center" | "top" | "middle") => {
    if (selectedObjects.length < 2) return; const bounds = selectedObjects.map(boundsFor); const target = mode === "left" ? Math.min(...bounds.map((value) => value.x)) : mode === "top" ? Math.min(...bounds.map((value) => value.y)) : mode === "center" ? bounds.reduce((sum, value) => sum + value.x + value.width / 2, 0) / bounds.length : bounds.reduce((sum, value) => sum + value.y + value.height / 2, 0) / bounds.length;
    commitObjects(objects.map((object) => { const index = selectedObjects.findIndex((value) => value.id === object.id); if (index < 0) return object; const boundsValue = bounds[index]; const dx = mode === "left" ? target - boundsValue.x : mode === "center" ? target - boundsValue.x - boundsValue.width / 2 : 0; const dy = mode === "top" ? target - boundsValue.y : mode === "middle" ? target - boundsValue.y - boundsValue.height / 2 : 0; return translateObject(object, dx, dy); }), "Sélection alignée.");
  };
  const reorder = (front: boolean) => { const selectedSet = new Set(selectedIds); const moving = objects.filter((object) => selectedSet.has(object.id)); const rest = objects.filter((object) => !selectedSet.has(object.id)); commitObjects(front ? [...rest, ...moving] : [...moving, ...rest], front ? "Placée au premier plan." : "Placée à l’arrière-plan."); };

  const addFunction = () => {
    const [xMin, xMax] = xRange.split(":").map(Number); const [yMin, yMax] = yRange.split(":").map(Number); const expressions = expression.split(";").map((value) => value.trim()).filter(Boolean);
    const next: CanvasObject = { id: objectId(), kind: "axes", x: 90, y: 80, width: 520, height: 360, graph: { expression: expressions[0] ?? "", expressions, xMin, xMax, yMin, yMax, xLabel: "x", yLabel: "y", showGrid: true }, style: drawingStyle };
    if (!expressions.length || !Number.isFinite(xMin) || !Number.isFinite(xMax) || !Number.isFinite(yMin) || !Number.isFinite(yMax) || graphPathsFor(next).length !== expressions.length) { setNotice("Expression ou domaine invalide. Séparez plusieurs fonctions par un point-virgule."); return; }
    commitObjects([...objects, next], "Graphe ajouté."); setSelectedIds([next.id]);
  };

  const applyTemplate = (templateId: string) => {
    const template = diagramTemplates.find((item) => item.id === templateId); if (!template) return;
    if (templateMode === "replace" && objects.length && !window.confirm("Remplacer le canevas actuel par ce modèle ? Le canevas reste récupérable avec Annuler.")) return;
    let inserted = cloneTemplateObjects(template);
    if (templateMode === "cursor" && inserted.length) {
      const bounds = inserted.map(boundsFor); const left = Math.min(...bounds.map((value) => value.x)); const top = Math.min(...bounds.map((value) => value.y)); const right = Math.max(...bounds.map((value) => value.x + value.width)); const bottom = Math.max(...bounds.map((value) => value.y + value.height));
      inserted = inserted.map((object) => translateObject(object, lastCanvasPointRef.current.x - (left + right) / 2, lastCanvasPointRef.current.y - (top + bottom) / 2));
    }
    const next = templateMode === "replace" ? inserted : [...objects, ...inserted];
    commitObjects(next, `Modèle « ${template.title} » ${templateMode === "replace" ? "chargé" : "inséré"}. Tous ses éléments sont modifiables.`); setSelectedIds(templateMode === "replace" ? [] : inserted.map((object) => object.id)); setPanel("library"); if (templateMode === "replace") fitView();
  };
  const toggleFavorite = (kind: string) => setFavorites((current) => current.includes(kind) ? current.filter((value) => value !== kind) : [...current, kind]);

  const saveProject = () => { const project = makeProject(projectName, objects, settings); saveNamedProject(project); localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(project)); setSavedProjects(storedProjects()); setNotice(`Projet « ${project.name} » enregistré sur cet appareil.`); };
  const loadProject = (name: string) => { const project = savedProjects.find((item) => item.name === name); if (!project) return; if (objects.length && !window.confirm(`Ouvrir « ${name} » et remplacer le canevas ?`)) return; commitObjects(project.objects, `Projet « ${name} » ouvert.`); setSettings(project.settings); setProjectName(project.name); setSelectedIds([]); fitView(); };
  const exportProject = () => downloadText(`${projectName.replace(/[^a-z0-9_-]+/gi, "-") || "schema"}.sketch2latex.json`, JSON.stringify(makeProject(projectName, objects, settings), null, 2), "application/json");
  const importProject = async (file: File) => { try { const project = parseProject(await file.text()); if (objects.length && !window.confirm("Remplacer le canevas par le projet importé ?")) return; commitObjects(project.objects, `Projet « ${project.name} » importé.`); setProjectName(project.name); setSettings(project.settings); setSelectedIds([]); } catch (error) { setNotice(error instanceof Error ? error.message : "Import impossible."); } };

  const applyLatexToCanvas = () => { try { const result = objectsFromLatex(latexSource, objects); const protectedCount = result.objects.filter((object) => object.kind === "raw-tikz").length; commitObjects(result.objects, `${result.applied} objet${result.applied > 1 ? "s" : ""} appliqué${result.applied > 1 ? "s" : ""} depuis le TikZ${protectedCount ? ` · ${protectedCount} bloc(s) non reconnu(s) conservé(s) sans perte` : ""}.`); setSelectedIds([]); setLatexDraft(undefined); } catch (error) { setNotice(error instanceof Error ? error.message : "TikZ invalide."); } };
  const copyLatex = async () => { await navigator.clipboard.writeText(latexSource); setNotice("LaTeX copié."); };
  const exportSvg = () => { if (!svgRef.current) return; const copy = cleanSvg(svgRef.current, settings.width, settings.height); downloadText("schema-mpsi.svg", new XMLSerializer().serializeToString(copy), "image/svg+xml"); setNotice("SVG vectoriel exporté."); };
  const exportPdf = async () => {
    if (!svgRef.current) return; setNotice("Création du PDF vectoriel…");
    try { const [{ jsPDF }] = await Promise.all([import("jspdf"), import("svg2pdf.js")]); const pdf = new jsPDF({ orientation: settings.orientation, unit: "pt", format: [settings.width, settings.height] }); const svg = cleanSvg(svgRef.current, settings.width, settings.height); await (pdf as unknown as { svg: (element: SVGElement, options: Record<string, number>) => Promise<unknown> }).svg(svg, { x: 0, y: 0, width: settings.width, height: settings.height }); pdf.save("schema-mpsi.pdf"); setNotice("PDF vectoriel exporté sans poignées de sélection."); }
    catch { try { const { jsPDF } = await import("jspdf"); const image = await canvasPdfImage(cleanSvg(svgRef.current!, settings.width, settings.height)); const pdf = new jsPDF({ orientation: settings.orientation, unit: "pt", format: [settings.width, settings.height] }); pdf.addImage(image, "PNG", 0, 0, settings.width, settings.height); pdf.save("schema-mpsi.pdf"); setNotice("PDF exporté en mode de compatibilité."); } catch (error) { setNotice(error instanceof Error ? error.message : "Export PDF impossible."); } }
  };

  const clearCanvas = () => { if (!objects.length || !window.confirm("Effacer tout le canevas ? Vous pourrez encore utiliser Annuler.")) return; commitObjects([], "Canevas effacé. Cliquez sur Annuler pour le restaurer."); setSelectedIds([]); };
  const changeMode = (next: "beginner" | "advanced") => { setMode(next); if (next === "beginner") setPanel("library"); setNotice(next === "beginner" ? "Mode essentiel : outils courants et propriétés principales." : "Mode avancé : calques, document, métadonnées et synchronisation complète."); };

  const renderSelectionHandles = (object: CanvasObject) => {
    if (connectorKinds.includes(object.kind)) return <g key={`handles-${object.id}`} data-id={object.id} data-export-ignore="true" transform={transformFor(object)}><circle className="endpoint-handle" data-handle="endpoint-start" cx={object.x} cy={object.y} r="7" /><circle className="endpoint-handle" data-handle="endpoint-end" cx={object.x2 ?? object.x} cy={object.y2 ?? object.y} r="7" />{object.kind === "curve" && object.control && <><line className="control-line" x1={object.x} y1={object.y} x2={object.control.x} y2={object.control.y} /><line className="control-line" x1={object.control.x} y1={object.control.y} x2={object.x2} y2={object.y2} /><circle className="control-handle" data-handle="control" cx={object.control.x} cy={object.control.y} r="7" /></>}</g>;
    if (object.kind === "freehand" && object.points) { const step = Math.max(1, Math.ceil(object.points.length / 16)); return <g key={`handles-${object.id}`} data-id={object.id} data-export-ignore="true" transform={transformFor(object)}>{object.points.map((point, index) => index % step === 0 ? <circle key={index} className="free-point-handle" data-handle="free-point" data-point-index={index} cx={point.x} cy={point.y} r="5" /> : null)}</g>; }
    return <g key={`selection-${object.id}`} data-export-ignore="true">{selectionOverlay(object)}</g>;
  };

  return <main className={`app-shell mode-${mode}`}>
    <header className="app-header"><div><p className="eyebrow">Éditeur scientifique CPGE</p><h1>Sketch2LaTeX</h1></div><div className="header-actions"><label className="project-name">Projet <input value={projectName} onChange={(event) => setProjectName(event.target.value)} /></label><span className="save-state">{lastSaved ? `Sauvegardé à ${lastSaved}` : "Autosauvegarde active"}</span><div className="mode-switch" role="group" aria-label="Niveau d’outils"><button className={mode === "beginner" ? "active" : ""} onClick={() => changeMode("beginner")}>Essentiel</button><button className={mode === "advanced" ? "active" : ""} onClick={() => changeMode("advanced")}>Avancé</button></div></div></header>
    <p className="status" aria-live="polite">{notice}</p>
    <span hidden data-clipboard-count={clipboardCount} />
    {/* eslint-disable-next-line react-hooks/refs */}
    <nav className="command-bar" aria-label="Commandes du document"><button onClick={undo} disabled={!past.length} title="Ctrl/Cmd+Z">↶ Annuler</button><button onClick={redo} disabled={!future.length} title="Ctrl/Cmd+Y">↷ Rétablir</button><button onClick={copySelection} disabled={!selectedIds.length}>Copier</button><button onClick={pasteSelection} disabled={!clipboardRef.current.length}>Coller</button><button onClick={duplicateSelection} disabled={!selectedIds.length}>Dupliquer</button><button onClick={deleteSelected} disabled={!selectedIds.length}>Supprimer</button><button onClick={clearCanvas} disabled={!objects.length}>Tout effacer</button><span className="bar-separator" /><button onClick={() => setTool("select")} className={tool === "select" ? "active" : ""}>Sélection</button><button onClick={() => setTool("pan")} className={tool === "pan" ? "active" : ""}>Main</button><button onClick={() => setTool("eraser")} className={tool === "eraser" ? "active" : ""}>Gomme</button><label className="snap-toggle"><input type="checkbox" checked={settings.snapToGrid} onChange={(event) => setSettings({ ...settings, snapToGrid: event.target.checked })} /> Aimantation</label><button onClick={() => setView((current) => ({ ...current, zoom: clamp(current.zoom - .2, .25, 4) }))}>−</button><output>{Math.round(view.zoom * 100)}%</output><button onClick={() => setView((current) => ({ ...current, zoom: clamp(current.zoom + .2, .25, 4) }))}>+</button><button onClick={fitView}>Ajuster</button></nav>
    <section className="editor-layout">
      <aside className="left-panel">
        <div className="panel-tabs"><button className={panel === "library" ? "active" : ""} onClick={() => setPanel("library")}>Bibliothèque</button><button className={panel === "templates" ? "active" : ""} onClick={() => setPanel("templates")}>Modèles</button><button className={panel === "project" ? "active" : ""} onClick={() => setPanel("project")}>Projet</button>{mode === "advanced" && <button className={panel === "document" ? "active" : ""} onClick={() => setPanel("document")}>Document</button>}</div>
        {(panel === "library" || panel === "templates") && <input className="panel-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un outil ou modèle…" />}
        {panel === "library" && <div className="library-scroll">{favorites.length > 0 && <section className="tool-group"><h2>Favoris</h2><div className="tool-grid">{favorites.filter((kind): kind is ObjectKind => Object.hasOwn(labels, kind)).map((kind) => <button key={kind} className={tool === kind ? "active" : ""} onClick={() => setTool(kind)}>{labels[kind]}</button>)}</div></section>}{filteredGroups.map((group) => <details key={group.title} open={group.title === "Outils" || mode === "advanced"}><summary>{group.title}</summary><div className="tool-grid">{group.kinds.map((kind) => kind === "select" ? null : <div className="tool-item" key={kind}><button className={tool === kind ? "active" : ""} onClick={() => setTool(kind)}>{labels[kind]}</button><button className={`favorite-button ${favorites.includes(kind) ? "active" : ""}`} onClick={() => toggleFavorite(kind)} aria-label={`${favorites.includes(kind) ? "Retirer" : "Ajouter"} ${labels[kind]} des favoris`}>★</button></div>)}</div></details>)}<section className="style-section"><h2>Style de dessin</h2><label>Couleur <input type="color" value={selected?.style?.stroke ?? drawingStyle.stroke} onChange={(event) => selected ? updateSelected({ style: { ...selected.style, stroke: event.target.value } }) : setDrawingStyle({ ...drawingStyle, stroke: event.target.value })} /></label><label>Épaisseur <input type="range" min="1" max="8" value={selected?.style?.strokeWidth ?? drawingStyle.strokeWidth} onChange={(event) => selected ? updateSelected({ style: { ...selected.style, strokeWidth: Number(event.target.value) } }) : setDrawingStyle({ ...drawingStyle, strokeWidth: Number(event.target.value) })} /></label></section></div>}
        {panel === "templates" && <div className="library-scroll"><label className="template-mode">Insertion du modèle<select value={templateMode} onChange={(event) => setTemplateMode(event.target.value as TemplateMode)}><option value="replace">Remplacer le canevas</option><option value="insert">Ajouter au document</option><option value="cursor">Placer au dernier point du canevas</option></select></label><div className="category-chips">{categories.map((category) => <button key={category} className={templateCategory === category ? "active" : ""} onClick={() => setTemplateCategory(category)}>{category}</button>)}</div>{filteredTemplates.map((template) => <article className="template-card" key={template.id}><h2>{template.title}</h2><p>{template.description}</p><p className="template-meta">{template.sourceName} · {template.license}</p><div><button onClick={() => applyTemplate(template.id)}>{templateMode === "replace" ? "Utiliser ce modèle" : templateMode === "insert" ? "Ajouter au document" : "Placer sur le canevas"}</button> <a href={template.sourceUrl} target="_blank" rel="noreferrer">Source</a></div></article>)}</div>}
        {panel === "project" && <div className="project-panel"><button onClick={saveProject}>Enregistrer maintenant</button><button onClick={exportProject}>Exporter le projet JSON</button><button onClick={() => fileInputRef.current?.click()}>Importer un projet JSON</button><input ref={fileInputRef} hidden type="file" accept=".json,.sketch2latex.json,application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importProject(file); event.currentTarget.value = ""; }} /><h2>Projets enregistrés</h2>{savedProjects.length ? savedProjects.map((project) => <button className="saved-project" key={`${project.name}-${project.updatedAt}`} onClick={() => loadProject(project.name)}><strong>{project.name}</strong><small>{new Date(project.updatedAt).toLocaleString()}</small></button>) : <p>Aucun projet nommé. Le brouillon courant reste autosauvegardé.</p>}</div>}
        {panel === "document" && <div className="document-panel"><h2>Document</h2><label>Unité de travail<select value={settings.unit} onChange={(event) => setSettings({ ...settings, unit: event.target.value as DocumentSettings["unit"] })}><option value="cm">cm</option><option value="mm">mm</option><option value="pt">pt</option><option value="tikz">unité TikZ</option></select></label><label>Largeur ({unitLabel(settings.unit)})<input type="number" step="any" value={toWorkingUnit(settings.width, settings.unit)} onChange={(event) => setSettings({ ...settings, width: clamp(fromWorkingUnit(Number(event.target.value), settings.unit), 320, 2400) })} /></label><label>Hauteur ({unitLabel(settings.unit)})<input type="number" step="any" value={toWorkingUnit(settings.height, settings.unit)} onChange={(event) => setSettings({ ...settings, height: clamp(fromWorkingUnit(Number(event.target.value), settings.unit), 240, 1800) })} /></label><label>Orientation<select value={settings.orientation} onChange={(event) => setSettings({ ...settings, orientation: event.target.value as DocumentSettings["orientation"] })}><option value="landscape">Paysage</option><option value="portrait">Portrait</option></select></label><label>Pas de grille ({unitLabel(settings.unit)})<input type="number" step="any" value={toWorkingUnit(settings.gridSize, settings.unit)} onChange={(event) => setSettings({ ...settings, gridSize: clamp(fromWorkingUnit(Number(event.target.value), settings.unit), 5, 100) })} /></label><label><input type="checkbox" checked={settings.showGrid} onChange={(event) => setSettings({ ...settings, showGrid: event.target.checked })} /> Afficher la grille</label><p className="latex-hint">Le changement d’unité conserve les dimensions physiques du schéma.</p></div>}
      </aside>
      <section className="canvas-column">
        {selectedIds.length > 1 && <div className="selection-toolbar"><strong>{selectedIds.length} objets</strong><button onClick={groupSelection}>Grouper</button><button onClick={ungroupSelection}>Dissocier</button><button onClick={() => alignSelection("left")}>Aligner à gauche</button><button onClick={() => alignSelection("center")}>Centrer horizontalement</button><button onClick={() => alignSelection("top")}>Aligner en haut</button><button onClick={() => alignSelection("middle")}>Centrer verticalement</button><button onClick={() => reorder(true)}>Premier plan</button><button onClick={() => reorder(false)}>Arrière-plan</button></div>}
        <div className={`canvas-wrap tool-${tool}`}><svg ref={svgRef} tabIndex={0} viewBox={`${view.x} ${view.y} ${settings.width / view.zoom} ${settings.height / view.zoom}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onDoubleClick={onDoubleClick} onWheel={onWheel} aria-label="Canevas scientifique interactif">
          <defs><marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" /></marker><pattern id="small-grid" width={settings.gridSize} height={settings.gridSize} patternUnits="userSpaceOnUse"><path d={`M ${settings.gridSize} 0 L 0 0 0 ${settings.gridSize}`} fill="none" stroke="#d8dde3" strokeWidth="1" /></pattern></defs>
          <rect width={settings.width} height={settings.height} fill="white" />{settings.showGrid && <rect data-export-ignore="true" width={settings.width} height={settings.height} fill="url(#small-grid)" />}
          {objects.map((object) => object.hidden ? null : <g key={object.id} data-id={object.id} transform={transformFor(object)} opacity={object.locked ? .55 : 1}>{preview(object, selectedIds.includes(object.id))}</g>)}
          {selectedObjects.map(renderSelectionHandles)}
          {draft && <g opacity=".6" transform={transformFor(draft)}>{preview(draft, true)}</g>}
          {marquee && <rect data-export-ignore="true" className="marquee" x={Math.min(marquee.start.x, marquee.end.x)} y={Math.min(marquee.start.y, marquee.end.y)} width={Math.abs(marquee.end.x - marquee.start.x)} height={Math.abs(marquee.end.y - marquee.start.y)} />}
        </svg></div>
        <div className="canvas-help">Molette : zoom · Outil Main : déplacer la vue · Maj-clic : sélection multiple · Alt : ignorer la grille · Double-clic : éditer un libellé · Flèches : déplacer</div>
        <div className="graph-composer"><h2>Ajouter un graphe</h2><label>Fonctions (séparées par ;)<input value={expression} onChange={(event) => setExpression(event.target.value)} /></label><label>x min:max<input value={xRange} onChange={(event) => setXRange(event.target.value)} /></label><label>y min:max<input value={yRange} onChange={(event) => setYRange(event.target.value)} /></label><button onClick={addFunction}>Ajouter</button></div>
      </section>
      <aside className="right-panel">
        <section className="properties-panel"><h2>Propriétés</h2>{selected ? <><p className="object-kind">{labels[selected.kind]} · coordonnées en {unitLabel(settings.unit)}</p><div className="property-grid"><label>X<input type="number" step="any" value={toWorkingUnit(selected.x, settings.unit)} onChange={(event) => updateSelected({ x: fromWorkingUnit(Number(event.target.value), settings.unit) })} /></label><label>Y<input type="number" step="any" value={toWorkingUnit(selected.y, settings.unit)} onChange={(event) => updateSelected({ y: fromWorkingUnit(Number(event.target.value), settings.unit) })} /></label>{selected.width !== undefined && <label>Largeur<input type="number" min="0.001" step="any" value={toWorkingUnit(selected.width, settings.unit)} onChange={(event) => updateSelected({ width: fromWorkingUnit(Number(event.target.value), settings.unit) })} /></label>}{selected.height !== undefined && <label>Hauteur<input type="number" min="0.001" step="any" value={toWorkingUnit(selected.height, settings.unit)} onChange={(event) => updateSelected({ height: fromWorkingUnit(Number(event.target.value), settings.unit) })} /></label>}<label>Rotation<input type="number" min="-180" max="180" value={selected.rotation ?? 0} onChange={(event) => updateSelected({ rotation: Number(event.target.value) })} /></label></div>{(selected.kind === "text" || selected.kind === "equation") && <label>{selected.kind === "equation" ? "Formule LaTeX" : "Texte"}<textarea className="small-textarea" value={selected.text ?? ""} onChange={(event) => updateSelected({ text: event.target.value })} /></label>}{selected.kind === "raw-tikz" && <label>Bloc TikZ protégé<textarea className="small-textarea raw-tikz-editor" value={selected.rawTikz ?? ""} onChange={(event) => updateSelected({ rawTikz: event.target.value })} /><small>Ce bloc reste intact à l’export et à la réimportation.</small></label>}{selected.annotations && <div className="annotation-fields">{Object.entries(selected.annotations).map(([key, value]) => <label key={key}>{key}<input value={value} onChange={(event) => updateSelected({ annotations: { ...selected.annotations, [key]: event.target.value } })} /></label>)}</div>}{selected.kind === "axes" && selected.graph && <div className="annotation-fields"><label>Courbes<input value={(selected.graph.expressions ?? [selected.graph.expression]).join("; ")} onChange={(event) => updateSelected({ graph: { ...selected.graph!, expression: event.target.value.split(";")[0].trim(), expressions: event.target.value.split(";").map((value) => value.trim()).filter(Boolean) } })} /></label><label>x min<input type="number" value={selected.graph.xMin} onChange={(event) => updateSelected({ graph: { ...selected.graph!, xMin: Number(event.target.value) } })} /></label><label>x max<input type="number" value={selected.graph.xMax} onChange={(event) => updateSelected({ graph: { ...selected.graph!, xMax: Number(event.target.value) } })} /></label><label>y min<input type="number" value={selected.graph.yMin ?? -5} onChange={(event) => updateSelected({ graph: { ...selected.graph!, yMin: Number(event.target.value) } })} /></label><label>y max<input type="number" value={selected.graph.yMax ?? 5} onChange={(event) => updateSelected({ graph: { ...selected.graph!, yMax: Number(event.target.value) } })} /></label><label>Axe x<input value={selected.graph.xLabel ?? "x"} onChange={(event) => updateSelected({ graph: { ...selected.graph!, xLabel: event.target.value } })} /></label><label>Axe y<input value={selected.graph.yLabel ?? "y"} onChange={(event) => updateSelected({ graph: { ...selected.graph!, yLabel: event.target.value } })} /></label><label><input type="checkbox" checked={selected.graph.showGrid !== false} onChange={(event) => updateSelected({ graph: { ...selected.graph!, showGrid: event.target.checked } })} /> Grille</label></div>}<div className="property-actions"><button onClick={() => reorder(true)}>Premier plan</button><button onClick={() => reorder(false)}>Arrière-plan</button><button onClick={() => updateSelected({ scale: 1, scaleX: 1, scaleY: 1, rotation: 0 })}>Réinitialiser</button></div></> : selectedIds.length > 1 ? <p>{selectedIds.length} objets sélectionnés. Utilisez la barre d’alignement au-dessus du canevas.</p> : <p>Sélectionnez un objet pour modifier ses coordonnées, dimensions, texte et annotations.</p>}</section>
        {mode === "advanced" && <section className="layers-panel"><h2>Calques</h2><label><input type="checkbox" checked={marqueeEnabled} onChange={(event) => setMarqueeEnabled(event.target.checked)} /> Sélection par zone</label><div className="layer-list">{[...objects].reverse().map((object) => <div key={object.id} className={selectedIds.includes(object.id) ? "selected" : ""}><button onClick={() => chooseObject(object.id, false)}>{labels[object.kind]}</button><button title={object.hidden ? "Afficher" : "Masquer"} onClick={() => updateOne(object.id, { hidden: !object.hidden })}>{object.hidden ? "○" : "●"}</button><button title={object.locked ? "Déverrouiller" : "Verrouiller"} onClick={() => updateOne(object.id, { locked: !object.locked })}>{object.locked ? "🔒" : "🔓"}</button></div>)}</div></section>}
        <section className="export-panel"><h2>Exporter</h2><div className="export-buttons"><button onClick={exportSvg}>SVG vectoriel</button><button onClick={exportPdf}>PDF vectoriel</button><button onClick={copyLatex}>Copier LaTeX</button></div><p className={`round-trip ${roundTrip.ok ? "ok" : "warning"}`}>{roundTrip.ok ? "✓" : "⚠"} {roundTrip.message}</p><p className="latex-hint">Le canevas reste l’aperçu de référence. Exportez le TikZ/LaTeX puis compilez-le dans votre outil LaTeX préféré, par exemple Overleaf.</p><label><input type="checkbox" checked={snippetOnly} onChange={(event) => setSnippetOnly(event.target.checked)} /> Extrait TikZ seul</label>{mode === "advanced" && <><div className="latex-actions"><button onClick={applyLatexToCanvas} disabled={!latexDirty}>Appliquer au canevas</button><button onClick={() => setLatexDraft(undefined)} disabled={!latexDirty}>Annuler l’édition</button></div><textarea className="latex-editor" value={latexSource} onChange={(event) => setLatexDraft(event.target.value === latex ? undefined : event.target.value)} spellCheck="false" aria-label="Code LaTeX/TikZ éditable" /><p className="latex-hint">L’import reconnaît les lignes, formes, courbes, chemins et équations. Les commandes non prises en charge deviennent des blocs TikZ protégés, conservés sans perte.</p></>}</section>
      </aside>
    </section>
  </main>;
}
