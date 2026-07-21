"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import katex from "katex";
import "mathlive/fonts.css";
import type { MathfieldElement } from "mathlive";
import { mathKeyboardLayouts, mathKeyboardTabs, type MathKeyboardKey, type MathKeyboardTab } from "../lib/math-keyboard";

type MathCalculatorProps = {
  formula: string;
  onFormulaChange: (formula: string) => void;
  onAdd: () => void;
  onAddDemonstration: () => void;
};

const uppercaseGreek: Record<string, { label: string; insert: string }> = {
  alpha: { label: "A", insert: "A" }, beta: { label: "B", insert: "B" },
  gamma: { label: "\\Gamma", insert: "\\Gamma" }, delta: { label: "\\Delta", insert: "\\Delta" }, theta: { label: "\\Theta", insert: "\\Theta" }, lambda: { label: "\\Lambda", insert: "\\Lambda" },
  epsilon: { label: "E", insert: "E" }, mu: { label: "M", insert: "M" }, "pi-letter": { label: "\\Pi", insert: "\\Pi" }, rho: { label: "P", insert: "P" },
  sigma: { label: "\\Sigma", insert: "\\Sigma" }, tau: { label: "T", insert: "T" }, phi: { label: "\\Phi", insert: "\\Phi" }, psi: { label: "\\Psi", insert: "\\Psi" }, omega: { label: "\\Omega", insert: "\\Omega" },
};

const renderedKeyLabels = new Map<string, string>();

function renderedKeyLabel(latex: string) {
  const cached = renderedKeyLabels.get(latex); if (cached) return cached;
  try { const rendered = katex.renderToString(latex, { throwOnError: false, output: "html" }); renderedKeyLabels.set(latex, rendered); return rendered; }
  catch { renderedKeyLabels.set(latex, latex); return latex; }
}

