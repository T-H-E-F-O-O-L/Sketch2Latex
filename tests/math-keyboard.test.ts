import assert from "node:assert/strict";
import test from "node:test";
import { mathKeyboardLayouts, mathKeyboardTabs } from "../app/lib/math-keyboard";

test("provides the four GeoGebra-style keyboard tabs", () => {
  assert.deepEqual(mathKeyboardTabs.map((tab) => tab.id), ["numbers", "functions", "letters", "symbols"]);
  assert.deepEqual(mathKeyboardTabs.map((tab) => tab.label), ["123", "f(x)", "ABC", "#&¬"]);
});

test("each keyboard tab has a complete, uniquely keyed layout", () => {
  for (const tab of mathKeyboardTabs) {
    const keys = mathKeyboardLayouts[tab.id];
    assert.ok(keys.length >= 25, `${tab.id} is too small`);
    assert.equal(new Set(keys.map((key) => key.id)).size, keys.length, `${tab.id} contains duplicate keys`);
    assert.ok(keys.every((key) => key.ariaLabel.length > 0));
  }
});

test("the calculator exposes essential CPGE structures", () => {
  const inserts = Object.values(mathKeyboardLayouts).flat().map((key) => key.insert ?? "");
  for (const expected of ["\\frac{#@}{#?}", "\\sqrt{#0}", "\\int_{#?}^{#?} #?\\,\\mathrm{d}x", "\\frac{\\mathrm{d}}{\\mathrm{d}x}\\left(#?\\right)", "\\vec{#@}", "\\mathbb{R}", "\\Rightarrow"]) {
    assert.ok(inserts.includes(expected), expected);
  }
});
