import assert from "node:assert/strict";
import test from "node:test";
import { simpleMathToLatex } from "../app/lib/simple-math";

const cases: Array<[string, string]> = [
  ["x plus 2", "x+2"],
  ["2 fois x moins 3", "2\\times x-3"],
  ["2 times x minus 3", "2\\times x-3"],
  ["(a+b) sur (c-d)", "\\frac{a+b}{c-d}"],
  ["x puissance 2 puissance 3", "x^{2^{3}}"],
  ["moins x puissance 2", "-x^{2}"],
  ["racine de x", "\\sqrt{x}"],
  ["racine cubique de (x plus 1)", "\\sqrt[3]{x+1}"],
  ["sinus de (omega fois t plus phi)", "\\sin\\left(\\omega\\times t+\\varphi\\right)"],
  ["exponentielle de (-x puissance 2)", "e^{-x^{2}}"],
  ["alpha plus beta egale pi", "\\alpha+\\beta=\\pi"],
  ["1,5 fois x", "1{,}5\\times x"],
  ["integrale de 0 a plus infini de exp(-x^2) dx", "\\int_{0}^{+\\infty} e^{-x^{2}}\\,\\mathrm{d}x"],
  ["integral from 0 to plus infinity of exp(-x^2) dx", "\\int_{0}^{+\\infty} e^{-x^{2}}\\,\\mathrm{d}x"],
  ["integrale de 0 a plus infini de exp(-x^2) dx egale racine de pi sur 2", "\\int_{0}^{+\\infty} e^{-x^{2}}\\,\\mathrm{d}x=\\frac{\\sqrt{\\pi}}{2}"],
  ["integrale de f(x) dx", "\\int f\\left(x\\right)\\,\\mathrm{d}x"],
  ["somme de k=0 a n de u_k", "\\sum_{k=0}^{n} u_{k}"],
  ["product from k=1 to n of a_k", "\\prod_{k=1}^{n} a_{k}"],
  ["limite quand x tend vers 0 de sin(x) sur x", "\\lim_{x\\to 0} \\frac{\\sin\\left(x\\right)}{x}"],
  ["derivee de f(x) par rapport a x", "\\frac{\\mathrm{d}f\\left(x\\right)}{\\mathrm{d}x}"],
  ["second derivative of x(t) with respect to t", "\\frac{\\mathrm{d}^{2}x\\left(t\\right)}{\\mathrm{d}t^{2}}"],
  ["derivee partielle de f(x) par rapport a x", "\\frac{\\partial f\\left(x\\right)}{\\partial x}"],
  ["vecteur u", "\\vec{u}"],
  ["vecteur AB", "\\overrightarrow{AB}"],
  ["conjugue de z", "\\overline{z}"],
  ["partie reelle de z", "\\operatorname{Re}\\left(z\\right)"],
  ["force equals mass times acceleration", "\\vec{F}=m\\times \\vec{a}"],
  ["la force egale la masse fois l'acceleration", "\\vec{F}=m\\times \\vec{a}"],
  ["U_R egale R fois I", "U_{R}=R\\times I"],
  ["P fois V egale n fois R fois T", "P\\times V=n\\times R\\times T"],
  ["U indice C de t egale E fois (1 moins exp(-t sur (R fois C)))", "U_{C}\\left(t\\right)=E\\times \\left(1-e^{-\\frac{t}{R\\times C}}\\right)"],
  ["texte \"Energie mecanique\"", "\\text{Energie mecanique}"],
];

for (const [input, expected] of cases) test(`converts simple math: ${input}`, () => {
  const result = simpleMathToLatex(input);
  assert.equal(result.ok, true, result.message);
  assert.equal(result.latex, expected);
});

test("rejects raw LaTeX in simple mode", () => {
  const result = simpleMathToLatex("\\frac{a}{b}");
  assert.equal(result.ok, false);
  assert.match(result.message, /Code LaTeX/);
});

test("reports incomplete expressions without inventing LaTeX", () => {
  const result = simpleMathToLatex("x plus");
  assert.equal(result.ok, false);
  assert.equal(result.latex, "");
});
