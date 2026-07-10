"use client";

import { PointerEvent, useMemo, useRef, useState } from "react";
import { connectorKinds, labels, stampKinds, stampSize, toolboxGroups, type CanvasObject, type ObjectKind, type Point } from "./lib/canvas-types";
import { documentFor } from "./lib/latex";

const canvasWidth = 900;
const canvasHeight = 560;
const objectId = () => Math.random().toString(36).slice(2, 10);

const canvasPoint = (event: PointerEvent<SVGSVGElement>, svg: SVGSVGElement): Point => {
  const rect = svg.getBoundingClientRect();
  return { x: ((event.clientX - rect.left) / rect.width) * canvasWidth, y: ((event.clientY - rect.top) / rect.height) * canvasHeight };
};

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
  const text = (value: string, tx = cx, ty = cy + 5) => <text x={tx} y={ty} textAnchor="middle" fontSize="13" pointerEvents="all">{value}</text>;
  if (object.kind === "ground") return <g {...common}><line x1={cx} y1={y} x2={cx} y2={y + h * .35} /><path d={`M ${x + 6} ${y + h*.35} L ${x + w - 6} ${y + h*.35} M ${x + 11} ${y + h*.53} L ${x + w - 11} ${y + h*.53} M ${x + 17} ${y + h*.71} L ${x + w - 17} ${y + h*.71}`} /></g>;
  if (object.kind === "gbf") return <g {...common}><circle cx={cx} cy={cy} r={w*.36} /><path d={`M ${x+w*.22} ${cy} q ${w*.07} ${-h*.16} ${w*.14} 0 q ${w*.07} ${h*.16} ${w*.14} 0 q ${w*.07} ${-h*.16} ${w*.14} 0`} />{text("GBF", cx, y+h*.78)}</g>;
  if (object.kind === "oscilloscope") return <g {...common}><rect x={x} y={y} width={w} height={h} rx="4" /><path d={`M ${x+w*.15} ${cy} q ${w*.12} ${-h*.2} ${w*.24} 0 q ${w*.12} ${h*.2} ${w*.24} 0 q ${w*.12} ${-h*.2} ${w*.24} 0`} />{text("oscillo", cx, y+h*.88)}</g>;
  if (object.kind === "mass") return <g {...common}><rect x={x+5} y={y+8} width={w-10} height={h-16} fill="white" />{text("m")}</g>;
  if (object.kind === "inclined-plane") return <g {...common}><path d={`M ${x+5} ${y+h-5} L ${x+w-5} ${y+h-5} L ${x+w-5} ${y+8} Z`} /><rect x={x+w*.18} y={y+h*.58} width={w*.3} height={h*.18} transform={`rotate(${-Math.atan2(h*.6,w*.75)*180/Math.PI} ${x+w*.33} ${y+h*.67})`} fill="white" /></g>;
  if (object.kind === "pulley") return <g {...common}><circle cx={cx} cy={cy} r={w*.32} /><circle cx={cx} cy={cy} r="4" fill="#111" /><line x1={x+4} y1={y+8} x2={x+w-4} y2={y+8} /></g>;
  if (object.kind === "pendulum") return <g {...common}><line x1={cx} y1={y+6} x2={cx} y2={y+h*.72} /><circle cx={cx} cy={y+h*.82} r={w*.17} fill="white" /><line x1={cx-w*.25} y1={y+6} x2={cx+w*.25} y2={y+6} /></g>;
  if (object.kind === "reference-frame") return <g {...common}><line x1={x+w*.2} y1={y+h*.78} x2={x+w*.84} y2={y+h*.78} markerEnd="url(#arrowhead)" /><line x1={x+w*.2} y1={y+h*.78} x2={x+w*.2} y2={y+h*.18} markerEnd="url(#arrowhead)" />{text("O", x+w*.15, y+h*.92)}{text("x", x+w*.91, y+h*.86)}{text("y", x+w*.13, y+h*.15)}</g>;
  if (object.kind === "circular-trajectory") return <g {...common}><circle cx={cx} cy={cy} r={Math.min(w,h)*.35} markerEnd="url(#arrowhead)" /><circle cx={cx} cy={cy} r="3" fill="#111" />{text("O", cx, cy+18)}</g>;
  if (object.kind === "gravity-field") return <g {...common}>{[.2,.5,.8].map((p) => <line key={p} x1={x+w*p} y1={y+h*.15} x2={x+w*p} y2={y+h*.78} markerEnd="url(#arrowhead)" />)}{text("g", x+w*.9, cy)}</g>;
  if (object.kind === "lens" || object.kind === "diverging-lens") return <g {...common}><path d={object.kind === "lens" ? `M ${cx} ${y+5} Q ${x+w*.72} ${cy} ${cx} ${y+h-5} Q ${x+w*.28} ${cy} ${cx} ${y+5}` : `M ${cx-w*.12} ${y+5} Q ${cx+w*.12} ${cy} ${cx-w*.12} ${y+h-5} M ${cx+w*.12} ${y+5} Q ${cx-w*.12} ${cy} ${cx+w*.12} ${y+h-5}`} /><line x1={x} y1={cy} x2={x+w} y2={cy} strokeDasharray="4 3" /></g>;
  if (object.kind === "plane-mirror" || object.kind === "screen") return <g {...common}><line x1={cx} y1={y+4} x2={cx} y2={y+h-4} strokeWidth="4" />{Array.from({length:5},(_,i)=><line key={i} x1={cx} y1={y+12+i*h*.17} x2={cx+(object.kind === "plane-mirror" ? 10 : -10)} y2={y+18+i*h*.17} />)}</g>;
  if (object.kind === "prism") return <path {...common} d={`M ${x+6} ${y+h-6} L ${x+w-6} ${y+h-6} L ${cx} ${y+7} Z`} />;
  if (object.kind === "fiber") return <g {...common}><path d={`M ${x+4} ${y+h*.3} C ${x+w*.35} ${y+h*.2}, ${x+w*.62} ${y+h*.83}, ${x+w-5} ${y+h*.62}`} /><path d={`M ${x+4} ${y+h*.52} C ${x+w*.35} ${y+h*.42}, ${x+w*.62} ${y+h*1.03}, ${x+w-5} ${y+h*.84}`} /></g>;
  if (object.kind === "electric-field") return <g {...common}>{[.22,.5,.78].map((p) => <line key={p} x1={x+w*.12} y1={y+h*p} x2={x+w*.86} y2={y+h*p} markerEnd="url(#arrowhead)" />)}{text("E", x+w*.9, cy-7)}</g>;
  if (object.kind === "magnetic-field-in" || object.kind === "magnetic-field-out") return <g {...common}>{[.25,.5,.75].flatMap((a) => [.3,.7].map((b) => <text key={`${a}${b}`} x={x+w*a} y={y+h*b} textAnchor="middle" fontSize="20">{object.kind === "magnetic-field-in" ? "⊗" : "⊙"}</text>))}</g>;
  if (object.kind === "bar-magnet") return <g {...common}><rect x={x+4} y={y+h*.2} width={w-8} height={h*.6} fill="white" />{text("N", x+w*.28, cy+5)}{text("S", x+w*.72, cy+5)}</g>;
  if (object.kind === "coil" || object.kind === "solenoid") return <g {...common}>{Array.from({length: object.kind === "coil" ? 4 : 6},(_,i)=><ellipse key={i} cx={x+w*(.16+i*(object.kind === "coil" ? .22 : .14))} cy={cy} rx={w*(object.kind === "coil" ? .1 : .12)} ry={h*.32} />)}</g>;
  if (object.kind === "laplace-rails") return <g {...common}><line x1={x+5} y1={y+h*.25} x2={x+w-5} y2={y+h*.25} /><line x1={x+5} y1={y+h*.75} x2={x+w-5} y2={y+h*.75} /><line x1={x+w*.55} y1={y+h*.25} x2={x+w*.55} y2={y+h*.75} strokeWidth="4" /><line x1={x+w*.62} y1={cy} x2={x+w*.85} y2={cy} markerEnd="url(#arrowhead)" />{text("v", x+w*.88, cy-6)}</g>;
  if (object.kind === "charged-particle") return <g {...common}><circle cx={cx} cy={cy} r={Math.min(w,h)*.34} fill="white" />{text("q")}</g>;
  if (object.kind === "piston-cylinder") return <g {...common}><path d={`M ${x+w*.18} ${y+h*.9} L ${x+w*.18} ${y+h*.12} L ${x+w*.82} ${y+h*.12} L ${x+w*.82} ${y+h*.9}`} /><line x1={x+w*.14} y1={y+h*.38} x2={x+w*.86} y2={y+h*.38} strokeWidth="4" /><line x1={cx} y1={y+h*.38} x2={cx} y2={y+3} />{text("P, V, T", cx, y+h*.73)}</g>;
  if (object.kind === "thermal-reservoir") return <g {...common}><circle cx={cx} cy={cy} r={Math.min(w,h)*.4} />{text("T")}</g>;
  if (object.kind === "heat-engine") return <g {...common}><rect x={x+w*.2} y={y+h*.28} width={w*.6} height={h*.42} fill="white" />{text("machine", cx, cy+5)}<line x1={cx} y1={y+3} x2={cx} y2={y+h*.25} markerEnd="url(#arrowhead)" /><line x1={cx} y1={y+h*.72} x2={cx} y2={y+h-3} markerEnd="url(#arrowhead)" /><line x1={x+w*.82} y1={cy} x2={x+w-3} y2={cy} markerEnd="url(#arrowhead)" />{text("Qₕ", cx+10, y+h*.18)}{text("Q𝚌", cx+10, y+h*.94)}{text("W", x+w*.92, cy-5)}</g>;
  if (["phase-diagram", "clapeyron-diagram", "energy-diagram"].includes(object.kind)) return <g {...common}><line x1={x+w*.16} y1={y+h*.85} x2={x+w*.16} y2={y+h*.12} markerEnd="url(#arrowhead)" /><line x1={x+w*.16} y1={y+h*.85} x2={x+w*.88} y2={y+h*.85} markerEnd="url(#arrowhead)" /><path d={object.kind === "energy-diagram" ? `M ${x+w*.25} ${y+h*.25} Q ${cx} ${y+h*.72} ${x+w*.8} ${y+h*.28}` : `M ${x+w*.23} ${y+h*.25} Q ${x+w*.42} ${y+h*.75} ${x+w*.76} ${y+h*.38}`} />{text(object.kind === "phase-diagram" ? "P,T" : object.kind === "clapeyron-diagram" ? "P,v" : "Eₚ", x+w*.3, y+h*.16)}</g>;
  if (object.kind === "ion") return <g {...common}><circle cx={cx} cy={cy} r={Math.min(w,h)*.34} />{text("ion")}</g>;
  if (object.kind === "lone-pair") return <g><circle cx={cx-7} cy={cy} r="3" fill="#111" /><circle cx={cx+7} cy={cy} r="3" fill="#111" /></g>;
  if (object.kind === "crystal-fcc") return <g {...common}><rect x={x+w*.14} y={y+h*.28} width={w*.58} height={h*.55} /><path d={`M ${x+w*.14} ${y+h*.28} L ${x+w*.36} ${y+h*.1} L ${x+w*.94} ${y+h*.1} L ${x+w*.72} ${y+h*.28} M ${x+w*.72} ${y+h*.28} L ${x+w*.94} ${y+h*.1} L ${x+w*.94} ${y+h*.65} L ${x+w*.72} ${y+h*.83}`} />{[[.14,.28],[.72,.28],[.14,.83],[.72,.83],[.36,.1],[.94,.1],[.94,.65],[.43,.55]].map(([a,b],i)=><circle key={i} cx={x+w*a} cy={y+h*b} r="4" fill="#111" />)}</g>;
  if (object.kind === "precipitate") return <g {...common}><path d={`M ${x+w*.12} ${y+h*.1} L ${x+w*.22} ${y+h*.88} L ${x+w*.78} ${y+h*.88} L ${x+w*.88} ${y+h*.1}`} /><path d={`M ${x+w*.22} ${y+h*.88} L ${x+w*.78} ${y+h*.88} L ${x+w*.73} ${y+h*.67} L ${x+w*.27} ${y+h*.67} Z`} fill="#c7c7c7" stroke="#111" /></g>;
  if (object.kind === "electrochemical-cell") return <g {...common}><path d={`M ${x+w*.06} ${y+h*.18} L ${x+w*.13} ${y+h*.82} L ${x+w*.37} ${y+h*.82} L ${x+w*.44} ${y+h*.18} M ${x+w*.56} ${y+h*.18} L ${x+w*.63} ${y+h*.82} L ${x+w*.87} ${y+h*.82} L ${x+w*.94} ${y+h*.18}`} /><line x1={x+w*.25} y1={y+h*.1} x2={x+w*.25} y2={y+h*.62} /><line x1={x+w*.75} y1={y+h*.1} x2={x+w*.75} y2={y+h*.62} /><path d={`M ${x+w*.44} ${y+h*.28} Q ${cx} ${y+h*.02} ${x+w*.56} ${y+h*.28}`} />{text("anode", x+w*.25, y+h*.96)}{text("cathode", x+w*.75, y+h*.96)}</g>;
  if (object.kind === "beaker") return <g {...common}><path d={`M ${x+w*.12} ${y+h*.08} L ${x+w*.22} ${y+h*.9} L ${x+w*.78} ${y+h*.9} L ${x+w*.88} ${y+h*.08}`} /><line x1={x+w*.15} y1={y+h*.52} x2={x+w*.85} y2={y+h*.52} /></g>;
  if (object.kind === "flask" || object.kind === "volumetric-flask") return <g {...common}><path d={`M ${x+w*.4} ${y+h*.05} L ${x+w*.4} ${y+h*.38} C ${x+w*.08} ${y+h*.65}, ${x+w*.16} ${y+h*.94}, ${cx} ${y+h*.94} C ${x+w*.84} ${y+h*.94}, ${x+w*.92} ${y+h*.65}, ${x+w*.6} ${y+h*.38} L ${x+w*.6} ${y+h*.05}`} /><line x1={x+w*.36} y1={y+h*.28} x2={x+w*.64} y2={y+h*.28} /></g>;
  if (object.kind === "test-tube") return <path {...common} d={`M ${x+w*.36} ${y+h*.06} L ${x+w*.36} ${y+h*.72} A ${w*.14} ${h*.16} 0 0 0 ${x+w*.64} ${y+h*.72} L ${x+w*.64} ${y+h*.06}`} />;
  if (object.kind === "burette") return <g {...common}><rect x={x+w*.32} y={y+4} width={w*.36} height={h*.72} /><line x1={x+w*.16} y1={y+h*.76} x2={x+w*.84} y2={y+h*.76} /><line x1={cx} y1={y+h*.76} x2={cx} y2={y+h*.96} /></g>;
  if (object.kind === "separatory-funnel") return <g {...common}><path d={`M ${cx} ${y+4} L ${cx} ${y+h*.3} L ${x+w*.78} ${y+h*.52} L ${cx} ${y+h*.77} L ${x+w*.22} ${y+h*.52} L ${cx} ${y+h*.3}`} /><line x1={x+w*.35} y1={y+h*.76} x2={x+w*.65} y2={y+h*.76} /></g>;
  if (object.kind === "pipette") return <g {...common}><line x1={x+3} y1={cy} x2={x+w*.3} y2={cy} /><ellipse cx={cx} cy={cy} rx={w*.2} ry={h*.3} /><line x1={x+w*.7} y1={cy} x2={x+w-3} y2={cy} /></g>;
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

