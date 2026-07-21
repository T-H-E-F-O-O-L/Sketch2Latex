import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the Sketch2LaTeX project launcher", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Sketch2LaTeX<\/title>/i);
  assert.match(html, /Scientific diagram editor for STEM students/);
  assert.match(html, /Start drawing/);
  assert.match(html, /Saved projects/);
  assert.match(html, /Blank canvas/);
  assert.match(html, /Draw on PDF/);
  assert.match(html, /The PDF never leaves your browser/);
});

test("ships editor, persistence, template and vector-export workflows", async () => {
  const [page, css, templates, project, latex, concoursStyle, connectionGeometry, scientificScene, scientificLabel, mathKeyboard, mathCalculator, pdfBackground, smartSnapping, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/templates.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/project.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/latex.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/concours-style.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/connection-geometry.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/scientific-scene.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/scientific-label.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/math-keyboard.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/math-calculator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/pdf-background.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/smart-snapping.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.match(page, /AUTOSAVE_KEY/);
  assert.match(page, /resolveConnections/);
  assert.match(page, /startBlankProject/);
  assert.match(page, /showProjectLauncher/);
  assert.match(page, /Smart snap/);
  assert.match(page, /svg2pdf\.js/);
  assert.match(page, /objectsFromLatex/);
  assert.match(page, /groupSelection/);
  assert.match(page, /makeAopCircuit/);
  assert.match(page, /roundTripReport/);
  assert.match(page, /templateMode/);
  assert.match(page, /physicsFormulaGroups/);
  assert.match(page, /addMathEquation/);
  assert.match(page, /MathCalculator/);
  assert.match(page, /Visual formula editor/);
  assert.doesNotMatch(page, /Langage simple/);
  assert.match(page, /data-export-formula/);
  assert.match(page, /getMathJaxRenderer/);
  assert.match(page, /formulaForTypesetting/);
  assert.match(page, /canvasUnitsToPoints/);
  assert.match(page, /EXPORTED_SVG_STYLE/);
  assert.match(page, /editor-locked/);
  assert.match(page, /scientificScenePreview/);
  assert.match(page, /strokePattern/);
  assert.doesNotMatch(page, /\/api\/compile/);
  assert.match(css, /\.editor-layout/);
  assert.match(css, /\.endpoint-handle/);
  assert.match(css, /\.snap-port/);
  assert.match(css, /\.project-launcher/);
  assert.match(css, /\.smart-snap-guides/);
  assert.match(css, /\.circuit-junction/);
  assert.match(css, /\.math-calculator/);
  assert.match(css, /\.math-keyboard-grid/);
  assert.match(css, /\.canvas-wrap > svg/);
  assert.doesNotMatch(css, /\.canvas-wrap svg/);
  assert.match(css, /\.pdf-background-canvas/);
  assert.match(css, /pointer-events: none/);
  assert.match(templates, /Series RLC circuit/);
  assert.match(templates, /Dispersion through a prism/);
  assert.match(templates, /Electrochemical cell/);
  assert.match(project, /PROJECT_VERSION/);
  assert.match(latex, /tikz-rect-/);
  assert.match(latex, /raw-tikz/);
  assert.match(latex, /use as bounding box/);
  assert.match(latex, /usepackage\[european\]\{circuitikz\}/);
  assert.match(concoursStyle, /CANVAS_UNITS_PER_CM = 50/);
  assert.match(concoursStyle, /Latin Modern Roman/);
  assert.match(connectionGeometry, /ConnectionPortName/);
  assert.match(connectionGeometry, /junctionPointsFor/);
  assert.match(scientificScene, /sharedScientificKinds/);
  assert.match(scientificScene, /scientificSceneToTikz/);
  assert.match(scientificLabel, /parseScientificLabel/);
  assert.match(page, /scientificLabelSpans/);
  assert.match(page, /connectorLabelPointFor\(object, -g\.labelOffset\)/);
  assert.match(mathKeyboard, /mathKeyboardLayouts/);
  assert.match(mathKeyboard, /label: "123"/);
  assert.match(mathKeyboard, /label: "f\(x\)"/);
  assert.match(mathKeyboard, /label: "ABC"/);
  assert.match(mathCalculator, /math-field/);
  assert.match(mathCalculator, /LaTeX code \(advanced\)/);
  assert.match(mathCalculator, /deleteBackward/);
  assert.match(mathCalculator, /import\("mathlive"\)/);
  assert.match(mathCalculator, /mathLiveStatus/);
  assert.match(pdfBackground, /normalizePdfPageDrawing/);
  assert.match(pdfBackground, /restorePdfPageDrawing/);
  assert.match(smartSnapping, /snapIntersections/);
  assert.match(smartSnapping, /source: "alignment"/);
  assert.match(page, /pdf\.worker\.min\.mjs/);
  assert.match(page, /Your PDF stays in your browser and is not uploaded/);
  assert.match(packageJson, /"svg2pdf\.js"/);
  assert.match(packageJson, /"mathlive"/);
  assert.match(packageJson, /"pdfjs-dist"/);
});