export function MathCalculator({ formula, onFormulaChange, onAdd, onAddDemonstration }: MathCalculatorProps) {
  const fieldRef = useRef<MathfieldElement | null>(null);
  const mountedRef = useRef(true);
  const [activeTab, setActiveTab] = useState<MathKeyboardTab>("numbers");
  const [uppercase, setUppercase] = useState(false);
  const [mathLiveStatus, setMathLiveStatus] = useState<"loading" | "ready" | "error">("loading");

  const attachField = useCallback((element: HTMLElement | null) => { fieldRef.current = element as MathfieldElement | null; }, []);
  const loadMathLive = useCallback(() => {
    void import("mathlive").then(() => { if (mountedRef.current) setMathLiveStatus("ready"); }).catch(() => { if (mountedRef.current) setMathLiveStatus("error"); });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadMathLive();
    return () => { mountedRef.current = false; };
  }, [loadMathLive]);

  useEffect(() => {
    const field = fieldRef.current; if (!field || mathLiveStatus !== "ready") return;
    field.mathVirtualKeyboardPolicy = "manual"; field.smartFence = true; field.smartMode = true; field.letterShapeStyle = "french";
    if (field.value !== formula) field.value = formula;
  }, [formula, mathLiveStatus]);

  const resolveKey = (key: MathKeyboardKey) => {
    if (!uppercase) return key;
    if (key.caseAware) return { ...key, label: key.label.toUpperCase(), insert: key.insert?.toUpperCase(), ariaLabel: `Letter ${key.label.toUpperCase()}` };
    return uppercaseGreek[key.id] ? { ...key, ...uppercaseGreek[key.id], ariaLabel: `${key.ariaLabel}, uppercase` } : key;
  };

  const insertKey = (sourceKey: MathKeyboardKey, focusMathField: boolean) => {
    if (sourceKey.action === "toggle-case") { setUppercase((value) => !value); return; }
    const field = fieldRef.current; const key = resolveKey(sourceKey); if (!field || !key.insert) return;
    if (mathLiveStatus !== "ready" || typeof field.insert !== "function") return;
    field.insert(key.insert, { insertionMode: "replaceSelection", selectionMode: /#[@?0]/.test(key.insert) ? "placeholder" : "after", focus: focusMathField, feedback: true, scrollIntoView: true });
    onFormulaChange(field.value);
  };

  const runCommand = (command: "moveToPreviousChar" | "moveToNextChar" | "deleteBackward", focusMathField: boolean) => {
    const field = fieldRef.current; if (!field || mathLiveStatus !== "ready" || typeof field.executeCommand !== "function") return;
    if (focusMathField) field.focus(); field.executeCommand(command); onFormulaChange(field.value);
  };

  const clear = (focusMathField: boolean) => { const field = fieldRef.current; if (field && mathLiveStatus === "ready") { field.value = ""; if (focusMathField) field.focus(); } onFormulaChange(""); };
  const keepMathfieldFocus = (event: PointerEvent<HTMLButtonElement>) => event.preventDefault();
  const cameFromPointer = (event: MouseEvent<HTMLButtonElement>) => event.detail > 0;

  const chooseTabFromKeyboard = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault(); const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? mathKeyboardTabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + mathKeyboardTabs.length) % mathKeyboardTabs.length;
    const next = mathKeyboardTabs[nextIndex]; setActiveTab(next.id); requestAnimationFrame(() => document.getElementById(`math-keyboard-tab-${next.id}`)?.focus());
  };

  return <section className="math-calculator" aria-label="Mathematical calculator">
    <div className="visual-math-field-wrap" aria-busy={mathLiveStatus === "loading"}><math-field ref={attachField} className="visual-math-field" aria-label="Visual formula editor" aria-describedby="math-editor-help" math-virtual-keyboard-policy="manual" onInput={(event: FormEvent<HTMLElement>) => onFormulaChange((event.currentTarget as MathfieldElement).value)} /></div>
    <p id="math-editor-help">{mathLiveStatus === "loading" ? "Loading the mathematical editor…" : "Type with your keyboard or use the keys below. Click in the formula to move the cursor."}</p>
    {mathLiveStatus === "error" && <div className="math-load-error" role="alert"><span>The mathematical editor could not start.</span><button type="button" onClick={() => { setMathLiveStatus("loading"); loadMathLive(); }}>Try again</button></div>}
    <div className="math-keyboard-tabs" role="tablist" aria-label="Math keyboard categories">
      {mathKeyboardTabs.map((tab, index) => <button key={tab.id} id={`math-keyboard-tab-${tab.id}`} type="button" role="tab" aria-label={tab.ariaLabel} aria-selected={activeTab === tab.id} aria-controls="math-keyboard-panel" tabIndex={activeTab === tab.id ? 0 : -1} className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)} onKeyDown={(event) => chooseTabFromKeyboard(event, index)}>{tab.label}</button>)}
    </div>
    <div id="math-keyboard-panel" className="math-keyboard-grid" role="tabpanel" aria-labelledby={`math-keyboard-tab-${activeTab}`}>
      {mathKeyboardLayouts[activeTab].map((sourceKey) => { const key = resolveKey(sourceKey); return <button key={sourceKey.id} type="button" className={`math-key${sourceKey.action === "toggle-case" ? " case-key" : ""}`} aria-label={key.ariaLabel} aria-pressed={sourceKey.action === "toggle-case" ? uppercase : undefined} disabled={mathLiveStatus !== "ready"} onPointerDown={keepMathfieldFocus} onClick={(event) => insertKey(sourceKey, cameFromPointer(event))}><span aria-hidden="true" dangerouslySetInnerHTML={{ __html: renderedKeyLabel(key.label) }} /></button>; })}
    </div>
    <div className="math-keyboard-actions" aria-label="Math keyboard actions">
      <button type="button" disabled={mathLiveStatus !== "ready"} onPointerDown={keepMathfieldFocus} onClick={(event) => clear(cameFromPointer(event))} aria-label="Clear the formula">AC</button>
      <button type="button" disabled={mathLiveStatus !== "ready"} onPointerDown={keepMathfieldFocus} onClick={(event) => runCommand("moveToPreviousChar", cameFromPointer(event))} aria-label="Move cursor left">←</button>
      <button type="button" disabled={mathLiveStatus !== "ready"} onPointerDown={keepMathfieldFocus} onClick={(event) => runCommand("moveToNextChar", cameFromPointer(event))} aria-label="Move cursor right">→</button>
      <button type="button" disabled={mathLiveStatus !== "ready"} onPointerDown={keepMathfieldFocus} onClick={(event) => runCommand("deleteBackward", cameFromPointer(event))} aria-label="Delete previous character">⌫</button>
      <button type="button" className="commit-formula" onPointerDown={keepMathfieldFocus} onClick={onAdd} disabled={!formula.trim()} aria-label="Add formula to canvas">↵</button>
    </div>
    <div className="math-primary-actions"><button type="button" onClick={onAdd} disabled={!formula.trim()}>Add formula</button><button type="button" onClick={onAddDemonstration} disabled={!formula.trim()}>Add as derivation</button></div>
    <details className="advanced-latex-editor"><summary>LaTeX code (advanced)</summary><label>Editable LaTeX<textarea className="math-input" value={formula} onChange={(event) => onFormulaChange(event.target.value)} spellCheck="false" aria-label="Advanced formula LaTeX code" /></label></details>
  </section>;
}