export default function Home() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tool, setTool] = useState<ObjectKind | "select">("select");
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [draft, setDraft] = useState<CanvasObject>();
  const [drag, setDrag] = useState<{ id: string; start: Point; original: CanvasObject }>();
  const [snippetOnly, setSnippetOnly] = useState(false);
  const [notice, setNotice] = useState("Choisissez un outil puis dessinez sur le canevas.");
  const [expression, setExpression] = useState("sin(deg(x))");
  const [range, setRange] = useState("-5:5");
  const latex = useMemo(() => documentFor(objects, snippetOnly), [objects, snippetOnly]);

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
    const p = canvasPoint(event, svg); const target = (event.target as Element).closest("[data-id]")?.getAttribute("data-id");
    if (tool === "select" && target) { const original = objects.find((o) => o.id === target); if (!original) return; setSelectedId(target); setDrag({ id: target, start: p, original }); event.currentTarget.setPointerCapture(event.pointerId); return; }
    if (tool === "select") { setSelectedId(undefined); return; }
    const created = makeObject(p);
    if (stampKinds.includes(created.kind) || created.kind === "text" || created.kind === "axes") { setObjects((old) => [...old, created]); setSelectedId(created.id); return; }
    setDraft(created); event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current; if (!svg) return; const p = canvasPoint(event, svg);
    if (drag) {
      const dx = p.x - drag.start.x; const dy = p.y - drag.start.y; const o = drag.original;
      setObjects((old) => old.map((item) => item.id !== o.id ? item : connectorKinds.includes(o.kind) ? { ...o, x: o.x + dx, y: o.y + dy, x2: (o.x2 ?? o.x) + dx, y2: (o.y2 ?? o.y) + dy } : { ...o, x: o.x + dx, y: o.y + dy, points: o.points?.map((point) => ({ x: point.x + dx, y: point.y + dy })) }));
      return;
    }
    if (!draft) return;
    if (draft.kind === "freehand") setDraft({ ...draft, points: [...(draft.points ?? []), p] });
    else if (connectorKinds.includes(draft.kind)) setDraft({ ...draft, x2: p.x, y2: p.y });
    else setDraft({ ...draft, width: p.x - draft.x, height: p.y - draft.y });
  };
  const onPointerUp = (event: PointerEvent<SVGSVGElement>) => {
    if (draft) { setObjects((old) => [...old, draft]); setSelectedId(draft.id); setDraft(undefined); }
    setDrag(undefined); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const addFunction = () => {
    const [xMin, xMax] = range.split(":").map(Number);
    if (!expression.trim() || !Number.isFinite(xMin) || !Number.isFinite(xMax)) { setNotice("Utilisez une expression et un intervalle, par exemple -5:5."); return; }
    const next = { id: objectId(), kind: "axes" as const, x: 40, y: 350, width: 250, height: 180, graph: { expression, xMin, xMax } };
    setObjects((old) => [...old, next]); setSelectedId(next.id); setNotice("Graphe ajouté au canevas.");
  };
  const copy = async () => { await navigator.clipboard.writeText(latex); setNotice("LaTeX copié dans le presse-papiers."); };
  const exportPdf = async () => {
    setNotice("Compilation LaTeX en cours…");
    try {
      const response = await fetch("/api/compile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ latex: documentFor(objects) }) });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || "La compilation a échoué."); }
      const url = URL.createObjectURL(await response.blob()); const a = document.createElement("a"); a.href = url; a.download = "schema-mpsi.pdf"; a.click(); URL.revokeObjectURL(url); setNotice("PDF téléchargé.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Impossible de compiler le PDF."); }
  };
  const deleteSelected = () => { if (!selectedId) return; setObjects((old) => old.filter((o) => o.id !== selectedId)); setSelectedId(undefined); };

  return <main>
    <header><div><p className="eyebrow">Représentations scientifiques CPGE</p><h1>Sketch2LaTeX — MPSI</h1></div><p className="status" aria-live="polite">{notice}</p></header>
    <section className="programme-note">Bibliothèque structurée à partir du programme de physique-chimie MPSI : optique géométrique, RLC et signaux, mécanique, champs et induction, thermodynamique, chimie des solutions et verrerie de TP.</section>
    <section className="toolbox" aria-label="Outils de représentation MPSI">
      {toolboxGroups.map((group) => <div key={group.title}><strong>{group.title}</strong>{group.kinds.map((kind) => <button key={kind} className={tool === kind ? "active" : ""} onClick={() => setTool(kind)}>{kind === "select" ? "Sélectionner / déplacer" : labels[kind]}</button>)}</div>)}
    </section>
    <section className="graph-controls"><label>Fonction <input value={expression} onChange={(e) => setExpression(e.target.value)} aria-label="Expression de la fonction" /></label><label>Intervalle en x <input value={range} onChange={(e) => setRange(e.target.value)} aria-label="Intervalle des x" /></label><button onClick={addFunction}>Ajouter le graphe</button><button onClick={deleteSelected} disabled={!selectedId}>Supprimer la sélection</button><button onClick={() => { setObjects([]); setSelectedId(undefined); setNotice("Canevas effacé."); }}>Effacer le canevas</button></section>
    <section className="workspace">
      <div className="canvas-wrap"><svg ref={svgRef} viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} aria-label="Canevas de schémas scientifiques">
        <defs><marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#111" /></marker></defs>
        <rect width={canvasWidth} height={canvasHeight} fill="white" />
        {objects.map((object) => <g key={object.id} data-id={object.id}>{preview(object, object.id === selectedId)}</g>)}
        {draft && <g opacity=".65">{preview(draft, true)}</g>}
      </svg></div>
      <aside><div className="code-actions"><label><input type="checkbox" checked={snippetOnly} onChange={(e) => setSnippetOnly(e.target.checked)} /> Extrait TikZ seul</label><button onClick={copy}>Copier le LaTeX</button><button onClick={exportPdf}>Exporter le PDF</button></div><textarea readOnly value={latex} aria-label="Aperçu LaTeX généré" spellCheck="false" /></aside>
    </section>
    <footer>Chaque objet est vectoriel, typé et converti de façon déterministe. Les coordonnées du canevas utilisent 50 px = 1 unité TikZ et l’axe vertical est retourné à l’export.</footer>
  </main>;
}
