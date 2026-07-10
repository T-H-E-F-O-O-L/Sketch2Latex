"use client";

import { PointerEvent, useMemo, useRef, useState } from "react";
import { connectorKinds, labels, stampKinds, type CanvasObject, type ObjectKind, type Point } from "./lib/canvas-types";
import { documentFor } from "./lib/latex";

const canvasWidth = 900;
const canvasHeight = 560;
const primitiveTools: Array<ObjectKind | "select"> = ["select", "line", "arrow", "rect", "circle", "ellipse", "freehand", "text", "axes"];
const objectId = () => Math.random().toString(36).slice(2, 10);
const emptyPoint = (event: PointerEvent<SVGSVGElement>, svg: SVGSVGElement): Point => {
  const rect = svg.getBoundingClientRect();
  return { x: ((event.clientX - rect.left) / rect.width) * canvasWidth, y: ((event.clientY - rect.top) / rect.height) * canvasHeight };
};

function preview(object: CanvasObject, selected: boolean) {
  const common = { stroke: "#111", strokeWidth: selected ? 3 : 2, fill: "none", pointerEvents: "stroke" as const };
  const x2 = object.x2 ?? object.x; const y2 = object.y2 ?? object.y;
  if (connectorKinds.includes(object.kind)) {
    const midX = (object.x + x2) / 2; const midY = (object.y + y2) / 2;
    const dx = x2 - object.x; const dy = y2 - object.y; const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length; const uy = dy / length; const px = -uy; const py = ux;
    if (object.kind === "resistor") return <g><line {...common} x1={object.x} y1={object.y} x2={x2} y2={y2} /><rect x={midX - 18 * ux - 8 * px} y={midY - 18 * uy - 8 * py} width="36" height="16" transform={`rotate(${Math.atan2(dy, dx) * 180 / Math.PI} ${midX} ${midY})`} fill="white" stroke="#111" /></g>;
    if (object.kind === "battery" || object.kind === "capacitor") return <g><line {...common} x1={object.x} y1={object.y} x2={x2} y2={y2} /><line stroke="#111" strokeWidth="2" x1={midX - 5 * ux - 15 * px} y1={midY - 5 * uy - 15 * py} x2={midX - 5 * ux + 15 * px} y2={midY - 5 * uy + 15 * py} /><line stroke="#111" strokeWidth="2" x1={midX + 6 * ux - 10 * px} y1={midY + 6 * uy - 10 * py} x2={midX + 6 * ux + 10 * px} y2={midY + 6 * uy + 10 * py} /></g>;
    if (object.kind === "spring") return <polyline {...common} points={Array.from({ length: 11 }, (_, i) => `${object.x + dx * i / 10 + (i === 0 || i === 10 ? 0 : (i % 2 ? 9 : -9) * px)},${object.y + dy * i / 10 + (i === 0 || i === 10 ? 0 : (i % 2 ? 9 : -9) * py)}`).join(" ")} />;
    if (object.kind.startsWith("bond-")) return <g>{[-1, 0, 1].slice(object.kind === "bond-single" ? 1 : object.kind === "bond-double" ? 0 : 0, object.kind === "bond-single" ? 2 : 3).map((o) => <line key={o} {...common} x1={object.x + px * o * 4} y1={object.y + py * o * 4} x2={x2 + px * o * 4} y2={y2 + py * o * 4} />)}</g>;
    return <line {...common} x1={object.x} y1={object.y} x2={x2} y2={y2} markerEnd={object.kind === "wire" || object.kind === "line" ? undefined : "url(#arrowhead)"} markerStart={object.kind === "reaction-arrow" ? "url(#arrowhead)" : undefined} />;
  }
  if (object.kind === "rect") return <rect {...common} x={object.x} y={object.y} width={object.width} height={object.height} />;
  if (object.kind === "circle") return <circle {...common} cx={object.x + (object.width ?? 0) / 2} cy={object.y + (object.height ?? 0) / 2} r={Math.abs(object.width ?? 0) / 2} />;
  if (object.kind === "ellipse") return <ellipse {...common} cx={object.x + (object.width ?? 0) / 2} cy={object.y + (object.height ?? 0) / 2} rx={Math.abs(object.width ?? 0) / 2} ry={Math.abs(object.height ?? 0) / 2} />;
  if (object.kind === "freehand") return <polyline {...common} points={(object.points ?? []).map((p) => `${p.x},${p.y}`).join(" ")} />;
  if (object.kind === "text") return <text x={object.x} y={object.y} fill="#111" fontSize="17" pointerEvents="all">{object.text}</text>;
  if (object.kind === "axes") return <g><rect {...common} x={object.x} y={object.y} width={object.width} height={object.height} strokeDasharray="3 3" /><line {...common} x1={object.x} y1={object.y + (object.height ?? 0) / 2} x2={object.x + (object.width ?? 0)} y2={object.y + (object.height ?? 0) / 2} markerEnd="url(#arrowhead)" /><line {...common} x1={object.x + (object.width ?? 0) / 2} y1={object.y + (object.height ?? 0)} x2={object.x + (object.width ?? 0) / 2} y2={object.y} markerEnd="url(#arrowhead)" /><text x={object.x + 8} y={object.y + 20} fontSize="14">{object.graph?.expression ? `y = ${object.graph.expression}` : "axes"}</text></g>;
  const w = object.width ?? 70; const h = object.height ?? 80;
  if (object.kind === "beaker") return <g {...common}><path d={`M ${object.x + 10} ${object.y + 8} L ${object.x + 18} ${object.y + h - 8} L ${object.x + w - 18} ${object.y + h - 8} L ${object.x + w - 10} ${object.y + 8}`} /><line x1={object.x + 12} x2={object.x + w - 12} y1={object.y + h * .55} y2={object.y + h * .55} stroke="#111" /></g>;
  if (object.kind === "flask") return <path {...common} d={`M ${object.x + w*.4} ${object.y} L ${object.x + w*.4} ${object.y + h*.35} C ${object.x} ${object.y + h*.65}, ${object.x + w*.1} ${object.y + h}, ${object.x + w*.5} ${object.y + h} C ${object.x + w*.9} ${object.y + h}, ${object.x + w} ${object.y + h*.65}, ${object.x + w*.6} ${object.y + h*.35} L ${object.x + w*.6} ${object.y}`} />;
  if (object.kind === "test-tube") return <path {...common} d={`M ${object.x + w*.36} ${object.y} L ${object.x + w*.36} ${object.y + h*.72} A ${w*.14} ${h*.16} 0 0 0 ${object.x + w*.64} ${object.y + h*.72} L ${object.x + w*.64} ${object.y}`} />;
  if (object.kind === "pulley") return <g {...common}><circle cx={object.x+w/2} cy={object.y+h/2} r={w*.32} /><circle cx={object.x+w/2} cy={object.y+h/2} r="4" fill="#111" /></g>;
  return <g {...common}><ellipse cx={object.x+w/2} cy={object.y+h/2} rx={w*.15} ry={h*.45} /><line x1={object.x} y1={object.y+h/2} x2={object.x+w} y2={object.y+h/2} /></g>;
}

