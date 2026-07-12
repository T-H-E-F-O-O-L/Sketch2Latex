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
    if (key.caseAware) return { ...key, label: key.label.toUpperCase(), insert: key.insert?.toUpperCase(), ariaLabel: `Lettre ${key.label.toUpperCase()}` };
    return uppercaseGreek[key.id] ? { ...key, ...uppercaseGreek[key.id], ariaLabel: `${key.ariaLabel}, majuscule` } : key;
  };

  const insertKey = (sourceKey: MathKeyboardKey, focusMathField: boolean) => {
    if (sourceKey.action === "toggle-case") { setUppercase((value) => !value); return; }
    const field = fieldRef.current; const key = resolveKey(sourceKey); if (!field || !key.insert) return;
    if (mathLiveStatus !== "ready" || typeof field.insert !== "function") return;
    field.insert(key.insert, { insertionMode: "replaceSelection", selectionMode: /#[@?0]/.test(key.insert) ? "placeholder" : "after", focus: focusMathField, feedback: true, scrollIntoView: true });
    onFormulaChange(field.value);
  };

  const runCommand = (command: "move-to-previous-char" | "move-to-next-char" | "delete-backward", focusMathField: boolean) => {
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

  return <section className="math-calculator" aria-label="Calculatrice mathématique">
    <div className="visual-math-field-wrap" aria-busy={mathLiveStatus === "loading"}><math-field ref={attachField} className="visual-math-field" aria-label="Éditeur visuel de formule" aria-describedby="math-editor-help" math-virtual-keyboard-policy="manual" onInput={(event: FormEvent<HTMLElement>) => onFormulaChange((event.currentTarget as MathfieldElement).value)} /></div>
    <p id="math-editor-help">{mathLiveStatus === "loading" ? "Chargement de l’éditeur mathématique…" : "Saisissez au clavier ou utilisez les touches ci-dessous. Cliquez dans la formule pour déplacer le curseur."}</p>
    {mathLiveStatus === "error" && <div className="math-load-error" role="alert"><span>L’éditeur mathématique n’a pas pu démarrer.</span><button type="button" onClick={() => { setMathLiveStatus("loading"); loadMathLive(); }}>Réessayer</button></div>}
    <div className="math-keyboard-tabs" role="tablist" aria-label="Catégories du clavier mathématique">
      {mathKeyboardTabs.map((tab, index) => <button key={tab.id} id={`math-keyboard-tab-${tab.id}`} type="button" role="tab" aria-label={tab.ariaLabel} aria-selected={activeTab === tab.id} aria-controls="math-keyboard-panel" tabIndex={activeTab === tab.id ? 0 : -1} className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)} onKeyDown={(event) => chooseTabFromKeyboard(event, index)}>{tab.label}</button>)}
    </div>
    <div id="math-keyboard-panel" className="math-keyboard-grid" role="tabpanel" aria-labelledby={`math-keyboard-tab-${activeTab}`}>
      {mathKeyboardLayouts[activeTab].map((sourceKey) => { const key = resolveKey(sourceKey); return <button key={sourceKey.id} type="button" className={`math-key${sourceKey.action === "toggle-case" ? " case-key" : ""}`} aria-label={key.ariaLabel} aria-pressed={sourceKey.action === "toggle-case" ? uppercase : undefined} disabled={mathLiveStatus !== "ready"} onPointerDown={keepMathfieldFocus} onClick={(event) => insertKey(sourceKey, cameFromPointer(event))}><span aria-hidden="true" dangerouslySetInnerHTML={{ __html: renderedKeyLabel(key.label) }} /></button>; })}
    </div>
    <div className="math-keyboard-actions" aria-label="Actions du clavier mathématique">
      <button type="button" disabled={mathLiveStatus !== "ready"} onPointerDown={keepMathfieldFocus} onClick={(event) => clear(cameFromPointer(event))} aria-label="Effacer toute la formule">AC</button>
      <button type="button" disabled={mathLiveStatus !== "ready"} onPointerDown={keepMathfieldFocus} onClick={(event) => runCommand("move-to-previous-char", cameFromPointer(event))} aria-label="Déplacer le curseur vers la gauche">←</button>
      <button type="button" disabled={mathLiveStatus !== "ready"} onPointerDown={keepMathfieldFocus} onClick={(event) => runCommand("move-to-next-char", cameFromPointer(event))} aria-label="Déplacer le curseur vers la droite">→</button>
      <button type="button" disabled={mathLiveStatus !== "ready"} onPointerDown={keepMathfieldFocus} onClick={(event) => runCommand("delete-backward", cameFromPointer(event))} aria-label="Effacer le caractère précédent">⌫</button>
      <button type="button" className="commit-formula" onPointerDown={keepMathfieldFocus} onClick={onAdd} disabled={!formula.trim()} aria-label="Ajouter la formule au canevas">↵</button>
    </div>
    <div className="math-primary-actions"><button type="button" onClick={onAdd} disabled={!formula.trim()}>Ajouter la formule</button><button type="button" onClick={onAddDemonstration} disabled={!formula.trim()}>Ajouter comme démonstration</button></div>
    <details className="advanced-latex-editor"><summary>Code LaTeX (avancé)</summary><label>LaTeX modifiable<textarea className="math-input" value={formula} onChange={(event) => onFormulaChange(event.target.value)} spellCheck="false" aria-label="Code LaTeX avancé de la formule" /></label></details>
  </section>;
}
