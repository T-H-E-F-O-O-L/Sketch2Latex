export type SimpleMathResult = {
  ok: boolean;
  latex: string;
  message: string;
};

export const simpleMathExamples = [
  { label: "Intégrale", input: "integrale de 0 a plus infini de exp(-x^2) dx" },
  { label: "Dynamique", input: "force egale masse fois acceleration" },
  { label: "Circuit RC", input: "U_C(t) egale E fois (1 moins exp(-t sur (R fois C)))" },
  { label: "Limite", input: "limite quand x tend vers 0 de sin(x) sur x" },
] as const;

type TokenType = "number" | "identifier" | "operator" | "lparen" | "rparen" | "comma" | "eof";
type Token = { type: TokenType; value: string; position: number };

type Node =
  | { kind: "number"; value: string }
  | { kind: "symbol"; value: string }
  | { kind: "unary"; operator: "+" | "-"; value: Node }
  | { kind: "binary"; operator: string; left: Node; right: Node; implicit?: boolean }
  | { kind: "call"; name: string; arguments: Node[] };

const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
const clean = (value: string) => value.normalize("NFKC").replace(/[’`]/g, "'").replace(/\s+/g, " ").trim();
const escapeText = (value: string) => value.replace(/([\\{}%_#&$])/g, "\\$1");

const conceptSymbols: Record<string, string> = {
  force: "\\vec{F}", mass: "m", masse: "m", acceleration: "\\vec{a}", velocity: "\\vec{v}", vitesse: "\\vec{v}", position: "x", time: "t", temps: "t",
  energy: "E", energie: "E", work: "W", travail: "W", heat: "Q", chaleur: "Q", charge: "q", current: "I", courant: "I", intensite: "I", voltage: "U", tension: "U",
  resistance: "R", capacitance: "C", capacite: "C", inductance: "L", frequency: "f", frequence: "f", pressure: "P", pression: "P", volume: "V", temperature: "T",
  pulsation: "\\omega", wavelength: "\\lambda", "longueur_d_onde": "\\lambda", momentum: "\\vec{p}", quantite_de_mouvement: "\\vec{p}",
};

const greekSymbols: Record<string, string> = {
  alpha: "\\alpha", beta: "\\beta", gamma: "\\gamma", delta: "\\delta", epsilon: "\\varepsilon", theta: "\\theta", lambda: "\\lambda", mu: "\\mu", nu: "\\nu",
  pi: "\\pi", rho: "\\rho", sigma: "\\sigma", tau: "\\tau", phi: "\\varphi", varphi: "\\varphi", omega: "\\omega", infinity: "\\infty", infini: "\\infty",
};

const setSymbols: Record<string, string> = { reels: "\\mathbb{R}", reals: "\\mathbb{R}", entiers: "\\mathbb{Z}", integers: "\\mathbb{Z}", rationnels: "\\mathbb{Q}", rationals: "\\mathbb{Q}", complexes: "\\mathbb{C}" };
const functionNames: Record<string, string> = { sin: "sin", sinus: "sin", cos: "cos", cosinus: "cos", tan: "tan", tangente: "tan", ln: "ln", log: "log", exp: "exp", sqrt: "sqrt", cbrt: "cbrt", abs: "abs", norm: "norm", arcsin: "arcsin", arccos: "arccos", arctan: "arctan" };

function replacePhrases(source: string) {
  const replacements: Array<[RegExp, string]> = [
    [/\b(?:the|la|le|l[' ])\s*(?=(?:force|mass|masse|acceleration|acc[eé]l[eé]ration|velocity|vitesse|energy|[eé]nergie|charge|current|courant|tension|voltage|resistance|r[eé]sistance)\b)/giu, ""],
    [/\b([\p{L}][\p{L}\p{N}_]*)\s+(?:indice|sub)\s+([\p{L}\p{N}]+)\b/giu, "$1_$2"],
    [/\b(?:vector|vecteur)(?:\s+(?:of|de))?\s+([\p{L}][\p{L}\p{N}_]*)\b/giu, " vecmark_$1 "],
    [/\blongueur\s+d[' ]onde\b/giu, "longueur_d_onde"],
    [/\bquantit[eé]\s+de\s+mouvement\b/giu, "quantite_de_mouvement"],
    [/\bsquare\s+root\s+of\b/giu, " sqrt "], [/\bracine\s+carr[eé]e?\s+de\b/giu, " sqrt "], [/\bracine\s+de\b/giu, " sqrt "],
    [/\bcube\s+root\s+of\b/giu, " cbrt "], [/\bracine\s+cubique\s+de\b/giu, " cbrt "],
    [/\bnatural\s+logarithm\s+of\b/giu, " ln "], [/\blogarithme\s+n[eé]p[eé]rien\s+de\b/giu, " ln "],
    [/\bexponential\s+of\b/giu, " exp "], [/\bexponentielle\s+de\b/giu, " exp "],
    [/\bsine\s+of\b/giu, " sin "], [/\bsinus\s+de\b/giu, " sin "], [/\bcosine\s+of\b/giu, " cos "], [/\bcosinus\s+de\b/giu, " cos "],
    [/\b([\p{L}][\p{L}\p{N}_]*)\s+(?:de|of)\s+([txy])\b/giu, "$1($2)"],
    [/\bto\s+the\s+power\s+of\b/giu, " ^ "], [/\bto\s+the\s+power\b/giu, " ^ "], [/\b[àa]\s+la\s+puissance\b/giu, " ^ "], [/\bpuissance\b/giu, " ^ "],
    [/\bsquared\b/giu, " ^ 2 "], [/\bau\s+carr[eé]\b/giu, " ^ 2 "], [/\bcarr[eé]\b/giu, " ^ 2 "], [/\bcubed\b/giu, " ^ 3 "], [/\bau\s+cube\b/giu, " ^ 3 "],
    [/\bmultiplied\s+by\b/giu, " * "], [/\bdivided\s+by\b/giu, " / "], [/\bmultipli[eé]\s+par\b/giu, " * "], [/\bdivis[eé]\s+par\b/giu, " / "],
    [/\bproduit\s+scalaire\b/giu, " dot "], [/\bscalar\s+product\b/giu, " dot "], [/\bdot\s+product\b/giu, " dot "],
    [/\bproduit\s+vectoriel\b/giu, " cross "], [/\bcross\s+product\b/giu, " cross "],
    [/\bplus\b/giu, " + "], [/\bminus\b/giu, " -"], [/\bmoins\b/giu, " -"], [/\btimes\b/giu, " * "], [/\bfois\b/giu, " * "], [/\bover\b/giu, " / "], [/\bsur\b/giu, " / "],
    [/\bopen\s+parenthes(?:is|e)\b/giu, " ( "], [/\bclose\s+parenthes(?:is|e)\b/giu, " ) "], [/\bparenth[eè]se\s+ouvrante\b/giu, " ( "], [/\bparenth[eè]se\s+fermante\b/giu, " ) "],
    [/\bzero\b/giu, "0"], [/\bone\b/giu, "1"], [/\bun\b/giu, "1"], [/\bune\b/giu, "1"], [/\btwo\b/giu, "2"], [/\bdeux\b/giu, "2"], [/\bthree\b/giu, "3"], [/\btrois\b/giu, "3"],
  ];
  return replacements.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), source).replace(/×|·/g, " * ").replace(/÷/g, " / ").replace(/∞/g, " infinity ");
}

function canonicalRelations(source: string) {
  const replacements: Array<[RegExp, string]> = [
    [/\b(?:is\s+)?(?:approximately\s+equal\s+to|approximately|approx)\b/giu, " ≈ "], [/\b(?:est\s+)?(?:environ\s+)?[eé]gal(?:e)?\s+environ\b/giu, " ≈ "],
    [/\b(?:is\s+)?not\s+equal\s+to\b/giu, " != "], [/\bdiff[eé]rent(?:e)?\s+de\b/giu, " != "],
    [/\bgreater\s+than\s+or\s+equal\s+to\b/giu, " >= "], [/\bsup[eé]rieur(?:e)?\s+ou\s+[eé]gal(?:e)?\s+[àa]\b/giu, " >= "],
    [/\bless\s+than\s+or\s+equal\s+to\b/giu, " <= "], [/\binf[eé]rieur(?:e)?\s+ou\s+[eé]gal(?:e)?\s+[àa]\b/giu, " <= "],
    [/\b(?:is\s+)?equal\s+to\b/giu, " = "], [/\bequals\b/giu, " = "], [/\b(?:est\s+)?[eé]gal(?:e)?\s+[àa]\b/giu, " = "], [/\b[eé]gale?\b/giu, " = "], [/\bvaut\b/giu, " = "],
    [/\bimplies\b/giu, " => "], [/\bimplique\b/giu, " => "], [/\bequivalent\s+to\b/giu, " <=> "], [/\b[eé]quivaut\s+[àa]\b/giu, " <=> "],
    [/\bgreater\s+than\b/giu, " > "], [/\bsup[eé]rieur(?:e)?\s+[àa]\b/giu, " > "], [/\bless\s+than\b/giu, " < "], [/\binf[eé]rieur(?:e)?\s+[àa]\b/giu, " < "],
  ];
  return replacements.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), source);
}

function tokenize(source: string): Token[] {
  const value = replacePhrases(source); const tokens: Token[] = []; let index = 0;
  while (index < value.length) {
    const rest = value.slice(index); const space = rest.match(/^\s+/u); if (space) { index += space[0].length; continue; }
    const number = rest.match(/^\d+(?:[.,]\d+)?/u); if (number) { tokens.push({ type: "number", value: number[0], position: index }); index += number[0].length; continue; }
    const operator = rest.match(/^(<=>|=>|<=|>=|!=|≈|=|<|>|\+|-|\*|\/|\^|∈|∪|∩)/u); if (operator) { tokens.push({ type: "operator", value: operator[0], position: index }); index += operator[0].length; continue; }
    if (rest[0] === "(") { tokens.push({ type: "lparen", value: "(", position: index++ }); continue; }
    if (rest[0] === ")") { tokens.push({ type: "rparen", value: ")", position: index++ }); continue; }
    if (rest[0] === ",") { tokens.push({ type: "comma", value: ",", position: index++ }); continue; }
    const identifier = rest.match(/^[\p{L}][\p{L}\p{N}_]*/u); if (identifier) { tokens.push({ type: "identifier", value: identifier[0], position: index }); index += identifier[0].length; continue; }
    throw new Error(`Caractère « ${rest[0]} » non reconnu à la position ${index + 1}.`);
  }
  tokens.push({ type: "eof", value: "", position: index }); return tokens;
}

class ExpressionParser {
  private index = 0;
  constructor(private readonly tokens: Token[]) {}
  private current() { return this.tokens[this.index]; }
  private take() { return this.tokens[this.index++]; }
  private accept(type: TokenType, value?: string) { const token = this.current(); if (token.type === type && (value === undefined || token.value === value)) { this.index++; return token; } return undefined; }
  private expect(type: TokenType, value?: string) { const token = this.accept(type, value); if (!token) throw new Error(`Expression incomplète près de la position ${this.current().position + 1}.`); return token; }
  parse() { const node = this.parseRelation(); if (this.current().type !== "eof" && this.current().type !== "rparen" && this.current().type !== "comma") throw new Error(`Élément « ${this.current().value} » inattendu.`); return node; }
  private parseRelation(): Node { let node = this.parseAdd(); while (this.current().type === "operator" && ["=", "!=", "≈", "<", ">", "<=", ">=", "=>", "<=>", "∈", "∪", "∩"].includes(this.current().value)) { const operator = this.take().value; node = { kind: "binary", operator, left: node, right: this.parseAdd() }; } return node; }
  private parseAdd(): Node { let node = this.parseMultiply(); while (this.current().type === "operator" && ["+", "-"].includes(this.current().value)) { const operator = this.take().value; node = { kind: "binary", operator, left: node, right: this.parseMultiply() }; } return node; }
  private startsPrimary(token: Token) { return token.type === "number" || token.type === "identifier" || token.type === "lparen"; }
  private parseMultiply(): Node {
    let node = this.parseUnary();
    while (true) {
      if (this.current().type === "operator" && ["*", "/"].includes(this.current().value)) { const operator = this.take().value; node = { kind: "binary", operator, left: node, right: this.parseUnary() }; continue; }
      if (this.current().type === "identifier" && ["dot", "cross"].includes(fold(this.current().value))) { const operator = fold(this.take().value); node = { kind: "binary", operator, left: node, right: this.parseUnary() }; continue; }
      if (this.startsPrimary(this.current())) { node = { kind: "binary", operator: "*", left: node, right: this.parseUnary(), implicit: true }; continue; }
      break;
    }
    return node;
  }
  private parseUnary(): Node { if (this.current().type === "operator" && ["+", "-"].includes(this.current().value)) { const operator = this.take().value as "+" | "-"; return { kind: "unary", operator, value: this.parseUnary() }; } return this.parsePower(); }
  private parsePower(): Node { let node = this.parsePrimary(); if (this.accept("operator", "^")) node = { kind: "binary", operator: "^", left: node, right: this.parseUnary() }; return node; }
  private parsePrimary(): Node {
    const number = this.accept("number"); if (number) return { kind: "number", value: number.value };
    const identifier = this.accept("identifier");
    if (identifier) {
      const normalized = fold(identifier.value); const functionName = functionNames[normalized];
      if (this.accept("lparen")) { const args: Node[] = []; if (!this.accept("rparen")) { do { args.push(this.parseRelation()); } while (this.accept("comma")); this.expect("rparen"); } return { kind: "call", name: functionName ?? identifier.value, arguments: args }; }
      if (functionName && this.startsPrimary(this.current())) return { kind: "call", name: functionName, arguments: [this.parseUnary()] };
      return { kind: "symbol", value: identifier.value };
    }
    if (this.accept("lparen")) { const node = this.parseRelation(); this.expect("rparen"); return node; }
    throw new Error(`Valeur attendue près de la position ${this.current().position + 1}.`);
  }
}

const precedence = (node: Node): number => node.kind === "binary" ? (["=", "!=", "≈", "<", ">", "<=", ">=", "=>", "<=>", "∈", "∪", "∩"].includes(node.operator) ? 1 : ["+", "-"].includes(node.operator) ? 2 : ["*", "/", "dot", "cross"].includes(node.operator) ? 3 : 4) : node.kind === "unary" ? 4 : 6;

function symbolLatex(value: string) {
  const normalized = fold(value); if (normalized.startsWith("vecmark_")) { const item = value.slice(value.indexOf("_") + 1); return /^[A-Z]{2}$/u.test(item) ? `\\overrightarrow{${item}}` : `\\vec{${symbolLatex(item)}}`; }
  if (conceptSymbols[normalized]) return conceptSymbols[normalized]; if (greekSymbols[normalized]) return greekSymbols[normalized]; if (setSymbols[normalized]) return setSymbols[normalized];
  const subscript = value.match(/^([\p{L}]+)_([\p{L}\p{N}]+)$/u); if (subscript) return `${symbolLatex(subscript[1])}_{${symbolLatex(subscript[2])}}`;
  const indexed = value.match(/^([\p{L}])(\d+)$/u); if (indexed) return `${indexed[1]}_{${indexed[2]}}`;
  if (/^[\p{L}]$/u.test(value) || /^[A-Z]{2,4}$/u.test(value)) return value;
  return `\\mathrm{${escapeText(value)}}`;
}

function print(node: Node, parentPrecedence = 0): string {
  if (node.kind === "number") return node.value.includes(",") ? node.value.replace(",", "{,}") : node.value;
  if (node.kind === "symbol") return symbolLatex(node.value);
  if (node.kind === "call") {
    const args = node.arguments.map((argument) => print(argument)); const argument = args[0] ?? "";
    if (node.name === "sqrt") return `\\sqrt{${argument}}`; if (node.name === "cbrt") return `\\sqrt[3]{${argument}}`; if (node.name === "exp") return `e^{${argument}}`;
    if (node.name === "abs") return `\\left|${argument}\\right|`; if (node.name === "norm") return `\\left\\lVert${argument}\\right\\rVert`;
    if (["sin", "cos", "tan", "ln", "log", "arcsin", "arccos", "arctan"].includes(node.name)) return `\\${node.name}\\left(${args.join(",")}\\right)`;
    return `${symbolLatex(node.name)}\\left(${args.join(",")}\\right)`;
  }
  if (node.kind === "unary") { const result = `${node.operator}${print(node.value, 4)}`; return parentPrecedence > 4 ? `\\left(${result}\\right)` : result; }
  if (node.operator === "/") return node.left.kind === "unary" && node.left.operator === "-" ? `-\\frac{${print(node.left.value)}}{${print(node.right)}}` : `\\frac{${print(node.left)}}{${print(node.right)}}`;
  if (node.operator === "^") return `${print(node.left, 4)}^{${print(node.right)}}`;
  const operator = ({ "*": node.implicit ? "\\," : "\\times ", dot: "\\cdot ", cross: "\\times ", "!=": "\\ne ", "≈": "\\approx ", "<=": "\\le ", ">=": "\\ge ", "=>": "\\Rightarrow ", "<=>": "\\Leftrightarrow ", "∈": "\\in ", "∪": "\\cup ", "∩": "\\cap " } as Record<string, string>)[node.operator] ?? node.operator;
  const own = precedence(node); const result = `${print(node.left, own)}${operator}${print(node.right, own + (node.operator === "-" ? 1 : 0))}`; return own < parentPrecedence ? `\\left(${result}\\right)` : result;
}

function vectorLatex(value: string) { const item = clean(value); return /^[A-Z]{2}$/u.test(item) ? `\\overrightarrow{${item}}` : `\\vec{${convert(item)}}`; }

function structured(source: string): string | undefined {
  let match = source.match(/^(?:the\s+)?integral\s+from\s+(.+?)\s+to\s+(.+?)\s+of\s+(.+?)\s+d\s*([\p{L}])$/iu)
    ?? source.match(/^(?:l[' ]\s*)?int[eé]grale\s+de\s+(.+?)\s+[àa]\s+(.+?)\s+de\s+(.+?)\s+d\s*([\p{L}])$/iu);
  if (match) return `\\int_{${convert(match[1])}}^{${convert(match[2])}} ${convert(match[3])}\\,\\mathrm{d}${convert(match[4])}`;
  match = source.match(/^(?:the\s+)?integral\s+(?:of\s+)?(.+?)\s+d\s*([\p{L}])$/iu) ?? source.match(/^(?:l[' ]\s*)?int[eé]grale\s+(?:de\s+)?(.+?)\s+d\s*([\p{L}])$/iu);
  if (match) return `\\int ${convert(match[1])}\\,\\mathrm{d}${convert(match[2])}`;
  match = source.match(/^(?:sum|somme)\s+(?:from|de)\s+([\p{L}][\p{L}\p{N}_]*)\s*=\s*(.+?)\s+(?:to|[àa])\s+(.+?)\s+(?:of|de)\s+(.+)$/iu);
  if (match) return `\\sum_{${convert(match[1])}=${convert(match[2])}}^{${convert(match[3])}} ${convert(match[4])}`;
  match = source.match(/^(?:product|produit)\s+(?:from|de)\s+([\p{L}][\p{L}\p{N}_]*)\s*=\s*(.+?)\s+(?:to|[àa])\s+(.+?)\s+(?:of|de)\s+(.+)$/iu);
  if (match) return `\\prod_{${convert(match[1])}=${convert(match[2])}}^{${convert(match[3])}} ${convert(match[4])}`;
  match = source.match(/^limit\s+(?:of\s+)?(.+?)\s+as\s+([\p{L}])\s+(?:tends|approaches)\s+to\s+(.+)$/iu) ?? source.match(/^limite\s+(?:de\s+)?(.+?)\s+quand\s+([\p{L}])\s+tend\s+vers\s+(.+)$/iu);
  if (match) return `\\lim_{${convert(match[2])}\\to ${convert(match[3])}} ${convert(match[1])}`;
  match = source.match(/^limit\s+as\s+([\p{L}])\s+(?:tends|approaches)\s+to\s+(.+?)\s+of\s+(.+)$/iu) ?? source.match(/^limite\s+quand\s+([\p{L}])\s+tend\s+vers\s+(.+?)\s+de\s+(.+)$/iu);
  if (match) return `\\lim_{${convert(match[1])}\\to ${convert(match[2])}} ${convert(match[3])}`;
  match = source.match(/^second\s+derivative\s+of\s+(.+?)\s+with\s+respect\s+to\s+([\p{L}])$/iu) ?? source.match(/^d[eé]riv[eé]e\s+seconde\s+de\s+(.+?)\s+par\s+rapport\s+[àa]\s+([\p{L}])$/iu);
  if (match) return `\\frac{\\mathrm{d}^{2}${convert(match[1])}}{\\mathrm{d}${convert(match[2])}^{2}}`;
  match = source.match(/^partial\s+derivative\s+of\s+(.+?)\s+with\s+respect\s+to\s+([\p{L}])$/iu) ?? source.match(/^d[eé]riv[eé]e\s+partielle\s+de\s+(.+?)\s+par\s+rapport\s+[àa]\s+([\p{L}])$/iu);
  if (match) return `\\frac{\\partial ${convert(match[1])}}{\\partial ${convert(match[2])}}`;
  match = source.match(/^derivative\s+of\s+(.+?)\s+with\s+respect\s+to\s+([\p{L}])$/iu) ?? source.match(/^d[eé]riv[eé]e\s+de\s+(.+?)\s+par\s+rapport\s+[àa]\s+([\p{L}])$/iu);
  if (match) return `\\frac{\\mathrm{d}${convert(match[1])}}{\\mathrm{d}${convert(match[2])}}`;
  match = source.match(/^(?:vector|vecteur)(?:\s+(?:of|de))?\s+(.+)$/iu); if (match) return vectorLatex(match[1]);
  match = source.match(/^(?:norm\s+of|norme\s+de)\s+(.+)$/iu); if (match) return `\\left\\lVert${convert(match[1])}\\right\\rVert`;
  match = source.match(/^(?:absolute\s+value\s+of|valeur\s+absolue\s+de|module\s+de)\s+(.+)$/iu); if (match) return `\\left|${convert(match[1])}\\right|`;
  match = source.match(/^(?:conjugate\s+of|conjugu[eé]\s+de)\s+(.+)$/iu); if (match) return `\\overline{${convert(match[1])}}`;
  match = source.match(/^(?:real\s+part\s+of|partie\s+r[eé]elle\s+de)\s+(.+)$/iu); if (match) return `\\operatorname{Re}\\left(${convert(match[1])}\\right)`;
  match = source.match(/^(?:imaginary\s+part\s+of|partie\s+imaginaire\s+de)\s+(.+)$/iu); if (match) return `\\operatorname{Im}\\left(${convert(match[1])}\\right)`;
  match = source.match(/^texte\s+["“](.*)["”]$/iu) ?? source.match(/^text\s+["“](.*)["”]$/iu); if (match) return `\\text{${escapeText(match[1])}}`;
  return undefined;
}

function topLevelRelation(source: string): [string, string, string] | undefined {
  const value = canonicalRelations(source); let depth = 0;
  for (let index = 0; index < value.length; index++) {
    if (value[index] === "(") depth++; else if (value[index] === ")") depth--;
    if (depth !== 0) continue;
    const operator = ["<=>", "=>", "<=", ">=", "!=", "≈", "=", "<", ">"].find((item) => value.startsWith(item, index));
    if (operator) return [value.slice(0, index), operator, value.slice(index + operator.length)];
  }
  return undefined;
}

function convert(source: string): string {
  const value = clean(source); if (!value) throw new Error("Écrivez une expression.");
  const special = structured(value); if (special) return special;
  const relation = topLevelRelation(value); if (relation) { const operator = ({ "=>": "\\Rightarrow", "<=>": "\\Leftrightarrow", "<=": "\\le", ">=": "\\ge", "!=": "\\ne", "≈": "\\approx" } as Record<string, string>)[relation[1]] ?? relation[1]; return `${convert(relation[0])}${operator}${convert(relation[2])}`; }
  return print(new ExpressionParser(tokenize(value)).parse());
}

export function simpleMathToLatex(source: string): SimpleMathResult {
  const value = clean(source); if (!value) return { ok: false, latex: "", message: "Écrivez une formule en français ou en anglais." };
  if (value.includes("\\")) return { ok: false, latex: "", message: "Ce champ utilise le langage simple. Écrivez le LaTeX dans le champ Code LaTeX." };
  try { return { ok: true, latex: convert(value), message: "Conversion locale réussie — aucune API utilisée." }; }
  catch (error) { return { ok: false, latex: "", message: error instanceof Error ? error.message : "Expression non reconnue." }; }
}