export default function Home() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tool, setTool] = useState<ObjectKind | "select">("select");
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [draft, setDraft] = useState<CanvasObject>();
  const [drag, setDrag] = useState<{ id: string; start: Point; original: CanvasObject }>();
  const [snippetOnly, setSnippetOnly] = useState(false);
  const [notice, setNotice] = useState("Choose a tool, then draw on the canvas.");
  const [expression, setExpression] = useState("sin(deg(x))");
  const [range, setRange] = useState("-5:5");
  const latex = useMemo(() => documentFor(objects, snippetOnly), [objects, snippetOnly]);

  const makeObject = (p: Point): CanvasObject => {
    const kind = tool as ObjectKind;
    if (stampKinds.includes(kind)) return { id: objectId(), kind, x: p.x - 35, y: p.y - 40, width: 70, height: 80 };
    if (kind === "text") return { id: objectId(), kind, x: p.x, y: p.y, text: "Label" };
    if (kind === "axes") return { id: objectId(), kind, x: p.x, y: p.y, width: 250, height: 180 };
    if (kind === "freehand") return { id: objectId(), kind, x: p.x, y: p.y, points: [p] };
    if (connectorKinds.includes(kind)) return { id: objectId(), kind, x: p.x, y: p.y, x2: p.x, y2: p.y };
    return { id: objectId(), kind, x: p.x, y: p.y, width: 0, height: 0 };
  };

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current; if (!svg) return;
    const p = emptyPoint(event, svg); const target = (event.target as Element).closest("[data-id]")?.getAttribute("data-id");
    if (tool === "select" && target) {
      const original = objects.find((o) => o.id === target); if (!original) return;
      setSelectedId(target); setDrag({ id: target, start: p, original }); (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId); return;
    }
    if (tool === "select") { setSelectedId(undefined); return; }
    const created = makeObject(p);
    if (stampKinds.includes(created.kind) || created.kind === "text" || created.kind === "axes") { setObjects((old) => [...old, created]); setSelectedId(created.id); return; }
    setDraft(created); (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current; if (!svg) return; const p = emptyPoint(event, svg);
    if (drag) {
      const dx = p.x - drag.start.x; const dy = p.y - drag.start.y; const o = drag.original;
      setObjects((old) => old.map((item) => item.id !== o.id ? item : connectorKinds.includes(o.kind)
        ? { ...o, x: o.x + dx, y: o.y + dy, x2: (o.x2 ?? o.x) + dx, y2: (o.y2 ?? o.y) + dy }
        : { ...o, x: o.x + dx, y: o.y + dy, points: o.points?.map((point) => ({ x: point.x + dx, y: point.y + dy })) }));
      return;
    }
    if (!draft) return;
    if (draft.kind === "freehand") setDraft({ ...draft, points: [...(draft.points ?? []), p] });
    else if (connectorKinds.includes(draft.kind)) setDraft({ ...draft, x2: p.x, y2: p.y });
    else setDraft({ ...draft, width: p.x - draft.x, height: p.y - draft.y });
  };
  const onPointerUp = (event: PointerEvent<SVGSVGElement>) => {
    if (draft) { setObjects((old) => [...old, draft]); setSelectedId(draft.id); setDraft(undefined); }
    setDrag(undefined); if ((event.currentTarget as SVGSVGElement).hasPointerCapture(event.pointerId)) (event.currentTarget as SVGSVGElement).releasePointerCapture(event.pointerId);
  };
  const addFunction = () => {
    const [xMin, xMax] = range.split(":").map(Number);
    if (!expression.trim() || !Number.isFinite(xMin) || !Number.isFinite(xMax)) { setNotice("Use an expression and a range such as -5:5."); return; }
    const next = { id: objectId(), kind: "axes" as const, x: 40, y: 350, width: 250, height: 180, graph: { expression, xMin, xMax } };
    setObjects((old) => [...old, next]); setSelectedId(next.id); setNotice("Function graph added.");
  };
  const copy = async () => { await navigator.clipboard.writeText(latex); setNotice("LaTeX copied to clipboard."); };
  const exportPdf = async () => {
    setNotice("Compiling LaTeX…");
    try {
      const response = await fetch("/api/compile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ latex: documentFor(objects) }) });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || "Compilation failed."); }
      const url = URL.createObjectURL(await response.blob()); const a = document.createElement("a"); a.href = url; a.download = "sketch2latex.pdf"; a.click(); URL.revokeObjectURL(url); setNotice("PDF downloaded.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not compile the PDF."); }
  };
  const deleteSelected = () => { if (!selectedId) return; setObjects((old) => old.filter((o) => o.id !== selectedId)); setSelectedId(undefined); };

  return <main>
    <header><div><p className="eyebrow">Structured scientific drawing</p><h1>Sketch2LaTeX</h1></div><p className="status" aria-live="polite">{notice}</p></header>
    <section className="toolbox" aria-label="Drawing tools">
      <div><strong>Basics</strong>{primitiveTools.map((kind) => <button key={kind} className={tool === kind ? "active" : ""} onClick={() => setTool(kind)}>{kind === "select" ? "Select / move" : labels[kind]}</button>)}</div>
      <div><strong>Physics & circuits</strong>{(["wire", "resistor", "battery", "capacitor", "spring", "force"] as ObjectKind[]).map((kind) => <button key={kind} className={tool === kind ? "active" : ""} onClick={() => setTool(kind)}>{labels[kind]}</button>)}</div>
      <div><strong>Chemistry</strong>{(["bond-single", "bond-double", "bond-triple", "reaction-arrow", "beaker", "flask", "test-tube"] as ObjectKind[]).map((kind) => <button key={kind} className={tool === kind ? "active" : ""} onClick={() => setTool(kind)}>{labels[kind]}</button>)}</div>
      <div><strong>Optics & mechanics</strong>{(["pulley", "lens"] as ObjectKind[]).map((kind) => <button key={kind} className={tool === kind ? "active" : ""} onClick={() => setTool(kind)}>{labels[kind]}</button>)}</div>
    </section>
    <section className="graph-controls"><label>Function <input value={expression} onChange={(e) => setExpression(e.target.value)} aria-label="Function expression" /></label><label>x range <input value={range} onChange={(e) => setRange(e.target.value)} aria-label="Graph x range" /></label><button onClick={addFunction}>Add function graph</button><button onClick={deleteSelected} disabled={!selectedId}>Delete selected</button><button onClick={() => { setObjects([]); setSelectedId(undefined); }}>Clear canvas</button></section>
    <section className="workspace">
      <div className="canvas-wrap"><svg ref={svgRef} viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} aria-label="Scientific drawing canvas">
        <defs><marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#111" /></marker></defs>
        <rect width={canvasWidth} height={canvasHeight} fill="white" />
        {objects.map((object) => <g key={object.id} data-id={object.id}>{preview(object, object.id === selectedId)}</g>)}
        {draft && <g opacity=".65">{preview(draft, true)}</g>}
      </svg></div>
      <aside><div className="code-actions"><label><input type="checkbox" checked={snippetOnly} onChange={(e) => setSnippetOnly(e.target.checked)} /> Snippet only</label><button onClick={copy}>Copy LaTeX</button><button onClick={exportPdf}>Export PDF</button></div><textarea readOnly value={latex} aria-label="Generated LaTeX preview" spellCheck="false" /></aside>
    </section>
    <footer>All output is generated deterministically from typed vector objects. Canvas coordinates use 50 px = 1 TikZ unit and flip the y-axis for TikZ.</footer>
  </main>;
}
