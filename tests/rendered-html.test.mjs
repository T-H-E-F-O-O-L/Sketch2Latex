import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the Sketch2LaTeX editor", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Sketch2LaTeX<\/title>/i);
  assert.match(html, /Éditeur scientifique CPGE/);
  assert.match(html, /Bibliothèque/);
  assert.match(html, /Modèles/);
  assert.match(html, /Maths &amp; Physique/);
  assert.match(html, /Canevas scientifique interactif/);
  assert.match(html, /Ajouter un graphe/);
  assert.match(html, /SVG vectoriel/);
  assert.doesNotMatch(html, /Compiler le LaTeX/);
});

test("ships editor, persistence, template and vector-export workflows", async () => {
  const [page, css, templates, project, latex, concoursStyle, connectionGeometry, mathKeyboard, mathCalculator, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/templates.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/project.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/latex.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/concours-style.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/connection-geometry.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/math-keyboard.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/math-calculator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.match(page, /AUTOSAVE_KEY/);
  assert.match(page, /resolveConnections/);
  assert.match(page, /svg2pdf\.js/);
  assert.match(page, /objectsFromLatex/);
  assert.match(page, /groupSelection/);
  assert.match(page, /makeAopCircuit/);
  assert.match(page, /roundTripReport/);
  assert.match(page, /templateMode/);
  assert.match(page, /physicsFormulaGroups/);
  assert.match(page, /addMathEquation/);
  assert.match(page, /MathCalculator/);
  assert.match(page, /Éditeur visuel de formule/);
  assert.doesNotMatch(page, /Langage simple/);
  assert.match(page, /data-export-formula/);
  assert.match(page, /getMathJaxRenderer/);
  assert.match(page, /formulaForTypesetting/);
  assert.match(page, /canvasUnitsToPoints/);
  assert.match(page, /EXPORTED_SVG_STYLE/);
  assert.match(page, /editor-locked/);
  assert.doesNotMatch(page, /\/api\/compile/);
  assert.match(css, /\.editor-layout/);
  assert.match(css, /\.endpoint-handle/);
  assert.match(css, /\.snap-port/);
  assert.match(css, /\.circuit-junction/);
  assert.match(css, /\.math-calculator/);
  assert.match(css, /\.math-keyboard-grid/);
  assert.match(css, /\.canvas-wrap > svg/);
  assert.doesNotMatch(css, /\.canvas-wrap svg/);
  assert.match(templates, /Circuit RLC série/);
  assert.match(templates, /Dispersion par un prisme/);
  assert.match(templates, /Pile électrochimique/);
  assert.match(project, /PROJECT_VERSION/);
  assert.match(latex, /tikz-rect-/);
  assert.match(latex, /raw-tikz/);
  assert.match(latex, /use as bounding box/);
  assert.match(latex, /usepackage\[european\]\{circuitikz\}/);
  assert.match(concoursStyle, /CANVAS_UNITS_PER_CM = 50/);
  assert.match(concoursStyle, /Latin Modern Roman/);
  assert.match(connectionGeometry, /ConnectionPortName/);
  assert.match(connectionGeometry, /junctionPointsFor/);
  assert.match(mathKeyboard, /mathKeyboardLayouts/);
  assert.match(mathKeyboard, /label: "123"/);
  assert.match(mathKeyboard, /label: "f\(x\)"/);
  assert.match(mathKeyboard, /label: "ABC"/);
  assert.match(mathCalculator, /math-field/);
  assert.match(mathCalculator, /Code LaTeX \(avancé\)/);
  assert.match(mathCalculator, /delete-backward/);
  assert.match(mathCalculator, /import\("mathlive"\)/);
  assert.match(mathCalculator, /mathLiveStatus/);
  assert.match(packageJson, /"svg2pdf\.js"/);
  assert.match(packageJson, /"mathlive"/);
});
